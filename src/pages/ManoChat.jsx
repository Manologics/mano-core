import React, { useState, useEffect, useRef } from "react";
import { manoAiChat } from "@/functions/manoAiChat";
import ReactMarkdown from "react-markdown";

export default function ManoChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey there 👋 I'm Mano, your AI ops assistant. What's on your mind?" }
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

  const SUGGESTIONS = [
    "What needs attention today?",
    "Who are my hottest leads?",
    "How's the pipeline looking?",
    "Any overdue follow-ups?"
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", flexDirection: "column", fontFamily: "'Inter', '-apple-system', 'BlinkMacSystemFont', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e5e5", padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0, letterSpacing: "-0.3px" }}>Mano AI</h1>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "3px 0 0 0", fontWeight: "500" }}>Your ops assistant</p>
        </div>
      </div>

      {/* Chat Container */}
      <div style={{ flex: 1, maxWidth: "900px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", padding: "0 24px" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: "20px", paddingBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: "8px" }}>
              {msg.role === "assistant" && (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#d4835f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0, marginTop: "2px" }}>🐒</div>
              )}
              <div style={{
                maxWidth: "65%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                background: msg.role === "user" ? "#007aff" : "#ffffff",
                border: msg.role === "user" ? "none" : "1px solid #e5e5e5",
                color: msg.role === "user" ? "white" : "#374151",
                fontSize: "13px",
                lineHeight: "1.5",
                boxShadow: msg.role === "user" ? "none" : "0 1px 2px rgba(0,0,0,0.05)"
              }}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: "0 0 6px 0", lineHeight: "1.5" }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ fontWeight: "700" }}>{children}</strong>,
                      ul: ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: "16px", lineHeight: "1.6" }}>{children}</ul>,
                      li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
                    }}
                  >{msg.content}</ReactMarkdown>
                ) : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#d4835f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🐒</div>
              <div style={{ padding: "10px 14px", borderRadius: "4px 16px 16px 16px", background: "white", border: "1px solid #e5e5e5", color: "#9ca3af", fontSize: "13px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>typing...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ paddingBottom: "12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => setInput(s)}
                style={{ background: "#ffffff", border: "1px solid #e5e5e5", color: "#6b7280", padding: "6px 12px", borderRadius: "16px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", fontWeight: "500", transition: "all 0.2s" }}
                onMouseEnter={e => { e.target.style.background = "#f3f4f6"; e.target.style.borderColor = "#d1d5db"; }}
                onMouseLeave={e => { e.target.style.background = "#ffffff"; e.target.style.borderColor = "#e5e5e5"; }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ paddingTop: "12px", paddingBottom: "20px", display: "flex", alignItems: "flex-end", gap: "8px" }}>
          <button style={{ width: "28px", height: "28px", borderRadius: "50%", background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "#007aff"}
            onMouseLeave={e => e.target.style.color = "#6b7280"}>
            ➕
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Type a message..."
            style={{ flex: 1, padding: "10px 14px", border: "1px solid #e5e5e5", borderRadius: "18px", fontSize: "13px", outline: "none", fontFamily: "inherit", background: "white", color: "#1f2937", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
          />
          <button style={{ width: "28px", height: "28px", borderRadius: "50%", background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "#007aff"}
            onMouseLeave={e => e.target.style.color = "#6b7280"}>
            🎤
          </button>
          <button onClick={send} disabled={loading || !input.trim()}
            style={{ width: "32px", height: "32px", borderRadius: "50%", background: loading || !input.trim() ? "#d1d5db" : "#007aff", color: "white", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", transition: "background 0.2s" }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}