# OutreachOS — Product & Business Strategy Context

> **Purpose**: This document contains the full product strategy, commercialization plan, and technical roadmap for turning OutreachOS from a personal tool into a revenue-generating product. It is written so that an AI IDE agent can read it and immediately continue development in the right direction.

---

## 1. What We're Building Toward

OutreachOS is currently a technically complete v0.1 personal CRM desktop app. The goal is to evolve it into a **commercial product** using an **Open Core model**:

- The **desktop app** (Tauri client) is open-sourced on GitHub — this is the distribution and trust mechanism.
- A **hosted tracking relay** (cloud backend) is closed-source and paid — this is the revenue mechanism.
- The app itself remains **local-first and privacy-first** forever. No contact data ever leaves the user's machine. Only email tracking pixel events hit the relay server.

---

## 2. The Core Problem to Solve First

### Email Tracking Is Currently Unusable for Non-Technical Users

Right now, email tracking requires the user to:
1. Self-host a Flask/Python server on their own domain
2. Manually enter a tracking server URL and secret key in Settings
3. Manage their own infrastructure

This is a **zero-conversion setup** for 99% of potential customers. The send-and-track loop is the most compelling feature in the product, and it is completely inaccessible to non-developers.

**This must be solved before any commercial launch.**

---

## 3. The Business Model — "Path B: Hosted Tracking Relay"

### How It Works

Replace the self-hosted Flask server requirement with a **lightweight hosted relay that we operate**. Users sign up for a free account and get a personal tracking subdomain (e.g., `username.outreachos.io`). The app auto-configures — no manual setup required.

**Privacy story remains intact**: The relay server only ever receives a tiny pixel load event (an HTTP request). No contact data, no email content, no personally identifiable information ever touches the relay. This is a completely defensible privacy claim.

### Freemium Pricing Model

| Tier | Price | Limits |
|---|---|---|
| Free | $0 | App download + 50 tracked emails/month |
| Pro | $9/month or $79/year | Unlimited tracking + priority support |

### Why This Works

- Users who care about privacy will pay for a solution that doesn't compromise it
- Direct competitive attack on Clay ($149–$800/month, cloud-only) and Apollo
- The desktop app stays free and open source — the relay is the business
- Scales naturally: relay costs are trivially low until significant volume

---

## 4. Zero-Cost Infrastructure Stack (Student-Friendly)

Everything below is **free until revenue justifies cost**:

| Component | Service | Cost |
|---|---|---|
| App distribution | GitHub Releases (already configured via `release.yml`) | Free |
| Tracking relay server | **Cloudflare Workers** (100k requests/day free tier) | Free |
| Landing page | GitHub Pages or Vercel | Free |
| Payments (when ready) | Gumroad (takes a cut, $0 upfront) | Free |

### Relay Migration Plan

The existing Flask/Python tracking server should be **rewritten as a Cloudflare Worker**. It is a simple server — it only needs to:
1. Receive GET requests for tracking pixel loads (`/track/open/{id}.png`)
2. Receive GET requests for click redirects (`/track/click/{id}?url=...`)
3. Store events (Cloudflare Workers KV or D1 for persistence)
4. Expose an authenticated `/track/events?secret=...` endpoint for the app to poll

The app's existing `poll_email_tracking` command and `tracking_secret` settings key require **no changes** — only the server URL changes from the user's personal domain to `username.outreachos.io`.

---

## 5. Open Source Strategy — Open Core Model

### What to Open Source
- The entire desktop app repository (`Gitter09/outreach-os`) — the Tauri client, all local features, all current code

### What to Keep Closed
- The hosted tracking relay server code
- Any future authentication/account management layer
- The hosted infrastructure configuration

### License Recommendation
Use **plain MIT** for the desktop app at this stage. The theoretical risk of someone forking and selling it is outweighed by the distribution and trust benefits of a permissive license. Revisit if/when scale demands it.

### Why Open Source Helps
1. **Distribution**: GitHub stars, HackerNews "Show HN", developer Twitter are all free channels
2. **Trust**: "Privacy-first, your data stays local" is *proven* by open source in a way no marketing copy can match
3. **Credibility**: Users can verify there is no hidden telemetry
4. The audience that can compile and self-host Tauri/Rust is small — most paying users will still pay for the convenience of a signed installer and working relay

---

## 6. Features to Build Before Launch

### P0 — Must ship before any public launch

#### 6.1 Hosted Tracking Relay (Cloudflare Worker)
- User authentication / account creation (email + password, simple JWT)
- Personal subdomain assignment per user (`{username}.outreachos.io`)
- Pixel tracking endpoint
- Click redirect endpoint
- Events polling endpoint (authenticated)
- Free tier enforcement (50 tracked emails/month counter)
- Basic dashboard showing events (can be minimal)

#### 6.2 In-App Relay Onboarding Flow
- Replace the current manual "enter your tracking server URL" settings UI
- New flow: "Connect to OutreachOS Cloud" button in Settings → Email
- Opens browser to sign up / log in
- On auth success, app auto-populates `tracking_secret` and server URL
- Show relay connection status in settings (connected / disconnected / usage counter)

#### 6.3 Complete the Placeholder Pages
All four placeholder pages are linked in the sidebar. Shipping with empty pages damages first impressions and trust. Build these before public launch:

**Notes Page** (`/notes`):
- Typed notes per contact with timestamps
- Link notes to a specific contact
- Simple list view, sorted by most recent

**Tasks Page** (`/tasks`):
- Actionable to-dos tied to contacts
- Due dates, completion toggle
- Filter by: all / due today / overdue / by contact

**Templates Page** (`/templates`):
- Manage reusable email templates
- Tie templates to outreach stages / pipeline statuses
- "Use template" button populates `ComposeEmailDialog`

**Emails Page** (`/emails`):
- Unified inbox view across all connected email accounts
- Show synced emails linked to contacts
- Filter by contact, account, date

#### 6.4 Technical Debt to Clear
From `agent.md` section 16 — fix these before public launch:

1. Add `get_contact_by_id` Tauri command — `ContactDetailPage` currently fetches all contacts, which degrades with large databases
2. Migrate `delete_contact`, `create_tag`, `update_tag`, `delete_tag` to return `Result<T, AppError>` instead of `Result<T, String>`
3. Fix `handleSaveSummary` catch block to use `handleError` instead of `console.error`
4. Change bundle identifier from `com.outreachos.app` to `com.outreachos.desktop`
5. Wire tag-based filtering in `ContactsPage` (status filtering works, tag filtering is not fully implemented)

### P1 — Ship shortly after launch

#### 6.5 Email Scheduling Worker
- Background loop to dispatch `email_schedule` records at their scheduled time
- Currently `email_schedule` command stores records but nothing sends them

#### 6.6 Dashboard Analytics (complete the scaffold)
- Contacts by status (chart)
- Recent activity feed
- Outreach sent count
- Emails opened count (from tracking data)
- Response rate

#### 6.7 AI Features — BYOK (Bring Your Own Key), Opt-In Only
The AI infrastructure already exists in `outreach-core` (`AiClient`, `EnrichmentEngine`) but is deliberately unwired. Re-enable as opt-in with user's own API key:

- **Magic Paste**: Re-enable `scrape_clipboard` / `magic_paste` commands. User provides their own OpenAI or Gemini API key in Settings → AI.
- **Contact Enrichment**: Re-enable "Enrich with AI" on Contact Detail Page
- **Email Drafting**: Re-enable AI subject/body suggestions in `ComposeEmailDialog`

The settings keys `ai_provider`, `ai_model`, `ai_base_url`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` already exist in the DB — just expose them in a new Settings → AI tab.

**Privacy pitch for BYOK**: "AI features that never send your contacts to anyone's servers — your key, your model, your data."

---

## 7. Launch Strategy

### Pre-Launch
1. Build the Cloudflare Worker relay
2. Complete placeholder pages
3. Clear P0 technical debt
4. Set up a simple landing page (GitHub Pages is fine) with: headline, download link, feature list, pricing

### Launch Channels (in order of effort vs. payoff)
1. **ProductHunt** — schedule a launch, prepare assets in advance
2. **HackerNews "Show HN"** — developer audience, ideal early adopter profile
3. **Reddit**: r/entrepreneur, r/SideProject, r/startups, r/ycombinator
4. **Twitter/X** — build in public thread: "I built the CRM I couldn't afford"

### Launch Narrative
> *"My Streak free trial ran out. I couldn't afford a CRM subscription as a student. So I built one — local-first, privacy-first, no subscriptions for core features. Here's OutreachOS."*

This is a genuine story and it is a compelling ProductHunt headline. Use it.

---

## 8. Competitive Positioning

| Product | Price | Data | Tracking |
|---|---|---|---|
| Clay | $149–$800/month | Cloud | Cloud |
| Apollo | $49–$99/month | Cloud | Cloud |
| Streak | $15–$49/month | Cloud (Gmail) | Cloud |
| HubSpot | $15–$800+/month | Cloud | Cloud |
| **OutreachOS** | **Free / $9/month** | **Local (yours)** | **Relay only** |

The positioning statement: **"The only outreach CRM where your contacts never leave your machine."**

---

## 9. What Not to Do

- **Do not move contacts to a cloud database.** The moment contact data lives on a server, you're competing with HubSpot and losing. The local-first architecture is the moat.
- **Do not adapt the app logo/icon to user accent color themes.** The logo is brand identity, not a UI element. It should be stable.
- **Do not open source the relay server.** It is the revenue mechanism.
- **Do not launch with empty placeholder pages** linked in the sidebar.

---

## 10. Long-Term Vision

OutreachOS becomes the default CRM for:
- Technical founders doing VC outreach
- Job seekers doing systematic networking
- Anyone who has hit a SaaS paywall on existing CRM tools and values data ownership

The BYOK AI layer (P1) becomes the key differentiator: AI-assisted outreach with full privacy. No other CRM in this price range can claim that.

---

*End of strategy context document.*
