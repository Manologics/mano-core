import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { sendSmsReply } from "@/functions/sendSmsReply";

export default function SmsPortal() {
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.entities.Lead.list("-updated_date", 50)
      .then(l => { setLeads(l); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  const parseConversation = (lead) => {
    if (!lead.notes) return [];
    const lines = lead.notes.split('\n');
    return lines
      .filter(l => l.includes('[Inbound SMS') || l.includes('[Outbound SMS') || l.includes('[Admin SMS Reply]') || l.includes('[Auto-reply]') || l.includes('[Booking link sent'))
      .map(line => {
        const isInbound = line.includes('[Inbound SMS');
        const timeMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
        const time = timeMatch ? new Date(timeMatch[0]).toLocaleString() : '';
        const text = line.replace(/\[.*?\]:\s*/, '').trim();
        return { from: isInbound ? 'lead' : 'admin', text, time };
      });
  };

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await sendSmsReply({ lead_id: selected.id, message: reply.trim() });
      const updatedNotes = [selected.notes, `[Outbound SMS ${new Date().toISOString()}]: ${reply.trim()}`].filter(Boolean).join('\n');
      const updatedLead = { ...selected, notes: updatedNotes };
      setSelected(updatedLead);
      setLeads(prev => prev.map(l => l.id === selected.id ? updatedLead : l));
      setReply("");
    } catch (e) {
      alert("Failed to send: " + e.message);
    }
    setSending(false);
  };

  const filtered = leads.filter(l =>
    l.phone && (l.name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search))
  );

  const scoreColor = { HOT: "#ff3333", WARM: "#ffdd00", COLD: "#888", PENDING: "#444" };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" }}>
      {/* Lead List */}
      <div style={{ width: "280px", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#00ff88", letterSpacing: "2px", marginBottom: "8px" }}>SMS CONVERSATIONS</div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..."
            style={{ width: "100%", background: "#111", border: "1px solid #222", borderRadius: "6px", padding: "7px 10px", color: "#ddd", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "20px", fontFamily: "monospace", fontSize: "10px", color: "#333", textAlign: "center" }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "20px", fontFamily: "monospace", fontSize: "10px", color: "#2a2a2a", textAlign: "center" }}>NO LEADS</div>
          ) : filtered.map(lead => (
            <div key={lead.id} onClick={() => setSelected(lead)}
              style={{ padding: "12px 14px", borderBottom: "1px solid #0f0f0f", cursor: "pointer", background: selected?.id === lead.id ? "#111" : "transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "#ddd", fontWeight: "600" }}>{lead.name}</span>
                <span style={{ fontFamily: "monospace", fontSize: "9px", color: scoreColor[lead.score] || "#444" }}>{lead.score || "—"}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#555" }}>{lead.phone}</div>
              {lead.last_message && (
                <div style={{ fontSize: "11px", color: "#444", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lead.last_message.slice(0, 40)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "32px" }}>💬</div>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#2a2a2a", letterSpacing: "2px" }}>SELECT A LEAD TO VIEW CONVERSATION</div>
          </div>
        ) : (
          <>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>{selected.name}</div>
                <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#555" }}>{selected.phone} · {selected.status || "New"}</div>
              </div>
              <span style={{ fontFamily: "monospace", fontSize: "10px", color: scoreColor[selected.score] || "#444", background: `${scoreColor[selected.score] || "#444"}20`, border: `1px solid ${scoreColor[selected.score] || "#444"}44`, padding: "3px 9px", borderRadius: "4px" }}>{selected.score || "PENDING"}</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", background: "#080808" }}>
              {parseConversation(selected).length === 0 ? (
                <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "#2a2a2a", marginTop: "40px" }}>NO SMS HISTORY</div>
              ) : parseConversation(selected).map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "lead" ? "flex-start" : "flex-end" }}>
                  <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: msg.from === "lead" ? "4px 14px 14px 14px" : "14px 4px 14px 14px", background: msg.from === "lead" ? "#181818" : "rgba(0,255,136,0.08)", border: msg.from === "lead" ? "1px solid #222" : "1px solid rgba(0,255,136,0.2)", fontSize: "13px", color: msg.from === "lead" ? "#ddd" : "#00ff88", lineHeight: 1.6 }}>
                    {msg.text}
                  </div>
                  {msg.time && <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#2a2a2a", marginTop: "3px" }}>{msg.time}</div>}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: "14px", borderTop: "1px solid #1a1a1a", display: "flex", gap: "10px" }}>
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                style={{ flex: 1, background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "10px 14px", color: "#ddd", fontSize: "13px", outline: "none" }}
              />
              <button onClick={handleSend} disabled={sending || !reply.trim()}
                style={{ background: sending ? "#0a3320" : "#00ff88", color: sending ? "#00ff88" : "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontFamily: "monospace", fontSize: "11px", fontWeight: "700", cursor: sending ? "not-allowed" : "pointer", letterSpacing: "1px" }}>
                {sending ? "..." : "SEND"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}