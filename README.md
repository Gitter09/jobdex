# Personal CRM

AI-powered personal CRM built with Tauri, React, and Rust for managing your professional relationships.

## Features

- 🎯 **Smart Contact Management**: AI-powered contact enrichment and insights
- 📧 **Gmail Integration**: Send emails directly from the app
- 📊 **Kanban Pipeline**: Visual sales/outreach pipeline
- 🏷️ **Tags & Organization**: Flexible tagging system
- 📥 **Import/Export**: CSV import with intelligent field mapping
- 🤖 **AI Enrichment**: Automatic contact enrichment using LLMs
- 📋 **Magic Paste**: Intelligent clipboard scraping for LinkedIn profiles

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust (Tauri 2.0)
- **Database**: SQLite (via sqlx)
- **UI**: shadcn/ui + Tailwind CSS
- **Package Manager**: Bun

## Prerequisites

- [Bun](https://bun.sh/) (latest)
- [Rust](https://rustup.rs/) (stable toolchain)
- macOS, Windows, or Linux

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run tauri dev

# Build for production
bun run tauri build
```

## Project Structure

```
├── src/                    # React frontend
├── src-tauri/             # Tauri Rust backend
├── src-core/              # Core Rust logic (database, models)
└── .github/workflows/     # CI/CD pipelines
```

## Building

The app is automatically built for macOS, Windows, and Linux via GitHub Actions on every push to `main`.

To create a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## License

Private - All Rights Reserved
