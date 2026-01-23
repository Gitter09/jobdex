use anyhow::{anyhow, Result};
use base64::prelude::*;
use oauth2::{
    basic::BasicClient, AuthUrl, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge,
    PkceCodeVerifier, RedirectUrl, Scope, TokenUrl,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::path::PathBuf;

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_SCOPE: &str = "https://www.googleapis.com/auth/gmail.send";
const REDIRECT_PORT: u16 = 8420;

#[derive(Debug, Serialize, Deserialize)]
struct GoogleCredentials {
    installed: InstalledCredentials,
}

#[derive(Debug, Serialize, Deserialize)]
struct InstalledCredentials {
    client_id: String,
    client_secret: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoredTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
}

pub struct GmailClient {
    http_client: Client,
    credentials_path: PathBuf,
}

impl GmailClient {
    pub fn new() -> Self {
        let credentials_path = dirs::home_dir()
            .unwrap_or_default()
            .join(".outreachos")
            .join("credentials.json");

        Self {
            http_client: Client::new(),
            credentials_path,
        }
    }

    fn tokens_path(&self) -> PathBuf {
        self.credentials_path
            .parent()
            .unwrap_or(std::path::Path::new("."))
            .join("tokens.json")
    }

    fn load_credentials(&self) -> Result<(String, String)> {
        let content = fs::read_to_string(&self.credentials_path).map_err(|_| {
            anyhow!(
                "credentials.json not found at {:?}. Please follow the setup guide.",
                self.credentials_path
            )
        })?;

        let creds: GoogleCredentials = serde_json::from_str(&content)
            .map_err(|_| anyhow!("Invalid credentials.json format"))?;

        Ok((creds.installed.client_id, creds.installed.client_secret))
    }

    pub fn load_tokens(&self) -> Option<StoredTokens> {
        let content = fs::read_to_string(self.tokens_path()).ok()?;
        serde_json::from_str(&content).ok()
    }

    fn save_tokens(&self, tokens: &StoredTokens) -> Result<()> {
        let content = serde_json::to_string_pretty(tokens)?;
        fs::write(self.tokens_path(), content)?;
        Ok(())
    }

    pub fn is_connected(&self) -> bool {
        self.load_tokens().is_some()
    }

    pub fn disconnect(&self) -> Result<()> {
        let tokens_path = self.tokens_path();
        if tokens_path.exists() {
            fs::remove_file(tokens_path)?;
        }
        Ok(())
    }

    /// Starts the OAuth flow. Returns the authorization URL to open in browser.
    pub fn get_auth_url(&self) -> Result<(String, PkceCodeVerifier)> {
        let (client_id, client_secret) = self.load_credentials()?;

        let redirect_url = format!("http://127.0.0.1:{}", REDIRECT_PORT);

        let client = BasicClient::new(ClientId::new(client_id))
            .set_client_secret(ClientSecret::new(client_secret))
            .set_auth_uri(AuthUrl::new(GOOGLE_AUTH_URL.to_string())?)
            .set_token_uri(TokenUrl::new(GOOGLE_TOKEN_URL.to_string())?)
            .set_redirect_uri(RedirectUrl::new(redirect_url)?);

        let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

        let (auth_url, _csrf_token) = client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new(GMAIL_SEND_SCOPE.to_string()))
            .set_pkce_challenge(pkce_challenge)
            .url();

        Ok((auth_url.to_string(), pkce_verifier))
    }

    /// Waits for the OAuth callback and extracts the authorization code
    pub fn wait_for_callback(&self) -> Result<String> {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", REDIRECT_PORT))?;

        println!("Waiting for OAuth callback on port {}...", REDIRECT_PORT);

        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let mut reader = BufReader::new(&stream);
                let mut request_line = String::new();
                reader.read_line(&mut request_line)?;

                // Extract code from: GET /?code=XXX&scope=... HTTP/1.1
                if let Some(code) = extract_code_from_request(&request_line) {
                    // Send success response
                    let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n\
                        <html><body><h1>✓ Authorization Successful!</h1>\
                        <p>You can close this window and return to OutreachOS.</p></body></html>";
                    stream.write_all(response.as_bytes())?;

                    return Ok(code);
                }
            }
        }

        Err(anyhow!("Failed to receive OAuth callback"))
    }

    /// Exchanges authorization code for tokens using direct HTTP request
    pub async fn exchange_code(
        &self,
        code: String,
        pkce_verifier: PkceCodeVerifier,
    ) -> Result<StoredTokens> {
        let (client_id, client_secret) = self.load_credentials()?;
        let redirect_url = format!("http://127.0.0.1:{}", REDIRECT_PORT);

        let params = [
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", code.as_str()),
            ("code_verifier", pkce_verifier.secret()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_url.as_str()),
        ];

        let response = self
            .http_client
            .post(GOOGLE_TOKEN_URL)
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Token exchange failed: {}", error_text));
        }

        let token_response: TokenResponse = response.json().await?;

        let expires_at = token_response
            .expires_in
            .map(|d| chrono::Utc::now().timestamp() + d);

        let tokens = StoredTokens {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token,
            expires_at,
        };

        self.save_tokens(&tokens)?;

        Ok(tokens)
    }

    /// Refreshes the access token if expired
    pub async fn refresh_if_needed(&self) -> Result<StoredTokens> {
        let tokens = self
            .load_tokens()
            .ok_or_else(|| anyhow!("Not connected to Gmail. Please authenticate first."))?;

        // Check if token is expired (with 60s buffer)
        if let Some(expires_at) = tokens.expires_at {
            if chrono::Utc::now().timestamp() < expires_at - 60 {
                return Ok(tokens);
            }
        } else {
            return Ok(tokens);
        }

        // Token expired, refresh it
        let refresh_token = tokens
            .refresh_token
            .ok_or_else(|| anyhow!("No refresh token available"))?;

        let (client_id, client_secret) = self.load_credentials()?;

        let params = [
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("refresh_token", refresh_token.as_str()),
            ("grant_type", "refresh_token"),
        ];

        let response = self
            .http_client
            .post(GOOGLE_TOKEN_URL)
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Token refresh failed: {}", error_text));
        }

        let token_response: TokenResponse = response.json().await?;

        let expires_in = token_response.expires_in.unwrap_or(3600);

        let new_tokens = StoredTokens {
            access_token: token_response.access_token,
            refresh_token: Some(refresh_token), // Keep original refresh token
            expires_at: Some(chrono::Utc::now().timestamp() + expires_in),
        };

        self.save_tokens(&new_tokens)?;

        Ok(new_tokens)
    }

    /// Sends an email via Gmail API
    pub async fn send_email(&self, to: &str, subject: &str, body: &str) -> Result<String> {
        let tokens = self.refresh_if_needed().await?;

        // Build RFC 2822 email
        let email = format!(
            "To: {}\r\nSubject: {}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n{}",
            to, subject, body
        );

        // Base64 URL-safe encode
        let encoded = BASE64_URL_SAFE_NO_PAD.encode(email.as_bytes());

        let request_body = serde_json::json!({
            "raw": encoded
        });

        let response = self
            .http_client
            .post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send")
            .bearer_auth(&tokens.access_token)
            .json(&request_body)
            .send()
            .await?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json().await?;
            Ok(result["id"].as_str().unwrap_or("sent").to_string())
        } else {
            let error: serde_json::Value = response.json().await?;
            Err(anyhow!("Gmail API error: {:?}", error))
        }
    }
}

fn extract_code_from_request(request_line: &str) -> Option<String> {
    let url_part = request_line.split_whitespace().nth(1)?;
    let url = url::Url::parse(&format!("http://localhost{}", url_part)).ok()?;

    for (key, value) in url.query_pairs() {
        if key == "code" {
            return Some(value.to_string());
        }
    }
    None
}
