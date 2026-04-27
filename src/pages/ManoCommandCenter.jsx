import React, { useState, useEffect, useRef } from "react";
import ManoSidebar from "@/components/mano/ManoSidebar";

// ── Design tokens ─────────────────────────────────────────────────────────────
const G = {
  gold:    "#D4AF37",
  goldDim: "#A8891F",
  goldBg:  "rgba(212,175,55,0.08)",
  goldBd:  "rgba(212,175,55,0.20)",
  green:   "#22C55E",
  greenBg: "rgba(34,197,94,0.08)",
  greenBd: "rgba(34,197,94,0.18)",
  white:   "#FFFFFF",
  gray:    "#9A9A9A",
  muted:   "#555555",
  panel:   "#111111",
  panel2:  "#161616",
  border:  "#1E1E1E",
  bg:      "#0A0A0A",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  @keyframes goldGlow { 0%,100%{box-shadow:0 0 20px rgba(212,175,55,0.25)} 50%{box-shadow:0 0 40px rgba(212,175,55,0.45)} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes countUp { from{opacity:0} to{opacity:1} }
  .gold-glow { animation: goldGlow 3s ease-in-out infinite; }
  .pulse-dot { animation: pulse 1.5s ease-in-out infinite; }
  .slide-in  { animation: slideIn 0.35s ease forwards; }
`;

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_STEPS = [
  { id:1, icon:"📞", label:"Missed call detected",        detail:"From: +1 (623) 555-0147 — Marcus Webb",        delay:0    },
  { id:2, icon:"⚡", label:"Instant SMS dispatched",      detail:"Sent in 2.3 seconds via MANO SMS Engine",      delay:1800 },
  { id:3, icon:"💬", label:"Customer reply received",     detail:'"Yeah it\'s blowing warm air. It\'s 108° out"', delay:3800 },
  { id:4, icon:"🧠", label:"AI qualification question",   detail:"MANO: \"Is the fan running or completely off?\"", delay:5200 },
  { id:5, icon:"💬", label:"Customer responds",           detail:'"Fan is running but just warm air"',            delay:7000 },
  { id:6, icon:"📅", label:"AI confirms appointment",     detail:"MANO: \"Booked. Tech arriving 2–3 PM today.\"", delay:8800 },
  { id:7, icon:"✅", label:"Job marked BOOKED",           detail:"Lead status → BOOKED · Score: HOT",             delay:10400 },
  { id:8, icon:"💰", label:"Revenue added to pipeline",   detail:"+$850 recovered · Pipeline updated",            delay:11800 },
];

const SMS_CONV = [
  { from:"system", text:"Missed call detected from Marcus Webb", ts:"2:04 PM" },
  { from:"mano",   text:"Hi Marcus, this is Mano from Valley Cool HVAC 👋 We got your message — your AC isn't cooling. Can you confirm?", ts:"2:04 PM" },
  { from:"lead",   text:"Yeah it's blowing warm air. It's 108° outside right now, this is really bad", ts:"2:05 PM" },
  { from:"mano",   text:"That's urgent — I'm on it. Is the fan running, or is the whole system completely off?", ts:"2:05 PM" },
  { from:"lead",   text:"Fan is running but just warm air coming out", ts:"2:06 PM" },
  { from:"mano",   text:"Got it. Sounds like a refrigerant or compressor issue. Our tech can be there today. Does 2–5 PM work?", ts:"2:06 PM" },
  { from:"lead",   text:"Yes, 2pm is perfect", ts:"2:07 PM" },
  { from:"mano",   text:"✅ Booked. Tech arriving 2–3 PM today. You'll get a text 30 min before arrival.", ts:"2:07 PM", booked:true },
];

const INIT_PIPELINE = [
  { id:1, name:"Marcus Webb",    service:"AC Repair",          value:850,  stage:"missed",    score:"HOT"  },
  { id:2, name:"Sandra Ortiz",   service:"Heater Replacement", value:2200, stage:"contacted", score:"HOT"  },
  { id:3, name:"Derek Lane",     service:"Thermostat Install",  value:320,  stage:"qualified", score:"WARM" },
  { id:4, name:"Tonya Simms",    service:"Annual Tune-Up",      value:189,  stage:"booked",    score:"WARM" },
  { id:5, name:"James Pruitt",   service:"Outdoor Unit Repair", value:1100, stage:"missed",    score:"HOT"  },
  { id:6, name:"Lena Figueroa",  service:"Filter + Checkup",    value:145,  stage:"closed",    score:"COLD" },
];

const PIPELINE_STAGES = [
  { key:"missed",    label:"MISSED",    color:"#555555" },
  { key:"contacted", label:"CONTACTED", color:"#9A9A9A" },
  { key:"qualified", label:"QUALIFIED", color:G.gold    },
  { key:"booked",    label:"BOOKED",    color:G.gold    },
  { key:"closed",    label:"CLOSED",    color:G.green   },
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
  { label:"Missed Call SMS",       desc:"Fires within 3 sec of missed call"   },
  { label:"AI Voice Follow-Up",    desc:"Calls leads that don't reply"         },
  { label:"Lead Qualification",    desc:"Scores every inbound automatically"  },
  { label:"Calendar Booking",      desc:"Books via Calendly integration"       },
  { label:"Follow-Up Sequences",   desc:"3-touch nurture over 7 days"         },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function mono(text, size="10px", color=G.muted, extra={}) {
  return <span style={{ fontFamily:"'Space Mono',monospace", fontSize:size, color, letterSpacing:"1px", ...extra }}>{text}</span>;
}

function SectionHeader({ label, badge }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"18px" }}>
      {mono(label, "9px", G.gold, { letterSpacing:"3px", fontWeight:"700" })}
      {badge && <span style={{ background:G.goldBg, border:`1px solid ${G.goldBd}`, borderRadius:"20px", padding:"2px 10px", fontSize:"9px", fontFamily:"'Space Mono',monospace", color:G.gold }}>{badge}</span>}
    </div>
  );
}

function Panel({ children, style={}, glow=false }) {
  return (
    <div className={glow?"gold-glow":""} style={{ background:G.panel, border:`1px solid ${G.border}`, borderRadius:"14px", padding:"22px", ...style }}>
      {children}
    </div>
  );
}

function ScoreBadge({ score }) {
  const map = { HOT:["#EF4444","rgba(239,68,68,0.12)"], WARM:[G.gold,G.goldBg], COLD:[G.muted,"#1a1a1a"], PENDING:[G.muted,"#111"] };
  const [c, bg] = map[score] || map.COLD;
  return <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", fontWeight:"700", color:c, background:bg, border:`1px solid ${c}44`, padding:"2px 7px", borderRadius:"4px", letterSpacing:"1px" }}>{score}</span>;
}

// ── KPI Bar ───────────────────────────────────────────────────────────────────
function KpiBar({ revenue, jobs }) {
  const kpis = [
    { label:"Revenue Recovered",    value:`$${revenue.toLocaleString()}`, trend:"+18% this week", gold:true  },
    { label:"Jobs Booked",          value:String(jobs),                   trend:`+${jobs-15} this week`, gold:false },
    { label:"Missed Calls Captured",value:"47",                           trend:"This month",     gold:false },
    { label:"Leads Qualified",      value:"62",                           trend:"This month",     gold:false },
    { label:"Avg Response Time",    value:"4.8s",                         trend:"AI-powered",     gold:false },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"12px", marginBottom:"24px" }}>
      {kpis.map((k,i) => (
        <div key={i} className={k.gold?"gold-glow":""} style={{ background:k.gold?`linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.04))`:"#111", border:`1px solid ${k.gold?G.goldBd:G.border}`, borderRadius:"14px", padding:"20px 18px" }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", color:G.muted, marginBottom:"8px" }}>{k.label}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:k.gold?"28px":"22px", fontWeight:"700", color:k.gold?G.gold:G.white, lineHeight:1.1, marginBottom:"6px" }}>{k.value}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:k.gold?G.goldDim:G.muted, letterSpacing:"0.5px" }}>{k.trend}</div>
        </div>
      ))}
    </div>
  );
}

// ── Live Demo Engine ──────────────────────────────────────────────────────────
function LiveDemoEngine({ onDemoComplete }) {
  const [running, setRunning] = useState(false);
  const [steps, setSteps]     = useState([]);
  const [done, setDone]       = useState(false);
  const timersRef = useRef([]);

  function runDemo() {
    if (running) return;
    setRunning(true); setSteps([]); setDone(false);
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    DEMO_STEPS.forEach(step => {
      const t = setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (step.id === DEMO_STEPS.length) {
          setTimeout(() => { setRunning(false); setDone(true); onDemoComplete(); }, 600);
        }
      }, step.delay);
      timersRef.current.push(t);
    });
  }

  function reset() { setSteps([]); setDone(false); setRunning(false); timersRef.current.forEach(t => clearTimeout(t)); }

  return (
    <Panel style={{ marginBottom:"24px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
        <div>
          <SectionHeader label="LIVE REVENUE RECOVERY DEMO" badge={running?"DEMO MODE ACTIVE":done?"DEMO COMPLETE":null} />
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:G.muted, marginTop:"-10px" }}>
            Watch MANO capture a missed call and convert it to a booked job in real time.
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", flexShrink:0 }}>
          {done && <button onClick={reset} style={{ padding:"10px 18px", borderRadius:"8px", background:"transparent", border:`1px solid ${G.border}`, color:G.muted, fontFamily:"'Space Mono',monospace", fontSize:"10px", cursor:"pointer" }}>RESET</button>}
          <button onClick={runDemo} disabled={running}
            style={{ padding:"12px 24px", borderRadius:"8px", background:running?G.panel2:`linear-gradient(135deg,${G.gold},${G.goldDim})`, color:running?G.muted:"#000", border:"none", fontFamily:"'Space Mono',monospace", fontSize:"11px", fontWeight:"700", cursor:running?"not-allowed":"pointer", letterSpacing:"1px", boxShadow:!running?`0 0 24px rgba(212,175,55,0.3)`:"none", transition:"all 0.2s" }}>
            {running?"RUNNING…":done?"▶ RUN AGAIN":"▶ RUN DEMO"}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0" }}>
        {DEMO_STEPS.map((step, i) => {
          const active = steps.find(s => s.id === step.id);
          const isRevenue = step.id === 8;
          return (
            <div key={step.id} className={active?"slide-in":""} style={{ display:"flex", gap:"14px", alignItems:"flex-start", opacity:active?1:0.18, transition:"opacity 0.4s" }}>
              {/* Line */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, width:"36px" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:active?(isRevenue?G.goldBg:G.greenBg):"#111", border:`1px solid ${active?(isRevenue?G.goldBd:G.greenBd):G.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", transition:"all 0.3s", boxShadow:active&&isRevenue?`0 0 16px rgba(212,175,55,0.3)`:active?`0 0 12px rgba(34,197,94,0.2)`:"none" }}>{step.icon}</div>
                {i < DEMO_STEPS.length-1 && <div style={{ width:"1px", height:"28px", background:active?G.border:"#1a1a1a" }} />}
              </div>
              {/* Content */}
              <div style={{ paddingTop:"6px", paddingBottom:"16px", flex:1 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", color:active?(isRevenue?G.gold:G.white):G.muted, marginBottom:"2px" }}>{step.label}</div>
                {active && <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:isRevenue?G.goldDim:G.muted, letterSpacing:"0.5px" }}>{step.detail}</div>}
              </div>
              {/* Timestamp */}
              {active && <div style={{ paddingTop:"7px", flexShrink:0 }}>{mono(`STEP ${step.id}`, "8px", G.muted, { letterSpacing:"1px" })}</div>}
            </div>
          );
        })}
      </div>

      {done && (
        <div style={{ marginTop:"14px", background:`linear-gradient(135deg,${G.goldBg},transparent)`, border:`1px solid ${G.goldBd}`, borderRadius:"10px", padding:"14px 18px", display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"20px" }}>💰</span>
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"700", color:G.gold }}>Lead qualified and booked in under 3 minutes</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.goldDim, marginTop:"3px" }}>$850 RECOVERED · ZERO HUMAN INVOLVEMENT · 4.8 SEC RESPONSE</div>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ── Conversation Panel ────────────────────────────────────────────────────────
function ConversationPanel({ demoRan }) {
  const [visible, setVisible] = useState([]);
  const [typing, setTyping]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [visible, typing]);

  useEffect(() => {
    if (!demoRan) return;
    setVisible([]); setTyping(false);
    let i = 0;
    function next() {
      if (i >= SMS_CONV.length) return;
      const msg = SMS_CONV[i];
      const isMano = msg.from === "mano";
      if (isMano && i > 0) {
        setTyping(true);
        setTimeout(() => { setTyping(false); setVisible(v => [...v, msg]); i++; next(); }, 1200);
      } else {
        setVisible(v => [...v, msg]);
        i++;
        setTimeout(next, msg.from === "system" ? 400 : 1800);
      }
    }
    setTimeout(next, 600);
  }, [demoRan]);

  return (
    <Panel style={{ display:"flex", flexDirection:"column", height:"440px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px", paddingBottom:"14px", borderBottom:`1px solid ${G.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:`linear-gradient(135deg,${G.gold},${G.goldDim})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", boxShadow:`0 0 14px rgba(212,175,55,0.3)` }}>🤖</div>
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"700", color:G.white }}>MANO AI Agent</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.green }}>● Online · 4.8s avg response</div>
          </div>
        </div>
        {visible.some(m => m.booked) && (
          <span style={{ background:G.goldBg, border:`1px solid ${G.goldBd}`, borderRadius:"20px", padding:"4px 12px", fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.gold, fontWeight:"700" }}>✓ BOOKED</span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:"12px", paddingRight:"4px" }}>
        {visible.length === 0 && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"32px", marginBottom:"10px" }}>💬</div>
              {mono("RUN DEMO TO SEE LIVE CONVERSATION", "9px", G.border, { letterSpacing:"2px" })}
            </div>
          </div>
        )}

        {visible.map((msg, i) => {
          if (msg.from === "system") {
            return (
              <div key={i} style={{ textAlign:"center" }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.muted, background:"#161616", border:`1px solid ${G.border}`, borderRadius:"20px", padding:"4px 12px" }}>{msg.text}</span>
              </div>
            );
          }
          const isMano = msg.from === "mano";
          return (
            <div key={i} className="slide-in" style={{ display:"flex", flexDirection:"column", alignItems:isMano?"flex-start":"flex-end", gap:"3px" }}>
              {mono(isMano?"MANO":"MARCUS", "8px", G.muted)}
              <div style={{ maxWidth:"80%", padding:"11px 14px", borderRadius:isMano?"4px 14px 14px 14px":"14px 4px 14px 14px", background:isMano?"#181818":G.goldBg, border:isMano?`1px solid ${G.border}`:`1px solid ${G.goldBd}`, fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:isMano?G.white:G.gold, lineHeight:1.65 }}>
                {msg.text}
                {msg.booked && <div style={{ marginTop:"6px", fontFamily:"'Space Mono',monospace", fontSize:"8px", color:G.gold, letterSpacing:"1px" }}>● JOB BOOKED · $850 RECOVERED</div>}
              </div>
              {mono(msg.ts, "8px", G.border)}
            </div>
          );
        })}

        {typing && (
          <div className="slide-in" style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:"3px" }}>
            {mono("MANO", "8px", G.muted)}
            <div style={{ padding:"11px 18px", borderRadius:"4px 14px 14px 14px", background:"#181818", border:`1px solid ${G.border}` }}>
              <span className="pulse-dot" style={{ fontFamily:"'Space Mono',monospace", fontSize:"16px", color:G.muted, letterSpacing:"4px" }}>···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </Panel>
  );
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
function PipelinePanel({ demoRan }) {
  const [leads, setLeads] = useState(INIT_PIPELINE);

  useEffect(() => {
    if (!demoRan) return;
    const t1 = setTimeout(() => {
      setLeads(prev => prev.map(l => l.id === 1 ? { ...l, stage:"contacted" } : l));
    }, 3000);
    const t2 = setTimeout(() => {
      setLeads(prev => prev.map(l => l.id === 1 ? { ...l, stage:"qualified" } : l));
    }, 7000);
    const t3 = setTimeout(() => {
      setLeads(prev => prev.map(l => l.id === 1 ? { ...l, stage:"booked" } : l));
    }, 11000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [demoRan]);

  return (
    <Panel>
      <SectionHeader label="LEAD PIPELINE" badge="LIVE" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px" }}>
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.key);
          const isHighlight = stage.key === "booked" || stage.key === "closed";
          return (
            <div key={stage.key}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:stage.color, letterSpacing:"2px", fontWeight:"700" }}>{stage.label}</span>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:stage.color, background:`${stage.color}14`, border:`1px solid ${stage.color}33`, borderRadius:"10px", padding:"1px 7px" }}>{stageLeads.length}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px", minHeight:"50px" }}>
                {stageLeads.map(lead => (
                  <div key={lead.id} className="slide-in" style={{ background:"#0E0E0E", border:`1px solid ${isHighlight?G.goldBd:G.border}`, borderRadius:"10px", padding:"12px 11px", boxShadow:isHighlight?`0 0 12px rgba(212,175,55,0.08)`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"5px" }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", fontWeight:"600", color:G.white }}>{lead.name.split(" ")[0]}</span>
                      <ScoreBadge score={lead.score} />
                    </div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"10px", color:G.muted, marginBottom:"5px" }}>{lead.service}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:isHighlight?G.gold:G.muted, fontWeight:isHighlight?"700":"400" }}>${lead.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:"16px", paddingTop:"14px", borderTop:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.muted }}>PIPELINE VALUE</div>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"14px", color:G.gold, fontWeight:"700" }}>
          ${leads.reduce((s, l) => s + l.value, 0).toLocaleString()}
        </div>
      </div>
    </Panel>
  );
}

// ── Revenue Chart ─────────────────────────────────────────────────────────────
function RevenueChart({ revenue }) {
  const max = Math.max(...REVENUE_DATA.map(d => d.val));
  const data = [...REVENUE_DATA.slice(0, -1), { month:"Apr", val:revenue }];

  return (
    <Panel>
      <SectionHeader label="RECOVERED REVENUE OVER TIME" />
      <div style={{ display:"flex", alignItems:"flex-end", gap:"8px", height:"120px", marginBottom:"12px" }}>
        {data.map((d, i) => {
          const pct = (d.val / max) * 100;
          const isLast = i === data.length - 1;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", height:"100%" }}>
              <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                <div
                  title={`$${d.val.toLocaleString()}`}
                  style={{
                    width:"100%",
                    height:`${pct}%`,
                    background:isLast?`linear-gradient(180deg,${G.gold},${G.goldDim})`:`linear-gradient(180deg,#2a2a2a,#1a1a1a)`,
                    borderRadius:"4px 4px 0 0",
                    boxShadow:isLast?`0 0 20px rgba(212,175,55,0.35)`:"none",
                    transition:"height 0.6s ease",
                    position:"relative",
                  }}
                />
              </div>
              {mono(d.month, "9px", isLast?G.gold:G.muted)}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:G.gold, background:G.goldBg, border:`1px solid ${G.goldBd}`, borderRadius:"8px", padding:"4px 12px" }}>+${(revenue - 12600).toLocaleString()} vs last month</div>
      </div>
    </Panel>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
function ActivityFeed({ events }) {
  const feedRef = useRef(null);
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, [events]);

  const typeStyle = {
    missed:    { icon:"📞", color:"#EF4444" },
    sms:       { icon:"⚡", color:G.gold    },
    qualified: { icon:"🧠", color:G.muted   },
    booked:    { icon:"📅", color:G.gold    },
    revenue:   { icon:"💰", color:G.gold    },
  };

  return (
    <Panel style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <SectionHeader label="LIVE AI ACTIVITY" badge={`${events.length} EVENTS`} />
      <div ref={feedRef} style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:"8px" }}>
        {events.length === 0 && (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            {mono("RUN DEMO TO SEE ACTIVITY", "9px", G.border, { letterSpacing:"2px" })}
          </div>
        )}
        {events.map((ev, i) => {
          const s = typeStyle[ev.type] || { icon:"•", color:G.muted };
          const isRevenue = ev.type === "revenue" || ev.type === "booked";
          return (
            <div key={i} className="slide-in" style={{ display:"flex", gap:"10px", alignItems:"flex-start", padding:"9px 12px", background:"#0E0E0E", border:`1px solid ${isRevenue?G.goldBd:G.border}`, borderRadius:"8px" }}>
              <span style={{ fontSize:"13px", flexShrink:0, marginTop:"1px" }}>{s.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:isRevenue?G.gold:G.white, fontWeight:"500", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ev.text}</div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:G.muted, marginTop:"2px" }}>{ev.ts}</div>
              </div>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:s.color, flexShrink:0, marginTop:"5px", boxShadow:`0 0 6px ${s.color}77` }} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Automation Toggles ────────────────────────────────────────────────────────
function AutomationPanel() {
  const [active, setActive] = useState(AUTOMATIONS.map(() => true));

  return (
    <Panel>
      <SectionHeader label="AUTOMATION STATUS" />
      <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
        {AUTOMATIONS.map((a, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#0E0E0E", border:`1px solid ${active[i]?G.greenBd:G.border}`, borderRadius:"10px", transition:"border-color 0.3s" }}>
            <div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", color:G.white }}>{a.label}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.muted, marginTop:"2px" }}>{a.desc}</div>
            </div>
            <button
              onClick={() => setActive(prev => prev.map((v, j) => j === i ? !v : v))}
              style={{ width:"42px", height:"22px", borderRadius:"11px", border:"none", cursor:"pointer", background:active[i]?G.green:"#2a2a2a", position:"relative", transition:"background 0.3s", flexShrink:0 }}
            >
              <div style={{ position:"absolute", top:"3px", left:active[i]?"22px":"3px", width:"16px", height:"16px", borderRadius:"50%", background:G.white, transition:"left 0.3s" }} />
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions({ onRunDemo }) {
  const CALENDLY = "https://calendly.com/monkee-bizznus/30min";
  const actions = [
    { label:"Run Demo",          icon:"▶",  gold:true,  action:onRunDemo                                    },
    { label:"Add Lead",          icon:"＋",  gold:false, action:() => window.open("/LeadForm","_blank")       },
    { label:"View Conversations",icon:"💬", gold:false, action:() => window.open("/ChatCenter","_blank")     },
    { label:"Edit Scripts",      icon:"✏️", gold:false, action:() => window.open("/Settings","_blank")       },
    { label:"Book Demo Call",    icon:"📅", gold:false, action:() => window.open(CALENDLY,"_blank")          },
  ];

  return (
    <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"24px" }}>
      {actions.map((a, i) => (
        <button key={i} onClick={a.action}
          style={{ display:"flex", alignItems:"center", gap:"7px", padding:"10px 18px", borderRadius:"9px", border:`1px solid ${a.gold?G.goldBd:G.border}`, background:a.gold?`linear-gradient(135deg,${G.gold},${G.goldDim})`:"#111", color:a.gold?"#000":G.gray, fontFamily:"'Space Mono',monospace", fontSize:"10px", fontWeight:"700", cursor:"pointer", letterSpacing:"0.5px", transition:"all 0.2s", boxShadow:a.gold?`0 0 20px rgba(212,175,55,0.25)`:"none" }}>
          <span style={{ fontSize:"12px" }}>{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ManoCommandCenter() {
  const [revenue, setRevenue] = useState(14850);
  const [jobs,    setJobs]    = useState(18);
  const [demoRan, setDemoRan] = useState(0); // increment = new demo run
  const [events,  setEvents]  = useState([]);

  const demoRunRef = useRef(0);

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
    const run = demoRunRef.current + 1;
    demoRunRef.current = run;
    setDemoRan(run);

    // Staged activity events
    setTimeout(() => addEvent("missed",    "Missed call captured — Marcus Webb (+1 623-555-0147)"), 200);
    setTimeout(() => addEvent("sms",       "Instant SMS fired in 2.3 seconds"), 2000);
    setTimeout(() => addEvent("qualified", "Lead qualified — Urgency: HIGH · Score: HOT"), 7500);
    setTimeout(() => addEvent("booked",    "Appointment booked — Tech arriving 2–3 PM"), 11200);
    setTimeout(() => addEvent("revenue",   "$850 added to recovered revenue pipeline"), 12000);
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:G.bg, color:G.white, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{css}</style>
      <ManoSidebar current="/CommandCenter" />

      <main style={{ flex:1, padding:"28px 28px 48px", overflowY:"auto", minWidth:0 }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"24px" }}>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.gold, letterSpacing:"3px", marginBottom:"6px" }}>REVENUE RECOVERY SYSTEM</div>
            <h1 style={{ fontSize:"24px", fontWeight:"700", color:G.white, margin:"0 0 4px", letterSpacing:"-0.3px" }}>MANO Command Center</h1>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.muted }}>Powered by Manologics · Monkee Bizz AI</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div className="pulse-dot" style={{ width:"8px", height:"8px", borderRadius:"50%", background:G.green, boxShadow:`0 0 8px ${G.green}` }} />
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:G.green }}>SYSTEM LIVE</div>
          </div>
        </div>

        {/* KPIs */}
        <KpiBar revenue={revenue} jobs={jobs} />

        {/* Quick Actions */}
        <QuickActions onRunDemo={handleRunDemo} />

        {/* Demo Engine — full width */}
        <LiveDemoEngine onDemoComplete={handleDemoComplete} />

        {/* Conversation + Activity — side by side */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"24px" }}>
          <ConversationPanel demoRan={demoRan} />
          <ActivityFeed events={events} />
        </div>

        {/* Pipeline — full width */}
        <div style={{ marginBottom:"24px" }}>
          <PipelinePanel demoRan={demoRan} />
        </div>

        {/* Revenue chart + Automation side by side */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"16px" }}>
          <RevenueChart revenue={revenue} />
          <AutomationPanel />
        </div>
      </main>
    </div>
  );
}