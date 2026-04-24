import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const Lead = base44.entities.Lead;
const ActivityLog = base44.entities.ActivityLog;

// ─── STYLE CONSTANTS ──────────────────────────────────────────────────────────
const GOLD = "#f5c518";
const RED = "#e03030";
const GREEN = "#00ff88";
const BLUE = "#00aaff";
const ORANGE = "#ffaa00";
const BG = "#080808";
const CARD = "#111111";
const BORDER = "#1e1e1e";

const NAV = [
  { label: "Command Center", path: "/CommandCenter", icon: "⚡" },
  { label: "Agent 1: Intake", path: "/AgentIntake", icon: "🤖" },
  { label: "Agent 2: Booking", path: "/AgentBooking", icon: "🤖" },
  { label: "Agent 3: Follow-Up", path: "/AgentFollowUp", icon: "🤖" },
  { label: "Agent 4: Retention", path: "/AgentRetention", icon: "🤖" },
  { label: "Agent 5: Ops", path: "/agent-ops", icon: "🤖" },
  { label: "Settings", path: "/Settings", icon: "⚙️" },
  { label: "📋 Lead Form", path: "/LeadForm", icon: "" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmt(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
}

function fmtCurrency(n) {
  if (!n && n !== 0) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function isErrorEvent(ev = "") {
  const e = ev.toLowerCase();
  return (
    e.includes("failed") || e.includes("error") || e.includes("fatal") ||
    e.includes("exception") || e.includes("timeout")
  );
}

function classifyFailure(ev = "") {
  const e = ev.toLowerCase();
  if (e.includes("sms")) return "SMS";
  if (e.includes("webhook")) return "WEBHOOK";
  if (e.includes("stripe") || e.includes("payment")) return "STRIPE";
  if (e.includes("booking") || e.includes("calendly")) return "BOOKING";
  if (e.includes("voice") || e.includes("twilio") || e.includes("call")) return "VOICE";
  if (e.includes("lead capture") || e.includes("submitlead") || e.includes("landing")) return "LEAD CAPTURE";
  return "SYSTEM";
}

function failureColor(type) {
  const map = {
    SMS: RED, WEBHOOK: ORANGE, STRIPE: GOLD,
    BOOKING: BLUE, VOICE: "#cc88ff", "LEAD CAPTURE": RED, SYSTEM: "#888",
  };
  return map[type] || "#888";
}

const PIPELINE_STATUSES = [
  "New", "Action Required", "Follow Up", "Nurture",
  "Contacted", "Appointment Requested", "Booked",
  "Closed — Won", "Closed — No Response",
];

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function Sidebar() {
  const current = window.location.pathname;
  return (
    <aside style={{
      width: "220px", background: "#0c0c0c",
      borderRight: `1px solid ${BORDER}`,
      display: "flex", flexDirection: "column", flexShrink: 0, minHeight: "100vh",
    }}>
      <div style={{
        padding: "18px 14px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{
          width: "32px", height: "32px",
          background: `linear-gradient(135deg,${GOLD},#c9a000)`,
          borderRadius: "8px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "16px",
          boxShadow: `0 0 14px ${GOLD}44`,
        }}>🐒</div>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: GOLD, letterSpacing: "2px", fontWeight: "bold" }}>MONKEE BIZZ AI</div>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333" }}>SAOS v1.0</div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV.map(n => {
          const active = current === n.path || (n.path === "/agent-ops" && current === "/AgentOps");
          return (
            <a key={n.path} href={n.path} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "9px 10px", borderRadius: "7px", marginBottom: "3px",
              textDecoration: "none",
              background: active ? `${GOLD}14` : "transparent",
              border: active ? `1px solid ${GOLD}33` : "1px solid transparent",
            }}>
              <span style={{ fontSize: "14px" }}>{n.icon}</span>
              <span style={{ fontSize: "12px", color: active ? GOLD : "#666", fontWeight: active ? "600" : "400" }}>{n.label}</span>
            </a>
          );
        })}
      </nav>
      <div style={{ padding: "12px", borderTop: `1px solid ${BORDER}`, fontFamily: "monospace", fontSize: "9px", color: "#2a2a2a" }}>
        SAOS BUILD 1 · AGENT 05
      </div>
    </aside>
  );
}

function StatCard({ label, value, color = GREEN, sub, icon }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${color}22`,
      borderRadius: "12px", padding: "18px 20px",
      flex: "1 1 140px", minWidth: "130px",
      boxShadow: `0 0 20px ${color}0a`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px" }}>{label}</div>
        {icon && <span style={{ fontSize: "16px", opacity: 0.6 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: "30px", fontWeight: "700", color, lineHeight: 1, marginBottom: "4px" }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, badge, badgeColor = GREEN, children, accent }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${accent || BORDER}`,
      borderRadius: "14px", overflow: "hidden", marginBottom: "22px",
    }}>
      <div style={{
        padding: "13px 18px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", gap: "10px",
        background: accent ? `${accent}08` : "transparent",
      }}>
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: accent || GREEN, letterSpacing: "2px", fontWeight: "700" }}>{title}</span>
        {badge !== undefined && (
          <span style={{
            fontFamily: "monospace", fontSize: "9px",
            color: badgeColor, background: `${badgeColor}18`,
            border: `1px solid ${badgeColor}44`,
            padding: "2px 9px", borderRadius: "10px",
          }}>{badge}</span>
        )}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

function Empty({ msg = "No data yet" }) {
  return (
    <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#2a2a2a", textAlign: "center", padding: "28px 0" }}>
      {msg}
    </div>
  );
}

function UrgencyBadge({ urgency }) {
  const map = {
    high: { c: RED, bg: `${RED}20` },
    medium: { c: ORANGE, bg: `${ORANGE}20` },
    low: { c: "#888", bg: "#88888820" },
  };
  const s = map[urgency] || map.low;
  return (
    <span style={{
      fontFamily: "monospace", fontSize: "9px", fontWeight: "700",
      color: s.c, background: s.bg,
      border: `1px solid ${s.c}55`, padding: "2px 7px", borderRadius: "4px",
    }}>{(urgency || "—").toUpperCase()}</span>
  );
}

function SecurityBadge({ flag }) {
  const color = flag === "spam" ? "#888" : flag === "legal_threat" ? RED : flag === "angry" ? ORANGE : GOLD;
  return (
    <span style={{
      fontFamily: "monospace", fontSize: "9px",
      color, background: `${color}18`,
      border: `1px solid ${color}44`,
      padding: "2px 7px", borderRadius: "4px",
    }}>{(flag || "—").toUpperCase()}</span>
  );
}

function RecommendedAction({ lead }) {
  if (lead.security_flag === "legal_threat") return <span style={{ color: RED, fontSize: "11px" }}>🚨 Contact lawyer immediately</span>;
  if (lead.security_flag === "angry") return <span style={{ color: ORANGE, fontSize: "11px" }}>📞 Manual call required</span>;
  if (lead.security_flag === "spam") return <span style={{ color: "#666", fontSize: "11px" }}>🚫 Block & ignore</span>;
  if (lead.urgency === "high") return <span style={{ color: GOLD, fontSize: "11px" }}>⚡ Call within 1 hour</span>;
  return <span style={{ color: "#555", fontSize: "11px" }}>👁 Monitor</span>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AgentOps() {
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      ActivityLog.list("-created_date", 200),
      Lead.list(),
    ]).then(([al, ls]) => {
      setLogs(al);
      setLeads(ls);
      setLastRefresh(new Date());
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [load]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date)
  );
  const recentLogs = sortedLogs.slice(0, 50);
  const errorLogs = sortedLogs.filter(l => isErrorEvent(l.event));

  // System health
  const leadsToday = leads.filter(l => (l.created_date || "").startsWith(today)).length;
  const smsSentToday = logs.filter(l =>
    (l.created_at || l.created_date || "").startsWith(today) &&
    (l.event || "").toLowerCase().includes("sms sent")
  ).length;
  const smsFailedToday = logs.filter(l =>
    (l.created_at || l.created_date || "").startsWith(today) &&
    (l.event || "").toLowerCase().includes("sms failed")
  ).length;
  const escalationsToday = leads.filter(l => (l.last_escalation_at || "").startsWith(today)).length;
  const optedOutLeads = leads.filter(l => l.opted_out);
  const closedWon = leads.filter(l => l.status === "Closed — Won");

  // Pipeline snapshot
  const pipelineGroups = PIPELINE_STATUSES.map(status => ({
    status,
    leads: leads.filter(l => l.status === status),
  }));

  // Escalations (security_flag OR escalation_reason)
  const escalatedLeads = leads.filter(l => l.escalation_reason || l.security_flag);

  // Failed automations
  const failedLogs = errorLogs.map(l => ({
    ...l,
    failureType: classifyFailure(l.event),
  }));

  // ROI / Revenue panel
  const calcLeads = leads.filter(l => l.missed_calls_per_week || l.monthly_loss);
  const totalMonthlyLoss = calcLeads.reduce((s, l) => s + (l.monthly_loss || 0), 0);
  const avgMonthlyLoss = calcLeads.length > 0 ? totalMonthlyLoss / calcLeads.length : 0;
  const closedRevenue = closedWon.reduce((s, l) => s + (l.average_job_value || 0), 0);

  // Compliance panel
  const helpRequests = logs.filter(l => (l.event || "").toLowerCase().includes("help request"));
  const stopRequests = logs.filter(l => (l.event || "").toLowerCase().includes("stop") && (l.event || "").toLowerCase().includes("compliance"));
  const skippedDueToOptOut = logs.filter(l => (l.event || "").toLowerCase().includes("opted-out") || (l.event || "").toLowerCase().includes("opt-out"));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Sidebar — hidden on very small screens */}
      <div style={{ display: "flex" }}>
        <Sidebar />
      </div>

      <main style={{ flex: 1, overflow: "auto", padding: "clamp(16px,3vw,32px)", maxWidth: "1300px" }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: GOLD, letterSpacing: "3px", marginBottom: "5px" }}>AGENT 05 — OPS REPORT</div>
            <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: "800", color: "#fff", margin: "0 0 4px", letterSpacing: "0.5px" }}>
              Mano Operations Dashboard
            </h1>
            <p style={{ color: "#555", fontSize: "12px", margin: 0 }}>
              Real-time monitoring · Activity · Errors · Revenue · Compliance
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {lastRefresh && (
              <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#333" }}>
                Updated {fmt(lastRefresh)}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              style={{
                background: "transparent", border: `1px solid ${GOLD}44`,
                color: loading ? "#444" : GOLD, padding: "7px 14px",
                borderRadius: "7px", cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "monospace", fontSize: "10px", letterSpacing: "1px",
              }}
            >
              {loading ? "LOADING…" : "↺ REFRESH"}
            </button>
          </div>
        </div>

        {/* ── 1. SYSTEM HEALTH CARDS ── */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "26px" }}>
          <StatCard label="TOTAL LEADS" value={loading ? "…" : leads.length} color={GREEN} icon="👥" />
          <StatCard label="LEADS TODAY" value={loading ? "…" : leadsToday} color={GREEN} icon="📥" />
          <StatCard label="SMS SENT TODAY" value={loading ? "…" : smsSentToday} color={BLUE} icon="📱" />
          <StatCard
            label="SMS FAILED"
            value={loading ? "…" : smsFailedToday}
            color={smsFailedToday > 0 ? RED : "#333"}
            icon="⚠️"
            sub={smsFailedToday > 0 ? "Needs attention" : "All clear"}
          />
          <StatCard
            label="ESCALATIONS TODAY"
            value={loading ? "…" : escalationsToday}
            color={escalationsToday > 0 ? ORANGE : "#333"}
            icon="🚨"
          />
          <StatCard
            label="OPT-OUTS"
            value={loading ? "…" : optedOutLeads.length}
            color={optedOutLeads.length > 0 ? ORANGE : "#333"}
            icon="🚫"
          />
          <StatCard
            label="CLOSED — WON"
            value={loading ? "…" : closedWon.length}
            color={GOLD}
            icon="💰"
            sub={closedRevenue > 0 ? fmtCurrency(closedRevenue) : ""}
          />
          <StatCard
            label="CALCULATOR LEADS"
            value={loading ? "…" : calcLeads.length}
            color={GOLD}
            icon="📊"
            sub={calcLeads.length > 0 ? `${fmtCurrency(avgMonthlyLoss)} avg loss` : ""}
          />
        </div>

        {/* ── 2. LIVE ACTIVITY FEED ── */}
        <Panel title="LIVE ACTIVITY FEED" badge={`${recentLogs.length} entries`} badgeColor={GREEN} accent={GREEN}>
          {recentLogs.length === 0 ? <Empty /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "420px", overflowY: "auto" }}>
              {recentLogs.map((l, i) => {
                const err = isErrorEvent(l.event);
                return (
                  <div key={l.id || i} style={{
                    display: "flex", gap: "10px", padding: "8px 10px",
                    background: err ? "#150505" : "#0d0d0d",
                    borderLeft: `3px solid ${err ? RED : "#1e1e1e"}`,
                    borderRadius: "5px", flexWrap: "wrap", alignItems: "flex-start",
                  }}>
                    <span style={{ fontFamily: "monospace", fontSize: "9px", color: err ? "#cc4444" : "#333", whiteSpace: "nowrap", flexShrink: 0, paddingTop: "1px", minWidth: "110px" }}>
                      {fmt(l.created_at || l.created_date)}
                    </span>
                    <span style={{ fontSize: "11px", color: err ? "#ff7777" : "#777", flex: 1, minWidth: "200px", lineHeight: 1.4 }}>
                      {l.event}
                    </span>
                    {l.lead_id && l.lead_id !== "system" && (
                      <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#2a2a2a", whiteSpace: "nowrap" }}>
                        {l.lead_id.slice(0, 8)}
                      </span>
                    )}
                    {err && (
                      <span style={{ fontFamily: "monospace", fontSize: "9px", color: RED, background: `${RED}15`, border: `1px solid ${RED}33`, padding: "1px 6px", borderRadius: "4px" }}>
                        ERROR
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* ── 3. ESCALATIONS PANEL ── */}
        <Panel title="ESCALATIONS & SECURITY FLAGS" badge={escalatedLeads.length} badgeColor={RED} accent={RED}>
          {escalatedLeads.length === 0 ? <Empty msg="No escalations — all clear ✓" /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["NAME", "PHONE", "SECURITY FLAG", "ESCALATION REASON", "URGENCY", "ESCALATED AT", "ACTION"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontFamily: "monospace", fontSize: "8px", color: "#444", letterSpacing: "1px", fontWeight: "normal" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {escalatedLeads.map(l => (
                    <tr key={l.id} style={{ borderBottom: `1px solid #0f0f0f` }}>
                      <td style={{ padding: "10px 10px", fontSize: "12px", color: "#ddd", fontWeight: "600" }}>{l.name}</td>
                      <td style={{ padding: "10px 10px", fontSize: "11px", color: "#777" }}>{l.phone || "—"}</td>
                      <td style={{ padding: "10px 10px" }}>{l.security_flag ? <SecurityBadge flag={l.security_flag} /> : <span style={{ color: "#333", fontSize: "11px" }}>—</span>}</td>
                      <td style={{ padding: "10px 10px", fontSize: "11px", color: ORANGE, maxWidth: "220px" }}>{l.escalation_reason || "—"}</td>
                      <td style={{ padding: "10px 10px" }}><UrgencyBadge urgency={l.urgency} /></td>
                      <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: "9px", color: "#444" }}>{fmt(l.last_escalation_at)}</td>
                      <td style={{ padding: "10px 10px" }}><RecommendedAction lead={l} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ── 4. FAILED AUTOMATION MONITOR ── */}
        <Panel title="FAILED AUTOMATION MONITOR" badge={failedLogs.length} badgeColor={RED} accent={ORANGE}>
          {failedLogs.length === 0 ? <Empty msg="No failures detected ✓" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "360px", overflowY: "auto" }}>
              {failedLogs.slice(0, 50).map((l, i) => {
                const fc = failureColor(l.failureType);
                return (
                  <div key={l.id || i} style={{
                    display: "flex", gap: "10px", padding: "9px 12px",
                    background: "#120808", border: `1px solid ${RED}22`,
                    borderLeft: `3px solid ${fc}`,
                    borderRadius: "7px", flexWrap: "wrap", alignItems: "center",
                  }}>
                    <span style={{
                      fontFamily: "monospace", fontSize: "9px", color: fc,
                      background: `${fc}18`, border: `1px solid ${fc}44`,
                      padding: "2px 7px", borderRadius: "4px", whiteSpace: "nowrap", flexShrink: 0,
                    }}>{l.failureType}</span>
                    <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {fmt(l.created_at || l.created_date)}
                    </span>
                    <span style={{ fontSize: "11px", color: "#ff7777", flex: 1, minWidth: "180px", lineHeight: 1.4 }}>{l.event}</span>
                    {l.lead_id && l.lead_id !== "system" && (
                      <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#333" }}>{l.lead_id.slice(0, 8)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* ── 5. LEAD PIPELINE SNAPSHOT ── */}
        <Panel title="LEAD PIPELINE SNAPSHOT" badge={`${leads.length} total`} badgeColor={GOLD} accent={GOLD}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
            {pipelineGroups.map(({ status, leads: sLeads }) => {
              const isWon = status === "Closed — Won";
              const isLost = status === "Closed — No Response";
              const isHot = status === "Action Required";
              const color = isWon ? GOLD : isLost ? "#555" : isHot ? RED : status === "New" ? GREEN : status === "Booked" ? BLUE : "#888";
              return (
                <div key={status} style={{
                  background: "#0d0d0d", border: `1px solid ${color}22`,
                  borderRadius: "10px", padding: "14px",
                  boxShadow: sLeads.length > 0 && isHot ? `0 0 14px ${RED}18` : "none",
                }}>
                  <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "8px" }}>
                    {status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color, lineHeight: 1, marginBottom: "4px" }}>
                    {loading ? "…" : sLeads.length}
                  </div>
                  <div style={{ fontSize: "10px", color: "#333" }}>leads</div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* ── 6. REVENUE / ROI PANEL ── */}
        <Panel title="REVENUE & ROI INTELLIGENCE" badgeColor={GOLD} accent={GOLD}>
          {calcLeads.length === 0 ? <Empty msg="No calculator submissions yet" /> : (
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ display: "grid", gap: "12px" }}>
                  {[
                    { label: "CALCULATOR SUBMISSIONS", value: calcLeads.length, color: GOLD },
                    { label: "TOTAL MONTHLY LOSS (REPORTED)", value: fmtCurrency(totalMonthlyLoss), color: RED },
                    { label: "AVERAGE MONTHLY LOSS", value: fmtCurrency(avgMonthlyLoss), color: ORANGE },
                    { label: "CLOSED WON REVENUE", value: closedRevenue > 0 ? fmtCurrency(closedRevenue) : "—", color: GOLD },
                    { label: "CLOSED WON LEADS", value: closedWon.length, color: GOLD },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", background: "#0d0d0d",
                      border: `1px solid ${color}22`, borderRadius: "9px",
                    }}>
                      <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "1px" }}>{label}</span>
                      <span style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: "700", color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: "220px" }}>
                <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "10px" }}>TOP CALCULATOR LEADS BY LOSS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[...calcLeads]
                    .sort((a, b) => (b.monthly_loss || 0) - (a.monthly_loss || 0))
                    .slice(0, 8)
                    .map(l => (
                      <div key={l.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", background: "#0d0d0d",
                        border: `1px solid ${BORDER}`, borderRadius: "7px",
                      }}>
                        <div>
                          <div style={{ fontSize: "12px", color: "#ddd", fontWeight: "500" }}>{l.name}</div>
                          <div style={{ fontSize: "10px", color: "#555" }}>{l.missed_calls_per_week ? `${l.missed_calls_per_week} calls/wk` : ""}</div>
                        </div>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", color: RED, fontWeight: "700" }}>
                          {fmtCurrency(l.monthly_loss)}/mo
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* ── 7. COMPLIANCE PANEL ── */}
        <Panel title="COMPLIANCE & OPT-OUT MONITOR" badge={`${optedOutLeads.length} opted out`} badgeColor={ORANGE} accent={ORANGE}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: optedOutLeads.length > 0 ? "20px" : "0" }}>
            {[
              { label: "OPTED-OUT LEADS", value: optedOutLeads.length, color: ORANGE, icon: "🚫" },
              { label: "HELP REQUESTS", value: helpRequests.length, color: BLUE, icon: "❓" },
              { label: "STOP REQUESTS", value: stopRequests.length, color: RED, icon: "🛑" },
              { label: "SKIPPED (OPT-OUT)", value: skippedDueToOptOut.length, color: "#888", icon: "⏭" },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{
                background: "#0d0d0d", border: `1px solid ${color}22`,
                borderRadius: "10px", padding: "16px 18px",
                display: "flex", alignItems: "center", gap: "14px",
              }}>
                <span style={{ fontSize: "24px" }}>{icon}</span>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "26px", fontWeight: "700", color, lineHeight: 1 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {optedOutLeads.length > 0 && (
            <>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", letterSpacing: "2px", marginBottom: "10px" }}>OPTED-OUT LEAD DETAILS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {optedOutLeads.map(l => (
                  <div key={l.id} style={{
                    display: "flex", gap: "14px", padding: "10px 12px",
                    background: "#0f0f0f", border: `1px solid ${BORDER}`,
                    borderLeft: `3px solid ${ORANGE}`, borderRadius: "7px",
                    flexWrap: "wrap", alignItems: "flex-start",
                  }}>
                    <div style={{ minWidth: "130px" }}>
                      <div style={{ fontSize: "12px", color: "#ddd", fontWeight: "600" }}>{l.name}</div>
                      <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{l.phone || "—"}</div>
                    </div>
                    <div style={{ flex: 1, fontSize: "11px", color: "#555", fontStyle: "italic", minWidth: "180px" }}>
                      {l.last_message ? `"${l.last_message.slice(0, 100)}…"` : "No last message"}
                    </div>
                    <span style={{
                      fontFamily: "monospace", fontSize: "9px",
                      color: ORANGE, background: `${ORANGE}18`,
                      border: `1px solid ${ORANGE}44`, padding: "2px 8px",
                      borderRadius: "4px", whiteSpace: "nowrap",
                    }}>STOP — NO SMS</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "20px 0 8px", fontFamily: "monospace", fontSize: "9px", color: "#1e1e1e", letterSpacing: "2px" }}>
          MONKEE BIZZ AI — AGENT 05 OPS REPORT · SAOS BUILD 1
        </div>
      </main>
    </div>
  );
}