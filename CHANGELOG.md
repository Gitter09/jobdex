# Changelog

All notable changes to JobDex are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [0.2.0] — 2026-04-14
### Added
- **First-Time Onboarding**: A short, warm walkthrough introduces JobDex to new users and helps them get set up.
- **Fully Functional Email Inbox**: A dedicated Emails tab that supports reading, formatting, sending, scheduling, and synchronising email timestamps.
- **Email Signatures & Attachments**: Create signatures in settings for reuse during composition. Attach files directly to your contacts.
- **Activity Timeline**: Status changes, scheduled emails, and sent emails appear natively on a contact's profile. You can delete specific entries manually.
- **Pipeline Settings**: Drag to reorder pipeline stages, rename them, edit their colours, or delete unused stages.
- **Keyboard Shortcuts**: Global shortcuts implemented (`Cmd+N`, `Cmd+Shift+C`, `Cmd+1-5`, `Cmd+/`). The Command Palette (`⌘K`) is now accessible from everywhere.
- **Tags & Tag Filtering**: Tags are fully functional. Filter the Contacts list and Kanban board using one or multiple tags seamlessly.
- **Restore from Backup**: JSON data exports can be imported back into JobDex. Existing contacts, statuses, and tags are safely merged without overwriting.
- **Update Checker & Release Modal**: JobDex checks for new versions upon startup and offers a What's New banner linking to these release notes.
- **Background Service**: Re-engineered background processes effectively handle scheduled emails natively.

### Fixed
- **Outlook Connection Stability**: Fixed major token authentication parsing and server-side filtering faults specifically affecting Microsoft Outlook accounts.
- **Data Imports**: CSV imports proactively map the 'Company Website' column if the data is present.
- **Workflow & UI Hygiene**: Kanban '+ New' pre-selects the relevant stage, bulk status updates work predictably, variable chips work inside subject lines, and mobile layouts scale comfortably.
- **Error Handling Pipeline**: Aggressive toast spam from network failures has been replaced with thoughtful, human-readable Rust error translations.

---

## [0.1.3] — 2026-03-06
### Added
- **Quick-Insert Chips**: Clickable shortcuts for inserting template variables in templates and emails.
- **Contact Events Timeline**: Support for multiple logged events per contact.
- **Improved Alignment**: Symmetrical grid layout for Highlights, Events, Company, and LinkedIn sections.
- **Email Sync**: "Sync Email" button to re-fetch thread history and update interaction timestamps.

### Fixed
- **Variable Casing**: Standardized all template variables to lowercase to match logic.
- **Rust backend**: Resolved unused variable warnings and unreachable code patterns.
- **Layout Symmetry**: Fixed width and alignment issues in Contact Detail page.

---

## [0.1.2] — 2026-03-06
### Added
- **Email Templates**: Reusable templates with mail merge variable support.
- **App Lock**: Optional PIN-based protection for the application.
- **Secure Storage**: PIN hashing with PBKDF2 (100k iterations).

### Fixed
- **CI Build**: Optimized build times and fixed missing bundle artifacts in GitHub Actions.

---

## [0.1.1] — 2026-03-03
### Added
- **Centralized Error Handling**: ImprovedSONNER toast integration with structured Rust errors.
- **Backend Hygiene**: Comprehensive Rust refactor and Clippy fixes.

### Changed
- **Relay decommissioned**: Tracking relay decommissioned in favor of local-first approach.

---

## [0.1.0] — 2026-01-23
### Added
- Initial public release
- Contact CRUD with pipeline statuses and tags
- Gmail and Outlook OAuth integration
- Email open and click tracking
- CSV and XLSX contact import with duplicate detection
- Kanban board view
- Command palette (⌘K)
- AES-256 encrypted local SQLite database via SQLCipher
