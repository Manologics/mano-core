import React, { useState, useRef, useEffect } from "react";
import { manoDemoChat } from "@/functions/manoDemoChat";

const GOLD = "#D4AF37";
const GOLD_DIM = "#A8891F";
const CAL_URL = "https://calendly.com/monkee-bizznus/30min";

const INIT_MESSAGE = {
  role: "assistant",
  content: "Hey! 👋 I'm MANO — the AI that recovers missed calls for HVAC contractors.\n\nMost contractors lose $2,000–$5,000/month to unanswered calls. Want to find out how much YOU'RE losing?",
};

const SUGGESTIONS = [
  "How does MANO work?",
  "What does it cost?",
  "Book a demo",
  "Calculate my lost revenue",
];

export default function ManoDemoWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INIT_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const ts = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await manoDemoChat({ message: msg, history: messages.slice(-10) });
      // Accept reply from either res.data.reply or res.reply (platform v1/v2 compat)
      const reply = res?.data?.reply ?? res?.reply ?? res?.data?.fallbackReply ?? res?.fallbackReply ?? null;
      const content = reply || "I'm here — looks like I had a slow response. What kind of business do you run?";
      setMessages(prev => [...prev, { role: "assistant", content }]);
    } catch (e) {
      console.error("[ManoDemoWidget]", e.message);
      setMessages(prev => [...prev, { role: "assistant", content: "I'm here — looks like I had a slow response. What kind of business do you run?" }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: "28px", right: "28px", zIndex: 9999,
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
            color: "#000", border: "none", borderRadius: "50px",
            padding: "14px 22px", fontSize: "14px", fontWeight: "700",
            fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
            boxShadow: `0 0 32px rgba(212,175,55,0.55), 0 4px 16px rgba(0,0,0,0.5)`,
            display: "flex", alignItems: "center", gap: "8px",
            animation: "manoWiggle 4s ease-in-out infinite",
          }}
        >
          🐒 Ask MANO
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
          width: "360px", maxHeight: "580px",
          background: "#0d0d0d", border: `1px solid rgba(212,175,55,0.30)`,
          borderRadius: "18px", display: "flex", flexDirection: "column",
          boxShadow: `0 0 60px rgba(212,175,55,0.15), 0 20px 60px rgba(0,0,0,0.7)`,
          fontFamily: "'DM Sans', sans-serif",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, #1a1500, #0d0d0d)`,
            borderBottom: `1px solid rgba(212,175,55,0.20)`,
            padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", boxShadow: `0 0 14px rgba(212,175,55,0.40)`,
              }}>🐒</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>MANO</div>
                <div style={{ fontSize: "10px", color: "#22C55E", fontFamily: "monospace", letterSpacing: "1px" }}>● AI Sales Assistant</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#555", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "4px" }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  background: msg.role === "user" ? "rgba(212,175,55,0.10)" : "#181818",
                  border: `1px solid ${msg.role === "user" ? "rgba(212,175,55,0.30)" : "#222"}`,
                  fontSize: "13px", lineHeight: 1.65,
                  color: msg.role === "user" ? GOLD : "#ddd",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
                {/* Book Demo CTA if assistant */}
                {msg.role === "assistant" && i > 0 && i === messages.length - 1 && (
                  <a href={CAL_URL} target="_blank" rel="noopener noreferrer" style={{
                    marginTop: "6px",
                    fontSize: "11px", fontFamily: "monospace", color: GOLD,
                    background: "rgba(212,175,55,0.08)", border: `1px solid rgba(212,175,55,0.25)`,
                    borderRadius: "20px", padding: "4px 12px", textDecoration: "none",
                    letterSpacing: "0.5px",
                  }}>
                    📅 Book Free Demo →
                  </a>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ padding: "10px 14px", background: "#181818", border: "1px solid #222", borderRadius: "4px 14px 14px 14px" }}>
                  <span style={{ letterSpacing: "4px", color: "#555", fontSize: "16px" }}>···</span>
                </div>
              </div>
            )}

            {/* Suggestion chips — only on first message */}
            {messages.length === 1 && !loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{
                    background: "transparent", border: `1px solid #2a2a2a`,
                    color: "#666", borderRadius: "20px", padding: "5px 12px",
                    fontSize: "11px", cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                    onMouseEnter={e => { e.target.style.borderColor = "rgba(212,175,55,0.4)"; e.target.style.color = GOLD; }}
                    onMouseLeave={e => { e.target.style.borderColor = "#2a2a2a"; e.target.style.color = "#666"; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #1a1a1a", display: "flex", gap: "8px", background: "#0a0a0a" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about missed calls, pricing…"
              style={{
                flex: 1, background: "#111", border: "1px solid #222",
                borderRadius: "8px", padding: "9px 12px", color: "#ddd",
                fontSize: "13px", outline: "none", fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} style={{
              background: input.trim() && !loading ? `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})` : "#1a1a1a",
              color: input.trim() && !loading ? "#000" : "#333",
              border: "none", borderRadius: "8px", padding: "9px 16px",
              fontSize: "12px", fontWeight: "700", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontFamily: "monospace", letterSpacing: "0.5px", transition: "all 0.2s",
            }}>
              {loading ? "…" : "→"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes manoWiggle {
          0%, 90%, 100% { transform: scale(1); }
          93% { transform: scale(1.06); }
          96% { transform: scale(0.97); }
        }
      `}</style>
    </>
  );
}