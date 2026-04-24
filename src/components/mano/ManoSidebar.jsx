import React from "react";

const NAV = [
  { label: "Command Center", path: "/CommandCenter", icon: "⚡" },
  { label: "Agent 1: Intake",    path: "/AgentIntake",    icon: "🤖" },
  { label: "Agent 2: Booking",   path: "/AgentBooking",   icon: "🤖" },
  { label: "Agent 3: Follow-Up", path: "/AgentFollowUp",  icon: "🤖" },
  { label: "Agent 4: Retention", path: "/AgentRetention", icon: "🤖" },
  { label: "Agent 5: Ops",       path: "/AgentOps",       icon: "🤖" },
  { label: "Chat Center",        path: "/ChatCenter",      icon: "💬" },
  { label: "Settings",           path: "/Settings",        icon: "⚙️" },
  { label: "📋 Lead Form",       path: "/LeadForm",        icon: ""   },
];

const GOLD = "#c9973a";

export default function ManoSidebar({ current }) {
  return (
    <aside style={{
      width: "220px",
      background: "#0c0c0c",
      borderRight: "1px solid #1e1a13",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      minHeight: "100vh",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid #1e1a13" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <div style={{
            width: "32px", height: "32px",
            background: `linear-gradient(135deg, ${GOLD}, #a07830)`,
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px",
            boxShadow: `0 0 12px ${GOLD}44`,
          }}>🐒</div>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: GOLD, letterSpacing: "2px", fontWeight: "bold" }}>MONKEE BIZZ AI</div>
            <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#3a3020" }}>SAOS v1.0</div>
          </div>
        </div>
        <div style={{ marginTop: "8px", padding: "4px 8px", background: `${GOLD}12`, border: `1px solid ${GOLD}30`, borderRadius: "4px" }}>
          <span style={{ fontFamily: "monospace", fontSize: "8px", color: GOLD, letterSpacing: "1px" }}>● MANO ONLINE</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV.map(n => {
          const a = current === n.path;
          return (
            <a key={n.path} href={n.path} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "9px 10px", borderRadius: "7px", marginBottom: "2px",
              textDecoration: "none",
              background: a ? `${GOLD}14` : "transparent",
              border: a ? `1px solid ${GOLD}35` : "1px solid transparent",
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: "13px" }}>{n.icon}</span>
              <span style={{ fontSize: "12px", color: a ? GOLD : "#555", fontWeight: a ? "600" : "400" }}>{n.label}</span>
            </a>
          );
        })}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1a13", fontFamily: "monospace", fontSize: "8px", color: "#2a2215" }}>
        SAOS BUILD 1 · MANO CORE
      </div>
    </aside>
  );
}