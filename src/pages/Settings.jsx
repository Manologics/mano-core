import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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

const INP = { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: "7px", padding: "8px 11px", color: "#ddd", fontSize: "12px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const LBL = { display: "block", fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "5px" };
const HINT = { fontSize: "10px", color: "#333", marginTop: "4px", fontFamily: "monospace" };

export default function Settings() {
  const [s, setS] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});

  useEffect(() => {
    AppSettings.list().then(rows => {
      const map = {};
      rows.forEach(r => { map[r.key] = r.value; });
      setS(map);
    }).catch(console.error);
  }, []);

  const saveSetting = async (key, value) => {
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const rows = await AppSettings.list();
      const existing = rows.find(r => r.key === key);
      if (existing) {
        await AppSettings.update(existing.id, { value: String(value) });
      } else {
        await AppSettings.create({ key, value: String(value), category: "agent3" });
      }
      setSaved(p => ({ ...p, [key]: true }));
      setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 1500);
    } catch (e) { console.error(e); }
    setSaving(p => ({ ...p, [key]: false }));
  };

  const set = (key, value) => {
    setS(p => ({ ...p, [key]: value }));
  };

  const numField = (key, label, def, min, hint) => (
    <div>
      <label style={LBL}>{label}</label>
      <div style={{ display: "flex", gap: "8px" }}>
        <input type="number" min={min} style={{ ...INP, width: "120px" }}
          value={s[key] ?? def}
          onChange={e => set(key, e.target.value)}
          onBlur={e => saveSetting(key, e.target.value)} />
        {saving[key] && <span style={{ fontSize: "10px", color: "#f59e0b", fontFamily: "monospace", alignSelf: "center" }}>SAVING...</span>}
        {saved[key] && <span style={{ fontSize: "10px", color: "#00ff88", fontFamily: "monospace", alignSelf: "center" }}>SAVED ✓</span>}
      </div>
      <div style={HINT}>{hint}</div>
    </div>
  );

  const toggleField = (key, label, def, hint) => {
    const val = s[key] !== undefined ? s[key] === "true" : def;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #0f0f0f" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#ddd", marginBottom: "2px" }}>{label}</div>
          <div style={HINT}>{hint}</div>
        </div>
        <button onClick={() => { const nv = !val; set(key, String(nv)); saveSetting(key, String(nv)); }}
          style={{ width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer", background: val ? "#00ff88" : "#1a1a1a", position: "relative", transition: "background 0.2s", flexShrink: 0, marginLeft: "16px" }}>
          <div style={{ position: "absolute", top: "3px", left: val ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <Sidebar current="/Settings" />
      <main style={{ flex: 1, padding: "28px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "3px", marginBottom: "6px" }}>SYSTEM</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px" }}>Settings</h1>
        <p style={{ color: "#555", fontSize: "13px", marginBottom: "28px" }}>System configuration and admin controls.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "580px" }}>

          {/* System Info */}
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "11px", padding: "18px" }}>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px", marginBottom: "14px" }}>SYSTEM INFO</div>
            {[["System", "Monkee Bizz AI — SAOS"], ["Version", "1.0.0"], ["Build", "Foundation"], ["Agents", "5 / 5 slots"], ["Tasks per Agent", "5 max"], ["Status", "OPERATIONAL"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0f0f0f", fontSize: "12px" }}>
                <span style={{ color: "#444", fontFamily: "monospace", fontSize: "10px" }}>{k}</span>
                <span style={{ color: "#aaa" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Agent 3 Follow-Up Settings */}
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "11px", padding: "18px" }}>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#f59e0b", letterSpacing: "2px", marginBottom: "18px" }}>AGENT 3 — FOLLOW-UP SETTINGS</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "6px" }}>
              {numField("followup_delay_1_hours", "FIRST FOLLOW-UP (HOURS AFTER LEAD CREATED)", 24, 1, "Hours to wait before sending first follow-up")}
              {numField("followup_delay_2_hours", "SECOND FOLLOW-UP (HOURS AFTER FIRST)", 48, 1, "Hours after first follow-up to send second follow-up")}
              {numField("followup_delay_3_hours", "FINAL FOLLOW-UP (HOURS AFTER SECOND)", 96, 1, "Hours after second follow-up to send final follow-up")}
              {numField("no_show_followup_hours", "NO-SHOW FOLLOW-UP (HOURS AFTER NO-SHOW)", 2, 1, "Hours after no-show before first re-engagement attempt")}
            </div>

            <div style={{ marginTop: "8px" }}>
              {toggleField("followup_enabled", "Automated Follow-Up Active", true, "Turn off to pause all automated follow-up sequences")}
              {toggleField("reengage_enabled", "Allow Manual Re-Engagement", true, "Allow archived leads to be manually re-engaged by admin")}
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "11px", padding: "18px" }}>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px", marginBottom: "14px" }}>QUICK LINKS</div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a href="/LeadForm" style={{ display: "inline-block", background: "transparent", border: "1px solid #00ff8844", color: "#00ff88", padding: "9px 18px", borderRadius: "7px", textDecoration: "none", fontFamily: "monospace", fontSize: "11px", letterSpacing: "1px" }}>
                📋 OPEN PUBLIC LEAD FORM →
              </a>
              <a href="/AgentFollowUp" style={{ display: "inline-block", background: "transparent", border: "1px solid #f59e0b44", color: "#f59e0b", padding: "9px 18px", borderRadius: "7px", textDecoration: "none", fontFamily: "monospace", fontSize: "11px", letterSpacing: "1px" }}>
                🔁 FOLLOW-UP QUEUE →
              </a>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}