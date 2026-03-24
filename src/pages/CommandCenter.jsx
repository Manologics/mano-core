import React, { useState, useEffect } from "react";
import { createClient } from "@base44/sdk";

const base44 = createClient({ appId: "69b9620de5303495dd309130" });
const Lead = base44.entities.Lead;
const Booking = base44.entities.Booking;
const FollowUp = base44.entities.FollowUp;

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

function ScoreBadge({ score }) {
  const s = score === "HOT" ? { c: "#ff3333", bg: "#ff000020" }
    : score === "WARM" ? { c: "#ffdd00", bg: "#ffdd0020" }
    : { c: "#888", bg: "#88888820" };
  return <span style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold", color: s.c, background: s.bg, border: `1px solid ${s.c}44`, padding: "2px 8px", borderRadius: "4px", letterSpacing: "1px" }}>{score || "—"}</span>;
}

export default function CommandCenter() {
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([Lead.list(), Booking.list(), FollowUp.list()])
      .then(([l, b, f]) => { setLeads(l); setBookings(b); setFollowups(f); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hot = leads.filter(l => l.score === "HOT").length;
  const warm = leads.filter(l => l.score === "WARM").length;
  const cold = leads.filter(l => l.score === "COLD").length;
  const pendingFU = followups.filter(f => f.status === "pending").length;
  const recent = [...leads].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 8);

  const stat = (label, val, color, sub) => (
    <div style={{ background: "#111", border: `1px solid ${color}22`, borderRadius: "10px", padding: "18px 20px", flex: 1, minWidth: "130px" }}>
      <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "32px", fontWeight: "700", color, lineHeight: 1, marginBottom: "3px" }}>{loading ? "…" : val}</div>
      <div style={{ fontSize: "11px", color: "#333" }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <Sidebar current="/CommandCenter" />
      <main style={{ flex: 1, overflow: "auto", padding: "28px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "3px", marginBottom: "5px" }}>MONKEE BIZZ AI — SAOS</div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", margin: "0 0 4px" }}>Command Center</h1>
        <div style={{ fontSize: "12px", color: "#444", marginBottom: "24px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          {stat("TOTAL LEADS", leads.length, "#00ff88", "all time")}
          {stat("HOT", hot, "#ff3333", "need action")}
          {stat("WARM", warm, "#ffdd00", "in pipeline")}
          {stat("COLD", cold, "#888", "dormant")}
          {stat("BOOKINGS", bookings.length, "#00ff88", "total")}
          {stat("FOLLOW-UPS", pendingFU, "#ffdd00", "pending")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "12px", marginBottom: "24px" }}>
          {[["01","INTAKE","#00ff88"],["02","BOOKING","#00ff88"],["03","FOLLOW-UP","#00ff88"],["04","RETENTION","#00ff88"],["05","OPS","#ffdd00"]].map(([n, name, c]) => (
            <div key={n} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#333" }}>AGENT {n}</span>
                <span style={{ fontFamily: "monospace", fontSize: "9px", color: c, background: `${c}22`, padding: "2px 6px", borderRadius: "4px" }}>● READY</span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: "bold", color: "#aaa", letterSpacing: "1px" }}>{name}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "2px" }}>RECENT LEADS</span>
            <span style={{ fontSize: "11px", color: "#333" }}>Last 8</span>
          </div>
          {loading ? (
            <div style={{ padding: "32px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>LOADING...</div>
          ) : recent.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#2a2a2a" }}>NO LEADS YET — SYSTEM STANDING BY</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                  {["NAME","EMAIL","BUSINESS TYPE","SERVICE NEED","SCORE","STATUS"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "1px", fontWeight: "normal" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #0f0f0f" }}>
                    <td style={{ padding: "10px 14px", fontSize: "12px", color: "#ddd", fontWeight: "500" }}>{l.name}</td>
                    <td style={{ padding: "10px 14px", fontSize: "11px", color: "#666" }}>{l.email || "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: "11px", color: "#777" }}>{l.business_type || "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: "11px", color: "#777" }}>{l.service_need ? l.service_need.substring(0, 40) + (l.service_need.length > 40 ? "…" : "") : "—"}</td>
                    <td style={{ padding: "10px 14px" }}><ScoreBadge score={l.score} /></td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "10px", color: "#555" }}>{l.status || "New"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
