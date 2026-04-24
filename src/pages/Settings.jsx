import React from "react";

const NAV = [
  { label: "Command Center", path: "/CommandCenter", icon: "⚡" },
  { label: "Agent 1: Intake", path: "/AgentIntake", icon: "🤖" },
  { label: "Agent 2: Booking", path: "/AgentBooking", icon: "🤖" },
  { label: "Agent 3: Follow-Up", path: "/AgentFollowUp", icon: "🤖" },
  { label: "Agent 4: Retention", path: "/AgentRetention", icon: "🤖" },
  { label: "Agent 5: Ops", path: "/AgentOps", icon: "🤖" },
  { label: "Chat Center", path: "/ChatCenter", icon: "💬" },
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

export default function Settings() {
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