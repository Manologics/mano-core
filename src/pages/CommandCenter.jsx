import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { resolveOpsAlert } from "@/functions/resolveOpsAlert";

const NAV = [
  { label: "Command Center",       path: "/CommandCenter",  icon: "⚡" },
  { label: "Agent 1: Intake",      path: "/AgentIntake",    icon: "🤖" },
  { label: "Agent 2: Booking",     path: "/AgentBooking",   icon: "🤖" },
  { label: "Agent 3: Follow-Up",   path: "/AgentFollowUp",  icon: "🤖" },
  { label: "Agent 4: Retention",   path: "/AgentRetention", icon: "🤖" },
  { label: "Agent 5: Ops",         path: "/AgentOps",       icon: "🛡️" },
  { label: "Settings",             path: "/Settings",       icon: "⚙️" },
  { label: "📋 Lead Form",         path: "/LeadForm",       icon: "" },
];

const AGENT_COLORS = { "Agent 1": "#3b82f6", "Agent 2": "#00ff88", "Agent 3": "#f59e0b", "Agent 4": "#8b5cf6", "Agent 5": "#888", "system": "#444" };

function getAgentFromEvent(evt = "") {
  if (evt.includes("Intake") || evt.includes("intake") || evt.includes("webhook") || evt.includes("Lead scored")) return "Agent 1";
  if (evt.includes("Booking") || evt.includes("booking") || evt.includes("No-show") || evt.includes("no-show") || evt.includes("Reminder")) return "Agent 2";
  if (evt.includes("Follow-up") || evt.includes("follow-up") || evt.includes("re-engage") || evt.includes("sequence")) return "Agent 3";
  if (evt.includes("Retention") || evt.includes("retention") || evt.includes("satisfaction") || evt.includes("review") || evt.includes("referral") || evt.includes("upsell")) return "Agent 4";
  if (evt.includes("Agent 5") || evt.includes("Ops alert") || evt.includes("ops") || evt.includes("Contract violation")) return "Agent 5";
  return "system";
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff/60)} min ago`;
  if (diff < 86400) return `${Math.round(diff/3600)} hr ago`;
  return `${Math.round(diff/86400)} d ago`;
}

function getRecommendations(m, settings) {
  if (!m) return [];
  const avgDeal  = parseFloat(settings.ops_average_deal_value || '1500');
  const staleMin = parseFloat(settings.ops_hot_lead_stale_minutes || '30');
  const fuOvH    = parseFloat(settings.ops_followup_overdue_hours || '2');
  const recs = [];

  if ((m.hot_not_booked || 0) > 0)           recs.push({ icon:"🔥", text:`${m.hot_not_booked} HOT lead${m.hot_not_booked>1?'s':''} with no booking in ${staleMin} min. Est. at risk: $${(m.hot_not_booked*avgDeal).toLocaleString()}`, link:"/AgentIntake", linkLabel:"View HOT Leads" });
  if ((m.no_shows_not_reengaged||0) > 0)     recs.push({ icon:"⚠️", text:`${m.no_shows_not_reengaged} no-show${m.no_shows_not_reengaged>1?'s':''} with no follow-up sequence running. Re-bookable.`, link:"/AgentBooking", linkLabel:"View Bookings" });
  if ((m.followups_overdue||0) > 0)          recs.push({ icon:"⚠️", text:`${m.followups_overdue} follow-up${m.followups_overdue>1?'s':''} overdue by more than ${fuOvH} hrs. Leads going cold.`, link:"/AgentFollowUp", linkLabel:"View Follow-Up Queue" });
  if ((m.retention_overdue||0) > 0)          recs.push({ icon:"⚠️", text:`${m.retention_overdue} retention event${m.retention_overdue>1?'s':''} overdue. Revenue in queue.`, link:"/AgentRetention", linkLabel:"View Retention Queue" });
  if ((m.new_leads_today||0) === 0 && new Date().getHours() > 12) recs.push({ icon:"⚠️", text:"No new leads today. Check intake form and marketing sources.", link:"/Settings", linkLabel:"View Intake Settings" });
  if ((m.critical_alerts||0) > 0)            recs.push({ icon:"🚨", text:`${m.critical_alerts} critical alert${m.critical_alerts>1?'s':''} need immediate attention.`, link:"/AgentOps", linkLabel:"View Ops Dashboard" });
  if ((m.contract_violations||0) > 0)        recs.push({ icon:"⚡", text:`${m.contract_violations} cross-agent contract violation${m.contract_violations>1?'s':''} detected.`, link:"/AgentOps", linkLabel:"View Ops Dashboard" });

  if (recs.length === 0) {
    recs.push({ icon:"✅", text:`System running clean. ${m.total_leads||0} leads in pipeline. ${m.bookings_confirmed||0} confirmed bookings. Pipeline est: $${((m.hot_leads||0)*avgDeal).toLocaleString()}`, link:null });
  }
  return recs.slice(0, 5);
}

function getAgentHealth(m, alerts) {
  const open = (type) => alerts.filter(a => a.status === "Open" && a.alert_type === type).length;
  const openSrc = (src) => alerts.filter(a => a.status === "Open" && a.source_agent === src).length;

  const a1Stale = open("hot_lead_stale");
  const a2Noshow = open("no_show_unhandled");
  const a3Overdue = open("overdue_followup");
  const a4Ret = open("retention_overdue");
  const totalOpen = alerts.filter(a => a.status === "Open").length;
  const anyCritical = alerts.some(a => a.status === "Open" && a.severity === "critical");

  return [
    {
      label: "Agent 1", sublabel: "INTAKE",
      status: a1Stale > 0 ? "Alert" : (m.hot_not_booked > 0 ? "Warning" : "Healthy"),
      color:  a1Stale > 0 ? "#ff3333" : (m.hot_not_booked > 0 ? "#ffdd00" : "#00ff88"),
      path: "/AgentIntake",
    },
    {
      label: "Agent 2", sublabel: "BOOKING",
      status: a2Noshow > 0 ? "Alert" : "Healthy",
      color:  a2Noshow > 0 ? "#ff3333" : "#00ff88",
      path: "/AgentBooking",
    },
    {
      label: "Agent 3", sublabel: "FOLLOW-UP",
      status: a3Overdue > 0 ? "Alert" : (m.followups_due_today > 0 ? "Warning" : "Healthy"),
      color:  a3Overdue > 0 ? "#ff3333" : (m.followups_due_today > 0 ? "#ffdd00" : "#00ff88"),
      path: "/AgentFollowUp",
    },
    {
      label: "Agent 4", sublabel: "RETENTION",
      status: a4Ret > 0 ? "Alert" : (m.retention_due_today > 0 ? "Warning" : "Healthy"),
      color:  a4Ret > 0 ? "#ff3333" : (m.retention_due_today > 0 ? "#ffdd00" : "#00ff88"),
      path: "/AgentRetention",
    },
    {
      label: "Agent 5", sublabel: "OPS",
      status: anyCritical || totalOpen >= 3 ? "Alert" : totalOpen > 0 ? "Warning" : "Healthy",
      color:  anyCritical || totalOpen >= 3 ? "#ff3333" : totalOpen > 0 ? "#ffdd00" : "#00ff88",
      path: "/AgentOps",
    },
  ];
}

function Sidebar({ openCount }) {
  const badgeColor = "#ff3333";
  return (
    <aside style={{ width:"220px", background:"#0f0f0f", borderRight:"1px solid #1a1a1a", display:"flex", flexDirection:"column", flexShrink:0, minHeight:"100vh" }}>
      <div style={{ padding:"18px 14px", borderBottom:"1px solid #1a1a1a", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"30px", height:"30px", background:"linear-gradient(135deg,#00ff88,#00cc66)", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px" }}>🐒</div>
        <div><div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", fontWeight:"bold" }}>MONKEE BIZZ AI</div><div style={{ fontFamily:"monospace", fontSize:"9px", color:"#333" }}>SAOS v1.0</div></div>
      </div>
      <nav style={{ flex:1, padding:"10px 8px" }}>
        {NAV.map(n => {
          const a = n.path === "/CommandCenter";
          return (
            <a key={n.path} href={n.path} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 10px", borderRadius:"7px", marginBottom:"3px", textDecoration:"none", background:a?"rgba(0,255,136,0.1)":"transparent", border:a?"1px solid rgba(0,255,136,0.25)":"1px solid transparent" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <span style={{ fontSize:"14px" }}>{n.icon}</span>
                <span style={{ fontSize:"12px", color:a?"#00ff88":"#777", fontWeight:a?"600":"400" }}>{n.label}</span>
              </div>
              {n.path === "/AgentOps" && openCount > 0 && (
                <span style={{ background:badgeColor, color:"#fff", fontFamily:"monospace", fontSize:"9px", fontWeight:"bold", padding:"1px 6px", borderRadius:"10px" }}>{openCount}</span>
              )}
            </a>
          );
        })}
      </nav>
      <div style={{ padding:"12px", borderTop:"1px solid #1a1a1a", fontFamily:"monospace", fontSize:"9px", color:"#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

export default function CommandCenter() {
  const [leads, setLeads]         = useState([]);
  const [bookings, setBookings]   = useState([]);
  const [followups, setFollowups] = useState([]);
  const [retEvents, setRetEvents] = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [activity, setActivity]   = useState([]);
  const [reports, setReports]     = useState([]);
  const [settings, setSettings]   = useState({});
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [actFilter, setActFilter] = useState("All");
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  const load = useCallback(async () => {
    const [ld, bk, fu, re, al, act, rh, stgs] = await Promise.all([
      base44.entities.Lead.list(),
      base44.entities.Booking.list(),
      base44.entities.FollowUp.list(),
      base44.entities.RetentionEvents.list(),
      base44.entities.OpsAlerts.list('-detected_at', 100),
      base44.entities.ActivityLog.list('-created_at', 60),
      base44.entities.ReportHistory.list('-generated_at', 7),
      base44.entities.AppSettings.list(),
    ]);
    setLeads(ld || []);
    setBookings(bk || []);
    setFollowups(fu || []);
    setRetEvents(re || []);
    setAlerts(al || []);
    setActivity(act || []);
    setReports(rh || []);
    const stgMap = {};
    (stgs || []).forEach(s => { stgMap[s.key] = s.value; });
    setSettings(stgMap);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const avgDeal  = parseFloat(settings.ops_average_deal_value || '1500');
  const fuOvMs   = parseFloat(settings.ops_followup_overdue_hours || '2') * 3600000;
  const retOvMs  = parseFloat(settings.ops_retention_overdue_hours || '2') * 3600000;
  const now      = Date.now();
  const tz       = settings.app_timezone || "America/Phoenix";
  const today    = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const weekAgo  = new Date(now - 7 * 24 * 3600000);

  const bookingsByLead = {};
  for (const b of bookings) {
    if (!bookingsByLead[b.lead_id]) bookingsByLead[b.lead_id] = [];
    bookingsByLead[b.lead_id].push(b);
  }
  const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));

  const hot_not_booked = leads.filter(l => l.score === "HOT" && !(bookingsByLead[l.id] || []).some(b => ["Requested","Confirmed","Rescheduled","Completed"].includes(b.status))).length;
  const no_shows_not_reengaged = [...new Set(bookings.filter(b => b.no_show_flagged).map(b => b.lead_id))].filter(lid => !followups.some(f => f.lead_id === lid && f.sequence_type === "no_show")).length;

  const metrics = {
    total_leads:           leads.length,
    hot_leads:             leads.filter(l => l.score === "HOT").length,
    warm_leads:            leads.filter(l => l.score === "WARM").length,
    new_leads_today:       leads.filter(l => new Date(l.created_date).toLocaleDateString('en-CA', { timeZone: tz }) === today).length,
    bookings_confirmed:    bookings.filter(b => b.status === "Confirmed").length,
    bookings_this_week:    bookings.filter(b => new Date(b.created_date) >= weekAgo && ["Confirmed","Completed"].includes(b.status)).length,
    bookings_today:        bookings.filter(b => ["Confirmed","Completed","Requested"].includes(b.status) && b.scheduled_date === today).length,
    no_shows:              bookings.filter(b => b.no_show_flagged).length,
    followups_overdue:     followups.filter(f => f.status === "Pending" && (now - new Date(f.scheduled_at).getTime()) > fuOvMs).length,
    followups_due_today:   followups.filter(f => f.status === "Pending" && new Date(f.scheduled_at).toLocaleDateString('en-CA', { timeZone: tz }) === today).length,
    retention_due_today:   retEvents.filter(r => r.status === "Pending" && new Date(r.scheduled_at).toLocaleDateString('en-CA', { timeZone: tz }) === today).length,
    retention_overdue:     retEvents.filter(r => r.status === "Pending" && (now - new Date(r.scheduled_at).getTime()) > retOvMs).length,
    closed_won_month:      leads.filter(l => l.status === "Closed \u2014 Won" && new Date(l.updated_date) >= monthStart).length,
    open_alerts:           alerts.filter(a => a.status === "Open").length,
    critical_alerts:       alerts.filter(a => a.status === "Open" && a.severity === "critical").length,
    contract_violations:   alerts.filter(a => a.status === "Open" && a.alert_type === "contract_violation").length,
    hot_not_booked,
    no_shows_not_reengaged,
    // revenue
    completed_month_count: bookings.filter(b => b.status === "Completed" && new Date(b.updated_date||b.created_date) >= monthStart).length,
    retention_pending:     retEvents.filter(r => r.status === "Pending").length,
  };

  const agentHealth = getAgentHealth(metrics, alerts);
  const recs = getRecommendations(metrics, settings);
  const openAlertsList = alerts.filter(a => a.status === "Open" && !dismissedAlerts.has(a.id))
    .sort((a, b) => { const s = {critical:0,high:1,medium:2,low:3}; return (s[a.severity]||4)-(s[b.severity]||4); });

  const filteredActivity = activity.filter(a => {
    if (actFilter === "All") return true;
    const agent = getAgentFromEvent(a.event);
    return agent === actFilter;
  }).slice(0, 20);

  const $ = (n) => `$${Math.round(n).toLocaleString()}`;
  const M = (key, fallback = 0) => loading ? "…" : (metrics[key] ?? fallback);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0a0a0a", color:"#e0e0e0", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <Sidebar openCount={metrics.open_alerts} />
      <main style={{ flex:1, padding:"28px", overflowX:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px", flexWrap:"wrap", gap:"8px" }}>
          <div>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"3px", marginBottom:"4px" }}>COMMAND CENTER</div>
            <h1 style={{ fontSize:"22px", fontWeight:"700", color:"#fff", margin:"0 0 3px" }}>Monkee Bizz AI — SAOS</h1>
            <p style={{ color:"#555", fontSize:"11px", margin:0, fontFamily:"monospace" }}>
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Loading..."}
            </p>
          </div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <a href="/AgentIntake" style={{ padding:"8px 14px", borderRadius:"7px", cursor:"pointer", fontFamily:"monospace", fontSize:"10px", background:"#00ff8810", border:"1px solid #00ff8844", color:"#00ff88", textDecoration:"none" }}>+ New Lead</a>
            <a href="/AgentBooking" style={{ padding:"8px 14px", borderRadius:"7px", cursor:"pointer", fontFamily:"monospace", fontSize:"10px", background:"transparent", border:"1px solid #1a1a1a", color:"#666", textDecoration:"none" }}>Today's Bookings</a>
            <a href="/AgentFollowUp" style={{ padding:"8px 14px", borderRadius:"7px", cursor:"pointer", fontFamily:"monospace", fontSize:"10px", background:"transparent", border:"1px solid #1a1a1a", color:"#666", textDecoration:"none" }}>Follow-Up Queue</a>
          </div>
        </div>

        {/* Agent Health Row */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
          {agentHealth.map(agent => (
            <a key={agent.label} href={agent.path} style={{ flex:"1", minWidth:"120px", background:"#111", border:`1px solid ${agent.color}33`, borderRadius:"9px", padding:"10px 14px", textDecoration:"none", display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:agent.color, flexShrink:0 }} />
              <div>
                <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#555", letterSpacing:"1px" }}>{agent.sublabel}</div>
                <div style={{ fontSize:"11px", color:agent.color, fontWeight:"600" }}>{agent.status}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Alert Banners */}
        {openAlertsList.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"16px" }}>
            {openAlertsList.slice(0, 5).map(alert => (
              <div key={alert.id} style={{ background: alert.severity==="critical"?"#ff000015":"#ff880010", border:`1px solid ${alert.severity==="critical"?"#ff3333":"#f97316"}44`, borderRadius:"8px", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                  <span style={{ fontSize:"14px" }}>{alert.alert_type==="contract_violation"?"⚡":alert.severity==="critical"?"🚨":"⚠️"}</span>
                  <div>
                    <span style={{ fontFamily:"monospace", fontSize:"9px", color:alert.severity==="critical"?"#ff3333":"#f97316", marginRight:"8px" }}>{alert.severity.toUpperCase()}</span>
                    <span style={{ fontSize:"12px", color:"#ddd" }}>{alert.title}</span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                  <a href="/AgentOps" style={{ fontFamily:"monospace", fontSize:"9px", color:"#8b5cf6", textDecoration:"none" }}>View →</a>
                  <button onClick={() => {
                    resolveOpsAlert({ alert_id: alert.id, action: "acknowledge" });
                    setDismissedAlerts(prev => new Set([...prev, alert.id]));
                  }} style={{ background:"transparent", border:"none", color:"#555", cursor:"pointer", fontSize:"16px", lineHeight:1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Metric Cards Row 1 */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px", marginBottom:"10px" }}>
          {[
            { label:"TOTAL ACTIVE LEADS",    value:M("total_leads"),        color:"#00ff88" },
            { label:"HOT LEADS",             value:M("hot_leads"),          color:"#ff3333", tint:true },
            { label:"BOOKINGS THIS WEEK",    value:M("bookings_this_week"), color:"#00ff88", tint:true },
            { label:"FOLLOW-UPS OVERDUE",    value:M("followups_overdue"),  color: metrics.followups_overdue > 0 ? "#ff3333" : "#555" },
            { label:"CLOSED WON (MONTH)",    value:M("closed_won_month"),   color:"#00ff88", tint:true },
          ].map(c => (
            <div key={c.label} style={{ background:"#111", border:`1px solid ${c.color}22`, borderRadius:"9px", padding:"14px 16px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"8px", color:"#444", letterSpacing:"1px", marginBottom:"6px" }}>{c.label}</div>
              <div style={{ fontSize:"28px", fontWeight:"700", color:c.value > 0 || c.label.includes("TOTAL") ? c.color : "#333", lineHeight:1 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Metric Cards Row 2 */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px", marginBottom:"16px" }}>
          {[
            { label:"NEW TODAY",            value:M("new_leads_today"),      color:"#fff" },
            { label:"APPOINTMENTS TODAY",   value:M("bookings_today"),       color:"#fff" },
            { label:"NO-SHOWS TOTAL",       value:M("no_shows"),             color: metrics.no_shows > 0 ? "#ffdd00" : "#555" },
            { label:"RETENTION DUE TODAY",  value:M("retention_due_today"),  color:"#8b5cf6" },
            { label:"OPEN ALERTS",          value:M("open_alerts"),          color: metrics.critical_alerts > 0 ? "#ff3333" : metrics.open_alerts > 0 ? "#f97316" : "#555" },
          ].map(c => (
            <div key={c.label} style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"9px", padding:"12px 14px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"8px", color:"#444", letterSpacing:"1px", marginBottom:"4px" }}>{c.label}</div>
              <div style={{ fontSize:"22px", fontWeight:"700", color:c.color, lineHeight:1 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Revenue Estimate Card */}
        <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"12px", padding:"18px", marginBottom:"16px" }}>
          <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#fff", letterSpacing:"2px", marginBottom:"14px" }}>PIPELINE REVENUE ESTIMATE</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"12px" }}>
            {[
              { label:"HOT PIPELINE", sub:`${metrics.hot_not_booked} HOT leads unbooked`, value:$(metrics.hot_not_booked * avgDeal), color:"#ff3333", link:"/AgentIntake" },
              { label:"BOOKED PIPELINE", sub:`${metrics.bookings_confirmed} confirmed appointments`, value:$(metrics.bookings_confirmed * avgDeal), color:"#ffdd00", link:"/AgentBooking" },
              { label:"COMPLETED (MONTH)", sub:`${metrics.completed_month_count} jobs completed`, value:$(metrics.completed_month_count * avgDeal), color:"#00ff88", link:"/AgentBooking" },
              { label:"RETENTION OPPORTUNITY", sub:`${metrics.retention_pending} active sequences`, value:$(Math.round(metrics.retention_pending * avgDeal * 0.3)), color:"#8b5cf6", link:"/AgentRetention" },
            ].map(b => (
              <a key={b.label} href={b.link} style={{ background:"#0f0f0f", border:`1px solid ${b.color}22`, borderRadius:"9px", padding:"14px", textDecoration:"none" }}>
                <div style={{ fontFamily:"monospace", fontSize:"8px", color:"#444", letterSpacing:"1px", marginBottom:"6px" }}>{b.label}</div>
                <div style={{ fontSize:"20px", fontWeight:"700", color:b.color, marginBottom:"4px" }}>{loading ? "…" : b.value}</div>
                <div style={{ fontSize:"10px", color:"#555" }}>{loading ? "" : b.sub}</div>
              </a>
            ))}
          </div>
          <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#333" }}>Estimates based on ${avgDeal.toLocaleString()} average deal value. Adjust in Settings → Ops.</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
          {/* Recommendations */}
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"12px", padding:"16px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"12px" }}>TOP PRIORITIES</div>
            {recs.map((r, i) => (
              <div key={i} style={{ padding:"10px 12px", background:"#0f0f0f", borderRadius:"7px", marginBottom:"7px", display:"flex", flexDirection:"column", gap:"4px" }}>
                <div style={{ fontSize:"11px", color:"#ddd", lineHeight:"1.5" }}>{r.icon} {r.text}</div>
                {r.link && <a href={r.link} style={{ fontFamily:"monospace", fontSize:"9px", color:"#00ff88" }}>{r.linkLabel} →</a>}
              </div>
            ))}
          </div>

          {/* Activity Feed */}
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"12px", padding:"16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px" }}>RECENT ACTIVITY</div>
              <div style={{ display:"flex", gap:"4px" }}>
                {["All","Agent 1","Agent 2","Agent 3","Agent 4","Agent 5"].map(f => (
                  <button key={f} onClick={() => setActFilter(f)} style={{ padding:"3px 7px", borderRadius:"4px", cursor:"pointer", fontFamily:"monospace", fontSize:"8px", background:actFilter===f?"#00ff8820":"transparent", border:actFilter===f?"1px solid #00ff8866":"1px solid #1a1a1a", color:actFilter===f?"#00ff88":"#444" }}>
                    {f === "All" ? "All" : f.split(" ")[1]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ maxHeight:"300px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"5px" }}>
              {loading ? <div style={{ fontFamily:"monospace", fontSize:"11px", color:"#333", textAlign:"center", padding:"20px" }}>LOADING...</div>
              : filteredActivity.length === 0 ? <div style={{ fontFamily:"monospace", fontSize:"11px", color:"#2a2a2a", textAlign:"center", padding:"20px" }}>NO ACTIVITY</div>
              : filteredActivity.map(a => {
                const agent = getAgentFromEvent(a.event);
                const color = AGENT_COLORS[agent] || "#444";
                const lead = a.lead_id && a.lead_id !== "system" ? leadMap[a.lead_id] : null;
                return (
                  <div key={a.id} style={{ display:"flex", gap:"8px", padding:"6px 8px", background:"#0f0f0f", borderRadius:"5px", alignItems:"flex-start" }}>
                    <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:color, flexShrink:0, marginTop:"4px" }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"10px", color:"#ddd", lineHeight:"1.4", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.event}</div>
                      {lead && <a href="/AgentIntake" style={{ fontFamily:"monospace", fontSize:"9px", color:"#555", textDecoration:"none" }}>{lead.name}</a>}
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#333", whiteSpace:"nowrap", flexShrink:0 }}>{timeAgo(a.created_at)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Report History Strip */}
        {reports.length > 0 && (
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"12px", padding:"16px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"12px" }}>REPORT HISTORY</div>
            <div style={{ display:"flex", gap:"10px", overflowX:"auto", paddingBottom:"4px" }}>
              {reports.map(r => {
                let parsed = null;
                try { parsed = JSON.parse(r.summary_json || "null"); } catch {}
                const isDaily = r.report_type === "daily_ops_summary";
                return (
                  <div key={r.id} style={{ minWidth:"160px", background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:"8px", padding:"10px 12px", flexShrink:0 }}>
                    <div style={{ fontFamily:"monospace", fontSize:"8px", color: isDaily ? "#8b5cf6" : "#00ff88", marginBottom:"5px" }}>{isDaily ? "DAILY" : "WEEKLY"}</div>
                    <div style={{ fontSize:"10px", color:"#777", marginBottom:"5px" }}>{new Date(r.generated_at).toLocaleDateString()}</div>
                    {parsed && (
                      <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#444", lineHeight:"1.6" }}>
                        {parsed.total_leads !== undefined && <div>Leads: {parsed.total_leads}</div>}
                        {parsed.hot_leads !== undefined && <div>HOT: {parsed.hot_leads}</div>}
                        {parsed.open_alerts !== undefined && <div>Alerts: {parsed.open_alerts}</div>}
                      </div>
                    )}
                    <div style={{ fontFamily:"monospace", fontSize:"8px", color: r.email_sent ? "#00ff88" : "#ff3333", marginTop:"5px" }}>
                      {r.email_sent ? "✓ Sent" : "✗ Not sent"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}