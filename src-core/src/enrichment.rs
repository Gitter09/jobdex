use anyhow::{anyhow, Result};
use arboard::Clipboard;
use reqwest::Client;
use scraper::{Html, Selector};

pub struct EnrichmentEngine {
    client: Client,
}

impl EnrichmentEngine {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub fn get_clipboard_url(&self) -> Result<String> {
        let mut clipboard = Clipboard::new()?;
        let text = clipboard.get_text()?;

        if text.starts_with("http")
            && (text.contains("linkedin.com")
                || text.contains("twitter.com")
                || text.contains("x.com"))
        {
            Ok(text)
        } else {
            Err(anyhow!("No valid LinkedIn/X URL found in clipboard"))
        }
    }

    pub async fn fetch_page_metadata(&self, url: &str) -> Result<(String, String, Option<String>)> {
        let response = self.client.get(url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            .send()
            .await?
            .text()
            .await?;

        let document = Html::parse_document(&response);

        // Extract title
        let title_selector = Selector::parse("title").unwrap();
        let title = document
            .select(&title_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_else(|| "Unknown Profile".to_string());

        // Extract meta description if available
        let meta_selector = Selector::parse("meta[name='description']").unwrap();
        let description = document
            .select(&meta_selector)
            .next()
            .and_then(|e| e.value().attr("content"))
            .map(|s| s.to_string());

        Ok((title, response, description))
    }

    /// Attempts to generate AI hooks via AI Provider.
    pub async fn try_generate_hooks(
        &self,
        raw_content: &str,
        provider_config: Option<crate::ai::AiConfig>,
    ) -> String {
        // Default to Ollama if no config provided
        let client = if let Some(config) = provider_config {
            crate::ai::AiClient::new(config)
        } else {
            crate::ai::AiClient::ollama_default()
        };

        let prompt = format!(
            r#"Analyze the following social profile/website content and extract 3-5 specific 'Connection Hooks' or 'Icebreakers' for a cold email.
            Focus on:
            1. Recent career moves or promotions.
            2. Shared interests or education.
            3. Specific portfolio companies or deals mentioned.
            4. Content they have written (blogs, tweets).
            
            Keep it concise (bullet points).
            
            Content: 
            {}"#,
            raw_content.chars().take(8000).collect::<String>()
        );

        match client.generate(&prompt).await {
            Ok(hooks) => hooks,
            Err(e) => format!("Failed to generate hooks: {}", e),
        }
    }
}
