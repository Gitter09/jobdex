# Changelog

All notable changes to JobDex are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

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
