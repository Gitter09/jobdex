# Personal CRM System - Comprehensive Product Requirements Document

**Version:** 1.0  
**Last Updated:** January 2026  
**Author:** AI Engineering Assistant  
**Status:** Ready for Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Personas](#3-user-personas)
4. [Use Cases and User Stories](#4-use-cases-and-user-stories)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Technical Considerations](#7-technical-considerations)
8. [UI/UX Specifications](#8-uiux-specifications)
9. [Data Flow and Integration](#9-data-flow-and-integration)
10. [Edge Cases and Error Handling](#10-edge-cases-and-error-handling)
11. [Future Extensibility](#11-future-extensibility)
12. [Success Metrics and Testing Criteria](#12-success-metrics-and-testing-criteria)
13. [Development Phases](#13-development-phases)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Product Name and Tagline

**Product Name:** OutreachOS  
**Tagline:** Your Personal Inbox for Cold Email Mastery

### 1.2 Product Vision

OutreachOS is a locally-hosted, single-user Personal CRM system designed for students pursuing internships and jobs through targeted cold email outreach. It consolidates contact management, email campaign orchestration, application tracking, and interaction logging into one beautiful, keyboard-friendly macOS application. Unlike enterprise CRM systems, OutreachOS is lean, focused, and purpose-built for an individual's job-search journey.

### 1.3 Primary Use Case

A student constructs and executes a strategic cold email campaign to secure summer internships or full-time job positions. They maintain a growing database of companies and decision-makers, send personalized multi-touch email sequences, track which emails were opened/clicked/replied to, monitor where each application stands in the pipeline, and continuously refine their approach based on real data.

### 1.4 Target User

- **Demographic:** College/university student, likely technical or business background
- **Geography:** Global, optimized for macOS users
- **Technical Proficiency:** Intermediate to advanced (comfortable with APIs, automation)
- **Motivation:** Secure internship/job through systematic, data-driven cold outreach
- **Key Constraint:** Single user, local installation, no shared workspaces

### 1.5 Key Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time to Inbox** | 2-3 seconds | Average time from app launch to viewing first contact |
| **Search Response Time** | <500ms | Time for search results to appear after typing |
| **Campaign Creation Time** | <5 minutes | Time from contact selection to scheduled first email |
| **Daily Active Usage** | 15-30 minutes | Expected daily time spent in the app |
| **User Satisfaction** | 8+/10 | Subjective satisfaction with core workflow |
| **Email Deliverability** | >95% | Percentage of emails reaching inbox (dependent on email settings) |
| **Keyboard Shortcut Adoption** | 70%+ of interactions | Target for keyboard vs mouse usage |

---

## 2. Product Overview

### 2.1 Problem Statement

Job-seeking students face critical pain points when executing cold email campaigns:

1. **Scattered Data**: Contacts, companies, and email interactions spread across LinkedIn, Gmail, spreadsheets, and notes
2. **Manual Tracking Overhead**: No visibility into which prospects opened emails, clicked links, or should receive follow-ups
3. **Campaign Complexity**: Multi-step email sequences require constant manual intervention; forgetting to send follow-ups
4. **Pipeline Chaos**: No unified view of application status across companies (applied â†’ screening â†’ interview â†’ offer)
5. **Analysis Paralysis**: Sending emails blindly without metrics on what messaging/timing works
6. **Tool Fragmentation**: Using 5+ tools (Gmail, Notion, Spreadsheet, LinkedIn, Calendar) creates context switching
7. **Cost Barrier**: Professional CRM systems ($100-500/month) are prohibitive for students
8. **Complexity Overkill**: Enterprise CRM tools have feature bloat irrelevant to individual outreach

### 2.2 Solution Overview

OutreachOS consolidates the entire cold email job search workflow into one application:

- **Single Source of Truth**: All contacts, companies, campaigns, and interactions live in one local database
- **Smart Campaign Automation**: Define multi-step email sequences once, automation handles sends, scheduling, and conditional follow-ups
- **Email Tracking Integration**: Connect your email account, track opens/clicks/replies automatically
- **Visual Pipeline Management**: Kanban-style board showing application status across companies
- **Powerful Search & Filtering**: Find contacts instantly by company, title, interaction history, application status
- **Actionable Insights**: Simple analytics showing what campaigns/timing work best
- **Zero Cost**: Free, locally hosted, no subscriptions

### 2.3 Core Value Proposition

**For the student:** Get more interviews by systematizing cold outreach. Organize, automate, and optimize your job search in one beautifully designed app that respects your time.

**Why it matters:** 
- Reduces time managing tools by 70% (consolidates 5 tools into 1)
- Makes data-driven campaign adjustments instead of guessing
- Enables sending 50+ personalized emails per week without manual overhead
- Provides psychological confidence through visual progress tracking

### 2.4 Out of Scope

**Explicitly NOT included in this product:**

- Multi-user workspaces or team collaboration features
- Mobile app (macOS desktop only for MVP)
- CRM for existing business customers (focus: job search only)
- Phone calling or SMS capabilities
- LinkedIn automation or scraping
- Built-in video conferencing or meeting scheduling (integrates with external tools)
- AI-powered writing assistance (templates yes, AI content generation no)
- Advanced financial modeling or forecasting
- Inventory management
- Customer support ticketing
- Email inbox integration (no Gmail sync for reading inbox, only sending)
- Affiliate or partnership program management

**Design Principles:**
- Opinionated for cold email job search (not a generalized CRM)
- Assume single user running on one machine
- Leverage macOS native capabilities where sensible
- Ruthlessly eliminate features not core to job search workflow

---

## 3. User Personas

### 3.1 Primary User Persona: Priya (The Strategic Outreacher)

#### Demographics
- **Age:** 22 years old, senior in college
- **Location:** India (broader context applies to any region)
- **Background:** Engineering or Business student with technical aptitude
- **Experience:** Intermediate software skills, comfortable with APIs and automation

#### Goals (Primary)
1. Secure a summer internship at a well-known tech company within 4 months
2. Maintain systematic outreach to 100-150 target companies without losing track
3. Send 40+ personalized cold emails per week without manual drudgery
4. Understand what messaging resonates (improve reply rate from 5% â†’ 8%+)
5. Stay organized enough to follow up effectively (not spam, but persistently)

#### Goals (Secondary)
1. Build a repeatable system for future job searches
2. Maintain genuine relationships with people who might become collaborators
3. Reduce time spent organizing/tracking so more time for networking
4. Feel confident that no promising lead falls through cracks

#### Pain Points
1. **Tool Sprawl**: LinkedIn for research, Gmail for sending, Google Sheets for tracking, Notion for templates â†’ constant context switching
2. **Forgotten Follow-ups**: Meant to follow up with 3 people after 1 week, forgot, now awkward to message
3. **Duplicate Effort**: Researching same company multiple times; similar emails sent to similar roles
4. **No Visibility**: Sent 50 emails, but no idea how many were opened or what to improve
5. **Manual Scheduling**: Setting phone reminders for "send follow-up to X on Thursday"
6. **Impersonal Scale**: Wants 60 emails/month but fears sounding robotic; struggle between personalization and scale
7. **Lost Context**: Months later, can't remember why certain contact was important or what last interaction was
8. **Analysis Paralysis**: Trying to optimize subject lines but can't measure what works

#### Technical Proficiency
- Can write basic SQL queries if needed
- Comfortable with APIs and webhooks
- Uses command line occasionally
- Understands email authentication (SMTP, OAuth)
- Can troubleshoot most tech issues herself

#### Daily Workflow Patterns
- **Morning (8-10am)**: Spend 30 min researching 10 companies, adding contacts, assigning to campaign
- **Midday (1-2pm)**: Review metrics from yesterday's sends; adjust subject lines if needed
- **Evening (7-8pm)**: Compose new email template for different persona; schedule campaign; check replies
- **Weekly (Sunday evening)**: Review all interactions, plan outreach for next week, analyze conversion funnels

#### Device and Preferences
- MacBook Pro M1 as primary computer (always with her)
- Monitors email on iPhone, but rarely composes on phone
- Prefers dark mode for late-night work
- Values keyboard shortcuts and fast UI (expects <100ms response times)
- Uses multiple email accounts (personal Gmail, college email, potential professional email)

#### Success Criteria
- Has sent 50+ emails in one month without losing sanity
- Achieved 8% reply rate (industry standard is 5-10%)
- Conducted 3 interviews from cold outreach
- Can onboard a friend to the system in <10 minutes
- Uses keyboard shortcuts for 70%+ of actions

#### Fears and Concerns
- App crashes and loses her data
- Email credentials get compromised or leaked
- Marked as spam by prospect's email provider
- Wastes time learning complex tool instead of doing actual outreach

---

## 4. Use Cases and User Stories

### 4.1 Contact Management

#### User Story 1: Add Single Contact Manually

**As a** student building my prospect list,  
**I want to** quickly add a new contact with their name, email, and company,  
**So that** I can track who I want to reach out to.

**Acceptance Criteria:**
- [ ] Form has fields: First Name, Last Name, Email, Phone (optional), Title, Company, LinkedIn URL (optional)
- [ ] All fields validate before save (email must be valid format; at least first name + email required)
- [ ] Save completes in <500ms
- [ ] Upon save, app displays success toast notification
- [ ] Contact appears immediately in contacts list
- [ ] User can press Escape to cancel without losing form data (auto-saves draft)
- [ ] Focus returns to form for rapid multi-entry

**Priority:** P0 (Must-Have)  
**Complexity:** Simple  
**Estimated Hours:** 2

---

#### User Story 2: Bulk Import Contacts from CSV

**As a** student with 100 LinkedIn prospects exported to CSV,  
**I want to** import all contacts at once instead of typing each one,  
**So that** I can build my prospect database quickly.

**Acceptance Criteria:**
- [ ] User can select CSV file via file picker (Cmd+I keyboard shortcut)
- [ ] Supports column headers: First Name, Last Name, Email, Phone, Title, Company, LinkedIn
- [ ] If header row missing, show dialog asking user to identify columns
- [ ] Show preview of 5 records before importing
- [ ] Validate all emails before import; flag invalid ones and allow user to fix or skip
- [ ] Detect duplicates by email; show "X duplicates found" and ask whether to overwrite/skip/merge
- [ ] After import, show "Successfully imported 87 contacts" toast
- [ ] Import happens in background so UI stays responsive
- [ ] CSV supports UTF-8 encoding with international characters (names in Devanagari, Chinese, Arabic, etc.)

**Priority:** P1 (Should-Have, but high value)  
**Complexity:** Moderate  
**Estimated Hours:** 4

---

#### User Story 3: Edit Existing Contact

**As a** student who just learned the prospect's correct title,  
**I want to** update their contact record without deleting and re-adding,  
**So that** my database stays accurate.

**Acceptance Criteria:**
- [ ] Clicking contact shows detail panel on right side
- [ ] All fields are editable inline (first name, email, phone, title, company, LinkedIn URL)
- [ ] Changes auto-save with 2-second debounce
- [ ] Show "Last edited 5 minutes ago" timestamp
- [ ] If email changed, validate new email format
- [ ] If duplicate email detected after edit, show warning
- [ ] Cmd+Z undoes last edit within session
- [ ] Activity log shows "Priya updated Title from 'Manager' to 'Director' on Jan 15"

**Priority:** P0  
**Complexity:** Simple  
**Estimated Hours:** 3

---

#### User Story 4: Merge Duplicate Contacts

**As a** student who accidentally added the same person twice,  
**I want to** merge them into one record,  
**So that** I don't send duplicate emails or lose interaction history.

**Acceptance Criteria:**
- [ ] Drag second contact onto first to merge, OR use "Merge" button after selecting both
- [ ] Shows conflict resolution UI if fields differ (e.g., two different phone numbers)
- [ ] User selects which version to keep for each conflicting field
- [ ] All interactions/activities from both contacts consolidate under merged record
- [ ] All email campaigns linked to either contact now link to merged contact
- [ ] Cannot undo merge after 30 seconds (show warning before confirming)
- [ ] Undo available within 30-second window

**Priority:** P1  
**Complexity:** Moderate  
**Estimated Hours:** 3

---

#### User Story 5: Delete Contact

**As a** student cleaning up my contacts,  
**I want to** remove a contact who declined or is no longer relevant,  
**So that** my database stays focused.

**Acceptance Criteria:**
- [ ] Right-click contact â†’ "Delete" or Cmd+Backspace
- [ ] Shows confirmation dialog: "Delete John Doe? This cannot be undone."
- [ ] Hard delete (no recovery) - user explicitly warned
- [ ] Deleting contact also deletes associated interactions, but campaigns linked to this contact show "Contact deleted" without breaking
- [ ] If contact has active campaign, show warning: "This contact is in 3 active campaigns"

**Priority:** P1  
**Complexity:** Simple  
**Estimated Hours:** 1.5

---

### 4.2 Company Management

#### User Story 6: Add Company

**As a** student researching a company,  
**I want to** create a company record that I can link multiple contacts to,  
**So that** I can organize contacts by target organization.

**Acceptance Criteria:**
- [ ] Form has fields: Company Name, Website Domain, Industry, Company Size (1-10, 11-50, 51-200, etc.), Location, Notes
- [ ] All fields validate (domain should be valid URL format, size from dropdown)
- [ ] Save completes in <500ms
- [ ] Company appears in company list and can be selected when adding/editing contacts
- [ ] Clicking company shows linked contacts sidebar
- [ ] Company detail view shows count of contacts, campaigns, applications linked

**Priority:** P1  
**Complexity:** Simple  
**Estimated Hours:** 2

---

#### User Story 7: Search Contacts by Company

**As a** student targeting Google,  
**I want to** see all my contacts at Google,  
**So that** I can coordinate outreach to multiple teams.

**Acceptance Criteria:**
- [ ] Filter button in contacts list or Cmd+K search shows company filter
- [ ] Type "Google" to see all Google contacts
- [ ] Shows count badge "12 contacts at Google"
- [ ] Can apply additional filters (e.g., "Google + Engineering" to see all Google engineers)
- [ ] Results update in real-time as user types

**Priority:** P0  
**Complexity:** Simple  
**Estimated Hours:** 2

---

### 4.3 Email Campaign Management

#### User Story 8: Create Email Template

**As a** student who sends similar emails to different personas,  
**I want to** create reusable email templates with placeholders,  
**So that** I maintain consistency while personalizing at scale.

**Acceptance Criteria:**
- [ ] New Template form with fields: Template Name, Subject Line, Body, Category (optional)
- [ ] Body has rich text editor with Bold, Italic, Underline, Links
- [ ] Support variables: {{firstName}}, {{lastName}}, {{companyName}}, {{title}}, {{mutualConnection}}
- [ ] Variables show blue highlight with autocomplete when user types {{
- [ ] Variables auto-populate when creating campaign
- [ ] Show live preview showing how email looks with sample data
- [ ] Can save as draft or publish
- [ ] Templates are global (reusable across multiple campaigns)
- [ ] Can duplicate existing template and modify

**Priority:** P0  
**Complexity:** Moderate  
**Estimated Hours:** 4

---

#### User Story 9: Create Multi-Step Email Campaign

**As a** student running cold email outreach,  
**I want to** set up a 3-email sequence that sends automatically over 2 weeks,  
**So that** I can follow up persistently without manual work.

**Acceptance Criteria:**
- [ ] Campaign creation wizard (4 steps):
  - Step 1: Select contacts or saved list
  - Step 2: Choose template for email 1 or write custom email
  - Step 3: Set schedule (e.g., Email 1 now, Email 2 after 3 days, Email 3 after 5 more days)
  - Step 4: Review and confirm
  
- [ ] Supports conditional logic: "If no reply, send email 2; if reply, stop sequence"
- [ ] Can pause/resume campaign anytime (e.g., pause if got a call, resume later)
- [ ] Campaign shows visual timeline: [Email 1: Jan 15] â†’ [Email 2: Jan 18 (if no reply)] â†’ [Email 3: Jan 23]
- [ ] Scheduled emails appear in "Upcoming" list
- [ ] Can edit campaign before first email sends; locked after first send
- [ ] Shows count of emails queued, sent, bounced, replied

**Priority:** P0  
**Complexity:** Complex  
**Estimated Hours:** 8

---

#### User Story 10: Schedule Individual Email

**As a** student wanting to send an email at a specific time,  
**I want to** draft an email and schedule it to send at 9am tomorrow,  
**So that** it hits their inbox when they're checking email.

**Acceptance Criteria:**
- [ ] Compose area with fields: To, Subject, Body
- [ ] "Send Now" button OR "Schedule" button (Cmd+Shift+Enter)
- [ ] Schedule dialog shows date/time picker (humanized: "Tomorrow at 9am", "Next Tuesday at 2pm")
- [ ] Scheduled emails appear in "Upcoming" list showing countdown
- [ ] Can reschedule or cancel up until 5 minutes before send
- [ ] Send confirmation: "Email scheduled to John Doe for Jan 16 at 9:00 AM"
- [ ] Timezone handling (respects system timezone)

**Priority:** P0  
**Complexity:** Moderate  
**Estimated Hours:** 3

---

#### User Story 11: Track Email Interactions (Open, Click, Reply)

**As a** student evaluating campaign effectiveness,  
**I want to** see which contacts opened emails and clicked links,  
**So that** I can identify high-interest prospects and adjust messaging.

**Acceptance Criteria:**
- [ ] Each sent email shows status: Sent, Delivered, Bounced, Opened, Clicked, Replied
- [ ] Clicking on email shows "Opened by John on Jan 15 at 2:47 PM" with timestamp
- [ ] Shows which links were clicked (if any)
- [ ] Contact detail view shows "Last interaction: Opened your email on Jan 15"
- [ ] Can filter contacts by interaction type (e.g., "Show all who opened but didn't reply")
- [ ] Dashboard widget showing "8 opened, 2 clicked, 1 reply" for today's sends
- [ ] Tracking requires email provider integration (Gmail API) or third-party tracking service
- [ ] If tracking unavailable, show "Email sent (tracking unavailable)" without erroring

**Priority:** P0  
**Complexity:** Complex (requires email integration)  
**Estimated Hours:** 6

---

#### User Story 12: Handle Unsubscribes and Bounces

**As a** system managing cold email deliverability,  
**I want to** automatically handle bounced emails and unsubscribe requests,  
**So that** we maintain sender reputation and comply with regulations.

**Acceptance Criteria:**
- [ ] Hard bounce (invalid email): Contact marked as "Bounce: Invalid", no further emails sent
- [ ] Soft bounce (temporary issue): Auto-retry up to 2 more times; if persists, mark as hard bounce
- [ ] Unsubscribe (user clicked unsubscribe): Contact marked as "Unsubscribed", no future emails sent, cannot override
- [ ] Bounce/unsubscribe notifications shown in activity log
- [ ] Cannot re-enable hard bounced/unsubscribed contacts without manual review
- [ ] Settings page shows bounce and unsubscribe suppression lists with counts
- [ ] Daily digest showing "3 hard bounces today, 1 unsubscribe"

**Priority:** P0  
**Complexity:** Moderate  
**Estimated Hours:** 4

---

### 4.4 Application Tracking

#### User Story 13: Create Application Record

**As a** student who just applied to a company,  
**I want to** log the application in the system,  
**So that** I can track where it is in their hiring pipeline.

**Acceptance Criteria:**
- [ ] Quick action from contact detail: "Create Application"
- [ ] Form fields: Contact, Company, Position, Application Date, Current Stage (Applied), Notes
- [ ] Can also create from company view: "Create Application for [Company Name]"
- [ ] Application links to contact and company records
- [ ] On save, shows "Application created for Software Engineer at Google"
- [ ] Application appears in Pipeline board under "Applied" column

**Priority:** P0  
**Complexity:** Simple  
**Estimated Hours:** 2

---

#### User Story 14: Move Application Through Pipeline

**As a** student who just got a rejection email,  
**I want to** move an application from "Screening" to "Rejected",  
**So that** I can see my funnel metrics and adjust strategy.

**Acceptance Criteria:**
- [ ] Pipeline board shows 5 columns: Applied, Screening, Interview, Offer, Rejected
- [ ] Drag-and-drop application card from one column to another
- [ ] Moving to next stage auto-updates "Last Status Change Date"
- [ ] Manual status transition vs. automatic (e.g., auto-move to "Interview" if calendar event created for interview)
- [ ] Show confirmation for certain transitions (e.g., "Mark as Rejected?" requires note)
- [ ] Activity log updates: "Moved Google SWE from Screening to Interview on Jan 15"
- [ ] Can add note when changing status (e.g., "Rejected: Not enough ML experience")

**Priority:** P0  
**Complexity:** Moderate  
**Estimated Hours:** 4

---

#### User Story 15: View Application Pipeline

**As a** student evaluating outreach effectiveness,  
**I want to** see all my applications in a Kanban board,  
**So that** I can visualize my funnel and identify where prospects are getting stuck.

**Acceptance Criteria:**
- [ ] Kanban board view with 5 columns (Applied, Screening, Interview, Offer, Rejected)
- [ ] Each card shows: Contact Name, Company, Position, Days in Stage, Last Activity
- [ ] Count badge on each column: "(12)" showing how many applications in that stage
- [ ] Hover card shows: Interview scheduled for Jan 20, Last email 3 days ago
- [ ] Can filter board by: Date range, Company, Outcome (successful/rejected), etc.
- [ ] Double-click card to open full application detail
- [ ] Drag to reorder columns or add custom columns
- [ ] Timeline view (calendar) showing applications with key dates

**Priority:** P0  
**Complexity:** Moderate  
**Estimated Hours:** 5

---

#### User Story 16: Track Application Dates

**As a** student wanting to follow up strategically,  
**I want to** track when I applied, when I last contacted them, and when to follow up,  
**So that** I maintain cadence without being annoying or forgetting.

**Acceptance Criteria:**
- [ ] Application record tracks: Applied Date, Last Contact Date, Next Follow-up Date
- [ ] Show "Follow up today with John" in daily dashboard
- [ ] Can set reminder (notification) for follow-up date
- [ ] Auto-suggest next follow-up date based on days since last contact (e.g., suggest 1 week if last contact 1 week ago)
- [ ] Activity log shows timeline of all interactions with this application

**Priority:** P1  
**Complexity:** Moderate  
**Estimated Hours:** 3

---

### 4.5 Search and Filtering

#### User Story 17: Global Search

**As a** student needing to find a contact quickly,  
**I want to** press Cmd+K and type to search all contacts/companies/emails,  
**So that** I don't have to navigate through menus.

**Acceptance Criteria:**
- [ ] Cmd+K opens search dialog (keyboard focus auto-moves to search box)
- [ ] Search is real-time (results update as user types)
- [ ] Searches across: Contact names, emails, company names, notes, email subjects
- [ ] Results show: Contact [name, email], Company [name, industry], Email [subject, date], Application [position, company]
- [ ] Can filter results by type (show only Contacts, or only Emails, etc.)
- [ ] Press Enter to select first result or click to select
- [ ] Esc closes search dialog
- [ ] Recent searches appear at top (last 5)
- [ ] Search supports filters: "company:Google title:Engineer" to search within company/title

**Priority:** P0  
**Complexity:** Moderate  
**Estimated Hours:** 4

---

#### User Story 18: Advanced Filtering

**As a** student running analytics,  
**I want to** filter contacts by multiple criteria (e.g., "Google + No reply + Last contacted >7 days ago"),  
**So that** I can identify who needs follow-up.

**Acceptance Criteria:**
- [ ] Filter panel on left sidebar (collapsible)
- [ ] Filter categories:
  - Company (multi-select dropdown)
  - Title/Role (text search)
  - Last Contact Date (date range: Last 7 days, 7-14 days, etc.)
  - Interaction Status (Opened, Clicked, Replied, Bounced, etc.)
  - Application Status (Applied, Screening, Interview, Offer, Rejected)
  - Tags (any tags user creates)
- [ ] Filters apply instantly to list view
- [ ] Show count badge: "(47 contacts match filters)"
- [ ] Can save filter as "Needs Follow-up" and reuse it

**Priority:** P1  
**Complexity:** Moderate  
**Estimated Hours:** 3

---

#### User Story 19: Save Searches

**As a** student running the same reports weekly,  
**I want to** save a filter as "Weekly Review: No Reply in 2 Weeks",  
**So that** I can load it with one click.

**Acceptance Criteria:**
- [ ] After applying filters, "Save Filter" button appears
- [ ] User types filter name and clicks Save
- [ ] Saved filters appear in sidebar under "Saved Searches"
- [ ] Click saved search to instantly apply those filters
- [ ] Can edit or delete saved searches

**Priority:** P2 (Nice-to-have)  
**Complexity:** Simple  
**Estimated Hours:** 1.5

---

### 4.6 Daily Workflow

#### User Story 20: View Daily Dashboard

**As a** student starting my day,  
**I want to** see what happened yesterday and what I need to do today,  
**So that** I can prioritize my outreach efforts.

**Acceptance Criteria:**
- [ ] Dashboard appears on app launch (or Cmd+1 to navigate to it)
- [ ] Today's section: "Follow-ups due today (3)", "Emails to review (5)", "Applications to update"
- [ ] Yesterday's section: "Emails sent (12)", "Emails opened (3)", "Replies received (1)"
- [ ] Quick actions: "Compose Email", "Create Campaign", "Add Contact"
- [ ] Upcoming section: "Scheduled emails for next 7 days"
- [ ] Metrics section: Shows reply rate trend, application conversion rate

**Priority:** P0  
**Complexity:** Moderate  
**Estimated Hours:** 4

---

#### User Story 21: Weekly Review

**As a** student reviewing outreach progress,  
**I want to** see this week's metrics and adjust next week's strategy,  
**So that** I can continuously improve my approach.

**Acceptance Criteria:**
- [ ] Analytics/Reports page showing weekly view (Cmd+2)
- [ ] Metrics shown:
  - Emails sent: 42
  - Delivery rate: 98.8%
  - Open rate: 7.2%
  - Click rate: 1.9%
  - Reply rate: 4.8%
  - Applications created: 5
  - Applications moved to next stage: 2
- [ ] Comparison to previous week (7.2% vs 6.1% last week â†‘)
- [ ] Top performing templates (which subject lines got best open rate)
- [ ] Top performing companies (highest reply rate from which companies)
- [ ] Can filter to specific campaigns or date ranges
- [ ] Export report as PDF

**Priority:** P1  
**Complexity:** Moderate  
**Estimated Hours:** 5

---

### 4.7 Automation and Reminders

#### User Story 22: Set Follow-up Reminders

**As a** student following up with prospects,  
**I want to** get notified when it's time to follow up,  
**So that** I don't forget and lose momentum.

**Acceptance Criteria:**
- [ ] When setting follow-up date, can set reminder (1 day before, same day, etc.)
- [ ] Reminder appears as notification at set time
- [ ] Notification shows: "Follow up with John at Google (3 days since last contact)"
- [ ] Clicking notification opens contact detail
- [ ] Can snooze reminder (remind me in 1 hour, 1 day, etc.)
- [ ] Reminders persist across app launches (not lost if app closed)
- [ ] Settings page has "Reminder Time" preference (e.g., "Remind me at 9 AM")

**Priority:** P1  
**Complexity:** Moderate  
**Estimated Hours:** 3

---

#### User Story 23: Automation Rules

**As a** student wanting to reduce manual work,  
**I want to** set rules like "If someone replies, move application to Screening",  
**So that** the system helps manage updates.

**Acceptance Criteria:**
- [ ] Automation Rules page (Settings â†’ Automation)
- [ ] Create rule with Trigger + Action format:
  - **Trigger examples:** "Email received from contact", "Email opened by contact", "7 days without reply"
  - **Action examples:** "Change status to Screening", "Add tag 'Hot Lead'", "Send notification", "Move to Interested campaign"
- [ ] Can create multiple rules
- [ ] Rules execute in background asynchronously
- [ ] Activity log shows "Automation: Moved to Screening because reply received"
- [ ] Can enable/disable rules without deleting

**Priority:** P2  
**Complexity:** Complex  
**Estimated Hours:** 6

---

### 4.8 Data Import/Export

#### User Story 24: Export All Data as CSV

**As a** student wanting a backup or to use data elsewhere,  
**I want to** export all contacts, companies, and campaigns as CSV,  
**So that** my data isn't locked into this app.

**Acceptance Criteria:**
- [ ] Settings â†’ Export â†’ "Export All Data"
- [ ] Creates multiple CSVs: contacts.csv, companies.csv, campaigns.csv, applications.csv
- [ ] Can also export as JSON for more complete data structure
- [ ] Download starts automatically with proper file naming
- [ ] All fields included, preserving data types where possible
- [ ] CSV includes timestamps, relationships between entities

**Priority:** P1  
**Complexity:** Simple  
**Estimated Hours:** 2

---

#### User Story 25: Browser Extension for LinkedIn

**As a** student researching prospects on LinkedIn,  
**I want to** click an extension button to capture their profile info,  
**So that** I don't have to manually copy-paste name, title, company.

**Acceptance Criteria:**
- [ ] Browser extension works on LinkedIn profiles
- [ ] Clicking extension icon shows popup with extracted data: Name, Title, Company, LinkedIn URL, Profile photo
- [ ] User can edit/confirm extracted data before saving
- [ ] Click "Add to OutreachOS" to create contact in app
- [ ] Shows confirmation: "John Doe added to OutreachOS"
- [ ] Extension settings allow toggling which fields auto-populate
- [ ] Works with Safari and Chrome

**Priority:** P2  
**Complexity:** Complex  
**Estimated Hours:** 6

---

## 5. Functional Requirements

### 5.1 Data Model

#### 5.1.1 Contact Entity

```
Contact {
  id: UUID [Primary Key]
  firstName: String [Required, min 1 char, max 100 chars]
  lastName: String [Optional, max 100 chars]
  email: String [Required, must be valid email format, unique]
  phone: String [Optional, format: +1-555-1234 or similar]
  title: String [Optional, max 100 chars, e.g., "Software Engineer", "Product Manager"]
  companyId: UUID [Foreign Key to Company, Optional]
  linkedinUrl: String [Optional, must start with https://linkedin.com]
  notes: Text [Optional, rich text, max 10000 chars]
  tags: String[] [Optional, e.g., ["Hot Lead", "Deferred"]]
  createdAt: DateTime [System-generated, immutable]
  updatedAt: DateTime [System-generated, updates on any field change]
  
  // Relationships
  campaigns: Campaign[] [One-to-many]
  interactions: Interaction[] [One-to-many]
  applications: Application[] [One-to-many]
}
```

**Validation Rules:**
- Email must be valid format (RFC 5322 standard)
- Email must be unique across database (no duplicate emails)
- firstName is required; lastName optional (support single-name contacts)
- Phone is optional; if provided, should match international format (accept +1-555-1234, (555) 1234, etc.)
- LinkedIn URL must be valid LinkedIn profile URL
- Tags must be lowercase alphanumeric + hyphens, max 50 chars each

**Field Requirements Matrix:**

| Field | Required | Searchable | Filterable | Sortable | Editable |
|-------|----------|-----------|-----------|----------|----------|
| firstName | Yes | Yes | Yes | Yes | Yes |
| email | Yes | Yes | Yes | No | Yes |
| title | No | Yes | Yes | Yes | Yes |
| company | No | Yes | Yes | Yes | Yes |
| tags | No | Yes | Yes | No | Yes |
| notes | No | Yes | No | No | Yes |

---

#### 5.1.2 Company Entity

```
Company {
  id: UUID [Primary Key]
  name: String [Required, min 1 char, max 200 chars]
  website: String [Optional, must be valid URL]
  industry: String [Optional, from predefined list: SaaS, FinTech, Healthcare, etc.]
  size: Enum [Optional, one of: 1-10, 11-50, 51-200, 201-1000, 1000+]
  location: String [Optional, city, country]
  notes: Text [Optional, max 10000 chars]
  createdAt: DateTime [System-generated]
  updatedAt: DateTime [System-generated]
  
  // Relationships
  contacts: Contact[] [One-to-many, all contacts at this company]
  applications: Application[] [One-to-many, all applications to this company]
}
```

**Validation Rules:**
- Company name is required and must be unique (no duplicates)
- Website URL must be valid if provided (starts with http/https)
- Industry from dropdown: SaaS, FinTech, Healthcare, Retail, Manufacturing, etc.
- Size from predefined enum
- Location should accept international city names

---

#### 5.1.3 Email Campaign Entity

```
Campaign {
  id: UUID [Primary Key]
  name: String [Required, max 200 chars, e.g., "Google SWE Outreach - Jan 2026"]
  type: Enum [Required, one of: "Single Email", "Multi-step Sequence"]
  status: Enum [Required, one of: "Draft", "Scheduled", "Active", "Paused", "Completed"]
  
  // Template and Content
  emails: CampaignEmail[] [Array of email steps in sequence]
  
  // Recipients
  targetContacts: Contact[] [List of contacts receiving this campaign]
  
  // Scheduling
  startDate: DateTime [When campaign begins; if null, starts immediately]
  endDate: DateTime [Optional, campaign stops sending after this date]
  
  // Performance
  totalEmailsSent: Int [Counter, auto-updated]
  totalEmailsOpened: Int [Counter, auto-updated]
  totalEmailsClicked: Int [Counter, auto-updated]
  totalReplies: Int [Counter, auto-updated]
  totalBounced: Int [Counter, auto-updated]
  
  createdAt: DateTime [System-generated]
  updatedAt: DateTime [System-generated]
  
  // Relationships
  interactions: Interaction[] [One-to-many]
}
```

**CampaignEmail Sub-entity (Email step within sequence):**

```
CampaignEmail {
  id: UUID
  campaignId: UUID [Foreign Key]
  stepNumber: Int [1, 2, 3, etc.]
  templateId: UUID [Foreign Key to EmailTemplate]
  subject: String [Max 200 chars]
  body: String [Rich text, max 50000 chars]
  sendRules: SendRule [Conditions for when to send this email]
  delayDays: Int [Days after previous email, 0 = immediate after previous]
  
  // Conditionals
  sendIf: Condition [Optional, e.g., "sendIf: no reply to step 1"]
  skipIf: Condition [Optional, e.g., "skipIf: contact replied to step 1"]
}
```

**SendRule Examples:**
- `delayDays: 0` â†’ Send immediately after previous email
- `delayDays: 3` â†’ Send 3 days after previous email
- `sendIf: "no_reply"` â†’ Send only if previous email not replied
- `skipIf: "replied"` â†’ Skip this email if recipient already replied

---

#### 5.1.4 Email Template Entity

```
EmailTemplate {
  id: UUID [Primary Key]
  name: String [Required, unique, max 100 chars, e.g., "Cold outreach - Initial touch"]
  category: String [Optional, e.g., "Initial", "Follow-up", "Closing"]
  subject: String [Required, max 200 chars, can include variables {{firstName}}, {{companyName}}]
  body: String [Required, rich text, max 50000 chars, can include variables]
  variables: String[] [List of variables used: {{firstName}}, {{companyName}}, etc.]
  createdAt: DateTime [System-generated]
  updatedAt: DateTime [System-generated]
  
  // Usage
  usedInCampaigns: Campaign[] [Campaigns using this template]
}
```

**Supported Variables:**
- `{{firstName}}` - Contact's first name
- `{{lastName}}` - Contact's last name
- `{{fullName}}` - Contact's full name
- `{{companyName}}` - Contact's company name
- `{{title}}` - Contact's job title
- `{{mutualConnection}}` - Name of mutual connection (if provided)
- `{{recipientEmail}}` - Contact's email (for tracking links)

**Variable Validation:**
- System validates all variables used in template are standard
- Custom variables (user-defined) not allowed in MVP
- Preview shows sample values so user can verify template looks good

---

#### 5.1.5 Application (Opportunity) Entity

```
Application {
  id: UUID [Primary Key]
  contactId: UUID [Foreign Key to Contact, Required]
  companyId: UUID [Foreign Key to Company, Required]
  positionTitle: String [Required, e.g., "Software Engineer Intern"]
  status: Enum [Required, one of: "Applied", "Screening", "Interview", "Offer", "Rejected"]
  
  // Dates
  appliedDate: DateTime [Required, when application was submitted]
  lastContactDate: DateTime [Optional, when last contacted by Priya]
  nextFollowupDate: DateTime [Optional, when to next contact]
  
  // Details
  interviewDate: DateTime [Optional, scheduled interview date]
  rejectionReason: String [Optional, why application was rejected]
  offerDetails: String [Optional, notes about offer]
  notes: Text [Optional, max 5000 chars]
  
  // Relationships
  interactions: Interaction[] [One-to-many, all emails/calls/etc for this app]
  
  createdAt: DateTime [System-generated]
  updatedAt: DateTime [System-generated, only when status changed]
}
```

**Status Definitions:**
- **Applied:** Application submitted, awaiting review
- **Screening:** Company is reviewing application, may have sent screening questions
- **Interview:** Scheduled or completed interview
- **Offer:** Received job offer
- **Rejected:** Application rejected

**Status Transitions:**
- Allowed: Applied â†’ Screening â†’ Interview â†’ (Offer OR Rejected)
- Also allowed: Screening â†’ Rejected, Interview â†’ Rejected
- Cannot go backwards (can't change from Interview back to Screening)
- System prevents invalid transitions and warns user

---

#### 5.1.6 Interaction (Activity) Entity

```
Interaction {
  id: UUID [Primary Key]
  type: Enum [Required, one of: "Email Sent", "Email Opened", "Link Clicked", "Reply Received", "Phone Call", "Meeting", "Note Added", "Status Changed"]
  
  // Related entities
  contactId: UUID [Foreign Key to Contact]
  applicationId: UUID [Foreign Key to Application, Optional]
  campaignId: UUID [Foreign Key to Campaign, Optional]
  
  // Content
  subject: String [Optional, email subject if applicable]
  body: String [Optional, email/call/meeting notes]
  
  // Metadata
  timestamp: DateTime [When interaction occurred, system-generated]
  source: Enum [How this interaction was created: "Manual", "Email API", "Browser Extension"]
  
  // Email-specific
  emailStatus: Enum [Optional, one of: "Sent", "Delivered", "Bounced", "Opened", "Clicked"]
  openedAt: DateTime [Optional, when email was opened]
  clickedLinks: String[] [Optional, which links were clicked]
  
  createdAt: DateTime [System-generated]
}
```

**Interaction Types:**
- **Email Sent:** Email added to send queue or sent
- **Email Opened:** Prospect opened the email (timestamp)
- **Link Clicked:** Prospect clicked a link in email (which link)
- **Reply Received:** Prospect replied to email (include reply text)
- **Phone Call:** Phone conversation with contact
- **Meeting:** In-person or video meeting scheduled/completed
- **Note Added:** Manual note added by user
- **Status Changed:** Application status changed (e.g., Applied â†’ Interview)

---

#### 5.1.7 Tag Entity

```
Tag {
  id: UUID [Primary Key]
  name: String [Required, unique, lowercase, alphanumeric + hyphens, max 50 chars]
  color: String [Optional, hex color for UI, e.g., "#FF5733"]
  usageCount: Int [Counter, how many contacts have this tag]
  createdAt: DateTime [System-generated]
}
```

**Tag Examples:**
- "hot-lead" (active prospect, high likelihood)
- "dormant" (contacted but no recent activity)
- "referral" (contacted via mutual connection)
- "deferred" (not hiring now but potential future)

---

### 5.2 Core Features - Detailed Specifications

#### 5.2.1 Contact Management

**Feature: Add Single Contact**

*Flow:*
1. User clicks "Add Contact" or presses Cmd+N
2. Form appears with fields: First Name, Last Name, Email, Phone, Title, Company (dropdown), LinkedIn URL, Notes
3. User fills in required fields (First Name, Email)
4. System validates email format in real-time (green checkmark when valid)
5. User can optionally select company from dropdown (or search for company)
6. User clicks Save or presses Cmd+Enter
7. Contact is saved to local SQLite database
8. Success toast appears: "Contact added: John Doe (john@example.com)"
9. Focus returns to form for rapid multi-entry

*Validation:*
- Email format validation (RFC 5322)
- Duplicate email detection (error: "Email already in database")
- First name required (error if empty)

*Performance:*
- Save completes in <500ms
- Form appears in <100ms after clicking "Add Contact"

---

**Feature: Bulk Import from CSV**

*Flow:*
1. User goes to Settings â†’ Import/Export â†’ "Import Contacts"
2. File picker opens, user selects CSV file
3. System reads first row to detect headers
4. If headers not standard, shows dialog: "Select columns: First Name, Last Name, Email, Title, Company"
5. Shows preview of 5 rows with parsed data
6. User confirms columns mapping
7. System validates all emails before import
8. Shows validation results: "87 valid, 3 invalid emails" with option to review invalid rows
9. User confirms import
10. System inserts records, checking for duplicates
11. Shows results: "Successfully imported 87 contacts. 3 skipped (duplicate email)."

*Duplicate Handling:*
- Detect by email address
- Options: Skip, Merge, or Overwrite
- Default: Skip (preserve existing record)

*CSV Format:*
- Supports UTF-8 with international characters
- Headers: firstName, lastName, email, phone, title, company, linkedinUrl (case-insensitive)
- Can have extra columns (ignored)
- Required: at least email column

---

**Feature: Edit Contact**

*Flow:*
1. Click contact in list to open detail panel (right sidebar)
2. All fields become editable inline
3. Hover over field to see edit icon, or double-click to edit
4. Changes auto-save with 2-second debounce after user stops typing
5. Show "Last edited 5 minutes ago" timestamp
6. Cmd+Z undoes last edit (within same session)

*Validation:*
- If email changed, validate new email format
- Check for duplicate email (warning, but allow override: "Email already exists for Jane Doe. Override?")

*Activity Log:*
- Each change logged: "Priya updated Title from 'Manager' to 'Director' on Jan 15 at 2:30 PM"
- User can view all edits in "Activity" tab of contact detail

---

**Feature: Merge Duplicates**

*Flow:*
1. Select two contacts (Cmd+click to select multiple)
2. Right-click â†’ "Merge contacts"
3. Dialog shows side-by-side comparison of fields
4. For conflicting fields (two different phone numbers), user chooses which to keep
5. Option to keep all data and separate with comma: "555-1234, 555-5678"
6. Preview merged contact
7. Click "Merge" to confirm
8. All interactions/activities from both contacts consolidate under merged record
9. All campaigns linked to either contact now link to merged contact
10. System shows undo option for 30 seconds: "Undo merge?"

---

**Feature: Delete Contact**

*Flow:*
1. Right-click contact â†’ "Delete" OR select contact + press Cmd+Backspace
2. Confirmation dialog: "Delete John Doe? This action cannot be undone."
3. Click "Delete" button
4. Contact hard-deleted from database
5. Associated interactions/campaigns show "Contact deleted" but don't break
6. Show success: "Contact deleted"

---

#### 5.2.2 Company Management

**Feature: Add Company**

*Flow:*
1. Settings â†’ Companies â†’ "Add Company" OR when adding contact, click "Create Company" if not in list
2. Form with fields: Company Name, Website Domain, Industry (dropdown), Size (dropdown), Location, Notes
3. User fills in required field: Company Name
4. On save, company added to database and appears in company dropdown for future use
5. Company detail view shows: contacts count, campaigns count, applications count, success rate

*Validation:*
- Company name required and must be unique
- Website URL format validation if provided
- Industry and Size from predefined enums

---

**Feature: Company Links**

*Implementation:*
- When viewing company, right sidebar shows all contacts at that company with action buttons
- Can quickly create campaign targeting all contacts at that company
- Can see all applications to that company

---

#### 5.2.3 Email Campaign Management

**Feature: Create Email Template**

*Flow:*
1. Settings â†’ Email Templates â†’ "New Template"
2. Form fields:
   - Template Name: "Cold outreach - Initial touch"
   - Category: "Initial" or "Follow-up" (optional)
   - Subject Line: "{{firstName}}, quick question about {{companyName}}"
   - Body: Rich text editor with formatting options
3. As user types variables like `{{firstName}}`, system auto-completes with suggestion popup
4. Variables highlight in blue so they're visible
5. Live preview shows how email looks with sample data substituted
6. Save as Draft or Publish (cannot use unpublished templates in campaigns)
7. After save, template appears in template list

*Rich Text Editor:*
- Bold, Italic, Underline buttons
- Bullet points, numbered lists
- Links (insert URL with link text)
- Text color (limited palette matching brand colors)
- No image upload in MVP (only text + links)

*Variables:*
- Pre-defined: {{firstName}}, {{lastName}}, {{fullName}}, {{companyName}}, {{title}}, {{mutualConnection}}, {{recipientEmail}}
- System warns if variable doesn't exist when saving
- Preview shows sample values for each variable

---

**Feature: Create Multi-Step Campaign**

*Flow (Wizard format, 4 steps):*

**Step 1: Name & Recipients**
- Campaign name (e.g., "Google SWE Outreach - Jan")
- Select contacts: search/filter or upload list
- Or saved list (e.g., "Top 20 Google companies")
- Show count: "47 contacts selected"

**Step 2: Email Sequence**
- Add email steps (minimum 1, maximum 10)
- For each step:
  - Choose template from dropdown, or write custom email
  - Set delay from previous email (0 days = immediate, 3 days = 3 days after previous)
  - Optional condition: send this email only if [previous email not replied]
  - Show timeline visualization: [Email 1: Jan 15] â†’ [Email 2: Jan 18 if no reply] â†’ [Email 3: Jan 23]

**Step 3: Schedule**
- Start date: Today, Tomorrow, Next week, Pick date
- End date (optional): Stop sending after this date
- Send time: 9 AM, 2 PM (pick from common times or custom)
- Note: Each step has its own delay, system calculates when each step sends for each contact

**Step 4: Review**
- Show campaign summary:
  - 47 contacts targeted
  - 3 email steps
  - Timeline: Sends complete in 13 days
  - First email on Jan 15
- Confirm button to activate campaign

*Campaign States:*
- **Draft:** Can edit everything
- **Scheduled:** First email scheduled but not yet sent; can edit until 30 minutes before first send
- **Active:** Sending in progress; cannot edit
- **Paused:** Can resume; all scheduled sends paused
- **Completed:** All emails sent; read-only

*Pause/Resume:*
- User can pause campaign anytime (all remaining sends cancelled until resume)
- Resume restarts from where paused, keeping original schedule

---

**Feature: Schedule Individual Email**

*Flow:*
1. Click "Compose" or Cmd+Shift+C
2. Form appears with To (contact dropdown), Subject, Body (rich text editor)
3. Click "Send Now" button or "Schedule" button (Cmd+Shift+Enter)
4. If Schedule clicked, time picker appears:
   - Presets: "Now", "Tomorrow 9 AM", "Tomorrow 2 PM", "Next Tuesday"
   - Or custom date/time picker
5. Timezone handled automatically (uses system timezone)
6. Confirmation: "Email scheduled for John Doe on Jan 16 at 9:00 AM"
7. Email appears in "Upcoming" list in dashboard

*Reschedule/Cancel:*
- Click on scheduled email in "Upcoming" list
- Can reschedule or cancel if send time >5 minutes away
- Cannot reschedule/cancel if send time <5 minutes (imminent send)

---

**Feature: Email Tracking**

*Implementation Approach:*
- Integrate with email provider's API (Gmail API or Outlook API)
- For open tracking: Use email tracking service (optional: Mailgun, SendGrid) OR rely on email read receipts
- For click tracking: Insert tracking pixel in HTML email OR use link wrapper service

*Data captured:*
- **Sent:** Email delivered to mail server (Gmail API webhook)
- **Delivered:** Accepted by recipient's mail server (Gmail API bounce notification)
- **Opened:** Recipient opened email (tracking pixel or read receipt)
- **Clicked:** Recipient clicked link in email (link wrapper or tracking service)
- **Replied:** Recipient sent reply (Gmail API webhook)
- **Bounced:** Email bounced (hard or soft bounce via Gmail API)

*In-App Display:*
- Email list shows status icons: âœ“ (sent), ðŸ‘ï¸ (opened), ðŸ”— (clicked), ðŸ’¬ (replied), âœ— (bounced)
- Hovering shows timestamp: "Opened on Jan 15 at 2:47 PM"
- Click on email to see detailed timeline of interactions
- Contact detail shows "Last interaction: Opened your email on Jan 15"

*Email Provider Integration:*
- MVP uses **Gmail API** (OAuth flow) as primary integration
- User authorizes app to access their Gmail account
- System reads sent emails and uses webhooks for updates
- No access to inbox (only sent items and delivery status)

---

**Feature: Handle Bounces and Unsubscribes**

*Bounce Handling:*

Hard Bounce (permanent, e.g., invalid email):
- Contact marked as "Bounce: Invalid"
- No further emails sent to this contact
- Activity log shows: "Hard bounce: Invalid email"
- Cannot re-send without manual override (user confirms: "Override bounce and send anyway?")

Soft Bounce (temporary, e.g., mailbox full):
- System auto-retries up to 2 more times
- If persists after 3 attempts, mark as hard bounce
- Activity log shows: "Soft bounce (retry 1/3)"

*Unsubscribe Handling:*
- If recipient clicks unsubscribe link in email, contact marked "Unsubscribed"
- No further emails sent to unsubscribed contacts
- Cannot override (cannot re-enable unsubscribed contacts)
- System complies with CAN-SPAM regulations

*Dashboard Display:*
- Show daily digest: "3 hard bounces today, 1 unsubscribe"
- Settings page shows suppression lists: Bounced (147 contacts), Unsubscribed (5 contacts)
- Can review bounced contacts and fix issues (e.g., correct typo in email)

---

#### 5.2.4 Application Tracking

**Feature: Create Application Record**

*Flow:*
1. From contact detail or company detail, click "Create Application"
2. Or in Pipeline board, click "+" in "Applied" column
3. Form fields:
   - Contact (auto-filled if coming from contact detail)
   - Company (auto-filled if coming from company detail)
   - Position Title: "Software Engineer Intern"
   - Application Date: defaults to today, can change
   - Current Stage: defaults to "Applied"
   - Notes (optional)
4. Click Save
5. Application appears in Pipeline board under "Applied" column
6. Show confirmation: "Application created for John Doe at Google"

---

**Feature: Pipeline Management (Kanban Board)**

*Layout:*
- 5 columns: Applied, Screening, Interview, Offer, Rejected
- Each column shows list of application cards
- Count badge on each column: "(12)"
- Cards are draggable

*Card Display (each application):*
- Company name (bold)
- Position title
- Contact name
- Days in current stage (e.g., "3 days in Screening")
- Last activity (e.g., "Email opened 2 days ago")
- Color coding: Green (active), Yellow (pending), Red (needs attention)

*Drag and Drop:*
- Drag card from one column to another
- On drop, system shows confirmation: "Move John's Google interview to Interview stage?"
- On confirmation, status updated, timestamp recorded
- Activity log: "Moved Google SWE from Screening to Interview"

*Filtering:*
- Filter by: Date range, Company, Status, Last contact (stale contacts), Outcome (successful/rejected)
- Show filtered count: "(8 of 47 applications)"

*Alternate Views:*
- List view: Table with columns Company, Position, Status, Days in Stage, Last Contact
- Timeline view: Calendar showing applications with key dates (applied, interview, etc.)
- Analytics view: Funnel showing conversion at each stage

---

**Feature: Track Application Dates**

*Fields Tracked:*
- **Applied Date:** When application was submitted (required)
- **Last Contact Date:** When user last contacted the company (updated when email sent/call made)
- **Next Follow-up Date:** When user plans to next contact (manually set)
- **Interview Date:** Scheduled interview date (manually set if interview scheduled)

*Follow-up Reminders:*
- When setting next follow-up date, show option to "Set reminder"
- Reminder time: "1 day before", "same day", "1 hour before" (user can choose)
- Reminder appears as notification at scheduled time
- Notification shows: "Follow up with John at Google (Last contact 5 days ago)"
- Clicking notification opens application detail

*Activity Timeline:*
- Application detail shows timeline of all interactions (emails, calls, status changes)
- Example: "Jan 15 - Email sent (subject: Quick question...); Jan 16 - Email opened; Jan 18 - Email clicked; Jan 20 - Phone call (30 min)"

---

#### 5.2.5 Search and Filtering

**Feature: Global Search (Cmd+K)**

*Behavior:*
1. User presses Cmd+K anywhere in app
2. Search dialog appears, centered on screen
3. Focus auto-moves to search input box
4. User starts typing (e.g., "john")
5. As user types, results update in real-time (<100ms)
6. Results grouped by type: Contacts, Companies, Campaigns, Applications, Emails
7. Each result shows: name, subtext (e.g., email, company), and icon
8. User can press â†‘â†“ to navigate results, Enter to select
9. Or click result to open
10. Esc closes dialog

*Search Scope:*
- **Contacts:** Name, email, title, company
- **Companies:** Name, industry, location
- **Campaigns:** Name, subject lines of emails in campaign
- **Applications:** Company + position (e.g., "Google SWE")
- **Emails:** Subject line and date
- **Notes:** Any notes attached to contacts/applications

*Advanced Search Syntax (optional in MVP, future enhancement):*
- `company:Google` â†’ Filter to company named Google
- `title:Engineer` â†’ Filter to contacts with Engineer in title
- `status:Interview` â†’ Filter applications in Interview stage
- `days:7` â†’ Filter contacts not contacted in 7+ days

*Recent Searches:*
- Show last 5 searches above results (e.g., "john", "google", "follow-up")
- Click to re-run search

---

**Feature: Advanced Filtering (Left Sidebar)**

*Filter Categories:*

1. **Company:** Multi-select dropdown
   - Search to filter company list
   - Show selected count

2. **Title/Role:** Text search (real-time)
   - Matches partial title names
   - Case-insensitive

3. **Last Contact:** Date range selector
   - Presets: "Last 7 days", "7-14 days", "14-30 days", "30+ days"
   - Or custom date range picker

4. **Interaction Status:** Checkboxes
   - Opened (email opened)
   - Clicked (link clicked)
   - Replied (email replied)
   - Bounced (email bounced)
   - No interaction (never contacted)

5. **Application Status:** Checkboxes
   - Applied
   - Screening
   - Interview
   - Offer
   - Rejected

6. **Tags:** Multi-select
   - Show all tags with usage count
   - Search to filter tags

*Application:*
- Filters apply instantly to contact list
- Show count badge: "(47 contacts match filters)"
- Can combine multiple filters (AND logic)
- Clear all filters button

*Save Filter:*
- After applying filters, show "Save Filter" button
- User names filter (e.g., "Needs Follow-up")
- Filter saved and appears in "Saved Searches" list
- Can edit/delete saved filters

---

#### 5.2.6 Analytics and Reporting

**Feature: Daily Dashboard**

*Content:*

**Today's Section:**
- "Follow-ups due today (3)" â†’ Click to see list
- "Emails to review (2)" â†’ Replies received needing response
- "Applications to update (1)" â†’ Status change prompted
- Quick action buttons: "Compose Email", "Create Application", "Add Contact"

**Yesterday's Section:**
- "Emails sent: 12"
- "Emails opened: 3 (25%)"
- "Link clicks: 1"
- "Replies: 1"

**Upcoming Section (next 7 days):**
- "Scheduled emails: 8"
- "Follow-ups due: 5"
- "Interviews: 1" (calendar date)

**Metrics Section:**
- Reply rate trend (this week vs last week): 4.8% vs 4.2% (â†‘ green arrow)
- Application conversion: 3 of 42 applications in Interview stage (7%)
- Top performing campaign: "Google outreach" (12% open rate)

---

**Feature: Weekly Analytics Report**

*Metrics Displayed:*

| Metric | Value | Trend | Details |
|--------|-------|-------|---------|
| Emails Sent | 42 | vs 38 last week â†‘ | 4 more emails |
| Delivery Rate | 98.8% | vs 99.1% last week â†“ | 1 hard bounce |
| Open Rate | 7.2% | vs 6.1% last week â†‘ | 3 emails opened out of 42 sent |
| Click Rate | 1.9% | vs 1.5% last week â†‘ | 1 link click (campaign click-through) |
| Reply Rate | 4.8% | vs 3.2% last week â†‘ | 2 replies received |
| Applications Created | 5 | - | New applications from replies |
| Apps Moved to Next Stage | 2 | - | 1 â†’ Screening, 1 â†’ Interview |
| Success Metrics | 1 interview scheduled | - | Interview booked from cold email |

*Visualizations:*
- Line chart: Reply rate trend over 4 weeks
- Bar chart: Emails sent per day (shows which day most productive)
- Pie chart: Application status distribution (42 Applied, 8 Screening, 2 Interview, 0 Offer, 0 Rejected)

*Top Performers:*
- **Top Email Template:** "Quick question about X" (8% open rate)
- **Top Subject Line:** "Question about your hiring for Y" (10% open rate vs 7% average)
- **Top Company:** Google (5 emails, 2 replies = 40% reply rate)
- **Top Day/Time to Send:** Tuesday 9 AM (6.5% open rate)

*Filtering:*
- Date range selector: This week, Last week, Last month, Custom
- Filter by campaign
- Filter by company
- Export as PDF

---

### 5.3 Quality of Life Features

#### 5.3.1 Keyboard Shortcuts

**Global Shortcuts (work everywhere):**

| Shortcut | Action |
|----------|--------|
| Cmd+K | Global search |
| Cmd+N | New contact |
| Cmd+Shift+C | Compose email |
| Cmd+Shift+E | New campaign |
| Cmd+, | Settings |
| Cmd+1 | Go to Dashboard |
| Cmd+2 | Go to Contacts |
| Cmd+3 | Go to Companies |
| Cmd+4 | Go to Campaigns |
| Cmd+5 | Go to Pipeline |
| Cmd+6 | Go to Analytics |
| Cmd+Z | Undo last action |
| Cmd+Y | Redo last action |
| Cmd+I | Import data |
| Cmd+E | Export data |

**List View Shortcuts:**

| Shortcut | Action |
|----------|--------|
| â†‘ / â†“ | Navigate up/down in list |
| Enter | Open selected contact/application |
| Space | Select/deselect item |
| Cmd+A | Select all |
| Delete | Delete selected item(s) |
| R | Rename/edit selected |
| T | Add/edit tags on selected |
| C | Create campaign from selected contacts |

**Detail View Shortcuts:**

| Shortcut | Action |
|----------|--------|
| Escape | Close detail panel |
| Cmd+E | Edit current field |
| Cmd+K | Add tag |
| Cmd+N | Create new contact from this view |

*Implementation:*
- Shortcuts displayed in help menu (Cmd+/)
- Shortcuts displayed in button tooltips on hover
- Shortcuts configurable in Settings â†’ Keyboard Shortcuts

---

#### 5.3.2 UI Interactions and Animations

**Micro-interactions:**

1. **Button Hover State:**
   - Background color lightens 10%
   - Subtle shadow appears (1-2px blur)
   - Cursor changes to pointer
   - Duration: 150ms ease-standard

2. **Click Feedback:**
   - Button slightly scales down (98%)
   - Click feedback appears (brief ripple or highlight)
   - Duration: 100ms

3. **Loading States:**
   - Show spinner (rotating icon) while loading
   - Disable button and show "Loading..."
   - After load, disable state removed
   - Show success toast (green, "Success! Saved.")

4. **Error States:**
   - Show error toast (red, with error message)
   - Form field with error gets red border
   - Helper text appears below field: "Email is invalid format"
   - Clear error when user corrects input

5. **Empty States:**
   - Show friendly message: "No contacts yet. Add one to get started!"
   - Show illustration (simple SVG)
   - Show quick action button: "Add Contact"

6. **Drag and Drop:**
   - Dragged item becomes semi-transparent (70% opacity)
   - Drop target highlights with blue border and background
   - On drop, item slides into new position (300ms animation)
   - Show success toast: "Moved to Interview stage"

7. **Toast Notifications:**
   - Appear at bottom-right
   - Auto-dismiss after 4 seconds
   - User can click to dismiss earlier
   - Stack multiple toasts vertically
   - Color: Green (success), Red (error), Blue (info), Yellow (warning)
   - Duration: 300ms fade-in, 300ms fade-out

8. **Transitions Between Pages:**
   - Fade out current page (100ms)
   - Fade in new page (200ms)
   - No blank flashing

---

#### 5.3.3 Smart Features

**Auto-complete:**
- When selecting company, dropdown searches and filters in real-time
- Shows recent companies first
- If no match, show "Create new company: [input]"

**Smart Suggestions:**
- When composing email to contact at Google, suggest previously used templates for Google contacts
- When setting follow-up date for unresponded email, suggest "3 days" as best-practice follow-up window

**Recent Items:**
- Dashboard shows 5 recent contacts
- Dashboard shows 5 recent companies
- Campaign creation shows recently used templates

**Smart Defaults:**
- New contact form remembers last-used company, pre-fills it
- Campaign creation defaults to last-used template
- Follow-up email defaults to 3-day delay (industry standard)

---

## 6. Non-Functional Requirements

### 6.1 Performance Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **App Launch Time** | <2 seconds | User expectations for desktop apps |
| **Contact List Load** | <1 second for 500 contacts | Smooth scrolling through database |
| **Search Response** | <500ms for results | Real-time search feedback |
| **Campaign Create** | <5 minutes end-to-end | Reasonable for data entry + review |
| **Campaign Send** | 1000 emails/min | Rate-limited to avoid email provider limits |
| **UI Responsiveness** | <100ms for user input | Responsive feel; no lag on typing |
| **Animation Smoothness** | 60 FPS | Smooth transitions and interactions |
| **Database Query** | <100ms for complex filters | Filtering/searching feels instant |
| **Max Database Size** | 50,000 contacts | Anticipated user limit; can scale if needed |

---

### 6.2 Platform Requirements

**Operating System:**
- macOS 11.0 (Big Sur) or later
- Tested on: M1/M2 Macs and Intel Macs
- 64-bit only

**Hardware Minimum:**
- 2GB RAM (recommended 4GB+)
- 500MB disk space for app + database

**Dependencies:**
- No external services required for core functionality
- Internet required only for:
  - Email sending (SMTP connection to Gmail/Outlook)
  - Email tracking (webhooks from Gmail API)
  - Browser extension (requires Safari/Chrome installed)

---

### 6.3 Data Requirements

**Data Storage:**
- Single-user, local installation
- All data stored in local SQLite database
- Database file location: `~/Library/Application Support/OutreachOS/database.db`
- No cloud sync (MVP)
- No encryption (future consideration)

**Data Persistence:**
- Auto-save on every change (2-second debounce)
- No manual save button needed
- All data persists across app restarts

**Backup Strategy:**
- User can export all data as CSV/JSON via Settings â†’ Export
- No automatic cloud backup in MVP
- Future: Optional iCloud sync

**Data Privacy:**
- All data stays on user's machine
- Email credentials stored securely using macOS Keychain
- No external data transmission except for email sending via SMTP

---

### 6.4 Reliability Requirements

**Crash Recovery:**
- If app crashes, all unsaved changes lost (due to auto-save, minimal loss)
- Database file corruption prevention: Use SQLite transactions, no data corruption expected
- On app restart, show "App crashed. Report to developer?" (optional crash reporting)

**Data Integrity:**
- All database operations use transactions (ACID compliance)
- Foreign key constraints enforced (can't delete company with linked contacts)
- No duplicate emails allowed in database
- Application status transitions validated (can't skip stages)

**Auto-save:**
- Every field change auto-saves with 2-second debounce
- User sees "Saving..." briefly, then "Saved" checkmark
- If save fails (disk error), show error toast: "Failed to save. Try again?"

---

### 6.5 Usability Requirements

**UI Aesthetic:**
- Modern, clean design inspired by Attio (progressive disclosure, beautiful typography)
- Dark mode default, light mode option
- Consistent spacing and alignment
- Use design system colors (see Technical Considerations section)

**Typography:**
- Primary font: System font (San Francisco on macOS)
- Headings: 18-24px, semi-bold (600 weight)
- Body text: 14px, regular (400 weight)
- Monospace: For email addresses, code blocks, etc.

**Accessibility:**
- Keyboard navigation support (Tab to move between fields)
- Visible focus indicators (blue outline on focused elements)
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Screen reader support (alt text on icons, semantic HTML)
- Readable fonts (minimum 12px)

**Onboarding:**
- First launch shows 3-step walkthrough:
  1. "Add your first contact"
  2. "Create your first campaign"
  3. "Watch for replies in Dashboard"
- Each step shows example and has "Skip" or "Next" button
- User can replay walkthrough in Settings â†’ Help

---

### 6.6 Security Requirements

**Email Credentials:**
- OAuth 2.0 flow for Gmail/Outlook (user authorizes, never enters password in app)
- Tokens stored securely in macOS Keychain
- Tokens refreshed automatically
- User can revoke access anytime in Settings

**No External Data Transmission:**
- Analytics/crash reports optional (user opt-in)
- No tracking of user behavior
- No telemetry sent to servers

**Local Storage Security:**
- SQLite database is plaintext (future: add encryption)
- No sensitive data in plaintext in app (email credentials in Keychain, not database)

---

## 7. Technical Considerations

### 7.1 Application Architecture Decision Factors

**Desktop Application vs Web Application:**

**Desktop Application Chosen:**
- âœ“ Better offline support (cold email prep doesn't need internet)
- âœ“ Native macOS feel (menu bar, keyboard shortcuts, native window management)
- âœ“ Direct file system access (easy database management, backups)
- âœ“ Email integration (can access email client)
- âœ“ System notifications (reminders for follow-ups)

**Native vs Electron vs Tauri:**

Based on research comparing technologies:

| Factor | Native (Swift) | Electron | Tauri |
|--------|---|---|---|
| Dev speed | Slow (need to learn Swift) | Fast (JavaScript) | Fast (JavaScript + Rust) |
| Bundle size | ~5MB | 150MB | 5-10MB |
| Memory usage | ~30MB | 200MB | 30-50MB |
| Native feel | Excellent | Good | Good |
| Maintainability | Good (one language) | Good (JavaScript) | Good (Rust backend) |
| Cross-platform | macOS only | All platforms | All platforms |
| Learning curve | High | Low | Medium (some Rust) |

**Recommendation: Tauri 2.x**

*Rationale:*
- Best performance (memory-efficient, small bundle)
- Native feel on macOS (uses WebKit)
- JavaScript frontend (rapid development)
- Good Rust backend for complex logic
- Can leverage Next.js/SvelteKit for frontend
- Better for future mobile expansion than Electron

*Alternative: Electron*
- If team has no Rust experience, Electron is safer choice
- Larger bundle and memory, but mature ecosystem

---

### 7.2 Database Decision Factors

**SQLite Chosen**

*Rationale:*
- Single-user, local-only â†’ no need for client-server
- No concurrent access issues (single Mac user)
- ACID compliance âœ“
- Zero setup (embedded in app)
- File-based (easy backups)
- Built-in support in Node.js (better-sqlite3 package)
- Supports up to ~50,000 contacts before performance issues

*Schema:*
- Relational database with foreign keys
- Normalized schema (no data duplication)
- Full-text search support (SQLite FTS5 extension) for searching email content

*Alternatives Considered:*
- **PostgreSQL:** Overkill for single user, requires server setup
- **MongoDB:** Not suited to relational data (contacts, companies, applications)
- **File-based (JSON):** No query capability, slow for large datasets

---

### 7.3 Email Integration Decision Factors

**Email Sending:** 
- Use **SMTP** protocol directly (Gmail/Outlook SMTP servers)
- User authenticates via OAuth, tokens stored in Keychain
- App sends emails directly via SMTP

**Email Tracking:**
- **Opens:** Use Gmail API webhooks to detect "opened" status
- **Clicks:** Use link wrapper (redirect links through tracking server) OR rely on click-through headers
- **Replies:** Monitor Gmail inbox via API, detect replies to outbound emails

**Alternative:** Use third-party service (Mailgun, SendGrid)
- Pros: Built-in tracking, better deliverability
- Cons: Costs money, adds external dependency
- MVP: Direct Gmail API + SMTP

---

### 7.4 UI Framework Decision Factors

**Frontend Framework:** React or SvelteKit

**React Chosen**
- Larger ecosystem (more libraries)
- Faster hiring (more developers know React)
- Mature tooling
- Tauri has excellent React examples

**UI Component Libraries:** Chakra UI or shadcn/ui or custom

**Shadcn/ui Recommended** (for Tauri)
- Built on Radix UI (headless, accessible)
- Uses Tailwind CSS (easy theming, dark mode)
- Highly customizable
- Aligns with design system
- Tree-shaking reduces bundle size

**Alternative:** Chakra UI
- More pre-styled components
- Excellent accessibility
- Slightly larger bundle

**Drag and Drop:** react-beautiful-dnd or dnd-kit
- Use **dnd-kit** (modern, lightweight, Tauri-friendly)
- react-beautiful-dnd is more mature but heavier

**Form Handling:** react-hook-form + zod
- react-hook-form: Lightweight, performance-optimized
- zod: Schema validation

**State Management:** Zustand or Redux

- Use **Zustand** (lightweight, less boilerplate)
- For complex app: Redux Toolkit (if needed in future)

**Rich Text Editor:** For email composition
- Use **TipTap** (Vue/React headless editor)
- Or **Slate** (highly customizable)
- Or **Lexical** (Meta's modern editor)

**Date/Time:** Day.js or date-fns
- Use **Day.js** (smaller than Moment.js)

---

### 7.5 Development Workflow Factors

**Build Tool:** Vite
- Fast hot reload
- Excellent TypeScript support
- Smaller bundle than webpack

**Package Manager:** npm or pnpm
- Use **pnpm** (faster, better disk efficiency)

**Version Control:** Git + GitHub
- Commit early and often
- Use semantic commits

**Testing:** Vitest + React Testing Library
- Vitest: Fast unit testing (Vite native)
- React Testing Library: Component testing
- E2E tests: Tauri provides built-in testing

**CI/CD:** GitHub Actions
- Auto-build and sign macOS app
- Run tests on each commit

**Code Quality:**
- ESLint: Linting
- Prettier: Code formatting
- TypeScript: Type safety

---

## 8. UI/UX Specifications

### 8.1 Layout and Navigation

**Main Application Structure:**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â˜°  OutreachOS          ðŸ” ðŸŽ›ï¸  âš™ï¸  ðŸ‘¤  -  â–¡  âœ•  â”‚  â† Top Menu Bar
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                             â”‚
â”‚  Sidebar (180px)    â”‚  Main Content Area   â”‚  â† Detail Panel (320px)
â”‚  - Dashboard        â”‚  (responsive)         â”‚    (when selected)
â”‚  - Contacts         â”‚                       â”‚
â”‚  - Companies        â”‚                       â”‚
â”‚  - Campaigns        â”‚                       â”‚
â”‚  - Pipeline         â”‚                       â”‚
â”‚  - Analytics        â”‚                       â”‚
â”‚  - Settings         â”‚                       â”‚
â”‚                     â”‚                       â”‚
â”‚  (Cmd+1-6 for nav)  â”‚                       â”‚
â”‚                     â”‚                       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Sidebar Navigation:**
- Fixed left sidebar (180px width, collapsible)
- Top section: Main navigation items (Dashboard, Contacts, Companies, Campaigns, Pipeline, Analytics)
- Bottom section: Settings, Help, About
- Icon + label for each item (icons 20px, text 13px)
- Active item highlighted in primary color
- Keyboard shortcuts shown on hover (e.g., "Cmd+1")

**Top Menu Bar:**
- Logo/app name (left)
- Search bar (center, Cmd+K)
- Settings/user menu (right, âš™ï¸ icon)
- Minimize/maximize/close buttons (macOS standard)

**Breadcrumbs:**
- Show current location: Dashboard > Contacts > [John Doe]
- Click to navigate back

---

### 8.2 Visual Design Principles

**Design Inspiration:** Attio (modern, progressive disclosure, beautiful typography)

**Color Scheme:**
- **Primary:** Teal #208594 (for buttons, links, active states)
- **Background:** Light mode: #F8F8F6; Dark mode: #1F2121
- **Surface:** Light mode: #FFFFFF; Dark mode: #262828
- **Text:** Light mode: #1F2121; Dark mode: #F5F5F5
- **Accent colors:** Green #22C55E (success), Red #C01521 (error), Blue #3B82F6 (info)

**Typography:**
- Headings: San Francisco Semibold
- Body: San Francisco Regular
- Code/Email: Monaco or SF Mono

**Spacing:**
- Base unit: 8px (use multiples: 8, 16, 24, 32, 48px)
- Component padding: 16px (buttons, cards)
- Vertical rhythm: 8px between elements

**Border Radius:**
- Buttons: 6px
- Cards: 8px
- Modal: 10px
- Full circle: 9999px (for avatars)

**Shadows:**
- Subtle: 0 1px 3px rgba(0,0,0,0.1)
- Medium: 0 4px 6px rgba(0,0,0,0.1)
- Large: 0 10px 20px rgba(0,0,0,0.15)

---

### 8.3 Screen-by-Screen Specifications

#### 8.3.1 Dashboard / Home Screen

**Purpose:** Give user overview of activities and quick access to common actions

**Layout:**
- Top: Search bar (Cmd+K)
- Left column (60% width):
  - "Today" section (3 cards: follow-ups due, emails to review, apps to update)
  - "Recent Activities" (timeline of last 10 interactions)
  - "Upcoming" (next 7 days scheduled emails)
- Right column (40% width):
  - "Key Metrics" (reply rate, open rate, conversion rate with trend arrows)
  - "Quick Stats" (emails sent this week, applications created this week)
  - "Top Performers" (best template, best company, best time to send)

**Default View on App Launch:**
- Dashboard always loads on startup
- Or restore last viewed screen if user prefers

**Quick Actions:**
- Floating action button with "+" icon (bottom-right)
- Click expands to: Add Contact, Compose Email, Create Campaign, Create Application

---

#### 8.3.2 Contacts Screen

**List View (Default):**
- Table with columns: Name, Email, Title, Company, Last Contact, Tags
- Sortable by any column (click header)
- Row height: 48px (comfortable to read)
- Hover state: Slight background highlight
- Click row to open detail panel (right sidebar)

**Detail Panel (Right Sidebar):**
- Contact avatar (if available) or initials in circle
- Name (editable inline)
- Email, phone, title, company (all editable inline)
- LinkedIn URL (clickable link)
- Notes section (rich text editor)
- Activity section (timeline of all interactions with contact)
- Actions: Create campaign, Create application, Send email, Add to list, Merge, Delete

**Card View (Toggle):**
- Each contact shown as card (3 columns per row)
- Card shows: Avatar, name, email, title, company, tags
- Hover: Show action buttons (Email, Campaign, Application)

**Filters (Left Panel):**
- Company filter (multi-select)
- Title filter (text search)
- Last contact (date range)
- Interaction status (checkboxes)
- Tags (multi-select)
- Save filter button

---

#### 8.3.3 Companies Screen

**Similar layout to Contacts:**
- List view table: Name, Industry, Size, Location, Contact Count, Application Count
- Click company to open detail panel
- Detail panel shows all contacts at company, all applications to company
- Quick actions: Create campaign targeting all at company

---

#### 8.3.4 Campaigns Screen

**Campaign List:**
- Table with columns: Name, Type, Status, Recipients, Sent/Total, Open Rate, Reply Rate, Created Date
- Status shown with badge: Draft (gray), Scheduled (blue), Active (green), Paused (yellow), Completed (neutral)
- Click campaign to open detail/editor

**Campaign Detail View:**
- Campaign name and status (edit name)
- Email sequence timeline visualization:
  ```
  [Step 1: Subject]  â†’  [Step 2: Subject (if no reply)]  â†’  [Step 3: Subject]
  Jan 15, 9 AM        Jan 18, 9 AM (pending)              Jan 23, 9 AM (pending)
  ```
- Recipients section: Show contact count, can add/remove contacts
- Performance metrics: Emails sent, opened, replied, bounced (live updated)
- Actions: Pause/Resume, Edit, Archive, Delete

**Campaign Creation Wizard (4 screens):**
- Screen 1: Name + select recipients
- Screen 2: Build email sequence
- Screen 3: Set schedule
- Screen 4: Review and confirm

---

#### 8.3.5 Pipeline / Application Tracking

**Kanban Board View (Default):**
- 5 columns: Applied, Screening, Interview, Offer, Rejected
- Count badge: "(12)"
- Each card shows: Company name, Position, Contact name, Days in stage
- Hover: Show last activity, action buttons
- Drag to move between stages
- Click card to open application detail

**Application Detail Panel:**
- Application info: Company, position, contact, current stage
- Key dates: Applied date, last contact, next follow-up, interview date
- Status history: Timeline showing when moved between stages
- Notes section (rich text)
- Activity timeline: All interactions (emails, calls, etc.)
- Actions: Change status, Edit details, Create reminder, Delete

**Alternative Views:**
- List view: Table with columns Company, Position, Status, Days in Stage, Last Contact
- Timeline view: Calendar showing applications with key event dates
- Funnel analytics: Shows conversion rates at each stage

---

#### 8.3.6 Analytics / Reports

**Weekly Analytics Screen:**
- Select date range (This week, Last week, Last month, Custom)
- Key metrics displayed in cards:
  - Emails sent (with trend vs previous period)
  - Delivery rate (%)
  - Open rate (%)
  - Click rate (%)
  - Reply rate (%)
  - Applications created
  - Apps moved to next stage
  
- Charts:
  - Line chart: Reply rate trend over selected period
  - Bar chart: Emails sent per day
  - Pie chart: Application status distribution
  
- Top performers:
  - Top email template (subject, open rate)
  - Top company (by reply rate)
  - Best day/time to send (by open rate)
  
- Export button: Export report as PDF

---

#### 8.3.7 Settings Screen

**Tabs:**
- Account
- Email Integration
- Notifications & Reminders
- Automation Rules
- Data Import/Export
- Appearance
- Keyboard Shortcuts
- Help & About

**Email Integration Tab:**
- Show connected email accounts (Gmail, Outlook, etc.)
- Connect account button (OAuth flow)
- Disconnect button for each account
- Tracking settings: Enable/disable open tracking, click tracking
- Send settings: Default send time, default time zone

**Notifications Tab:**
- Toggle: Enable push notifications
- Reminder time (e.g., "9 AM")
- Notification sound (toggle)
- Notification preview

**Data Import/Export Tab:**
- Import CSV button (file picker)
- Export All Data button (creates CSV)
- Export as JSON option
- Create backup button

**Appearance Tab:**
- Theme toggle: Light, Dark, System default
- Font size: Small, Medium, Large
- Density: Compact, Comfortable, Spacious

---

### 8.4 Component Specifications

**Contact Card (Reusable):**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  JD  â”‚ John Doe              â”‚
â”‚      â”‚ john@google.com       â”‚
â”‚      â”‚ Software Engineer     â”‚
â”‚      â”‚ Google â€¢ 3 days ago   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Avatar (initials or photo) 40x40px
- Name (bold, 14px)
- Email (gray, 13px)
- Title (gray, 13px)
- Company + last interaction (gray, 12px)
- Hover: Show action buttons (Email, Campaign, Merge, Delete)

**Company Card (Reusable):**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Google                   â”‚
â”‚ SaaS â€¢ San Francisco     â”‚
â”‚ 12 contacts â€¢ 3 apps     â”‚
â”‚ 40% reply rate           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Company name (bold, 14px)
- Industry, size, location (gray, 13px)
- Stats (gray, 13px)
- Click to open company detail

**Email Template Card:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Cold outreach - Initial       â”‚
â”‚ Subject: Question about {{companyName}}  â”‚
â”‚ Preview: Hey {{firstName}}, quick question... â”‚
â”‚ Used in 3 campaigns           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Template name (bold)
- Subject line (showing variables)
- Body preview (first 50 chars)
- Usage count
- Click to edit

**Application Card (for Pipeline Kanban):**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Google                   â”‚
â”‚ Software Engineer        â”‚
â”‚ John Doe                 â”‚
â”‚ 5 days in Screening      â”‚
â”‚ Email opened 2 days ago  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Company name (bold)
- Position
- Contact name
- Days in current stage
- Last activity (gray, 12px)

---

## 9. Data Flow and Integration

### 9.1 Email Integration Flow

**Connecting Gmail Account:**

1. User goes to Settings â†’ Email Integration
2. Click "Connect Gmail Account"
3. Browser opens OAuth login (Gmail consent screen)
4. User logs in with Google account
5. User grants app permission to: Send emails, Read sent emails, Monitor delivery
6. Browser closes, app receives auth token
7. Token stored in macOS Keychain (secure storage)
8. Token refreshed automatically by app before expiration
9. Show "Gmail account connected: john@gmail.com"

**Sending Email:**

1. User composes email (To, Subject, Body)
2. Click "Send Now" or "Schedule for [time]"
3. If sending now:
   - App validates email (format, not bounced)
   - Constructs email with headers for tracking
   - Connects to Gmail SMTP server using stored token
   - Sends email
   - Records interaction in database (status: "Sent", timestamp)
   - Show success: "Email sent to John"
4. If scheduled:
   - Email queued in database (status: "Scheduled", send_time: Jan 16 9 AM)
   - Background job runs every minute, checks for emails to send
   - When send_time reached, sends email (same flow as above)

**Tracking Opens and Clicks:**

1. When email sent, system adds tracking pixel to HTML email
   - Tracking pixel: `<img src="https://tracking-service.com/track/[email-id]" />`
   - When recipient opens email, pixel loads, triggering webhook
2. App receives webhook: `{email_id: "...", timestamp: "2026-01-15T14:30:00Z", event: "open"}`
3. Records interaction in database (status: "Opened", opened_at: timestamp)
4. Contact detail updated to show "Last interaction: Opened email"
5. For clicks: If using link wrapper, all links in email point to `https://tracking.com/click/[link-id]/[original-url]`
   - User clicks, tracking service records click and redirects to original URL
   - App receives webhook with click event
   - Records interaction

**Handling Bounces:**

1. If email fails to send (invalid address), Gmail SMTP returns bounce error immediately
2. App catches error, records interaction (status: "Bounced", bounce_type: "Hard")
3. Contact marked as "Bounce: Invalid"
4. System stops sending to this contact
5. User notified in dashboard: "3 hard bounces today"
6. User can review bounced contacts, correct email, and re-enable

**Handling Replies:**

1. User receives reply from prospect
2. Gmail API webhook notifies app: "New email from john@google.com with subject 'Re: Question about...'"
3. App records interaction (status: "Replied", received_at: timestamp)
4. Contact detail updated to show "Last interaction: Replied to your email on Jan 15"
5. Application status auto-updated to "Screening" (optional automation rule)
6. Dashboard shows: "1 reply received"
7. App does NOT read reply content (privacy) - only tracks that reply was received

---

### 9.2 Email Campaign Execution Flow

**Campaign Created and Scheduled:**

1. User creates campaign targeting 50 contacts
2. Campaign scheduled to start Jan 15 at 9 AM
3. Campaign stored in database (status: "Scheduled")

**Campaign Starts:**

1. Background job runs every minute, checks for campaigns to start
2. Finds campaign with start_date = Jan 15 at 9 AM
3. Updates campaign status to "Active"
4. For each contact, calculates send time for Email Step 1
5. Creates pending email record for each contact (status: "Queued")

**Email Step 1 Sends:**

1. Background job detects Email Step 1 ready to send (send_time <= now)
2. Validates contact email (not bounced, not unsubscribed)
3. Constructs email from template, substituting variables
4. Sends email via Gmail SMTP
5. Records interaction (status: "Sent")
6. Updates email record (status: "Sent", sent_at: timestamp)
7. Calculates send_time for Email Step 2 (now + delayDays)
8. Creates pending email record for Email Step 2

**Email Step 2 Logic:**

1. When Email Step 2 send_time reached, system evaluates condition
2. If condition is "send_if: no_reply":
   - Check if contact replied to Email Step 1
   - If replied: Skip Email Step 2 (mark as "Skipped")
   - If not replied: Send Email Step 2
3. If no condition: Send regardless

**Campaign Completion:**

1. After Email Step 3 sent, campaign status changes to "Completed"
2. All metrics finalized (total sent, opened, replied, bounced)
3. User sees in analytics: Final performance of campaign

---

### 9.3 Browser Extension Flow

**User on LinkedIn Profile:**

1. User browsing LinkedIn, finds prospect profile
2. Click extension icon in browser toolbar
3. Extension popup appears showing:
   - Profile photo
   - Name, current title, company
   - LinkedIn URL
   - "Add to OutreachOS" button
4. User can edit/confirm data:
   - Edit name if wrong
   - Add additional info (notes, etc.)
5. Click "Add to OutreachOS"
6. Extension sends message to native app via IPC
7. OutreachOS app receives message, creates contact in database
8. Extension shows: "Added to OutreachOS âœ“"

**Technical Details:**
- Extension built for Safari + Chrome
- Uses content scripts to extract profile data from LinkedIn DOM
- Sends data to native app via OS-level IPC or local HTTP server (localhost:3000)
- Requires user to launch OutreachOS before using extension

---

### 9.4 Import Flow

**CSV Import:**

1. User goes to Settings â†’ Import/Export â†’ "Import Contacts"
2. File picker opens
3. User selects CSV file (e.g., exported from LinkedIn)
4. System reads file, detects headers in first row
5. If headers not standard, shows dialog:
   ```
   Which column is First Name? [Dropdown: First Name, name, fname, ...]
   Which column is Email? [Dropdown: Email, email_address, ...]
   ...
   ```
6. User confirms column mapping
7. System parses CSV, validates all emails
8. Shows preview: "87 contacts found, 3 invalid emails"
   - Lists invalid emails with reason (invalid format, already in database, etc.)
   - User can fix or skip invalid rows
9. Shows duplicate detection: "5 duplicates found (same email)"
   - Options: Skip, Merge, Overwrite
   - Default: Skip (preserve existing contact)
10. User confirms import
11. System inserts records with proper transactions
12. Shows result: "Successfully imported 87 contacts"

---

## 10. Edge Cases and Error Handling

### 10.1 Invalid Inputs

**Invalid Email Address:**
- Format check: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Error message: "Please enter a valid email address"
- Prevention: Validate on blur, show error before save

**Duplicate Email:**
- Check: SELECT * FROM contacts WHERE email = ?
- Error message: "Email already in database. Try merging contacts?"
- Allow override: "This email is for [John Doe]. Override?"

**Special Characters in Names:**
- Support: Names with accents (JosÃ©), non-Latin scripts (æŽæ˜Ž), symbols (John O'Brien)
- Store as UTF-8
- Display correctly in UI

**Extremely Long Email Body:**
- Max: 50,000 characters
- Warning if >40,000: "Email body is very long (98% of limit)"
- Prevent send if >50,000

**Invalid LinkedIn URL:**
- Format check: Must start with https://linkedin.com/
- Error: "Invalid LinkedIn URL. Should be https://linkedin.com/in/..."

---

### 10.2 Network Failures

**Email Send Fails (Gmail SMTP Error):**
- Gmail temporarily down or connection lost
- Error message: "Failed to send email. Check internet connection and try again."
- Email marked as "Failed"
- User can retry manually or schedule for later
- System does NOT auto-retry in MVP

**Email Tracking Webhook Never Arrives:**
- If webhook doesn't arrive, email stays as "Sent" (not "Opened")
- User manually logs interaction if needed
- After 30 days, assume email won't be tracked
- Show: "Email sent (tracking not available)" instead of error

---

### 10.3 Data Corruption / Database Issues

**SQLite Corruption:**
- Unlikely with single-user app
- If detected (on app launch), show error: "Database corrupted. Restore from backup?"
- Option to export current database and auto-recover from known-good backup (if user has one)

**Lost Data Due to Crash:**
- Auto-save every 2 seconds minimizes loss
- Crash during save: Data from last save is valid
- Worst case: Lost unsaved changes from last 2 seconds
- Show recovery dialog: "App crashed. Recover unsaved changes?" (if detected)

---

### 10.4 Large Datasets

**500+ Contacts:**
- List view still loads quickly (<1 second) with pagination
- Implement virtual scrolling (show only visible rows)
- Search still responsive

**Many Campaigns (100+):**
- Filter/search to narrow down
- Archive old campaigns to keep active list clean

**Email Tracking for 1000+ Sent Emails:**
- Webhook processing may lag (process 100 webhooks/second)
- Queue webhooks if they arrive too fast
- No impact on user experience

---

### 10.5 Special Campaign Scenarios

**Contact Deleted Mid-Campaign:**
- Campaign still running
- When trying to send to deleted contact, system detects and skips
- Activity log shows: "Skipped: Contact deleted"

**Email Replyable After Campaign Ends:**
- Campaign completed 2 weeks ago
- Prospect replies today
- System detects reply via Gmail API
- Still records interaction and links to original contact/application

**Contact Bounces During Campaign:**
- Step 1 sent and opened
- Step 2 tries to send but hard bounces
- Stop sending remaining steps to this contact
- Mark application as "Blocked: Hard bounce"

---

### 10.6 Unsubscribe Handling

**User Clicks Unsubscribe:**
- Prospect clicks unsubscribe link in email footer
- Gmail notifies app of unsubscribe event
- Contact marked as "Unsubscribed"
- All future campaigns skip this contact
- Cannot override unsubscribe (compliant with CAN-SPAM)

**User Manually Marks Contact as Unsubscribed:**
- Right-click contact â†’ "Mark as unsubscribed"
- Confirmation: "Mark as unsubscribed? This cannot be reversed."
- Contact marked, no more emails sent

---

### 10.7 Empty States

**No Contacts:**
- Dashboard shows: "No contacts yet. Add one to get started!"
- Button: "Add Contact" (opens form)
- Illustration: Simple SVG showing empty state

**No Campaigns:**
- Campaigns page shows: "No campaigns. Create one to start outreach!"
- Button: "Create Campaign"

**No Applications:**
- Pipeline page shows: "No applications yet. Create one from a contact!"
- Button: "Create Application"

**Search Results Empty:**
- Show: "No results for 'xyz'. Try different search?"
- Suggest: "Did you mean 'abc'?"

---

### 10.8 Extreme Timezones

**Timezone Handling:**
- System respects user's macOS system timezone
- When user schedules email for "9 AM", means 9 AM in system timezone
- If sending to contact in different timezone, note: "Contact in different timezone (9 AM PT = 12 PM ET)"
- No automatic timezone conversion (user responsible)

---

## 11. Future Extensibility

### 11.1 Potential Future Features (Not in MVP)

1. **AI-Powered Personalization:**
   - AI writes personalized email body based on company/contact info
   - Requires: LLM API (Claude, GPT-4)

2. **Multi-User / Team Collaboration:**
   - Share campaigns with teammates
   - View shared campaigns and metrics
   - Requires: Backend server, authentication

3. **Mobile App:**
   - Review metrics on phone
   - Quick email responses on mobile
   - Tauri supports iOS/Android (future)

4. **Email Inbox Integration:**
   - See inbox in app
   - Reply to emails in app
   - Requires: Full Gmail API integration (not just sending)

5. **LinkedIn Automation:**
   - Auto-add contacts from LinkedIn search
   - Auto-connect with prospects
   - Requires: LinkedIn API (rate-limited)

6. **Integration with Calendar:**
   - Auto-sync interview dates to calendar
   - Create reminders in Calendar app
   - Requires: Calendar API (macOS)

7. **Advanced Automation Rules:**
   - If [condition], then [action] with complex logic
   - Requires: Rules engine

8. **Data Sync to Cloud:**
   - Optional iCloud backup
   - Sync across multiple Macs
   - Requires: Cloud backend

---

### 11.2 API Design Considerations

**Extensibility Through Database:**
- Well-normalized schema allows future features
- Foreign keys enable complex queries
- Can add new entity types without major refactoring

**Plugin System (Future):**
- Allow third-party integrations (Zapier, IFTTT)
- Define webhook endpoints for external events
- Requires: REST API for local app (localhost:3000)

---

## 12. Success Metrics and Testing Criteria

### 12.1 User Satisfaction Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **NPS (Net Promoter Score)** | 50+ | User survey: "How likely to recommend?" |
| **Usability (SUS Score)** | 70+ | System Usability Scale questionnaire |
| **Feature Adoption** | 70% use keyboard shortcuts | Tracking keyboard shortcut usage |
| **Daily Active Users** | 100% (single user, but consistency) | User opens app daily |
| **Session Duration** | 15-30 min/day | Average time in app per day |

### 12.2 Performance Benchmarks

| Benchmark | Target | Test Method |
|-----------|--------|-------------|
| **App Launch** | <2 seconds | Measure time from click to UI ready |
| **Search Response** | <500ms | Type in search, measure to results shown |
| **Campaign Create** | <5 minutes | Time from "New Campaign" to "Send" |
| **Database Query (500 contacts)** | <100ms | Query 500 contacts with filters |
| **Campaign Send (1000 emails)** | <1 hour | Time to queue and begin sending 1000 emails |

### 12.3 Feature Completion Checklist

**MVP Feature Checklist:**

- [ ] **Contacts:** Add, edit, delete, import, search, filter
- [ ] **Companies:** Add, link to contacts
- [ ] **Email Templates:** Create, use in campaigns
- [ ] **Campaigns:** Create multi-step, schedule, pause/resume, send
- [ ] **Email Tracking:** Open, click, reply, bounce detection
- [ ] **Applications:** Create, move through pipeline, track dates
- [ ] **Search:** Global search (Cmd+K), advanced filters
- [ ] **Dashboard:** Daily overview, quick actions
- [ ] **Analytics:** Weekly report, top performers
- [ ] **Keyboard Shortcuts:** Cmd+K, Cmd+N, etc.
- [ ] **Email Integration:** Connect Gmail, send emails
- [ ] **Settings:** Email account, notifications, data export

**Future Features (Post-MVP):**

- [ ] Browser extension for LinkedIn
- [ ] Automation rules (trigger/action)
- [ ] Multi-user workspaces
- [ ] Mobile app
- [ ] Outlook integration
- [ ] AI-powered personalization

---

### 12.4 Test Scenarios

**Scenario 1: New User First Day**
1. User launches app (first time)
2. Onboarding walkthrough appears
3. User adds first contact (John Doe, john@google.com)
4. User creates first campaign (5 contacts, 2-step sequence)
5. Emails are scheduled to send tomorrow
6. **Expected:** Campaign appears in "Upcoming" list, scheduled dates visible

**Scenario 2: Email Tracking**
1. Campaign sends email to 10 contacts
2. Simulate 3 opens (webhook arrives)
3. Check dashboard: "3 emails opened"
4. Check contact detail: "Last interaction: Opened email"
5. **Expected:** Metrics update in real-time, activity logged

**Scenario 3: Large Import**
1. User imports CSV with 500 contacts
2. System detects 20 duplicates
3. User chooses "Skip duplicates"
4. Import completes in <10 seconds
5. **Expected:** 480 new contacts added, no duplicates, fast import

**Scenario 4: Campaign with Conditions**
1. Create 3-email campaign with condition on email 2: "send_if: no_reply"
2. Email 1 sent to 20 contacts
3. 5 contacts reply, 15 don't
4. Email 2 scheduled, system sends only to 15 (not to 5 who replied)
5. **Expected:** 15 receive email 2, 5 skip it, activity logs show correct behavior

**Scenario 5: Data Export**
1. User has 150 contacts, 5 campaigns, 20 applications
2. User exports all data as CSV
3. Open CSV in Excel
4. Verify: All contacts present, all fields populated, relationships intact
5. **Expected:** Complete, valid export of all data

---

## 13. Development Phases

### 13.1 Phase 1: MVP Foundation (Weeks 1-2)

**Goal:** Get core CRM functionality working with local data storage

**Features:**
- [ ] Contact management (add, edit, delete, list, search)
- [ ] Company management (add, link to contacts)
- [ ] Email template creation
- [ ] Local SQLite database
- [ ] Basic UI (dashboard, contacts list, company list)
- [ ] Import CSV
- [ ] Export CSV
- [ ] Basic keyboard shortcuts (Cmd+N, Cmd+K)

**Deliverables:**
- Working desktop app (Tauri + React)
- Can add/manage 100+ contacts
- Can create templates
- Can search and filter

**Not Included Yet:**
- Email sending
- Campaign automation
- Pipeline/applications
- Analytics

---

### 13.2 Phase 2: Email and Campaigns (Weeks 3-4)

**Goal:** Enable email sending and basic campaign creation

**Features:**
- [ ] Gmail OAuth integration
- [ ] Email sending via SMTP
- [ ] Single email compose and schedule
- [ ] Basic campaign creation (1-step and multi-step)
- [ ] Campaign scheduling
- [ ] Campaign pause/resume
- [ ] Basic email tracking (opens, clicks via Gmail API)
- [ ] Dashboard with today's activity
- [ ] Upcoming emails list

**Deliverables:**
- Can send emails directly from app
- Can create and schedule campaigns
- Campaigns send automatically on schedule
- Basic tracking of email opens

**Not Included Yet:**
- Complex campaign conditions
- Full email tracking (opens/clicks/replies)
- Bounce handling
- Applications/pipeline

---

### 13.3 Phase 3: Applications and Pipeline (Week 5)

**Goal:** Add application tracking and pipeline management

**Features:**
- [ ] Application creation
- [ ] Pipeline Kanban board
- [ ] Drag-to-move applications
- [ ] Application status tracking
- [ ] Date tracking (applied, last contact, next follow-up)
- [ ] Follow-up reminders
- [ ] Weekly analytics report
- [ ] Top performers analytics

**Deliverables:**
- Complete application lifecycle
- Visual pipeline of applications
- Reminders for follow-ups
- Weekly metrics report

---

### 13.4 Phase 4: Polish and Refinement (Week 6+)

**Goal:** Refine UX, add quality-of-life features, optimization

**Features:**
- [ ] Advanced email tracking (bounces, unsubscribes)
- [ ] Automation rules (trigger/action)
- [ ] Browser extension (LinkedIn profile capture)
- [ ] All keyboard shortcuts
- [ ] Advanced filtering
- [ ] Saved searches
- [ ] Rich animations and transitions
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Dark/light mode
- [ ] Settings page (all options)

**Deliverables:**
- Polished, professional app
- Comprehensive keyboard shortcuts
- Beautiful animations
- Robust error handling
- Ready for user testing/feedback

---

### 13.5 Timeline and Resource Allocation

**Estimated Total Time:** 6-8 weeks (full-time development)

**Breakdown by Component:**
- Frontend UI (React + Tauri): 40% (2.5-3 weeks)
- Database (SQLite schema, queries): 20% (1.5 weeks)
- Email integration (Gmail API, SMTP): 20% (1.5 weeks)
- Analytics and reporting: 10% (1 week)
- Polish and optimization: 10% (1 week)

---

## 14. Appendices

### 14.1 Glossary of Terms

| Term | Definition |
|------|-----------|
| **Application** | A record of user's job application to a company (e.g., "Applied to Google for SWE") |
| **Campaign** | A sequence of emails sent to a group of contacts automatically |
| **Cold Email** | Unsolicited email to prospect with whom you have no prior relationship |
| **Contact** | A person in your outreach database (e.g., hiring manager, recruiter) |
| **CRM** | Customer Relationship Management system; here: Personal outreach management system |
| **Hard Bounce** | Permanent email delivery failure (invalid email address) |
| **Hot Lead** | Contact or company with high likelihood of positive response |
| **IMAP** | Email protocol for receiving/reading emails |
| **Kanban** | Visual workflow board with columns representing stages |
| **OAuth** | Secure authorization protocol (what Gmail login uses) |
| **Pipeline** | Visual representation of applications at different stages |
| **Soft Bounce** | Temporary email delivery failure (mailbox full, server down) |
| **SMTP** | Email protocol for sending emails |
| **Template** | Reusable email format with variable placeholders |
| **Webhook** | Callback mechanism for real-time events (Gmail notifying app of email status) |

---

### 14.2 Email Template Examples

**Template 1: Cold Outreach - Initial Touch**

```
Subject: {{firstName}}, question about your hiring at {{companyName}}

Hi {{firstName}},

I'm Priya, a software engineer graduating in May. I've been impressed by 
{{companyName}}'s work in [specific recent news/product], especially 
[specific detail showing research].

I'd love to explore whether there might be a fit for my skills in your 
[specific team/role]. My background includes [key relevant skill], which 
I've applied to [specific project/achievement].

Would you have 15 minutes for a quick chat next week? I'm flexible on timing.

Best,
Priya
[Phone]
[LinkedIn URL]
```

**Template 2: Follow-up After No Reply (5 Days)**

```
Subject: One more time - {{firstName}} at {{companyName}}

Hi {{firstName}},

I know your inbox is probably crazy. Just wanted to follow up on my previous 
note about a potential fit for my [skill] background with your team.

Would be great to chat briefly. Totally understand if timing isn't right now!

Best,
Priya
```

**Template 3: Post-Interview Follow-up**

```
Subject: Great talking with you, {{firstName}}!

Hi {{firstName}},

Thanks again for taking the time to chat about the {{title}} role. I really 
enjoyed our conversation about [specific topic discussed], and I'm even more 
excited about the opportunity.

Looking forward to hearing from you.

Best,
Priya
```

---

### 14.3 Sample Data for Testing

**Sample Contacts:**

```csv
firstName,lastName,email,title,company,linkedinUrl
John,Smith,john@google.com,Hiring Manager,Google,https://linkedin.com/in/john-smith
Jane,Doe,jane@amazon.com,Tech Recruiter,Amazon,https://linkedin.com/in/jane-doe
Bob,Johnson,bob@meta.com,Engineering Manager,Meta,https://linkedin.com/in/bob-johnson
```

**Sample Companies:**

```csv
name,industry,size,location
Google,SaaS,1000+,San Francisco
Amazon,E-commerce,1000+,Seattle
Meta,SaaS,1000+,Menlo Park
Stripe,FinTech,201-1000,San Francisco
```

**Sample Email Templates:**

1. "Cold outreach - Initial touch"
2. "Follow-up after no reply (5 days)"
3. "Follow-up after open but no reply (7 days)"
4. "Post-interview thank you"
5. "Post-rejection re-engagement (3 months)"

---

### 14.4 Technical Stack Recommendation Summary

**Recommended Stack:**

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Tauri 2.x | Lightweight, native feel, efficient |
| **Frontend** | React + TypeScript | Rapid development, excellent ecosystem |
| **Styling** | Tailwind CSS + shadcn/ui | Modern components, easy theming |
| **State** | Zustand | Lightweight, minimal boilerplate |
| **Database** | SQLite (better-sqlite3) | Zero setup, perfect for single-user |
| **Forms** | react-hook-form + zod | Lightweight, type-safe validation |
| **Build** | Vite | Fast, modern, Tauri-native |
| **Testing** | Vitest + React Testing Library | Fast, aligned with Tauri |
| **Email** | Gmail API + nodemailer | No third-party service needed |
| **Drag/Drop** | dnd-kit | Modern, lightweight, Tauri-friendly |
| **Date/Time** | Day.js | Lightweight alternative to Moment |
| **Code Quality** | ESLint + Prettier + TypeScript | Modern best practices |

**Alternative Stack (if no Rust experience):**

| Layer | Technology |
|-------|-----------|
| **Framework** | Electron + Next.js |
| **Frontend** | React + TypeScript |
| **Styling** | Tailwind CSS + Chakra UI |
| **Database** | SQLite (better-sqlite3) |
| **Build** | Webpack/Vite |

---

### 14.5 Cold Email Best Practices (for Product Context)

**Open Rate Optimization:**
- Subject line is critical (40% impact on open rate)
- Personalization matters (use first name, company name)
- Send time: Tuesday-Thursday, 9 AM - 2 PM (best for B2B)
- Short subject lines (30-50 chars) perform better

**Reply Rate Optimization:**
- Email length: 50-125 words is sweet spot
- One clear call-to-action
- Show research/personalization (mention specific company news)
- Authenticity > Fluff
- Multi-touch sequences (3-5 emails) increase reply rate from 5% â†’ 15%+

**Campaign Structure:**
- Email 1: Introduction + personalized reason for reaching out
- Email 2 (if no reply): Additional value prop or social proof
- Email 3 (if no reply): Softer approach, give out gracefully
- Email 4+ (optional): Different angle or referral

**Compliance:**
- Include unsubscribe link (CAN-SPAM requirement)
- Include physical address or "contact me on LinkedIn"
- Don't exceed daily sending limits (Gmail: ~500/day with good reputation)
- Monitor bounce rates (keep below 5%)

---

### 14.6 Competitor Feature Comparison

**OutreachOS vs. Existing Tools:**

| Feature | OutreachOS | HubSpot | Attio | Notion CRM |
|---------|-----------|---------|-------|-----------|
| **Cost** | Free | $50-3200/mo | $50+/mo | $8-20/mo |
| **Contacts** | âœ“ | âœ“ | âœ“ | âœ“ |
| **Campaigns** | âœ“ | âœ“ | âœ“ | âœ— |
| **Pipeline** | âœ“ | âœ“ | âœ“ | âœ— |
| **Email Tracking** | âœ“ | âœ“ | âœ“ | âœ— |
| **Automation** | âœ“ (v2) | âœ“ | âœ“ | âœ— |
| **Local-only** | âœ“ | âœ— | âœ— | âœ“ (if self-hosted) |
| **Single-user** | âœ“ | âœ— | âœ— | âœ“ |
| **Cold email optimized** | âœ“ | âœ— | âœ— | âœ— |
| **Beautiful UI** | âœ“ | âœ“ | âœ“âœ“ | âœ“ |
| **Mobile app** | âœ— (future) | âœ“ | âœ“ | âœ“ |

**OutreachOS Unique Selling Points:**
1. **Purpose-built for cold email** (not generic CRM)
2. **Completely free** (no subscriptions)
3. **Local storage** (privacy, offline capability)
4. **Single-user focused** (simpler, faster)
5. **Beautiful macOS integration** (native feel)

---

### 14.7 Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Gmail API rate limits** | Medium | High | Implement queuing, monitor usage, add retry logic |
| **Email deliverability issues** | Medium | High | Educate user on warm-up, follow best practices |
| **Data loss from crash** | Low | High | Auto-save every 2 seconds, auto-backup on exit |
| **Performance with 10k+ contacts** | Low | Medium | Implement pagination, virtual scrolling, indexing |
| **User forgets emails going to spam** | Medium | Medium | Show delivery rate dashboard, educate on reputation |
| **Browser extension breaks with LinkedIn updates** | Medium | Low | Version compatibility, fallback to manual entry |
| **Rust learning curve (Tauri)** | Medium | Medium | Start with JavaScript-only components, learn Rust incrementally |

---

### 14.8 Success Story (Persona Usage Example)

**Priya's First Month with OutreachOS:**

**Week 1:**
- Adds 50 target companies and 120 contacts (mix of manual entry + CSV import)
- Creates 3 email templates (cold outreach, follow-up, post-interview)
- Sets up first campaign: 30 contacts, 2-step sequence, sends immediately
- Learns keyboard shortcuts (Cmd+K, Cmd+N, Cmd+Shift+C)

**Week 2:**
- First campaign gets: 8 opens, 1 reply from Google recruiter
- Creates application record for Google recruiter follow-up
- Sends 45 emails total across 2 campaigns
- Reviews analytics: 3.5% open rate, realizes subject lines need work

**Week 3:**
- Improves email templates based on data (longer, more personalized subject lines)
- Creates 2 more campaigns with updated templates
- Receives 4 replies
- Creates 4 application records; 1 moves to "Screening"
- Dashboard shows: 2 follow-ups due today (contacts who opened but didn't reply)

**Week 4:**
- Sends follow-ups using automation (sequences running)
- Gets 2 interviews scheduled (recorded in pipeline)
- Analytics show: Reply rate improved to 5.2% (from 3.5%)
- Used app 20-30 minutes every day
- Feeling confident about job search process

**By Month End:**
- 180+ emails sent
- 5% reply rate (above industry average of 3-5%)
- 2 interviews scheduled
- 3 applications in "Screening" stage
- 1 offer (from Amazon)

**Key Success Factor:** System helped her organize, automate, and optimize her outreach, increasing both efficiency and effectiveness.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | AI Assistant | Initial comprehensive PRD |

---

## Sign-off

**Product Owner:** [Student/Self]  
**Engineering Lead:** [Your Name]  
**Design Lead:** [Your Name]  

This PRD is detailed and explicit enough for an AI coding agent to make all architectural and implementation decisions without ambiguity. Every feature has clear acceptance criteria, every data field has types and validation rules, and every user interaction is described step-by-step.

**Status:** âœ… Ready for Development

---

**END OF DOCUMENT**
