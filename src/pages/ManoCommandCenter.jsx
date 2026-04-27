import React, { useState, useEffect, useRef } from "react";
import ManoSidebar from "@/components/mano/ManoSidebar";

// ─── Design System ────────────────────────────────────────────────────────────
const G = {
  gold:    "#D4AF37",
  goldDim: "#A8891F",
  goldBg:  "rgba(212,175,55,0.07)",
  goldBd:  "rgba(212,175,55,0.22)",
  goldGlow:"rgba(212,175,55,0.18)",
  green:   "#22C55E",
  greenBg: "rgba(34,197,94,0.07)",
  greenBd: "rgba(34,197,94,0.20)",
  red:     "#EF4444",
  white:   "#FFFFFF",
  offwhite:"#E8E8E8",
  gray:    "#888888",
  dim:     "#444444",
  panel:   "#121212",
  panel2:  "#0E0E0E",
  border:  "#222222",
  borderDim:"#1A1A1A",
  bg:      "#080808",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }

  @keyframes goldGlow {
    0%,100% { box-shadow: 0 0 0 1px rgba(212,175,55,0.15), 0 0 32px rgba(212,175,55,0.12); }
    50%      { box-shadow: 0 0 0 1px rgba(212,175,55,0.25), 0 0 48px rgba(212,175,55,0.22); }
  }
  @keyframes pulseDot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%     { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .gold-card { animation: goldGlow 3.5s ease-in-out infinite; }
  .pulse-dot { animation: pulseDot 1.8s ease-in-out infinite; }
  .fade-up   { animation: fadeUp 0.35s ease forwards; }

  .run-btn {
    background: linear-gradient(135deg, #D4AF37 0%, #A8891F 100%);
    color: #000;
    border: none;
    padding: 18px 40px;
    border-radius: 12px;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.5px;
    cursor: pointer;
    box-shadow: 0 0 32px rgba(212,175,55,0.35), 0 4px 16px rgba(0,0,0,0.4);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .run-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 0 48px rgba(212,175,55,0.5), 0 6px 20px rgba(0,0,0,0.5);
  }
  .run-btn:active:not(:disabled) { transform: scale(0.98); }
  .run-btn:disabled {
    background: #1e1e1e;
    color: #3a3a3a;
    box-shadow: none;
    cursor: not-allowed;
  }

  .ghost-btn {
    background: transparent;
    border: 1px solid #2a2a2a;
    color: #666;
    padding: 14px 22px;
    border-radius: 10px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .ghost-btn:hover { border-color: #444; color: #999; }
  .ghost-btn:active { opacity: 0.7; }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 20px;
    border-radius: 10px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.18s ease;
    border: 1px solid #222;
    background: #111;
    color: #777;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    min-height: 44px;
  }
  .action-btn:hover  { border-color: #3a3a3a; color: #ccc; background: #161616; }
  .action-btn:active { opacity: 0.8; transform: scale(0.98); }
  .action-btn.primary {
    background: linear-gradient(135deg, #D4AF37, #A8891F);
    color: #000;
    border-color: transparent;
    box-shadow: 0 0 20px rgba(212,175,55,0.25);
  }
  .action-btn.primary:hover  { box-shadow: 0 0 32px rgba(212,175,55,0.4); transform: translateY(-1px); }
  .action-btn.primary:active { transform: scale(0.97); }

  /* ── Tablet (≤ 1024px) */
  @media (max-width: 1024px) {
    .kpi-grid       { grid-template-columns: repeat(3, 1fr) !important; }
    .grid-rev-auto  { grid-template-columns: 1fr !important; }
  }

  /* ── Mobile (≤ 768px) — single column everything */
  @media (max-width: 768px) {
    .main-pad       { padding: 20px 16px 64px !important; }
    .kpi-grid       { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .grid-2col      { grid-template-columns: 1fr !important; gap: 16px !important; }
    .grid-rev-auto  { grid-template-columns: 1fr !important; }
    .hide-mobile    { display: none !important; }
    .actions-wrap   { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .actions-wrap .primary-action { grid-column: 1 / -1 !important; }

    /* Demo engine — full mobile */
    .demo-inner-pad  { padding: 24px 20px 20px !important; }
    .demo-timeline   { grid-template-columns: 1fr 1fr !important; }
    .demo-result     { padding: 20px !important; flex-direction: column !important; align-items: flex-start !important; }
    .run-btn         { width: 100% !important; padding: 18px !important; font-size: 14px !important; }
    .ghost-btn       { width: 100% !important; }
    .demo-btn-row    { width: 100% !important; flex-direction: column !important; gap: 10px !important; }

    /* Pipeline — horizontal scroll on mobile */
    .pipeline-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; padding-bottom: 12px !important; }
    .pipeline-inner  { display: flex !important; gap: 12px !important; width: max-content !important; min-width: 100% !important; }
    .pipeline-col    { width: 160px !important; flex-shrink: 0 !important; }

    /* Conversation + activity: uncap height */
    .conv-messages   { min-height: 260px !important; max-height: 340px !important; }
  }

  /* ── Small phones (≤ 420px) */
  @media (max-width: 420px) {
    .kpi-grid        { grid-template-columns: 1fr 1fr !important; }
    .demo-timeline   { grid-template-columns: 1fr !important; }
    .main-pad        { padding: 16px 14px 64px !important; }
  }
`;

// ─── Data ─────────────────────────────────────────────────────────────────────
const DEMO_STEPS = [
  { id:1, icon:"📞", label:"Missed call detected",        detail:"Caller: Marcus Webb  ·  +1 (623) 555-0147",             delay:0,     type:"missed"    },
  { id:2, icon:"⚡", label:"Instant SMS dispatched",      detail:"Fired in 2.3 seconds  ·  MANO Messaging Engine",        delay:1800,  type:"sms"       },
  { id:3, icon:"💬", label:"Customer reply received",     detail:'"Yeah it\'s blowing warm air. It\'s 108° outside."',    delay:3800,  type:"reply"     },
  { id:4, icon:"🧠", label:"AI asks qualification question", detail:"MANO: \"Is the fan running, or completely off?\"",   delay:5200,  type:"qualify"   },
  { id:5, icon:"💬", label:"Customer responds",           detail:'"Fan is running but just warm air coming out."',         delay:7000,  type:"reply"     },
  { id:6, icon:"📅", label:"AI confirms appointment",     detail:"MANO: \"Tech arriving 2–3 PM today. You'll be notified.\"", delay:8800, type:"book"  },
  { id:7, icon:"✅", label:"Job marked BOOKED",           detail:"Lead status → BOOKED  ·  Score: HOT  ·  Response: 2.3s", delay:10400, type:"booked"  },
  { id:8, icon:"💰", label:"$850 added to pipeline",      detail:"Revenue recovered  ·  Pipeline & KPIs updated",          delay:11800, type:"revenue"   },
];

const SMS_CONV = [
  { from:"system", text:"Missed call detected — Marcus Webb",             ts:"2:04 PM" },
  { from:"mano",   text:"Hi Marcus, this is Mano from Valley Cool HVAC 👋 We got your message — your AC isn't cooling. Can you confirm?", ts:"2:04 PM" },
  { from:"lead",   text:"Yeah it's blowing warm air. It's 108° outside right now, this is really bad", ts:"2:05 PM" },
  { from:"mano",   text:"That's urgent — I'm on it. Is the fan running, or is the whole system completely off?", ts:"2:05 PM" },
  { from:"lead",   text:"Fan is running but just warm air coming out", ts:"2:06 PM" },
  { from:"mano",   text:"Got it. Sounds like a refrigerant or compressor issue. Our tech can be there today. Does 2–5 PM work?", ts:"2:06 PM" },
  { from:"lead",   text:"Yes, 2pm is perfect", ts:"2:07 PM" },
  { from:"mano",   text:"✅ Booked. Tech arriving 2–3 PM today. You'll get a text 30 min before arrival.", ts:"2:07 PM", booked:true },
];

const INIT_PIPELINE = [
  { id:1, name:"Marcus Webb",   service:"AC Repair",           value:850,  stage:"missed",    score:"HOT"  },
  { id:2, name:"Sandra Ortiz",  service:"Heater Replacement",  value:2200, stage:"contacted", score:"HOT"  },
  { id:3, name:"Derek Lane",    service:"Thermostat Install",   value:320,  stage:"qualified", score:"WARM" },
  { id:4, name:"Tonya Simms",   service:"Annual Tune-Up",       value:189,  stage:"booked",    score:"WARM" },
  { id:5, name:"James Pruitt",  service:"Outdoor Unit Repair",  value:1100, stage:"missed",    score:"HOT"  },
  { id:6, name:"Lena Figueroa", service:"Filter + Checkup",     value:145,  stage:"closed",    score:"COLD" },
];

const PIPELINE_STAGES = [
  { key:"missed",    label:"MISSED",    color:"#555" },
  { key:"contacted", label:"CONTACTED", color:"#888" },
  { key:"qualified", label:"QUALIFIED", color:G.gold },
  { key:"booked",    label:"BOOKED",    color:G.gold },
  { key:"closed",    label:"CLOSED",    color:G.green},
];

const REVENUE_DATA = [
  { month:"Nov", val:8200  },
  { month:"Dec", val:11400 },
  { month:"Jan", val:9800  },
  { month:"Feb", val:13200 },
  { month:"Mar", val:12600 },
  { month:"Apr", val:14850 },
];

const AUTOMATIONS = [
  { label:"Missed Call SMS",      desc:"Fires within 3 sec of missed call"  },
  { label:"AI Voice Follow-Up",   desc:"Calls leads that don't reply"        },
  { label:"Lead Qualification",   desc:"Scores every inbound automatically" },
  { label:"Calendar Booking",     desc:"Books via Calendly integration"      },
  { label:"Follow-Up Sequences",  desc:"3-touch nurture over 7 days"        },
];

// ─── Shared primitives ────────────────────────────────────────────────────────
const mono = (text, size = "10px", color = G.dim, extra = {}) => (
  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:size, color, letterSpacing:"1.5px", ...extra }}>{text}</span>
);

const Label = ({ children, style = {} }) => (
  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.gold, letterSpacing:"3px", fontWeight:700, ...style }}>{children}</div>
);

const Divider = ({ style = {} }) => (
  <div style={{ height:"1px", background:G.borderDim, ...style }} />
);

const Panel = ({ children, style = {}, glow = false }) => (
  <div
    className={glow ? "gold-card" : ""}
    style={{
      background: G.panel,
      border: `1px solid ${G.border}`,
      borderRadius: "16px",
      padding: "28px",
      ...style,
    }}
  >
    {children}
  </div>
);

const ScoreBadge = ({ score }) => {
  const map = {
    HOT:     { c:G.red,   bg:"rgba(239,68,68,0.10)"   },
    WARM:    { c:G.gold,  bg:G.goldBg                  },
    COLD:    { c:G.dim,   bg:"#161616"                 },
    PENDING: { c:G.dim,   bg:"#111"                    },
  };
  const s = map[score] || map.COLD;
  return (
    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", fontWeight:700, color:s.c, background:s.bg, border:`1px solid ${s.c}40`, padding:"2px 8px", borderRadius:"4px", letterSpacing:"1px" }}>
      {score}
    </span>
  );
};

// ─── KPI Bar ──────────────────────────────────────────────────────────────────
function KpiBar({ revenue, jobs }) {
  const kpis = [
    { label:"Revenue Recovered",     value:`$${revenue.toLocaleString()}`, sub:"+18% this week",      gold:true  },
    { label:"Jobs Booked",           value:String(jobs),                   sub:`+${jobs-15} this week`, gold:false },
    { label:"Missed Calls Captured", value:"47",                           sub:"This month",            gold:false },
    { label:"Leads Qualified",       value:"62",                           sub:"This month",            gold:false },
    { label:"Avg Response Time",     value:"4.8s",                         sub:"AI-powered",            gold:false },
  ];

  return (
    <div className="kpi-grid" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"12px", marginBottom:"32px" }}>
      {kpis.map((k, i) => (
        <div
          key={i}
          className={k.gold ? "gold-card" : ""}
          style={{
            background: k.gold
              ? "linear-gradient(145deg, rgba(212,175,55,0.11) 0%, rgba(212,175,55,0.04) 100%)"
              : G.panel,
            border: `1px solid ${k.gold ? G.goldBd : G.border}`,
            borderRadius: "14px",
            padding: "22px 20px",
          }}
        >
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:k.gold ? G.gold : G.gray, marginBottom:"12px", fontWeight:500 }}>
            {k.label}
          </div>
          <div style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: k.gold ? "30px" : "24px",
            fontWeight: 700,
            color: k.gold ? G.gold : G.white,
            lineHeight: 1,
            marginBottom: "10px",
            letterSpacing: k.gold ? "-0.5px" : "0",
          }}>
            {k.value}
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:k.gold ? G.goldDim : G.dim, letterSpacing:"0.5px" }}>
            {k.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Live Demo Engine ─────────────────────────────────────────────────────────
function LiveDemoEngine({ onDemoComplete }) {
  const [running, setRunning] = useState(false);
  const [steps,   setSteps]   = useState([]);
  const [done,    setDone]    = useState(false);
  const timers = useRef([]);

  function runDemo() {
    if (running) return;
    setRunning(true); setSteps([]); setDone(false);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    DEMO_STEPS.forEach(step => {
      const t = setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (step.id === DEMO_STEPS.length) {
          const t2 = setTimeout(() => { setRunning(false); setDone(true); onDemoComplete(); }, 700);
          timers.current.push(t2);
        }
      }, step.delay);
      timers.current.push(t);
    });
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    setSteps([]); setDone(false); setRunning(false);
  }

  const stepTypeColor = { revenue:G.gold, booked:G.gold, sms:G.gold, missed:G.red, book:G.green, qualify:G.offwhite, reply:"#ccc" };

  return (
    <div
      style={{
        background: G.panel,
        border: `1px solid ${done ? G.goldBd : G.border}`,
        borderRadius: "20px",
        marginBottom: "32px",
        overflow: "hidden",
        transition: "border-color 0.5s",
        boxShadow: done ? `0 0 60px rgba(212,175,55,0.10)` : "none",
      }}
    >
      {/* Hero header */}
      <div className="demo-inner-pad" style={{ padding:"36px 36px 28px", background:"linear-gradient(180deg, #141414 0%, #121212 100%)" }}>
        <div className="demo-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"24px" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <Label style={{ marginBottom:"12px" }}>LIVE REVENUE RECOVERY DEMO</Label>
            <h2 style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: "clamp(20px, 3vw, 32px)",
              fontWeight: 800,
              color: G.white,
              margin: "0 0 8px",
              lineHeight: 1.2,
              letterSpacing: "-0.5px",
            }}>
              Watch MANO convert a missed call into a booked job — live.
            </h2>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:G.gray, lineHeight:1.6 }}>
              No human involved. Avg response: <span style={{ color:G.gold, fontWeight:600 }}>4.8 seconds.</span>
            </div>
          </div>

          <div className="demo-btn-row" style={{ display:"flex", gap:"10px", alignItems:"center", flexShrink:0 }}>
            {done && <button className="ghost-btn" onClick={reset}>RESET</button>}
            <button className="run-btn" disabled={running} onClick={runDemo}>
              {running ? "RUNNING…" : done ? "▶  RUN AGAIN" : "▶  RUN DEMO"}
            </button>
          </div>
        </div>

        {/* Status bar */}
        {(running || done) && (
          <div className="fade-up" style={{ marginTop:"20px", display:"flex", alignItems:"center", gap:"10px" }}>
            <div className={running?"pulse-dot":""} style={{ width:"7px", height:"7px", borderRadius:"50%", background:running?G.green:G.gold, flexShrink:0 }} />
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:running?G.green:G.gold, letterSpacing:"1px" }}>
              {running ? "DEMO MODE ACTIVE" : "DEMO COMPLETE — JOB BOOKED"}
            </span>
          </div>
        )}
      </div>

      <Divider />

      {/* Timeline grid */}
      <div className="demo-timeline" style={{ padding:"28px 36px", display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"0" }}>
        {DEMO_STEPS.map((step, i) => {
          const active   = !!steps.find(s => s.id === step.id);
          const isLast   = i === DEMO_STEPS.length - 1;
          const tColor   = stepTypeColor[step.type] || G.offwhite;
          const isRevenue = step.type === "revenue";

          return (
            <div
              key={step.id}
              className={active ? "fade-up" : ""}
              style={{
                borderRight: i % 4 < 3 && !isLast ? `1px solid ${G.borderDim}` : "none",
                borderBottom: i < 4 ? `1px solid ${G.borderDim}` : "none",
                padding: "20px 20px",
                opacity: active ? 1 : 0.18,
                transition: "opacity 0.5s ease",
                background: active && isRevenue ? `linear-gradient(135deg, rgba(212,175,55,0.05), transparent)` : "transparent",
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
                <div style={{
                  width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0,
                  background: active ? (isRevenue ? G.goldBg : G.greenBg) : "#161616",
                  border: `1px solid ${active ? (isRevenue ? G.goldBd : G.greenBd) : G.borderDim}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px",
                  boxShadow: active ? (isRevenue ? `0 0 16px rgba(212,175,55,0.25)` : `0 0 12px rgba(34,197,94,0.15)`) : "none",
                  transition: "all 0.4s",
                }}>
                  {step.icon}
                </div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:G.dim, letterSpacing:"1px" }}>STEP {step.id}</div>
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:700, color:active ? tColor : G.dim, marginBottom:"6px", lineHeight:1.3 }}>
                {step.label}
              </div>
              {active && (
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:isRevenue ? G.goldDim : "#555", lineHeight:1.6, letterSpacing:"0.3px" }}>
                  {step.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result banner */}
      {done && (
        <div className="fade-up">
          <Divider />
          <div className="demo-result" style={{ padding:"24px 36px", background:"linear-gradient(135deg, rgba(212,175,55,0.06), transparent)", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
              <span style={{ fontSize:"24px" }}>💰</span>
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"16px", fontWeight:800, color:G.gold, marginBottom:"4px" }}>
                  Lead booked. $850 recovered. Zero humans required.
                </div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.goldDim, letterSpacing:"1px" }}>
                  2.3 SEC RESPONSE · 3 MIN TO CLOSE · 100% AUTOMATED
                </div>
              </div>
            </div>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:G.gold, background:G.goldBg, border:`1px solid ${G.goldBd}`, borderRadius:"8px", padding:"6px 16px", letterSpacing:"1px", fontWeight:700 }}>
              ✓ JOB BOOKED
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Conversation Panel ───────────────────────────────────────────────────────
function ConversationPanel({ demoRan }) {
  const [visible, setVisible] = useState([]);
  const [typing,  setTyping]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [visible, typing]);

  useEffect(() => {
    if (!demoRan) return;
    setVisible([]); setTyping(false);
    let i = 0;
    function next() {
      if (i >= SMS_CONV.length) return;
      const msg = SMS_CONV[i];
      if (msg.from === "mano" && i > 0) {
        setTyping(true);
        setTimeout(() => { setTyping(false); setVisible(v => [...v, msg]); i++; next(); }, 1300);
      } else {
        setVisible(v => [...v, msg]);
        i++;
        setTimeout(next, msg.from === "system" ? 400 : 1900);
      }
    }
    setTimeout(next, 600);
  }, [demoRan]);

  return (
    <Panel style={{ display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px", paddingBottom:"18px", borderBottom:`1px solid ${G.borderDim}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ width:"40px", height:"40px", borderRadius:"12px", background:`linear-gradient(135deg,${G.gold},${G.goldDim})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", boxShadow:`0 0 20px rgba(212,175,55,0.30)`, flexShrink:0 }}>🤖</div>
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:700, color:G.white, marginBottom:"3px" }}>MANO AI Agent</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.green, letterSpacing:"1px" }}>● ONLINE · 4.8s AVG RESPONSE</div>
          </div>
        </div>
        {visible.some(m => m.booked) && (
          <span style={{ background:G.goldBg, border:`1px solid ${G.goldBd}`, borderRadius:"8px", padding:"6px 14px", fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.gold, fontWeight:700, letterSpacing:"1px" }}>✓ BOOKED</span>
        )}
      </div>

      {/* Messages */}
      <div className="conv-messages" style={{ flex:1, minHeight:"320px", maxHeight:"360px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"14px", paddingRight:"2px" }}>
        {visible.length === 0 && !typing && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"12px", padding:"40px 0" }}>
            <div style={{ fontSize:"28px" }}>💬</div>
            {mono("RUN DEMO TO SEE LIVE CONVERSATION", "9px", G.borderDim, { letterSpacing:"2px", textAlign:"center" })}
          </div>
        )}

        {visible.map((msg, i) => {
          if (msg.from === "system") {
            return (
              <div key={i} style={{ textAlign:"center" }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.dim, background:"#161616", border:`1px solid ${G.borderDim}`, borderRadius:"20px", padding:"5px 14px", letterSpacing:"0.5px" }}>{msg.text}</span>
              </div>
            );
          }
          const isMano = msg.from === "mano";
          return (
            <div key={i} className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:isMano?"flex-start":"flex-end", gap:"4px" }}>
              {mono(isMano ? "MANO" : "MARCUS", "8px", G.dim)}
              <div style={{
                maxWidth: "82%",
                padding: "12px 16px",
                borderRadius: isMano ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                background: isMano ? "#181818" : G.goldBg,
                border: `1px solid ${isMano ? G.border : G.goldBd}`,
                fontFamily: "'DM Sans',sans-serif",
                fontSize: "13px",
                color: isMano ? G.offwhite : G.gold,
                lineHeight: 1.65,
              }}>
                {msg.text}
                {msg.booked && (
                  <div style={{ marginTop:"8px", paddingTop:"8px", borderTop:`1px solid ${G.goldBd}`, fontFamily:"'Space Mono',monospace", fontSize:"8px", color:G.gold, letterSpacing:"1px" }}>
                    ● JOB BOOKED · $850 RECOVERED
                  </div>
                )}
              </div>
              {mono(msg.ts, "8px", G.borderDim)}
            </div>
          );
        })}

        {typing && (
          <div className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:"4px" }}>
            {mono("MANO", "8px", G.dim)}
            <div style={{ padding:"12px 18px", borderRadius:"4px 16px 16px 16px", background:"#181818", border:`1px solid ${G.border}` }}>
              <span className="pulse-dot" style={{ fontFamily:"'Space Mono',monospace", fontSize:"18px", color:G.dim, letterSpacing:"5px" }}>···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </Panel>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeed({ events }) {
  const feedRef = useRef(null);
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, [events]);

  const typeMap = {
    missed:    { icon:"📞", color:G.red  },
    sms:       { icon:"⚡", color:G.gold },
    qualified: { icon:"🧠", color:G.gray },
    booked:    { icon:"📅", color:G.gold },
    revenue:   { icon:"💰", color:G.gold },
  };

  return (
    <Panel style={{ display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px", paddingBottom:"18px", borderBottom:`1px solid ${G.borderDim}` }}>
        <Label>LIVE AI ACTIVITY</Label>
        {events.length > 0 && (
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.green, background:G.greenBg, border:`1px solid ${G.greenBd}`, borderRadius:"20px", padding:"3px 10px" }}>
            {events.length} EVENTS
          </span>
        )}
      </div>

      <div ref={feedRef} style={{ flex:1, minHeight:"320px", maxHeight:"360px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"8px" }}>
        {events.length === 0 && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"12px", padding:"40px 0" }}>
            <div style={{ fontSize:"24px", opacity:0.3 }}>⚡</div>
            {mono("ACTIVITY APPEARS DURING DEMO", "9px", G.borderDim, { letterSpacing:"2px", textAlign:"center" })}
          </div>
        )}
        {events.map((ev, i) => {
          const s = typeMap[ev.type] || { icon:"•", color:G.dim };
          const isGold = ev.type === "revenue" || ev.type === "booked" || ev.type === "sms";
          return (
            <div
              key={i}
              className="fade-up"
              style={{
                display: "flex", gap: "12px", alignItems: "flex-start",
                padding: "11px 14px",
                background: isGold ? "rgba(212,175,55,0.04)" : "#0E0E0E",
                border: `1px solid ${isGold ? G.goldBd : G.borderDim}`,
                borderRadius: "10px",
              }}
            >
              <span style={{ fontSize:"14px", flexShrink:0 }}>{s.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:isGold ? G.gold : G.offwhite, fontWeight:500, lineHeight:1.4 }}>{ev.text}</div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:G.dim, marginTop:"3px", letterSpacing:"0.5px" }}>{ev.ts}</div>
              </div>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:s.color, flexShrink:0, marginTop:"5px", boxShadow:`0 0 6px ${s.color}88` }} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function PipelinePanel({ demoRan }) {
  const [leads, setLeads] = useState(INIT_PIPELINE);

  useEffect(() => {
    if (!demoRan) return;
    const t1 = setTimeout(() => setLeads(p => p.map(l => l.id===1 ? {...l,stage:"contacted"} : l)), 3000);
    const t2 = setTimeout(() => setLeads(p => p.map(l => l.id===1 ? {...l,stage:"qualified"} : l)), 7200);
    const t3 = setTimeout(() => setLeads(p => p.map(l => l.id===1 ? {...l,stage:"booked"}    : l)), 11200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [demoRan]);

  const total = leads.reduce((s, l) => s + l.value, 0);

  return (
    <Panel>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"22px", paddingBottom:"18px", borderBottom:`1px solid ${G.borderDim}` }}>
        <Label>LEAD PIPELINE</Label>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.dim }}>PIPELINE VALUE</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"15px", color:G.gold, fontWeight:700 }}>
            ${total.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="pipeline-scroll">
        <div className="pipeline-inner" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px" }}>
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage.key);
            const highlight  = stage.key === "booked" || stage.key === "closed";
            return (
              <div key={stage.key} className="pipeline-col">
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:stage.color, letterSpacing:"2px", fontWeight:700 }}>{stage.label}</span>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:stage.color, background:`${stage.color}12`, border:`1px solid ${stage.color}30`, borderRadius:"10px", padding:"1px 7px" }}>{stageLeads.length}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px", minHeight:"44px" }}>
                  {stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      className="fade-up"
                      style={{
                        background: "#0C0C0C",
                        border: `1px solid ${highlight ? G.goldBd : G.borderDim}`,
                        borderRadius: "10px", padding: "14px",
                        boxShadow: highlight ? `0 0 14px rgba(212,175,55,0.07)` : "none",
                      }}
                    >
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"6px" }}>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:700, color:G.white }}>{lead.name.split(" ")[0]}</span>
                        <ScoreBadge score={lead.score} />
                      </div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:G.gray, marginBottom:"6px" }}>{lead.service}</div>
                      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"12px", color:highlight ? G.gold : G.dim, fontWeight:highlight ? 700 : 400 }}>
                        ${lead.value.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────
function RevenueChart({ revenue }) {
  const data = [...REVENUE_DATA.slice(0, -1), { month:"Apr", val:revenue }];
  const max  = Math.max(...data.map(d => d.val));

  return (
    <Panel>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"24px", paddingBottom:"18px", borderBottom:`1px solid ${G.borderDim}` }}>
        <div>
          <Label style={{ marginBottom:"10px" }}>RECOVERED REVENUE</Label>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"26px", fontWeight:700, color:G.gold, lineHeight:1 }}>
            ${revenue.toLocaleString()}
          </div>
        </div>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:G.gold, background:G.goldBg, border:`1px solid ${G.goldBd}`, borderRadius:"8px", padding:"7px 14px", letterSpacing:"0.5px" }}>
          +${(revenue - 12600).toLocaleString()} vs last month
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"flex-end", gap:"8px", height:"100px" }}>
        {data.map((d, i) => {
          const pct    = Math.max((d.val / max) * 100, 4);
          const isLast = i === data.length - 1;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", height:"100%" }}>
              <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                <div style={{
                  width: "100%",
                  height: `${pct}%`,
                  background: isLast
                    ? `linear-gradient(180deg, ${G.gold} 0%, ${G.goldDim} 100%)`
                    : `linear-gradient(180deg, #2e2e2e 0%, #1a1a1a 100%)`,
                  borderRadius: "4px 4px 0 0",
                  boxShadow: isLast ? `0 0 24px rgba(212,175,55,0.40)` : "none",
                  transition: "height 0.6s ease",
                }} />
              </div>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:isLast ? G.gold : G.dim, letterSpacing:"0.5px" }}>{d.month}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── Automation Status ────────────────────────────────────────────────────────
function AutomationPanel() {
  const [active, setActive] = useState(AUTOMATIONS.map(() => true));

  return (
    <Panel>
      <div style={{ marginBottom:"22px", paddingBottom:"18px", borderBottom:`1px solid ${G.borderDim}` }}>
        <Label>AUTOMATION STATUS</Label>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
        {AUTOMATIONS.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px",
              background: "#0C0C0C",
              border: `1px solid ${active[i] ? G.greenBd : G.borderDim}`,
              borderRadius: "12px",
              transition: "border-color 0.3s",
              gap: "12px",
            }}
          >
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:600, color:G.white, marginBottom:"3px" }}>{a.label}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.dim, letterSpacing:"0.3px" }}>{a.desc}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:active[i] ? G.green : G.dim, letterSpacing:"1px" }}>
                {active[i] ? "ACTIVE" : "OFF"}
              </span>
              <button
                onClick={() => setActive(p => p.map((v,j) => j===i ? !v : v))}
                style={{ width:"40px", height:"22px", borderRadius:"11px", border:"none", cursor:"pointer", background:active[i] ? G.green : "#2a2a2a", position:"relative", transition:"background 0.3s", flexShrink:0 }}
              >
                <div style={{ position:"absolute", top:"3px", left:active[i]?"21px":"3px", width:"16px", height:"16px", borderRadius:"50%", background:G.white, transition:"left 0.3s" }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
function QuickActions({ onRunDemo }) {
  const CAL = "https://calendly.com/monkee-bizznus/30min";
  const actions = [
    { label:"Run Demo",           gold:true,  action:onRunDemo                                },
    { label:"Add Lead",           gold:false, action:() => window.open("/LeadForm","_blank")  },
    { label:"Conversations",      gold:false, action:() => window.open("/ChatCenter","_blank")},
    { label:"Edit Scripts",       gold:false, action:() => window.open("/Settings","_blank")  },
    { label:"Book Demo Call",     gold:false, action:() => window.open(CAL,"_blank")          },
  ];
  return (
    <div className="actions-wrap" style={{ display:"flex", gap:"10px", marginBottom:"32px", flexWrap:"wrap" }}>
      {actions.map((a, i) => (
        <button key={i} onClick={a.action} className={`action-btn${a.gold?" primary primary-action":""}`}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ManoCommandCenter() {
  const [revenue, setRevenue] = useState(14850);
  const [jobs,    setJobs]    = useState(18);
  const [demoRan, setDemoRan] = useState(0);
  const [events,  setEvents]  = useState([]);
  const runRef = useRef(0);

  const addEvent = (type, text) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
    setEvents(prev => [{ type, text, ts }, ...prev].slice(0, 20));
  };

  function handleDemoComplete() {
    setRevenue(r => r + 850);
    setJobs(j => j + 1);
    addEvent("revenue", "$850 revenue recovered — Marcus Webb");
  }

  function handleRunDemo() {
    const run = ++runRef.current;
    setDemoRan(run);
    setTimeout(() => addEvent("missed",    "Missed call captured — Marcus Webb (+1 623-555-0147)"), 200);
    setTimeout(() => addEvent("sms",       "Instant SMS fired in 2.3 seconds"), 2000);
    setTimeout(() => addEvent("qualified", "Lead qualified — Urgency: HIGH · Score: HOT"), 7500);
    setTimeout(() => addEvent("booked",    "Appointment booked — Tech arriving 2–3 PM"), 11200);
    setTimeout(() => addEvent("revenue",   "$850 added to recovered revenue pipeline"), 12000);
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:G.bg, color:G.white, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      <ManoSidebar current="/CommandCenter" />

      <main className="main-pad" style={{ flex:1, padding:"32px 32px 64px", overflowY:"auto", minWidth:0 }}>

        {/* ── Page Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"32px", gap:"16px" }}>
          <div>
            <Label style={{ marginBottom:"10px" }}>REVENUE RECOVERY SYSTEM</Label>
            <h1 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"clamp(22px,2.5vw,30px)", fontWeight:800, color:G.white, margin:"0 0 6px", lineHeight:1.15, letterSpacing:"-0.5px" }}>
              MANO Command Center
            </h1>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.dim, letterSpacing:"1.5px" }}>
              Powered by Manologics · Monkee Bizz AI
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0, paddingTop:"4px" }}>
            <div className="pulse-dot" style={{ width:"8px", height:"8px", borderRadius:"50%", background:G.green, boxShadow:`0 0 10px ${G.green}` }} />
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:G.green, letterSpacing:"1px" }}>SYSTEM LIVE</span>
          </div>
        </div>

        {/* ── KPIs */}
        <KpiBar revenue={revenue} jobs={jobs} />

        {/* ── Quick Actions */}
        <QuickActions onRunDemo={handleRunDemo} />

        {/* ── DEMO ENGINE — focal point */}
        <LiveDemoEngine onDemoComplete={handleDemoComplete} />

        {/* ── Conversation + Activity */}
        <div className="grid-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"20px" }}>
          <ConversationPanel demoRan={demoRan} />
          <ActivityFeed events={events} />
        </div>

        {/* ── Pipeline */}
        <div style={{ marginBottom:"20px" }}>
          <PipelinePanel demoRan={demoRan} />
        </div>

        {/* ── Revenue + Automations */}
        <div className="grid-2col grid-rev-auto" style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"16px" }}>
          <RevenueChart revenue={revenue} />
          <AutomationPanel />
        </div>

      </main>
    </div>
  );
}