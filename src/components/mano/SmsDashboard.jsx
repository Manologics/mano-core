import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { sendSmsReply } from "@/functions/sendSmsReply";

const GOLD = "#c9973a";
const GOLD_DIM = "#a07830";

const STATUS_TAGS = ["New", "Qualified", "Booked", "Lost"];
const STATUS_COLORS = {
  New:       { color: "#888",   bg: "#88888818", border: "#88888840" },
  Qualified: { color: GOLD,    bg: `${GOLD}18`,  border: `${GOLD}40` },
  Booked:    { color: "#00cc66", bg: "#00cc6618", border: "#00cc6640" },
  Lost:      { color: "#cc3333", bg: "#cc333318", border: "#cc333340" },
};
const SCORE_COLORS = { HOT: "#cc3333", WARM: GOLD, COLD: "#555", PENDING: "#333" };

function parseConversation(lead) {
  if (!lead.notes) return [];
  return lead.notes.split("\n")
    .filter(l =>
      l.includes("[Inbound SMS") ||
      l.includes("[Outbound SMS") ||
      l.includes("[Admin SMS Reply]") ||
      l.includes("[Auto-reply]") ||
      l.includes("[Booking link sent")
    )
    .map(line => {
      const isInbound = line.includes("[Inbound SMS");
      const timeMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      const time = timeMatch ? new Date(timeMatch[0]).toLocaleString() : "";
      const text = line.replace(/\[.*?\]:\s*/, "").trim();
      return { from: isInbound ? "lead" : "admin", text, time };
    });
}

export default function SmsDashboard() {
  const [leads, setLeads]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply]       = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterTag, setFilterTag] = useState("ALL");
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.entities.Lead.list("-updated_date", 100)
      .then(l => { setLeads(l); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  const handleTagChange = async (leadId, newStatus) => {
    await base44.entities.Lead.update(leadId, { status: newStatus });
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selected?.id === leadId) setSelected(s => ({ ...s, status: newStatus }));
  };

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await sendSmsReply({ lead_id: selected.id, message: reply.trim() });
      const note = `[Outbound SMS ${new Date().toISOString()}]: ${reply.trim()}`;
      const updatedNotes = [selected.notes, note].filter(Boolean).join("\n");
      const updated = { ...selected, notes: updatedNotes };
      setSelected(updated);
      setLeads(prev => prev.map(l => l.id === selected.id ? updated : l));
      setReply("");
    } catch (e) {
      alert("Failed to send: " + e.message);
    }
    setSending(false);
  };

  const filtered = leads.filter(l => {
    if (!l.phone) return false;
    if (filterTag !== "ALL" && l.status !== filterTag) return false;
    const q = search.toLowerCase();
    return !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q);
  });

  const conversation = selected ? parseConversation(selected) : [];
  const selTag = selected?.status || "New";
  const selTagStyle = STATUS_COLORS[selTag] || STATUS_COLORS.New;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 130px)", background: "#0d0c0a", border: `1px solid #2a2215`, borderRadius: "14px", overflow: "hidden" }}>

      {/* ── LEFT: Lead List ── */}
      <div style={{ width: "290px", borderRight: `1px solid #1e1a13`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: "14px 12px", borderBottom: `1px solid #1e1a13`, background: "#0f0e0b" }}>
          <div style={{ fontFamily: "monospace", fontSize: "8px", color: GOLD, letterSpacing: "3px", marginBottom: "10px" }}>SMS CONVERSATIONS</div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            style={{ width: "100%", background: "#111008", border: `1px solid #2a2215`, borderRadius: "7px", padding: "8px 11px", color: "#ccc", fontSize: "12px", outline: "none", boxSizing: "border-box", marginBottom: "8px" }}
          />
          {/* Tag Filter */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {["ALL", ...STATUS_TAGS].map(tag => (
              <button key={tag} onClick={() => setFilterTag(tag)}
                style={{
                  padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontFamily: "monospace",
                  cursor: "pointer", border: "none",
                  background: filterTag === tag ? `${GOLD}22` : "transparent",
                  color: filterTag === tag ? GOLD : "#444",
                  letterSpacing: "0.5px",
                }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Lead List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "#333" }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "#252015" }}>NO LEADS</div>
          ) : filtered.map(lead => {
            const isActive = selected?.id === lead.id;
            const tag = lead.status || "New";
            const tagStyle = STATUS_COLORS[tag] || STATUS_COLORS.New;
            return (
              <div key={lead.id} onClick={() => setSelected(lead)}
                style={{ padding: "12px 14px", borderBottom: `1px solid #100f0a`, cursor: "pointer", background: isActive ? "#13110c" : "transparent", borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent", transition: "all 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                  <span style={{ fontSize: "12px", color: "#e0d8c8", fontWeight: "600" }}>{lead.name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: "8px", color: SCORE_COLORS[lead.score] || "#444" }}>{lead.score || "—"}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#4a4030" }}>{lead.phone}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "5px" }}>
                  <span style={{ fontSize: "11px", color: "#38321f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                    {lead.last_message?.slice(0, 35) || "—"}
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: "8px", color: tagStyle.color, background: tagStyle.bg, border: `1px solid ${tagStyle.border}`, padding: "1px 6px", borderRadius: "3px", flexShrink: 0 }}>{tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Conversation ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontSize: "40px", opacity: 0.3 }}>💬</div>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#252015", letterSpacing: "2px" }}>SELECT A LEAD TO VIEW CONVERSATION</div>
          </div>
        ) : (
          <>
            {/* Convo Header */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid #1e1a13`, background: "#0f0e0b", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#e8dfc8" }}>{selected.name}</div>
                <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#4a4030", marginTop: "2px" }}>
                  {selected.phone} · {selected.business_type || "HVAC"} · {selected.urgency?.toUpperCase() || "—"} urgency
                </div>
              </div>
              {/* Tag Override */}
              <div style={{ display: "flex", gap: "5px" }}>
                {STATUS_TAGS.map(tag => {
                  const s = STATUS_COLORS[tag];
                  const active = selTag === tag;
                  return (
                    <button key={tag} onClick={() => handleTagChange(selected.id, tag)}
                      style={{ padding: "5px 11px", borderRadius: "6px", fontFamily: "monospace", fontSize: "9px", cursor: "pointer", border: `1px solid ${active ? s.color : "#222"}`, background: active ? s.bg : "transparent", color: active ? s.color : "#444", letterSpacing: "0.5px", transition: "all 0.15s" }}>
                      {tag.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", background: "#080706" }}>
              {conversation.length === 0 ? (
                <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "#1e1a13", marginTop: "60px" }}>NO SMS HISTORY</div>
              ) : conversation.map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "lead" ? "flex-start" : "flex-end" }}>
                  <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#2a2415", marginBottom: "3px" }}>
                    {msg.from === "lead" ? selected.name : "MANO / ADMIN"}{msg.time ? ` · ${msg.time}` : ""}
                  </div>
                  <div style={{
                    maxWidth: "70%", padding: "11px 15px",
                    borderRadius: msg.from === "lead" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                    background: msg.from === "lead" ? "#141209" : `${GOLD}14`,
                    border: msg.from === "lead" ? `1px solid #2a2215` : `1px solid ${GOLD}40`,
                    fontSize: "13px",
                    color: msg.from === "lead" ? "#c8c0a8" : "#d4a855",
                    lineHeight: 1.65,
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply Bar */}
            <div style={{ padding: "14px 16px", borderTop: `1px solid #1e1a13`, background: "#0f0e0b", display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a reply... (Enter to send)"
                style={{ flex: 1, background: "#111008", border: `1px solid #2a2215`, borderRadius: "9px", padding: "11px 15px", color: "#d0c8a8", fontSize: "13px", outline: "none", fontFamily: "inherit" }}
              />
              <button onClick={handleSend} disabled={sending || !reply.trim()}
                style={{
                  background: !reply.trim() || sending ? "transparent" : `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
                  color: !reply.trim() || sending ? "#3a3020" : "#0a0807",
                  border: `1px solid ${!reply.trim() || sending ? "#2a2215" : GOLD}`,
                  borderRadius: "9px", padding: "11px 22px",
                  fontFamily: "monospace", fontSize: "11px", fontWeight: "700",
                  cursor: sending || !reply.trim() ? "not-allowed" : "pointer",
                  letterSpacing: "1px", transition: "all 0.2s",
                  boxShadow: reply.trim() && !sending ? `0 0 16px ${GOLD}33` : "none",
                }}>
                {sending ? "SENDING..." : "SEND →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}