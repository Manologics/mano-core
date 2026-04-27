import React, { useState, useEffect, useRef } from "react";

// ─── FONT IMPORT ──────────────────────────────────────────────────────────────
const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #060606; color: rgba(255,255,255,0.92); }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #080808; }
    ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }

    h1, h2, h3 {
      color: #FFFFFF !important;
      text-shadow: 0 0 12px rgba(255,255,255,0.08);
    }

    p, span.body-text {
      color: #CFCFCF;
      font-size: 16.5px;
      line-height: 1.6;
    }

    @keyframes goldPulse {
      0%, 100% { box-shadow: 0 0 30px #f5c51840, 0 0 60px #f5c51820; }
      50%       { box-shadow: 0 0 50px #f5c51866, 0 0 90px #f5c51833; }
    }
    @keyframes redFlicker {
      0%, 100% { text-shadow: 0 0 12px rgba(255,0,0,0.35); }
      50%       { text-shadow: 0 0 22px rgba(255,0,0,0.55); }
    }
    @keyframes goldText {
      0%, 100% { text-shadow: 0 0 20px #f5c51855, 0 0 40px #f5c51830; }
      50%       { text-shadow: 0 0 35px #f5c51888, 0 0 60px #f5c51844; }
    }
    @keyframes redNumberPulse {
      0%, 100% { text-shadow: 0 0 8px rgba(255,0,0,0.40), 0 0 24px rgba(255,0,0,0.20); }
      50%       { text-shadow: 0 0 20px rgba(255,0,0,0.75), 0 0 48px rgba(255,0,0,0.35); }
    }
    .red-number-pulse {
      animation: redNumberPulse 1.8s ease-in-out infinite;
    }
    .gold-glow-btn {
      animation: goldPulse 2.8s ease-in-out infinite;
    }
    .gold-glow-btn:hover {
      animation: none !important;
      box-shadow: 0 0 70px #f5c518aa, 0 0 120px #f5c51855 !important;
      transform: scale(1.05) !important;
    }
    .red-loss {
      color: #FF3B3B !important;
      text-shadow: 0 0 8px rgba(255,0,0,0.35) !important;
      animation: redFlicker 3s ease-in-out infinite;
    }
    .gold-headline {
      animation: goldText 3s ease-in-out infinite;
    }

    /* Mobile Polish */
    @media (max-width: 640px) {
      section { padding-top: 56px !important; padding-bottom: 56px !important; }
      .section-gap { margin-bottom: 56px !important; }
      p { font-size: 16px !important; line-height: 1.7 !important; }
      button.cta-primary { padding: 18px 24px !important; font-size: 15px !important; }
      button.cta-secondary { padding: 16px 22px !important; font-size: 15px !important; }
      .base44-chat-button, [class*="chat-bubble"], [class*="edit-button"] {
        opacity: 0.6 !important;
        transform: scale(0.9) !important;
        display: none !important;
      }
    }
  `}</style>
);

// ─── COLOR SYSTEM ─────────────────────────────────────────────────────────────
const GOLD  = "#f5c518";
const GOLDD = "#c9a000";
const RED   = "#cc2020";
const REDB  = "#FF3B3B";   // updated to spec
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
  { label: "Missed Calls / Month",     before: "~40",     after: "0",        loss: true  },
  { label: "Avg Response Time",        before: "4–6 hrs", after: "< 90 sec", loss: false },
  { label: "Leads Auto-Qualified",     before: "Manual",  after: "100%",     loss: false },
  { label: "Booking Rate",             before: "35%",     after: "72%",      loss: false },
  { label: "Est. Monthly Revenue",     before: "$18K",    after: "$31K",     loss: false },
  { label: "Staff Hours Saved / Week", before: "0 hrs",   after: "22 hrs",   loss: false },
];

const QUAL_STEPS = [
  { icon: "📞", label: "Call / Text Received",  desc: "Mano picks up instantly — no hold music, no voicemail.",        color: "#aaa"  },
  { icon: "🔍", label: "Issue Identified",      desc: "Mano asks the right questions and identifies urgency level.",   color: "#aaa"  },
  { icon: "🔥", label: "Lead Scored HOT",       desc: "Same-day urgency + service need = HOT. Escalated immediately.", color: REDB    },
  { icon: "📅", label: "Job Booked",            desc: "Tech dispatched. Customer confirmed. No human needed.",         color: GOLD    },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const map = {
    HOT:  [REDB,  "#FF3B3B20"],
    WARM: [GOLD,  "#f5c51820"],
    COLD: ["#444","#44444420"],
  };
  const [c, bg] = map[score] || map.COLD;
  return (
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:"9px", fontWeight:"700", color:c, background:bg, border:`1px solid ${c}55`, padding:"2px 7px", borderRadius:"4px", letterSpacing:"1px" }}>
      {score}
    </span>
  );
}

// ─── LOST REVENUE CALCULATOR MODAL ─────────────────────────────────────────────
function CalculatorModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [calls, setCalls] = useState("");
  const [saving, setSaving] = useState(false);

  const missedWeekly = parseInt(calls) || 0;
  const missedMonthly = missedWeekly * 4;
  const conversions = missedMonthly * 0.3;
  const lowEnd = Math.round(conversions * 500);
  const highEnd = Math.round(conversions * 1000);

  const formatMoney = (num) => "$" + num.toLocaleString();

  async function handleCalculate() {
    if (!name || !phone || !calls) return;
    setSaving(true);
    try {
      await fetch("https://mano-dd309130.base44.app/functions/landingLeadCapture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, missedCallsPerWeek: calls, source: "calculator" })
      });
    } catch(e) {
      console.error("Failed to capture lead:", e);
    }
    setSaving(false);
    setStep(3);
  }

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.97)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px" }}>
      <div style={{ background:"#0d0d0d",border:`1px solid ${GOLD}22`,borderRadius:"16px",padding:"36px 32px",maxWidth:"460px",width:"100%",position:"relative",boxShadow:`0 0 60px ${GOLD}10` }}>

        {step < 3 && (
          <div style={{ display:"flex",gap:"8px",marginBottom:"28px" }}>
            {[1,2].map(s=><div key={s} style={{ flex:1,height:"3px",borderRadius:"2px",background:step>=s?`linear-gradient(90deg,${GOLDD},${GOLD})`:"#1c1c1c",transition:"background 0.3s" }}/>)}
          </div>
        )}

        {step===1&&<>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:GOLD,letterSpacing:"3px",marginBottom:"8px" }}>STEP 1 OF 2</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"32px",color:WHITE,margin:"0 0 6px",letterSpacing:"1px" }}>Let's calculate how much you're losing</h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"14px",color:"#888",margin:"0 0 24px",lineHeight:1.6 }}>Enter your details to see how much missed calls are costing you every month.</p>
          <div style={{ display:"flex",flexDirection:"column",gap:"16px",marginBottom:"12px" }}>
            <input type="text" placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)}
              style={{ padding:"16px",borderRadius:"8px",background:"rgba(255,255,255,0.05)",border:"1px solid #222",color:WHITE,fontFamily:"'DM Sans', sans-serif",fontSize:"18px",outline:"none" }}
            />
            <input type="tel" placeholder="Mobile Number" value={phone} onChange={e=>setPhone(e.target.value)}
              style={{ padding:"16px",borderRadius:"8px",background:"rgba(255,255,255,0.05)",border:"1px solid #222",color:WHITE,fontFamily:"'DM Sans', sans-serif",fontSize:"18px",outline:"none" }}
            />
          </div>
          <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"11px",color:"#444",marginBottom:"24px",paddingLeft:"2px",lineHeight:1.5 }}>
            🔒 We'll send your results + a live demo showing how to recover these jobs. No spam.
          </div>
          <button
            onClick={()=>name&&phone&&setStep(2)}
            className="gold-glow-btn"
            style={{
              width:"100%", height:"64px", borderRadius:"8px",
              fontFamily:"'Space Mono', monospace", fontSize:"13px", fontWeight:"700",
              letterSpacing:"1.5px", transition:"all 0.2s",
              cursor: name&&phone ? "pointer" : "not-allowed",
              border: "none",
              background: name&&phone
                ? `linear-gradient(135deg, #FFD84D 0%, #D4AF37 100%)`
                : `linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)`,
              color: "#000",
              boxShadow: name&&phone
                ? `0 0 40px rgba(212,175,55,0.65), 0 0 80px rgba(212,175,55,0.25), 0 4px 16px rgba(0,0,0,0.5)`
                : `0 0 28px rgba(212,175,55,0.40), 0 0 50px rgba(212,175,55,0.15), 0 4px 12px rgba(0,0,0,0.4)`,
              opacity: name&&phone ? 1 : 0.92,
            }}
            onMouseEnter={e => { if (name&&phone) { e.currentTarget.style.transform="scale(1.02)"; e.currentTarget.style.boxShadow=`0 0 60px rgba(212,175,55,0.80), 0 0 100px rgba(212,175,55,0.35), 0 6px 20px rgba(0,0,0,0.5)`; } }}
            onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow = name&&phone ? `0 0 40px rgba(212,175,55,0.65), 0 0 80px rgba(212,175,55,0.25), 0 4px 16px rgba(0,0,0,0.5)` : `0 0 28px rgba(212,175,55,0.40), 0 0 50px rgba(212,175,55,0.15), 0 4px 12px rgba(0,0,0,0.4)`; }}
          >
            CALCULATE MY LOST REVENUE {name&&phone ? "→" : ""}
          </button>
          {!(name&&phone) && (
            <div style={{ textAlign:"center", fontFamily:"'DM Sans', sans-serif", fontSize:"11px", color:"#5a4a20", marginTop:"10px" }}>
              Enter name + phone to continue.
            </div>
          )}
        </>}

        {step===2&&<>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:GOLD,letterSpacing:"3px",marginBottom:"8px" }}>STEP 2 OF 2</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"32px",color:WHITE,margin:"0 0 6px",letterSpacing:"1px" }}>How many calls do you miss?</h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"14px",color:"#888",margin:"0 0 24px",lineHeight:1.6 }}>Estimate how many inbound jobs you lose per week when you can't answer the phone.</p>
          <div style={{ marginBottom:"28px" }}>
            <input type="number" placeholder="e.g. 5" value={calls} onChange={e=>setCalls(e.target.value)} min="1"
              style={{ width:"100%",padding:"24px 16px",borderRadius:"8px",background:"rgba(255,255,255,0.05)",border:`1px solid ${GOLD}44`,color:GOLD,fontFamily:"'Bebas Neue', sans-serif",fontSize:"28px",letterSpacing:"2px",outline:"none",textAlign:"center" }}
            />
            {calls && parseInt(calls) > 0 && (
              <div style={{ marginTop:"16px",padding:"18px 16px",background:"#0a0808",border:`1px solid ${REDB}33`,borderRadius:"8px",textAlign:"center",boxShadow:`0 0 24px rgba(255,59,59,0.08)` }}>
                <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:"#555",letterSpacing:"2px",marginBottom:"10px" }}>ESTIMATED MONTHLY LOSS</div>
                <div className="red-number-pulse" style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"38px",color:REDB,fontWeight:"800",lineHeight:1,marginBottom:"10px" }}>
                  {formatMoney(Math.round(parseInt(calls)*4*0.3*500))} – {formatMoney(Math.round(parseInt(calls)*4*0.3*1000))}
                </div>
                <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",color:`${REDB}99`,fontStyle:"italic" }}>
                  This is revenue going to your competitors every single month.
                </div>
              </div>
            )}
          </div>
          <button onClick={handleCalculate} disabled={saving||!calls} className={calls&&!saving?"gold-glow-btn cta-primary":""} style={{ width:"100%",padding:"18px 24px",borderRadius:"8px",fontFamily:"'Space Mono', monospace",fontSize:"13px",fontWeight:"700",border:"none",cursor:calls&&!saving?"pointer":"not-allowed",background:calls&&!saving?`linear-gradient(135deg,${GOLD},${GOLDD})`:"#1a1a1a",color:calls&&!saving?"#000":"#333",letterSpacing:"1px",transition:"all 0.2s" }}>
            {saving?"CALCULATING...":"SHOW ME MY LOST REVENUE →"}
          </button>
        </>}

        {step===3&&<>
          <div style={{ textAlign:"center",marginBottom:"20px" }}>
            <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"28px",color:WHITE,margin:"0 0 8px",letterSpacing:"1px",lineHeight:1.2 }}>
              🔥 Here's what missed calls are costing you, {name.split(" ")[0]}
            </h2>
            <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:"#777",lineHeight:1.6 }}>
              Based on your missed calls, here's how much revenue is slipping through the cracks every month:
            </p>
          </div>

          {/* BIG RESULT NUMBER */}
          <div style={{ background:`linear-gradient(135deg,${REDB}12,#0a0808)`,border:`1px solid ${REDB}44`,borderRadius:"12px",padding:"24px",marginBottom:"14px",textAlign:"center",boxShadow:`0 0 40px rgba(255,59,59,0.12)` }}>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:"#555",letterSpacing:"2px",marginBottom:"10px" }}>MONTHLY REVENUE AT RISK</div>
            <div className="red-number-pulse" style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"40px",fontWeight:"800",color:REDB,lineHeight:1,marginBottom:"10px" }}>
              {formatMoney(lowEnd)} – {formatMoney(highEnd)}
            </div>
            <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",color:`${REDB}88`,fontStyle:"italic" }}>
              Every day you wait, more of this goes to your competitors.
            </div>
          </div>

          {/* Urgency block */}
          <div style={{ background:"#0d0d0d",border:`1px solid ${GOLD}22`,borderRadius:"10px",padding:"14px 16px",marginBottom:"20px",display:"flex",alignItems:"center",gap:"12px" }}>
            <span style={{ fontSize:"18px",flexShrink:0 }}>⚡</span>
            <span style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:"#C8C8C8",lineHeight:1.55 }}>
              If you fix this now, you can start capturing these jobs <strong style={{ color:GOLD }}>immediately.</strong>
            </span>
          </div>

          <button onClick={()=>{window.open(CALENDLY_URL,"_blank");onClose();}} className="gold-glow-btn cta-primary" style={{ width:"100%",padding:"20px 24px",borderRadius:"8px",fontFamily:"'Space Mono', monospace",fontSize:"12px",fontWeight:"700",border:"none",cursor:"pointer",background:`linear-gradient(135deg,${GOLD},${GOLDD})`,color:"#000",letterSpacing:"1px",boxShadow:`0 0 40px ${GOLD}55`,marginBottom:"10px" }}>
            BOOK DEMO & START CAPTURING THESE JOBS →
          </button>
          <div style={{ textAlign:"center",fontFamily:"'DM Sans', sans-serif",fontSize:"12px",color:"#444" }}>
            See Mano recover missed calls in real time. Takes 2 minutes.
          </div>
        </>}

        <button onClick={onClose} style={{ position:"absolute",top:"16px",right:"20px",background:"none",border:"none",color:"#444",fontSize:"24px",cursor:"pointer",lineHeight:1,transition:"color 0.2s" }} onMouseEnter={e=>e.currentTarget.style.color=WHITE} onMouseLeave={e=>e.currentTarget.style.color="#444"}>✕</button>
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
          <div style={{ width:"38px",height:"38px",borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLDD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0,boxShadow:`0 0 16px ${GOLD}44` }}>🤖</div>
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
            <div style={{ maxWidth:"78%",padding:"12px 16px",borderRadius:m.from==="ai"?"4px 16px 16px 16px":"16px 4px 16px 16px",background:m.from==="ai"?"#181818":`${GOLD}10`,border:m.from==="ai"?"1px solid #222":`1px solid ${GOLD}33`,fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:m.from==="ai"?"rgba(255,255,255,0.85)":GOLD,lineHeight:1.65 }}>
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
        <button onClick={run} disabled={running} className={!running?"gold-glow-btn":""} style={{ padding:"10px 22px",borderRadius:"7px",fontFamily:"'Space Mono', monospace",fontSize:"11px",fontWeight:"700",letterSpacing:"1px",cursor:running?"not-allowed":"pointer",background:running?"#1a1a1a":`linear-gradient(135deg,${GOLD},${GOLDD})`,color:running?"#444":"#000",border:"none",transition:"background 0.2s" }}>
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
        <div key={i} onClick={()=>setActive(active===i?null:i)}
          style={{ background:active===i?"#111":"#0d0d0d",border:`1px solid ${active===i?s.color+"55":"#1a1a1a"}`,borderRadius:"14px",padding:"22px 20px",cursor:"pointer",transition:"all 0.25s",boxShadow:active===i&&s.color===GOLD?`0 0 20px ${GOLD}18`:active===i&&s.color===REDB?`0 0 20px rgba(255,59,59,0.18)`:"none" }}
        >
          <div style={{ fontSize:"28px",marginBottom:"12px" }}>{s.icon}</div>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:active===i?"10px":"0" }}>
            <div style={{ width:"20px",height:"20px",borderRadius:"50%",background:`${s.color}18`,border:`1px solid ${s.color}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:s.color,fontWeight:"700" }}>{i+1}</span>
            </div>
            <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",fontWeight:"700",color:WHITE }}>{s.label}</div>
          </div>
          {active===i&&<div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:"#CFCFCF",lineHeight:1.65,marginTop:"8px" }}>{s.desc}</div>}
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
  const stageColors = { New:"#444", Contacted:"#888", Qualified:GOLD, Booked:GOLD };

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
                <div key={l.id} onClick={()=>advance(l.id)}
                  style={{ background:"#0d0d0d",border:`1px solid ${moving===l.id?GOLD:"#1a1a1a"}`,borderRadius:"10px",padding:"12px",cursor:nextStage?"pointer":"default",transition:"all 0.25s",opacity:moving===l.id?0.5:1 }}
                >
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px" }}>
                    <span style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",fontWeight:"600",color:"rgba(255,255,255,0.92)" }}>{l.name}</span>
                    <ScoreBadge score={l.score}/>
                  </div>
                  <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"11px",color:"#CFCFCF",lineHeight:1.5,marginBottom:"6px" }}>{l.issue}</div>
                  <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:"#2a2a2a" }}>{l.time}</div>
                  {nextStage&&<div style={{ fontFamily:"'Space Mono', monospace",fontSize:"8px",color:"#1e1e1e",marginTop:"4px",letterSpacing:"0.5px" }}>tap → {nextStage}</div>}
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
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"10px" }}>
      {ROI_ITEMS.map((item,i)=>(
        <div key={i} style={{ background:"#0d0d0d",border:`1px solid #1a1a1a`,borderRadius:"12px",padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px" }}>
          <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:"#CFCFCF",fontWeight:"500",flex:1 }}>{item.label}</div>
          <div style={{ display:"flex",gap:"10px",alignItems:"center",flexShrink:0 }}>
            <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"11px",color:"#333",textDecoration:"line-through" }}>{item.before}</span>
            <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"12px",color:item.loss?REDB:GOLD,fontWeight:"700" }}>{item.after}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Demo() {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState("sms");

  const GOLD  = "#f5c518";
  const GOLDD = "#c9a000";
  const RED   = "#cc2020";
  const REDB  = "#FF3B3B";
  const WHITE = "#ffffff";
  const GREEN = "#00ff88";
  const CALENDLY_URL = "https://calendly.com/monkee-bizznus/30min";

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
        className="gold-glow-btn cta-primary"
        style={{
          background: `linear-gradient(135deg, ${GOLD}, ${GOLDD})`,
          color: "#000", border: "none", padding: "20px 48px",
          borderRadius: "9px", fontFamily: "'Space Mono', monospace",
          fontSize: "14px", fontWeight: "700", cursor: "pointer",
          letterSpacing: "1.5px", transition: "transform 0.2s, box-shadow 0.2s",
          ...style
        }}
      >
        SHOW ME HOW MUCH I'M LOSING →
      </button>
    );
  }

  function CTASecondary({ style={} }) {
    return (
      <button
        onClick={()=>window.open(CALENDLY_URL,"_blank")}
        className="cta-secondary"
        style={{ background:"transparent", color:"#777", border:"1px solid #2a2a2a",
          padding:"16px 28px", borderRadius:"9px", fontFamily:"'DM Sans', sans-serif",
          fontSize:"14px", fontWeight:"600", cursor:"pointer", transition:"all 0.2s", ...style }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor="#444"; e.currentTarget.style.color="#aaa"; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor="#2a2a2a"; e.currentTarget.style.color="#777"; }}
      >
        Book a Demo
      </button>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#060606", color:"rgba(255,255,255,0.92)" }}>
      <FontStyle/>
      {showModal && <CalculatorModal onClose={()=>setShowModal(false)}/>}

      {/* NAV */}
      <nav style={{ borderBottom:"1px solid #0e0e0e", padding:"18px 28px", display:"flex",
        alignItems:"center", justifyContent:"space-between", position:"sticky", top:0,
        background:"rgba(6,6,6,0.97)", backdropFilter:"blur(14px)", zIndex:100 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"22px", color:WHITE, letterSpacing:"3px" }}>MONKEE BIZZ AI</div>
          <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"8px", color:GREEN, letterSpacing:"3px", marginTop:"-1px" }}>POWERED BY MANOLOGICS</div>
        </div>
        <button onClick={()=>setShowModal(true)} className="gold-glow-btn"
          style={{ background:`linear-gradient(135deg,${GOLD},${GOLDD})`, color:"#000", border:"none",
            padding:"12px 22px", borderRadius:"7px", fontFamily:"'Space Mono', monospace",
            fontSize:"10px", fontWeight:"700", cursor:"pointer", letterSpacing:"1px" }}>
          SHOW ME HOW MUCH I'M LOSING
        </button>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth:"880px", margin:"0 auto", padding:"92px 24px 64px", textAlign:"center" }}>
        <div style={{ display:"inline-block", background:`${RED}12`, border:`1px solid ${RED}44`,
          borderRadius:"20px", padding:"5px 18px", marginBottom:"28px", boxShadow:`0 0 16px ${RED}14` }}>
          <span style={{ fontFamily:"'Space Mono', monospace", fontSize:"9px", color:REDB, letterSpacing:"3px" }}>FOR HVAC CONTRACTORS</span>
        </div>

        <h1 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"clamp(52px,9vw,108px)",
          color:WHITE, lineHeight:0.95, margin:"0 0 24px", letterSpacing:"2px",
          textShadow:"0 0 12px rgba(255,255,255,0.08)" }}>
          Turn <span className="red-loss">Missed Calls</span><br/>
          Into <span className="gold-headline" style={{ color:GOLD }}>Booked Jobs</span><br/>
          <span style={{ fontSize:"clamp(30px,5vw,58px)", color:"#555", letterSpacing:"1px" }}>
            Before Your <span style={{ color:REDB, textShadow:"0 0 8px rgba(255,0,0,0.35)" }}>Competitors</span> Do
          </span>
        </h1>

        <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"16px", color:`${REDB}cc`,
          maxWidth:"480px", margin:"0 auto 18px", lineHeight:1.6, fontWeight:"500", fontStyle:"italic" }}>
          While you're missing calls, your competitors are closing them.
        </p>

        <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"16.5px", color:"#CFCFCF",
          maxWidth:"500px", margin:"0 auto 16px", lineHeight:1.8, fontWeight:"400" }}>
          Mano responds in seconds, qualifies the lead, and books the job — automatically.
        </p>

        <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"15px", color:"#555",
          maxWidth:"420px", margin:"0 auto 48px", lineHeight:1.6 }}>
          Miss just 5 calls a week? That's{" "}
          <strong style={{ color:REDB, textShadow:"0 0 8px rgba(255,0,0,0.35)" }}>$2,000–$5,000 in lost jobs</strong> every month.
        </p>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"14px", marginBottom:"16px" }}>
          <CTAPrimary/>
          <CTASecondary/>
        </div>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"10px", color:"#222", letterSpacing:"1px" }}>Free 30-min walkthrough. No pressure.</div>
      </section>

      {/* 73% PAIN SECTION */}
      <div style={{ maxWidth:"880px", margin:"0 auto 72px", padding:"0 24px" }}>
        <div style={{ background:`linear-gradient(135deg,${RED}14,#0a0808 60%,${RED}08)`,
          border:`1px solid ${RED}33`, borderRadius:"14px", padding:"36px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:"28px", boxShadow:`0 0 40px ${RED}0e` }}>
          <div style={{ flex:1, minWidth:"220px" }}>
            <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"9px", color:REDB, letterSpacing:"2px", marginBottom:"10px" }}>THE PROBLEM</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"clamp(22px,3.5vw,36px)",
              color:WHITE, letterSpacing:"1px", lineHeight:1.15, textShadow:"0 0 12px rgba(255,255,255,0.08)" }}>
              Every missed call is a job your{" "}
              <span style={{ color:REDB, textShadow:"0 0 8px rgba(255,0,0,0.35)" }}>competitor</span>{" "}books.
            </div>
            <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"16px", color:"#E0E0E0", marginTop:"12px", lineHeight:1.6 }}>
              Most HVAC owners don't realize how many jobs walk out the door every week. Mano closes that gap — permanently.
            </p>
          </div>
          <div style={{ textAlign:"center", padding:"0 8px" }}>
            <div className="red-loss" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"64px",
              fontWeight:"800", color:REDB, lineHeight:1, textShadow:"0 0 18px rgba(255,0,0,0.35)" }}>73%</div>
            <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"11px", color:"#555",
              letterSpacing:"1px", marginTop:"6px", maxWidth:"160px", lineHeight:1.5 }}>of callers won't leave a voicemail</div>
            <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"16px", color:"#E0E0E0", marginTop:"8px", maxWidth:"180px", lineHeight:1.5 }}>That's 3 out of 4 leads — gone.</div>
          </div>
        </div>
      </div>

      {/* DEMO SECTION */}
      <section style={{ maxWidth:"980px", margin:"0 auto", padding:"0 24px 88px" }}>
        <div style={{ textAlign:"center", marginBottom:"44px" }}>
          <div style={{ display:"inline-block", background:`${GREEN}0e`, border:`1px solid ${GREEN}28`,
            borderRadius:"20px", padding:"5px 16px", marginBottom:"14px" }}>
            <span style={{ fontFamily:"'Space Mono', monospace", fontSize:"9px", color:GREEN, letterSpacing:"3px" }}>● LIVE DEMO</span>
          </div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"clamp(32px,5vw,58px)",
            color:WHITE, margin:"0 0 14px", letterSpacing:"2px", textShadow:"0 0 12px rgba(255,255,255,0.08)" }}>
            Watch Your AI Employee Work
          </h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"16.5px", color:"#CFCFCF",
            maxWidth:"480px", margin:"0 auto", lineHeight:1.75 }}>
            See exactly how Mano handles an inbound HVAC lead — from first contact to{" "}
            <span style={{ color:GOLD, fontWeight:"600" }}>booked job</span> — without a single human involved.
          </p>
        </div>

        <div style={{ display:"flex", gap:"4px", marginBottom:"20px", background:"#0d0d0d",
          border:"1px solid #181818", borderRadius:"10px", padding:"4px" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, padding:"10px 8px", borderRadius:"7px", fontFamily:"'DM Sans', sans-serif",
                fontSize:"12px", fontWeight:"600", cursor:"pointer", border:"none", transition:"all 0.2s",
                background:tab===t.id?"#1c1c1c":"transparent", color:tab===t.id?WHITE:"#555",
                boxShadow:tab===t.id?"0 1px 8px rgba(0,0,0,0.7)":"none", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==="sms"      && <SMSSimulator/>}
        {tab==="qual"     && <QualLogic/>}
        {tab==="pipeline" && <Pipeline/>}
        {tab==="roi"      && <ROIPanel/>}
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background:"#0a0a0a", borderTop:"1px solid #111", borderBottom:"1px solid #111", padding:"80px 24px" }}>
        <div style={{ maxWidth:"880px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"9px", color:"#2a2a2a", letterSpacing:"3px", marginBottom:"12px" }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"clamp(32px,5vw,52px)",
            color:WHITE, margin:"0 0 12px", letterSpacing:"2px", textShadow:"0 0 12px rgba(255,255,255,0.08)" }}>
            One System. Five AI Agents.
          </h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"16px", color:"#CFCFCF", margin:"0 0 48px", lineHeight:1.6 }}>
            Built to run your lead pipeline around the clock — no staff required.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:"12px", marginBottom:"52px" }}>
            {[
              { n:"01", name:"INTAKE",    icon:"📞", desc:"Answers every call instantly" },
              { n:"02", name:"QUALIFY",   icon:"🔍", desc:"Scores urgency in real time" },
              { n:"03", name:"BOOK",      icon:"📅", desc:"Puts jobs on the calendar" },
              { n:"04", name:"FOLLOW UP", icon:"🔁", desc:"Nurtures every lead automatically" },
              { n:"05", name:"REPORT",    icon:"📊", desc:"Daily ops summary to your phone" },
            ].map((a,i)=>(
              <div key={i} style={{ background:"#0d0d0d", border:"1px solid #141414", borderRadius:"14px", padding:"22px 16px", textAlign:"center" }}>
                <div style={{ fontSize:"28px", marginBottom:"10px" }}>{a.icon}</div>
                <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"8px", color:"#2a2a2a", letterSpacing:"2px", marginBottom:"4px" }}>AGENT {a.n}</div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"18px", color:GOLD, letterSpacing:"2px", marginBottom:"8px" }}>{a.name}</div>
                <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"12px", color:"#CFCFCF", lineHeight:1.55 }}>{a.desc}</div>
              </div>
            ))}
          </div>
          <CTAPrimary style={{ fontSize:"14px", padding:"20px 44px" }}/>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ maxWidth:"680px", margin:"0 auto", padding:"96px 24px", textAlign:"center" }}>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"9px", color:"#1e1e1e", letterSpacing:"3px", marginBottom:"16px" }}>READY TO STOP LOSING JOBS?</div>
        <h2 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"clamp(36px,6vw,72px)",
          color:WHITE, margin:"0 0 18px", letterSpacing:"2px", lineHeight:1, textShadow:"0 0 12px rgba(255,255,255,0.08)" }}>
          Find Out Exactly<br/>
          <span style={{ color:REDB, textShadow:"0 0 8px rgba(255,0,0,0.35)" }}>How Much You're Losing</span>
        </h2>
        <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:"16.5px", color:"#CFCFCF",
          maxWidth:"480px", margin:"0 auto 40px", lineHeight:1.7 }}>
          Enter your missed calls per week and get a real number — your monthly revenue at risk, calculated in 60 seconds.
        </p>
        <CTAPrimary style={{ fontSize:"15px", padding:"22px 52px", letterSpacing:"1.5px" }}/>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"10px", color:"#1c1c1c", marginTop:"18px", letterSpacing:"1px" }}>Free. No pitch. Just the number.</div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid #0d0d0d", padding:"28px 24px", textAlign:"center" }}>
        <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"16px", color:"#1e1e1e", letterSpacing:"3px", marginBottom:"6px" }}>MONKEE BIZZ AI</div>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:"8px", color:"#1e1e1e", letterSpacing:"2px" }}>POWERED BY MANOLOGICS</div>
      </footer>
    </div>
  );
}