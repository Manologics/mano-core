import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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

const INP  = { width:"100%", background:"#0f0f0f", border:"1px solid #222", borderRadius:"7px", padding:"9px 11px", color:"#ddd", fontSize:"12px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
const LBL  = { display:"block", fontFamily:"monospace", fontSize:"9px", color:"#555", letterSpacing:"2px", marginBottom:"4px" };
const HINT = { fontFamily:"monospace", fontSize:"9px", color:"#2a2a2a", marginTop:"4px", letterSpacing:"1px" };

function Sidebar() {
  return (
    <aside style={{ width:"220px", background:"#0f0f0f", borderRight:"1px solid #1a1a1a", display:"flex", flexDirection:"column", flexShrink:0, minHeight:"100vh" }}>
      <div style={{ padding:"18px 14px", borderBottom:"1px solid #1a1a1a", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"30px", height:"30px", background:"linear-gradient(135deg,#00ff88,#00cc66)", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px" }}>🐒</div>
        <div><div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", fontWeight:"bold" }}>MONKEE BIZZ AI</div><div style={{ fontFamily:"monospace", fontSize:"9px", color:"#333" }}>SAOS v1.0</div></div>
      </div>
      <nav style={{ flex:1, padding:"10px 8px" }}>
        {NAV.map(n => {
          const a = n.path === "/Settings";
          return <a key={n.path} href={n.path} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"9px 10px", borderRadius:"7px", marginBottom:"3px", textDecoration:"none", background:a?"rgba(0,255,136,0.1)":"transparent", border:a?"1px solid rgba(0,255,136,0.25)":"1px solid transparent" }}><span style={{ fontSize:"14px" }}>{n.icon}</span><span style={{ fontSize:"12px", color:a?"#00ff88":"#777", fontWeight:a?"600":"400" }}>{n.label}</span></a>;
        })}
      </nav>
      <div style={{ padding:"12px", borderTop:"1px solid #1a1a1a", fontFamily:"monospace", fontSize:"9px", color:"#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

export default function Settings() {
  const [s, setS]     = useState({});
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AppSettings.list().then(list => {
      const map = {};
      (list || []).forEach(x => { map[x.key] = x.value; });
      setS(map);
      setLoading(false);
    });
  }, []);

  const set = (key, value) => setS(prev => ({ ...prev, [key]: value }));

  const saveSetting = async (key, value) => {
    const list = await base44.entities.AppSettings.list();
    const existing = list.find(x => x.key === key);
    if (existing) {
      await base44.entities.AppSettings.update(existing.id, { value: String(value) });
    } else {
      await base44.entities.AppSettings.create({ key, value: String(value) });
    }
    setSaved(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
  };

  const field = (key, label, hint, type = "text", placeholder = "") => (
    <div key={key}>
      <label style={LBL}>{label}</label>
      <input style={INP} type={type} value={s[key] || ""} placeholder={placeholder}
        onChange={e => set(key, e.target.value)}
        onBlur={e => saveSetting(key, e.target.value)} />
      {saved[key] && <div style={{ ...HINT, color:"#00ff88" }}>SAVED ✓</div>}
      {hint && <div style={HINT}>{hint}</div>}
    </div>
  );

  const numField = (key, label, defaultVal, min = 0, hint = "") => (
    <div key={key}>
      <label style={LBL}>{label}</label>
      <input style={{ ...INP, width:"120px" }} type="number" min={min}
        value={s[key] !== undefined ? s[key] : defaultVal}
        onChange={e => set(key, e.target.value)}
        onBlur={e => saveSetting(key, e.target.value)} />
      {saved[key] && <div style={{ ...HINT, color:"#00ff88" }}>SAVED ✓</div>}
      {hint && <div style={HINT}>{hint}</div>}
    </div>
  );

  const toggleField = (key, label, defaultOn, hint = "") => {
    const isOn = s[key] !== undefined ? s[key] === "true" : defaultOn;
    return (
      <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0", borderBottom:"1px solid #0f0f0f" }}>
        <div>
          <div style={{ fontSize:"12px", color:"#aaa" }}>{label}</div>
          {hint && <div style={{ ...HINT, marginTop:"2px" }}>{hint}</div>}
        </div>
        <button onClick={() => { const v = !isOn; set(key, String(v)); saveSetting(key, String(v)); }}
          style={{ width:"40px", height:"22px", borderRadius:"11px", border:"none", cursor:"pointer", background:isOn?"#00ff88":"#222", position:"relative", flexShrink:0, marginTop:"2px" }}>
          <div style={{ width:"16px", height:"16px", borderRadius:"50%", background:"#fff", position:"absolute", top:"3px", left:isOn?"21px":"3px", transition:"left 0.15s" }} />
        </button>
      </div>
    );
  };

  const criticalKeys = ["business_name","admin_email","app_url","calendly_event_url"];
  const missing = criticalKeys.filter(k => !s[k]);

  if (loading) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", background:"#0a0a0a", color:"#e0e0e0", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
        <Sidebar />
        <main style={{ flex:1, padding:"28px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontFamily:"monospace", fontSize:"11px", color:"#333" }}>LOADING...</div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0a0a0a", color:"#e0e0e0", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <Sidebar />
      <main style={{ flex:1, padding:"28px", overflowY:"auto" }}>
        <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"3px", marginBottom:"6px" }}>SYSTEM</div>
        <h1 style={{ fontSize:"22px", fontWeight:"700", color:"#fff", margin:"0 0 4px" }}>Settings</h1>
        <p style={{ color:"#555", fontSize:"13px", marginBottom:"24px" }}>System configuration and admin controls.</p>

        <div style={{ display:"flex", flexDirection:"column", gap:"14px", maxWidth:"620px" }}>

          {/* Launch Checklist Warning */}
          {missing.length > 0 && (
            <div style={{ background:"#ff000010", border:"1px solid #ff333322", borderRadius:"10px", padding:"14px 18px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#ff3333", letterSpacing:"2px", marginBottom:"7px" }}>⚠ LAUNCH CHECKLIST — INCOMPLETE</div>
              <div style={{ fontSize:"11px", color:"#ff5555", lineHeight:"1.7" }}>
                Missing: {missing.join(", ")}
              </div>
              <div style={{ fontSize:"11px", color:"#555", marginTop:"10px", fontFamily:"monospace" }}>
                Set these below to prevent broken emails and dead links at launch.
              </div>
            </div>
          )}

          {/* General Settings */}
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"18px" }}>GENERAL SETTINGS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              {field("business_name", "BUSINESS NAME", "Used in all email subjects and signatures", "text", "e.g. Monkee Bizz AI")}
              {field("admin_email", "ADMIN EMAIL", "All system alerts and summaries are sent here", "email", "e.g. info@yourbusiness.com")}
              {field("app_url", "APP URL", "Used to generate deep links in admin notification emails", "text", "e.g. https://yourapp.base44.app")}
              <div>
                <label style={LBL}>APP TIMEZONE</label>
                <select style={{ ...INP, cursor:"pointer" }}
                  value={s["app_timezone"] || "America/Phoenix"}
                  onChange={e => { set("app_timezone", e.target.value); saveSetting("app_timezone", e.target.value); }}>
                  <option value="America/Phoenix">US — Mountain (Phoenix, no DST)</option>
                  <option value="America/New_York">US — Eastern (New York)</option>
                  <option value="America/Chicago">US — Central (Chicago)</option>
                  <option value="America/Denver">US — Mountain (Denver)</option>
                  <option value="America/Los_Angeles">US — Pacific (Los Angeles)</option>
                  <option value="America/Anchorage">US — Alaska</option>
                  <option value="Pacific/Honolulu">US — Hawaii</option>
                </select>
                {saved["app_timezone"] && <div style={{ ...HINT, color:"#00ff88" }}>SAVED ✓</div>}
                <div style={HINT}>Used for all email timestamps and daily schedule times</div>
              </div>
            </div>
          </div>

          {/* Calendly */}
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"18px" }}>CALENDLY — BOOKING SETTINGS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              {field("calendly_api_key", "CALENDLY API KEY", "Get this from calendly.com → Integrations → API & Webhooks", "password", "Personal access token")}
              {field("calendly_event_url", "CALENDLY EVENT URL", "Included in every follow-up and booking confirmation email", "text", "e.g. https://calendly.com/yourname/30min")}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                {numField("booking_buffer_days", "BUFFER DAYS", 2, 0, "Days ahead before first available slot")}
                {numField("booking_slots_count", "SLOTS TO SHOW", 3, 1, "Number of time slots to offer")}
              </div>
              <div>
                {toggleField("reminder_24hr_enabled", "24-Hour Reminder", true, "Send reminder email 24 hours before appointment")}
                {toggleField("reminder_1hr_enabled", "1-Hour Reminder", true, "Send reminder email 1 hour before appointment")}
              </div>
            </div>
          </div>

          {/* Agent 3 — Follow-Up */}
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#f59e0b", letterSpacing:"2px", marginBottom:"18px" }}>AGENT 3 — FOLLOW-UP SETTINGS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              {numField("followup_delay_1_hours", "FIRST FOLLOW-UP (HOURS AFTER LEAD CREATED)", 24, 1, "Hours to wait before sending first follow-up")}
              {numField("followup_delay_2_hours", "SECOND FOLLOW-UP (HOURS AFTER FIRST)", 48, 1, "Hours after first follow-up to send second follow-up")}
              {numField("followup_delay_3_hours", "FINAL FOLLOW-UP (HOURS AFTER SECOND)", 96, 1, "Hours after second follow-up to send final follow-up")}
              {numField("no_show_followup_hours", "NO-SHOW FOLLOW-UP (HOURS AFTER NO-SHOW)", 2, 1, "Hours after no-show before first re-engagement attempt")}
            </div>
            <div style={{ marginTop:"8px" }}>
              {toggleField("followup_enabled", "Automated Follow-Up Active", true, "Turn off to pause all automated follow-up sequences")}
              {toggleField("reengage_enabled", "Allow Manual Re-Engagement", true, "Allow archived leads to be manually re-engaged by admin")}
            </div>
          </div>

          {/* Agent 4 — Retention */}
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#8b5cf6", letterSpacing:"2px", marginBottom:"18px" }}>AGENT 4 — RETENTION SETTINGS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              {numField("retention_satisfaction_days", "SATISFACTION CHECK (DAYS AFTER COMPLETED BOOKING)", 2, 1, "Days after completed appointment before first check-in")}
              {numField("retention_review_days",       "REVIEW REQUEST (DAYS AFTER SATISFACTION CHECK)",   3, 1, "Days after satisfaction check before asking for a review")}
              {numField("retention_referral_days",     "REFERRAL ASK (DAYS AFTER REVIEW REQUEST)",         7, 1, "Days after review request before asking for referrals")}
              {numField("retention_upsell_days",       "UPSELL OFFER (DAYS AFTER REFERRAL ASK)",          14, 1, "Days after referral ask before sending next service offer")}
              {numField("retention_reengage_days",     "PAST CLIENT RE-ENGAGE (DAYS AFTER UPSELL)",       45, 1, "Days after upsell before reactivating past client")}
              {field("retention_review_link",    "REVIEW LINK",                "Public link where clients can leave a review",   "text", "https://g.page/yourbusiness/review")}
              {field("retention_referral_offer", "REFERRAL OFFER MESSAGE",     "Included in referral ask email",                "text", "We appreciate referrals and will take great care of anyone you send our way.")}
              {field("retention_upsell_link",    "UPSELL CALL-TO-ACTION LINK", "Link for next service follow-up or rebooking",  "text", "https://calendly.com/yourlink")}
              {field("retention_from_name",      "FROM NAME",                  "Sender name used in all retention emails",       "text", s["business_name"] || "Your Business Name")}
            </div>
            <div style={{ marginTop:"8px" }}>
              {toggleField("retention_enabled", "Automated Retention Active", true, "Turn off to pause all automated retention sequences")}
            </div>
          </div>

          {/* Agent 5 — Ops */}
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#8b5cf6", letterSpacing:"2px", marginBottom:"18px" }}>AGENT 5 — OPS SETTINGS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              <div>
                <label style={LBL}>DAILY OPS SUMMARY TIME</label>
                <input style={{ ...INP, width:"160px" }} type="time"
                  value={s["ops_summary_time"] || "07:30"}
                  onChange={e => set("ops_summary_time", e.target.value)}
                  onBlur={e => saveSetting("ops_summary_time", e.target.value)} />
                {saved["ops_summary_time"] && <div style={{ ...HINT, color:"#00ff88" }}>SAVED ✓</div>}
                <div style={HINT}>Time each day to send the full system ops summary</div>
              </div>
              {numField("ops_hot_lead_stale_minutes", "HOT LEAD STALE THRESHOLD (MINUTES)", 30, 5, "Minutes before a HOT lead with no booking or contact is flagged as stale")}
              {numField("ops_followup_overdue_hours", "FOLLOW-UP OVERDUE THRESHOLD (HOURS)", 2, 1, "Hours after scheduled follow-up before alerting")}
              {numField("ops_retention_overdue_hours", "RETENTION OVERDUE THRESHOLD (HOURS)", 2, 1, "Hours after scheduled retention event before alerting")}
              {numField("ops_noshow_escalation_hours", "NO-SHOW ESCALATION DELAY (HOURS)", 6, 1, "Hours after no-show before alerting if no follow-up sequence has been created")}
              {field("ops_admin_email", "CRITICAL ALERT EMAIL", "Email for critical system alerts. Can differ from standard admin notification email.", "email", "admin@monkeebizzai.com")}
              {numField("ops_average_deal_value", "AVERAGE DEAL VALUE ($)", 1500, 0, "Used to estimate pipeline revenue across all stages. Keep it realistic for your average closed job value. Adjust anytime.")}
            </div>
            <div style={{ marginTop:"8px" }}>
              {toggleField("ops_summary_enabled", "Daily Ops Summary Active", true, "Turn off to pause daily ops summary emails")}
              {toggleField("ops_critical_alerts_enabled", "Instant Critical Alerts Active", true, "Fire immediate email when critical severity alert is created")}
              {toggleField("ops_auto_resolve_enabled", "Auto Resolve Alerts When Fixed", true, "Automatically resolve alerts when underlying condition clears")}
              {toggleField("ops_weekly_digest_enabled", "Weekly Performance Digest Active", true, "Send weekly performance digest every Monday at 8:30 AM")}
            </div>
          </div>

          {/* System Info */}
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"14px" }}>SYSTEM INFO</div>
            {[["System","Monkee Bizz AI — SAOS"],["Version","1.0.0"],["Build","Foundation"],["Agents","5 / 5 slots"],["Status","OPERATIONAL"]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #0f0f0f", fontSize:"12px" }}>
                <span style={{ color:"#444", fontFamily:"monospace", fontSize:"10px" }}>{k}</span>
                <span style={{ color:"#aaa" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"14px" }}>QUICK LINKS</div>
            <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
              <a href="/LeadForm" style={{ display:"inline-block", background:"transparent", border:"1px solid #00ff8844", color:"#00ff88", padding:"9px 18px", borderRadius:"7px", textDecoration:"none", fontFamily:"monospace", fontSize:"11px", letterSpacing:"1px" }}>
                📋 OPEN PUBLIC LEAD FORM →
              </a>
              <a href="/AgentFollowUp" style={{ display:"inline-block", background:"transparent", border:"1px solid #f59e0b44", color:"#f59e0b", padding:"9px 18px", borderRadius:"7px", textDecoration:"none", fontFamily:"monospace", fontSize:"11px", letterSpacing:"1px" }}>
                🔁 FOLLOW-UP QUEUE →
              </a>
              <a href="/AgentOps" style={{ display:"inline-block", background:"transparent", border:"1px solid #8b5cf644", color:"#8b5cf6", padding:"9px 18px", borderRadius:"7px", textDecoration:"none", fontFamily:"monospace", fontSize:"11px", letterSpacing:"1px" }}>
                🛡️ OPS DASHBOARD →
              </a>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}