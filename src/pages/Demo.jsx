import React, { useState, useEffect, useRef } from "react";

// ─── FONT IMPORT ──────────────────────────────────────────────────────────────
const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #080808; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #0a0a0a; }
    ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
  `}</style>
);

// ─── COLOR SYSTEM ─────────────────────────────────────────────────────────────
// GOLD   = #f5c518  → booked jobs, CTAs, revenue, wins
// RED    = #e03030  → missed calls, pain, loss, competitors
// WHITE  = #ffffff  → main headlines
// BLACK  = #080808  → base background
// GREEN  = #00ff88  → AI/system status accents only (small)

const GOLD  = "#f5c518";
const RED   = "#e03030";
const WHITE = "#ffffff";
const GREEN = "#00ff88";

const CALENDLY_URL = "https://calendly.com/monkee-bizznus/30min";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const SMS_SCRIPT = [
  { from: "ai",   text: "Hi Marcus, this is Mano from Valley Cool HVAC 👋 We got your message — your AC isn't cooling. Can you confirm?" },
  { from: "lead", text: "Yeah it's blowing warm air. It's 108° outside right now, this is really bad" },
  { from: "ai",   text: "That's urgent — I'm on it. Is the fan running, or is the whole system completely off?" },
  { from: "lead", text: "Fan is running but just warm air coming out" },
  { from: "ai",   text: "Got it. Sounds like a refrigerant or compressor issue. Our tech can be there today. Does 2–5 PM work?" },
  { from: "lead", text: "Yes, 2pm is perfect" },
  { from: "ai",   text: "✅ Booked. Tech arriving 2–3 PM today. You'll get a text 30 min before arrival. Anything else?" },
  { from: "lead", text: "No that's great, thank you so much!" },
  { from: "ai",   text: "You're all set Marcus 🙌 We'll take care of you. Stay cool." },
];

const MOCK_LEADS = [
  { id: 1, name: "Marcus Webb",    issue: "AC not cooling — 108° outside",   status: "New",       score: "HOT",  time: "2 min ago" },
  { id: 2, name: "Sandra Ortiz",  issue: "No heat — system completely dead", status: "Contacted", score: "HOT",  time: "11 min ago" },
  { id: 3, name: "Derek Lane",    issue: "Thermostat not responding",        status: "Qualified", score: "WARM", time: "28 min ago" },
  { id: 4, name: "Tonya Simms",   issue: "Annual tune-up",                   status: "Booked",    score: "WARM", time: "1 hr ago" },
  { id: 5, name: "James Pruitt",  issue: "Loud banging — outdoor unit",      status: "New",       score: "HOT",  time: "47 min ago" },
  { id: 6, name: "Lena Figueroa", issue: "Filter replacement + checkup",     status: "Booked",    score: "COLD", time: "2 hrs ago" },
];

const ROI_ITEMS = [
  { label: "Missed Calls / Month",     before: "~40",     after: "0",        win: true  },
  { label: "Avg Response Time",        before: "4–6 hrs", after: "< 90 sec", win: true  },
  { label: "Leads Auto-Qualified",     before: "Manual",  after: "100%",     win: true  },
  { label: "Booking Rate",             before: "35%",     after: "72%",      win: true  },
  { label: "Est. Monthly Revenue",     before: "$18K",    after: "$31K",     win: true  },
  { label: "Staff Hours Saved / Week", before: "0 hrs",   after: "22 hrs",   win: true  },
];

const QUAL_STEPS = [
  { icon: "📞", label: "Call / Text Received",  desc: "Mano picks up instantly — no hold music, no voicemail.",        color: "#aaa"  },
  { icon: "🔍", label: "Issue Identified",      desc: "Mano asks the right questions and identifies urgency level.",   color: "#aaa"  },
  { icon: "🔥", label: "Lead Scored HOT",       desc: "Same-day urgency + service need = HOT. Escalated immediately.", color: RED     },
  { icon: "📅", label: "Job Booked",            desc: "Tech dispatched. Customer confirmed. No human needed.",         color: GOLD    },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const map = {
    HOT:  [RED,   "#e0303015"],
    WARM: [GOLD,  "#f5c51815"],
    COLD: ["#555","#55555515"],
  };
  const [c, bg] = map[score] || map.COLD;
  return (
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:"9px", fontWeight:"700", color:c, background:bg, border:`1px solid ${c}44`, padding:"2px 7px", borderRadius:"4px", letterSpacing:"1px" }}>
      {score}
    </span>
  );
}

// ─── PRE-QUAL MODAL ───────────────────────────────────────────────────────────
function PreQualModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState("");
  const [vol, setVol] = useState("");
  const bizOpts = ["HVAC Contractor","HVAC Dealer / Distributor","HVAC Service Company","Other Home Services"];
  const volOpts = ["Under 50 calls/mo","50–150 calls/mo","150–300 calls/mo","300+ calls/mo"];

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px" }}>
      <div style={{ background:"#0f0f0f",border:"1px solid #1e1e1e",borderRadius:"16px",padding:"36px 32px",maxWidth:"420px",width:"100%",position:"relative" }}>
        <div style={{ display:"flex",gap:"8px",marginBottom:"28px" }}>
          {[1,2].map(s=><div key={s} style={{ flex:1,height:"3px",borderRadius:"2px",background:step>=s?GOLD:"#1c1c1c",transition:"background 0.3s" }}/>)}
        </div>
        {step===1&&<>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:GOLD,letterSpacing:"3px",marginBottom:"8px" }}>STEP 1 OF 2</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"28px",color:WHITE,margin:"0 0 6px",letterSpacing:"1px" }}>What describes your business?</h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:"#555",margin:"0 0 22px" }}>We'll tailor the demo to your operation.</p>
          <div style={{ display:"flex",flexDirection:"column",gap:"8px",marginBottom:"24px" }}>
            {bizOpts.map(o=><button key={o} onClick={()=>setBiz(o)} style={{ padding:"12px 16px",borderRadius:"8px",textAlign:"left",fontFamily:"'DM Sans', sans-serif",fontSize:"13px",fontWeight:"500",cursor:"pointer",transition:"all 0.2s",background:biz===o?`${GOLD}14`:"#141414",border:biz===o?`1px solid ${GOLD}`:"1px solid #222",color:biz===o?GOLD:"#777" }}>{o}</button>)}
          </div>
          <button onClick={()=>biz&&setStep(2)} style={{ width:"100%",padding:"14px",borderRadius:"8px",fontFamily:"'Space Mono', monospace",fontSize:"12px",fontWeight:"700",border:"none",cursor:biz?"pointer":"not-allowed",background:biz?GOLD:"#1a1a1a",color:biz?"#000":"#333",letterSpacing:"1px" }}>NEXT →</button>
        </>}
        {step===2&&<>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:GOLD,letterSpacing:"3px",marginBottom:"8px" }}>STEP 2 OF 2</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"28px",color:WHITE,margin:"0 0 6px",letterSpacing:"1px" }}>Monthly inbound call volume?</h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:"#555",margin:"0 0 22px" }}>We'll show you exactly how much revenue you're leaving on the table.</p>
          <div style={{ display:"flex",flexDirection:"column",gap:"8px",marginBottom:"24px" }}>
            {volOpts.map(o=><button key={o} onClick={()=>setVol(o)} style={{ padding:"12px 16px",borderRadius:"8px",textAlign:"left",fontFamily:"'DM Sans', sans-serif",fontSize:"13px",fontWeight:"500",cursor:"pointer",transition:"all 0.2s",background:vol===o?`${GOLD}14`:"#141414",border:vol===o?`1px solid ${GOLD}`:"1px solid #222",color:vol===o?GOLD:"#777" }}>{o}</button>)}
          </div>
          <div style={{ display:"flex",gap:"10px" }}>
            <button onClick={()=>setStep(1)} style={{ padding:"14px 18px",borderRadius:"8px",fontFamily:"'DM Sans', sans-serif",fontSize:"12px",cursor:"pointer",background:"transparent",border:"1px solid #222",color:"#555" }}>← Back</button>
            <button onClick={()=>{if(vol){window.open(CALENDLY_URL,"_blank");onClose();}}} style={{ flex:1,padding:"14px",borderRadius:"8px",fontFamily:"'Space Mono', monospace",fontSize:"11px",fontWeight:"700",border:"none",cursor:vol?"pointer":"not-allowed",background:vol?GOLD:"#1a1a1a",color:vol?"#000":"#333",letterSpacing:"1px" }}>BOOK MY DEMO →</button>
          </div>
        </>}
        <button onClick={onClose} style={{ position:"absolute",top:"14px",right:"18px",background:"none",border:"none",color:"#444",fontSize:"22px",cursor:"pointer",lineHeight:1 }}>✕</button>
      </div>
    </div>
  );
}

// ─── SMS SIMULATOR ────────────────────────────────────────────────────────────
function SMSSimulator() {
  const [visible, setVisible] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [visible]);

  function run() {
    if (running) return;
    setRunning(true); setVisible([]); setDone(false);
    let i = 0;
    function next() {
      if (i >= SMS_SCRIPT.length) { setRunning(false); setDone(true); return; }
      const delay = SMS_SCRIPT[i].from==="ai" ? 900 : 1700;
      setTimeout(() => { setVisible(v=>[...v,SMS_SCRIPT[i]]); i++; next(); }, delay);
    }
    next();
  }

  return (
    <div style={{ background:"#0d0d0d",border:"1px solid #1c1c1c",borderRadius:"16px",overflow:"hidden" }}>
      <div style={{ background:"#111",borderBottom:"1px solid #1c1c1c",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
          <div style={{ width:"38px",height:"38px",borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},#c9a000)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0 }}>🤖</div>
          <div>
            <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",fontWeight:"700",color:WHITE }}>Mano — AI Intake Agent</div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:GREEN }}>● Online · Responding instantly</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"8px",color:"#2a2a2a",letterSpacing:"2px" }}>LIVE SIMULATION</div>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"8px",color:"#2a2a2a",letterSpacing:"1px" }}>HVAC SCENARIO</div>
        </div>
      </div>

      <div style={{ height:"360px",overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"14px",background:"#080808" }}>
        {visible.length===0&&!running&&(
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px" }}>
            <div style={{ fontSize:"36px" }}>💬</div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:"#252525",textAlign:"center",letterSpacing:"1px",lineHeight:2 }}>
              PRESS RUN TO WATCH MANO<br/>QUALIFY AND BOOK A REAL HVAC LEAD
            </div>
          </div>
        )}
        {visible.map((m,i)=>(
          <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:m.from==="ai"?"flex-start":"flex-end" }}>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#2a2a2a",marginBottom:"4px",marginLeft:m.from==="ai"?"2px":0,marginRight:m.from!=="ai"?"2px":0 }}>
              {m.from==="ai"?"Mano":"Marcus"}
            </div>
            <div style={{ maxWidth:"78%",padding:"12px 16px",borderRadius:m.from==="ai"?"4px 16px 16px 16px":"16px 4px 16px 16px",background:m.from==="ai"?"#181818":`${GOLD}10`,border:m.from==="ai"?"1px solid #222":`1px solid ${GOLD}33`,fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:m.from==="ai"?"#ccc":GOLD,lineHeight:1.65 }}>
              {m.text}
            </div>
          </div>
        ))}
        {running&&visible.length>0&&visible[visible.length-1].from==="lead"&&(
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-start" }}>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#2a2a2a",marginBottom:"4px",marginLeft:"2px" }}>Mano</div>
            <div style={{ padding:"12px 18px",borderRadius:"4px 16px 16px 16px",background:"#181818",border:"1px solid #222" }}>
              <span style={{ fontSize:"20px",letterSpacing:"3px",color:"#333" }}>···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{ background:"#111",borderTop:"1px solid #1c1c1c",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          {done&&<div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
            <span style={{ fontSize:"16px" }}>✅</span>
            <span style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",color:GOLD,fontWeight:"600" }}>Lead qualified & booked in under 3 minutes</span>
          </div>}
        </div>
        <button onClick={run} disabled={running} style={{ padding:"10px 22px",borderRadius:"7px",fontFamily:"'Space Mono', monospace",fontSize:"11px",fontWeight:"700",letterSpacing:"1px",cursor:running?"not-allowed":"pointer",background:running?"#1a1a1a":GOLD,color:running?"#444":"#000",border:"none",transition:"all 0.2s" }}>
          {running?"RUNNING...":done?"▶ REPLAY":"▶ RUN DEMO"}
        </button>
      </div>
    </div>
  );
}

// ─── QUALIFICATION LOGIC ──────────────────────────────────────────────────────
function QualLogic() {
  const [active, setActive] = useState(null);
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"12px" }}>
      {QUAL_STEPS.map((s,i)=>(
        <div
          key={i}
          onClick={()=>setActive(active===i?null:i)}
          style={{ background:active===i?"#111":"#0d0d0d",border:`1px solid ${active===i?s.color+"55":"#1a1a1a"}`,borderRadius:"14px",padding:"22px 20px",cursor:"pointer",transition:"all 0.25s" }}
        >
          <div style={{ fontSize:"28px",marginBottom:"12px" }}>{s.icon}</div>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:active===i?"10px":"0" }}>
            <div style={{ width:"20px",height:"20px",borderRadius:"50%",background:`${s.color}18`,border:`1px solid ${s.color}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:s.color,fontWeight:"700" }}>{i+1}</span>
            </div>
            <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",fontWeight:"700",color:WHITE }}>{s.label}</div>
          </div>
          {active===i&&<div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",color:"#666",lineHeight:1.65,marginTop:"8px" }}>{s.desc}</div>}
          {active!==i&&<div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#333",marginTop:"6px",letterSpacing:"0.5px" }}>tap to expand</div>}
        </div>
      ))}
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function Pipeline() {
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [moving, setMoving] = useState(null);
  const stages = ["New","Contacted","Qualified","Booked"];
  const stageColors = { New:"#555", Contacted:"#aaa", Qualified:GOLD, Booked:GOLD };

  function advance(id) {
    const lead = leads.find(l=>l.id===id);
    const idx = stages.indexOf(lead.status);
    if (idx>=stages.length-1) return;
    setMoving(id);
    setTimeout(()=>{ setLeads(prev=>prev.map(l=>l.id===id?{...l,status:stages[idx+1]}:l)); setMoving(null); },350);
  }

  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px" }}>
      {stages.map(stage=>{
        const c = stageColors[stage];
        const stageLeads = leads.filter(l=>l.status===stage);
        const nextStage = stages[stages.indexOf(stage)+1];
        return (
          <div key={stage}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px" }}>
              <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:c,letterSpacing:"2px",fontWeight:"700" }}>{stage.toUpperCase()}</div>
              <div style={{ background:`${c}18`,border:`1px solid ${c}44`,borderRadius:"10px",padding:"1px 8px",fontFamily:"'Space Mono', monospace",fontSize:"9px",color:c }}>{stageLeads.length}</div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",minHeight:"60px" }}>
              {stageLeads.map(l=>(
                <div key={l.id} style={{ background:"#111",border:"1px solid #1c1c1c",borderRadius:"10px",padding:"12px",opacity:moving===l.id?0.3:1,transition:"opacity 0.3s" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px" }}>
                    <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",fontWeight:"700",color:WHITE }}>{l.name}</div>
                    <ScoreBadge score={l.score}/>
                  </div>
                  <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"10px",color:"#555",marginBottom:"2px",lineHeight:1.4 }}>{l.issue}</div>
                  <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#2a2a2a",marginBottom:"10px" }}>{l.time}</div>
                  {stage!=="Booked"&&(
                    <button onClick={()=>advance(l.id)} style={{ width:"100%",padding:"6px",borderRadius:"5px",fontFamily:"'Space Mono', monospace",fontSize:"9px",fontWeight:"700",cursor:"pointer",background:"transparent",border:`1px solid ${stageColors[nextStage]}44`,color:stageColors[nextStage],letterSpacing:"0.5px",transition:"all 0.2s" }}>
                      → {nextStage.toUpperCase()}
                    </button>
                  )}
                  {stage==="Booked"&&<div style={{ textAlign:"center",fontFamily:"'Space Mono', monospace",fontSize:"9px",color:`${GOLD}88`,letterSpacing:"1px" }}>✓ BOOKED</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ROI PANEL ────────────────────────────────────────────────────────────────
function ROIPanel() {
  return (
    <div>
      <div style={{ background:"#0d0d0d",border:`1px solid ${RED}22`,borderRadius:"16px",padding:"40px 32px",textAlign:"center",marginBottom:"16px" }}>
        <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:"#444",letterSpacing:"3px",marginBottom:"14px" }}>IF YOU MISS JUST 5 CALLS A WEEK</div>
        <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(52px,9vw,96px)",color:RED,lineHeight:1,marginBottom:"10px",letterSpacing:"3px" }}>$2K–$5K</div>
        <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"16px",color:"#666",fontWeight:"500",marginBottom:"20px" }}>in lost jobs — every single month</div>
        <div style={{ display:"inline-block",background:`${GOLD}10`,border:`1px solid ${GOLD}33`,borderRadius:"8px",padding:"10px 22px" }}>
          <span style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:GOLD,fontWeight:"600" }}>Mano recovers every one of those calls. Automatically.</span>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:"10px" }}>
        {ROI_ITEMS.map(r=>(
          <div key={r.label} style={{ background:"#0f0f0f",border:`1px solid ${GOLD}18`,borderRadius:"12px",padding:"18px 20px" }}>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#3a3a3a",letterSpacing:"1px",marginBottom:"10px" }}>{r.label}</div>
            <div style={{ display:"flex",alignItems:"baseline",gap:"10px" }}>
              <span style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",color:RED,textDecoration:"line-through",opacity:0.6 }}>{r.before}</span>
              <span style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"32px",color:GOLD,lineHeight:1,letterSpacing:"1px" }}>{r.after}</span>
            </div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#1e1e1e",marginTop:"4px",letterSpacing:"0.5px" }}>with Monkee Bizz AI</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Demo() {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState("sms");

  const tabs = [
    { id:"sms",      label:"💬  SMS Conversation" },
    { id:"qual",     label:"🔍  Qualification Logic" },
    { id:"pipeline", label:"📋  Lead Pipeline" },
    { id:"roi",      label:"📈  ROI Panel" },
  ];

  function CTAPrimary({ style={} }) {
    return (
      <button
        onClick={()=>setShowModal(true)}
        style={{
          background: GOLD,
          color: "#000",
          border: "none",
          padding: "16px 34px",
          borderRadius: "9px",
          fontFamily: "'Space Mono', monospace",
          fontSize: "12px",
          fontWeight: "700",
          cursor: "pointer",
          letterSpacing: "1px",
          boxShadow: `0 0 40px ${GOLD}33`,
          transition: "transform 0.2s, box-shadow 0.2s",
          ...style
        }}
        onMouseEnter={e=>{ e.currentTarget.style.transform="scale(1.04)"; e.currentTarget.style.boxShadow=`0 0 60px ${GOLD}55`; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform="scale(1)";    e.currentTarget.style.boxShadow=`0 0 40px ${GOLD}33`; }}
      >
        SEE HOW MANY JOBS YOU'RE LOSING →
      </button>
    );
  }

  function CTASecondary({ style={} }) {
    return (
      <button
        onClick={()=>setShowModal(true)}
        style={{ background:"transparent",color:"#666",border:"1px solid #222",padding:"15px 28px",borderRadius:"9px",fontFamily:"'DM Sans', sans-serif",fontSize:"13px",fontWeight:"600",cursor:"pointer",transition:"all 0.2s",...style }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor="#444"; e.currentTarget.style.color="#bbb"; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor="#222"; e.currentTarget.style.color="#666"; }}
      >
        Book a Demo
      </button>
    );
  }

  return (
    <div style={{ minHeight:"100vh",background:"#080808",color:WHITE }}>
      <FontStyle/>
      {showModal&&<PreQualModal onClose={()=>setShowModal(false)}/>}

      {/* ── NAV ── */}
      <nav style={{ borderBottom:"1px solid #111",padding:"18px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"rgba(8,8,8,0.97)",backdropFilter:"blur(12px)",zIndex:100 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"22px",color:WHITE,letterSpacing:"3px" }}>MONKEE BIZZ AI</div>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"8px",color:GREEN,letterSpacing:"3px",marginTop:"-1px" }}>POWERED BY MANOLOGICS</div>
        </div>
        <button
          onClick={()=>setShowModal(true)}
          style={{ background:GOLD,color:"#000",border:"none",padding:"10px 22px",borderRadius:"7px",fontFamily:"'Space Mono', monospace",fontSize:"10px",fontWeight:"700",cursor:"pointer",letterSpacing:"1px",boxShadow:`0 0 20px ${GOLD}33` }}
        >
          BOOK DEMO
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{ maxWidth:"860px",margin:"0 auto",padding:"88px 24px 64px",textAlign:"center" }}>

        {/* tag */}
        <div style={{ display:"inline-block",background:`${RED}10`,border:`1px solid ${RED}33`,borderRadius:"20px",padding:"5px 18px",marginBottom:"28px" }}>
          <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:RED,letterSpacing:"3px" }}>FOR HVAC CONTRACTORS</span>
        </div>

        {/* headline */}
        <h1 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(52px,9vw,104px)",color:WHITE,lineHeight:0.95,margin:"0 0 28px",letterSpacing:"2px" }}>
          Turn Missed Calls<br/>
          Into <span style={{ color:GOLD }}>Booked Jobs</span><br/>
          <span style={{ fontSize:"clamp(34px,5.5vw,64px)",color:"#666" }}>Before Your <span style={{ color:RED }}>Competitors</span> Do</span>
        </h1>

        {/* sub */}
        <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"18px",color:"#888",maxWidth:"520px",margin:"0 auto 16px",lineHeight:1.8,fontWeight:"400" }}>
          Mano responds in seconds, qualifies the lead, and books the job — automatically.
        </p>

        {/* pain stat */}
        <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"14px",color:"#444",maxWidth:"420px",margin:"0 auto 44px",lineHeight:1.6 }}>
          Miss just 5 calls a week? That's{" "}
          <strong style={{ color:RED }}>$2,000–$5,000 in lost jobs</strong> every month.
        </p>

        <div style={{ display:"flex",gap:"14px",justifyContent:"center",flexWrap:"wrap",marginBottom:"16px" }}>
          <CTAPrimary/>
          <CTASecondary/>
        </div>
        <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:"#252525",letterSpacing:"1px" }}>Free 30-min walkthrough. No pressure.</div>
      </section>

      {/* ── PAIN DIVIDER ── */}
      <div style={{ maxWidth:"860px",margin:"0 auto 64px",padding:"0 24px" }}>
        <div style={{ background:`linear-gradient(135deg, ${RED}10, #0d0d0d)`,border:`1px solid ${RED}22`,borderRadius:"14px",padding:"28px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"20px" }}>
          <div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:RED,letterSpacing:"2px",marginBottom:"6px" }}>THE PROBLEM</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(24px,4vw,36px)",color:WHITE,letterSpacing:"1px" }}>
              Every missed call is a job your <span style={{ color:RED }}>competitor</span> books.
            </div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(40px,6vw,64px)",color:RED,lineHeight:1 }}>73%</div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#444",letterSpacing:"1px",marginTop:"4px" }}>of callers won't leave a voicemail</div>
          </div>
        </div>
      </div>

      {/* ── WATCH YOUR AI EMPLOYEE WORK ── */}
      <section style={{ maxWidth:"980px",margin:"0 auto",padding:"0 24px 80px" }}>
        <div style={{ textAlign:"center",marginBottom:"40px" }}>
          <div style={{ display:"inline-block",background:`${GREEN}10`,border:`1px solid ${GREEN}30`,borderRadius:"20px",padding:"5px 16px",marginBottom:"14px" }}>
            <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:GREEN,letterSpacing:"3px" }}>● LIVE DEMO</span>
          </div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(32px,5vw,58px)",color:WHITE,margin:"0 0 12px",letterSpacing:"2px" }}>
            Watch Your AI Employee Work
          </h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"15px",color:"#555",maxWidth:"480px",margin:"0 auto",lineHeight:1.75 }}>
            See exactly how Mano handles an inbound HVAC lead — from first contact to booked job — without a single human involved.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex",gap:"4px",marginBottom:"20px",background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"10px",padding:"4px" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"10px 8px",borderRadius:"7px",fontFamily:"'DM Sans', sans-serif",fontSize:"12px",fontWeight:"600",cursor:"pointer",border:"none",transition:"all 0.2s",background:tab===t.id?"#1a1a1a":"transparent",color:tab===t.id?WHITE:"#444",boxShadow:tab===t.id?"0 1px 6px rgba(0,0,0,0.6)":"none",whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==="sms"      && <SMSSimulator/>}
        {tab==="qual"     && <QualLogic/>}
        {tab==="pipeline" && <Pipeline/>}
        {tab==="roi"      && <ROIPanel/>}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background:"#0b0b0b",borderTop:"1px solid #111",borderBottom:"1px solid #111",padding:"72px 24px" }}>
        <div style={{ maxWidth:"860px",margin:"0 auto",textAlign:"center" }}>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#333",letterSpacing:"3px",marginBottom:"12px" }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(32px,5vw,52px)",color:WHITE,margin:"0 0 10px",letterSpacing:"2px" }}>One System. Five AI Agents.</h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"14px",color:"#444",margin:"0 0 44px" }}>Built to run your lead pipeline around the clock — no staff required.</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"12px" }}>
            {[
              { n:"01", name:"INTAKE",  icon:"📞", desc:"Answers every call instantly" },
              { n:"02", name:"QUALIFY", icon:"🔍", desc:"Scores urgency in real time" },
              { n:"03", name:"BOOK",    icon:"📅", desc:"Confirms appointment automatically" },
              { n:"04", name:"FOLLOW",  icon:"🔁", desc:"Chases cold leads automatically" },
              { n:"05", name:"REPORT",  icon:"📊", desc:"Daily ops summary, always on" },
            ].map(a=>(
              <div key={a.n} style={{ background:"#0f0f0f",border:`1px solid #1a1a1a`,borderRadius:"12px",padding:"24px 14px",textAlign:"center",transition:"border-color 0.2s",cursor:"default" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=`${GOLD}44`}
                onMouseLeave={e=>e.currentTarget.style.borderColor="#1a1a1a"}
              >
                <div style={{ fontSize:"24px",marginBottom:"10px" }}>{a.icon}</div>
                <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"8px",color:"#333",marginBottom:"4px",letterSpacing:"1px" }}>AGENT {a.n}</div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"20px",color:GOLD,marginBottom:"6px",letterSpacing:"2px" }}>{a.name}</div>
                <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"11px",color:"#444",lineHeight:1.5 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ padding:"88px 24px",textAlign:"center" }}>
        <div style={{ maxWidth:"560px",margin:"0 auto" }}>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#333",letterSpacing:"3px",marginBottom:"16px" }}>STOP LEAVING MONEY ON THE TABLE</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(40px,6vw,64px)",color:WHITE,margin:"0 0 14px",letterSpacing:"2px" }}>
            Ready to Stop <span style={{ color:RED }}>Losing</span> Jobs?
          </h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"15px",color:"#555",margin:"0 0 36px",lineHeight:1.75 }}>
            Book a free 30-minute demo. We'll show you exactly how Mano works in an HVAC operation like yours — and what it's costing you to wait.
          </p>
          <div style={{ display:"flex",gap:"14px",justifyContent:"center",flexWrap:"wrap" }}>
            <CTAPrimary/>
            <CTASecondary/>
          </div>
          <div style={{ marginTop:"18px",fontFamily:"'Space Mono', monospace",fontSize:"10px",color:"#252525",letterSpacing:"1px" }}>Free 30-min walkthrough. No pressure.</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:"1px solid #0f0f0f",padding:"24px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px" }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"16px",color:"#2a2a2a",letterSpacing:"3px" }}>MONKEE BIZZ AI</div>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"8px",color:"#1a1a1a",letterSpacing:"2px" }}>POWERED BY MANOLOGICS</div>
        </div>
        <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"10px",color:"#1c1c1c" }}>© 2026 Monkee Bizz AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
