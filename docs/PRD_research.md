# PRD: LLM-Powered Cold Email Personalization Engine for PE/VC Outreach

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Name
**Product Name:** VCReach Personalizer

### 1.2 One-Sentence Product Description
VCReach Personalizer is an LLM-powered web application that automatically enriches PE/VC contact profiles from public data sources and generates highly personalized cold emails for aspiring finance professionals, with human-in-the-loop review.

### 1.3 Primary User Persona
**Persona:**  
Ambitious engineering undergraduate in India seeking internships, analyst roles, or off-cycle opportunities in Private Equity (PE) or Venture Capital (VC) firms in India or globally, with basic technical skills (Python familiarity) and strong motivation but limited network in finance.

### 1.4 Core Problem Being Solved
Breaking into PE/VC requires personalized cold outreach to busy professionals. Manually researching each professional and crafting tailored emails is time-consuming, error-prone, and difficult to sustain at scale for a student with limited time and domain knowledge.

### 1.5 Key Success Metrics
- **Email Personalization Quality**
  - ≥ 80% of generated emails achieve an internal quality score ≥ 0.8 (out of 1.0).
  - ≥ 70% of emails contain at least 2 authentic, verifiable personalized references (e.g., deals, content, background overlaps).
- **User Productivity**
  - Time to generate a fully personalized email per contact reduced from ~20–30 minutes (manual) to ≤ 2 minutes (including review).
  - Ability to process ≥ 100 contacts in a single batch with minimal failures (< 5%).
- **System Reliability**
  - ≥ 99% successful completion of enrichment + generation pipeline without unhandled exceptions.
  - < 1% permanent failures due to scraping or LLM errors (after retries).
- **User Satisfaction**
  - Self-reported satisfaction score ≥ 4/5 after first batch.
  - ≥ 80% of generated emails require only minor edits (e.g., wording tweaks) before sending.

---

## 2. PRODUCT OVERVIEW

### 2.1 Detailed Problem Statement
For a student in India trying to enter PE/VC:

- **Challenge 1: Research Overload**
  - To write a good cold email, the student must research:
    - Partner/associate’s background (past roles, education, portfolio companies).
    - Recent deals or content (blog posts, podcasts, LinkedIn posts).
    - Firm’s thesis and sector focus.
  - This requires visiting multiple sources: LinkedIn, firm website, Google News, Crunchbase, Twitter/X, etc.
  - Doing this manually for 50–200 contacts is infeasible while balancing studies.

- **Challenge 2: Personalization Quality**
  - Generic emails with only {FirstName, FirmName} perform poorly.
  - High-performing emails:
    - Reference specific content (e.g., “I loved your post about B2B SaaS retention on LinkedIn…”).
    - Tie the candidate’s background to the firm’s thesis or portfolio.
  - Students often lack domain knowledge to identify *meaningful* connection points and position themselves convincingly.

- **Challenge 3: Systematic Workflow**
  - Current workflow is ad hoc (spreadsheets + copy-paste + manual research).
  - No structured tracking of:
    - Who has been enriched?
    - Which emails are drafted, reviewed, or sent?
    - What outreach strategies or tones work best?

### 2.2 Why Existing Solutions Don’t Work
Existing cold email tools (e.g., SalesLoft, Lemlist, Instantly, Smartlead, Apollo, etc.) are:

- **Optimized for sales teams**, not students:
  - Assumes CRM integration, domain warmup, large lists, B2B sales context.
- **Surface-level personalization:**
  - Use spintax/merge tags ({{first_name}}, {{company}}) rather than deep profile-based personalization.
- **Not optimized for PE/VC context:**
  - Do not understand:
    - Deal flow, fund thesis, portfolio structures.
    - How to credibly position a student as value-add for deal sourcing, market research, etc.
- **Heavy & expensive:**
  - Student may not afford subscription or have sending infrastructure.
- **Lack of research automation:**
  - They assume user supplies CSV with rich context; research still manual.

### 2.3 Target User Profile (Detailed)

**Demographics**
- Age: 18–24.
- Location: Primarily India, but extendable globally.
- Education: Undergraduate (engineering, CS, business, economics).
- Tech level: Comfortable using Python notebooks and web apps; basic understanding of APIs/LLMs is possible but not assumed.

**Goals**
- Secure:
  - PE/VC internships.
  - Off-cycle analyst roles.
  - Part-time scout/venture fellow roles.
- Build a network of PE/VC mentors and champions.

**Constraints**
- Limited time (academic workload).
- Limited funds (prefers free/low-cost tools).
- Limited domain knowledge (PE/VC jargon, fund structures, typical responsibilities).

**Behaviors**
- Uses LinkedIn heavily.
- Maintains a contact list in CSV/Google Sheets.
- Willing to review generated content before sending.
- Comfortable running basic commands in terminal if needed (but prefers simple UI).

### 2.4 User Workflow (Current State vs Future State)

**Current State (Manual):**
1. Export or manually compile contacts in a spreadsheet.
2. For each contact:
   - Open LinkedIn profile and firm website.
   - Run Google search and read relevant news.
   - Check Crunchbase for firm and portfolio.
   - Manually copy notes into a doc.
3. Draft cold email from scratch, trying to:
   - Reference 1–2 specific items from their profile.
   - Connect candidate’s background.
4. Iterate wording, worry about sounding awkward.
5. Repeat for 50–100 contacts.

**Future State (Using VCReach Personalizer):**
1. Prepare basic contact CSV (name, title, company, email, LinkedIn URL).
2. Upload CSV into the app.
3. System automatically:
   - Scrapes and enriches profile and firm data.
   - Extracts structured insights via LLM.
   - Performs multi-step LLM analysis + connection point discovery.
   - Generates 2–3 email variants per contact.
   - Scores each email for quality.
4. User visits “Email Review” page:
   - Reviews recommended variant per contact.
   - Edits content inline.
5. Exports finalized emails (e.g., CSV or copy-paste).
6. Optionally tracks responses (manual input).

### 2.5 Product Vision and Scope

**Vision:**  
A personal “PE/VC outreach co-pilot” that automates research and copywriting so ambitious students can focus on building relationships, not crafting every email from scratch.

**In-Scope (MVP):**
- Upload and manage contact list.
- Scraping from:
  - LinkedIn (public profile HTML if accessible).
  - Company websites.
  - Google News or news API (for firm + person).
  - Twitter/X (public profile & recent tweets if accessible).
  - Crunchbase (free tier API).
- LLM pipelines using:
  - Local Ollama (Llama 3.2) **or**
  - Groq API (Llama 3.x family).
- Profile-specific analysis & connection points.
- Multi-variant email generation, scoring and quality checks.
- Simple Streamlit web UI for:
  - Setup (user background).
  - Upload contacts.
  - Monitor batch processing.
  - Review/edit emails.
  - View basic analytics.
- Local SQLite database for persistence.

**Out-of-Scope (MVP):**
- Actual email sending (via SMTP / Gmail API).
- Domain warmup, deliverability optimization.
- Multi-user SaaS authentication (initially single-user local app).
- Mobile UI.

---

## 3. FUNCTIONAL REQUIREMENTS

> All requirements are testable and labeled with Feature IDs (FR-XXX). Priority:  
> - **P0:** Must-have for MVP.  
> - **P1:** Important, after core.  
> - **P2:** Nice-to-have.

### 3.1 Contact Data Input and Management

#### FR-001: CSV Contact Upload
- **Feature Name:** CSV Contact Upload
- **Description:** Allow user to upload a CSV file containing basic contacts. Parse and store in `contacts` table.
- **User Story:**  
  As a user, I want to upload a CSV of contacts so that I don’t have to enter each contact manually.
- **Acceptance Criteria:**
  - Supports CSV file selection in UI.
  - Required columns:
    - `first_name`
    - `last_name`
    - `title`
    - `company`
    - `email`
    - `linkedin_url`
  - Optional columns: `twitter_url`, `company_website`, `notes`.
  - System validates:
    - Presence of required columns (case-insensitive).
    - Email format (`*@*.*`).
    - LinkedIn URL starts with `http` and contains `linkedin.com`.
  - On success:
    - Contacts stored in DB with status `NEW`.
    - UI shows count of imported rows and any rejected rows with reasons.
- **Priority:** P0
- **Dependencies:** None.

#### FR-002: Manual Contact Entry
- **Feature Name:** Manual Contact Form
- **Description:** Allow user to add or edit a single contact via UI form.
- **User Story:**  
  As a user, I want to add or fix individual contacts manually so that I can correct errors without re-uploading the CSV.
- **Acceptance Criteria:**
  - Form fields: `first_name`, `last_name`, `title`, `company`, `email`, `linkedin_url`, `twitter_url`, `company_website`, `notes`.
  - Required: `first_name`, `last_name`, `email`, `linkedin_url`.
  - On save, contact is inserted/updated in DB.
  - Validation errors displayed inline (e.g., “Email is invalid”).
- **Priority:** P1
- **Dependencies:** FR-001 (database schema).

#### FR-003: Contact Status Management
- **Feature Name:** Contact Status Tracking
- **Description:** Track lifecycle status for each contact (NEW, ENRICHED, ANALYZED, EMAIL_GENERATED, REVIEWED, ERROR).
- **User Story:**  
  As a user, I want to see the status of each contact so that I know which ones are ready for outreach.
- **Acceptance Criteria:**
  - `contacts.status` field with allowed values.
  - Status updates:
    - After enrichment pipeline success → `ENRICHED`.
    - After LLM analysis → `ANALYZED`.
    - After email generated → `EMAIL_GENERATED`.
    - After user hits “Mark as Ready” in review UI → `REVIEWED`.
    - On unrecoverable error → `ERROR`.
  - UI: filter contacts by status on processing dashboard.
- **Priority:** P0
- **Dependencies:** FR-010+, FR-020+, FR-030+ (downstream processes).

### 3.2 Automated Web Scraping

#### FR-010: LinkedIn Scraping
- **Feature ID:** FR-010
- **Feature Name:** LinkedIn Profile Scraper
- **Description:** Fetch public LinkedIn profile HTML using `linkedin_url` and store raw HTML for LLM extraction.
- **User Story:**  
  As a user, I want the system to fetch public LinkedIn profile data so that I can personalize emails based on real career history.
- **Acceptance Criteria:**
  - For each contact with `linkedin_url`:
    - Send HTTP GET request respecting robots.txt and ToS.
    - Store HTTP status code and response body in `enriched_data`.
  - If blocked (status 4xx/5xx, or suspicious HTML):
    - Log error in `scraping_logs`.
    - Mark LinkedIn scraping status as `FAILED` while allowing other sources.
  - Scraper must:
    - Use random user agent from a predefined list.
    - Implement request delay (configurable; see section 11).
  - Does not require login; uses only publicly accessible data.
- **Priority:** P0
- **Dependencies:** FR-001, DB schema.

> **Note:** The design must respect legal and ethical constraints. If LinkedIn’s robots.txt disallows scraping or the user chooses to comply strictly, implement a configuration flag to disable LinkedIn scraping and rely on other sources.

#### FR-011: Company Website Scraping
- **Feature Name:** Company Website Scraper
- **Description:** Fetch homepage and “Team/About” pages of target company website if URL is available or discoverable.
- **User Story:**  
  As a user, I want the system to scrape the firm’s website so that emails can reference their investment thesis and portfolio.
- **Acceptance Criteria:**
  - Uses `company_website` if provided.
  - If missing, attempts to infer from Google search (if feasible and allowed) or from structured metadata scraped elsewhere. (For MVP, this can be skipped if complexity too high; mark as P1.)
  - Fetch:
    - Homepage.
    - `/team`, `/people`, `/about`, `/portfolio` (attempt all; ignore failures).
  - Store each page HTML in `enriched_data`.
- **Priority:** P0 (homepage); P1 (multi-page scraping).
- **Dependencies:** FR-001, FR-020 (LLM extraction).

#### FR-012: Google News Scraping/API Integration
- **Feature Name:** News Scraper
- **Description:** Fetch recent news articles about the firm and optionally the individual, using Google News API or RSS equivalent.
- **User Story:**  
  As a user, I want the system to summarize recent news so that my outreach references timely information.
- **Acceptance Criteria:**
  - Given `company` and (optionally) contact full name:
    - Query Google News API or alternative (e.g., GNews, NewsAPI).
  - Store:
    - Article title.
    - URL.
    - Published date.
    - Short snippet (if available).
    - Full text or HTML (if accessible) for 3–5 top results.
  - Respect API rate limits; handle 4xx/5xx gracefully.
- **Priority:** P0
- **Dependencies:** FR-001, external API (see section 6.3).

#### FR-013: Twitter/X Scraping
- **Feature Name:** Twitter/X Scraper
- **Description:** Fetch public Twitter/X profile and latest tweets if `twitter_url` is available.
- **User Story:**  
  As a user, I want the system to inspect recent tweets so that my email can reference the contact’s most recent ideas or content.
- **Acceptance Criteria:**
  - Use `twitter_url` to:
    - Fetch profile page HTML (no login).
    - Extract recent tweets via LLM from HTML or simple pattern-based extraction.
  - Store raw HTML in `enriched_data`.
  - Handle rate limiting / blocking gracefully.
- **Priority:** P1
- **Dependencies:** FR-001, FR-020.

#### FR-014: Crunchbase API Integration
- **Feature Name:** Crunchbase Firm Data
- **Description:** Use Crunchbase free tier to fetch firm-level and portfolio information.
- **User Story:**  
  As a user, I want the system to pull firm data from Crunchbase so that emails can reference specific portfolio companies and sectors.
- **Acceptance Criteria:**
  - Given `company` string:
    - Search Crunchbase API for organizations.
    - Select the most likely match (see business logic 9.1).
    - Fetch:
      - Organization profile (category, city, description).
      - Recent funding rounds.
      - Portfolio companies (if accessible in free tier).
  - Store JSON response in `enriched_data`.
  - Must implement:
    - API key authentication.
    - Rate limit handling.
- **Priority:** P0
- **Dependencies:** External API, FR-001.

### 3.3 LLM-Based Data Extraction from Scraped HTML

#### FR-020: LinkedIn HTML → Structured Data
- **Feature Name:** LinkedIn HTML Extractor
- **Description:** Use LLM to convert raw LinkedIn HTML into structured profile data (roles, education, skills, interests).
- **User Story:**  
  As a user, I want the system to extract structured information from LinkedIn so that I can easily understand a professional’s background.
- **Acceptance Criteria:**
  - Uses LLM Task T-01 (see section 7.1).
  - Input: raw HTML as string, plus contact metadata.
  - Output JSON fields:
    - `current_role`, `current_firm`, `location`, `education_list`, `experience_list`, `skills`, `interests`, `headline`, `summary`.
  - Valid JSON validated against schema; invalid JSON triggers retry (max N times).
  - Extracted data stored in `enriched_data` table (normalized JSON).
- **Priority:** P0
- **Dependencies:** FR-010, LLM integration.

#### FR-021: Company Website HTML → Firm Info
- **Feature Name:** Company HTML Extractor
- **Description:** Use LLM to extract investment thesis, sectors, and highlighted portfolio from firm website HTML.
- **User Story:**  
  As a user, I want structured firm insights so that generated emails align with the firm’s stated focus.
- **Acceptance Criteria:**
  - Uses LLM Task T-02.
  - Output JSON fields:
    - `firm_description`, `investment_thesis`, `sectors`, `geographies`, `portfolio_highlights`, `team_list`.
  - Stored in `enriched_data`.
- **Priority:** P0
- **Dependencies:** FR-011, LLM integration.

#### FR-022: News Articles → Summaries
- **Feature Name:** News Summarizer
- **Description:** Use LLM to summarize each fetched news article.
- **User Story:**  
  As a user, I want concise summaries of relevant news so that I can quickly reference them in my emails.
- **Acceptance Criteria:**
  - Uses LLM Task T-03 per article.
  - Output JSON:
    - `headline`, `summary`, `date`, `link`, `relevance_reason`.
  - Stored in `enriched_data`.
- **Priority:** P0
- **Dependencies:** FR-012, LLM integration.

### 3.4 Profile Analysis and Connection Point Identification

#### FR-030: VC Professional Profile Analysis
- **Feature Name:** Profile Analyzer
- **Description:** Analyze combined data (LinkedIn, firm website, news, Twitter, Crunchbase) to build a structured profile of the contact and firm.
- **User Story:**  
  As a user, I want a concise synthesized profile so that the email can target what matters most to this person.
- **Acceptance Criteria:**
  - Uses LLM Task T-04.
  - Input: structured data from FR-020 to FR-022 and Crunchbase.
  - Output JSON:
    - `persona_summary`, `investment_focus`, `recent_activities`, `communication_style_guess`, `risk_tolerance_guess` (qualitative).
  - Stored in `llm_analysis` table.
- **Priority:** P0
- **Dependencies:** FR-020–022, FR-014.

#### FR-031: Connection Point Identification
- **Feature Name:** Connection Point Finder
- **Description:** Identify authentic overlaps between candidate (user profile) and VC professional/firm.
- **User Story:**  
  As a user, I want the system to highlight genuine connection points so that my outreach feels authentic and not generic.
- **Acceptance Criteria:**
  - Uses LLM Task T-05.
  - Input:
    - `user_profile` (from setup page).
    - VC professional profile (FR-030).
  - Output JSON:
    - `shared_education`, `shared_geography`, `shared_interests`, `content_references`, `suggested_hooks`.
  - Stored in `llm_analysis`.
- **Priority:** P0
- **Dependencies:** FR-030, FR-050 (user profile).

### 3.5 Email Generation and Variants

#### FR-040: Email Strategy and Tone Determination
- **Feature Name:** Email Strategy Selector
- **Description:** Decide strategy and tone per contact (e.g., direct ask vs. value-first, formal vs. casual).
- **User Story:**  
  As a user, I want the system to adjust tone and angle based on who I’m emailing so that I don’t accidentally sound inappropriate.
- **Acceptance Criteria:**
  - Uses LLM Task T-06.
  - Output JSON:
    - `tone` (e.g., “formal”, “semi-formal”, “friendly-professional”).
    - `strategy` (e.g., “ask for 15-min call”, “ask for feedback on memo”).
    - `rationale`.
  - Stored in `llm_analysis`.
- **Priority:** P0
- **Dependencies:** FR-030, FR-031.

#### FR-041: Personalized Email Generation
- **Feature Name:** Email Generator
- **Description:** Generate 2–3 personalized email variants per contact (subject + body).
- **User Story:**  
  As a user, I want multiple email drafts for each contact so that I can choose the best one or mix parts of each.
- **Acceptance Criteria:**
  - Uses LLM Task T-07.
  - For each contact:
    - Generate at least 2 variants, at most 3 (configurable).
    - Each variant must include:
      - `subject_line`.
      - `body_text` with greeting, middle, and signoff.
      - At least 2 explicit personalized references (e.g., news article, portfolio company).
  - Store variants in `generated_emails` table.
- **Priority:** P0
- **Dependencies:** FR-031, FR-040.

### 3.6 Quality Validation and Scoring

#### FR-050: Email Quality Scoring
- **Feature Name:** Quality Scorer
- **Description:** Evaluate each email variant and assign a quality score and diagnostic tags.
- **User Story:**  
  As a user, I want to see which emails are strong and why so that I pick the best variant quickly.
- **Acceptance Criteria:**
  - Uses LLM Task T-08.
  - Output JSON:
    - `score` (0.0–1.0).
    - `explanations` (list of reasons).
    - `flags` (e.g., “too generic”, “too long”, “weak ask”).
  - Stored in `generated_emails.quality_score` and `generated_emails.quality_explanation`.
  - Top-scoring variant flagged `is_recommended = TRUE`.
- **Priority:** P0
- **Dependencies:** FR-041.

#### FR-051: Quality Improvement Suggestions
- **Feature Name:** Quality Improver
- **Description:** Suggest edits for low-scoring emails.
- **User Story:**  
  As a user, I want the system to suggest improvements for weak emails so that I can quickly fix issues instead of rewriting from scratch.
- **Acceptance Criteria:**
  - Uses LLM Task T-09.
  - Triggered when `score < quality_threshold` (configurable).
  - Output:
    - `improved_body_text` or list of suggested changes.
  - Displayed in UI; user can apply suggestions with one click (P1 enhancement) or copy manually.
- **Priority:** P1
- **Dependencies:** FR-050.

### 3.7 Database Operations (CRUD)

#### FR-060: CRUD for Core Tables
- **Feature Name:** Database CRUD Operations
- **Description:** Implement standard create/read/update/delete for all tables (contacts, enriched_data, llm_analysis, generated_emails, user_profile, scraping_logs, email_tracking).
- **User Story:**  
  As a developer or AI agent, I want consistent CRUD operations so that the system can manipulate data in a predictable way.
- **Acceptance Criteria:**
  - Python data access layer functions:
    - `create_contact`, `get_contact_by_id`, `update_contact_status`, etc.
  - All operations use parameterized queries (to avoid SQL injection).
  - Database schema matches section 5.
- **Priority:** P0
- **Dependencies:** Section 5.

### 3.8 User Interface for Review and Approval

#### FR-070: Email Review Interface
- **Feature Name:** Email Review Page
- **Description:** UI to review email variants for each contact, edit them, and mark final version as approved/ready.
- **User Story:**  
  As a user, I want an interface to review and tweak emails so that I feel confident before sending them.
- **Acceptance Criteria:**
  - For each contact:
    - Show core info (name, firm, title).
    - Show top recommended email variant preselected.
    - Buttons to switch between variants.
    - Text editor to modify chosen variant.
    - “Save Changes” and “Mark as Ready” buttons.
  - Changes saved to `generated_emails.body_text` and flagged as `user_edited = TRUE`.
- **Priority:** P0
- **Dependencies:** FR-041, FR-050.

### 3.9 Batch Processing

#### FR-080: Batch Processing Backbone
- **Feature Name:** Batch Processor
- **Description:** Execute enrichment, analysis, and generation steps in batches with progress tracking.
- **User Story:**  
  As a user, I want to process dozens of contacts in one go so that I can scale my outreach.
- **Acceptance Criteria:**
  - User selects subset of contacts or all NEW contacts.
  - For each contact:
    - Run the full pipeline (scraping → extraction → analysis → email generation → scoring).
  - UI:
    - Shows progress bar (% complete).
    - Shows per-contact status (IN_PROGRESS, SUCCESS, ERROR).
  - Configurable batch size (e.g., 5–10 at a time) to control concurrency.
- **Priority:** P0
- **Dependencies:** FR-010–051, FR-090.

### 3.10 Error Handling and Logging

#### FR-090: Error Logging and Display
- **Feature Name:** Error Logger
- **Description:** Centralized error logging with UI surface for debugging.
- **User Story:**  
  As a user, I want to see why a contact failed so that I can decide whether to retry or skip.
- **Acceptance Criteria:**
  - All scraping and LLM errors stored in `scraping_logs` or error fields.
  - UI shows:
    - For each failed contact:
      - Error type.
      - Short description.
      - Suggestion (e.g., “Check LinkedIn URL”).
- **Priority:** P0
- **Dependencies:** All scraping/LLM operations.

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 System Architecture (Text Diagram)

The system is a **single-user web application** built on Python + Streamlit, backed by SQLite and integrating with local/remote LLM and external data APIs.

**Components:**
1. **Frontend/UI (Streamlit app):**
   - Runs as a Python process.
   - Provides pages for setup, upload, dashboard, review, analytics.
2. **Backend Logic (Python modules):**
   - Scraper modules (LinkedIn, websites, news, Crunchbase).
   - LLM modules for prompt construction and API calls.
   - Pipeline orchestrator for enrichment and email generation.
   - Data access layer for SQLite.
3. **Database (SQLite file):**
   - `vc_reach.db` in `project_root/data/`.
4. **External Services:**
   - **LLM:**
     - Local: Ollama (Llama 3.2 model) via HTTP.
     - Remote: Groq API (e.g., `llama-3.1-70b-versatile`).
   - **News API:** e.g., GNews or NewsAPI.
   - **Crunchbase API:** Free tier for organization data.
5. **Configuration Layer:**
   - Python settings file, environment variables for API keys.

**High-Level Flow:**
User → Streamlit UI → Backend (pipelines) → Scrapers & LLM → SQLite → Streamlit UI.

### 4.2 Technology Stack with Versions

**Programming Language**
- **Python 3.11**

**Web Framework/UI**
- **Streamlit 1.39.0**

**Web Scraping**
- `requests==2.32.3`
- `beautifulsoup4==4.12.3`
- `lxml==5.3.0`
- Optional headless browser (for dynamic sites; P1):
  - `playwright==1.47.0` (optional)

**LLM Integration**
- **Ollama:**
  - Requires local Ollama installation.
  - Model: `llama3.2:latest` (string name used by Ollama CLI/API).
  - Called via local HTTP endpoint `http://localhost:11434/api/chat`.
- **Groq API:**
  - `groq==0.11.0` (Python client).
  - Model: e.g., `llama-3.1-70b-versatile`.
  - HTTPS endpoint: `https://api.groq.com/openai/v1/chat/completions`.

**Database**
- SQLite (built into Python).
- ORM not required; use `sqlite3` module.
- Optionally `SQLAlchemy==2.0.31` if structured (P1).

**Data Handling**
- `pandas==2.2.2` (for CSV import).
- `python-dotenv==1.0.1` (for env var loading).

**Front-End Components (Streamlit)**
- `st.file_uploader`
- `st.text_input`
- `st.text_area`
- `st.selectbox`
- `st.dataframe`
- `st.progress`
- `st.button`, `st.radio`, `st.tabs`
- `st.session_state` for UI state.

### 4.3 SQLite Schema (Overview)
Details in section 5.

Define file: `project_root/src/database/schema.sql` containing `CREATE TABLE` statements.

### 4.4 Data Flow Diagram (Text)

1. **Contact Import:**
   - User uploads CSV → Streamlit reads file → `pandas.read_csv()` → `contacts` rows inserted.
2. **Enrichment Pipeline:**
   - Orchestrator selects `contacts` with `status=NEW`.
   - For each:
     - Scrapers fetch HTML/JSON from LinkedIn, firm website, news API, Crunchbase.
     - Raw data stored in `enriched_data`.
3. **LLM Extraction:**
   - LLM modules process raw HTML/JSON:
     - LinkedIn → structured profile.
     - Website → firm info.
     - News → summaries.
   - Results stored in `enriched_data` or `llm_analysis`.
4. **LLM Analysis & Email Generation:**
   - Combined inputs + user_profile passed to multi-stage LLM pipeline:
     - Profile analysis (T-04).
     - Connection points (T-05).
     - Strategy & tone (T-06).
     - Email generation (T-07).
     - Quality scoring (T-08).
   - Generated emails stored in `generated_emails`.
5. **User Review:**
   - UI queries DB for `generated_emails` with `status=EMAIL_GENERATED`.
   - User edits & approves.
6. **Analytics:**
   - Email tracking (manual input) stored in `email_tracking`.
   - Aggregated metrics displayed.

### 4.5 API Integrations

**Ollama**
- HTTP POST to local `http://localhost:11434/api/chat`.
- JSON payload; see section 6.2.

**Groq**
- HTTPS POST to `https://api.groq.com/openai/v1/chat/completions`.
- Bearer token from env variable `GROQ_API_KEY`.

**Google News / Alternative**
- Example: GNews API `https://gnews.io/api/v4/search`.
- API key from env var `GNEWS_API_KEY`.

**Crunchbase**
- Endpoint: `https://api.crunchbase.com/api/v4/entities/organizations`.
- Key from env var `CRUNCHBASE_API_KEY`.

### 4.6 File Structure and Organization

See detailed structure in section 12.

---

## 5. DATA MODELS

### 5.1 Table: contacts

**Purpose:** Store basic contact information and processing status.

```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  title TEXT,
  company TEXT,
  linkedin_url TEXT NOT NULL,
  twitter_url TEXT,
  company_website TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'NEW', -- NEW, ENRICHED, ANALYZED, EMAIL_GENERATED, REVIEWED, ERROR
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
