import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const G = {
  gold:     "#D4AF37",
  goldDim:  "#A8891F",
  goldBg:   "rgba(212,175,55,0.08)",
  goldBd:   "rgba(212,175,55,0.25)",
  red:      "#EF4444",
  green:    "#22C55E",
  white:    "#FFFFFF",
  off:      "#E8E8E8",
  gray:     "#888",
  dim:      "#444",
  panel:    "#111111",
  panel2:   "#0D0D0D",
  border:   "#1E1E1E",
  borderDim:"#161616",
  bg:       "#080808",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }

  @keyframes goldPulse {
    0%,100% { box-shadow: 0 0 0 1px rgba(212,175,55,0.15), 0 0 24px rgba(212,175,55,0.10); }
    50%      { box-shadow: 0 0 0 1px rgba(212,175,55,0.30), 0 0 40px rgba(212,175,55,0.20); }
  }
  @keyframes blink {
    0%,100% { opacity: 1; } 50% { opacity: 0; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes typingDot {
    0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  .gold-card { animation: goldPulse 3s ease-in-out infinite; }
  .fade-up   { animation: fadeUp 0.3s ease forwards; }
  .cursor    { animation: blink 1s step-end infinite; }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 8px; margin-bottom: 2px;
    cursor: pointer; border: 1px solid transparent;
    transition: all 0.18s ease; text-decoration: none;
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    color: #555; background: transparent;
  }
  .nav-item:hover { color: #999; background: #111; }
  .nav-item.active { color: ${G.gold}; background: ${G.goldBg}; border-color: ${G.goldBd}; }

  .send-btn {
    background: linear-gradient(135deg, ${G.gold}, ${G.goldDim});
    color: #000; border: none; border-radius: 10px;
    padding: 12px 22px; font-family: 'Space Mono', monospace;
    font-size: 11px; font-weight: 700; letter-spacing: 1px;
    cursor: pointer; transition: all 0.18s ease;
    box-shadow: 0 0 20px rgba(212,175,55,0.30);
    white-space: nowrap;
  }
  .send-btn:hover { transform: translateY(-1px); box-shadow: 0 0 32px rgba(212,175,55,0.50); }
  .send-btn:disabled { background: #1a1a1a; color: #333; box-shadow: none; cursor: not-allowed; transform: none; }

  .ghost-btn {
    background: transparent; border: 1px solid #222; color: #555;
    border-radius: 8px; padding: 8px 14px; cursor: pointer;
    font-family: 'Space Mono', monospace; font-size: 10px;
    letter-spacing: 0.5px; transition: all 0.18s;
  }
  .ghost-btn:hover { border-color: #3a3a3a; color: #999; }

  .chip {
    background: #0f0f0f; border: 1px solid #1e1e1e; color: #555;
    border-radius: 20px; padding: 7px 14px; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 12px;
    transition: all 0.18s ease; white-space: nowrap;
  }
  .chip:hover { border-color: ${G.goldBd}; color: ${G.gold}; background: ${G.goldBg}; }

  .toggle-switch {
    width: 40px; height: 22px; border-radius: 11px; border: none;
    cursor: pointer; position: relative; transition: background 0.3s; flex-shrink: 0;
  }
  .toggle-knob {
    position: absolute; top: 3px; width: 16px; height: 16px;
    border-radius: 50%; background: white; transition: left 0.3s;
  }

  @media (max-width: 900px) {
    .right-panel { display: none !important; }
    .sidebar { width: 60px !important; }
    .sidebar .nav-label { display: none !important; }
    .sidebar .logo-text { display: none !important; }
  }
  @media (max-width: 600px) {
    .sidebar { display: none !important; }
  }
`;

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_CONVOS = [
  { id: 1, title: "Missed Call Recovery Setup",     preview: "How do we handle calls after hours?", ts: "2h ago",    active: true  },
  { id: 2, title: "HVAC Demo Flow",                 preview: "Walk me through the demo script",      ts: "Yesterday", active: false },
  { id: 3, title: "Follow-Up Automation",           preview: "Set up a 3-touch follow-up sequence",  ts: "2d ago",    active: false },
  { id: 4, title: "Revenue Loss Calculator",        preview: "Calculate monthly missed revenue",      ts: "3d ago",    active: false },
  { id: 5, title: "Calendar Booking Workflow",      preview: "Connect Calendly to the intake flow",  ts: "4d ago",    active: false },
];

const INIT_MESSAGES = [
  {
    role: "assistant",
    content: "Hey — I'm **MANO**, your AI Revenue Recovery Operator 🐒\n\nI'm built to help you capture missed leads, qualify prospects, book appointments, generate follow-ups, and run your entire sales pipeline on autopilot.\n\nWhat do you want to tackle today?",
    ts: "2:04 PM",
  },
];

const QUICK_PROMPTS = [
  "Draft a summary of my day",
  "Build missed call recovery logic",
  "Create follow-up sequence",
  "Analyze lead pipeline",
  "Schedule a meeting with my team",
  "Generate a sales script",
];

const CAPABILITIES = [
  "Revenue recovery logic",
  "Lead qualification",
  "Booking workflow",
  "Follow-up automation",
  "Sales scripting",
  "CRM notes & logging",
  "Daily reporting",
  "SOP generation",
  "Google Docs / Drive planning",
  "Twilio / Vapi / Calendar workflows",
];

const INTEGRATIONS = [
  { name: "OpenAI API",        icon: "🧠", status: "connected"     },
  { name: "Google Drive/Docs", icon: "📁", status: "not_connected"  },
  { name: "Twilio",            icon: "📱", status: "connected"      },
  { name: "Vapi",              icon: "🎙️", status: "not_connected"  },
  { name: "Calendar",          icon: "📅", status: "not_connected"  },
  { name: "CRM",               icon: "🗃️", status: "not_connected"  },
  { name: "Webhooks",          icon: "⚡", status: "not_connected"  },
];

const DEFAULT_INSTRUCTIONS = `MANO is the AI Revenue Recovery Operator for Monkee Bizz AI. MANO helps capture leads, qualify prospects, book appointments, generate follow-ups, summarize conversations, and support automation workflows. MANO should be direct, professional, revenue-focused, and action-oriented.`;

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ activeSection, setActiveSection, conversations, activeConvo, setActiveConvo }) {
  const navItems = [
    { id: "chat",      icon: "💬", label: "Chat"      },
    { id: "brain",     icon: "🧠", label: "Brain"     },
    { id: "tasks",     icon: "✅", label: "Tasks"     },
    { id: "artifacts", icon: "📄", label: "Artifacts" },
    { id: "files",     icon: "📁", label: "Files"     },
    { id: "settings",  icon: "⚙️", label: "Settings"  },
  ];

  const channels = [
    { label: "Continue on WhatsApp", icon: "📱", color: "#25D366" },
    { label: "Continue on Telegram", icon: "✈️", color: "#2AABEE" },
    { label: "Continue on iMessage", icon: "💬", color: "#34AADC" },
  ];

  return (
    <aside className="sidebar" style={{ width: "260px", background: G.panel2, borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column", flexShrink: 0, minHeight: "100vh" }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${G.borderDim}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `linear-gradient(135deg, ${G.gold}, ${G.goldDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: `0 0 16px rgba(212,175,55,0.35)`, flexShrink: 0 }}>🐒</div>
          <div className="logo-text">
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.gold, letterSpacing: "2.5px", fontWeight: 700 }}>MONKEE BIZZ AI</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: G.dim, letterSpacing: "1px" }}>MANO OPERATOR v1.0</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "2px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: G.green, boxShadow: `0 0 8px ${G.green}` }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.green, letterSpacing: "1px" }}>MANO ONLINE</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 10px", borderBottom: `1px solid ${G.borderDim}` }}>
        {navItems.map(item => (
          <div key={item.id} className={`nav-item${activeSection === item.id ? " active" : ""}`} onClick={() => setActiveSection(item.id)}>
            <span style={{ fontSize: "15px" }}>{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Conversations */}
      {activeSection === "chat" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: G.dim, letterSpacing: "2px", padding: "6px 4px 8px", fontWeight: 700 }}>CONVERSATIONS</div>
          {conversations.map(c => (
            <div key={c.id}
              onClick={() => setActiveConvo(c.id)}
              style={{ padding: "10px 10px", borderRadius: "8px", marginBottom: "3px", cursor: "pointer", background: activeConvo === c.id ? G.goldBg : "transparent", border: `1px solid ${activeConvo === c.id ? G.goldBd : "transparent"}`, transition: "all 0.18s" }}
            >
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: activeConvo === c.id ? G.gold : "#888", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: G.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.preview}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: "#2a2a2a", marginTop: "4px" }}>{c.ts}</div>
            </div>
          ))}
          <div style={{ padding: "6px 4px", marginTop: "4px" }}>
            <button className="ghost-btn" style={{ width: "100%", fontSize: "9px", letterSpacing: "1px" }}>+ NEW CONVERSATION</button>
          </div>
        </div>
      )}

      {/* Channels */}
      <div style={{ padding: "12px 10px", borderTop: `1px solid ${G.borderDim}` }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: G.dim, letterSpacing: "2px", marginBottom: "8px", fontWeight: 700 }}>CHANNELS</div>
        {channels.map(ch => (
          <div key={ch.label} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "7px", cursor: "pointer", marginBottom: "2px", transition: "background 0.18s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#111"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontSize: "13px" }}>{ch.icon}</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: G.dim }}>{ch.label}</span>
          </div>
        ))}
      </div>

      {/* Back link */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${G.borderDim}` }}>
        <a href="/CommandCenter" style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.dim, textDecoration: "none", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
          ← Command Center
        </a>
      </div>
    </aside>
  );
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onCopy }) {
  const isUser = msg.role === "user";
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: "4px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {!isUser && <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `linear-gradient(135deg,${G.gold},${G.goldDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0, boxShadow: `0 0 12px rgba(212,175,55,0.25)` }}>🐒</div>}
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: G.dim, letterSpacing: "1px" }}>{isUser ? "YOU" : "MANO"} · {msg.ts}</span>
        {isUser && <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#1a1a1a", border: `1px solid #2a2a2a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>👤</div>}
      </div>
      <div style={{
        maxWidth: "78%",
        padding: "14px 18px",
        borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        background: isUser ? G.goldBg : G.panel,
        border: `1px solid ${isUser ? G.goldBd : G.border}`,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "14px",
        color: isUser ? G.gold : G.off,
        lineHeight: 1.7,
      }}>
        {isUser ? msg.content : (
          <ReactMarkdown components={{
            p:      ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
            strong: ({ children }) => <strong style={{ color: G.gold, fontWeight: 700 }}>{children}</strong>,
            ul:     ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: "18px" }}>{children}</ul>,
            li:     ({ children }) => <li style={{ margin: "3px 0" }}>{children}</li>,
            code:   ({ children }) => <code style={{ background: "#1a1a1a", border: `1px solid #2a2a2a`, padding: "2px 7px", borderRadius: "5px", fontSize: "12px", color: G.gold, fontFamily: "'Space Mono', monospace" }}>{children}</code>,
          }}>{msg.content}</ReactMarkdown>
        )}
      </div>
      {!isUser && (
        <div style={{ display: "flex", gap: "6px", paddingLeft: "36px" }}>
          <button className="ghost-btn" style={{ fontSize: "9px", padding: "4px 10px" }} onClick={() => onCopy(msg.content)}>Copy</button>
        </div>
      )}
    </div>
  );
}

// ─── TYPING INDICATOR ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `linear-gradient(135deg,${G.gold},${G.goldDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🐒</div>
      <div style={{ padding: "12px 18px", borderRadius: "4px 16px 16px 16px", background: G.panel, border: `1px solid ${G.border}`, display: "flex", gap: "5px", alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: G.gold, animation: `typingDot 1.4s ${i * 0.2}s ease-in-out infinite` }} />
        ))}
      </div>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.dim }}>MANO is thinking…</span>
    </div>
  );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────────────────
function RightPanel({ showInstructions, setShowInstructions, instructions, setInstructions, securitySettings, setSecuritySettings }) {
  return (
    <aside className="right-panel" style={{ width: "280px", background: G.panel2, borderLeft: `1px solid ${G.border}`, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>

      {/* Capabilities */}
      <div style={{ padding: "20px 18px", borderBottom: `1px solid ${G.borderDim}` }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.gold, letterSpacing: "2px", marginBottom: "12px", fontWeight: 700 }}>CAPABILITIES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {CAPABILITIES.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: G.gold, flexShrink: 0 }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#999" }}>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div style={{ padding: "20px 18px", borderBottom: `1px solid ${G.borderDim}` }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.gold, letterSpacing: "2px", marginBottom: "12px", fontWeight: 700 }}>INTEGRATIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {INTEGRATIONS.map((int, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: G.bg, border: `1px solid ${G.borderDim}`, borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px" }}>{int.icon}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#888" }}>{int.name}</span>
              </div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", letterSpacing: "1px", color: int.status === "connected" ? G.green : G.dim, background: int.status === "connected" ? "rgba(34,197,94,0.08)" : "#111", border: `1px solid ${int.status === "connected" ? "rgba(34,197,94,0.25)" : "#222"}`, padding: "2px 7px", borderRadius: "4px" }}>
                {int.status === "connected" ? "LIVE" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Instructions */}
      <div style={{ padding: "20px 18px", borderBottom: `1px solid ${G.borderDim}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.gold, letterSpacing: "2px", fontWeight: 700 }}>AGENT INSTRUCTIONS</div>
          <button className="ghost-btn" style={{ fontSize: "8px", padding: "3px 8px" }} onClick={() => setShowInstructions(!showInstructions)}>
            {showInstructions ? "COLLAPSE" : "EXPAND"}
          </button>
        </div>
        {showInstructions && (
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={6}
            style={{ width: "100%", background: "#0a0a0a", border: `1px solid #2a2a2a`, borderRadius: "8px", padding: "10px 12px", color: "#aaa", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box" }}
          />
        )}
      </div>

      {/* Security */}
      <div style={{ padding: "20px 18px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.gold, letterSpacing: "2px", marginBottom: "12px", fontWeight: 700 }}>SECURITY & PERMISSIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Object.entries(securitySettings).map(([key, val]) => {
            const labels = {
              agentLogging:    "Agent Logging Enabled",
              humanApproval:   "Human Approval Required",
              safeMode:        "Safe Mode Enabled",
              killSwitch:      "Kill Switch",
              permissionLimits:"Permission Limits",
            };
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#777" }}>{labels[key]}</span>
                <button
                  className="toggle-switch"
                  style={{ background: val ? G.green : "#2a2a2a" }}
                  onClick={() => setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }))}
                >
                  <div className="toggle-knob" style={{ left: val ? "21px" : "3px" }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ManoChatPage() {
  const [messages, setMessages]               = useState(INIT_MESSAGES);
  const [input, setInput]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [activeSection, setActiveSection]     = useState("chat");
  const [activeConvo, setActiveConvo]         = useState(1);
  const [conversations, setConversations]     = useState(MOCK_CONVOS);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions]       = useState(DEFAULT_INSTRUCTIONS);
  const [copied, setCopied]                   = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    agentLogging:     true,
    humanApproval:    false,
    safeMode:         true,
    killSwitch:       false,
    permissionLimits: true,
  });

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ts = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setMessages(prev => [...prev, { role: "user", content: msg, ts: ts() }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://mano-dd309130.base44.app/functions/manoAiChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages.slice(-10) }),
      });
      const data = await res.json();
      if (data && data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply, ts: ts() }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "MANO didn't respond. Try again.", ts: ts() }]);
      }
    } catch (e) {
      console.error("[ManoChat]", e);
      setMessages(prev => [...prev, { role: "assistant", content: "Connection issue — try again.", ts: ts() }]);
    }
    setLoading(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => setMessages(INIT_MESSAGES);

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (lastUser) {
      setMessages(prev => prev.slice(0, -1));
      send(lastUser.content);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: G.bg, color: G.white, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{CSS}</style>

      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        conversations={conversations}
        activeConvo={activeConvo}
        setActiveConvo={setActiveConvo}
      />

      {/* ── MAIN CHAT ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 28px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: G.panel2, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: `linear-gradient(135deg,${G.gold},${G.goldDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", boxShadow: `0 0 20px rgba(212,175,55,0.30)` }}>🐒</div>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 800, color: G.white, letterSpacing: "-0.5px" }}>MANO</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.goldDim, letterSpacing: "2px" }}>AI REVENUE RECOVERY OPERATOR</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: G.green, boxShadow: `0 0 8px ${G.green}` }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: G.green, letterSpacing: "1px" }}>ONLINE</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="ghost-btn" onClick={handleRegenerate} title="Regenerate last response">↺ Regen</button>
            <button className="ghost-btn" onClick={handleClear} title="Clear conversation">✕ Clear</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} onCopy={handleCopy} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick Prompts */}
        <div style={{ padding: "0 36px 12px", display: "flex", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} className="chip" onClick={() => send(p)}>{p}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "0 28px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "10px", background: G.panel, border: `1px solid ${copied ? G.goldBd : G.border}`, borderRadius: "14px", padding: "6px 6px 6px 16px", alignItems: "flex-end", transition: "border-color 0.3s", boxShadow: `0 0 40px rgba(0,0,0,0.6)` }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message to MANO…"
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: G.white, fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, resize: "none", paddingTop: "8px", paddingBottom: "8px", maxHeight: "140px" }}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
            />
            <div style={{ display: "flex", gap: "6px", alignItems: "center", paddingBottom: "6px" }}>
              <button className="ghost-btn" style={{ fontSize: "16px", padding: "8px 10px", border: "none", background: "transparent", cursor: "pointer", color: G.dim }} title="Attach file">📎</button>
              <button className="ghost-btn" style={{ fontSize: "16px", padding: "8px 10px", border: "none", background: "transparent", cursor: "pointer", color: G.dim }} title="Voice input">🎤</button>
              <button className="send-btn" disabled={loading || !input.trim()} onClick={() => send()}>
                {loading ? "…" : "SEND →"}
              </button>
            </div>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#2a2a2a", marginTop: "8px", textAlign: "center", letterSpacing: "1px" }}>
            MANO · MONKEE BIZZ AI · REVENUE RECOVERY SYSTEM
          </div>
        </div>
      </main>

      {/* ── RIGHT PANEL ── */}
      <RightPanel
        showInstructions={showInstructions}
        setShowInstructions={setShowInstructions}
        instructions={instructions}
        setInstructions={setInstructions}
        securitySettings={securitySettings}
        setSecuritySettings={setSecuritySettings}
      />
    </div>
  );
}