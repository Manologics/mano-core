import React, { useState, useEffect, useRef } from "react";

// ─── FONT IMPORT ──────────────────────────────────────────────────────────────
const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #060606; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #080808; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

    @keyframes goldPulse {
      0%, 100% { box-shadow: 0 0 30px #f5c51840, 0 0 60px #f5c51820; }
      50%       { box-shadow: 0 0 50px #f5c51866, 0 0 90px #f5c51833; }
    }
    @keyframes redFlicker {
      0%, 100% { text-shadow: 0 0 12px #e0303066; }
      50%       { text-shadow: 0 0 22px #e03030cc; }
    }
    @keyframes goldText {
      0%, 100% { text-shadow: 0 0 20px #f5c51866, 0 0 40px #f5c51840; }
      50%       { text-shadow: 0 0 35px #f5c518aa, 0 0 60px #f5c51855; }
    }
    .gold-glow-btn {
      animation: goldPulse 2.8s ease-in-out infinite;
    }
    .gold-glow-btn:hover {
      animation: none !important;
      box-shadow: 0 0 70px #f5c518cc, 0 0 130px #f5c51866 !important;
      transform: scale(1.05) !important;
    }
    .gold-glow-btn:focus { outline: none; }
    .red-loss {
      animation: redFlicker 3s ease-in-out infinite;
    }
    .gold-headline {
      animation: goldText 3s ease-in-out infinite;
    }
  `}</style>
);

// ─── COLOR SYSTEM ─────────────────────────────────────────────────────────────
const GOLD  = "#f5c518";
const GOLDD = "#c9a000";
const RED   = "#cc2020";
const REDB  = "#e03030";
const WHITE = "#ffffff";
const LIGHT = "#eaeaea";   // bright body text
const MID   = "#cfcfcf";   // subtext
const DIM   = "#888888";   // muted labels
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
  { label: "Missed Calls / Month",     before: "~40",     after: "0"        },
  { label: "Avg Response Time",        before: "4–6 hrs", after: "< 90 sec" },
  { label: "Leads Auto-Qualified",     before: "Manual",  after: "100%"     },
  { label: "Booking Rate",             before: "35%",     after: "72%"      },
  { label: "Est. Monthly Revenue",     before: "$18K",    after: "$31K"     },
  { label: "Staff Hours Saved / Week", before: "0 hrs",   after: "22 hrs"   },
];

const QUAL_STEPS = [
  { icon: "📞", label: "Call / Text Received",  desc: "Mano picks up instantly — no hold music, no voicemail.",        color: MID   },
  { icon: "🔍", label: "Issue Identified",      desc: "Mano asks the right questions and identifies urgency level.",   color: MID   },
  { icon: "🔥", label: "Lead Scored HOT",       desc: "Same-day urgency + service need = HOT. Escalated immediately.", color: REDB  },
  { icon: "📅", label: "Job Booked",            desc: "Tech dispatched. Customer confirmed. No human needed.",         color: GOLD  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const map = {
    HOT:  [REDB,  "#cc202025"],
    WARM: [GOLD,  "#f5c51820"],
    COLD: [DIM,   "#88888820"],
  };
  const [c, bg] = map[score] || map.COLD;
  return (
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:"9px", fontWeight:"700", color:c, background:bg, border:`1px solid ${c}66`, padding:"2px 7px", borderRadius:"4px", letterSpacing:"1px" }}>
      {score}
    </span>
  );
}

// ─── MISSED CALL ROI CALCULATOR ───────────────────────────────────────────────
// Shared submit logic (used by both inline section and modal)
async function submitROILead({ name, phone, calls, jobValue, monthlyLoss }) {
  await fetch("https://mano-dd309130.base44.app/functions/landingLeadCapture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      phone,
      missedCallsPerWeek: calls,
      jobValue,
      monthlyLoss,
      source: "HVAC ROI Calculator",
    }),
  });
}

// ─── INLINE ROI SECTION (embedded in landing page) ────────────────────────────
function InlineROICalculator({ onOpenModal }) {
  const [calls, setCalls]       = useState("");
  const [jobValue, setJobValue] = useState("500");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const parsed   = parseInt(calls) || 0;
  const parsedJV = parseInt(jobValue) || 500;
  const monthlyLoss = parsed * parsedJV * 4;
  const fmt = (n) => "$" + n.toLocaleString();
  const canCalc = parsed > 0;

  const INP = {
    width:"100%", padding:"14px 16px", borderRadius:"8px",
    background:"#111", border:"1px solid #2a2a2a", color:WHITE,
    fontFamily:"'DM Sans', sans-serif", fontSize:"16px", outline:"none",
    boxSizing:"border-box", transition:"border-color 0.2s",
  };

  function handleCalc() {
    if (!canCalc) return;
    setShowResult(true);
  }

  async function handleSubmit() {
    if (!name || !phone) return;
    setSaving(true);
    try {
      await submitROILead({ name, phone, calls, jobValue, monthlyLoss });
    } catch(e) { console.error("Lead capture failed:", e); }
    setSaving(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{ textAlign:"center", padding:"60px 24px" }}>
        <div style={{ fontSize:"52px", marginBottom:"18px" }}>✅</div>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"11px", color:GREEN, letterSpacing:"3px", marginBottom:"14px" }}>YOU'RE IN</div>
        <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(32px,5vw,48px)", color:WHITE, margin:"0 0 12px", letterSpacing:"1px" }}>
          Expect a Text Shortly.
        </h3>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"16px", color:MID, margin:"0 0 28px", lineHeight:1.75 }}>
          We'll show you exactly how Mano recovers your{" "}
          <strong style={{ color:GOLD }}>{fmt(monthlyLoss)}/month</strong> in missed jobs.
        </p>
        <button
          onClick={()=>window.open(CALENDLY_URL,"_blank")}
          className="gold-glow-btn"
          style={{ padding:"17px 36px", borderRadius:"9px", fontFamily:"'Space Mono',monospace", fontSize:"12px", fontWeight:"700", border:"none", cursor:"pointer", background:`linear-gradient(135deg,${GOLD},${GOLDD})`, color:"#000", letterSpacing:"1px" }}
        >
          BOOK A DEMO NOW →
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:"700px", margin:"0 auto" }}>
      {/* Inputs row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"20px" }}>
        <div>
          <label style={{ display:"block", fontFamily:"'Space Mono',monospace", fontSize:"10px", color:DIM, letterSpacing:"2px", marginBottom:"10px" }}>
            MISSED CALLS / WEEK
          </label>
          <input
            type="number" min="1" placeholder="e.g. 5" value={calls}
            onChange={e=>{ setCalls(e.target.value); setShowResult(false); }}
            style={{ ...INP, border:`1px solid ${calls?GOLD+"55":"#2a2a2a"}`, color:GOLD, fontFamily:"'Bebas Neue',sans-serif", fontSize:"42px", textAlign:"center", padding:"18px 12px" }}
          />
        </div>
        <div>
          <label style={{ display:"block", fontFamily:"'Space Mono',monospace", fontSize:"10px", color:DIM, letterSpacing:"2px", marginBottom:"10px" }}>
            AVG JOB VALUE ($)
          </label>
          <input
            type="number" min="1" placeholder="500" value={jobValue}
            onChange={e=>{ setJobValue(e.target.value); setShowResult(false); }}
            style={{ ...INP, border:`1px solid ${jobValue?"#444":"#2a2a2a"}`, textAlign:"center", fontSize:"22px", fontWeight:"600", color:LIGHT, padding:"18px 12px" }}
          />
        </div>
      </div>

      {!showResult && (
        <button
          onClick={handleCalc}
          disabled={!canCalc}
          className={canCalc?"gold-glow-btn":""}
          style={{ width:"100%", padding:"18px", borderRadius:"9px", fontFamily:"'Space Mono',monospace", fontSize:"13px", fontWeight:"700", border:"none", cursor:canCalc?"pointer":"not-allowed", background:canCalc?`linear-gradient(135deg,${GOLD},${GOLDD})`:"#1a1a1a", color:canCalc?"#000":"#444", letterSpacing:"1px", transition:"all 0.2s" }}
        >
          CALCULATE MY MONTHLY LOSS →
        </button>
      )}

      {/* Result reveal */}
      {showResult && (
        <div>
          {/* Big loss number */}
          <div style={{ background:`linear-gradient(135deg,#0e0808,${RED}18,#0e0808)`, border:`1px solid ${RED}55`, borderRadius:"14px", padding:"32px 24px", textAlign:"center", marginBottom:"16px", boxShadow:`0 0 60px ${RED}18` }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:MID, marginBottom:"12px", letterSpacing:"0.3px" }}>
              Based on your numbers, you could be losing
            </div>
            <div className="red-loss" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(72px,14vw,110px)", color:REDB, lineHeight:1, letterSpacing:"2px", marginBottom:"6px" }}>
              {fmt(monthlyLoss)}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(22px,4vw,32px)", color:WHITE, letterSpacing:"1px", marginBottom:"16px" }}>
              per month.
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:REDB, fontStyle:"italic", fontWeight:"600" }}>
              That's money going to competitors who answered first.
            </div>
            <div style={{ marginTop:"14px", fontFamily:"'Space Mono',monospace", fontSize:"10px", color:DIM, letterSpacing:"1px" }}>
              {fmt(monthlyLoss * 12)}/year · {parsed} missed calls/wk × {fmt(parsedJV)} avg job × 4 weeks
            </div>
          </div>

          {/* Lead capture */}
          <div style={{ background:"#0d0d0d", border:`1px solid ${GOLD}22`, borderRadius:"14px", padding:"28px 24px" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:GOLD, letterSpacing:"3px", marginBottom:"10px" }}>
              RECOVER YOUR LOST JOBS
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:LIGHT, margin:"0 0 20px", lineHeight:1.7 }}>
              Drop your info below and we'll show you exactly how Mano recovers{" "}
              <strong style={{ color:GOLD }}>{fmt(monthlyLoss)}/month</strong> for you — automatically.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
              <input
                type="text" placeholder="Your Name" value={name}
                onChange={e=>setName(e.target.value)}
                style={{ ...INP, border:`1px solid ${name?"#444":"#2a2a2a"}` }}
              />
              <input
                type="tel" placeholder="Mobile Number" value={phone}
                onChange={e=>setPhone(e.target.value)}
                style={{ ...INP, border:`1px solid ${phone?"#444":"#2a2a2a"}` }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!name||!phone||saving}
              className={name&&phone&&!saving?"gold-glow-btn":""}
              style={{ width:"100%", padding:"18px", borderRadius:"9px", fontFamily:"'Space Mono',monospace", fontSize:"13px", fontWeight:"700", border:"none", cursor:name&&phone&&!saving?"pointer":"not-allowed", background:name&&phone&&!saving?`linear-gradient(135deg,${GOLD},${GOLDD})`:"#1a1a1a", color:name&&phone&&!saving?"#000":"#444", letterSpacing:"1px", transition:"all 0.2s" }}
            >
              {saving ? "SENDING..." : "RECOVER MY LOST JOBS →"}
            </button>
            <div style={{ marginTop:"12px", fontFamily:"'Space Mono',monospace", fontSize:"10px", color:DIM, textAlign:"center", letterSpacing:"1px" }}>
              No spam. We'll text you within minutes.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MODAL WRAPPER (nav CTA & hero CTA) ───────────────────────────────────────
function CalculatorModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [calls, setCalls] = useState("");
  const [jobValue, setJobValue] = useState("500");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const monthlyLoss = (parseInt(calls) || 0) * (parseInt(jobValue) || 500) * 4;
  const fmt = (n) => "$" + n.toLocaleString();
  const canNext1 = calls && parseInt(calls) > 0;

  const INP = {
    width:"100%", padding:"14px 16px", borderRadius:"8px",
    background:"#141414", border:"1px solid #333", color:WHITE,
    fontFamily:"'DM Sans', sans-serif", fontSize:"16px", outline:"none",
    boxSizing:"border-box",
  };

  async function handleSubmit() {
    if (!name || !phone) return;
    setSaving(true);
    try {
      await submitROILead({ name, phone, calls, jobValue, monthlyLoss });
    } catch(e) { console.error("Lead capture failed:", e); }
    setSaving(false);
    setSubmitted(true);
  }

  const STEPS = 3;

  return (
    <div
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
    >
      <div style={{ background:"#0c0c0c",border:`1px solid ${GOLD}33`,borderRadius:"18px",padding:"clamp(24px,5vw,40px) clamp(20px,5vw,36px)",maxWidth:"480px",width:"100%",position:"relative",boxShadow:`0 0 80px ${GOLD}18, 0 40px 80px rgba(0,0,0,0.8)` }}>

        {!submitted && (
          <div style={{ display:"flex",gap:"6px",marginBottom:"28px" }}>
            {Array.from({length:STEPS}).map((_,i)=>(
              <div key={i} style={{ flex:1,height:"3px",borderRadius:"99px",background:step>i?`linear-gradient(90deg,${GOLDD},${GOLD})`:"#2a2a2a",transition:"background 0.4s" }}/>
            ))}
          </div>
        )}

        {/* STEP 1 */}
        {step===1 && <>
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"10px",color:GOLD,letterSpacing:"3px",marginBottom:"10px" }}>MISSED CALL ROI CALCULATOR · STEP 1 OF 3</div>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(26px,5vw,34px)",color:WHITE,margin:"0 0 6px",letterSpacing:"1px",lineHeight:1.1 }}>How Many Calls Are You Missing?</h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:MID,margin:"0 0 24px",lineHeight:1.65 }}>Enter your numbers — we'll show you exactly what it's costing you every month.</p>

          <div style={{ display:"flex",flexDirection:"column",gap:"14px",marginBottom:"28px" }}>
            <div>
              <label style={{ display:"block",fontFamily:"'Space Mono',monospace",fontSize:"10px",color:DIM,letterSpacing:"2px",marginBottom:"8px" }}>MISSED CALLS PER WEEK</label>
              <input
                type="number" min="1" placeholder="e.g. 5" value={calls}
                onChange={e=>setCalls(e.target.value)}
                style={{ ...INP, border:`1px solid ${calls?GOLD+"66":"#333"}`, color:GOLD, fontFamily:"'Bebas Neue',sans-serif", fontSize:"40px", textAlign:"center", padding:"20px 16px" }}
              />
            </div>
            <div>
              <label style={{ display:"block",fontFamily:"'Space Mono',monospace",fontSize:"10px",color:DIM,letterSpacing:"2px",marginBottom:"8px" }}>AVERAGE JOB VALUE ($)</label>
              <input
                type="number" min="1" placeholder="500" value={jobValue}
                onChange={e=>setJobValue(e.target.value)}
                style={{ ...INP, textAlign:"center", fontSize:"20px", fontWeight:"600", color:LIGHT }}
              />
            </div>
          </div>

          <button
            onClick={()=>canNext1&&setStep(2)}
            disabled={!canNext1}
            className={canNext1?"gold-glow-btn":""}
            style={{ width:"100%",padding:"17px",borderRadius:"9px",fontFamily:"'Space Mono',monospace",fontSize:"12px",fontWeight:"700",border:"none",cursor:canNext1?"pointer":"not-allowed",background:canNext1?`linear-gradient(135deg,${GOLD},${GOLDD})`:"#1a1a1a",color:canNext1?"#000":"#444",letterSpacing:"1px",transition:"all 0.2s" }}
          >
            CALCULATE MY LOSS →
          </button>
        </>}

        {/* STEP 2 */}
        {step===2 && <>
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"10px",color:REDB,letterSpacing:"3px",marginBottom:"16px" }}>STEP 2 OF 3 — YOUR MONTHLY LOSS</div>

          <div style={{ textAlign:"center",padding:"20px 0 20px" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:MID,marginBottom:"10px" }}>You could be losing</div>
            <div className="red-loss" style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(64px,15vw,100px)",color:REDB,lineHeight:1,letterSpacing:"2px",marginBottom:"6px" }}>
              {fmt(monthlyLoss)}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(20px,3.5vw,28px)",color:WHITE,letterSpacing:"1px",marginBottom:"18px" }}>per month.</div>
          </div>

          <div style={{ background:`linear-gradient(135deg,${RED}18,#080404)`,border:`1px solid ${RED}44`,borderRadius:"10px",padding:"16px 18px",marginBottom:"28px",boxShadow:`0 0 28px ${RED}14` }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:LIGHT,fontWeight:"500",lineHeight:1.65 }}>
              That's money going to competitors who answered first.{" "}
              <strong style={{ color:REDB }}>{fmt(monthlyLoss * 12)}/year</strong> — gone.
            </div>
          </div>

          <button
            onClick={()=>setStep(3)}
            className="gold-glow-btn"
            style={{ width:"100%",padding:"17px",borderRadius:"9px",fontFamily:"'Space Mono',monospace",fontSize:"12px",fontWeight:"700",border:"none",cursor:"pointer",background:`linear-gradient(135deg,${GOLD},${GOLDD})`,color:"#000",letterSpacing:"1px" }}
          >
            RECOVER MY LOST JOBS →
          </button>
          <button onClick={()=>setStep(1)} style={{ width:"100%",marginTop:"10px",padding:"10px",background:"transparent",border:"none",color:DIM,fontFamily:"'DM Sans',sans-serif",fontSize:"13px",cursor:"pointer" }}>← Edit numbers</button>
        </>}

        {/* STEP 3 */}
        {step===3 && !submitted && <>
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"10px",color:GOLD,letterSpacing:"3px",marginBottom:"10px" }}>STEP 3 OF 3 — LOCK IN YOUR RECOVERY</div>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(24px,5vw,32px)",color:WHITE,margin:"0 0 6px",letterSpacing:"1px",lineHeight:1.1 }}>Where Should We Send Your Recovery Plan?</h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:MID,margin:"0 0 22px",lineHeight:1.65 }}>
            We'll reach out and show you how Mano recovers your{" "}
            <strong style={{ color:GOLD }}>{fmt(monthlyLoss)}/mo</strong> in missed jobs.
          </p>

          <div style={{ display:"flex",flexDirection:"column",gap:"12px",marginBottom:"22px" }}>
            <input type="text" placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)} style={INP} />
            <input type="tel" placeholder="Mobile Number" value={phone} onChange={e=>setPhone(e.target.value)} style={INP} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name||!phone||saving}
            className={name&&phone&&!saving?"gold-glow-btn":""}
            style={{ width:"100%",padding:"17px",borderRadius:"9px",fontFamily:"'Space Mono',monospace",fontSize:"12px",fontWeight:"700",border:"none",cursor:name&&phone&&!saving?"pointer":"not-allowed",background:name&&phone&&!saving?`linear-gradient(135deg,${GOLD},${GOLDD})`:"#1a1a1a",color:name&&phone&&!saving?"#000":"#444",letterSpacing:"1px",transition:"all 0.2s" }}
          >
            {saving ? "SENDING..." : "RECOVER MY LOST JOBS →"}
          </button>
          <div style={{ marginTop:"10px",fontFamily:"'Space Mono',monospace",fontSize:"10px",color:DIM,textAlign:"center",letterSpacing:"1px" }}>No spam. We'll text you within minutes.</div>
          <button onClick={()=>setStep(2)} style={{ width:"100%",marginTop:"8px",padding:"8px",background:"transparent",border:"none",color:DIM,fontFamily:"'DM Sans',sans-serif",fontSize:"13px",cursor:"pointer" }}>← Back</button>
        </>}

        {/* SUCCESS */}
        {submitted && <>
          <div style={{ textAlign:"center",padding:"20px 0" }}>
            <div style={{ fontSize:"48px",marginBottom:"16px" }}>✅</div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"10px",color:GREEN,letterSpacing:"3px",marginBottom:"12px" }}>YOU'RE IN</div>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(28px,6vw,40px)",color:WHITE,margin:"0 0 10px",letterSpacing:"1px" }}>Expect a Text Shortly.</h2>
            <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:MID,margin:"0 0 28px",lineHeight:1.7 }}>
              We'll show you exactly how Mano recovers your{" "}
              <strong style={{ color:GOLD }}>{fmt(monthlyLoss)}/month</strong> in missed jobs.
            </p>
            <button
              onClick={()=>{window.open(CALENDLY_URL,"_blank");onClose();}}
              className="gold-glow-btn"
              style={{ width:"100%",padding:"17px",borderRadius:"9px",fontFamily:"'Space Mono',monospace",fontSize:"11px",fontWeight:"700",border:"none",cursor:"pointer",background:`linear-gradient(135deg,${GOLD},${GOLDD})`,color:"#000",letterSpacing:"1px" }}
            >
              BOOK A DEMO NOW →
            </button>
          </div>
        </>}

        <button onClick={onClose} style={{ position:"absolute",top:"16px",right:"20px",background:"none",border:"none",color:DIM,fontSize:"22px",cursor:"pointer",lineHeight:1,transition:"color 0.2s" }} onMouseEnter={e=>e.currentTarget.style.color=WHITE} onMouseLeave={e=>e.currentTarget.style.color=DIM}>✕</button>
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
    <div style={{ background:"#0d0d0d",border:"1px solid #222",borderRadius:"16px",overflow:"hidden" }}>
      <div style={{ background:"#111",borderBottom:"1px solid #222",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
          <div style={{ width:"38px",height:"38px",borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLDD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0,boxShadow:`0 0 16px ${GOLD}55` }}>🤖</div>
          <div>
            <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"14px",fontWeight:"700",color:WHITE }}>Mano — AI Intake Agent</div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:GREEN }}>● Online · Responding instantly</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:DIM,letterSpacing:"2px" }}>LIVE SIMULATION</div>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:DIM,letterSpacing:"1px" }}>HVAC SCENARIO</div>
        </div>
      </div>

      <div style={{ height:"360px",overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"14px",background:"#080808" }}>
        {visible.length===0&&!running&&(
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px" }}>
            <div style={{ fontSize:"36px" }}>💬</div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:DIM,textAlign:"center",letterSpacing:"1px",lineHeight:2 }}>
              PRESS RUN TO WATCH MANO<br/>QUALIFY AND BOOK A REAL HVAC LEAD
            </div>
          </div>
        )}
        {visible.map((m,i)=>(
          <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:m.from==="ai"?"flex-start":"flex-end" }}>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:DIM,marginBottom:"4px",marginLeft:m.from==="ai"?"2px":0,marginRight:m.from!=="ai"?"2px":0 }}>
              {m.from==="ai"?"Mano":"Marcus"}
            </div>
            <div style={{ maxWidth:"78%",padding:"12px 16px",borderRadius:m.from==="ai"?"4px 16px 16px 16px":"16px 4px 16px 16px",background:m.from==="ai"?"#1a1a1a":`${GOLD}14`,border:m.from==="ai"?"1px solid #2a2a2a":`1px solid ${GOLD}44`,fontFamily:"'DM Sans', sans-serif",fontSize:"14px",color:m.from==="ai"?LIGHT:GOLD,lineHeight:1.65 }}>
              {m.text}
            </div>
          </div>
        ))}
        {running&&visible.length>0&&visible[visible.length-1].from==="lead"&&(
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-start" }}>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:DIM,marginBottom:"4px",marginLeft:"2px" }}>Mano</div>
            <div style={{ padding:"12px 18px",borderRadius:"4px 16px 16px 16px",background:"#1a1a1a",border:"1px solid #2a2a2a" }}>
              <span style={{ fontSize:"20px",letterSpacing:"3px",color:DIM }}>···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{ background:"#111",borderTop:"1px solid #222",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          {done&&<div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
            <span style={{ fontSize:"16px" }}>✅</span>
            <span style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:GOLD,fontWeight:"600" }}>Lead qualified & booked in under 3 minutes</span>
          </div>}
        </div>
        <button onClick={run} disabled={running} className={!running?"gold-glow-btn":""} style={{ padding:"10px 22px",borderRadius:"7px",fontFamily:"'Space Mono', monospace",fontSize:"11px",fontWeight:"700",letterSpacing:"1px",cursor:running?"not-allowed":"pointer",background:running?"#1a1a1a":`linear-gradient(135deg,${GOLD},${GOLDD})`,color:running?"#555":"#000",border:"none",transition:"background 0.2s" }}>
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
          style={{ background:active===i?"#141414":"#0d0d0d",border:`1px solid ${active===i?s.color+"66":"#222"}`,borderRadius:"14px",padding:"22px 20px",cursor:"pointer",transition:"all 0.25s",boxShadow:active===i&&s.color===GOLD?`0 0 20px ${GOLD}22`:active===i&&s.color===REDB?`0 0 20px ${RED}22`:"none" }}
        >
          <div style={{ fontSize:"28px",marginBottom:"12px" }}>{s.icon}</div>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:active===i?"10px":"0" }}>
            <div style={{ width:"20px",height:"20px",borderRadius:"50%",background:`${s.color}22`,border:`1px solid ${s.color}66`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:s.color,fontWeight:"700" }}>{i+1}</span>
            </div>
            <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"14px",fontWeight:"700",color:WHITE }}>{s.label}</div>
          </div>
          {active===i&&<div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:MID,lineHeight:1.65,marginTop:"8px" }}>{s.desc}</div>}
          {active!==i&&<div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:DIM,marginTop:"6px",letterSpacing:"0.5px" }}>tap to expand</div>}
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
  const stageColors = { New:"#777", Contacted:MID, Qualified:GOLD, Booked:GOLD };

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
              <div style={{ background:`${c}22`,border:`1px solid ${c}55`,borderRadius:"10px",padding:"1px 8px",fontFamily:"'Space Mono', monospace",fontSize:"9px",color:c }}>{stageLeads.length}</div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",minHeight:"60px" }}>
              {stageLeads.map(l=>(
                <div key={l.id} style={{ background:"#111",border:"1px solid #222",borderRadius:"10px",padding:"12px",opacity:moving===l.id?0.3:1,transition:"opacity 0.3s",boxShadow:stage==="Booked"?`0 0 12px ${GOLD}18`:"none" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px" }}>
                    <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",fontWeight:"700",color:WHITE }}>{l.name}</div>
                    <ScoreBadge score={l.score}/>
                  </div>
                  <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"11px",color:MID,marginBottom:"2px",lineHeight:1.4 }}>{l.issue}</div>
                  <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:DIM,marginBottom:"10px" }}>{l.time}</div>
                  {stage!=="Booked"&&(
                    <button onClick={()=>advance(l.id)} style={{ width:"100%",padding:"6px",borderRadius:"5px",fontFamily:"'Space Mono', monospace",fontSize:"9px",fontWeight:"700",cursor:"pointer",background:"transparent",border:`1px solid ${stageColors[nextStage]}55`,color:stageColors[nextStage],letterSpacing:"0.5px",transition:"all 0.2s" }}>
                      → {nextStage.toUpperCase()}
                    </button>
                  )}
                  {stage==="Booked"&&<div style={{ textAlign:"center",fontFamily:"'Space Mono', monospace",fontSize:"9px",color:GOLD,letterSpacing:"1px",textShadow:`0 0 8px ${GOLD}88` }}>✓ BOOKED</div>}
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
      <div style={{ background:`linear-gradient(135deg,${RED}18,#0a0808,${RED}0a)`,border:`1px solid ${RED}44`,borderRadius:"16px",padding:"40px 32px",textAlign:"center",marginBottom:"16px",boxShadow:`0 0 50px ${RED}14` }}>
        <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:REDB,letterSpacing:"3px",marginBottom:"14px" }}>IF YOU MISS JUST 5 CALLS A WEEK</div>
        <div className="red-loss" style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(56px,10vw,104px)",color:REDB,lineHeight:1,marginBottom:"10px",letterSpacing:"3px" }}>$2K–$5K</div>
        <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"17px",color:LIGHT,fontWeight:"500",marginBottom:"20px" }}>
          drained from your business — <span style={{ color:REDB,fontWeight:"700" }}>every single month</span>
        </div>
        <div style={{ display:"inline-block",background:`${GOLD}14`,border:`1px solid ${GOLD}44`,borderRadius:"8px",padding:"12px 24px",boxShadow:`0 0 20px ${GOLD}18` }}>
          <span style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"14px",color:GOLD,fontWeight:"700" }}>Mano recovers every one of those calls. Automatically.</span>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:"10px" }}>
        {ROI_ITEMS.map(r=>(
          <div key={r.label} style={{ background:"#0f0f0f",border:`1px solid ${GOLD}22`,borderRadius:"12px",padding:"20px",boxShadow:`0 0 16px ${GOLD}0a` }}>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:MID,letterSpacing:"1px",marginBottom:"10px" }}>{r.label}</div>
            <div style={{ display:"flex",alignItems:"baseline",gap:"12px" }}>
              <span style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"13px",color:REDB,textDecoration:"line-through",opacity:0.85 }}>{r.before}</span>
              <span className="gold-headline" style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"34px",color:GOLD,lineHeight:1,letterSpacing:"1px" }}>{r.after}</span>
            </div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:DIM,marginTop:"4px",letterSpacing:"0.5px" }}>with Monkee Bizz AI</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION DIVIDER ─────────────────────────────────────────────────────────
function Divider({ color = GOLD, opacity = 0.12 }) {
  const c = color === "red" ? REDB : GOLD;
  return (
    <div style={{ maxWidth:"880px",margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",gap:"14px" }}>
      <div style={{ flex:1,height:"1px",background:`linear-gradient(90deg,transparent,${c}${Math.round(opacity*255).toString(16).padStart(2,"0")},transparent)` }}/>
      <div style={{ width:"5px",height:"5px",borderRadius:"50%",background:c,boxShadow:`0 0 10px 2px ${c}66`,opacity:0.7 }}/>
      <div style={{ flex:1,height:"1px",background:`linear-gradient(90deg,transparent,${c}${Math.round(opacity*255).toString(16).padStart(2,"0")},transparent)` }}/>
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

  function CTAPrimary({ style: extraStyle = {} }) {
    return (
      <button
        onClick={()=>setShowModal(true)}
        className="gold-glow-btn"
        style={{
          background: `linear-gradient(135deg, ${GOLD}, ${GOLDD})`,
          color: "#000",
          border: "none",
          padding: "17px 36px",
          borderRadius: "9px",
          fontFamily: "'Space Mono', monospace",
          fontSize: "12px",
          fontWeight: "700",
          cursor: "pointer",
          letterSpacing: "1px",
          transition: "transform 0.2s, box-shadow 0.2s",
          ...extraStyle
        }}
      >
        CALCULATE MY MISSED CALL LOSSES →
      </button>
    );
  }

  function CTASecondary({ style: extraStyle = {} }) {
    return (
      <button
        onClick={()=>setShowModal(true)}
        style={{ background:"transparent",color:MID,border:`1px solid #333`,padding:"16px 28px",borderRadius:"9px",fontFamily:"'DM Sans', sans-serif",fontSize:"14px",fontWeight:"600",cursor:"pointer",transition:"all 0.2s",...extraStyle }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor=GOLD+"66"; e.currentTarget.style.color=GOLD; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor="#333"; e.currentTarget.style.color=MID; }}
      >
        Book a Demo
      </button>
    );
  }

  return (
    <div style={{ minHeight:"100vh",background:"#060606",color:LIGHT }}>
      <FontStyle/>
      {showModal&&<CalculatorModal onClose={()=>setShowModal(false)}/>}

      {/* ── NAV ── */}
      <nav style={{ borderBottom:"1px solid #181818",padding:"18px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"rgba(6,6,6,0.97)",backdropFilter:"blur(14px)",zIndex:100 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"22px",color:WHITE,letterSpacing:"3px" }}>MONKEE BIZZ AI</div>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"8px",color:GREEN,letterSpacing:"3px",marginTop:"-1px" }}>POWERED BY MANOLOGICS</div>
        </div>
        <button
          onClick={()=>setShowModal(true)}
          className="gold-glow-btn"
          style={{ background:`linear-gradient(135deg,${GOLD},${GOLDD})`,color:"#000",border:"none",padding:"10px 22px",borderRadius:"7px",fontFamily:"'Space Mono', monospace",fontSize:"10px",fontWeight:"700",cursor:"pointer",letterSpacing:"1px" }}
        >
          ROI CALCULATOR
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{ maxWidth:"880px",margin:"0 auto",padding:"92px 24px 64px",textAlign:"center" }}>

        <div style={{ display:"inline-block",background:`${RED}16`,border:`1px solid ${RED}55`,borderRadius:"20px",padding:"5px 18px",marginBottom:"28px",boxShadow:`0 0 16px ${RED}18` }}>
          <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:REDB,letterSpacing:"3px" }}>FOR HVAC CONTRACTORS</span>
        </div>

        <h1 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(52px,9vw,108px)",color:WHITE,lineHeight:0.95,margin:"0 0 24px",letterSpacing:"2px",textShadow:"0 0 40px rgba(255,255,255,0.06)" }}>
          Turn <span className="red-loss" style={{ color:REDB }}>Missed Calls</span><br/>
          Into <span className="gold-headline" style={{ color:GOLD }}>Booked Jobs</span><br/>
          <span style={{ fontSize:"clamp(30px,5vw,58px)",color:MID,letterSpacing:"1px" }}>
            Before Your <span style={{ color:REDB,textShadow:`0 0 16px ${RED}66` }}>Competitors</span> Do
          </span>
        </h1>

        <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"16px",color:REDB,maxWidth:"480px",margin:"0 auto 18px",lineHeight:1.65,fontWeight:"600",fontStyle:"italic" }}>
          While you're missing calls, your competitors are closing them.
        </p>

        <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"18px",color:LIGHT,maxWidth:"500px",margin:"0 auto 16px",lineHeight:1.8,fontWeight:"400" }}>
          Mano responds in seconds, qualifies the lead, and books the job — automatically.
        </p>

        <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"15px",color:MID,maxWidth:"420px",margin:"0 auto 48px",lineHeight:1.65 }}>
          Miss just 5 calls a week? That's{" "}
          <strong style={{ color:REDB }}>$2,000–$5,000 in lost jobs</strong> every month.
        </p>

        <div style={{ display:"flex",gap:"14px",justifyContent:"center",flexWrap:"wrap",marginBottom:"16px" }}>
          <CTAPrimary/>
          <CTASecondary/>
        </div>
        <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:DIM,letterSpacing:"1px" }}>Free 30-min walkthrough. No pressure.</div>
      </section>

      <Divider color="red" opacity={0.1}/>

      {/* ── PAIN DIVIDER ── */}
      <div style={{ maxWidth:"880px",margin:"0 auto 72px",padding:"0 24px" }}>
        <div style={{ background:`linear-gradient(135deg,${RED}18,#0c0808 60%,${RED}0c)`,border:`1px solid ${RED}44`,borderRadius:"14px",padding:"28px 36px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"24px",boxShadow:`0 0 50px ${RED}14` }}>
          <div style={{ flex:1,minWidth:"220px" }}>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:REDB,letterSpacing:"2px",marginBottom:"8px" }}>THE PROBLEM</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(22px,3.5vw,34px)",color:WHITE,letterSpacing:"1px",lineHeight:1.1,textShadow:"0 0 20px rgba(255,255,255,0.06)" }}>
              Every missed call is a job your{" "}
              <span style={{ color:REDB,textShadow:`0 0 14px ${RED}88` }}>competitor</span>{" "}books.
            </div>
          </div>
          <div style={{ textAlign:"center",padding:"0 8px" }}>
            <div className="red-loss" style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(48px,7vw,80px)",color:WHITE,lineHeight:1,textShadow:`0 0 20px ${REDB}` }}>73%</div>
            <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:MID,letterSpacing:"1px",marginTop:"6px",maxWidth:"160px" }}>of callers won't leave a voicemail</div>
          </div>
        </div>
      </div>

      {/* ── MISSED CALL ROI CALCULATOR ── */}
      <section style={{ maxWidth:"980px",margin:"0 auto",padding:"72px 24px" }}>
        <div style={{ textAlign:"center",marginBottom:"44px" }}>
          <div style={{ display:"inline-block",background:`${RED}16`,border:`1px solid ${RED}44`,borderRadius:"20px",padding:"5px 18px",marginBottom:"16px",boxShadow:`0 0 16px ${RED}14` }}>
            <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:REDB,letterSpacing:"3px" }}>MISSED CALL ROI CALCULATOR</span>
          </div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(36px,6vw,64px)",color:WHITE,margin:"0 0 14px",letterSpacing:"2px",lineHeight:1,textShadow:"0 0 30px rgba(255,255,255,0.06)" }}>
            See Exactly What You're Losing
          </h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"17px",color:MID,maxWidth:"460px",margin:"0 auto",lineHeight:1.75 }}>
            Enter two numbers. We'll show you the real dollar cost of every missed call — then show you how to get it back.
          </p>
        </div>
        <InlineROICalculator/>
      </section>

      <Divider opacity={0.1}/>

      {/* ── WATCH YOUR AI EMPLOYEE WORK ── */}
      <section style={{ maxWidth:"980px",margin:"0 auto",padding:"0 24px 80px" }}>
        <div style={{ textAlign:"center",marginBottom:"40px" }}>
          <div style={{ display:"inline-block",background:`${GREEN}12`,border:`1px solid ${GREEN}33`,borderRadius:"20px",padding:"5px 16px",marginBottom:"14px" }}>
            <span style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:GREEN,letterSpacing:"3px" }}>● LIVE DEMO</span>
          </div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(32px,5vw,58px)",color:WHITE,margin:"0 0 14px",letterSpacing:"2px",textShadow:"0 0 30px rgba(255,255,255,0.06)" }}>
            Watch Your AI Employee Work
          </h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"16px",color:MID,maxWidth:"480px",margin:"0 auto",lineHeight:1.75 }}>
            See exactly how Mano handles an inbound HVAC lead — from first contact to{" "}
            <span style={{ color:GOLD,fontWeight:"600" }}>booked job</span> — without a single human involved.
          </p>
        </div>

        <div style={{ display:"flex",gap:"4px",marginBottom:"20px",background:"#0d0d0d",border:"1px solid #222",borderRadius:"10px",padding:"4px" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"10px 8px",borderRadius:"7px",fontFamily:"'DM Sans', sans-serif",fontSize:"12px",fontWeight:"600",cursor:"pointer",border:"none",transition:"all 0.2s",background:tab===t.id?"#1e1e1e":"transparent",color:tab===t.id?WHITE:DIM,boxShadow:tab===t.id?"0 1px 8px rgba(0,0,0,0.7)":"none",whiteSpace:"nowrap" }}>
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
      <section style={{ background:"#0a0a0a",borderTop:"1px solid #181818",borderBottom:"1px solid #181818",padding:"72px 24px" }}>
        <div style={{ maxWidth:"880px",margin:"0 auto",textAlign:"center" }}>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:DIM,letterSpacing:"3px",marginBottom:"12px" }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(32px,5vw,52px)",color:WHITE,margin:"0 0 12px",letterSpacing:"2px",textShadow:"0 0 30px rgba(255,255,255,0.06)" }}>One System. Five AI Agents.</h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"15px",color:MID,margin:"0 0 44px" }}>Built to run your lead pipeline around the clock — no staff required.</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"12px" }}>
            {[
              { n:"01", name:"INTAKE",  icon:"📞", desc:"Answers every call instantly" },
              { n:"02", name:"QUALIFY", icon:"🔍", desc:"Scores urgency in real time" },
              { n:"03", name:"BOOK",    icon:"📅", desc:"Confirms appointment automatically" },
              { n:"04", name:"FOLLOW",  icon:"🔁", desc:"Chases cold leads automatically" },
              { n:"05", name:"REPORT",  icon:"📊", desc:"Daily ops summary, always on" },
            ].map(a=>(
              <div key={a.n}
                style={{ background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:"12px",padding:"24px 14px",textAlign:"center",transition:"all 0.25s",cursor:"default" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${GOLD}55`; e.currentTarget.style.boxShadow=`0 0 20px ${GOLD}14`; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="#1e1e1e"; e.currentTarget.style.boxShadow="none"; }}
              >
                <div style={{ fontSize:"24px",marginBottom:"10px" }}>{a.icon}</div>
                <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"9px",color:DIM,marginBottom:"4px",letterSpacing:"1px" }}>AGENT {a.n}</div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"20px",color:GOLD,marginBottom:"8px",letterSpacing:"2px",textShadow:`0 0 10px ${GOLD}44` }}>{a.name}</div>
                <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"12px",color:MID,lineHeight:1.55 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider opacity={0.1}/>

      {/* ── BOTTOM CTA ── */}
      <section style={{ padding:"96px 24px",textAlign:"center" }}>
        <div style={{ maxWidth:"580px",margin:"0 auto" }}>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"10px",color:DIM,letterSpacing:"3px",marginBottom:"18px" }}>STOP LEAVING MONEY ON THE TABLE</div>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"clamp(40px,6.5vw,68px)",color:WHITE,margin:"0 0 16px",letterSpacing:"2px",lineHeight:0.95,textShadow:"0 0 30px rgba(255,255,255,0.06)" }}>
            Ready to Stop <span className="red-loss" style={{ color:REDB }}>Losing</span> Jobs<br/>
            and Start <span className="gold-headline" style={{ color:GOLD }}>Booking</span> Them?
          </h2>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"16px",color:LIGHT,margin:"0 0 12px",lineHeight:1.75 }}>
            Book a free 30-minute demo. We'll show you exactly how Mano works — and what it's costing you every day you wait.
          </p>
          <p style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"14px",color:REDB,margin:"0 0 36px",fontStyle:"italic",fontWeight:"500" }}>
            While you're reading this, your competitors are answering your leads.
          </p>
          <div style={{ display:"flex",gap:"14px",justifyContent:"center",flexWrap:"wrap" }}>
            <CTAPrimary/>
            <CTASecondary/>
          </div>
          <div style={{ marginTop:"18px",fontFamily:"'Space Mono', monospace",fontSize:"10px",color:DIM,letterSpacing:"1px" }}>Free 30-min walkthrough. No pressure.</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:"1px solid #1a1a1a",padding:"24px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px" }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:"16px",color:MID,letterSpacing:"3px" }}>MONKEE BIZZ AI</div>
          <div style={{ fontFamily:"'Space Mono', monospace",fontSize:"8px",color:DIM,letterSpacing:"2px" }}>POWERED BY MANOLOGICS</div>
        </div>
        <div style={{ fontFamily:"'DM Sans', sans-serif",fontSize:"11px",color:DIM }}>© 2026 Monkee Bizz AI. All rights reserved.</div>
      </footer>
    </div>
  );
}