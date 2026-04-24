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
      <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", letterSpacing: "2px", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: "700", color, lineHeight: 1, marginBottom: "3px" }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "#333" }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
      <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px" }}>{title}</span>
      {count !== undefined && (
        <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px", padding: "1px 7px" }}>{count}</span>
      )}
    </div>
  );
}

function Empty() {
  return <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#2a2a2a", padding: "20px 0", textAlign: "center" }}>No activity yet</div>;
}

function fmtTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
}

function isError(event) {
  if (!event) return false;
  const lower = event.toLowerCase();
  return lower.includes("sms failed") || lower.includes("webhook error") || lower.includes("failed") || lower.includes("error");
}

export default function AgentOps() {
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([ActivityLog.list("-created_at", 200), Lead.list()])
      .then(([l, ld]) => {
        setLogs(l);
        setLeads(ld);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date))
    .slice(0, 25);

  const errorLogs = logs.filter(l => isError(l.event));

  const escalatedLeads = leads.filter(l => l.escalation_reason);

  const optedOutLeads = leads.filter(l => l.opted_out);

  const leadsToday = leads.filter(l => (l.created_date || "").startsWith(todayStr)).length;

  const smsSentToday = logs.filter(l => {
    const ts = l.created_at || l.created_date || "";
    return ts.startsWith(todayStr) && (l.event || "").toLowerCase().includes("sms sent");
  }).length;

  const smsFailedToday = logs.filter(l => {
    const ts = l.created_at || l.created_date || "";
    return ts.startsWith(todayStr) && (l.event || "").toLowerCase().includes("sms failed");
  }).length;

  const escalationsToday = leads.filter(l => l.last_escalation_at && l.last_escalation_at.startsWith(todayStr)).length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Sidebar — hidden on mobile */}
      <div style={{ display: "flex" }} className="sidebar-wrapper">
        <Sidebar />
      </div>

      <main style={{ flex: 1, overflow: "auto", padding: "clamp(16px, 3vw, 28px)", maxWidth: "1300px" }}>
        {/* Header */}
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "3px", marginBottom: "5px" }}>AGENT 05</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px" }}>Ops & Monitoring</h1>
        <p style={{ color: "#555", fontSize: "12px", marginBottom: "24px" }}>Real-time view of Mano's actions, errors, and escalations.</p>

        {/* System Health */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "32px" }}>
          <StatCard label="TOTAL LEADS" value={loading ? "…" : leads.length} />
          <StatCard label="LEADS TODAY" value={loading ? "…" : leadsToday} color="#00ff88" />
          <StatCard label="SMS SENT TODAY" value={loading ? "…" : smsSentToday} color="#00ccff" />
          <StatCard label="SMS FAILED TODAY" value={loading ? "…" : smsFailedToday} color={smsFailedToday > 0 ? "#ff3333" : "#555"} />
          <StatCard label="ESCALATIONS TODAY" value={loading ? "…" : escalationsToday} color={escalationsToday > 0 ? "#ffaa00" : "#555"} />
        </div>

        {/* Recent Activity Log */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a" }}>
            <SectionHeader title="RECENT ACTIVITY LOG" count={recentLogs.length} />
          </div>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>LOADING...</div>
          ) : recentLogs.length === 0 ? <div style={{ padding: "16px 18px" }}><Empty /></div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    {["TIME", "LEAD ID", "EVENT"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "1px", fontWeight: "normal", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((l, i) => {
                    const err = isError(l.event);
                    return (
                      <tr key={l.id || i} style={{ borderBottom: "1px solid #0f0f0f", background: err ? "#1a0808" : "transparent" }}>
                        <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: "10px", color: "#444", whiteSpace: "nowrap" }}>{fmtTime(l.created_at || l.created_date)}</td>
                        <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: "10px", color: "#444", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.lead_id || "—"}</td>
                        <td style={{ padding: "9px 14px", fontSize: "11px", color: err ? "#ff5555" : "#888", lineHeight: 1.4 }}>{l.event || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Escalations */}
        <div style={{ background: "#111", border: "1px solid #ffaa0022", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a" }}>
            <SectionHeader title="ESCALATIONS" count={escalatedLeads.length} />
          </div>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>LOADING...</div>
          ) : escalatedLeads.length === 0 ? <div style={{ padding: "16px 18px" }}><Empty /></div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {escalatedLeads.map(l => (
                <div key={l.id} style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ minWidth: "120px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#ddd" }}>{l.name}</div>
                    <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#555", marginTop: "2px" }}>{l.phone || "—"}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ fontSize: "11px", color: "#ffaa00", lineHeight: 1.5 }}>{l.escalation_reason}</div>
                    {l.security_flag && (
                      <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#ff5555", background: "#ff000015", border: "1px solid #ff555533", borderRadius: "4px", padding: "1px 6px", marginTop: "4px", display: "inline-block" }}>{l.security_flag}</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right", minWidth: "100px" }}>
                    <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333" }}>{fmtTime(l.last_escalation_at)}</div>
                    {l.urgency && <div style={{ fontFamily: "monospace", fontSize: "9px", color: l.urgency === "high" ? "#ff3333" : l.urgency === "medium" ? "#ffaa00" : "#555", marginTop: "3px" }}>{l.urgency.toUpperCase()}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Failed SMS / Errors */}
        <div style={{ background: "#111", border: "1px solid #ff333322", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a" }}>
            <SectionHeader title="FAILED SMS / ERRORS" count={errorLogs.length} />
          </div>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>LOADING...</div>
          ) : errorLogs.length === 0 ? <div style={{ padding: "16px 18px" }}><Empty /></div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {errorLogs.slice(0, 20).map((l, i) => (
                <div key={l.id || i} style={{ padding: "10px 18px", borderBottom: "1px solid #1a0a0a", display: "flex", gap: "14px", alignItems: "flex-start", background: "#130808" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", whiteSpace: "nowrap", flexShrink: 0, marginTop: "2px" }}>{fmtTime(l.created_at || l.created_date)}</span>
                  <span style={{ fontSize: "11px", color: "#ff5555", lineHeight: 1.5 }}>{l.event}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opted-Out Leads */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a" }}>
            <SectionHeader title="OPTED-OUT LEADS" count={optedOutLeads.length} />
          </div>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>LOADING...</div>
          ) : optedOutLeads.length === 0 ? <div style={{ padding: "16px 18px" }}><Empty /></div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    {["NAME", "PHONE", "LAST MESSAGE"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "1px", fontWeight: "normal" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {optedOutLeads.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #0f0f0f" }}>
                      <td style={{ padding: "9px 14px", fontSize: "12px", color: "#888" }}>{l.name}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: "10px", color: "#555" }}>{l.phone || "—"}</td>
                      <td style={{ padding: "9px 14px", fontSize: "11px", color: "#555", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.last_message || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}