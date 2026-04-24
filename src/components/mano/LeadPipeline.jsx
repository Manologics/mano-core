import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const GOLD = "#c9973a";

const STAGES = [
  { key: "New",                   label: "NEW",         color: "#888",    desc: "Just arrived" },
  { key: "Qualified",             label: "QUALIFIED",   color: GOLD,      desc: "Scored & ready" },
  { key: "Booked",                label: "BOOKED",      color: "#00cc66", desc: "Appointment set" },
  { key: "Follow Up",             label: "FOLLOW-UP",   color: "#4488ff", desc: "Needs nudge" },
  { key: "Closed — Won",         label: "WON",         color: "#00cc66", desc: "Closed deal" },
  { key: "Closed — No Response", label: "LOST",        color: "#cc3333", desc: "No response" },
];

const SCORE_DOT = { HOT: "#cc3333", WARM: GOLD, COLD: "#555", PENDING: "#333" };

function LeadCard({ lead, onMove }) {
  const [expanded, setExpanded] = useState(false);
  const dot = SCORE_DOT[lead.score] || "#333";

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        background: "#0f0e0b", border: `1px solid #2a2215`, borderRadius: "10px",
        padding: "11px 13px", cursor: "pointer",
        borderLeft: `3px solid ${dot}`,
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontWeight: "600", fontSize: "12px", color: "#e0d8c8" }}>{lead.name}</div>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot, flexShrink: 0, marginTop: "4px", boxShadow: `0 0 6px ${dot}` }} />
      </div>
      <div style={{ fontSize: "10px", color: "#4a4030", marginTop: "3px" }}>{lead.phone}</div>
      {lead.service_need && (
        <div style={{ fontSize: "11px", color: "#38321f", marginTop: "5px", lineHeight: 1.4 }}>
          {lead.service_need.slice(0, 55)}{lead.service_need.length > 55 ? "…" : ""}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid #1e1a13` }}>
          <div style={{ fontSize: "10px", color: "#3a3020", marginBottom: "8px" }}>
            {lead.email && <div>✉ {lead.email}</div>}
            {lead.urgency && <div style={{ marginTop: "2px" }}>⚡ {lead.urgency} urgency</div>}
            {lead.budget && <div style={{ marginTop: "2px" }}>💰 {lead.budget}</div>}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#3a3020", marginBottom: "6px", letterSpacing: "1px" }}>MOVE TO →</div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {STAGES.filter(s => s.key !== lead.status).map(s => (
              <button key={s.key} onClick={e => { e.stopPropagation(); onMove(lead.id, s.key); }}
                style={{ padding: "3px 9px", borderRadius: "4px", fontFamily: "monospace", fontSize: "8px", cursor: "pointer", border: `1px solid ${s.color}44`, background: `${s.color}14`, color: s.color, letterSpacing: "0.5px" }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadPipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Lead.list("-updated_date", 200)
      .then(l => { setLeads(l); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleMove = async (leadId, newStatus) => {
    await base44.entities.Lead.update(leadId, { status: newStatus });
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
  };

  const getLeadsForStage = (stageKey) =>
    leads.filter(l => (l.status || "New") === stageKey);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", fontFamily: "monospace", fontSize: "10px", color: "#3a3020" }}>
      LOADING PIPELINE...
    </div>
  );

  return (
    <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
      <div style={{ display: "flex", gap: "12px", minWidth: "fit-content" }}>
        {STAGES.map(stage => {
          const stageLeads = getLeadsForStage(stage.key);
          return (
            <div key={stage.key} style={{ width: "220px", flexShrink: 0 }}>
              {/* Stage Header */}
              <div style={{
                padding: "10px 14px", borderRadius: "10px 10px 0 0",
                background: "#0f0e0b", border: `1px solid #2a2215`,
                borderBottom: `2px solid ${stage.color}`,
                marginBottom: "8px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: "9px", color: stage.color, letterSpacing: "2px", fontWeight: "700" }}>{stage.label}</div>
                    <div style={{ fontSize: "10px", color: "#3a3020", marginTop: "1px" }}>{stage.desc}</div>
                  </div>
                  <div style={{
                    background: `${stage.color}18`, border: `1px solid ${stage.color}40`,
                    borderRadius: "12px", padding: "2px 9px",
                    fontFamily: "monospace", fontSize: "10px", color: stage.color, fontWeight: "700",
                  }}>{stageLeads.length}</div>
                </div>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", minHeight: "60px" }}>
                {stageLeads.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", fontFamily: "monospace", fontSize: "9px", color: "#1e1a13", border: `1px dashed #1e1a13`, borderRadius: "8px" }}>
                    EMPTY
                  </div>
                ) : stageLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} onMove={handleMove} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}