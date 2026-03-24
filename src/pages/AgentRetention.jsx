import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { markRetentionResponded } from "@/functions/markRetentionResponded";
import { manualRetentionReengage } from "@/functions/manualRetentionReengage";

const RetentionEvents = base44.entities.RetentionEvents;
const Lead = base44.entities.Lead;
const Booking = base44.entities.Booking;
const ActivityLog = base44.entities.ActivityLog;
const AppSettings = base44.entities.AppSettings;

const NAV = [
  { label: "Command Center",      path: "/CommandCenter",  icon: "⚡" },
  { label: "Agent 1: Intake",     path: "/AgentIntake",    icon: "🤖" },
  { label: "Agent 2: Booking",    path: "/AgentBooking",   icon: "🤖" },
  { label: "Agent 3: Follow-Up",  path: "/AgentFollowUp",  icon: "🤖" },
  { label: "Agent 4: Retention",  path: "/AgentRetention", icon: "🤖" },
  { label: "Agent 5: Ops",        path: "/AgentOps",       icon: "🤖" },
  { label: "Settings",            path: "/Settings",       icon: "⚙️" },
  { label: "📋 Lead Form",        path: "/LeadForm",       icon: "" },
];

const STAGE_LABELS = {
  satisfaction_check_due: "Satisfaction Check",
  review_request_due:     "Review Request",
  referral_ask_due:       "Referral Ask",
  upsell_due:             "Upsell",
  reengage_due:           "Re-Engage",
  complete:               "Complete",
  opted_out:              "Opted Out",
  none:                   "—",
};

const EVENT_LABELS = {
  satisfaction_check:   "Satisfaction Check",
  review_request:       "Review Request",
  referral_ask:         "Referral Ask",
  upsell_trigger:       "Upsell",
  past_client_reengage: "Past Client Re-Engage",
  manual_reengage:      "Manual Re-Engage",
};

function Sidebar({ pendingCount }) {
  const current = "/AgentRetention";
  return (
    <aside style={{ width: "220px", background: "#0f0f0f", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0, minHeight: "100vh" }}>
      <div style={{ padding: "18px 14px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg,#00ff88,#00cc66)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>🐒</div>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px", fontWeight: "bold" }}>MONKEE BIZZ AI</div>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333" }}>SAOS v1.0</div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV.map(n => {
          const a = current === n.path;
          return (
            <a key={n.path} href={n.path} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "7px", marginBottom: "3px", textDecoration: "none", background: a ? "rgba(139,92,246,0.1)" : "transparent", border: a ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent" }}>
              <span style={{ fontSize: "14px" }}>{n.icon}</span>
              <span style={{ fontSize: "12px", color: a ? "#8b5cf6" : "#777", fontWeight: a ? "600" : "400" }}>{n.label}</span>
              {n.path === "/AgentRetention" && pendingCount > 0 && (
                <span style={{ marginLeft: "auto", background: "#8b5cf6", color: "#fff", fontSize: "9px", fontWeight: "bold", padding: "1px 6px", borderRadius: "10px", fontFamily: "monospace" }}>{pendingCount}</span>
              )}
            </a>
          );
        })}
      </nav>
      <div style={{ padding: "12px", borderTop: "1px solid #1a1a1a", fontFamily: "monospace", fontSize: "9px", color: "#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

function StageBadge({ stage }) {
  const colors = {
    satisfaction_check_due: "#8b5cf6",
    review_request_due:     "#f59e0b",
    referral_ask_due:       "#3b82f6",
    upsell_due:             "#00ff88",
    reengage_due:           "#f97316",
    complete:               "#555",
    opted_out:              "#333",
    none:                   "#333",
  };
  const c = colors[stage] || "#555";
  return (
    <span style={{ fontFamily: "monospace", fontSize: "10px", color: c, background: `${c}20`, border: `1px solid ${c}44`, padding: "2px 7px", borderRadius: "4px" }}>
      {STAGE_LABELS[stage] || stage || "—"}
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = { Pending: "#f59e0b", Sent: "#00ff88", Failed: "#ff3333", Responded: "#8b5cf6", Skipped: "#444" };
  const c = colors[status] || "#555";
  return (
    <span style={{ fontFamily: "monospace", fontSize: "10px", color: c, background: `${c}20`, border: `1px solid ${c}44`, padding: "2px 7px", borderRadius: "4px" }}>{status}</span>
  );
}

function DetailPanel({ lead, events, logs, bookings, onClose, onAction }) {
  const [acting, setActing] = useState("");
  const [msg, setMsg] = useState("");

  const leadEvents = events.filter(e => e.lead_id === lead.id)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const leadLogs = logs.filter(l => l.lead_id === lead.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  const nextPending = leadEvents.find(e => e.status === "Pending");

  const act = async (action) => {
    setActing(action);
    setMsg("");
    try {
      await onAction(lead, action, nextPending);
      setMsg("Done ✓");
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
    setActing("");
    setTimeout(() => setMsg(""), 3000);
  };

  const BTN = (label, action, color = "#8b5cf6") => (
    <button onClick={() => act(action)} disabled={!!acting}
      style={{ padding: "7px 12px", background: "transparent", border: `1px solid ${color}44`, color, borderRadius: "6px", cursor: acting ? "not-allowed" : "pointer", fontFamily: "monospace", fontSize: "9px", letterSpacing: "1px" }}>
      {acting === action ? "..." : label}
    </button>
  );

  return (
    <div style={{ position: "fixed", top: 0, right: 0, width: "380px", height: "100vh", background: "#111", borderLeft: "1px solid #1a1a1a", overflowY: "auto", zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#8b5cf6", letterSpacing: "2px" }}>RETENTION DETAIL</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#fff", marginTop: "2px" }}>{lead.name}</div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "18px", cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ padding: "16px 18px", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <StageBadge stage={lead.retention_stage} />
          {lead.review_received && <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", background: "#00ff8820", border: "1px solid #00ff8844", padding: "2px 7px", borderRadius: "4px" }}>Review ✓</span>}
          {lead.retention_opt_out && <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#ff3333", background: "#ff333320", border: "1px solid #ff333344", padding: "2px 7px", borderRadius: "4px" }}>Opted Out</span>}
        </div>
        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>{lead.email} · {lead.phone}</div>
        {lead.last_completed_booking_at && (
          <div style={{ fontSize: "10px", color: "#444", fontFamily: "monospace" }}>
            Last Completed: {new Date(lead.last_completed_booking_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#8b5cf6", letterSpacing: "2px", marginBottom: "12px" }}>RETENTION TIMELINE</div>
        {["satisfaction_check", "review_request", "referral_ask", "upsell_trigger", "past_client_reengage"].map(type => {
          const evt = leadEvents.find(e => e.event_type === type);
          return (
            <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #0f0f0f" }}>
              <span style={{ fontSize: "11px", color: "#888" }}>{EVENT_LABELS[type]}</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {evt ? (
                  <>
                    <StatusBadge status={evt.status} />
                    <span style={{ fontSize: "10px", color: "#444", fontFamily: "monospace" }}>
                      {evt.sent_at ? new Date(evt.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) :
                        evt.scheduled_at ? new Date(evt.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: "10px", color: "#2a2a2a", fontFamily: "monospace" }}>NOT SCHEDULED</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#8b5cf6", letterSpacing: "2px", marginBottom: "10px" }}>ACTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {BTN("MARK RESPONDED",        "responded",    "#00ff88")}
          {BTN("RE-ENGAGE CLIENT",      "reengage",     "#8b5cf6")}
          {!lead.review_received && BTN("MARK REVIEW RECEIVED", "review", "#f59e0b")}
          {!lead.retention_opt_out && BTN("OPT OUT", "optout", "#ff3333")}
        </div>
        {msg && <div style={{ marginTop: "10px", fontSize: "11px", color: "#00ff88", fontFamily: "monospace" }}>{msg}</div>}
      </div>

      {/* Activity log */}
      <div style={{ padding: "16px 18px", flex: 1 }}>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", letterSpacing: "2px", marginBottom: "10px" }}>ACTIVITY LOG</div>
        {leadLogs.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#2a2a2a", fontFamily: "monospace" }}>NO LOG ENTRIES</div>
        ) : leadLogs.map(l => (
          <div key={l.id} style={{ display: "flex", gap: "10px", padding: "5px 0", borderBottom: "1px solid #0f0f0f" }}>
            <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", whiteSpace: "nowrap", flexShrink: 0 }}>
              {l.created_at ? new Date(l.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
            </span>
            <span style={{ fontSize: "11px", color: "#555" }}>{l.event}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AgentRetention() {
  const [leads, setLeads] = useState([]);
  const [events, setEvents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const load = async () => {
    setLoading(true);
    const [l, e, al, b, s] = await Promise.all([
      Lead.list(), RetentionEvents.list(), ActivityLog.list(), Booking.list(), AppSettings.list()
    ]);
    setLeads(l);
    setEvents(e);
    setLogs(al);
    setBookings(b);
    const map = {};
    s.forEach(r => { map[r.key] = r.value; });
    setSettings(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Only show leads that have retention events
  const retentionLeads = leads.filter(lead => {
    if (lead.retention_opt_out) return false;
    return events.some(e => e.lead_id === lead.id);
  });

  // Compute next pending event per lead
  const getNextEvent = (lead) => {
    const leadEvents = events
      .filter(e => e.lead_id === lead.id && e.status === "Pending")
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    return leadEvents[0] || null;
  };

  const isOverdue = (evt) => evt && new Date(evt.scheduled_at) < new Date();

  const sorted = [...retentionLeads].sort((a, b) => {
    const na = getNextEvent(a);
    const nb = getNextEvent(b);
    if (na && nb) return new Date(na.scheduled_at) - new Date(nb.scheduled_at);
    if (na) return -1;
    if (nb) return 1;
    return new Date(b.last_completed_booking_at || 0) - new Date(a.last_completed_booking_at || 0);
  });

  const pendingCount = events.filter(e => e.status === "Pending").length;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sentThisWeek = events.filter(e => e.status === "Sent" && e.sent_at && new Date(e.sent_at) >= weekAgo).length;
  const reviewsRequested = events.filter(e => e.event_type === "review_request" && e.status === "Sent").length;
  const reengaged = events.filter(e => e.status === "Responded").length;
  const overdueCount = events.filter(e => e.status === "Pending" && new Date(e.scheduled_at) < now).length;
  const retentionEnabled = settings["retention_enabled"] !== "false";

  const handleAction = async (lead, action, nextEvt) => {
    if (action === "responded") {
      await markRetentionResponded({ lead_id: lead.id, event_id: nextEvt?.id });
    } else if (action === "reengage") {
      const res = await manualRetentionReengage({ lead_id: lead.id });
      if (res.data?.blocked) {
        const reasons = { opted_out: "Client opted out", recent_send: "Recent send — 2hr gap enforced", client_rebooked: "Client has rebooked", already_pending: "Manual re-engage already pending", no_completed_booking: "No completed booking found" };
        showToast(`Blocked: ${reasons[res.data.reason] || res.data.reason}`);
        return;
      }
    } else if (action === "review") {
      await Lead.update(lead.id, { review_received: true });
      await ActivityLog.create({ lead_id: lead.id, event: "Review marked as received by admin", created_at: new Date().toISOString() });
    } else if (action === "optout") {
      const pendingEvts = events.filter(e => e.lead_id === lead.id && e.status === "Pending");
      await Promise.all(pendingEvts.map(e => RetentionEvents.update(e.id, { status: "Skipped" })));
      await Lead.update(lead.id, { retention_opt_out: true, retention_stage: "opted_out" });
      await ActivityLog.create({ lead_id: lead.id, event: "Client opted out of retention — all pending events cancelled", created_at: new Date().toISOString() });
      setSelectedLead(null);
    }
    await load();
    showToast("Action completed ✓");
  };

  const TH = { padding: "9px 12px", textAlign: "left", fontFamily: "monospace", fontSize: "8px", color: "#333", letterSpacing: "1px", fontWeight: "normal" };
  const TD = { padding: "10px 12px", fontSize: "12px", color: "#ddd" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <Sidebar pendingCount={pendingCount} />

      <main style={{ flex: 1, padding: "28px", overflowY: "auto", marginRight: selectedLead ? "380px" : "0", transition: "margin-right 0.2s" }}>
        {/* Header */}
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#8b5cf6", letterSpacing: "3px", marginBottom: "5px" }}>AGENT 04</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", margin: 0 }}>Retention Agent</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: retentionEnabled ? "#00ff88" : "#f59e0b" }} />
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: retentionEnabled ? "#00ff88" : "#f59e0b" }}>
              {retentionEnabled ? "Active" : "Paused"}
            </span>
          </div>
        </div>
        <p style={{ color: "#555", fontSize: "12px", marginBottom: "20px" }}>Reviews, referrals, upsells, and client re-engagement.</p>

        {toast && (
          <div style={{ background: "#8b5cf612", border: "1px solid #8b5cf644", borderRadius: "7px", padding: "9px 14px", marginBottom: "14px", fontFamily: "monospace", fontSize: "11px", color: "#8b5cf6" }}>
            {toast}
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {[
            ["PENDING",           pendingCount,     "#8b5cf6"],
            ["SENT THIS WEEK",    sentThisWeek,     "#00ff88"],
            ["REVIEWS REQUESTED", reviewsRequested, "#f59e0b"],
            ["RE-ENGAGED",        reengaged,        "#3b82f6"],
            ["OVERDUE",           overdueCount,     overdueCount > 0 ? "#ff3333" : "#444"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: "#111", border: `1px solid ${color}22`, borderRadius: "9px", padding: "12px 16px", minWidth: "110px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#444", letterSpacing: "2px", marginBottom: "3px" }}>{label}</div>
              <div style={{ fontSize: "26px", fontWeight: "700", color, lineHeight: 1 }}>{loading ? "…" : val}</div>
            </div>
          ))}
        </div>

        {/* Flow Diagram */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#8b5cf6", letterSpacing: "2px", marginBottom: "18px" }}>RETENTION PIPELINE</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0", overflowX: "auto", paddingBottom: "4px" }}>
            {[
              { icon: "✅", label: "Completed\nBooking", sub: "Trigger",             color: "#00ff88", arrow: true },
              { icon: "😊", label: "Satisfaction\nCheck",  sub: "Day 2",              color: "#8b5cf6", arrow: true },
              { icon: "⭐", label: "Review\nRequest",      sub: "Day 5",              color: "#f59e0b", arrow: true, note: "Skipped if\nreview received" },
              { icon: "🤝", label: "Referral\nAsk",        sub: "Day 12",             color: "#3b82f6", arrow: true },
              { icon: "🚀", label: "Upsell\nOffer",        sub: "Day 26",             color: "#f97316", arrow: true },
              { icon: "🔁", label: "Re-Engage",            sub: "Day 71",             color: "#ec4899", arrow: false },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "80px" }}>
                  <div style={{ width: "44px", height: "44px", background: `${step.color}18`, border: `1px solid ${step.color}44`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "6px" }}>{step.icon}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "9px", color: step.color, textAlign: "center", whiteSpace: "pre-line", lineHeight: "1.4", fontWeight: "600" }}>{step.label}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#444", marginTop: "2px" }}>{step.sub}</div>
                  {step.note && <div style={{ fontFamily: "monospace", fontSize: "7px", color: "#555", marginTop: "4px", textAlign: "center", whiteSpace: "pre-line", lineHeight: "1.3", background: "#1a1a1a", padding: "2px 5px", borderRadius: "3px" }}>{step.note}</div>}
                </div>
                {step.arrow && <div style={{ color: "#2a2a2a", fontSize: "18px", margin: "0 6px", marginBottom: "18px" }}>→</div>}
              </div>
            ))}
          </div>

          {/* Side rails */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            {[
              { icon: "🔒", label: "Client Rebooks",   desc: "All events stopped → Agent 2 takes over → Clean handoff",    color: "#00ff88" },
              { icon: "💬", label: "Client Responds",  desc: "All remaining cancelled → Admin alerted immediately",         color: "#f59e0b" },
              { icon: "🔄", label: "New Completion",   desc: "Cycle resets cleanly → Fresh sequence created",               color: "#8b5cf6" },
              { icon: "📊", label: "Daily Summary",    desc: "8:15 AM every day → Full queue report sent to admin",          color: "#3b82f6" },
            ].map(rail => (
              <div key={rail.label} style={{ flex: "1", minWidth: "160px", background: "#0f0f0f", border: `1px solid ${rail.color}22`, borderRadius: "8px", padding: "10px 12px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "16px", lineHeight: 1, marginTop: "1px" }}>{rail.icon}</span>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: "9px", color: rail.color, letterSpacing: "1px", marginBottom: "3px" }}>{rail.label}</div>
                  <div style={{ fontSize: "10px", color: "#555", lineHeight: "1.5" }}>{rail.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#8b5cf6", letterSpacing: "2px" }}>RETENTION QUEUE</span>
            <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#333" }}>{sorted.length} clients</span>
            <button onClick={load} style={{ marginLeft: "auto", background: "transparent", border: "1px solid #1a1a1a", color: "#444", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "9px" }}>↺ REFRESH</button>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>LOADING...</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>♻️</div>
              <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#333", letterSpacing: "2px" }}>NO RETENTION EVENTS YET</div>
              <div style={{ fontSize: "11px", color: "#2a2a2a", marginTop: "6px" }}>Completed clients will appear here automatically.</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    {["CLIENT", "PHONE", "SCORE", "LAST BOOKING", "STAGE", "NEXT EVENT", "NEXT DATE", "ACTIONS"].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(lead => {
                    const nextEvt = getNextEvent(lead);
                    const overdue = isOverdue(nextEvt);
                    const rowBg = overdue ? "#1a0a0a" : "transparent";
                    return (
                      <tr key={lead.id}
                        onClick={() => setSelectedLead(lead.id === selectedLead?.id ? null : lead)}
                        style={{ borderBottom: "1px solid #0f0f0f", cursor: "pointer", background: rowBg }}
                      >
                        <td style={TD}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {overdue && <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#ff3333", background: "#ff333320", border: "1px solid #ff333344", padding: "1px 5px", borderRadius: "3px" }}>OVERDUE</span>}
                            <span style={{ fontWeight: "500" }}>{lead.name}</span>
                          </div>
                        </td>
                        <td style={{ ...TD, color: "#666" }}>{lead.phone || "—"}</td>
                        <td style={TD}>
                          {lead.score ? (
                            <span style={{ fontFamily: "monospace", fontSize: "10px", color: lead.score === "HOT" ? "#ff3333" : lead.score === "WARM" ? "#ffdd00" : "#888", background: lead.score === "HOT" ? "#ff000020" : lead.score === "WARM" ? "#ffdd0020" : "#88888820", border: `1px solid ${lead.score === "HOT" ? "#ff333344" : lead.score === "WARM" ? "#ffdd0044" : "#88888844"}`, padding: "2px 7px", borderRadius: "4px" }}>{lead.score}</span>
                          ) : "—"}
                        </td>
                        <td style={{ ...TD, color: "#666", fontFamily: "monospace", fontSize: "11px" }}>
                          {lead.last_completed_booking_at ? new Date(lead.last_completed_booking_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td style={TD}><StageBadge stage={lead.retention_stage} /></td>
                        <td style={{ ...TD, color: "#888" }}>{nextEvt ? EVENT_LABELS[nextEvt.event_type] : "—"}</td>
                        <td style={{ ...TD, color: overdue ? "#ff3333" : "#666", fontFamily: "monospace", fontSize: "11px" }}>
                          {nextEvt ? new Date(nextEvt.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </td>
                        <td style={TD} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <button onClick={() => handleAction(lead, "responded", nextEvt)}
                              style={{ padding: "4px 8px", background: "transparent", border: "1px solid #00ff8844", color: "#00ff88", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "8px" }}>
                              RESPONDED
                            </button>
                            <button onClick={() => handleAction(lead, "reengage", nextEvt)}
                              style={{ padding: "4px 8px", background: "transparent", border: "1px solid #8b5cf644", color: "#8b5cf6", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "8px" }}>
                              RE-ENGAGE
                            </button>
                            {lead.retention_stage === "review_request_due" && !lead.review_received && (
                              <button onClick={() => handleAction(lead, "review", nextEvt)}
                                style={{ padding: "4px 8px", background: "transparent", border: "1px solid #f59e0b44", color: "#f59e0b", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "8px" }}>
                                REVIEW ✓
                              </button>
                            )}
                            <button onClick={() => handleAction(lead, "optout", nextEvt)}
                              style={{ padding: "4px 8px", background: "transparent", border: "1px solid #ff333344", color: "#ff3333", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace", fontSize: "8px" }}>
                              OPT OUT
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedLead && (
        <DetailPanel
          lead={selectedLead}
          events={events}
          logs={logs}
          bookings={bookings}
          onClose={() => setSelectedLead(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}