fn main() {
    // Load .env.local so VITE_CLERK_PUBLISHABLE_KEY is available at compile-time
    // via option_env!(). This is critical for production builds where the binary
    // runs from /Applications and cannot find .env.local at runtime.
    let env_path = std::path::Path::new("../.env.local");
    if env_path.exists() {
        if let Ok(contents) = std::fs::read_to_string(env_path) {
            for line in contents.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                if let Some((key, value)) = line.split_once('=') {
                    let key = key.trim();
                    let value = value.trim();
                    // Only set if not already in environment (env vars take precedence)
                    if std::env::var(key).is_err() {
                        println!("cargo:rustc-env={}={}", key, value);
                    }
                }
            }
        }
    }

    // Re-run build.rs if .env.local changes
    println!("cargo:rerun-if-changed=../.env.local");

    tauri_build::build()
}
