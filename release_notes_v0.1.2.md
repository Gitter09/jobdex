# Release Notes v0.1.2

This release introduces the **Email Templates** system and critical **Production Stability** fixes.

## 🚀 New Features
- **Email Templates**: Create and manage reusable email templates with mail merge support.
- **Mail Merge**: Automatically replace variables like `{{first_name}}`, `{{company}}`, etc., when composing emails.
- **Templates Integration**: Select templates directly from the Compose Email dialog.

## 🛡️ Security & Stability
- **OAuth Credential Security**: Moved hardcoded OAuth client IDs and secrets to environment variables. Official builds now use GitHub Secrets.
- **Tauri Version Sync**: Resolved version mismatch issues across all platforms (macOS, Windows, Linux).
- **Production Key Injection**: Fixed a bug where Clerk keys were missing from production builds on macOS.

## 🧹 Improvements
- **Sidebar Cleanup**: Removed empty placeholder links (Emails, Notes, Tasks) to ensure a polished v0.1.2 experience.
- **Capability Audit**: Fixed missing permissions for `tauri-plugin-store`.
- **Database Hygiene**: Verified migration sequence (12 migrations).

## ⚠️ Known Limitations
- **Email Scheduling**: While emails can be scheduled for future dates, the background worker to dispatch them automatically is still in development.
- **Notes & Tasks**: These pages are currently hidden from the sidebar as they are planned for future releases.
