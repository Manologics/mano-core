import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const Lead = base44.entities.Lead;
const ActivityLog = base44.entities.ActivityLog;

const NAV = [
  { label: "Command Center", path: "/CommandCenter", icon: "⚡" },
  { label: "Agent 1: Intake", path: "/AgentIntake", icon: "🤖" },
  { label: "Agent 2: Booking", path: "/AgentBooking", icon: "🤖" },
  { label: "Agent 3: Follow-Up", path: "/AgentFollowUp", icon: "🤖" },
  { label: "Agent 4: Retention", path: "/AgentRetention", icon: "🤖" },
  { label: "Agent 5: Ops", path: "/AgentOps", icon: "🤖" },
  { label: "Settings", path: "/Settings", icon: "⚙️" },
  { label: "📋 Lead Form", path: "/LeadForm", icon: "" },
];

function Sidebar() {
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
          const a = n.path === "/AgentOps";
          return (
            <a key={n.path} href={n.path} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "7px", marginBottom: "3px", textDecoration: "none", background: a ? "rgba(0,255,136,0.1)" : "transparent", border: a ? "1px solid rgba(0,255,136,0.25)" : "1px solid transparent" }}>
              <span style={{ fontSize: "14px" }}>{n.icon}</span>
              <span style={{ fontSize: "12px", color: a ? "#00ff88" : "#777", fontWeight: a ? "600" : "400" }}>{n.label}</span>
            </a>
          );
        })}
      </nav>
      <div style={{ padding: "12px", borderTop: "1px solid #1a1a1a", fontFamily: "monospace", fontSize: "9px", color: "#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

function StatCard({ label, value, color = "#00ff88", sub }) {
  return (
    <div style={{ background: "#111", border: `1px solid ${color}22`, borderRadius: "10px", padding: "16px 18px", flex: 1, minWidth: "120px" }}>
      <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: "700", color, lineHeight: 1, marginBottom: "2px" }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "#333" }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, badge, badgeColor = "#00ff88", children }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "2px" }}>{title}</span>
        {badge !== undefined && (
          <span style={{ fontFamily: "monospace", fontSize: "9px", color: badgeColor, background: `${badgeColor}18`, border: `1px solid ${badgeColor}44`, padding: "2px 8px", borderRadius: "10px" }}>{badge}</span>
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

function Empty() {
  return <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#2a2a2a", textAlign: "center", padding: "20px 0" }}>No activity yet</div>;
}

function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
}

function isError(event = "") {
  const e = event.toLowerCase();
  return e.includes("sms failed") || e.includes("webhook error") || e.includes("failed") || e.includes("error");
}

export default function AgentOps() {
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ActivityLog.list("-created_at", 200),
      Lead.list(),
    ]).then(([al, ls]) => {
      setLogs(al);
      setLeads(ls);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date))
    .slice(0, 25);

  const errorLogs = logs.filter(l => isError(l.event));

  const escalatedLeads = leads.filter(l => l.escalation_reason);
  const optedOutLeads = leads.filter(l => l.opted_out);

  const leadsToday = leads.filter(l => (l.created_date || "").startsWith(today)).length;
  const smsSentToday = logs.filter(l => (l.created_at || "").startsWith(today) && (l.event || "").toLowerCase().includes("sms sent")).length;
  const smsFailedToday = logs.filter(l => (l.created_at || "").startsWith(today) && (l.event || "").toLowerCase().includes("sms failed")).length;
  const escalationsToday = leads.filter(l => (l.last_escalation_at || "").startsWith(today)).length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", padding: "24px", maxWidth: "1100px" }}>
        {/* Header */}
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "3px", marginBottom: "5px" }}>AGENT 05</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px" }}>Ops Dashboard</h1>
        <p style={{ color: "#555", fontSize: "12px", marginBottom: "22px" }}>Real-time monitoring of Mano's actions, errors, and escalations.</p>

        {/* System Health */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
          <StatCard label="TOTAL LEADS" value={loading ? "…" : leads.length} color="#00ff88" />
          <StatCard label="LEADS TODAY" value={loading ? "…" : leadsToday} color="#00ff88" />
          <StatCard label="SMS SENT TODAY" value={loading ? "…" : smsSentToday} color="#00aaff" />
          <StatCard label="SMS FAILED TODAY" value={loading ? "…" : smsFailedToday} color={smsFailedToday > 0 ? "#ff3333" : "#555"} />
          <StatCard label="ESCALATIONS TODAY" value={loading ? "…" : escalationsToday} color={escalationsToday > 0 ? "#ffaa00" : "#555"} />
        </div>

        {/* Failed SMS / Errors */}
        <Panel title="ERRORS & FAILED SMS" badge={errorLogs.length} badgeColor="#ff3333">
          {errorLogs.length === 0 ? <Empty /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {errorLogs.slice(0, 20).map((l, i) => (
                <div key={l.id || i} style={{ display: "flex", gap: "12px", padding: "8px 10px", background: "#1a0808", border: "1px solid #ff333333", borderLeft: "3px solid #ff3333", borderRadius: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#cc4444", whiteSpace: "nowrap", flexShrink: 0, marginTop: "1px" }}>{formatTime(l.created_at || l.created_date)}</span>
                  <span style={{ fontSize: "12px", color: "#ff7777", flex: 1, minWidth: "200px" }}>{l.event}</span>
                  {l.lead_id && l.lead_id !== "system" && <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#552222" }}>ID: {l.lead_id.slice(0, 8)}</span>}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Escalations */}
        <Panel title="ESCALATIONS" badge={escalatedLeads.length} badgeColor="#ffaa00">
          {escalatedLeads.length === 0 ? <Empty /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    {["NAME", "PHONE", "REASON", "URGENCY", "ESCALATED AT"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontFamily: "monospace", fontSize: "8px", color: "#444", letterSpacing: "1px", fontWeight: "normal" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {escalatedLeads.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #0f0f0f" }}>
                      <td style={{ padding: "9px 10px", fontSize: "12px", color: "#ddd", fontWeight: "500" }}>{l.name}</td>
                      <td style={{ padding: "9px 10px", fontSize: "11px", color: "#888" }}>{l.phone || "—"}</td>
                      <td style={{ padding: "9px 10px", fontSize: "11px", color: "#ffaa00", maxWidth: "240px" }}>{l.escalation_reason}</td>
                      <td style={{ padding: "9px 10px" }}>
                        {l.urgency && <span style={{ fontFamily: "monospace", fontSize: "9px", color: l.urgency === "high" ? "#ff3333" : l.urgency === "medium" ? "#ffaa00" : "#888", background: l.urgency === "high" ? "#ff000020" : l.urgency === "medium" ? "#ffaa0020" : "#88888820", border: `1px solid ${l.urgency === "high" ? "#ff333344" : l.urgency === "medium" ? "#ffaa0044" : "#88888844"}`, padding: "2px 7px", borderRadius: "4px" }}>{l.urgency.toUpperCase()}</span>}
                      </td>
                      <td style={{ padding: "9px 10px", fontFamily: "monospace", fontSize: "9px", color: "#444" }}>{formatTime(l.last_escalation_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Opted-Out Leads */}
        <Panel title="OPTED-OUT LEADS" badge={optedOutLeads.length} badgeColor="#888">
          {optedOutLeads.length === 0 ? <Empty /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {optedOutLeads.map(l => (
                <div key={l.id} style={{ display: "flex", gap: "16px", padding: "10px 12px", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ minWidth: "130px" }}>
                    <div style={{ fontSize: "12px", color: "#ddd", fontWeight: "500" }}>{l.name}</div>
                    <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{l.phone || "—"}</div>
                  </div>
                  <div style={{ flex: 1, fontSize: "11px", color: "#666", fontStyle: "italic", minWidth: "180px" }}>
                    {l.last_message ? `"${l.last_message.slice(0, 120)}${l.last_message.length > 120 ? "…" : ""}"` : "No message"}
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", background: "#ffffff08", padding: "2px 8px", borderRadius: "4px", whiteSpace: "nowrap" }}>STOP</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Recent Activity Log */}
        <Panel title="RECENT ACTIVITY LOG" badge={`${recentLogs.length} entries`} badgeColor="#00ff88">
          {recentLogs.length === 0 ? <Empty /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {recentLogs.map((l, i) => {
                const err = isError(l.event);
                return (
                  <div key={l.id || i} style={{ display: "flex", gap: "12px", padding: "7px 10px", background: err ? "#1a0808" : "#0d0d0d", borderLeft: `2px solid ${err ? "#ff3333" : "#1a1a1a"}`, borderRadius: "5px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "9px", color: err ? "#cc4444" : "#333", whiteSpace: "nowrap", flexShrink: 0, marginTop: "1px" }}>{formatTime(l.created_at || l.created_date)}</span>
                    <span style={{ fontSize: "11px", color: err ? "#ff7777" : "#666", flex: 1, minWidth: "200px" }}>{l.event}</span>
                    {l.lead_id && l.lead_id !== "system" && (
                      <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#2a2a2a", whiteSpace: "nowrap" }}>{l.lead_id.slice(0, 8)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </main>
    </div>
  );
}