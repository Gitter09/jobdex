use crate::error::AppError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AiTool {
    ClaudeDesktop,
    Cursor,
    Windsurf,
    ClaudeCode,
    VSCode,
    GoogleAntigravity,
}

impl AiTool {
    pub fn all() -> &'static [AiTool] {
        &[
            AiTool::ClaudeDesktop,
            AiTool::Cursor,
            AiTool::Windsurf,
            AiTool::ClaudeCode,
            AiTool::VSCode,
            AiTool::GoogleAntigravity,
        ]
    }

    pub fn id(&self) -> &'static str {
        match self {
            AiTool::ClaudeDesktop => "claude_desktop",
            AiTool::Cursor => "cursor",
            AiTool::Windsurf => "windsurf",
            AiTool::ClaudeCode => "claude_code",
            AiTool::VSCode => "vscode",
            AiTool::GoogleAntigravity => "google_antigravity",
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            AiTool::ClaudeDesktop => "Claude Desktop",
            AiTool::Cursor => "Cursor",
            AiTool::Windsurf => "Windsurf",
            AiTool::ClaudeCode => "Claude Code",
            AiTool::VSCode => "VS Code",
            AiTool::GoogleAntigravity => "Google Antigravity",
        }
    }

    pub fn transport(&self) -> &'static str {
        match self {
            AiTool::ClaudeDesktop => "stdio",
            _ => "sse",
        }
    }

    /// Root key under which `mcpServers` / `servers` entries live in the config file.
    pub fn mcp_root_key(&self) -> &'static str {
        match self {
            AiTool::VSCode => "servers",
            _ => "mcpServers",
        }
    }

    /// Config file path for this tool on the current platform.
    pub fn config_path(&self) -> Option<PathBuf> {
        let home = dirs::home_dir()?;

        #[cfg(target_os = "macos")]
        let path = match self {
            AiTool::ClaudeDesktop => dirs::data_dir()
                .map(|d| d.join("Claude").join("claude_desktop_config.json"))?,
            AiTool::Cursor => home.join(".cursor").join("mcp.json"),
            AiTool::Windsurf => home
                .join(".codeium")
                .join("windsurf")
                .join("mcp_config.json"),
            AiTool::ClaudeCode => home.join(".claude.json"),
            AiTool::VSCode => dirs::data_dir()
                .map(|d| d.join("Code").join("User").join("mcp.json"))?,
            AiTool::GoogleAntigravity => home.join(".gemini").join("antigravity").join("mcp_config.json"),
        };

        #[cfg(target_os = "windows")]
        let path = match self {
            AiTool::ClaudeDesktop => dirs::data_dir()
                .map(|d| d.join("Claude").join("claude_desktop_config.json"))?,
            AiTool::Cursor => home.join(".cursor").join("mcp.json"),
            AiTool::Windsurf => home
                .join(".codeium")
                .join("windsurf")
                .join("mcp_config.json"),
            AiTool::ClaudeCode => home.join(".claude.json"),
            AiTool::VSCode => dirs::data_dir()
                .map(|d| d.join("Code").join("User").join("mcp.json"))?,
            AiTool::GoogleAntigravity => home.join(".gemini").join("antigravity").join("mcp_config.json"),
        };

        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        let path = match self {
            AiTool::ClaudeDesktop => home.join(".config").join("Claude").join("claude_desktop_config.json"),
            AiTool::Cursor => home.join(".cursor").join("mcp.json"),
            AiTool::Windsurf => home.join(".codeium").join("windsurf").join("mcp_config.json"),
            AiTool::ClaudeCode => home.join(".claude.json"),
            AiTool::VSCode => home.join(".config").join("Code").join("User").join("mcp.json"),
            AiTool::GoogleAntigravity => home.join(".gemini").join("antigravity").join("mcp_config.json"),
        };

        Some(path)
    }

    /// Detection directory — tool is "detected" if this dir exists.
    pub fn detection_dir(&self) -> Option<PathBuf> {
        let config = self.config_path()?;
        config.parent().map(|p| p.to_owned())
    }

    pub fn from_id(id: &str) -> Option<AiTool> {
        AiTool::all().iter().find(|t| t.id() == id).copied()
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    pub tool: String,
    pub label: String,
    pub is_detected: bool,
    pub is_configured: bool,
    pub transport: String,
    pub config_path: Option<String>,
}

pub fn get_sidecar_path() -> Option<PathBuf> {
    let binary_name = if cfg!(windows) {
        "jobdex-mcp.exe"
    } else {
        "jobdex-mcp"
    };

    // Production: binary is bundled alongside the main executable
    if let Some(exe_dir) = std::env::current_exe().ok().and_then(|e| e.parent().map(|p| p.to_owned())) {
        let prod_path = exe_dir.join(binary_name);
        if prod_path.exists() {
            return Some(prod_path);
        }
    }

    // Dev: look in src-mcp release build output relative to workspace root
    // Workspace root is two levels up from src-tauri/
    if let Some(manifest_dir) = option_env!("CARGO_MANIFEST_DIR") {
        let dev_path = PathBuf::from(manifest_dir)
            .parent()
            .map(|root| root.join("src-mcp").join("target").join("release").join(binary_name))?;
        if dev_path.exists() {
            return Some(dev_path);
        }
    }

    None
}

fn read_config(path: &PathBuf) -> Value {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(Value::Object(Default::default()))
}

fn write_config(path: &PathBuf, value: &Value) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(AppError::Io)?;
    }
    let json = serde_json::to_string_pretty(value)
        .map_err(AppError::Serialization)?;
    std::fs::write(path, json).map_err(AppError::Io)?;
    Ok(())
}

pub fn detect_all_tools() -> Vec<ToolStatus> {
    let sidecar = get_sidecar_path();

    AiTool::all()
        .iter()
        .map(|tool| {
            let config_path = tool.config_path();
            let detection_dir = tool.detection_dir();

            let is_detected = detection_dir
                .as_ref()
                .map(|d| d.exists())
                .unwrap_or(false);

            let is_configured = config_path
                .as_ref()
                .filter(|p| p.exists())
                .map(|p| {
                    let val = read_config(p);
                    val.get(tool.mcp_root_key())
                        .and_then(|root| root.get("jobdex"))
                        .is_some()
                })
                .unwrap_or(false);

            // Claude Desktop also needs sidecar present to count as connectable
            let effective_detected = if *tool == AiTool::ClaudeDesktop {
                is_detected && sidecar.is_some()
            } else {
                is_detected
            };

            ToolStatus {
                tool: tool.id().to_string(),
                label: tool.label().to_string(),
                is_detected: effective_detected,
                is_configured,
                transport: tool.transport().to_string(),
                config_path: config_path.map(|p| p.to_string_lossy().to_string()),
            }
        })
        .collect()
}

pub fn configure_tool(
    tool: AiTool,
    api_key: &str,
    api_port: u16,
) -> Result<(), AppError> {
    let config_path = tool
        .config_path()
        .ok_or_else(|| AppError::Internal("Cannot determine config path".into()))?;

    let mut root = read_config(&config_path);
    let mcp_root = tool.mcp_root_key();

    let entry = match tool {
        AiTool::ClaudeDesktop => {
            let binary = get_sidecar_path()
                .ok_or_else(|| AppError::Internal("jobdex-mcp binary not found".into()))?;
            serde_json::json!({
                "command": binary.to_string_lossy(),
                "args": [
                    "--api-url", format!("http://127.0.0.1:{}", api_port),
                    "--api-key", api_key
                ]
            })
        }
        AiTool::Cursor => {
            serde_json::json!({
                "url": format!("http://127.0.0.1:{}/api/v1/sse", api_port),
                "headers": { "Authorization": format!("Bearer {}", api_key) }
            })
        }
        AiTool::Windsurf => {
            serde_json::json!({
                "serverUrl": format!("http://127.0.0.1:{}/api/v1/sse", api_port),
                "headers": { "Authorization": format!("Bearer {}", api_key) }
            })
        }
        AiTool::ClaudeCode | AiTool::VSCode => {
            serde_json::json!({
                "type": "sse",
                "url": format!("http://127.0.0.1:{}/api/v1/sse", api_port),
                "headers": { "Authorization": format!("Bearer {}", api_key) }
            })
        }
        AiTool::GoogleAntigravity => {
            serde_json::json!({
                "serverUrl": format!("http://127.0.0.1:{}/api/v1/sse", api_port),
                "headers": { "Authorization": format!("Bearer {}", api_key) }
            })
        }
    };

    if let Value::Object(ref mut map) = root {
        let servers = map
            .entry(mcp_root)
            .or_insert(Value::Object(Default::default()));
        if let Value::Object(ref mut srv_map) = servers {
            srv_map.insert("jobdex".to_string(), entry);
        }
    }

    write_config(&config_path, &root)
}

pub fn remove_tool_config(tool: AiTool) -> Result<(), AppError> {
    let config_path = tool
        .config_path()
        .ok_or_else(|| AppError::Internal("Cannot determine config path".into()))?;

    if !config_path.exists() {
        return Ok(());
    }

    let mut root = read_config(&config_path);
    let mcp_root = tool.mcp_root_key();

    if let Value::Object(ref mut map) = root {
        if let Some(Value::Object(ref mut servers)) = map.get_mut(mcp_root) {
            servers.remove("jobdex");
        }
    }

    write_config(&config_path, &root)
}
