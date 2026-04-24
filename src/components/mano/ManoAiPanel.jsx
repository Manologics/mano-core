import React, { useState, useRef, useEffect } from "react";
import { manoAiChat } from "@/functions/manoAiChat";
import ReactMarkdown from "react-markdown";

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

export default function ManoAiPanel() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey — I'm **Mano** 🐒, your AI ops brain. I have full context on your leads, bookings, and pipeline.\n\nAsk me what needs attention, simulate a lead conversation, or request a pipeline summary." }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [debug, setDebug]     = useState(false);
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
      const res = await manoAiChat({ message: msg, history: messages.slice(-12), debug });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.reply || "No response.",
        reasoning: res.reasoning || null,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠ Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)", background: "#0d0c0a", border: `1px solid #2a2215`, borderRadius: "14px", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid #1e1a13`, background: "#0f0e0b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "38px", height: "38px",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
            borderRadius: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", flexShrink: 0,
            boxShadow: `0 0 18px ${GOLD}44`,
          }}>🐒</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#e8dfc8" }}>Mano — AI Ops Brain</div>
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: GOLD, marginTop: "1px" }}>● LIVE PIPELINE CONTEXT · HVAC SPECIALIST</div>
          </div>
        </div>
        {/* Debug Toggle */}
        <button onClick={() => setDebug(d => !d)}
          style={{ background: debug ? `${GOLD}18` : "transparent", border: `1px solid ${debug ? GOLD : "#2a2215"}`, color: debug ? GOLD : "#3a3020", padding: "5px 12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "9px", cursor: "pointer", letterSpacing: "1px" }}>
          {debug ? "DEBUG ON" : "DEBUG OFF"}
        </button>
      </div>

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
            {/* Debug Reasoning */}
            {debug && msg.reasoning && (
              <div style={{ maxWidth: "82%", marginTop: "6px", padding: "10px 14px", background: "#0d0b05", border: `1px solid #3a2a10`, borderRadius: "8px", fontSize: "11px", color: "#6a5830", fontFamily: "monospace", lineHeight: 1.6 }}>
                <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#5a4820", letterSpacing: "2px", marginBottom: "5px" }}>REASONING</div>
                {msg.reasoning}
              </div>
            )}
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
          placeholder="Ask Mano anything about your pipeline..."
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
  );
}