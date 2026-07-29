# CHECKPOINT MANIFEST — MANO-P0-CANONICAL-BEFORE-TENANCY-2026-07-29

> **Checkpoint type:** Read-only baseline snapshot for rollback.
> **Created:** 2026-07-29 (America/Phoenix). No code, schema, record, function, integration, automation, setting, route, or UI was modified to create this checkpoint.
> **Purpose:** Capture the canonical pre-tenancy system state so any Phase 1 change can be diffed against it and rolled back to it byte-for-byte.

---

## 1. Runtime Identity
| Field | Value |
|-------|-------|
| Canonical App ID | `69bae88c1f7bb2218159dde8` |
| App name (config) | `Mano ` |
| Sole User record id | `69bae88c1f7bb2218159dde9` |
| Platform region | US |
| Business timezone | America/Phoenix |

## 2. Entity Record Counts (baseline — must remain identical after additive Phase 1)
| Entity | Count | RLS |
|--------|-------|-----|
| Lead | 68 | none |
| Booking | 1 | admin-only |
| FollowUp | 177 | none |
| RetentionEvents | 0 | none |
| OpsAlerts | 4 | none |
| ActivityLog | 59 | none |
| AppSettings | 18 | none |
| DailyReports | 49 | admin-only |
| ReportHistory | 66 | admin-only |
| User | 1 | built-in |
| **TOTAL** | **443** | |

## 3. Backend Function Inventory (45) — see §3 of revised plan
calendlyWebhook, checkNoShows, confirmBooking, fetchCalendlySlots, generateVoiceAudio, instantSms, landingLeadCapture, manoAiChat, manoDemoChat, manualRetentionReengage, markLeadResponded, markRetentionResponded, notifyNewLead, processFollowUps, processRetentionEvents, processSmsFollowUps, reEngageLead, resolveOpsAlert, runFollowUpTriggers, runOpsMonitoring, runRetentionTriggers, scheduleSmsFollowUp, sendBookingReminders, sendDailyFollowUpSummary, sendDailyOpsSummary, sendDailyRetentionSummary, sendDailySchedule, sendSmsReply, sendWeeklyDigest, sendWelcomeSms, serveVoiceAudio, smsProcess, submitLead, triggerEscalation, twilioCallRecovery, twilioInbound, twilioInboundSms, twilioInboundVoice, twilioSmsWebhook, twilioStatusCallback, twilioVoiceDigit, twilioVoiceMenu, voiceOutbound, voiceProcess, voiceScript

## 4. Automations (17) — all active, 0 consecutive failures
4 entity (Lead.create): scheduleSmsFollowUp, sendWelcomeSms, notifyNewLead (×2 — duplicate).
13 scheduled: processSmsFollowUps(15m), processFollowUps(15m), runFollowUpTriggers(15m), processRetentionEvents(15m), runRetentionTriggers(15m), runOpsMonitoring(15m), checkNoShows(15m), sendBookingReminders(30m), sendDailySchedule(14:00 UTC), sendDailyOpsSummary(14:30 UTC), sendDailyFollowUpSummary(15:00 UTC), sendDailyRetentionSummary(15:15 UTC), sendWeeklyDigest(Mon 15:30 UTC).

## 5. Secrets in env (names only — no values)
ELEVENLABS_API_KEY, BASE_URL, TWILIO_NUMBER, TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID

## 6. Schemas in place at checkpoint
Lead, Booking, FollowUp, RetentionEvents, OpsAlerts, ActivityLog, AppSettings, DailyReports, ReportHistory, User — full text in `base44/entities/*.jsonc` (User declares only `role`; built-ins omitted).

## 7. RLS baseline
Admin-only (role=admin create/read/update/delete): Booking, DailyReports, ReportHistory. No RLS: Lead, FollowUp, RetentionEvents, OpsAlerts, ActivityLog, AppSettings. User: built-in platform security (admins manage users).

## 8. Rollback anchor
This manifest is the diff anchor. Phase 1 rollback = revert `base44/entities/*.jsonc` to these schemas, remove any added entities (Tenant/TenantMember/Location/TenantSetting), null-out added `tenant_id`-style fields, restore the 443 records unchanged. No record in this checkpoint is mutated by Phase 1.