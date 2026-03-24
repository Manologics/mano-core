import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { resolveOpsAlert } from "@/functions/resolveOpsAlert";

const NAV = [
  { label: "Command Center", path: "/CommandCenter", icon: "⚡" },
  { label: "Agent 1: Intake",     path: "/AgentIntake",     icon: "🤖" },
  { label: "Agent 2: Booking",    path: "/AgentBooking",    icon: "🤖" },
  { label: "Agent 3: Follow-Up",  path: "/AgentFollowUp",   icon: "🤖" },
  { label: "Agent 4: Retention",  path: "/AgentRetention",  icon: "🤖" },
  { label: "Agent 5: Ops",        path: "/AgentOps",        icon: "🛡️" },
  { label: "Settings",            path: "/Settings",        icon: "⚙️" },
  { label: "📋 Lead Form",        path: "/LeadForm",        icon: "" },
];

const SEV_COLOR = { critical: "#ff3333", high: "#f97316", medium: "#ffdd00", low: "#3b82f6" };
const SEV_BG    = { critical: "rgba(255,51,51,0.07)", high: "rgba(249,115,22,0.07)", medium: "rgba(255,221,0,0.07)", low: "rgba(59,130,246,0.07)" };

function Sidebar({ openCount, maxSev }) {
  const badgeColor = maxSev === "critical" ? "#ff3333" : maxSev === "high" ? "#f97316" : maxSev === "medium" ? "#ffdd00" : "#3b82f6";
  return (
    <aside style={{ width:"220px", background:"#0f0f0f", borderRight:"1px solid #1a1a1a", display:"flex", flexDirection:"column", flexShrink:0, minHeight:"100vh" }}>
      <div style={{ padding:"18px 14px", borderBottom:"1px solid #1a1a1a", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"30px", height:"30px", background:"linear-gradient(135deg,#00ff88,#00cc66)", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px" }}>🐒</div>
        <div><div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", fontWeight:"bold" }}>MONKEE BIZZ AI</div><div style={{ fontFamily:"monospace", fontSize:"9px", color:"#333" }}>SAOS v1.0</div></div>
      </div>
      <nav style={{ flex:1, padding:"10px 8px" }}>
        {NAV.map(n => {
          const a = n.path === "/AgentOps";
          return (
            <a key={n.path} href={n.path} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 10px", borderRadius:"7px", marginBottom:"3px", textDecoration:"none", background:a?"rgba(139,92,246,0.1)":"transparent", border:a?"1px solid rgba(139,92,246,0.25)":"1px solid transparent" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <span style={{ fontSize:"14px" }}>{n.icon}</span>
                <span style={{ fontSize:"12px", color:a?"#8b5cf6":"#777", fontWeight:a?"600":"400" }}>{n.label}</span>
              </div>
              {n.path === "/AgentOps" && openCount > 0 && (
                <span style={{ background:badgeColor, color:"#000", fontFamily:"monospace", fontSize:"9px", fontWeight:"bold", padding:"1px 6px", borderRadius:"10px" }}>{openCount}</span>
              )}
            </a>
          );
        })}
      </nav>
      <div style={{ padding:"12px", borderTop:"1px solid #1a1a1a", fontFamily:"monospace", fontSize:"9px", color:"#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

function getRecommendations(m, settings) {
  if (!m) return [];
  const avgDeal = parseFloat(settings.ops_average_deal_value || '1500');
  const fuOvH   = parseFloat(settings.ops_followup_overdue_hours || '2');
  const staleMin = parseFloat(settings.ops_hot_lead_stale_minutes || '30');
  const recs = [];

  if ((m.hot_not_booked || 0) > 0)        recs.push({ icon:"🔥", text:`${m.hot_not_booked} HOT lead${m.hot_not_booked>1?'s':''} with no booking in ${staleMin} min. Est. at risk: $${(m.hot_not_booked*avgDeal).toLocaleString()}`, link:"/AgentIntake", linkLabel:"View HOT Leads" });
  if ((m.no_shows_not_reengaged||0) > 0)  recs.push({ icon:"⚠️", text:`${m.no_shows_not_reengaged} no-show${m.no_shows_not_reengaged>1?'s':''} with no follow-up running. Re-bookable.`, link:"/AgentBooking", linkLabel:"View No-Shows" });
  if ((m.followups_overdue||0) > 0)       recs.push({ icon:"⚠️", text:`${m.followups_overdue} follow-up${m.followups_overdue>1?'s':''} overdue by more than ${fuOvH} hrs. Leads going cold.`, link:"/AgentFollowUp", linkLabel:"View Follow-Up Queue" });
  if ((m.retention_overdue||0) > 0)       recs.push({ icon:"⚠️", text:`${m.retention_overdue} retention event${m.retention_overdue>1?'s':''} overdue. Revenue in queue.`, link:"/AgentRetention", linkLabel:"View Retention Queue" });
  if ((m.critical_alerts||0) > 0)         recs.push({ icon:"🚨", text:`${m.critical_alerts} critical alert${m.critical_alerts>1?'s':''} need immediate attention.`, link:"/AgentOps", linkLabel:"View Ops Dashboard" });
  if ((m.contract_violations||0) > 0)     recs.push({ icon:"⚡", text:`${m.contract_violations} cross-agent contract violation${m.contract_violations>1?'s':''} detected.`, link:"/AgentOps", linkLabel:"View Ops Dashboard" });

  if (recs.length === 0) {
    recs.push({ icon:"✅", text:`System running clean. ${m.total_leads||0} leads in pipeline. Pipeline est: $${((m.hot_leads||0)*avgDeal).toLocaleString()}`, link:null });
  }
  return recs.slice(0, 5);
}

export default function AgentOps() {
  const [alerts, setAlerts]         = useState([]);
  const [reports, setReports]       = useState([]);
  const [leads, setLeads]           = useState([]);
  const [followups, setFollowups]   = useState([]);
  const [retEvents, setRetEvents]   = useState([]);
  const [bookings, setBookings]     = useState([]);
  const [settings, setSettings]     = useState({});
  const [loading, setLoading]       = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast]           = useState("");
  const [filter, setFilter]         = useState("Open");

  const load = useCallback(async () => {
    const [al, rh, ld, fu, re, bk, stgs] = await Promise.all([
      base44.entities.OpsAlerts.list('-detected_at', 200),
      base44.entities.ReportHistory.list('-generated_at', 30),
      base44.entities.Lead.list(),
      base44.entities.FollowUp.list(),
      base44.entities.RetentionEvents.list(),
      base44.entities.Booking.list(),
      base44.entities.AppSettings.list(),
    ]);
    setAlerts(al || []);
    setReports(rh || []);
    setLeads(ld || []);
    setFollowups(fu || []);
    setRetEvents(re || []);
    setBookings(bk || []);
    const stgMap = {};
    (stgs || []).forEach(s => { stgMap[s.key] = s.value; });
    setSettings(stgMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAction = async (alertId, action) => {
    setActionLoading(alertId + action);
    await resolveOpsAlert({ alert_id: alertId, action });
    await load();
    if (selectedAlert?.id === alertId) setSelectedAlert(null);
    showToast(`Alert ${action}d`);
    setActionLoading("");
  };

  const openAlerts = alerts.filter(a => a.status === "Open");
  const filteredAlerts = alerts.filter(a => filter === "All" ? true : a.status === filter)
    .sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 4) - (sev[b.severity] || 4) || new Date(b.detected_at) - new Date(a.detected_at);
    });

  const maxSev = openAlerts.some(a => a.severity === "critical") ? "critical"
    : openAlerts.some(a => a.severity === "high") ? "high"
    : openAlerts.some(a => a.severity === "medium") ? "medium"
    : openAlerts.length > 0 ? "low" : null;

  const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));

  const fuOvMs  = parseFloat(settings.ops_followup_overdue_hours || '2') * 3600000;
  const retOvMs = parseFloat(settings.ops_retention_overdue_hours || '2') * 3600000;
  const now = Date.now();

  const metrics = {
    total_leads:           leads.length,
    hot_leads:             leads.filter(l => l.score === "HOT").length,
    hot_not_booked:        leads.filter(l => l.score === "HOT" && !bookings.some(b => b.lead_id === l.id && ["Requested","Confirmed","Rescheduled","Completed"].includes(b.status))).length,
    no_shows_not_reengaged: [...new Set(bookings.filter(b => b.no_show_flagged).map(b => b.lead_id))].filter(lid => !followups.some(f => f.lead_id === lid && f.sequence_type === "no_show")).length,
    followups_overdue:     followups.filter(f => f.status === "Pending" && (now - new Date(f.scheduled_at).getTime()) > fuOvMs).length,
    retention_overdue:     retEvents.filter(r => r.status === "Pending" && (now - new Date(r.scheduled_at).getTime()) > retOvMs).length,
    open_alerts:           openAlerts.length,
    critical_alerts:       openAlerts.filter(a => a.severity === "critical").length,
    contract_violations:   openAlerts.filter(a => a.alert_type === "contract_violation").length,
  };

  const recs = getRecommendations(metrics, settings);

  const summaryCards = [
    { label: "OPEN ALERTS",        value: metrics.open_alerts,           color: maxSev ? SEV_COLOR[maxSev] : "#555" },
    { label: "CRITICAL",           value: metrics.critical_alerts,       color: "#ff3333" },
    { label: "HOT LEADS STALE",    value: openAlerts.filter(a => a.alert_type === "hot_lead_stale").length, color: "#ff3333" },
    { label: "FOLLOW-UPS OVERDUE", value: metrics.followups_overdue,     color: "#f97316" },
    { label: "RETENTION OVERDUE",  value: metrics.retention_overdue,     color: "#8b5cf6" },
    { label: "NO-SHOWS UNHANDLED", value: metrics.no_shows_not_reengaged, color: "#ffdd00" },
  ];

  const INP = { background:"#0f0f0f", border:"1px solid #222", borderRadius:"6px", padding:"6px 10px", color:"#ddd", fontSize:"11px", outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0a0a0a", color:"#e0e0e0", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <Sidebar openCount={openAlerts.length} maxSev={maxSev} />
      <main style={{ flex:1, padding:"28px", overflowX:"hidden" }}>

        <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#8b5cf6", letterSpacing:"3px", marginBottom:"5px" }}>AGENT 05</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"4px", flexWrap:"wrap", gap:"8px" }}>
          <div>
            <h1 style={{ fontSize:"22px", fontWeight:"700", color:"#fff", margin:"0 0 4px" }}>Ops Agent</h1>
            <p style={{ color:"#555", fontSize:"12px", margin:0 }}>System monitoring, alerting, reporting, and performance insight.</p>
          </div>
          <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
            <div style={{ width:"7px", height:"7px", borderRadius:"50%", background: settings.ops_summary_enabled !== "false" ? "#00ff88" : "#ffdd00" }} />
            <span style={{ fontFamily:"monospace", fontSize:"9px", color:"#555" }}>
              {settings.ops_summary_enabled !== "false" ? "ACTIVE" : "MONITORING ONLY"}
            </span>
          </div>
        </div>

        {toast && <div style={{ background:"#00ff8812", border:"1px solid #00ff8844", borderRadius:"7px", padding:"8px 14px", marginBottom:"14px", fontFamily:"monospace", fontSize:"11px", color:"#00ff88" }}>✓ {toast}</div>}

        {/* Summary Strip */}
        <div style={{ display:"flex", gap:"10px", marginBottom:"20px", flexWrap:"wrap" }}>
          {summaryCards.map(c => (
            <div key={c.label} style={{ background:"#111", border:`1px solid ${c.color}22`, borderRadius:"9px", padding:"12px 16px", minWidth:"100px", flex:"1" }}>
              <div style={{ fontFamily:"monospace", fontSize:"8px", color:"#444", letterSpacing:"2px", marginBottom:"4px" }}>{c.label}</div>
              <div style={{ fontSize:"28px", fontWeight:"700", color: c.value > 0 ? c.color : "#333", lineHeight:1 }}>{loading ? "…" : c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:"16px", alignItems:"flex-start" }}>
          <div>
            {/* Alert Table */}
            <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"12px", overflow:"hidden", marginBottom:"16px" }}>
              <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1a1a", display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontFamily:"monospace", fontSize:"10px", color:"#8b5cf6", letterSpacing:"2px" }}>OPS ALERTS</span>
                <div style={{ display:"flex", gap:"4px", marginLeft:"8px" }}>
                  {["Open","Acknowledged","Resolved","Ignored","All"].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ padding:"4px 10px", borderRadius:"5px", cursor:"pointer", fontFamily:"monospace", fontSize:"9px", background:filter===f?"#8b5cf620":"transparent", border:filter===f?"1px solid #8b5cf6":"1px solid #1a1a1a", color:filter===f?"#8b5cf6":"#444" }}>{f}</button>
                  ))}
                </div>
                <button onClick={load} style={{ marginLeft:"auto", background:"transparent", border:"1px solid #1a1a1a", color:"#444", padding:"5px 9px", borderRadius:"6px", cursor:"pointer", fontFamily:"monospace", fontSize:"9px" }}>↺</button>
              </div>
              {loading ? (
                <div style={{ padding:"40px", textAlign:"center", fontFamily:"monospace", fontSize:"11px", color:"#333" }}>LOADING...</div>
              ) : filteredAlerts.length === 0 ? (
                <div style={{ padding:"40px", textAlign:"center", fontFamily:"monospace", fontSize:"11px", color:"#2a2a2a" }}>
                  {filter === "Open" ? "No open alerts. System is running clean. ✅" : `No ${filter.toLowerCase()} alerts.`}
                </div>
              ) : (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #1a1a1a" }}>
                        {["SEV","TYPE","SOURCE","LEAD","TITLE","DETECTED","STATUS","ACTIONS"].map(h => (
                          <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontFamily:"monospace", fontSize:"8px", color:"#333", letterSpacing:"1px", fontWeight:"normal", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlerts.map(alert => {
                        const lead = alert.lead_id ? (leadMap[alert.lead_id] || {}) : null;
                        const isCV = alert.alert_type === "contract_violation";
                        const sevColor = SEV_COLOR[alert.severity] || "#555";
                        return (
                          <tr key={alert.id} onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
                            style={{ borderBottom:"1px solid #0f0f0f", cursor:"pointer", background: selectedAlert?.id === alert.id ? "#1a1a2a" : SEV_BG[alert.severity] || "transparent" }}>
                            <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                              <span style={{ color:sevColor, fontFamily:"monospace", fontSize:"9px", fontWeight:"bold" }}>
                                {isCV ? "⚡ " : ""}{alert.severity.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding:"8px 10px", fontSize:"10px", color:"#888", fontFamily:"monospace" }}>{alert.alert_type.replace(/_/g," ")}</td>
                            <td style={{ padding:"8px 10px", fontSize:"10px", color:"#666" }}>{alert.source_agent}</td>
                            <td style={{ padding:"8px 10px", fontSize:"11px", color:"#aaa" }}>{lead?.name || "—"}</td>
                            <td style={{ padding:"8px 10px", fontSize:"11px", color:"#ddd", maxWidth:"200px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{alert.title}</td>
                            <td style={{ padding:"8px 10px", fontSize:"10px", color:"#555", whiteSpace:"nowrap" }}>{alert.detected_at ? new Date(alert.detected_at).toLocaleDateString() : "—"}</td>
                            <td style={{ padding:"8px 10px" }}>
                              <span style={{ fontFamily:"monospace", fontSize:"9px", color: alert.status==="Open"?sevColor : alert.status==="Resolved"?"#00ff88" : "#555", background:`${alert.status==="Open"?sevColor:alert.status==="Resolved"?"#00ff88":"#555"}20`, padding:"2px 7px", borderRadius:"4px" }}>
                                {alert.status}
                              </span>
                            </td>
                            <td style={{ padding:"8px 10px" }} onClick={e => e.stopPropagation()}>
                              {alert.status === "Open" && (
                                <div style={{ display:"flex", gap:"4px" }}>
                                  {["acknowledge","resolve","ignore"].map(act => (
                                    <button key={act} disabled={!!actionLoading} onClick={() => handleAction(alert.id, act)}
                                      style={{ padding:"3px 7px", borderRadius:"4px", cursor:"pointer", fontFamily:"monospace", fontSize:"8px", background:"transparent", border:"1px solid #333", color:"#666" }}>
                                      {actionLoading === alert.id+act ? "…" : act.slice(0,3).toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {alert.status === "Acknowledged" && (
                                <button disabled={!!actionLoading} onClick={() => handleAction(alert.id, "resolve")}
                                  style={{ padding:"3px 7px", borderRadius:"4px", cursor:"pointer", fontFamily:"monospace", fontSize:"8px", background:"transparent", border:"1px solid #333", color:"#666" }}>
                                  RES
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Report History */}
            <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"12px", overflow:"hidden" }}>
              <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1a1a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:"monospace", fontSize:"10px", color:"#8b5cf6", letterSpacing:"2px" }}>REPORT HISTORY</span>
              </div>
              {reports.length === 0 ? (
                <div style={{ padding:"30px", textAlign:"center", fontFamily:"monospace", fontSize:"11px", color:"#2a2a2a" }}>No reports generated yet.</div>
              ) : (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #1a1a1a" }}>
                        {["TYPE","GENERATED","SUBJECT","EMAIL","VIEW"].map(h => (
                          <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontFamily:"monospace", fontSize:"8px", color:"#333", letterSpacing:"1px", fontWeight:"normal" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map(r => {
                        const isDaily = r.report_type === "daily_ops_summary";
                        let parsed = null;
                        try { parsed = JSON.parse(r.summary_json || "null"); } catch {}
                        return (
                          <tr key={r.id} style={{ borderBottom:"1px solid #0f0f0f" }}>
                            <td style={{ padding:"8px 10px" }}>
                              <span style={{ fontFamily:"monospace", fontSize:"9px", color: isDaily ? "#8b5cf6" : "#00ff88", background: isDaily ? "#8b5cf620" : "#00ff8820", padding:"2px 7px", borderRadius:"4px" }}>
                                {isDaily ? "DAILY" : "WEEKLY"}
                              </span>
                            </td>
                            <td style={{ padding:"8px 10px", fontSize:"10px", color:"#666" }}>{new Date(r.generated_at).toLocaleString()}</td>
                            <td style={{ padding:"8px 10px", fontSize:"10px", color:"#aaa", maxWidth:"220px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.subject}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", fontSize:"10px", color: r.email_sent ? "#00ff88" : "#ff3333" }}>{r.email_sent ? "✓" : "✗"}</td>
                            <td style={{ padding:"8px 10px" }}>
                              <button onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : { ...r, parsed })}
                                style={{ padding:"3px 9px", borderRadius:"5px", cursor:"pointer", fontFamily:"monospace", fontSize:"8px", background:"transparent", border:"1px solid #8b5cf644", color:"#8b5cf6" }}>
                                VIEW
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Panels */}
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            {/* Alert Detail */}
            {selectedAlert && (
              <div style={{ background:"#111", border:`1px solid ${SEV_COLOR[selectedAlert.severity] || "#333"}44`, borderRadius:"12px", padding:"16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                  <div>
                    <div style={{ fontFamily:"monospace", fontSize:"9px", color: SEV_COLOR[selectedAlert.severity], letterSpacing:"1px", marginBottom:"4px" }}>
                      {selectedAlert.alert_type === "contract_violation" ? "⚡ " : ""}{selectedAlert.severity.toUpperCase()} — {selectedAlert.source_agent}
                    </div>
                    <div style={{ fontSize:"13px", color:"#fff", fontWeight:"600" }}>{selectedAlert.title}</div>
                  </div>
                  <button onClick={() => setSelectedAlert(null)} style={{ background:"transparent", border:"none", color:"#555", cursor:"pointer", fontSize:"18px", lineHeight:1 }}>×</button>
                </div>
                <div style={{ fontSize:"11px", color:"#888", marginBottom:"12px", lineHeight:"1.6" }}>{selectedAlert.description}</div>
                {selectedAlert.lead_id && leadMap[selectedAlert.lead_id] && (
                  <div style={{ padding:"8px 10px", background:"#0f0f0f", borderRadius:"6px", marginBottom:"10px" }}>
                    <div style={{ fontFamily:"monospace", fontSize:"8px", color:"#444", marginBottom:"4px" }}>RELATED LEAD</div>
                    <div style={{ fontSize:"12px", color:"#ddd" }}>{leadMap[selectedAlert.lead_id].name}</div>
                    <div style={{ fontSize:"10px", color:"#666" }}>{leadMap[selectedAlert.lead_id].email} · {leadMap[selectedAlert.lead_id].status}</div>
                  </div>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:"5px", marginBottom:"10px" }}>
                  {[["Detected", selectedAlert.detected_at ? new Date(selectedAlert.detected_at).toLocaleString() : "—"],
                    ["Status", selectedAlert.status],
                    ["Type", selectedAlert.alert_type]].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #0f0f0f", fontSize:"10px" }}>
                      <span style={{ color:"#444", fontFamily:"monospace", fontSize:"9px" }}>{k}</span>
                      <span style={{ color:"#888" }}>{v}</span>
                    </div>
                  ))}
                </div>
                {selectedAlert.status === "Open" && (
                  <div style={{ display:"flex", gap:"6px" }}>
                    {["acknowledge","resolve","ignore"].map(act => (
                      <button key={act} disabled={!!actionLoading} onClick={() => handleAction(selectedAlert.id, act)}
                        style={{ flex:1, padding:"7px", borderRadius:"6px", cursor:"pointer", fontFamily:"monospace", fontSize:"9px", letterSpacing:"1px", background:"transparent", border:"1px solid #333", color:"#aaa" }}>
                        {act.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Report Detail */}
            {selectedReport && (
              <div style={{ background:"#111", border:"1px solid #8b5cf644", borderRadius:"12px", padding:"16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                  <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#8b5cf6", letterSpacing:"1px" }}>{selectedReport.report_type === "daily_ops_summary" ? "DAILY REPORT" : "WEEKLY DIGEST"}</div>
                  <button onClick={() => setSelectedReport(null)} style={{ background:"transparent", border:"none", color:"#555", cursor:"pointer", fontSize:"18px", lineHeight:1 }}>×</button>
                </div>
                <div style={{ fontSize:"11px", color:"#aaa", marginBottom:"10px" }}>{selectedReport.subject}</div>
                {selectedReport.parsed && (
                  <div style={{ fontSize:"10px", color:"#666", lineHeight:"1.7" }}>
                    {Object.entries(selectedReport.parsed).filter(([k]) => k !== 'recommendations' && k !== 'generated_at').slice(0, 16).map(([k, v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid #0f0f0f" }}>
                        <span style={{ color:"#444", fontFamily:"monospace", fontSize:"9px" }}>{k}</span>
                        <span>{typeof v === "number" ? v.toLocaleString() : String(v)}</span>
                      </div>
                    ))}
                    {selectedReport.parsed.recommendations?.length > 0 && (
                      <div style={{ marginTop:"10px" }}>
                        <div style={{ fontFamily:"monospace", fontSize:"8px", color:"#8b5cf6", marginBottom:"6px" }}>RECOMMENDATIONS</div>
                        {selectedReport.parsed.recommendations.map((r, i) => (
                          <div key={i} style={{ padding:"5px 8px", background:"#0f0f0f", borderRadius:"4px", marginBottom:"4px", fontSize:"10px" }}>{r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => {
                  const text = `${selectedReport.subject}\n\n${JSON.stringify(selectedReport.parsed, null, 2)}`;
                  navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard"));
                }} style={{ marginTop:"10px", width:"100%", padding:"7px", borderRadius:"6px", cursor:"pointer", fontFamily:"monospace", fontSize:"9px", background:"transparent", border:"1px solid #333", color:"#666" }}>
                  COPY AS TEXT
                </button>
              </div>
            )}

            {/* Recommendations */}
            <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"12px", padding:"16px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#8b5cf6", letterSpacing:"2px", marginBottom:"12px" }}>RECOMMENDATIONS</div>
              {recs.map((r, i) => (
                <div key={i} style={{ padding:"10px 12px", background:"#0f0f0f", borderRadius:"7px", marginBottom:"7px" }}>
                  <div style={{ fontSize:"11px", color:"#ddd", lineHeight:"1.5", marginBottom: r.link ? "6px" : "0" }}>{r.icon} {r.text}</div>
                  {r.link && <a href={r.link} style={{ fontFamily:"monospace", fontSize:"9px", color:"#8b5cf6" }}>{r.linkLabel} →</a>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}