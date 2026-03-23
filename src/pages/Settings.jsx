import React, { useState, useEffect } from "react";
import { createClient } from "@base44/sdk";

const base44 = createClient({ appId: "69b9620de5303495dd309130" });
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
function Sidebar({ current }) {
  return (
    <aside style={{ width:"220px", background:"#0f0f0f", borderRight:"1px solid #1a1a1a", display:"flex", flexDirection:"column", flexShrink:0, minHeight:"100vh" }}>
      <div style={{ padding:"18px 14px", borderBottom:"1px solid #1a1a1a", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"30px", height:"30px", background:"linear-gradient(135deg,#00ff88,#00cc66)", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px" }}>🐒</div>
        <div><div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", fontWeight:"bold" }}>MONKEE BIZZ AI</div><div style={{ fontFamily:"monospace", fontSize:"9px", color:"#333" }}>SAOS v1.0</div></div>
      </div>
      <nav style={{ flex:1, padding:"10px 8px" }}>
        {NAV.map(n => { const a = current===n.path; return <a key={n.path} href={n.path} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"9px 10px", borderRadius:"7px", marginBottom:"3px", textDecoration:"none", background:a?"rgba(0,255,136,0.1)":"transparent", border:a?"1px solid rgba(0,255,136,0.25)":"1px solid transparent" }}><span style={{ fontSize:"14px" }}>{n.icon}</span><span style={{ fontSize:"12px", color:a?"#00ff88":"#777", fontWeight:a?"600":"400" }}>{n.label}</span></a>; })}
      </nav>
      <div style={{ padding:"12px", borderTop:"1px solid #1a1a1a", fontFamily:"monospace", fontSize:"9px", color:"#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

const INP = { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: "7px", padding: "9px 11px", color: "#ddd", fontSize: "12px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const LBL = { display: "block", fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "4px" };

export default function Settings() {
  const [settings, setSettings] = useState({
    calendly_api_key: "",
    calendly_event_url: "",
    booking_slots_count: "3",
    booking_buffer_days: "2",
    reminder_24hr_enabled: "true",
    reminder_1hr_enabled: "true",
    no_show_window_minutes: "30"
  });
  const [saving, setSaving] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const all = await AppSettings.list();
        const loaded = {};
        all.forEach(s => { loaded[s.key] = s.value; });
        setSettings(prev => ({ ...prev, ...loaded }));
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const saveSetting = async (key, value) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const existing = await AppSettings.filter({ key });
      if (existing.length > 0) {
        await AppSettings.update(existing[0].id, { value, category: "booking" });
      } else {
        await AppSettings.create({ key, value, category: "booking" });
      }
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (e) { console.error(e); }
    setSaving(prev => ({ ...prev, [key]: false }));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    saveSetting(key, value);
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0a0a0a", color:"#e0e0e0", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <Sidebar current="/Settings" />
      <main style={{ flex:1, padding:"28px" }}>
        <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"3px", marginBottom:"6px" }}>SYSTEM</div>
        <h1 style={{ fontSize:"22px", fontWeight:"700", color:"#fff", margin:"0 0 4px" }}>Settings</h1>
        <p style={{ color:"#555", fontSize:"13px", marginBottom:"28px" }}>System configuration and admin controls.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"14px", maxWidth:"560px" }}>
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"14px" }}>SYSTEM INFO</div>
            {[["System","Monkee Bizz AI — SAOS"],["Version","1.0.0"],["Build","Foundation"],["Agents","5 / 5 slots"],["Tasks per Agent","5 max"],["Status","OPERATIONAL"]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #0f0f0f", fontSize:"12px" }}>
                <span style={{ color:"#444", fontFamily:"monospace", fontSize:"10px" }}>{k}</span>
                <span style={{ color:"#aaa" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"14px" }}>AGENT 2 — BOOKING SETTINGS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
              <div>
                <label style={LBL}>CALENDLY API KEY</label>
                <input type="password" style={INP} value={settings.calendly_api_key} onChange={e => handleChange("calendly_api_key", e.target.value)} placeholder="Enter Calendly API key..." />
                <div style={{ fontSize:"10px", color:"#333", marginTop:"3px" }}>Found in Calendly account settings under Integrations</div>
              </div>
              <div>
                <label style={LBL}>CALENDLY BOOKING LINK</label>
                <input style={INP} value={settings.calendly_event_url} onChange={e => handleChange("calendly_event_url", e.target.value)} placeholder="https://calendly.com/yourname/appointment" />
                <div style={{ fontSize:"10px", color:"#333", marginTop:"3px" }}>Your public Calendly scheduling link</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <div>
                  <label style={LBL}>TIME SLOTS TO OFFER</label>
                  <input type="number" style={INP} value={settings.booking_slots_count} onChange={e => handleChange("booking_slots_count", e.target.value)} min="2" max="5" />
                  <div style={{ fontSize:"10px", color:"#333", marginTop:"3px" }}>How many slots to show (2-5)</div>
                </div>
                <div>
                  <label style={LBL}>EARLIEST AVAILABLE SLOT</label>
                  <select style={{ ...INP, cursor:"pointer" }} value={settings.booking_buffer_days} onChange={e => handleChange("booking_buffer_days", e.target.value)}>
                    <option value="0">Same day</option>
                    <option value="1">1 day out</option>
                    <option value="2">2 days out (recommended)</option>
                    <option value="3">3 days out</option>
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <div>
                  <label style={LBL}>24HR REMINDER</label>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <input type="checkbox" checked={settings.reminder_24hr_enabled === "true"} onChange={e => handleChange("reminder_24hr_enabled", e.target.checked ? "true" : "false")} />
                    <span style={{ fontSize:"11px", color:"#aaa" }}>Send 24hr reminder</span>
                  </div>
                </div>
                <div>
                  <label style={LBL}>1HR REMINDER</label>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <input type="checkbox" checked={settings.reminder_1hr_enabled === "true"} onChange={e => handleChange("reminder_1hr_enabled", e.target.checked ? "true" : "false")} />
                    <span style={{ fontSize:"11px", color:"#aaa" }}>Send 1hr reminder</span>
                  </div>
                </div>
              </div>
              <div>
                <label style={LBL}>MARK NO-SHOW AFTER</label>
                <select style={{ ...INP, cursor:"pointer" }} value={settings.no_show_window_minutes} onChange={e => handleChange("no_show_window_minutes", e.target.value)}>
                  <option value="15">15 minutes past appointment</option>
                  <option value="30">30 minutes past appointment</option>
                  <option value="60">1 hour past appointment</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"11px", padding:"18px" }}>
            <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px", marginBottom:"14px" }}>QUICK LINKS</div>
            <a href="/LeadForm" style={{ display:"inline-block", background:"transparent", border:"1px solid #00ff8844", color:"#00ff88", padding:"9px 18px", borderRadius:"7px", textDecoration:"none", fontFamily:"monospace", fontSize:"11px", letterSpacing:"1px" }}>
              📋 OPEN PUBLIC LEAD FORM →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}