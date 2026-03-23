import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { reEngageLead } from "@/functions/reEngageLead";
import { markLeadResponded } from "@/functions/markLeadResponded";

const Lead = base44.entities.Lead;
const FollowUp = base44.entities.FollowUp;
const ActivityLog = base44.entities.ActivityLog;
const AppSettings = base44.entities.AppSettings;

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

function Sidebar({ badgeCount }) {
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
          const a = n.path === "/AgentFollowUp";
          return (
            <a key={n.path} href={n.path} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "7px", marginBottom: "3px", textDecoration: "none", background: a ? "rgba(0,255,136,0.1)" : "transparent", border: a ? "1px solid rgba(0,255,136,0.25)" : "1px solid transparent" }}>
              <span style={{ fontSize: "14px" }}>{n.icon}</span>
              <span style={{ fontSize: "12px", color: a ? "#00ff88" : "#777", fontWeight: a ? "600" : "400" }}>{n.label}</span>
              {n.path === "/AgentFollowUp" && badgeCount > 0 && (
                <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#000", fontSize: "9px", fontWeight: "bold", borderRadius: "10px", padding: "1px 6px", fontFamily: "monospace" }}>{badgeCount}</span>
              )}
            </a>
          );
        })}
      </nav>
      <div style={{ padding: "12px", borderTop: "1px solid #1a1a1a", fontFamily: "monospace", fontSize: "9px", color: "#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

function ScoreBadge({ score }) {
  const m = { HOT: { c: "#ff3333", bg: "#ff000020" }, WARM: { c: "#ffdd00", bg: "#ffdd0020" }, COLD: { c: "#888", bg: "#88888820" } };
  const s = m[score] || { c: "#444", bg: "#44444420" };
  return <span style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: "bold", color: s.c, background: s.bg, border: `1px solid ${s.c}44`, padding: "2px 6px", borderRadius: "4px" }}>{score || "—"}</span>;
}

function SeqBadge({ type }) {
  const c = type === "no_show" ? "#f59e0b" : "#00ff88";
  return <span style={{ fontFamily: "monospace", fontSize: "9px", color: c, background: `${c}20`, border: `1px solid ${c}44`, padding: "2px 6px", borderRadius: "4px" }}>{type === "no_show" ? "NO-SHOW" : "STANDARD"}</span>;
}

function StatusBadge({ status }) {
  const m = { Pending: "#f59e0b", Sent: "#00ff88", Failed: "#ff3333", Responded: "#00ffcc", Skipped: "#444" };
  const c = m[status] || "#555";
  return <span style={{ fontFamily: "monospace", fontSize: "9px", color: c, background: `${c}20`, border: `1px solid ${c}44`, padding: "2px 6px", borderRadius: "4px" }}>{status}</span>;
}

function DetailPanel({ lead, followups, logs, onClose, onAction }) {
  const [acting, setActing] = useState("");
  const leadFUs = followups.filter(f => f.lead_id === lead.id).sort((a, b) => a.attempt_number - b.attempt_number);
  const leadLogs = logs.filter(l => l.lead_id === lead.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);

  const fmt = (iso) => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

  const action = async (type) => {
    setActing(type);
    await onAction(type, lead, leadFUs);
    setActing("");
  };

  const canReengage = ["Nurture", "Closed — No Response"].includes(lead.status);
  const canArchive = lead.status === "Nurture";

  return (
    <div style={{ position: "fixed", right: 0, top: 0, width: "420px", height: "100vh", background: "#111", borderLeft: "1px solid #1a1a1a", zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "4px" }}>SEQUENCE DETAIL</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>{lead.name}</div>
          <div style={{ marginTop: "4px" }}><ScoreBadge score={lead.score} /></div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "18px" }}>✕</button>
      </div>

      <div style={{ padding: "16px 18px", borderBottom: "1px solid #0f0f0f" }}>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "10px" }}>SEQUENCE TIMELINE</div>
        {leadFUs.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#444" }}>No follow-up records found.</div>
        ) : leadFUs.map(f => (
          <div key={f.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: f.status === "Sent" ? "#00ff8820" : f.status === "Failed" ? "#ff000020" : f.status === "Responded" ? "#00ffcc20" : "#1a1a1a", border: `1px solid ${f.status === "Sent" ? "#00ff88" : f.status === "Failed" ? "#ff3333" : f.status === "Responded" ? "#00ffcc" : "#333"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#fff", flexShrink: 0 }}>
              {f.attempt_number}
            </div>
            <div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "2px" }}>
                <span style={{ fontSize: "11px", color: "#ddd" }}>Attempt {f.attempt_number}</span>
                <StatusBadge status={f.status} />
              </div>
              <div style={{ fontSize: "10px", color: "#555" }}>
                Scheduled: {fmt(f.scheduled_at)}
                {f.sent_at && <span> · Sent: {fmt(f.sent_at)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 18px", borderBottom: "1px solid #0f0f0f" }}>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "10px" }}>ACTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button onClick={() => action("respond")} disabled={!!acting} style={{ padding: "7px 12px", borderRadius: "6px", cursor: "pointer", background: "transparent", border: "1px solid #00ff8844", color: "#00ff88", fontFamily: "monospace", fontSize: "9px" }}>
            {acting === "respond" ? "..." : "✓ Mark Responded"}
          </button>
          {canReengage && (
            <button onClick={() => action("reengage")} disabled={!!acting} style={{ padding: "7px 12px", borderRadius: "6px", cursor: "pointer", background: "transparent", border: "1px solid #f59e0b44", color: "#f59e0b", fontFamily: "monospace", fontSize: "9px" }}>
              {acting === "reengage" ? "..." : "↩ Re-Engage"}
            </button>
          )}
          {canArchive && (
            <button onClick={() => action("archive")} disabled={!!acting} style={{ padding: "7px 12px", borderRadius: "6px", cursor: "pointer", background: "transparent", border: "1px solid #ff333344", color: "#ff3333", fontFamily: "monospace", fontSize: "9px" }}>
              {acting === "archive" ? "..." : "🗄 Archive"}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 18px", flex: 1 }}>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "10px" }}>ACTIVITY LOG</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {leadLogs.length === 0 ? (
            <div style={{ fontSize: "11px", color: "#444" }}>No log entries.</div>
          ) : leadLogs.map(l => (
            <div key={l.id} style={{ display: "flex", gap: "10px", padding: "5px 8px", background: "#0f0f0f", borderRadius: "5px", borderLeft: "2px solid #1a1a1a" }}>
              <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", whiteSpace: "nowrap", flexShrink: 0 }}>
                {l.created_at ? new Date(l.created_at).toLocaleTimeString() : "—"}
              </span>
              <span style={{ fontSize: "11px", color: "#666" }}>{l.event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AgentFollowUp() {
  const [leads, setLeads] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const [now] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, f, al, s] = await Promise.all([Lead.list(), FollowUp.list(), ActivityLog.list(), AppSettings.list()]);
      setLeads(l);
      setFollowups(f);
      setLogs(al);
      const sMap = {};
      s.forEach(x => { sMap[x.key] = x.value; });
      setSettings(sMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const handleAction = async (type, lead, leadFUs) => {
    if (type === "respond") {
      await markLeadResponded({ lead_id: lead.id });
      showToast(`${lead.name} marked as responded.`);
    } else if (type === "reengage") {
      await reEngageLead({ lead_id: lead.id });
      showToast(`Re-engagement email sent to ${lead.name}.`);
    } else if (type === "archive") {
      await Lead.update(lead.id, { status: "Closed — No Response" });
      await ActivityLog.create({ lead_id: lead.id, event: "Lead archived — no response after full follow-up sequence", created_at: new Date().toISOString() });
      showToast(`${lead.name} archived.`);
      setSelected(null);
    }
    await load();
  };

  const isEnabled = settings["followup_enabled"] !== "false";

  // Build queue: leads with follow-up records, not responded, not closed
  const queueLeadIds = new Set(followups.map(f => f.lead_id));
  const queueLeads = leads.filter(l =>
    queueLeadIds.has(l.id) &&
    l.status !== "Closed — No Response" &&
    !followups.filter(f => f.lead_id === l.id).every(f => f.status === "Responded")
  );

  const getNextPending = (leadId) => followups
    .filter(f => f.lead_id === leadId && f.status === "Pending")
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

  const getLastSent = (leadId) => followups
    .filter(f => f.lead_id === leadId && f.status === "Sent")
    .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))[0];

  const getSeqType = (leadId) => {
    const fus = followups.filter(f => f.lead_id === leadId);
    return fus.find(f => f.sequence_type === "no_show") ? "no_show" : "standard";
  };

  const sorted = [...queueLeads].sort((a, b) => {
    const na = getNextPending(a.id);
    const nb = getNextPending(b.id);
    if (!na && !nb) return 0;
    if (!na) return 1;
    if (!nb) return -1;
    return new Date(na.scheduled_at) - new Date(nb.scheduled_at);
  });

  const activeCount = queueLeads.filter(l => followups.some(f => f.lead_id === l.id && f.status === "Pending")).length;
  const today = now.toLocaleDateString("en-CA");
  const sentToday = followups.filter(f => f.status === "Sent" && f.sent_at && new Date(f.sent_at).toLocaleDateString("en-CA") === today).length;
  const respondedCount = followups.filter(f => f.status === "Responded").length;
  const overdueCount = followups.filter(f => f.status === "Pending" && new Date(f.scheduled_at) < now).length;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const archivedMonth = leads.filter(l => l.status === "Closed — No Response" && new Date(l.updated_date) >= monthStart).length;

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <Sidebar badgeCount={activeCount} />
      <main style={{ flex: 1, overflow: "auto", padding: "28px", maxWidth: "1200px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "3px", marginBottom: "5px" }}>AGENT 03</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", margin: 0 }}>Follow-Up Agent</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: isEnabled ? "#00ff88" : "#f59e0b" }} />
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: isEnabled ? "#00ff88" : "#f59e0b" }}>{isEnabled ? "Active" : "Paused"}</span>
          </div>
        </div>
        <p style={{ color: "#555", fontSize: "12px", marginBottom: "22px" }}>Automated lead re-engagement and sequence management.</p>

        {toast && <div style={{ background: "#00ff8812", border: "1px solid #00ff8844", borderRadius: "7px", padding: "9px 14px", marginBottom: "14px", fontFamily: "monospace", fontSize: "11px", color: "#00ff88" }}>✓ {toast}</div>}

        {/* Summary Strip */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "22px", flexWrap: "wrap" }}>
          {[
            ["ACTIVE SEQUENCES", activeCount, "#f59e0b"],
            ["SENT TODAY", sentToday, "#00ff88"],
            ["RESPONDED", respondedCount, "#00ffcc"],
            ["OVERDUE", overdueCount, overdueCount > 0 ? "#ff3333" : "#555"],
            ["ARCHIVED THIS MONTH", archivedMonth, "#888"]
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: "#111", border: `1px solid ${c}22`, borderRadius: "9px", padding: "12px 16px", minWidth: "110px", flex: 1 }}>
              <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#444", letterSpacing: "2px", marginBottom: "3px" }}>{l}</div>
              <div style={{ fontSize: "26px", fontWeight: "700", color: c, lineHeight: 1 }}>{loading ? "…" : v}</div>
            </div>
          ))}
        </div>

        {/* Queue Table */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#f59e0b", letterSpacing: "2px" }}>FOLLOW-UP QUEUE</span>
            <button onClick={load} style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#444", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "9px" }}>↺ Refresh</button>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>LOADING...</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
              <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#2a2a2a" }}>No leads in follow-up queue.</div>
              <div style={{ fontSize: "11px", color: "#1a1a1a", marginTop: "4px" }}>All leads are either booked or sequences are complete.</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    {["NAME", "PHONE", "SCORE", "TYPE", "NEXT FOLLOW-UP", "ATTEMPT", "LAST CONTACTED", "STATUS"].map(h => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontFamily: "monospace", fontSize: "8px", color: "#333", letterSpacing: "1px", fontWeight: "normal", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(lead => {
                    const next = getNextPending(lead.id);
                    const last = getLastSent(lead.id);
                    const seqType = getSeqType(lead.id);
                    const leadFUs = followups.filter(f => f.lead_id === lead.id);
                    const maxAttempt = Math.max(...leadFUs.map(f => f.attempt_number));
                    const sentAttempt = leadFUs.filter(f => f.status === "Sent").length;
                    const isOverdue = next && new Date(next.scheduled_at) < now;
                    const rowBg = isOverdue ? "rgba(239,68,68,0.08)" : selected?.id === lead.id ? "#0d1a13" : "transparent";

                    return (
                      <tr key={lead.id} onClick={() => setSelected(selected?.id === lead.id ? null : lead)}
                        style={{ borderBottom: "1px solid #0f0f0f", cursor: "pointer", background: rowBg }}>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontSize: "12px", color: "#ddd", fontWeight: "500" }}>{lead.name}</div>
                          {isOverdue && <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#ff3333", marginTop: "2px" }}>⚠️ Overdue</div>}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "11px", color: "#666" }}>{lead.phone || "—"}</td>
                        <td style={{ padding: "10px 12px" }}><ScoreBadge score={lead.score} /></td>
                        <td style={{ padding: "10px 12px" }}><SeqBadge type={seqType} /></td>
                        <td style={{ padding: "10px 12px", fontSize: "11px", color: next ? "#ddd" : "#444" }}>{next ? fmt(next.scheduled_at) : "—"}</td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "10px", color: "#777" }}>{sentAttempt} of 3</td>
                        <td style={{ padding: "10px 12px", fontSize: "11px", color: "#555" }}>{last ? fmt(last.sent_at) : "—"}</td>
                        <td style={{ padding: "10px 12px" }}><StatusBadge status={next ? next.status : leadFUs[leadFUs.length - 1]?.status || "—"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selected && (
        <DetailPanel
          lead={selected}
          followups={followups}
          logs={logs}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}