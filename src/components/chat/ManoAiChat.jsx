import React, { useState, useRef, useEffect } from "react";
import { manoAiChat } from "@/functions/manoAiChat";
import ReactMarkdown from "react-markdown";

export default function ManoAiChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey — I'm Mano 🐒 Your ops AI. Ask me about leads, pipeline, bookings, or what needs attention right now." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await manoAiChat({ message: userMsg.content, history: messages.slice(-10) });
      setMessages(prev => [...prev, { role: "assistant", content: res.reply || "Sorry, no response." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  const SUGGESTIONS = ["What needs attention today?", "Who are my hottest leads?", "How's the pipeline looking?", "Any overdue follow-ups?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg,#00ff88,#00cc66)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🐒</div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>Mano — AI Ops Assistant</div>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88" }}>● Online · Live pipeline context</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: "14px", background: "#080808" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: msg.role === "user" ? "rgba(0,255,136,0.08)" : "#181818", border: msg.role === "user" ? "1px solid rgba(0,255,136,0.2)" : "1px solid #222", fontSize: "13px", color: msg.role === "user" ? "#00ff88" : "#ddd", lineHeight: 1.65 }}>
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: "4px 0" }}>{children}</p>,
                    strong: ({ children }) => <strong style={{ color: "#fff" }}>{children}</strong>,
                    ul: ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: "18px" }}>{children}</ul>,
                    li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
                  }}
                >{msg.content}</ReactMarkdown>
              ) : msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "12px 18px", background: "#181818", border: "1px solid #222", borderRadius: "4px 14px 14px 14px" }}>
              <span style={{ fontSize: "20px", letterSpacing: "4px", color: "#333" }}>···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: "10px 14px", display: "flex", gap: "6px", flexWrap: "wrap", borderTop: "1px solid #0f0f0f" }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => { setInput(s); }}
              style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#555", padding: "6px 12px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "14px", borderTop: "1px solid #1a1a1a", display: "flex", gap: "10px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask Mano anything..."
          style={{ flex: 1, background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "10px 14px", color: "#ddd", fontSize: "13px", outline: "none" }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ background: loading ? "#0a3320" : "#00ff88", color: loading ? "#00ff88" : "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontFamily: "monospace", fontSize: "11px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", letterSpacing: "1px" }}>
          {loading ? "..." : "ASK"}
        </button>
      </div>
    </div>
  );
}