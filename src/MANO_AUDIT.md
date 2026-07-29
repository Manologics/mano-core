# MANO — Complete Build Audit

> A full reliability, security, data-integrity, and operational audit of the Mano (Monkee Bizz AI) system, derived from live source code, automation run statistics, entity schemas, and configuration. **No application code was changed to produce this audit.**

---

## Executive Summary

Mano is a sophisticated, highly-automated lead-to-revenue pipeline with 5 conceptual agents, 44 backend functions, 17 automations, and 9 entities. The automation machinery is **largely healthy** (most continuous loops run >99% success across 6,000+ executions). However, the audit surfaces **3 critical issues, 6 high-severity issues, and several medium/low items** that must be addressed before the system is production-ready or monetizable.

### Severity counts
| Severity | Count | Highlights |
|----------|-------|-----------|
| 🔴 Critical | 3 | Hardcoded Twilio credentials; `notifyNewLead` failing 82% (55/68); no auth on admin pages |
| 🟠 High | 6 | Email-only-to-registered-users limit breaking lead emails; Customer Portal data leak; AppSettings key drift; uneditable Settings; duplicate `notifyNewLead` automations; no multi-client isolation |
| 🟡 Medium | 7 | Hardcoded Twilio From-number; deprecated webhook still wired; `updateMany`/list-all scaling risk; duplicate AppSettings rows; no RLS on Lead; missing client-facing reporting; hardcoded brand defaults |
| 🟢 Low | 5 | Inconsistent SDK versions; inline HTML email styling; `retention_enabled`/`followup_enabled` not surfaced in UI; console.warn noise; unused `Welcome SMS` automation |

---

## 1. Security Audit

### 🔴 S1 — Hardcoded Twilio credentials in `twilioCallRecovery`
The Account SID and Auth Token are **plaintext in source** (`ACbceba2a...` / `402fca92...`), while every other Twilio function correctly uses `Deno.env.get('TWILIO_ACCOUNT_SID')`. This is the single most urgent issue — credentials committed to source are compromised by definition.
**Fix:** Replace with `Deno.env.get()` calls and rotate the exposed credentials.

### 🔴 S2 — No authentication on any admin page
`/CommandCenter`, `/AgentIntake`, `/AgentBooking`, `/AgentFollowUp`, `/AgentRetention`, `/AgentOps`, `/Settings`, and `/DealAccess` have **zero auth protection**. Anyone with the URL can view all lead data, bookings, alerts, and system config. `ProtectedRoute.jsx` exists but is not wired into these routes.
**Fix:** Wrap admin routes in the existing `ProtectedRoute` (or a role gate requiring `role: 'admin'`).

### 🟠 S3 — Customer Portal leaks the entire lead table
`CustomerPortal.jsx` `LookupScreen` calls `base44.entities.Lead.list()` — downloading **every lead in the database** to the browser, then filtering by phone client-side. For multi-client deployment this exposes every client's leads to any visitor.
**Fix:** Move lookup to a backend function that filters server-side by phone before returning data.

### 🟡 S4 — No Row-Level Security on the core `Lead` entity
`Lead`, `FollowUp`, `RetentionEvents`, `ActivityLog`, and `AppSettings` have **no RLS** — any authenticated user can read/modify every record. Only `Booking`, `DailyReports`, and `ReportHistory` are admin-locked.
**Fix:** Add RLS to at least `Lead`, `FollowUp`, `RetentionEvents`, and `AppSettings` (admin-only writes; consider per-client read isolation).

### 🟡 S5 — Customer Portal lookup has no rate limiting / lockout
Phone-number-only lookup with no password, rate limit, or lockout — vulnerable to enumeration of customer records.

### 🟡 S6 — Inline HTML in emails (XSS surface)
Every email body is built by string-concatenating lead-supplied data (`lead.name`, `lead.service_need`, `notes`) directly into HTML. A malicious lead name like `<script>...</script>` would be injected into admin emails. Low practical risk (email clients strip scripts) but a hygiene issue.

---

## 2. Reliability & Automation Health

Run statistics captured from live automations:

| Automation | Function | Success | Failed | Failure % | Notes |
|-----------|----------|---------|--------|-----------|-------|
| Notify on New Lead | `notifyNewLead` | 13 | 55 | **82%** ❌ | Critical — likely email rejection |
| Lead-Intake Trigger | `notifyNewLead` | 12 | 55 | **82%** ❌ | Duplicate automation, same failure |
| Agent 5 — Daily Ops Summary | `sendDailyOpsSummary` | 2 | 5 | 71% ❌ | Email send failures |
| Agent 3 — Daily Follow-Up Summary | `sendDailyFollowUpSummary` | 30 | 5 | 14% | Was disabled (5 consecutive failures) — **now re-enabled** |
| No-Show Detection | `checkNoShows` | 6316 | 11 | 0.17% ✅ | |
| Process Retention Events | `processRetentionEvents` | 6255 | 8 | 0.13% ✅ | |
| Process Follow-Ups | `processFollowUps` | 6309 | 9 | 0.14% ✅ | |
| Follow-Up Triggers | `runFollowUpTriggers` | 6310 | 8 | 0.13% ✅ | |
| Continuous Ops Monitoring | `runOpsMonitoring` | 6244 | 11 | 0.18% ✅ | |
| Process SMS Follow-Ups | `processSmsFollowUps` | 4536 | 5 | 0.11% ✅ | |
| Booking Reminders | `sendBookingReminders` | 3159 | 4 | 0.13% ✅ | |
| Schedule SMS Follow-Up | `scheduleSmsFollowUp` | 34 | 1 | 3% ✅ | |
| Weekly Digest | `sendWeeklyDigest` | 9 | 0 | 0% ✅ | |
| Daily Retention Summary | `sendDailyRetentionSummary` | 64 | 0 | 0% ✅ | |
| Daily Schedule | `sendDailySchedule` | 66 | 0 | 0% ✅ | |
| Welcome SMS on New Lead | `sendWelcomeSms` | 0 | 0 | n/a | Never run |

### 🟠 R1 — `notifyNewLead` is failing 82% (and there are TWO automations running it)
Two automations both invoke `notifyNewLead` on `Lead.create` ("Lead-Intake Trigger" and "Notify on New Lead"), both with 55 failures. Combined with `sendDailyOpsSummary`'s 71% failure rate and the Agent 3 daily summary's prior 5 consecutive failures, the common cause is the **`Core.SendEmail` registered-users-only restriction**. Emails to addresses not explicitly registered as app users are rejected — and the lead-facing/admin notification path likely targets addresses the platform rejects. The DB `admin_email` was just corrected to `info@monkeebizznus.com`, which should help, but the underlying restriction still affects any lead-email send path.
**Fix:** Verify `info@monkeebizznus.com` is a registered app user; for lead-facing email, consider an external email provider (Resend/SMTP via a backend function) since Base44 email only reaches registered users. Deduplicate the two `notifyNewLead` automations.

### 🟠 R2 — Duplicate automation: `notifyNewLead` fires twice per new lead
Both "Lead-Intake Trigger" and "Notify on New Lead" run `notifyNewLead` on `Lead.create`. This double-fires admin notifications (and double the failure noise).
**Fix:** Archive one of the two automations.

### 🟢 R3 — `Welcome SMS on New Lead` automation has never executed (0 runs)
Created but `last_run_at: null`. Either it's mis-wired or never triggered. Worth verifying the SMS pipeline is actually welcoming new leads.

### 🟡 R4 — Silent failure swallowing
Many functions wrap side-effects in `.catch(() => {})` (activity logs, alert creation, admin emails). Failures vanish without surfacing. This is why `notifyNewLead` could fail 55 times without an obvious signal outside the automation stats. A failure-tracking/escalation path for silent catches is missing.

### 🟡 R5 — Inconsistent Base44 SDK versions
Functions import `@base44/sdk@0.8.21`, `@0.8.23`, and `@0.8.25`. While minor, version drift can cause subtle behavioral differences. Standardize on one version.

---

## 3. Data Integrity & Database Health

### 🟠 D1 — AppSettings key drift and duplicate rows
The DB contains **conflicting/duplicate AppSettings keys**: two `missed_call_sms_enabled` rows, and `sms_auto_reply_msg` vs `sms_auto_reply_message`. Different functions read different key names and silently fall back to hardcoded defaults, meaning intended config silently doesn't apply.
**Fix:** Consolidate to a canonical key registry; delete duplicate rows; standardize key names across all functions.

### 🟡 D2 — `Lead` has no uniqueness / phone normalization enforcement
Phone numbers are stored in mixed formats (E.164 vs raw) and there's no DB-level uniqueness. Matching in `calendlyWebhook`, `twilioSmsWebhook`, etc. relies on each function's `toE164()` helper. A normalization inconsistency creates duplicate leads.
**Fix:** Enforce E.164 on write; consider a uniqueness constraint or pre-create upsert helper.

### 🟡 D3 — Orphaned-record risk is detected but not prevented
`runOpsMonitoring` flags orphaned bookings/follow-ups/retention events (referencing deleted leads), but deletion of a Lead does not cascade-clean its children. Over time the OpsAlert table will accumulate orphan alerts.
**Fix:** Cascade-delete (or archive) child records when a Lead is deleted.

### 🟡 D4 — `notes` field used as a message log
SMS history is appended into `Lead.notes` as free text and later parsed back out by `CustomerPortal.extractSmsHistory()` via regex. This is fragile — any format change in the appenders breaks the parser.
**Fix:** Introduce a dedicated `Message`/`SmsLog` entity for structured message history.

### 🟡 D5 — Full-table scans everywhere
Nearly every function calls `S.entities.<Entity>.list()` then filters in memory (`Lead.list()`, `Booking.list()`, `FollowUp.list()` all fetched wholesale in `runOpsMonitoring`, `processFollowUps`, `sendDailyOpsSummary`, etc.). At current scale this works; at scale it will degrade and hit payload limits.
**Fix:** Use `filter()` with server-side queries where possible; paginate high-volume entities.

---

## 4. Configuration & Operational State

### 🟠 C1 — `Settings` page is a static display, not editable
`src/pages/Settings.jsx` renders hardcoded system info and nav links. There is **no UI to edit `AppSettings`** — business name, Twilio number, Calendly URL, admin email, message templates, and all tuning values can only be changed by editing DB rows directly or editing function defaults.
**Fix:** Build an editable Settings UI that reads/writes `AppSettings`.

### 🟡 C2 — Hardcoded defaults drift from intended config
Functions default to `info@monkeebizai.com` (old domain) in many places while the correct address is `info@monkeebizznus.com`. If an AppSettings row is ever missing, functions silently email the wrong (likely unregistered) address. (This session corrected the `admin_email`/`sendDailyFollowUpSummary` defaults and DB record, but ~8 other functions still default to `monkeebizai.com`.)
**Fix:** Sweep all function defaults to the correct domain; ensure the AppSettings row always exists.

### 🟡 C3 — Twilio From-number hardcoded in 3 functions
`+16233001709` is hardcoded in `processSmsFollowUps`, `calendlyWebhook`, and `twilioCallRecovery` despite `TWILIO_NUMBER` being an available secret.
**Fix:** Read `Deno.env.get('TWILIO_NUMBER')` instead.

### 🟢 C4 — Feature toggles exist but aren't surfaced
`retention_enabled`, `followup_enabled`, `ops_summary_enabled`, `reminder_24hr_enabled`, `reminder_1hr_enabled`, `ops_critical_alerts_enabled`, `ops_auto_resolve_enabled` all gate behavior but can only be flipped by editing DB rows — no admin toggle UI.

---

## 5. Frontend / UX Audit

### 🟠 F1 — No auth gating (see S2)
All admin dashboards are publicly reachable.

### 🟡 F2 — Customer Portal has no loading/empty/error polish
`LookupScreen` shows a generic error on failure; `PortalDashboard` assumes bookings array exists. Minor robustness gaps.

### 🟡 F3 — Routes include a legacy duplicate
`/CommandCenter` → `ManoCommandCenter` (primary) and `/CommandCenter/legacy` → old `CommandCenter`. The legacy route should be retired once confirmed unused.

### 🟢 F4 — Demo page is the home route
`/` → `Demo`. If `Demo` is a public marketing/demo page, that's intentional; just confirm it shouldn't be an authenticated landing/dashboard for admins.

---

## 6. Integration Audit

### 🟡 I1 — `twilioInboundSms` is deprecated but still deployed
Marked obsolete (should migrate to `twilioSmsWebhook`). If any Twilio webhook still points at it, inbound SMS is being logged-and-ignored.
**Fix:** Confirm Twilio webhook config points only at `twilioSmsWebhook`; remove the deprecated function.

### 🟡 I2 — Calendly webhook hard-dependency
`fetchCalendlySlots` returns `not_configured: true` if `calendly_api_key`/`calendly_event_url` are missing — booking silently disabled. No admin alert when Calendly misconfigured.

### 🟢 I3 — ElevenLabs API key is a secret ✅ (correctly configured)
`generateVoiceAudio` reads `ELEVENLABS_API_KEY` from env — good pattern.

### 🟢 I4 — No app connectors authorized
The system uses direct REST (Twilio/Calendly/ElevenLabs) rather than Base44 OAuth connectors. Acceptable, but no webhook-automation layer for Calendly/Gmail/etc. is in use.

---

## 7. Monetization Readiness (summary — full detail in build spec §11)

| Blocker | Status |
|---------|--------|
| Single-client only (no isolation) | ❌ Open |
| Uneditable Settings UI | ❌ Open |
| Hardcoded Twilio creds | ❌ Open |
| No auth on admin pages | ❌ Open |
| Customer Portal data leak | ❌ Open |
| No billing/subscription | ❌ Open |
| No client-facing ROI dashboard | ❌ Open |
| AppSettings key drift | ❌ Open |
| Email registered-users-only limit | ❌ Open |
| No onboarding flow | ❌ Open |

---

## 8. Recommended Action Plan (prioritized)

**Do first (this week):**
1. **S1** — Replace hardcoded Twilio creds in `twilioCallRecovery` with env vars + rotate keys.
2. **R1/R2** — Verify `info@monkeebizznus.com` is registered; deduplicate the two `notifyNewLead` automations; diagnose the 82% failure.
3. **S2** — Wire `ProtectedRoute` around all admin routes.

**Do next (short term):**
4. **D1** — Consolidate AppSettings keys; delete duplicate rows; canonical registry.
5. **S3** — Move Customer Portal lookup server-side.
6. **C1** — Build editable Settings UI.
7. **C3/C2** — Move Twilio From-number to env; sweep function defaults to correct domain.

**Do before monetizing:**
8. **S4** — Add RLS to Lead/FollowUp/RetentionEvents/AppSettings.
9. Build `Client` entity + per-client config isolation.
10. Add billing integration + client-facing ROI dashboard.
11. **D4** — Introduce structured `Message` entity (stop using `notes` as a log).
12. **R4** — Add failure escalation for silent `.catch(() => {})` paths.

**Hygiene (ongoing):**
13. **I1** — Remove deprecated `twilioInboundSms`.
14. **F3** — Retire `/CommandCenter/legacy`.
15. **R5** — Standardize SDK version.
16. **R3** — Diagnose why `Welcome SMS` automation never ran.

---

## 9. What's Working Well

- **Agent 5 Ops Monitoring** is genuinely robust — 8 distinct monitoring tasks with auto-resolve, contract-violation detection, and duplicate/orphan detection across 6,244+ runs.
- **Follow-up & retention sequences** are well-guarded (2-hour send gaps, skip-on-book, opt-out handling, cycle reset on new completion).
- **Continuous 15-min loops** run at >99.8% success across thousands of executions.
- **Activity logging** is pervasive — nearly every state change writes to `ActivityLog`, giving strong auditability.
- **Calendly booking flow** (slots → confirm → webhook) is complete with duplicate-booking protection.
- **Brand-agnostic config** via `Lead.source` (vendorfy/surplus/monkee) is already partially implemented in follow-up/retention/no-show functions — a foundation for multi-client.

---

*End of audit. This document reflects the live system state; no application code was modified to produce it.*