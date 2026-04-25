import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import ManoSidebar from "@/components/mano/ManoSidebar";

const GOLD = "#c9973a";
const GOLD_DIM = "#a07830";

const SUGGESTIONS = [
  "What needs attention today?",
  "Who are my hottest leads?",
  "Any overdue follow-ups?",
  "How's the pipeline looking?",
  "Simulate a new HVAC lead conversation",
  "What should I prioritize right now?",
];

export default function BuilderChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey — I'm **Mano** 🐒, your internal builder assistant. Ask me about your leads, pipeline, agents, or anything about the app." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke('manoAiChat', { message: msg, history: messages.slice(-12) });
      console.log("RAW RESPONSE:", res);
      console.log("RESPONSE.DATA:", res?.data);
      console.log("RESPONSE.REPLY:", res?.data?.reply);
      const reply = res?.data?.reply || res?.reply || null;
      setMessages(prev => [...prev, { role: "assistant", content: reply || "⚠ Empty response from Mano." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠ Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <ManoSidebar current="/BuilderChat" />
      <main style={{ flex: 1, padding: "28px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: GOLD, letterSpacing: "3px", marginBottom: "5px" }}>INTERNAL</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px" }}>Mano Builder Chat</h1>
        <p style={{ color: "#555", fontSize: "12px", marginBottom: "18px" }}>Internal builder assistant — discuss, debug, and improve the app.</p>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0d0c0a", border: `1px solid #2a2215`, borderRadius: "14px", overflow: "hidden" }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "#080706" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#2a2415", marginBottom: "4px" }}>
                  {msg.role === "user" ? "YOU" : "MANO"}
                </div>
                <div style={{
                  maxWidth: "82%",
                  padding: "13px 17px",
                  borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  background: msg.role === "user" ? `${GOLD}14` : "#131108",
                  border: msg.role === "user" ? `1px solid ${GOLD}40` : `1px solid #2a2215`,
                  fontSize: "13px",
                  color: msg.role === "user" ? "#d4a855" : "#c8c0a8",
                  lineHeight: 1.7,
                }}>
                  {msg.role === "assistant" ? (
                    <ReactMarkdown components={{
                      p:      ({ children }) => <p style={{ margin: "4px 0" }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ color: GOLD }}>{children}</strong>,
                      ul:     ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: "18px" }}>{children}</ul>,
                      ol:     ({ children }) => <ol style={{ margin: "6px 0", paddingLeft: "18px" }}>{children}</ol>,
                      li:     ({ children }) => <li style={{ margin: "3px 0" }}>{children}</li>,
                      code:   ({ children }) => <code style={{ background: "#1a1608", border: `1px solid ${GOLD}30`, padding: "1px 6px", borderRadius: "4px", fontSize: "11px", color: GOLD }}>{children}</code>,
                    }}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#2a2415", marginBottom: "4px" }}>MANO</div>
                <div style={{ padding: "13px 20px", background: "#131108", border: `1px solid #2a2215`, borderRadius: "4px 14px 14px 14px" }}>
                  <span style={{ letterSpacing: "6px", fontSize: "16px", color: GOLD_DIM }}>···</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div style={{ padding: "12px 16px", borderTop: `1px solid #100f0a`, display: "flex", gap: "6px", flexWrap: "wrap", background: "#0d0c0a" }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  style={{ background: "transparent", border: `1px solid #2a2215`, color: "#4a4030", padding: "6px 13px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.target.style.borderColor = `${GOLD}60`; e.target.style.color = GOLD; }}
                  onMouseLeave={e => { e.target.style.borderColor = "#2a2215"; e.target.style.color = "#4a4030"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "14px 16px", borderTop: `1px solid #1e1a13`, background: "#0f0e0b", display: "flex", gap: "10px" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask Mano about the app, leads, pipeline..."
              style={{ flex: 1, background: "#111008", border: `1px solid #2a2215`, borderRadius: "9px", padding: "11px 15px", color: "#d0c8a8", fontSize: "13px", outline: "none", fontFamily: "inherit" }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              style={{
                background: !input.trim() || loading ? "transparent" : `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
                color: !input.trim() || loading ? "#3a3020" : "#0a0807",
                border: `1px solid ${!input.trim() || loading ? "#2a2215" : GOLD}`,
                borderRadius: "9px", padding: "11px 22px",
                fontFamily: "monospace", fontSize: "11px", fontWeight: "700",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                letterSpacing: "1px", transition: "all 0.2s",
                boxShadow: input.trim() && !loading ? `0 0 16px ${GOLD}33` : "none",
              }}>
              {loading ? "..." : "ASK →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}