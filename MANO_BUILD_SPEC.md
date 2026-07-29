# MANO — Complete Build Specification & Handoff Document

> **Mano** is an AI Revenue Operator that automates lead management, qualification, communication, booking, follow-up, retention, and operational monitoring for service-based businesses (currently branded "Monkee Bizz AI").
>
> Generated from the live project source. This is a **read-only reference** — nothing in the app was changed to produce it.

---

## 1. Mission & System Overview

Mano is a multi-agent, fully automated lead-to-revenue pipeline. A lead enters the system (via web form, inbound SMS, inbound/missed voice call, Calendly booking, or manual entry), and a chain of background "Agents" handles scoring, SMS/email communication, booking, follow-up sequences, post-job retention, and operational self-monitoring — all without human intervention unless an alert escalates.

The system is built on the **Base44 platform** (React + Vite + Tailwind frontend; Deno backend functions; entity-based database; built-in automations; Core integrations for LLM, email, file upload, image/video/speech generation). It integrates with **Twilio** (SMS + voice), **Calendly** (booking), and **ElevenLabs** (text-to-speech).

### The 5-Agent Architecture
The system is conceptually organized as 5 "Agents," each a set of backend functions + automations + a frontend dashboard:

| Agent | Domain | Frontend Page | Core Functions |
|-------|--------|---------------|----------------|
| **Agent 1 — Intake** | Lead capture, scoring, routing, qualification | `/AgentIntake` | `notifyNewLead`, `submitLead`, `landingLeadCapture`, `smsProcess`, `voiceProcess`, `twilioSmsWebhook` |
| **Agent 2 — Booking** | Appointment scheduling, confirmation, reminders, no-show detection | `/AgentBooking` | `calendlyWebhook`, `confirmBooking`, `fetchCalendlySlots`, `checkNoShows`, `sendBookingReminders`, `sendDailySchedule` |
| **Agent 3 — Follow-Up** | 3-touch email + SMS follow-up sequences for unresponsive leads | `/AgentFollowUp` | `scheduleSmsFollowUp`, `processFollowUps`, `processSmsFollowUps`, `runFollowUpTriggers`, `sendSmsReply`, `reEngageLead`, `markLeadResponded` |
| **Agent 4 — Retention** | Post-completion lifecycle: satisfaction → review → referral → upsell → re-engage | `/AgentRetention` | `runRetentionTriggers`, `processRetentionEvents`, `manualRetentionReengage`, `markRetentionResponded` |
| **Agent 5 — Ops** | Continuous monitoring, alerts, contract-violation detection, daily/weekly summaries | `/AgentOps` | `runOpsMonitoring`, `resolveOpsAlert`, `sendDailyOpsSummary`, `sendDailyRetentionSummary`, `sendDailyFollowUpSummary`, `sendWeeklyDigest`, `triggerEscalation` |

The **Command Center** (`/CommandCenter`) is the unified operational dashboard, and **Settings** (`/Settings`) and the **Customer Portal** (`/portal`) provide admin config and client self-service.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS, shadcn/ui, lucide-react, recharts, framer-motion, react-leaflet |
| Routing | react-router-dom (`src/App.jsx`) |
| Backend | Deno serverless functions (`base44/functions/*/entry.ts`) |
| Database | Base44 entities (JSON-schema documents in `base44/entities/*.jsonc`) |
| Scheduling | Base44 automations (scheduled / entity-trigger / connector-webhook) |
| Auth | Base44 built-in auth (platform-owned) |
| SMS / Voice | Twilio REST API |
| Booking | Calendly REST API + webhooks |
| TTS | ElevenLabs REST API |
| AI / LLM | Base44 `Core.InvokeLLM` integration (Gemini fallback in voice pipeline) |
| Email | Base44 `Core.SendEmail` (**registered app users only**) |
| File storage | Base44 `Core.UploadFile` / `UploadPrivateFile` |

### Secrets (configured)
`ELEVENLABS_API_KEY`, `BASE_URL`, `TWILIO_NUMBER`, `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID`

### Twilio Numbers
- Outbound SMS From: `+16233001709` (hardcoded in `processSmsFollowUps`, `calendlyWebhook`, `twilioCallRecovery`)
- Voice TwiML Bin redirect configured via `twilioInbound` / `twilioInboundVoice`

---

## 3. Data Model (Entities)

All entities are stored in `base44/entities/<Name>.jsonc`. Built-in fields on every record (never declared): `id`, `created_date`, `updated_date`, `created_by_id`.

### 3.1 `Lead` (core entity — no RLS)
The central record. **Required:** `name`, `phone`.

| Field | Type | Notes |
|-------|------|-------|
| `name`, `email`, `phone`, `business_type`, `service_need`, `source`, `notes`, `last_message` | string | Lead identity + context |
| `urgency` | enum | low / medium / high (default medium) |
| `budget` | enum | Under $500 … $10,000+ / Not sure yet |
| `timeline` | enum | ASAP / 1-2 weeks / 1 month / Just exploring |
| `status` | enum | New, Action Required, Follow Up, Nurture, Contacted, Appointment Requested, Booked, Closed — Won, Closed — No Response (default New) |
| `score` | enum | HOT, WARM, COLD, PENDING |
| `booking_offered` | boolean | Set true when Calendly slots offered |
| `webhook_status`, `processing_mode`, `submission_token` | string | Intake tracking |
| `last_followup_sent_at`, `last_retention_sent_at` | ISO timestamp | Send-gap enforcement (2-hour min gap) |
| `retention_stage` | enum | none, satisfaction_check_due, review_request_due, referral_ask_due, upsell_due, reengage_due, complete, opted_out |
| `retention_opt_out` | boolean | Skip all automated retention |
| `last_completed_booking_at` | ISO timestamp | Anchor for retention cycle |
| `review_received` | boolean | Skip review request, advance to referral ask |
| `last_ops_reviewed_at`, `ops_priority_flag` | timestamp / enum (watch, urgent, blocked, none) | Agent 5 monitoring |
| `missed_calls_per_week`, `average_job_value`, `monthly_loss` | number | ROI calculator inputs |
| `opted_out` | boolean | Lead sent STOP — no automated SMS |
| `security_flag`, `escalation_reason`, `last_escalation_at`, `last_security_review_at` | string / timestamp | Security/escalation handling |
| `twilio_message_sid` | string | SMS delivery tracking |

### 3.2 `Booking` — admin-only RLS (role=admin)
**Required:** `lead_id`, `scheduled_date`, `scheduled_time`.
Fields: `calendly_event_id`, `calendly_event_url`, `scheduled_date`, `scheduled_time`, `timezone`, `status` (Requested, Confirmed, Rescheduled, Completed, No-Show, Cancelled — default Requested), `notes`, `confirmation_sent`, `reminder_24hr_sent`, `reminder_1hr_sent`, `no_show_flagged`, `rescheduled_from`, `rescheduled_count`, `booking_source` (Admin, Lead, Reminder Link, Reschedule, Manual Override).

### 3.3 `FollowUp`
**Required:** `lead_id`, `sequence_type`, `attempt_number`.
Fields: `sequence_type` (standard, no_show, sms), `attempt_number` (1–3), `status` (Pending, Sent, Failed, Responded, Skipped — default Pending), `scheduled_at`, `sent_at`, `response_received`, `response_at`.

### 3.4 `RetentionEvents`
**Required:** `lead_id`, `event_type`.
Fields: `event_type` (satisfaction_check, review_request, referral_ask, upsell_trigger, past_client_reengage, manual_reengage), `status` (Pending, Sent, Failed, Responded, Skipped — default Pending), `scheduled_at`, `sent_at`, `response_received`, `response_at`.

### 3.5 `OpsAlerts`
**Required:** `alert_type`, `severity`, `source_agent`, `title`, `description`.
Fields: `alert_type` (17 types — see §6), `severity` (low, medium, high, critical), `source_agent`, `lead_id`, `booking_id`, `followup_id`, `retention_event_id`, `title`, `description`, `status` (Open, Acknowledged, Resolved, Ignored — default Open), `detected_at`, `acknowledged_at`, `resolved_at`, `assigned_to`, `metadata_json`.

### 3.6 `ActivityLog`
**Required:** `lead_id`, `event`.
Fields: `lead_id` (or `"system"`), `event`, `created_at`. Append-only audit trail.

### 3.7 `AppSettings`
**Required:** `key`, `value`. Field: `category`. Simple key-value store for all runtime configuration (see §7).

### 3.8 `DailyReports` — admin-only RLS
**Required:** `report_date`. ~25 metric fields (total/hot/warm/cold leads, bookings, follow-ups, retention, alerts, revenue estimates, `report_json`, `email_sent`). One row per day, upserted by `sendDailyOpsSummary`.

### 3.9 `ReportHistory` — admin-only RLS
**Required:** `report_type`, `subject`. Fields: `report_type` (daily_ops_summary, weekly_performance_digest, manual_report), `generated_at`, `subject`, `summary_json`, `email_sent`, `email_sent_at`, `status`.

### 3.10 `User` (built-in)
Read-only: `id`, `created_date`, `full_name`, `email`. Editable: `role` (admin/user). Users join via invites only — cannot be inserted.

---

## 4. Backend Functions (44)

All functions live in `base44/functions/<name>/entry.ts` and use `createClientFromRequest(req)` → `.asServiceRole` for entity/integration access. SDK versions vary (`@0.8.21`–`@0.8.23`).

### Agent 1 — Intake / Lead Capture
| Function | Trigger | Behavior |
|----------|---------|----------|
| `submitLead` | Web form POST | Creates a `Lead` from form data |
| `landingLeadCapture` | Landing page | Captures lead from landing forms |
| `notifyNewLead` | entity auto on `Lead.create` | Emails admin a formatted "New HVAC Lead" notification to `info@monkeebizznus.com` |
| `twilioSmsWebhook` | Twilio inbound SMS webhook | Primary SMS handler: STOP/HELP compliance, E.164 normalize, lead matching, auto-reply for new leads, AI conversational logic for existing leads, async admin pipeline |
| `twilioInboundSms` | (deprecated) | Logs deprecation warning, returns empty TwiML — migrate to `twilioSmsWebhook` |
| `smsProcess` | SMS handler | LLM-based (MANO persona) lead qualification over SMS with regex intent detection + booking integration |
| `voiceProcess` | Twilio voice `<Gather>` | HVAC lead qualification via regex intent engine (fast path) + Gemini GPT fallback; returns TwiML `<Say>`/`<Gather>`; logs/updates Lead |
| `twilioInboundVoice` | Twilio inbound voice | Redirects to pre-configured TwiML Bin |
| `twilioInbound` | Twilio inbound voice | Logs caller metadata, redirects to TwiML Bin |
| `twilioVoiceMenu` | Twilio IVR | DTMF keypad routing: forward to agent / company info / log demo-lead (async, fire-and-forget) |
| `twilioVoiceDigit` | Twilio DTMF | Digit processing for IVR |
| `voiceScript` | Outbound voice | Polly greeting + `<Gather>` input collection |
| `voiceOutbound` | Outbound voice | Outbound call initiation |
| `twilioCallRecovery` | Twilio call-status webhook | On missed/failed/no-answer calls: sends recovery SMS, creates/updates Lead. ⚠️ **Twilio SID/token hardcoded in source** |
| `instantSms` | Direct | Immediate SMS send |
| `sendSmsReply` | Direct | Sends an SMS reply to a lead |
| `generateVoiceAudio` | Direct | ElevenLabs TTS → base64 audio |
| `serveVoiceAudio` | Static | Serves generated audio |

### Agent 2 — Booking
| Function | Trigger | Behavior |
|----------|---------|----------|
| `fetchCalendlySlots` | Frontend call | Fetches Calendly availability via `calendly_api_key` + `calendly_event_url`; respects `booking_buffer_days` (2) and `booking_slots_count` (3); sets `lead.booking_offered` |
| `confirmBooking` | Frontend call (`{lead_id, slot, notes, event_type_uri}`) | Re-verifies slot, creates `Booking` (Confirmed), sets `Lead.status=Booked`, async sends lead confirmation + admin notification emails |
| `calendlyWebhook` | Calendly `invitee.created` webhook | Matches lead by phone/email (or creates one), creates/updates `Booking` (Confirmed), sets Lead Booked, skips pending FollowUps, sends confirmation SMS + admin email |
| `checkNoShows` | scheduled 15 min | Flags Confirmed/Rescheduled bookings past `no_show_window_minutes` (30) as No-Show; sets Lead back to Follow Up; emails admin |
| `sendBookingReminders` | scheduled 30 min | Sends 24hr (23–25h out) and 1hr (55–65 min out) email reminders; toggles via `reminder_24hr_enabled` / `reminder_1hr_enabled` |
| `sendDailySchedule` | scheduled daily 7 AM MST | Emails admin the day's confirmed bookings |

### Agent 3 — Follow-Up
| Function | Trigger | Behavior |
|----------|---------|----------|
| `scheduleSmsFollowUp` | entity auto on `Lead.create` | Schedules 3-part SMS sequence (1hr/24hr/3days, or 24hr/48hr/3days if a missed-call SMS was already sent). Skips if booked or sequence exists. `sequence_type='sms'` |
| `processFollowUps` | scheduled 15 min | Sends **email** follow-ups for `standard`/`no_show` sequences (3 templates each). Enforces 2-hour send gap; skips Booked/Closed—Won; on attempt 3 → Lead → Nurture + admin "sequence complete" email |
| `processSmsFollowUps` | scheduled 15 min | Sends **SMS** follow-ups for `sequence_type='sms'` (3 templates). Skips booked/invalid phone; on attempt 3 → Lead → Nurture |
| `runFollowUpTriggers` | scheduled 15 min | Creates standard 3-attempt sequence for HOT/WARM leads in Follow Up/Action Required (no booking); creates no_show sequence for `no_show_flagged` bookings. Respects `followup_delay_1/2/3_hours` (24/48/96) and `no_show_followup_hours` (2) |
| `reEngageLead` | Direct | Manually re-engages a lead |
| `markLeadResponded` | Direct | Marks lead as responded (stops sequences) |

### Agent 4 — Retention
| Function | Trigger | Behavior |
|----------|---------|----------|
| `runRetentionTriggers` | scheduled 15 min | For leads with a Completed booking, schedules 5-stage retention sequence (satisfaction Day 2 / review Day 5 / referral Day 12 / upsell Day 26 / re-engage Day 71, configurable). Handles cycle reset on new completion. Respects `retention_opt_out` |
| `processRetentionEvents` | scheduled 15 min | Sends due retention emails using 5 templates; advances `retention_stage`; enforces 2-hour gap; stops on rebooking; skips review_request if `review_received` (advances to referral_ask); brand config by source |
| `manualRetentionReengage` | Direct | Manual retention re-engage |
| `markRetentionResponded` | Direct | Marks retention event responded |

### Agent 5 — Ops
| Function | Trigger | Behavior |
|----------|---------|----------|
| `runOpsMonitoring` | scheduled 15 min | The brain. Runs 8 monitoring tasks (see §6): HOT-lead stale, follow-up overdue, no-show unhandled, retention overdue, invalid status conflicts, duplicate/orphaned records, contract violations; auto-resolves alerts when conditions clear; emails critical alerts |
| `resolveOpsAlert` | Direct/UI | Resolves/acknowledges an OpsAlert |
| `sendDailyOpsSummary` | scheduled daily 7:30 AM MST | Full pipeline metrics → upserts `DailyReports`, emails HTML summary, saves `ReportHistory`, logs ActivityLog |
| `sendDailyRetentionSummary` | scheduled daily 8:15 AM MST | Retention-focused daily email |
| `sendDailyFollowUpSummary` | scheduled daily 8 AM MST | Follow-up queue summary email to `admin_email` |
| `sendWeeklyDigest` | scheduled weekly Mon 8:30 AM MST | Weekly performance digest (conversion, follow-up, retention, revenue metrics) |
| `triggerEscalation` | Direct | Escalates a lead (security/angry/complaint) |

### Shared / Utility
`manoAiChat`, `manoDemoChat` — LLM-powered chat endpoints for the Mano AI assistant and demo widget.

---

## 5. Automations (17)

All schedules expressed in UTC; the app's business timezone is **America/Phoenix (MST)**.

### Entity-triggered (on `Lead.create`)
| Name | Function | Status |
|------|----------|--------|
| Schedule SMS Follow-Up on New Lead | `scheduleSmsFollowUp` | ✅ active |
| Welcome SMS on New Lead | `sendWelcomeSms` | ✅ active |
| Lead-Intake Trigger | `notifyNewLead` | ✅ active |
| Notify on New Lead | `notifyNewLead` | ✅ active |

### Scheduled — continuous (every 15–30 min)
| Name | Function | Interval | Status |
|------|----------|----------|--------|
| Process SMS Follow-Ups | `processSmsFollowUps` | 15 min | ✅ active |
| Agent 3 — Process Follow-Ups | `processFollowUps` | 15 min | ✅ active |
| Agent 3 — Follow-Up Triggers | `runFollowUpTriggers` | 15 min | ✅ active |
| Agent 4 — Process Retention Events | `processRetentionEvents` | 15 min | ✅ active |
| Agent 5 — Continuous Ops Monitoring | `runOpsMonitoring` | 15 min | ✅ active |
| No-Show Detection | `checkNoShows` | 15 min | ✅ active |
| Booking Reminders | `sendBookingReminders` | 30 min | ✅ active |

### Scheduled — daily/weekly digests
| Name | Function | Time (MST) | Status |
|------|----------|------------|--------|
| Daily Schedule Email — 7AM | `sendDailySchedule` | 7:00 AM | ✅ active |
| Agent 5 — Daily Ops Summary | `sendDailyOpsSummary` | 7:30 AM | ✅ active |
| Agent 3 — Daily Follow-Up Summary (8AM) | `sendDailyFollowUpSummary` | 8:00 AM | ✅ **re-enabled** (was disabled, 5 consecutive failures) |
| Agent 4 — Daily Retention Summary | `sendDailyRetentionSummary` | 8:15 AM | ✅ active |
| Agent 5 — Weekly Performance Digest | `sendWeeklyDigest` | Mon 8:30 AM | ✅ active |

> One additional scheduled automation exists (truncated in the live listing) — verify in the dashboard Automations tab for the complete set.

---

## 6. Agent 5 — Ops Monitoring Logic (`runOpsMonitoring`)

This function runs every 15 minutes and is the system's self-healing layer. It loads all leads, bookings, follow-ups, retention events, and open alerts, then runs 8 tasks:

1. **HOT lead stale** — HOT leads in Action Required/Follow Up with no booking within `ops_hot_lead_stale_minutes` (30) → critical alert + email, sets `ops_priority_flag='urgent'`
2. **Follow-up overdue** — Pending follow-ups past `ops_followup_overdue_hours` (2) → high alert
3. **No-show unhandled** — `no_show_flagged` bookings with no no-show sequence after `ops_noshow_escalation_hours` (6) → critical alert + email
4. **Retention overdue** — Pending retention events past `ops_retention_overdue_hours` (2) → medium alert
5. **Invalid status conflicts** — detects impossible cross-agent states (e.g., Booked + Pending FollowUp; Closed—Won without Completed booking; active retention stage without Completed booking; retention_opt_out + Pending events) → high alert
6. **Duplicate sequence attempts** — multiple active sequences per lead+type → high/medium alert
7. **Orphaned records** — bookings/follow-ups/retention events referencing non-existent leads → medium alert
8. **Contract violations** — pending follow-up on a Booked lead; retention on a non-completed lead → high alert + ActivityLog

**Auto-resolve:** if `ops_auto_resolve_enabled` is true, alerts auto-resolve when their underlying condition clears.

**OpsAlert types (17):** hot_lead_stale, overdue_followup, booking_failure, calendly_failure, email_failure, no_show_unhandled, retention_overdue, retention_rebook_conflict, duplicate_sequence_attempt, invalid_status_conflict, pipeline_bottleneck, summary_generation_failure, orphaned_record, manual_review_needed, lead_flow_stopped, no_bookings_this_week, contract_violation.

---

## 7. AppSettings — Configuration Registry

`AppSettings` is a key-value store. Functions read it via a `get(key, default)` helper. Known keys and their purposes:

### Branding / routing
`business_name` (default "Monkee Bizz AI"), `app_url` ("https://app.monkeebizzai.com"), `app_timezone` ("America/Phoenix"), `email_signature`, `admin_email` (**now** `info@monkeebizznus.com`), `ops_admin_email` (same).

### Multi-brand (source-based)
`vendorfy_email`, `vendorfy_signature`, `surplus_email`, `surplus_signature` — alternate brand config selected by `Lead.source`.

### Calendly / booking
`calendly_api_key`, `calendly_event_url`, `booking_buffer_days` (2), `booking_slots_count` (3), `no_show_window_minutes` (30).

### Follow-up tuning
`followup_enabled` (true), `followup_delay_1_hours` (24), `followup_delay_2_hours` (48), `followup_delay_3_hours` (96), `no_show_followup_hours` (2).

### Retention tuning
`retention_enabled` (true), `retention_from_name`, `retention_review_link`, `retention_referral_offer`, `retention_upsell_link`, `retention_satisfaction_days` (2), `retention_review_days` (3), `retention_referral_days` (7), `retention_upsell_days` (14), `retention_reengage_days` (45).

### Ops tuning
`ops_summary_enabled` (true), `ops_hot_lead_stale_minutes` (30), `ops_followup_overdue_hours` (2), `ops_retention_overdue_hours` (2), `ops_noshow_escalation_hours` (6), `ops_critical_alerts_enabled` (true), `ops_auto_resolve_enabled` (true), `ops_average_deal_value` (1500).

### Reminders
`reminder_24hr_enabled` (true), `reminder_1hr_enabled` (true), `missed_call_sms_enabled`.

> **Known issue:** duplicate/conflicting AppSettings keys exist in the live DB (e.g., two `missed_call_sms_enabled` rows; `sms_auto_reply_msg` vs `sms_auto_reply_message`). Some functions use inconsistent key names and silently fall back to defaults. A canonical-key cleanup is recommended.

---

## 8. Frontend — Pages & Routes

Defined in `src/App.jsx`. Main/home page is `/` → `Demo`.

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `Demo` | Public demo / landing |
| `/CommandCenter` | `ManoCommandCenter` | Unified ops dashboard (primary) |
| `/CommandCenter/legacy` | `CommandCenter` | Older dashboard |
| `/AgentIntake` | `AgentIntake` | Agent 1 — lead pipeline + HOT leads |
| `/AgentBooking` | `AgentBooking` | Agent 2 — bookings + no-shows |
| `/AgentFollowUp` | `AgentFollowUp` | Agent 3 — follow-up queue |
| `/AgentRetention` | `AgentRetention` | Agent 4 — retention queue |
| `/AgentOps` | `AgentOps` | Agent 5 — alerts + system health |
| `/DealAccess` | `DealAccess` | Deal/access management |
| `/LeadForm` | `LeadForm` | Lead submission form |
| `/Settings` | `Settings` | Admin system info + nav (currently a static display — **not editable**) |
| `/ChatCenter` | `ChatCenter` | Chat center |
| `/ManoChat` | `ManoChat` | Mano AI chat |
| `/BuilderChat` | `BuilderChat` | Builder chat |
| `/Demo` | `Demo` | Demo page |
| `/portal` | `CustomerPortal` | Client self-service by phone lookup |

### Notable frontend components
- `src/components/mano/ManoSidebar.jsx` — shared sidebar navigation
- `src/components/mano/LeadPipeline.jsx`, `SmsDashboard.jsx`, `ActivityFeed.jsx`, `RevenueLossCalculator.jsx`, `ManoAiPanel.jsx`
- `src/components/chat/SmsPortal.jsx`, `ManoAiChat.jsx`
- `src/components/public/ManoDemoWidget.jsx`, `PublicLeadForm.jsx`
- `src/components/BookingPanel.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/UserNotRegisteredError.jsx`

### Customer Portal (`/portal`)
A phone-number lookup flow → `PortalDashboard` showing lead status, score, upcoming/past appointments, service details, and SMS history parsed from lead notes. ⚠️ **Security note:** it calls `base44.entities.Lead.list()` client-side (downloads all leads then filters) — a data-leak risk for multi-client use.

---

## 9. External Integration Wiring

### Twilio (SMS + Voice)
- **Inbound SMS** → `twilioSmsWebhook` (primary), `twilioInboundSms` (deprecated)
- **Inbound voice** → `twilioInbound` / `twilioInboundVoice` → TwiML Bin redirect → `voiceProcess` (`<Gather>`)
- **IVR menu** → `twilioVoiceMenu` (DTMF routing)
- **Call status** → `twilioCallRecovery` (missed-call recovery SMS)
- **SMS delivery status** → `twilioStatusCallback` (updates lead, alerts on failure)
- **Outbound** → `voiceOutbound`, `voiceScript`, `instantSms`, `sendSmsReply`
- **From number:** `+16233001709` (Twilio number also in `TWILIO_NUMBER` secret)
- ⚠️ `twilioCallRecovery` hardcodes SID/token in source — should use `Deno.env.get()`

### Calendly (Booking)
- `fetchCalendlySlots` — pulls availability (uses `calendly_api_key`)
- `confirmBooking` — admin-initiated booking with slot re-verification
- `calendlyWebhook` — handles `invitee.created` webhook (booking confirmed → SMS + emails)

### ElevenLabs (TTS)
- `generateVoiceAudio` — text → base64 audio via ElevenLabs API (`ELEVENLABS_API_KEY`)

### Email (Base44 `Core.SendEmail`)
- **Constraint:** sends to registered app users only. All operational emails route to `info@monkeebizznus.com` (the registered admin). Lead-facing emails (follow-ups, retention, reminders, confirmations) go to `lead.email` — **note:** only registered users receive mail; non-registered lead emails may be rejected by the platform.

---

## 10. Lead Lifecycle (End-to-End Flow)

1. **Capture** — lead enters via form (`submitLead`/`landingLeadCapture`), SMS (`twilioSmsWebhook`), voice (`voiceProcess`), missed call (`twilioCallRecovery`), or Calendly (`calendlyWebhook`). A `Lead` record is created.
2. **Intake** — `notifyNewLead` emails admin; `scheduleSmsFollowUp` + `sendWelcomeSms` fire on create; SMS/voice processors qualify and assign `score` (HOT/WARM/COLD/PENDING).
3. **Follow-up** — if HOT/WARM and not booked, `runFollowUpTriggers` creates a 3-attempt email sequence; `processFollowUps`/`processSmsFollowUps` send on schedule; on no response after attempt 3 → Lead → Nurture.
4. **Booking** — `fetchCalendlySlots` offers times → `confirmBooking` or `calendlyWebhook` creates a `Booking` (Confirmed) → Lead → Booked, pending follow-ups skipped → confirmation SMS + emails.
5. **Reminders** — `sendBookingReminders` sends 24hr + 1hr emails; `sendDailySchedule` emails the day's calendar.
6. **No-show** — `checkNoShows` flags past Confirmed bookings → No-Show → Lead back to Follow Up → `runFollowUpTriggers` creates a no-show sequence.
7. **Completion → Retention** — once a Booking is Completed, `runRetentionTriggers` schedules the 5-stage retention sequence; `processRetentionEvents` sends each stage, advancing `retention_stage` until complete.
8. **Monitoring** — `runOpsMonitoring` continuously checks for stale HOT leads, overdue sequences, unhandled no-shows, invalid states, duplicates, orphans, and contract violations, creating/auto-resolving `OpsAlerts`.
9. **Reporting** — daily ops/retention/follow-up summaries + weekly digest are emailed to admin and archived in `DailyReports` / `ReportHistory`.

---

## 11. Monetization / Handoff Readiness (Open Items)

These are documented gaps — **not changed per the request** — to address before onboarding paying clients:

1. **Single-client only** — no `Client` entity or per-client config isolation; branding/emails hardcoded to Monkee Bizz AI.
2. **Settings page is read-only** — no UI to edit `AppSettings`.
3. **`twilioCallRecovery` hardcoded credentials** — security risk.
4. **No auth on admin pages** — Command Center / Agent dashboards / Settings are unprotected.
5. **Customer Portal data leak** — client-side full lead list download.
6. **No billing/subscription** — no payment integration or usage metering.
7. **No client-facing ROI dashboard** — clients can't self-serve their metrics.
8. **Duplicate/conflicting AppSettings keys** in the DB.
9. **Email constraint** — `SendEmail` only reaches registered users; lead-facing emails to non-registered addresses may fail silently.
10. **No onboarding flow** for new clients.

---

## 12. Recent Changes Applied (this session)

- **`sendDailyFollowUpSummary`**: default `admin_email` changed from `info@monkeebizai.com` → `info@monkeebizznus.com`.
- **AppSettings** `admin_email` DB record updated to `info@monkeebizznus.com`.
- **"Agent 3 — Daily Follow-Up Summary (8AM)"** automation re-enabled (was disabled with 5 consecutive failures).

---

## 13. File Map (key locations)

```
src/App.jsx                         # Router — all routes
src/index.css, tailwind.config.js    # Design tokens / theme
src/pages/*.jsx                      # 15 pages
src/components/mano/*                # Mano-specific UI components
src/components/chat/*                # Chat components
src/components/ui/*                  # shadcn/ui primitives
base44/entities/*.jsonc              # 9 entity schemas (+ built-in User)
base44/functions/*/entry.ts          # 44 backend functions
base44/config.jsonc                  # Platform config
```

### Secrets
`ELEVENLABS_API_KEY`, `BASE_URL`, `TWILIO_NUMBER`, `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID`

---

*End of build specification. This document reflects the live system state; no application code was modified to generate it.*