use crate::error::AppError;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const PLIST_LABEL: &str = "com.outreachos.desktop";

/// Returns `~/Library/LaunchAgents/com.outreachos.desktop.plist`
fn plist_path() -> Result<PathBuf, AppError> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::Internal("Cannot determine home directory".into()))?;
    let launch_agents = home.join("Library").join("LaunchAgents");
    Ok(launch_agents.join(format!("{PLIST_LABEL}.plist")))
}

/// Resolves the `.app` bundle path from the current executable.
/// e.g. `/Applications/OutreachOS.app/Contents/MacOS/outreachos` → `/Applications/OutreachOS.app`
fn get_app_bundle_path() -> Result<PathBuf, AppError> {
    let exe = std::env::current_exe().map_err(AppError::Io)?;
    let bundle = exe
        .parent() // MacOS
        .and_then(|p| p.parent()) // Contents
        .and_then(|p| p.parent()) // OutreachOS.app
        .ok_or_else(|| AppError::Internal("Cannot resolve app bundle path".into()))?;

    if bundle.extension().map(|e| e == "app").unwrap_or(false) {
        Ok(bundle.to_path_buf())
    } else {
        Err(AppError::Internal(
            "Not running from an .app bundle — background service is only available in production builds".into(),
        ))
    }
}

/// Generates the LaunchAgent plist XML content.
fn plist_content(app_path: &str) -> String {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/open</string>
        <string>-a</string>
        <string>{app_path}</string>
        <string>--args</string>
        <string>--background</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
"#
    )
}

/// Write the plist and load it via `launchctl`.
pub fn enable() -> Result<(), AppError> {
    let app_path = get_app_bundle_path()?;
    let plist = plist_path()?;

    // Ensure ~/Library/LaunchAgents/ exists
    if let Some(parent) = plist.parent() {
        fs::create_dir_all(parent).map_err(AppError::Io)?;
    }

    let app_str = app_path
        .to_str()
        .ok_or_else(|| AppError::Internal("App path contains invalid UTF-8".into()))?;

    fs::write(&plist, plist_content(app_str)).map_err(AppError::Io)?;

    let plist_str = plist
        .to_str()
        .ok_or_else(|| AppError::Internal("Plist path contains invalid UTF-8".into()))?;

    // Load the agent (legacy API still works on all macOS versions)
    let output = Command::new("launchctl")
        .args(["load", plist_str])
        .output()
        .map_err(AppError::Io)?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // "already loaded" is not a real error
        if !stderr.contains("already loaded") {
            return Err(AppError::Internal(format!(
                "launchctl load failed: {stderr}"
            )));
        }
    }

    Ok(())
}

/// Unload via `launchctl` and delete the plist file.
pub fn disable() -> Result<(), AppError> {
    let plist = plist_path()?;

    if plist.exists() {
        let plist_str = plist
            .to_str()
            .ok_or_else(|| AppError::Internal("Plist path contains invalid UTF-8".into()))?;

        // Unload first (ignore errors — may not be loaded)
        let _ = Command::new("launchctl")
            .args(["unload", plist_str])
            .output();

        fs::remove_file(&plist).map_err(AppError::Io)?;
    }

    Ok(())
}

/// Check if the LaunchAgent plist exists.
pub fn is_enabled() -> Result<bool, AppError> {
    let plist = plist_path()?;
    Ok(plist.exists())
}
