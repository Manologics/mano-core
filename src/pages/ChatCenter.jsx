import React, { useState } from "react";
import ManoSidebar from "@/components/mano/ManoSidebar";
import SmsDashboard from "@/components/mano/SmsDashboard";
import ManoAiPanel from "@/components/mano/ManoAiPanel";
import LeadPipeline from "@/components/mano/LeadPipeline";
import ActivityFeed from "@/components/mano/ActivityFeed";

const GOLD = "#c9973a";

const TABS = [
  { id: "sms",      label: "💬  SMS Dashboard",   sub: "Conversations & replies" },
  { id: "ai",       label: "🐒  Mano AI",          sub: "Chat & simulate" },
  { id: "pipeline", label: "📋  Lead Pipeline",    sub: "New → Booked → Won" },
  { id: "feed",     label: "⚡  Activity Feed",    sub: "Real-time MANO actions" },
];

export default function ChatCenter() {
  const [tab, setTab] = useState("sms");
  const active = TABS.find(t => t.id === tab);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#080706", color: "#e0d8c8", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <ManoSidebar current="/ChatCenter" />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "100vh" }}>
        {/* ── Top Bar ── */}
        <div style={{ padding: "20px 28px 0", background: "#0a0907", borderBottom: `1px solid #1e1a13` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" }}>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: GOLD, letterSpacing: "4px", marginBottom: "5px" }}>
                MANO ADMIN · COMMUNICATIONS HUB
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#e8dfc8", margin: 0 }}>Chat Center</h1>
              <div style={{ fontSize: "12px", color: "#4a4030", marginTop: "3px" }}>{active?.sub}</div>
            </div>
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "#0f0e0b", border: `1px solid #2a2215`, borderRadius: "8px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00cc66", boxShadow: "0 0 8px #00cc66" }} />
              <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#00cc66", letterSpacing: "1px" }}>MANO ONLINE</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "2px" }}>
            {TABS.map(t => {
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{
                    padding: "11px 22px",
                    fontFamily: "inherit", fontSize: "13px", fontWeight: "600",
                    cursor: "pointer", border: "none",
                    background: isActive ? "#0d0c0a" : "transparent",
                    color: isActive ? "#e8dfc8" : "#4a4030",
                    borderRadius: "10px 10px 0 0",
                    borderTop: isActive ? `2px solid ${GOLD}` : "2px solid transparent",
                    borderLeft: isActive ? `1px solid #2a2215` : "1px solid transparent",
                    borderRight: isActive ? `1px solid #2a2215` : "1px solid transparent",
                    transition: "all 0.15s",
                    marginBottom: "-1px",
                    position: "relative", zIndex: isActive ? 2 : 1,
                  }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, padding: "20px 28px", overflow: "auto", background: "#0a0907" }}>
          {tab === "sms"      && <SmsDashboard />}
          {tab === "ai"       && <ManoAiPanel />}
          {tab === "pipeline" && <LeadPipeline />}
          {tab === "feed"     && <ActivityFeed />}
        </div>
      </main>
    </div>
  );
}