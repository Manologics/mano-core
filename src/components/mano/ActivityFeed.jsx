import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const GOLD = "#c9973a";

const EVENT_ICON = (event = "") => {
  const e = event.toLowerCase();
  if (e.includes("sms") || e.includes("outbound") || e.includes("inbound")) return "💬";
  if (e.includes("book") || e.includes("calendly")) return "📅";
  if (e.includes("score") || e.includes("qualified")) return "🎯";
  if (e.includes("webhook")) return "⚡";
  if (e.includes("email")) return "✉️";
  if (e.includes("no-show") || e.includes("no show")) return "⚠️";
  if (e.includes("follow")) return "🔁";
  if (e.includes("retention")) return "♻️";
  if (e.includes("admin")) return "👤";
  if (e.includes("error") || e.includes("fail")) return "🔴";
  return "🟡";
};

const EVENT_COLOR = (event = "") => {
  const e = event.toLowerCase();
  if (e.includes("error") || e.includes("fail")) return "#cc3333";
  if (e.includes("book") || e.includes("calendly")) return "#00cc66";
  if (e.includes("score") || e.includes("hot")) return GOLD;
  if (e.includes("admin") || e.includes("outbound")) return "#4488ff";
  return "#4a4030";
};

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActivityFeed() {
  const [logs, setLogs]       = useState([]);
  const [leads, setLeads]     = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("ALL");

  const FILTERS = ["ALL", "SMS", "BOOKING", "SYSTEM", "ADMIN"];

  const matchFilter = (event = "") => {
    const e = event.toLowerCase();
    if (filter === "ALL") return true;
    if (filter === "SMS")     return e.includes("sms") || e.includes("inbound") || e.includes("outbound");
    if (filter === "BOOKING") return e.includes("book") || e.includes("calendly") || e.includes("no-show");
    if (filter === "ADMIN")   return e.includes("admin") || e.includes("manual");
    if (filter === "SYSTEM")  return e.includes("score") || e.includes("webhook") || e.includes("follow") || e.includes("retention") || e.includes("error");
    return true;
  };

  const load = async () => {
    try {
      const [al, ls] = await Promise.all([
        base44.entities.ActivityLog.list("-created_at", 150).catch(() => []),
        base44.entities.Lead.list().catch(() => []),
      ]);
      const leadMap = {};
      ls.forEach(l => { leadMap[l.id] = l.name; });
      setLeads(leadMap);
      setLogs(al);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = logs.filter(l => matchFilter(l.event));

  return (
    <div style={{ background: "#0d0c0a", border: `1px solid #2a2215`, borderRadius: "14px", overflow: "hidden", height: "calc(100vh - 130px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: `1px solid #1e1a13`, background: "#0f0e0b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: "8px", color: GOLD, letterSpacing: "3px", marginBottom: "2px" }}>REAL-TIME</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#e8dfc8" }}>Activity Feed</div>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <button onClick={load} style={{ background: "transparent", border: `1px solid #2a2215`, color: "#4a4030", padding: "5px 10px", borderRadius: "6px", fontFamily: "monospace", fontSize: "9px", cursor: "pointer", letterSpacing: "1px" }}>
            ↺ REFRESH
          </button>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00cc66", marginLeft: "8px", boxShadow: "0 0 8px #00cc66" }} />
          <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#00cc66" }}>LIVE</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid #1a1810`, display: "flex", gap: "5px" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: "4px 12px", borderRadius: "20px", fontFamily: "monospace", fontSize: "9px",
              cursor: "pointer", border: "none", letterSpacing: "0.5px",
              background: filter === f ? `${GOLD}22` : "transparent",
              color: filter === f ? GOLD : "#3a3020",
            }}>
            {f}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: "9px", color: "#2a2415" }}>
          {filtered.length} EVENTS
        </span>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {loading ? (
          <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "#2a2415", marginTop: "40px" }}>LOADING ACTIVITY...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "#1e1a13", marginTop: "40px" }}>NO EVENTS</div>
        ) : filtered.map((log, i) => {
          const icon  = EVENT_ICON(log.event);
          const color = EVENT_COLOR(log.event);
          const leadName = leads[log.lead_id] || null;
          return (
            <div key={log.id || i} style={{
              display: "flex", gap: "10px", alignItems: "flex-start",
              padding: "10px 12px",
              borderRadius: "8px",
              background: i === 0 ? "#13110c" : "transparent",
              border: `1px solid ${i === 0 ? "#2a2215" : "transparent"}`,
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", color, lineHeight: 1.5 }}>{log.event}</div>
                {leadName && (
                  <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#4a3820", marginTop: "2px" }}>
                    LEAD: {leadName}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#2a2415", flexShrink: 0, marginTop: "2px" }}>
                {timeAgo(log.created_at)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}