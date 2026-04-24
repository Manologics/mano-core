import React, { useState } from "react";
import SmsPortal from "@/components/chat/SmsPortal";
import ManoAiChat from "@/components/chat/ManoAiChat";

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

export default function ChatCenter() {
  const [tab, setTab] = useState("sms");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <Sidebar current="/ChatCenter" />
      <main style={{ flex: 1, padding: "28px", overflow: "hidden" }}>
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "3px", marginBottom: "5px" }}>COMMUNICATIONS</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px" }}>Chat Center</h1>
        <p style={{ color: "#555", fontSize: "12px", marginBottom: "18px" }}>SMS inbox and AI ops assistant.</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "#0d0d0d", border: "1px solid #181818", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
          {[
            { id: "sms", label: "💬  SMS Portal" },
            { id: "ai", label: "🐒  Mano AI" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "9px 20px", borderRadius: "7px", fontFamily: "inherit", fontSize: "13px", fontWeight: "600", cursor: "pointer", border: "none", transition: "all 0.2s", background: tab === t.id ? "#1c1c1c" : "transparent", color: tab === t.id ? "#fff" : "#555", boxShadow: tab === t.id ? "0 1px 8px rgba(0,0,0,0.7)" : "none" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "sms" && <SmsPortal />}
        {tab === "ai" && <ManoAiChat />}
      </main>
    </div>
  );
}