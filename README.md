# OutreachOS

OutreachOS is a **privacy-first, offline-capable** personal CRM desktop application built with **Tauri 2**, **React**, and **Rust**. Designed for startup founders, VC researchers, and professional networkers who need to manage relationships with precision and privacy.

## ✨ Features (v0.1.3)

- 📋 **Contact Management**: Modern interface for tracking professional relationships, titles, and companies.
- 📊 **Kanban Pipeline**: Drag-and-drop board to track where every relationship stands.
- 🕒 **Contact Timeline**: Track a full history of events, meetings, and notes for every contact.
- 📥 **Two-Step Import**: Excel/XLSX/CSV import with simplified mapping and duplicate checking.
- 📝 **Templates & Quick-Insert**: Create reusable email templates and insert variables using one-click "Chips."
- 📧 **Outreach Infrastructure**: Full-stack support for email open and link click tracking.
- 📬 **Email Integration**: Connect Gmail and Outlook via OAuth; sync threads and schedule follow-ups.
- 🔐 **Privacy First**: Local SQLite database encrypted with **SQLCipher (AES-256)**. Your data never leaves your machine.
- 🌓 **Premium UI**: Sleek, collapsible sidebar layout with smooth transitions and dark mode support.

## 💼 Open Core Model

OutreachOS follows an Open Core model:
- **Free Desktop App**: Fully functional local-first CRM (MIT).
- **Relay Service**: Optional Cloudflare Worker for commercial-grade tracking metrics and relaying events.

## 🛠 Tech Stack

- **Core**: Rust (Tauri 2.0 / Edition 2021)
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: SQLite with SQLCipher (sqlx 0.8+)
- **Runtime**: Bun

## 🚀 Roadmap

### Phase 2: Engagement & Intelligence
- [ ] **Automated Enrichment**: Periodic background checking for contact updates.
- [ ] **Robust Scraping**: Search fallback for enrichment when direct scraping is blocked.
- [ ] **AI Drafting**: Context-aware email drafting based on contact history (Opt-in).

### Phase 3: Scaling & Polish
- [ ] **Unified Error Handling**: Comprehensive toast notifications and error states.
- [ ] **Team Support**: Multi-user collaboration features for small teams.
- [ ] **Mobile App**: Tauri-based mobile client for iOS and Android.

## 📦 Installation

Automated builds are available on the [GitHub Releases](https://github.com/Gitter09/outreach-os/releases) page for:
-  macOS (.dmg)
- 🪟 Windows (.exe)
- 🐧 Linux (.AppImage)

## 🏗 Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run tauri dev

# Build for production
bun run tauri build
```

## License

Private - All Rights Reserved

