# JobDex — Agent Context Document

> **Purpose**: This document is the single source of truth for the JobDex project. It is designed so that any AI agent or developer can read it and immediately continue development without asking the user for any further context.
>
> **Last updated**: 16th April 2026 (v0.2.1 — API & MCP added)

---

## 1. What Is This Project?

**JobDex** is a privacy-first, offline-capable personal CRM desktop application built for **students doing cold email outreach** — internship hunting, job searching, and anyone who needs to systematically manage relationships without paying for enterprise software.

This is a **personal passion project** built by Harshit Singh. It is free, will remain free indefinitely, and is shared publicly so others can benefit. There is no monetisation plan, no paid tier, no Clerk integration, and no commercial tracking relay. The purpose of this project beyond personal use is to demonstrate the owner's capabilities as a PM/founder to potential employers.

All data is stored **locally** on the user's machine in an encrypted SQLite database. Nothing leaves the machine.

The app is built with **Tauri 2** (Rust backend + React/TypeScript frontend), packaged as a native desktop application for **macOS** and **Windows**.

### Primary Persona

**"Priya"** — a 22-year-old engineering student doing systematic cold email outreach to secure a summer internship or full-time role. She needs to:
1. Maintain a structured database of contacts (recruiters, hiring managers, engineers)
2. Track where each relationship stands in her pipeline
3. Send personalised emails at scale without sounding like a mass-blast sender
4. Import contacts from LinkedIn CSV exports
5. Know when someone opened her email and when to follow up

### What This Is Not
- Not a sales CRM for enterprise teams
- Not a VC research tool (secondary context only)
- Not a SaaS product — no subscriptions, no tiers, no paywall
- Not monetised — free forever

---

## 2. Voice & Tone

This section is mandatory reading before writing any user-facing copy — error messages, empty states, tooltips, onboarding text, button labels, toast notifications, or any text a user will read. Every agent working on this project must internalise and apply this voice consistently.

### The Core Voice

JobDex sounds like **a talented person sharing something they built for themselves** — not a company selling a product. The tone is warm, honest, slightly irreverent, and always personal. It never sounds corporate, never sounds like a SaaS landing page, and never sounds like it's trying to impress anyone.

The single best test for any piece of copy: *Does this sound like a real human who built this tool and is genuinely excited to share it?* If yes, it's right. If it sounds like a press release, a startup pitch, or a feature announcement from a growth team, rewrite it.

### Inspiration

- **Arc Browser** — fun, human, surprising, has personality without being childish. Little moments of delight that feel earned.
- **Notion** — clean, minimal, not overwhelming. Says what it needs to say and gets out of the way.

### Principles

**1. Personal over corporate.**
Write in first person where it makes sense. "I built this because..." beats "JobDex was designed to...". "Your data stays on your machine" beats "Data sovereignty is ensured through local-first architecture."

**2. Honest over impressive.**
Acknowledge tradeoffs. If something isn't built yet, say "coming soon" rather than hiding it or dressing it up. The "Decisions I made while building this" section on the landing page is the model — it explicitly names what was cut and why. That honesty is a feature, not a weakness.

**3. Specific over generic.**
"A career fair's worth of contacts imported in two clicks" beats "efficient bulk import functionality." Specific details that reflect Priya's actual life make the product feel built for her, not for a generic user.

**4. Warm over neutral.**
Empty states should feel encouraging, not clinical. Error messages should be human, not codes. Onboarding should feel like a friend showing you around, not a manual.

**5. Light over heavy.**
One well-placed casual phrase ("or get rejected" in a pipeline description) does more than a paragraph of explanation. Don't over-explain. Trust the user.

**6. Never braggy.**
Avoid words like "powerful", "blazing", "enterprise-grade", "best-in-class", "world-class". If something is fast, show it. If something is good, let the user discover it.

### Vocabulary to Avoid

| Avoid | Use instead |
|---|---|
| "Engineered" | "Built" |
| "Leverage" | "Use" |
| "Our servers" | "Anyone else's server" / "my server" |
| "Intelligence summary" | "Your notes" / "Context" |
| "Pipeline management" | "Track where things stand" |
| "Chip-based variables" | "Merge variables" / "`{{firstName}}`" |
| "OAuth 2.0 PKCE" (in user-facing copy) | "Connect your Gmail account" |
| "Powerful", "robust", "seamless" | Just describe what it does |
| "We", "our" (corporate plural) | "I", "my", or rephrase entirely |
| "Professional networks" | "Job search" / "contacts" / "relationships" |

### Error Messages

Error messages must be user-readable, not developer-readable. A user should never see raw Rust error strings, AppError codes, or stack traces. Every `AppError` variant must map to a clean, plain-English message.

**Bad:** `DATABASE: no rows returned for query`
**Good:** `We couldn't find that contact. It may have been deleted.`

**Bad:** `VALIDATION: email already exists`
**Good:** `That email is already in your contacts.`

### Empty States

Empty states should be warm and action-oriented. They should make the user feel like they're at the start of something, not staring at a broken screen.

**Bad:** `No contacts found.`
**Good:** `No contacts yet. Add one to get started — or import a LinkedIn export if you've already been doing your research.`

**Bad:** `No events scheduled.`
**Good:** `Nothing coming up. Add an event to set a reminder for when to follow up.`

### Onboarding Tone

The first-launch onboarding flow (`src/components/onboarding/OnboardingFlow.tsx`) is implemented as a 4-screen flow with typewriter text effects and a Kanban demo visualization. Its tone should feel like Arc or Craft — warm, human, a little playful. Small moments of personality are encouraged: a self-aware joke, an honest admission, a squiggly arrow. The user should feel like they're being welcomed by the person who built this, not walked through a feature checklist.

---

## 3. Repository Structure

```
OutreachOS/App/
├── src/                        # React + TypeScript frontend
│   ├── App.tsx                 # Root component. Sets up Router + ErrorBoundary + Toaster
│   ├── main.tsx                # Vite entry point
│   ├── index.css               # Global styles (Tailwind)
│   ├── changelog.ts            # Release notes array — feeds About tab + What's New modal
│   ├── assets/                 # Static images/fonts
│   ├── components/
│   │   ├── contacts/           # AddContactDialog, AddContactDropdown, EditContactDialog, StatusPicker, EmailHistoryTab
│   │   ├── email/              # ComposeEmailDialog, EmailBody (HTML email renderer)
│   │   ├── templates/          # EditTemplateDialog
│   │   ├── error-boundary/     # ErrorBoundary.tsx (class component, production error recovery)
│   │   ├── import/             # ImportDialog (Map → Duplicate Check 2-step flow)
│   │   ├── kanban/             # KanbanBoard, KanbanColumn, KanbanCard (drag-and-drop)
│   │   ├── layout/             # AppLayout, AppSidebar, CommandPalette, LockScreen, PageHeader, ShortcutHelpDialog, TopCommandBar
│   │   ├── providers/          # ThemeProvider, Providers wrapper
│   │   ├── settings/           # AboutTab, EditSignatureDialog, EditStatusDialog, EmailSettingsTab, KeyboardSettingsTab, PipelineSettingsTab, SecuritySettingsTab
│   │   ├── tags/               # ManageTagsDialog
│   │   ├── ui/                 # Shadcn base components (Button, Input, Dialog, etc.)
│   │   └── whats-new-modal.tsx # Modal showing changelog on version updates
│   ├── hooks/
│   │   ├── use-errors.ts       # Centralized error handler using sonner toasts
│   │   ├── use-keyboard-shortcuts.ts # Global keyboard shortcut bindings (Cmd+N, Shift+C, etc.)
│   │   ├── use-settings.ts     # Reads/writes app settings via Tauri invoke
│   │   ├── use-statuses.ts     # Fetches and caches pipeline statuses
│   │   └── use-tags.ts         # Fetches tags, assignTag, unassignTag utilities
│   ├── pages/
│   │   ├── ContactsPage.tsx    # Main contacts list (table + kanban), filtering, bulk actions
│   │   │                       # NOTE: Route is /people but file remains ContactsPage.tsx
│   │   ├── ContactDetailPage.tsx # Full contact view with tabs (Summary, Emails, Activity)
│   │   ├── DashboardPage.tsx   # Overview/stats (real data + coming-soon placeholders)
│   │   ├── EmailsPage.tsx      # Inbox tab (all synced messages) + Scheduled tab (pending/failed sends)
│   │   ├── NotesPage.tsx       # Placeholder — deferred, no urgency
│   │   ├── TasksPage.tsx       # Scaffold with realistic layout and coming-soon note
│   │   ├── TemplatesPage.tsx   # Manage and create reusable email templates with mail merge
│   │   └── SettingsPage.tsx    # Settings (Appearance, Email, Pipeline, Security, Shortcuts, Data, About tabs)
│   ├── types/
│   │   └── crm.ts              # TypeScript interfaces (see Section 7 for full list)
│   └── lib/
│       └── utils.ts            # cn(), getInitials(), getColorHex() helpers
│
├── src-tauri/                  # Tauri (Rust) backend
│   ├── src/
│   │   ├── lib.rs              # All Tauri commands, app setup, DB initialization
│   │   ├── error.rs            # AppError enum (thiserror + serde for frontend compat)
│   │   ├── main.rs             # Binary entry point (calls lib::run())
│   │   ├── launchagent.rs      # macOS LaunchAgent for background scheduling
│   │   ├── scheduler.rs        # Background scheduler: polls scheduled_emails every 60s
│   │   ├── tray.rs             # System tray icon and menu
│   │   ├── utils.rs            # Small utility helpers
│   │   └── api/                    # REST API module (axum)
│   │       ├── mod.rs              # Server startup, AppState, shutdown
│   │       ├── auth.rs             # Bearer token middleware
│   │       ├── error.rs            # ApiError types, ApiResponse<T>
│   │       ├── routes.rs           # All route → handler mappings
│   │       └── handlers/           # Per-resource endpoint handlers
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # App config (name, version, window size, bundle targets)
│   ├── capabilities/           # Tauri v2 permissions config
│   └── icons/                  # App icons (.png, .icns, .ico)
│
├── src-core/                   # Rust core library (jobdex-core crate)
│   ├── src/                    # Business logic: db, crypto, email clients, import, settings
│   ├── migrations/             # SQLite migration SQL files (20 migrations)
│   └── Cargo.toml
│
├── src-mcp/                        # Standalone MCP binary crate
│   ├── Cargo.toml
│   └── src/
│       └── main.rs                 # stdio JSON-RPC 2.0 → REST relay
│
├── .github/
│   └── workflows/
│       ├── build.yml           # CI: builds on push to main
│       └── release.yml         # CD: packages .dmg + .exe on tag push (v*)
│
├── docs/                       # Landing page (jobdex.tech)
│   ├── index.html              # Main landing page
│   ├── download.html           # Platform-specific download page
│   ├── contact.html            # Contact/support page
│   ├── CNAME                   # GitHub Pages custom domain (jobdex.tech)
│   ├── favicon.svg             # Site favicon
│   ├── llm.txt                 # LLM/AI crawler summary for GEO (Generative Engine Optimization)
│   ├── sitemap.xml             # XML sitemap for Google Search Console
│   ├── css/style.css
│   └── js/main.js
│
├── scripts/
│   └── fix-dmg.sh              # Post-build DMG customization script
│
├── package.json                # Frontend npm deps
├── vite.config.ts              # Vite config with @/ path alias
├── tsconfig.json
├── tailwind.config.js
└── .agent/agent.md             # This file
```

---

## 4. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.1 | UI framework |
| TypeScript | ~5.8 | Type safety |
| Vite | 7.x | Build tool / dev server |
| Tailwind CSS | 3.4 | Utility-first styling |
| Shadcn UI (via Radix) | latest | Pre-built accessible components |
| `react-router-dom` | 7.x | Client-side routing |
| `sonner` | 2.x | Toast notifications |
| `lucide-react` | 0.562 | Icon set |
| `cmdk` | 1.1 | Command palette (⌘K) |
| `@dnd-kit` | 6+10 | Drag-and-drop for Kanban |
| `date-fns` | 4.1 | Date formatting |
| `@tauri-apps/api` | 2 | Tauri bridge (`invoke`, etc.) |
| `@tauri-apps/plugin-dialog` | 2 | Native file open dialogs |

### Backend — Tauri App (`src-tauri`)
| Technology | Purpose |
|---|---|
| Tauri 2 | Desktop app shell, native IPC bridge |
| Rust (Edition 2021) | All backend logic |
| `sqlx 0.8.6` (SQLite) | Async database access |
| `thiserror` | Structured error types (`AppError`) |
| `serde` + `serde_json` | Serialization to/from frontend |
| `uuid` | Contact/entity ID generation |
| `chrono` | DateTime handling |
| `open` | Open URLs in system browser |
| `dirs` | Locate `~/.jobdex` config dir |
| `keyring` | OS keychain integration |
| `tauri-plugin-deep-link` | Custom protocol handling (jobdex://) |
| `tauri-plugin-dialog` | Native file picker dialogs |
| `tauri-plugin-opener` | Open files/URLs natively |
| `axum 0.8` | Embedded REST API server (HTTP framework) |
| `tower` + `tower-http` | Middleware (auth, CORS) |
| `tokio-stream` + `async-stream` | SSE streaming support |

### Backend — MCP Binary (`src-mcp`)
| Technology | Purpose |
|---|---|
| `tokio` | Async I/O for stdio JSON-RPC loop |
| `serde_json` | JSON-RPC 2.0 parsing |
| `reqwest 0.12` | HTTP client for REST API calls |
| `clap` | CLI argument parsing (`--api-url`, `--api-key`) |
| `anyhow` | Error handling |

### Backend — Core Library (`src-core`)
| Technology | Purpose |
|---|---|
| `jobdex-core` crate | Shared business logic |
| `sqlx` | Database models + migrations (14 files) |
| `oauth2` | Gmail and Outlook OAuth 2.0 with PKCE |
| `reqwest` | HTTP client for Gmail/Outlook API calls |
| `calamine` | `.xlsx` file parsing |
| `csv` | `.csv` file parsing |
| `aes-gcm` | **AES-256-GCM** encryption for tokens/sensitive data |
| `sqlx` (SQLCipher) | Full **encrypted** SQLite database (v4) |
| `pbkdf2` + `sha2` | PIN hashing (100k iterations) |
| `keyring` | OS-level keychain management (macOS/Windows) |

---

## 5. Data Model

### `contacts` table
```
id                  TEXT PRIMARY KEY (UUID v4)
first_name          TEXT NOT NULL
last_name           TEXT NOT NULL
email               TEXT
linkedin_url        TEXT
title               TEXT
company             TEXT
location            TEXT
company_website     TEXT
status              TEXT    -- Legacy text field (kept for backward compat)
status_id           TEXT    -- FK to statuses.id
last_contacted_date DATETIME
next_contact_date   DATETIME
cadence_stage       INTEGER
intelligence_summary TEXT   -- Manual text summary, user-editable
created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `statuses` table
```
id          TEXT PRIMARY KEY
label       TEXT NOT NULL
color       TEXT NOT NULL (hex color)
position    INTEGER
is_default  BOOLEAN
```

**Built-in seed statuses** (created by `fix_orphan_contacts`):
- `stat-new` → New (#3b82f6)
- `stat-contacted` → Contacted (#eab308)
- `stat-replied` → Replied (#a855f7)
- `stat-interested` → Interested (#22c55e)
- `stat-not-interested` → Not Interested (#ef4444)

### `tags` table
```
id          TEXT PRIMARY KEY (UUID v4)
name        TEXT NOT NULL
color       TEXT NOT NULL
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `contact_tags` junction table
```
contact_id  TEXT (FK → contacts.id)
tag_id      TEXT (FK → tags.id)
PRIMARY KEY (contact_id, tag_id)
```

### `email_accounts` table
Managed by `jobdex-core::EmailService`. Stores OAuth tokens (access + refresh) for connected Gmail/Outlook accounts.

### `email_messages` table
Synced from connected accounts. Linked to `contact_id` by email address matching.

### `email_tracking` table
🔴 **Removed** in `v0.1.1`. Tracking relay was decommissioned. Tracking will be reimplemented in a future version — approach TBD.

### `settings` table (key-value store)
```
key     TEXT PRIMARY KEY
value   TEXT
```

Known setting keys: `theme_mode`, `tracking_secret`, `tracking_server_url`.

Note: `accent_color` is being removed from settings — the Appearance tab will only support dark/light/system mode going forward.

---

## 6. Known Issues & Architecture Gotchas

### Legacy Clerk References
The codebase may contain residual references to Clerk (auth/billing). **Clerk integration is permanently dropped.** This project is free with no authentication layer. Any Clerk code found should be treated as dead code and removed.

---

## 7. TypeScript Interfaces (Frontend)

Defined in `src/types/crm.ts`:

```typescript
interface Contact {
  id: string;
  first_name: string; last_name: string;
  title?: string; company?: string; location?: string;
  email?: string; linkedin_url?: string; company_website?: string;
  status?: string;  // Legacy field
  status_id?: string; status_label?: string; status_color?: string;
  last_contacted_date?: string; next_contact_date?: string;
  effective_next_date?: string; // Earliest of manual date or next scheduled event
  next_contact_event?: string;
  cadence_stage?: number;
  summary?: string;
  created_at: string; updated_at: string;
  tags?: Tag[];
}

interface Tag {
  id: string; name: string; color: string; created_at: string;
}

interface Status {
  id: string; label: string; color: string; is_default: boolean; position: number;
}

interface EmailAccount {
  id: string; provider: string; email: string;
  expires_at?: number; last_synced_at?: string;
  created_at: string; updated_at: string;
}

interface EmailMessage {
  id: string; thread_id: string; from_email: string; to_email: string;
  subject?: string; body?: string; html_body?: string;
  sent_at?: string; status?: string;
  provider_message_id?: string; manually_assigned?: number;
  created_at: string;
}

interface EmailTemplate {
  id: string; name: string;
  subject?: string; body?: string;
  created_at: string; updated_at: string;
}

interface EmailAttachment {
  id: string; messageId: string; filename: string;
  contentType: string; fileSize: number; filePath: string;
  createdAt: string;
}

interface ContactEvent {
  id: string; contact_id: string; title: string;
  description?: string; event_at: string;
  created_at: string; updated_at: string;
}

interface ContactFile {
  id: string; contactId: string; filename: string;
  filePath: string; createdAt: string;
}

interface EmailSignature {
  id: string; name: string; content: string;
  createdAt: string; updatedAt: string;
}

interface ScheduledEmail {
  id: string; contactId: string;
  contactFirstName: string; contactLastName: string;
  accountId: string; subject: string; body: string;
  scheduledAt: string; status: string; // 'pending' | 'sent' | 'failed'
  errorMessage?: string; createdAt: string;
}

interface ApiStatus {
  enabled: boolean;
  port: number;
  keySet: boolean;
}
```

---

## 8. Application Routes

```
/                   → DashboardPage (stats overview, partially scaffolded)
/people             → ContactsPage (table + kanban views) — NOTE: route is /people, file is ContactsPage.tsx
/contact/:id        → ContactDetailPage (full contact profile, email composition, summary editing)
/emails             → EmailsPage (Inbox tab: all synced messages + Scheduled tab: pending/failed sends)
/notes              → NotesPage (placeholder — deferred)
/tasks              → TasksPage (placeholder — job-search to-dos, to be built)
/templates          → TemplatesPage (manage reusable email templates)
/settings           → Redirects to /settings/appearance
/settings/:tab      → SettingsPage (tabs: appearance, email, pipeline, security, shortcuts, data, about)
```

The app uses a shared `AppLayout` route wrapper. All pages except Settings display a persistent `PageHeader` containing the global command palette (`⌘K`) search bar.

**Sidebar order** (all items visible even as placeholders):
```
Dashboard
People
Emails
Tasks
Templates
──────────────
Settings
```

---

## 9. Complete Tauri Command Reference

All commands are registered in `src-tauri/src/lib.rs` and invoked from the frontend via `invoke("command_name", { args })`.

### Contact Commands
| Command | Args | Returns | Notes |
|---|---|---|---|
| `get_contacts` | — | `ContactWithTags[]` | Fetches all contacts with LEFT JOIN on statuses and tags |
| `get_contact_by_id` | `id` | `ContactWithTags` | Focused fetch for ContactDetailPage |
| `add_contact` | `first_name, last_name, email?, linkedin_url?, status_id?, title?, company?, location?, company_website?` | `String` (new ID) | Defaults to `stat-new` |
| `update_contact` | `id, first_name?, last_name?, email?, email_verified?, phone?, address?, linkedin_url?, status?, status_id?, last_contacted_date?, next_contact_date?, cadence_stage?, title?, company?, location?, company_website?, intelligence_summary?, tags?` | `()` | Syncs legacy 'status' label automatically |
| `delete_contact` | `id` | `()` | Migrated to AppError |
| `delete_contacts_bulk` | `ids: String[]` | `u64` (deleted count) | Transactional |
| `update_contacts_status_bulk` | `ids: String[], status_id` | `u64` | Transactional |
| `fix_orphan_contacts` | — | `String` | Seeds default statuses, fixes NULL/invalid status_ids |

### Contact Event Commands
| Command | Args | Returns | Notes |
|---|---|---|---|
| `get_contact_events` | `contact_id` | `ContactEvent[]` | Fetches history of interactions and notes |
| `create_contact_event` | `contact_id, title, description?, event_date?, event_type?` | `String` (ID) | |
| `update_contact_event` | `id, title, description?, event_date?, event_type?` | `()` | |
| `delete_contact_event` | `id` | `()` | |

### Status Commands
| Command | Args | Returns |
|---|---|---|
| `get_statuses` | — | `Status[]` |
| `create_status` | `label, color` | `String` (new ID) |
| `update_status` | `id, label, color` | `()` |
| `delete_status` | `id` | `()` — Also NULLs contacts using this status |

### Tag Commands
| Command | Args | Returns |
|---|---|---|
| `get_tags` | — | `Tag[]` |
| `create_tag` | `name, color` | `String` (new ID) |
| `update_tag` | `id, name, color` | `()` |
| `delete_tag` | `id` | `()` |
| `assign_tag` | `contact_id, tag_id` | `()` — `INSERT OR IGNORE` |
| `unassign_tag` | `contact_id, tag_id` | `()` |

### Email / Account Commands
| Command | Args | Returns | Notes |
|---|---|---|---|
| `get_email_accounts` | — | `EmailAccount[]` | |
| `gmail_connect` | — | `String` | Opens browser for OAuth PKCE, awaits callback on localhost |
| `outlook_connect` | — | `String` | Same PKCE flow for Microsoft |
| `email_send` | `account_id, contact_id?, to, subject, body` | `String` | Immediate send; writes contact_event if contact_id provided |
| `email_schedule` | `account_id, contact_id, subject, body, scheduled_at: i64` | `String` | Queues in scheduled_emails; background scheduler polls every 60s |
| `update_scheduled_email` | `id, subject, body, scheduled_at: i64` | `()` | Only updates if status='pending' |
| `cancel_scheduled_email` | `id` | `()` | Hard delete from scheduled_emails |
| `get_scheduled_emails` | `contact_id?` | `ScheduledEmail[]` | Joins contacts for name; omit contact_id to get ALL |
| `get_emails_for_contact` | `contact_id` | `EmailMessage[]` | Matches on contact email ↔ from_email/to_email |
| `get_all_emails` | `status_filter?, limit?, offset?` | `EmailMessage[]` | All accounts; filter: `"received"\|"sent"\|null`; limit default 100 |
| `get_attachments_for_message` | `message_id` | `EmailAttachment[]` | Returns attachment metadata (file path on disk) |
| `open_attachment` | `file_path` | `()` | Opens with system default app via opener |
| `delete_email_account` | `account_id` | `()` | CASCADEs to messages/threads/attachments |
| `sync_email_accounts` | — | `SyncResult[]` | Syncs ALL connected accounts |
| `sync_email_account` | `account_id` | `SyncResult` | Syncs single account; returns synced_count, skipped_count, token_expired |
| `reset_email_sync_state` | `account_id?: String` | `()` | Clears `last_synced_at` to force full re-fetch |
| `check_email_credentials` | — | `{ gmail_configured, outlook_configured }` | Checks if `~/.jobdex/credentials.json` exists |
| `save_email_credentials` | `provider, client_id, client_secret` | `()` | Writes to `~/.jobdex/credentials.json` or `ms_credentials.json` |

### Email Template Commands
| Command | Args | Returns | Notes |
|---|---|---|---|
| `get_email_templates` | — | `EmailTemplate[]` | Ordered by name ASC |
| `upsert_email_template` | `id?, name, subject?, body?` | `String` (ID) | Creates or updates a template |
| `delete_email_template` | `id` | `()` | |

### Email Signature Commands
| Command | Args | Returns |
|---|---|---|
| `get_signatures` | — | `EmailSignature[]` |
| `upsert_signature` | `id?, name, content` | `()` — INSERT OR REPLACE |
| `delete_signature` | `id` | `()` |

### Email Tracking Commands

> ⚠️ **Removed** — `poll_email_tracking` and `get_email_tracking` have been fully removed from the codebase (not in `generate_handler![]`). Reimplementation is TBD after multi-step campaigns are in place.

### Import Commands
| Command | Args | Returns | Notes |
|---|---|---|---|
| `get_import_headers` | `file_path` | `ImportPreview` | Reads column names from CSV/XLSX without parsing all rows |
| `analyze_import` | `file_path, mapping: ColumnMapping` | `ImportAnalysis { total_detected, new_count, duplicate_count }` | Dry-run duplicate detection |
| `import_contacts` | `file_path, mapping: ColumnMapping, mode: "skip"\|"merge"\|"none"` | `usize` (imported count) | Deduplication via email, LinkedIn slug, name+company |

### Settings Commands
| Command | Args | Returns |
|---|---|---|
| `get_settings` | — | `HashMap<String, String>` |
| `save_setting` | `key, value` | `()` |
| `save_api_key` | `service, key` | `()` — Legacy; stores in settings table |

### Security Commands
| Command | Args | Returns | Notes |
|---|---|---|---|
| `set_lock_pin` | `pin` | `()` | Sets PBKDF2 hashed PIN |
| `verify_lock_pin` | `pin` | `bool` | Verifies PIN against hash |
| `has_lock_pin` | — | `bool` | Checks if a PIN is currently active |
| `remove_lock_pin` | `current_pin` | `()` | Validates and removes PIN lock |

### Data Management Commands
| Command | Args | Returns |
|---|---|---|
| `export_all_data` | — | `String` (JSON) — contacts, statuses, settings |
| `clear_all_data` | — | `()` — Deletes contacts, statuses, tags, contact_tags |

### API Management Commands
| Command | Args | Returns | Notes |
|---|---|---|---|
| `generate_api_key` | — | `String` | Generates `jd_` + 48 hex chars, saves to `settings.api_key` |
| `get_api_status` | — | `ApiStatus` | Returns `{ enabled, port, keySet }` — does NOT expose the key value |

---

## 10. Error Handling Architecture

### Backend (`src-tauri/src/error.rs`)

All Tauri commands return `Result<T, AppError>`. The `AppError` enum is serialized to JSON and sent to the frontend.

```rust
pub enum AppError {
    Database(sqlx::Error),    // code: "DATABASE"
    Network(String),          // code: "NETWORK"
    Io(std::io::Error),       // code: "IO"
    Validation(String),       // code: "VALIDATION"
    Serialization(serde_json::Error), // code: "SERIALIZATION"
    Internal(String),         // code: "INTERNAL"
}
```

Serialized format (sent to frontend):
```json
{ "code": "DATABASE", "message": "Database error: no rows returned" }
```

`AppError` also implements `From<anyhow::Error>` and `From<String>` to support easy conversions from legacy string errors.

### Frontend (`src/hooks/use-errors.ts`)

The `useErrors()` hook exposes a single `handleError(error, fallbackMessage?)` function. All components use this instead of raw `toast.error()` or `alert()`. It:
1. Detects structured `AppError` objects from Rust and shows `CODE: message`
2. Handles plain string errors
3. Falls back to the provided `fallbackMessage` for unknown errors

**⚠️ Known issue**: Some errors currently surface developer-readable Rust strings instead of user-friendly messages. All `AppError` variants need to be audited and mapped to clean plain-English copy. See Section 2 (Voice & Tone) for message style guidance.

---

## 11. Security Architecture

JobDex is built with a "Privacy-First" mandate. Security is implemented natively in the Rust core.

### 1. Data Encryption at Rest
- **Database (SQLCipher)**: The entire `jobdex.db` is encrypted using **SQLCipher**. Access requires a **256-bit key** (64-character hex string) stored in the OS Keychain.
- **Sensitive Fields (AES-256-GCM)**: OAuth tokens and other high-sensitivity strings are further encrypted using **AES-256-GCM** before being written to the DB.
- **Master Key**: A unique 256-bit master encryption key is generated locally on first run and persisted in the OS Keychain (`keyring` crate).

### 2. Identity & Secrets
- **OS Keychain Integration**: Encryption keys and OAuth tokens are NEVER stored in plaintext. They are delegated to the **macOS Keychain** or **Windows Credential Manager**.
- **PIN Hashing**: The optional app lock screen uses **PBKDF2-HMAC-SHA256** with **100,000 iterations** and a 16-byte random salt to protect the PIN.

### 3. Application Hardening
- **Strict CSP**: The Tauri webview enforces a rigorous Content Security Policy (CSP).
- **Process Isolation**: The frontend has zero access to the filesystem; all operations must go through the typed, audited Rust bridge.

---

## 12. Email Tracking — Current Status

Email tracking (open/click/reply) is a **wanted future feature** but is currently **not functional**. The previous implementation used a Cloudflare Worker relay that has been decommissioned. The `poll_email_tracking` and `get_email_tracking` commands have been **fully removed** from the backend.

The reimplementation approach is TBD — it will be specced and built after multi-step campaigns are in place. Do not attempt to re-enable the old tracking relay or reference Clerk for authentication in any tracking work.

---

## 13. Email Sync & Parsing Architecture

This section documents the complete email integration system for future reference.

### Key Files
| File | Role |
|---|---|
| `src-core/src/email_service.rs` | `EmailService` — all email business logic: OAuth, sync, send, token refresh, attachment handling |
| `src-tauri/src/scheduler.rs` | Background scheduler: polls `scheduled_emails` every 60s, sends ready emails via `EmailService` |
| `src/pages/EmailsPage.tsx` | Emails page: Inbox tab (all synced messages) + Scheduled tab (pending/failed sends) |

### Database Tables (email-related migrations)
| Migration | Tables Created |
|---|---|
| `20260217000000_email_crm_phase1.sql` | `email_accounts`, `email_threads`, `email_messages`, `scheduled_emails` |
| `20260218000001_email_sync.sql` | Adds `last_synced_at` to accounts, `provider_message_id` (UNIQUE) + `manually_assigned` to messages |
| `20260306131500_email_templates.sql` | `email_templates` |
| `20260321000002_email_attachments.sql` | `email_attachments` (id, message_id FK, filename, content_type, file_size, file_path) |

### Sync Flow (incremental)
1. `sync_email_account(account_id)` called from frontend or background.
2. `EmailService::get_account()` — retrieves account, **auto-refreshes OAuth token** if expired (60s buffer). Token stored AES-256-GCM encrypted in DB.
3. Builds `contact_email_to_id` HashMap from all CRM contacts — **only emails matching CRM contacts are stored** (no unrelated inbox noise).
4. Fetches messages from Gmail/Outlook API since `last_synced_at`.
5. Per message:
   - Determines direction (`sent` / `received`) based on account email.
   - Upserts `email_thread` for `(contact_id, account_id)`.
   - `INSERT OR IGNORE` into `email_messages` keyed on `provider_message_id` (dedup).
   - Saves attachments to `~/.jobdex/attachments/<message_id>/` (filenames sanitized against path traversal). Inserts metadata into `email_attachments`.
6. Updates `last_synced_at`. Returns `SyncResult { synced_count, skipped_count, token_expired }`.

### Send Flow
1. Frontend calls `email_send(account_id, contact_id?, to, subject, body)`.
2. `EmailService::send_email()` — gets account (auto-refreshes token), delegates to `GmailClient` or `OutlookClient`.
3. Provider returns `message_id`. Tauri command writes a `contact_events` row (`event_type='activity'`) if `contact_id` provided.

### Schedule Flow
1. Frontend calls `email_schedule(account_id, contact_id, subject, body, scheduled_at: i64)`.
2. Inserts into `scheduled_emails` with `status='pending'`. Writes `contact_events` row.
3. **Background scheduler** (`scheduler.rs`) runs every 60 seconds. Queries `WHERE status='pending' AND scheduled_at <= NOW`.
4. For each ready email: looks up recipient from contacts, calls `email_service.send_email()`.
   - Success → `status='sent'`.
   - Failure → emits `"email_schedule_failed"` Tauri event to frontend. Stays `'pending'` to retry on next tick.
   - No contact email → `status='failed'` with `error_message`.

### Token Encryption
- Access/refresh tokens encrypted with `crypto::encrypt()` (AES-256-GCM) before DB write.
- `crypto::decrypt_or_passthrough()` used on read — falls back to plaintext for legacy rows.
- Token refresh is transparent: `get_account()` handles it internally before any send/sync.

### EmailsPage UI Structure
- **Scheduled tab**: pending + failed emails, status badges, overdue indicator, Cancel button (AlertDialog confirmation → `cancel_scheduled_email`).
- **Inbox tab**: all synced messages across all accounts, `sent`/`received`/`all` filter toggle, expandable message rows showing full body.
- Refresh button re-calls `get_scheduled_emails()` + `get_all_emails()`.

---

## 14. Import Pipeline

The import flow is a **2-step UI workflow** (mapping → duplicate check).

**Step 1 — Mapping Screen**:
- User selects a `.csv` or `.xlsx` file (via Tauri native file dialog).
- `get_import_headers` is called, which returns the file's column names without loading all rows.
- User assigns each column to a contact field (first_name, last_name, email, linkedin_url, company, title).

**Step 2 — Duplicate Check Screen**:
- `analyze_import` is called with the column mapping to get counts of new vs. duplicate contacts.
- User chooses one of three modes:
  - **Skip**: Import only new contacts, ignore duplicates.
  - **Merge**: Fill missing fields on duplicate records without overwriting existing data.
  - **Import All**: Insert everything (no dedup).
- `import_contacts` is called to execute.

**Deduplication Logic**:
1. Exact email match (case-insensitive)
2. LinkedIn URL slug match (e.g., `/in/john-doe`)
3. First name + last name + company (case-insensitive)

---

## 15. Layout Architecture

All pages (except Settings) are wrapped in `AppLayout` which:
- Renders the sidebar (`AppSidebar`)
- Renders a `PageHeader` at the top with the `CommandPalette` (⌘K) and quick-action buttons (Add Contact, Import, etc.)
- Exposes state through React Router's `useOutletContext`:
  - `setCommandOpen(open: boolean)` — toggles command palette
  - `setAddContactOpen(open: boolean)` — opens the Add Contact dialog
  - `setImportOpen(open: boolean)` — opens the Import dialog
  - `refreshTrigger: number` — increments to signal pages to re-fetch data

Settings page is excluded from this context and uses its own tab-based layout.

---

## 16. Settings Architecture

Settings are stored in the `settings` key-value table and accessed via the `useSettings()` hook.

**Settings Tabs**:
- **Appearance**: Theme mode only — Light, Dark, System. No accent color picker (removed). Dark mode uses white accents, light mode uses black accents, system follows device setting.
- **Email Integration**: Connect Gmail/Outlook via OAuth, manage connected accounts, sync controls. Email signatures section at bottom. Tracking config will return when tracking is reimplemented.
- **Pipeline**: Full pipeline configuration UI — create, rename, reorder (drag), color-code, and delete stages. Fully functional.
- **Security**: App Lock (PIN protection), encryption info, local storage info. Fully working.
- **API Access**: Enable/disable the local REST API server. Configure port (default 13420). Generate and manage the Bearer token API key. Displays pre-filled MCP config JSON for Claude Desktop, Cursor, and Windsurf.
- **Keyboard Shortcuts**: Full customization UI — capture mode, conflict detection, per-shortcut reset. See Section 16a for full documentation.
- **Data**: Export data as JSON, clear all data. CSV export deferred.
- **About**: App version, builder info, What's New section (static, fed from `src/changelog.ts`).

---

## 16a. Keyboard Shortcuts — Full Documentation

### Architecture Overview

The keyboard shortcuts system is built around a **central registry pattern** with user-customizable bindings persisted in the `settings` table.

**Key Files**:
| File | Role |
|---|---|
| `src/lib/keyboard-shortcuts.ts` | **Source of truth** — `SHORTCUT_REGISTRY` array, types, and utility functions |
| `src/hooks/use-keyboard-shortcuts.ts` | React hook — global `keydown` listener that dispatches to action callbacks |
| `src/components/settings/keyboard-settings-tab.tsx` | Settings UI — visual list with live capture/reassign/conflict detection |
| `src/components/layout/shortcut-help-dialog.tsx` | Quick-reference overlay (triggered by `⌘/`) |
| `src/components/ui/key-combo.tsx` | Visual key badge renderer (displays `⌘⇧N` style badges) |

### Default Shortcut Map

All shortcuts use `Meta` as the modifier key — this maps to `⌘` on macOS and `Ctrl` on Windows/Linux.

#### Actions
| Shortcut | Default Binding | Action | Scope |
|---|---|---|---|
| New Contact | `⌘N` | Opens Add Contact dialog | Global |
| Compose Email | `⌘⇧C` | Opens Compose Email dialog | **Contact detail page only** |
| Import Contacts | `⌘I` | Opens Import dialog | Global |

#### Navigation
| Shortcut | Default Binding | Action |
|---|---|---|
| Dashboard | `⌘1` | Navigate to `/` |
| People | `⌘2` | Navigate to `/people` |
| Emails | `⌘3` | Navigate to `/emails` |
| Tasks | `⌘4` | Navigate to `/tasks` |
| Templates | `⌘5` | Navigate to `/templates` |

#### System
| Shortcut | Default Binding | Action |
|---|---|---|
| Command Palette | `⌘K` | Toggle command palette |
| Keyboard Shortcuts Help | `⌘/` | Open shortcuts overlay dialog |
| Settings | `⌘,` | Navigate to `/settings` |

### Customization System

Users can rebind any shortcut from **Settings → Keyboard**:

1. **Click** any shortcut's key badge → enters **capture mode** (dashed border, "Press keys…" prompt).
2. **Press** the desired key combination → if valid and not conflicting, it's saved immediately.
3. **Conflict detection**: If the pressed combo is already bound to another shortcut, a red error appears: `Already used by "X"`. The binding is NOT saved.
4. **Escape** cancels capture mode without changing anything.
5. **Reset single**: A ↺ icon appears on hover for any customized shortcut — click to restore its default.
6. **Reset all**: The "Reset all" button at the top restores every shortcut to its factory default.

### Storage Format

Bindings are stored in the `settings` table as key-value pairs:

| Settings Key | Value Format | Example |
|---|---|---|
| `shortcut.command_palette` | `Modifier+key` | `Meta+k` |
| `shortcut.new_contact` | `Modifier+key` | `Meta+n` |
| `shortcut.compose_email` | `Modifier+Shift+key` | `Meta+Shift+c` |

- **Modifier names**: `Meta`, `Shift`, `Alt`, `Ctrl` — joined with `+`.
- **Key name**: Always lowercase (e.g., `k`, `n`, `1`).
- `Meta` is treated as `⌘` on macOS and `Ctrl` on Windows — cross-platform via `metaKey || ctrlKey`.
- If no user override exists in `settings`, the `defaultBinding` from the registry is used.

### Behavior Rules

1. **Input suppression**: Shortcuts are suppressed when focus is inside an `<input>`, `<textarea>`, `<select>`, or `contenteditable` element.
2. **Settings page lockout**: All shortcuts except `⌘K` (Command Palette) are disabled when on `/settings/*` routes — this prevents interference with the capture mode UI.
3. **Location restrictions**: Some shortcuts (e.g., Compose Email) are restricted to specific routes. If triggered elsewhere, a toast notification explains where the shortcut works.
4. **Repeat suppression**: Held-down keys (`e.repeat`) are ignored — only the initial keypress fires.
5. **First-match wins**: If multiple shortcuts somehow match the same combo, only the first match in the registry fires.

### Type System

```typescript
type ShortcutActionId =
    | "command_palette" | "new_contact" | "compose_email"
    | "open_settings" | "nav_dashboard" | "nav_people"
    | "nav_emails" | "nav_tasks" | "nav_templates"
    | "import_contacts" | "shortcut_help";

type ShortcutCategory = "Navigation" | "Actions" | "System";

interface ShortcutDefinition {
    id: ShortcutActionId;
    label: string;
    category: ShortcutCategory;
    defaultBinding: string;    // e.g. "Meta+k"
    settingsKey: string;       // e.g. "shortcut.command_palette"
    locationRestriction?: {
        pattern: RegExp;
        toastMessage: string;
    };
}
```

### How to Add a New Shortcut

1. Add a new `ShortcutActionId` to the union type in `src/lib/keyboard-shortcuts.ts`.
2. Add a `ShortcutDefinition` entry to the `SHORTCUT_REGISTRY` array.
3. In the component that owns the action, pass the action callback to `useKeyboardShortcuts()` via the `actions` map.
4. The shortcut will automatically appear in both the Settings tab and the Help overlay — no additional UI wiring needed.

---

## 17. Contact Detail Page — Feature Inventory

The `ContactDetailPage` is the most complex page.

**Layout**:
- Left panel: contact info fields (name, title, company, email, location, tags)
- Right panel sections: Summary (manual notes), Upcoming Events, Attached Files, Pipeline Status
- Bottom tabs: Emails, Activity

**Tabs**:
1. **Emails** — Shows email history for the contact via `EmailHistoryTab` component.
2. **Activity** — Chronological timeline. Dynamically populated: status changes, emails sent, manual events. Delete button on hover (except sentinel "Contact created" row).

**Actions (from the profile header)**:
- Edit contact (opens `EditContactDialog`)
- Compose email (opens `ComposeEmailDialog`)
- Manage tags (opens `ManageTagsDialog`)
- Delete contact (with `AlertDialog` confirmation)
- Change status (via `StatusPicker` component)
- Open LinkedIn URL in browser (left-pane icon)

**Right panel — Attached Files card**:
- Replaced the old LinkedIn card.
- File picker → `attach_file(contact_id, src_path)` — copies to `{app_data_dir}/files/{uuid}_{filename}`.
- Click filename → `open_contact_file(id)` — opens with system viewer.
- Trash icon → `delete_contact_file(id)` — removes from DB + filesystem.

**Known gaps**:
- Event reminders (Add Event works, but OS notifications not confirmed to fire).

**Data Fetching**: `get_contact_by_id` for optimized single-record retrieval.

---

## 18. CI/CD Pipeline

Managed by GitHub Actions at `Gitter09/jobdex`.

- **`build.yml`**: Triggered on push to `main`. Validates the build compiles.
- **`release.yml`**: Triggered on tag push matching `v*`. Builds and attaches:
  - macOS: `.dmg`
  - Windows: `.exe` (NSIS installer)

Latest release: `v0.1.3`

**To trigger a new release**:
```sh
git tag v0.x.x && git push origin v0.x.x
```

---

## 19. Local Development

### Prerequisites
- Node.js + Bun (frontend)
- Rust toolchain (stable)
- Tauri CLI v2

### Commands
```sh
# Frontend dev server
npm run dev

# Full Tauri dev (hot-reload)
bun run tauri dev

# Production build
bun run tauri build

# Build verification only (after TypeScript check)
bun run build
```

### Database Location
The SQLite database is stored at the OS app data directory:
- macOS: `~/Library/Application Support/com.jobdex.desktop/jobdex.db`
- Windows: `C:\Users\<user>\AppData\Roaming\com.jobdex.desktop\jobdex.db`

The `jobdex-core` crate handles migrations automatically on startup via SQLx.

### Email Credentials
Stored at `~/.jobdex/credentials.json` (Gmail) and `~/.jobdex/ms_credentials.json` (Outlook).
Format (both files):
```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }
}
```

---

## 20. Current State & Known Issues

### Feature Completion Status
| Feature | Status |
|---|---|
| Contact CRUD | ✅ Complete |
| Pipeline Statuses (custom) | ✅ Complete |
| Tag System | ✅ Complete |
| CSV/XLSX Import (2-step) | ✅ Complete |
| Table View (People page) | ✅ Complete |
| Kanban View (People page) | ✅ Complete |
| Compose & Send Email | ✅ Complete |
| Schedule Email (future date) | ✅ Complete |
| Gmail OAuth Integration | ✅ Complete |
| Outlook OAuth Integration | ✅ Complete |
| Email Sync (inbox) | ✅ Complete |
| Manual Contact Summary | ✅ Complete |
| Email Templates (mail merge) | ✅ Complete |
| Command Palette (⌘K) | ✅ Complete |
| Theme (Light/Dark/System) | ✅ Complete |
| Export Data (JSON) | ✅ Complete |
| Error Boundary (crash recovery) | ✅ Complete |
| Centralized Error Handling | ✅ Complete |
| Error Messages (user-friendly copy) | ✅ Complete — all AppError variants mapped, friendly fallbacks with ERR-DB/INT/SER codes |
| App Lock / PIN Security | ✅ Complete |
| Activity Timeline (dynamic) | ✅ Complete — status changes + email sends write contact_events |
| Bulk Status Update (UI) | ✅ Complete |
| Pipeline Config UI (Settings) | ✅ Complete — drag-to-reorder, inline edit, color picker, delete |
| Emails Page | ✅ Complete — scheduled emails view + full inbox (all accounts, sent/received filter) |
| Email Signatures | ✅ Complete — create/edit/delete in Settings; picker in ComposeDialog |
| Attached Files per Contact | ✅ Complete — file picker, copy-to-appdata, open, delete |
| Keyboard Shortcuts | ✅ Complete — Cmd+N/Shift+C/,/1–5/I/K; Cmd+/ help overlay |
| View & Cancel Scheduled Emails | ✅ Complete |
| Dashboard | ✅ Complete — real data (totals, pipeline breakdown) + coming-soon placeholders |
| Tasks Page | ✅ Complete — scaffold with realistic layout and coming-soon note |
| Tag Filtering | ✅ Complete |
| Email Open/Click Tracking | 🔴 Decommissioned — to be reimplemented |
| Notes Page | 🔶 Placeholder — deferred |
| Onboarding Flow | ✅ Complete — first-launch walkthrough with animations |
| Local REST API (axum, `/api/v1`) | ✅ Complete — localhost only, Bearer auth, 40+ endpoints |
| MCP Server (stdio + SSE) | ✅ Complete — `jobdex-mcp` binary + SSE endpoint at `/api/v1/sse` |
| Event Reminders (OS notifications) | 🔶 Add Event works; OS notification firing unconfirmed |
| Multi-step Email Campaigns | 🔴 Not built — next major feature |

### Known Technical Debt
1. **`invoke()` arg shapes** — 4 commands (`add_contact`, `update_contact`, `create_contact_event`, `update_contact_event`) use `{ args: {...} }` wrapping (Rust takes a single struct param); all others use flat args. Both work correctly in Tauri v2. Normalizing is cosmetic only and requires changing 4 Rust function signatures + 8 TS call sites; deferred.
2. **IPC camelCase split** — Core domain models in `src-core/src/db.rs` (Contact, Tag, Status, EmailMessage, etc.) have no `#[serde(rename_all = "camelCase")]`, so they cross IPC as snake_case. Types defined in `src-tauri/src/lib.rs` DO have `rename_all = "camelCase"` and use camelCase in TS. This split is intentional for now; full normalization is a large PR deferred.
3. **Legacy `contacts.status` TEXT column** — still present in the DB schema but is no longer written to (removed in v0.2.1). The column drop is deferred.
4. **Unused DB tables** — `companies`, `applications`, `campaigns`, `interactions` exist in schema but are unpopulated.
5. **Email tracking** — `poll_email_tracking` / `get_email_tracking` fully removed; reimplementation TBD after multi-step campaigns.

---

## 21. AI Feature Removal — Context

The project **previously had AI features** that have been deliberately removed as of v0.1.1:

- **Magic Paste** (AI clipboard parsing): Removed.
- **AI Enrichment**: Removed from Contact Detail Page. Summary is now manually entered.
- **AI Email Drafting**: Removed from `ComposeEmailDialog`. Users use manual templates.
- **AI Settings Tab**: Removed. Settings for `ai_provider`, `ai_model`, `ai_base_url` remain in the DB for legacy reasons but are not exposed in the UI.
- **`ai.rs` and `email_ai.rs`**: Physically deleted from the filesystem.

**Reason**: Stable, privacy-first, offline-first experience without external API dependencies. AI features are a possible future opt-in addition, not a near-term priority.

---

## 22. Roadmap — Current Direction

This reflects confirmed decisions. For full rationale, see `JobDex_Direction_Document.md`.

### ✅ Completed (v0.2.0 pre-release sprint)
All M1–M22 and S2–S5 items from the LinkedIn release plan are done. Highlights:
- People page (renamed from Contacts), bulk status update, tag filtering
- Activity timeline (dynamic), Kanban edit/delete/add-stage, Pipeline settings UI
- Error message audit, toast UX overhaul
- Emails page — scheduled view + full inbox (shipped ahead of schedule)
- Email signatures, attached files per contact
- View & cancel scheduled emails, keyboard shortcuts (Cmd+N/Shift+C/,/1–5/I/K//)
- Dashboard (real data + coming-soon placeholders), Tasks page (scaffold)
- About tab, What's New modal, update checker

### 🔴 Now (remaining before LinkedIn post)
1. Onboarding flow — warm, Arc/Notion-inspired first-launch experience (S1)

### 🟡 Soon (post-release v0.2 sprint)
2. Multi-step email campaigns (implementation to be specced separately)
3. Email tracking — open/click/reply (implementation to be specced separately)
4. Event reminders — native OS notifications (Add Event works; notifications unconfirmed)
5. Automation rules (after campaigns + tracking)
6. Bounce & unsubscribe handling (bundled with campaign work)

### 🟢 Future (no timeline)
7. Company entity (first-class)
8. Application entity (separate from contact)
9. Merge contacts
10. CSV data export
11. Full analytics/weekly reports (blocked by tracking)
12. Configurable keyboard shortcuts

### ⚫ Dropped (explicitly off the table)
- Clerk / billing integration
- Paid tracking relay
- Multi-user collaboration
- Mobile app
- Browser extension (LinkedIn scraper)
- AI-powered writing assistance
- Saved searches
- Card/grid view on People page
- Enforced one-way pipeline status transitions
- Draft vs. published template states
- PDF report export
- Accent color picker
- Separate Application entity (contact = pipeline card is sufficient)

---

## 23. Git & Version Control

- **Repository**: `https://github.com/Gitter09/jobdex`
- **Main branch**: `main`
- **Current version**: `v0.1.3`
- **Commit convention**: Descriptive, imperative mood (e.g., `fix activity timeline — dynamically populate from contact events`)
- **Release trigger**: Push a semver tag (`v0.x.x`) to kick off GitHub Actions release build

---

## 24. Conventions & Coding Patterns

### Frontend
- **Error handling**: Always use `const { handleError } = useErrors()` from `src/hooks/use-errors.ts`. Never use `alert()` or `toast.error()` directly.
- **Tauri invocation**: Always import as `import { invoke } from "@tauri-apps/api/core"`.
- **UI components**: Use Shadcn components from `@/components/ui`. Do not introduce new UI libraries.
- **Path alias**: Use `@/` for all imports relative to `src/`.
- **Success messages**: Use `toast.success(...)` directly from `sonner` — only errors go through `handleError`.
- **Copy**: All user-facing strings must follow the voice guidelines in Section 2. No developer-readable text in the UI.

### Backend (Rust)
- **Command signatures**: All new commands must return `Result<T, AppError>`.
- **Error conversion**: Use `?` operator with `map_err(|e| e.to_string().into())` or `map_err(AppError::from)` as needed.
- **IDs**: Always generate with `uuid::Uuid::new_v4().to_string()`.
- **Database access**: Access pool via `db.pool()`. Access full `Db` struct via `db.inner().clone()` when passing to `jobdex-core` services.
- **All commands must be registered** in the `tauri::generate_handler![...]` macro inside the `run()` function.

### Tauri IPC Boundary — Naming Convention (STRICT)
This is the single most common source of silent runtime bugs in this stack. Follow without exception.

- All Tauri command names are **snake_case** in Rust AND in every `invoke()` call on the frontend.
  - ✅ CORRECT: `invoke("get_contact_by_id", { id })`
  - ❌ WRONG: `invoke("getContactById", { id })`
- Every Rust struct that crosses the IPC boundary (is serialized to the frontend) **must** have `#[serde(rename_all = "camelCase")]`. This is non-negotiable.
- The corresponding TypeScript interface in `src/types/crm.ts` must use **camelCase** field names — mirroring the serde output, NOT the Rust snake_case source.
- When adding or modifying a Tauri command: verify the exact name in `lib.rs` `generate_handler![]` before writing the `invoke()` call. Do not guess.
- When renaming any function, command, or type: search for every usage across the entire codebase and update all references in the same change. Never rename in isolation.

### Window Identification — Mandatory Labels
- **All windows** in `tauri.conf.json` must have an explicit `label` (usually `main`).
- This label must match the authorized windows list in `src-tauri/capabilities/default.json`.
- Missing labels cause the window to be unauthorized by the capability system, resulting in an app that launches but never shows its main window.

### IPC Type Safety — Matched Pairs Rule
Rust structs and TypeScript interfaces are **matched pairs**. They must always be changed together.

- Every Rust struct returned by a Tauri command has a corresponding TypeScript interface in `src/types/crm.ts`.
- Never change a Rust struct field without updating the matching TypeScript interface in the same commit.
- Never change a TypeScript interface without verifying the Rust struct still matches.
- Write the Rust struct first, derive serde on it, THEN write the matching TypeScript interface. Never the reverse.

### Optional Fields — Null Safety Rule
- Every `Option<T>` field in a Rust struct maps to `field?: Type` in the TypeScript interface — never `field: Type`.
- Never access optional contact fields in TypeScript without null-checking or optional chaining (`?.`).
- Fields that are nullable in the schema (`email`, `linkedin_url`, `intelligence_summary`, `title`, `company`, `location`, `company_website`, `last_contacted_date`, `next_contact_date`) must always be treated as potentially undefined on the frontend.

---

## 25. Bug Prevention Rules — AI Agent Mandatory Checklist

> These rules exist because the most common bugs in this codebase are not logic errors — they are **context loss bugs**: the AI writes locally correct code that silently contradicts something defined elsewhere. Every rule below targets a specific, recurring failure pattern in the Tauri 2 + Rust + SQLx + React/TypeScript stack.

### BEFORE WRITING ANY CODE — Run This Checklist First

1. **Read the current state of every file you are about to modify.** Do not assume you know its contents. Do not rely on memory from earlier in the conversation.
2. **Search for all existing usages** of any function, command, or type you are about to add, change, or delete.
3. **If adding a Tauri command**: confirm its exact name in `lib.rs` `generate_handler![]` before writing the `invoke()` call.
4. **If touching the database**: read the relevant migration file(s) to confirm the current schema before writing any query.
5. **If adding a feature that spans Rust + TypeScript**: write the Rust struct with serde derives first, then write the matching TypeScript interface. Never the reverse.
6. **If adding a window**: ensure it has a `label` and is added to `capabilities/default.json`.
7. **Before building for production**: ensure all logs are suppressed and env vars are baked in via `build.rs`.
8. **After completing any change**: explicitly state every file modified and why, so the developer can verify scope creep did not occur.
9. **If writing any user-facing text**: re-read Section 2 (Voice & Tone) before writing. No developer-readable strings, no corporate language, no raw error codes in the UI.

### SQLx / SQLite Rules

**No `SELECT *` — ever.**
- Always name every column explicitly in every query.
- `SELECT *` silently breaks when migrations add or reorder columns.

**Migrations are append-only and sequential.**
- Migrations live in `src-core/migrations/`. All migrations use ISO timestamp naming (`YYYYMMDDHHMMSS_description.sql`).
- Current count: **22 migrations**. Use timestamp naming for all new migrations.
- Never edit an existing migration file. Always create a new one.
- Before writing a migration, list all existing migrations to verify dependency order.
- Never reference a table or column in a migration that is created in a later-numbered migration.
- After adding any migration, search for every query that touches the affected table and verify all column names are still correct.

**Use compile-time `query!` macros wherever possible.**
- Runtime `query()` strings bypass the compiler and fail silently at runtime.
- Runtime `query()` strings are only acceptable for dynamically constructed `WHERE` clauses.
- All other queries must use the `query!` or `query_as!` macro.

**Transactions for all multi-step writes.**
- Any operation that reads then writes the same table must use a SQLite transaction (`BEGIN`/`COMMIT`).
- All bulk operations must be wrapped in a transaction. This is already the pattern — maintain it.

### SQLCipher / Encryption Rules

These rules are **immutable**. Encryption bugs can permanently destroy user data.

**One connection pool. One initialization point.**
- The database connection pool is initialized in exactly one place: `jobdex-core`'s initialization function.
- Never create a secondary pool or a raw SQLite connection anywhere in the codebase.
- Every connection MUST pass the encryption key via `PRAGMA key='...'` immediately after opening. This is handled by the `Db` struct — always go through it.

**PBKDF2 parameters are frozen.**
- Key derivation uses PBKDF2-HMAC-SHA256, 100,000 iterations, 16-byte random salt.
- These values are **immutable**. Changing them makes existing encrypted databases permanently unreadable.
- Key derivation logic lives in exactly one function. Never duplicate or inline it.

**AES-256-GCM for sensitive fields.**
- OAuth tokens and API keys stored in the database must be encrypted with AES-256-GCM before writing.
- Never write sensitive string values to the database in plaintext.

### Tauri v2 Capabilities Rules

**Every new system resource access needs a capability entry.**
- Any new Tauri command that accesses filesystem paths outside the app data directory, makes network requests, uses the clipboard, or opens URLs must have a corresponding entry added to `src-tauri/capabilities/`.
- After adding any new `tauri-plugin-*`, update capabilities in the same change — not as a follow-up.
- Missing capabilities cause silent permission denials at runtime with no compiler error.

### Async / Rust Concurrency Rules

**No blocking inside async Tauri commands.**
- All Tauri commands run on the Tokio async runtime. Blocking the executor stalls the entire app.
- Never use `std::fs` inside a Tauri command — use `tokio::fs`.
- Never use `std::thread::sleep` — use `tokio::time::sleep`.
- CSV parsing, XLSX parsing, and other CPU-heavy operations in bulk imports must be spawned with `tokio::task::spawn_blocking`.

**Production Log Hygiene (macOS Focus Fix)**
- Never leave `println!` or `eprintln!` statements un-guarded in production Rust code.
- Wrap all diagnostic logs in `#[cfg(debug_assertions)]`.
- Reason: On macOS, printing to stdout/stderr can cause the app to associate with the launching terminal, stealing window focus.

**Baking Environment Variables for Production**
- Do not rely on `dotenvy` at runtime in production bundles.
- macOS `.app` bundles do not find local `.env` files when launched from `/Applications`.
- Secrets/Keys must be baked into the binary at compile time using `build.rs` and `cargo:rustc-env`.
- Use `option_env!("VAR_NAME")` in the code to access these baked-in variables.

### React / Frontend Rules

**`useEffect` dependency arrays must be complete.**
- Every `useEffect` dependency array must include all variables referenced inside the effect.
- Never use `// eslint-disable-next-line react-hooks/exhaustive-deps` without an explicit comment explaining why it is provably safe.
- Prefer `useCallback` for functions passed as props or used in effects to avoid stale closures.

**Always re-fetch after mutations — never rely on local state alone.**
- After any mutation (add, edit, delete contact / tag / status), always trigger a re-fetch from the database.
- For `PeoplePage` mutations: increment `refreshTrigger` via the outlet context.
- Do not update local React state as a substitute for re-fetching. Local state can diverge from the database silently.

**Dialogs must reset state on close.**
- Every Dialog component containing a form must reset all form fields in its `onOpenChange` handler when `open` changes to `false`.
- Use controlled components (`useState` per field) — not uncontrolled inputs — so that reset is explicit and verifiable.

**JobDex is a single-window application.**
- Never create additional `BrowserWindow` instances.
- All secondary UI (settings, compose, confirmations) must use Dialog components within the existing window.

### Verification Steps After Every Change

```sh
# Rust type & borrow check (catches command signature mismatches, missing fields)
cargo check   # run from src-tauri/

# If migrations were added or modified:
# Verify migration uses timestamp naming (current count: 20)
# Verify all queries touching the affected table still match the new schema
```

If `cargo check` produces errors, fix them before presenting the solution. Never present a solution as complete if `cargo check` fails.

---

## 26. Environment & Configuration

No `.env` files are used by the Tauri app itself.

External configuration is stored in:
- `~/.jobdex/credentials.json` — Gmail OAuth client credentials
- `~/.jobdex/ms_credentials.json` — Outlook OAuth client credentials
- App settings table in SQLite — all other preferences

---

## 27. Per-Release Workflow

### Changelog (`src/changelog.ts`)

All release notes live in `src/changelog.ts` as a `CHANGELOG: Release[]` array, newest version first. This is the **single file to update when cutting a new release** — it feeds both the About tab (`LATEST_RELEASE`) and the future What's New modal (M12, imports `CHANGELOG`).

**To update for a new release:**
1. Open `src/changelog.ts`
2. Add a new `Release` object at the **top** of the `CHANGELOG` array:
```ts
{
    version: "0.2.0",
    date: "April 2026",
    entries: [
        { label: "Feature name", detail: "What it does, in builder voice." },
        // ...
    ],
}
```
3. The `version` string must exactly match the release tag without the `v` prefix — e.g. tag `v0.2.0` → version `"0.2.0"`

**CI guardrail:** `release.yml` has a "Verify changelog is up to date" step that runs before the Tauri build. It compares `CHANGELOG[0].version` against the git tag being released. If they don't match, the release build fails immediately on all platforms with a clear error message. **You cannot push a release without updating this file.**

**About tab:** `AboutTab` imports `LATEST_RELEASE` — the heading and entries update automatically from `changelog.ts`, no other file changes needed.

**What's New modal (M12):** When built, it imports `CHANGELOG` for the full version history.

---

## 28. Rich Text Editor — Future Roadmap

The compose email dialog, templates editor, and signature editor use **Tiptap** (headless rich text engine, v3.x) with a Shadcn Toggle toolbar. Introduced in v0.2.0.

**Phase 1 (shipped):** Bold, Italic, Underline, Strikethrough, Bullet List, Ordered List, Undo, Redo. Gmail updated to send `text/html`; Outlook already sent HTML.

**Key implementation files:**
- `src/components/email/rich-text-editor.tsx` — reusable editor + toolbar component
- `src/components/ui/toggle.tsx` — Shadcn Toggle primitive (`@radix-ui/react-toggle`)
- `src/index.css` — Tiptap prose content styles (`.tiptap` selector)

**Controlled value sync pattern** — critical: use `isInternalChange` ref to prevent cursor-jumping when parent state updates. See `rich-text-editor.tsx` for the pattern.

**Planned extensions (future phases):**
- **Links** — `@tiptap/extension-link` + Shadcn Popover URL input
- **Text color / highlight** — `@tiptap/extension-color` + `@tiptap/extension-highlight` with color palette popover
- **Tables** — `@tiptap/extension-table` family + table border CSS
- **Inline images** — `@tiptap/extension-image` + new Tauri command to return base64 data URI from file path
- **Merge variable nodes** — custom Tiptap Node extension rendering `{{first_name}}` as styled chip; replaces plain text insertion
- **Text alignment** — `@tiptap/extension-text-align` (left/center/right/justify)
- **AI writing suggestions** — floating toolbar on text selection calling LLM API (deferred per CLAUDE.md)

---

*End of agent context document.*
