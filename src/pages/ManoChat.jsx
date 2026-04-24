import React, { useState, useEffect, useRef } from "react";
import { manoAiChat } from "@/functions/manoAiChat";
import ReactMarkdown from "react-markdown";

export default function ManoChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey there! 👋 I'm Mano, your AI ops assistant. What's on your mind?" }
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
    <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e0e0e0", padding: "16px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>Mano AI</h1>
          <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0 0" }}>Your ops assistant — ask me anything</p>
        </div>
      </div>

      {/* Chat Container */}
      <div style={{ flex: 1, maxWidth: "800px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: "10px" }}>
              {msg.role === "assistant" && (
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#d4835f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🐒</div>
              )}
              <div style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                background: msg.role === "user" ? "#007AFF" : "white",
                border: msg.role === "user" ? "none" : "1px solid #e0e0e0",
                color: msg.role === "user" ? "white" : "#1a1a1a",
                fontSize: "14px",
                lineHeight: "1.6"
              }}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ fontWeight: "600" }}>{children}</strong>,
                      ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: "18px" }}>{children}</ul>,
                      li: ({ children }) => <li style={{ margin: "4px 0" }}>{children}</li>,
                    }}
                  >{msg.content}</ReactMarkdown>
                ) : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#d4835f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🐒</div>
              <div style={{ padding: "12px 16px", borderRadius: "4px 18px 18px 18px", background: "white", border: "1px solid #e0e0e0", color: "#999" }}>typing...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ padding: "16px 20px", display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #e0e0e0", background: "white" }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => setInput(s)}
                style={{ background: "#f0f0f0", border: "1px solid #d0d0d0", color: "#333", padding: "8px 14px", borderRadius: "18px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ background: "white", borderTop: "1px solid #e0e0e0", padding: "16px 20px" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", alignItems: "center", gap: "10px" }}>
            <button style={{ width: "32px", height: "32px", borderRadius: "50%", background: "transparent", border: "none", color: "#007AFF", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ➕
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type a message..."
              style={{ flex: 1, padding: "10px 16px", border: "1px solid #d0d0d0", borderRadius: "20px", fontSize: "14px", outline: "none", fontFamily: "inherit" }}
            />
            <button style={{ width: "32px", height: "32px", borderRadius: "50%", background: "transparent", border: "none", color: "#007AFF", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              🎤
            </button>
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ width: "40px", height: "40px", borderRadius: "50%", background: loading || !input.trim() ? "#ccc" : "#007AFF", color: "white", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}