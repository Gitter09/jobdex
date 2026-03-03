OutreachOS is a modern personal CRM built with Tauri, React, and Rust. Designed for professionals who want to manage their relationships with precision and privacy, without the noise of automated AI generation.

## ✨ Features (v0.1)

- 📋 **Contact Management**: Modern interface for tracking professional relationships, titles, and companies.
- 📝 **Manual Summaries**: Dedicated space to capture key notes and context for every contact.
- 📧 **Outreach Infrastructure**: Full-stack support for email open and link click tracking.
- 📬 **Email Scheduling**: Compose and schedule emails for optimal timing.
- 📥 **Two-Step Import**: Excel/XLSX import with simplified mapping and duplicate checking.
- 🔐 **Privacy First**: Local SQLite database ensuring your data stays on your machine.
- 🌓 **Premium UI**: Sleek, collapsible sidebar layout with smooth transitions and dark mode support.

## 🛠 Tech Stack

- **Core**: Rust (Tauri 2.0)
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: SQLite (sqlx)
- **Runtime**: Bun

## 🚀 Roadmap

### Phase 2: Engagement & Intelligence
- [ ] **Email Sync**: Real-time sync for Gmail and Outlook conversations.
- [ ] **Robust Scraping**: Search fallback for enrichment when direct scraping is blocked.
- [ ] **AI Drafting**: Context-aware email drafting based on contact history.

### Phase 3: Scaling & Polish
- [ ] **Unified Error Handling**: Comprehensive toast notifications and error states.
- [ ] **Team Support**: Multi-user collaboration features.
- [ ] **Mobile App**: Tauri-based mobile client.

## 📦 Installation (Coming Soon)

We are currently setting up automated builds. Soon, you will be able to download pre-compiled binaries for:
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
