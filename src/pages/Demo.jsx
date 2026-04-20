import React, { useState, useEffect, useRef } from "react";

const CALENDLY_URL = "https://calendly.com/monkee-bizznus/30min";

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const MOCK_LEADS = [
  { id: 1, name: "Marcus Webb",    phone: "(602) 555-0182", issue: "AC not cooling",       status: "New",       score: "HOT",  time: "2 min ago" },
  { id: 2, name: "Sandra Ortiz",  phone: "(480) 555-0247", issue: "No heat - system dead", status: "Qualified", score: "HOT",  time: "14 min ago" },
  { id: 3, name: "Derek Lane",    phone: "(623) 555-0391", issue: "Thermostat issue",      status: "Qualified", score: "WARM", time: "31 min ago" },
  { id: 4, name: "Tonya Simms",   phone: "(602) 555-0518", issue: "Annual tune-up",        status: "Booked",    score: "WARM", time: "1 hr ago" },
  { id: 5, name: "James Pruitt",  phone: "(480) 555-0663", issue: "Weird noise - unit",    status: "New",       score: "HOT",  time: "1 hr ago" },
  { id: 6, name: "Lena Figueroa", phone: "(623) 555-0774", issue: "Filter replacement",    status: "Booked",    score: "COLD", time: "2 hrs ago" },
];

const SMS_SCRIPT = [
  { from: "ai",  text: "Hi Marcus! This is Aria from Valley Cool HVAC 👋 I see you just reached out — your AC isn't cooling. Is that right?" },
  { from: "lead", text: "Yeah it's not blowing cold at all. It's 108 outside lol" },
  { from: "ai",  text: "Oof, that's urgent 🌡️ I've got you. Quick question — is the fan running but just blowing warm air, or is the system not turning on at all?" },
  { from: "lead", text: "Fan is running, just warm air" },
  { from: "ai",  text: "Got it — sounds like it could be the refrigerant or a compressor issue. Our tech can diagnose it same-day. Does this afternoon work, say 2–5 PM?" },
  { from: "lead", text: "Yes please! 2pm would be perfect" },
  { from: "ai",  text: "✅ Booked! Tech arriving between 2–3 PM today. You'll get a text 30 min before arrival. Anything else you need?" },
  { from: "lead", text: "No that's great, thank you so much!" },
  { from: "ai",  text: "You're all set, Marcus 🙌 We'll take care of you. Stay cool!" },
];

const ROI = [
  { label: "Missed Calls / Month",   before: "~40",   after: "0",      color: "#00ff88" },
  { label: "Avg Response Time",      before: "4–6 hrs", after: "< 90s", color: "#00ff88" },
  { label: "Leads Qualified / Month",before: "Manual", after: "Auto",   color: "#ffdd00" },
  { label: "Booking Rate",           before: "35%",   after: "72%",    color: "#00ff88" },
  { label: "Est. Monthly Revenue",   before: "$18K",  after: "$31K",   color: "#00ff88" },
  { label: "Hours Saved / Week",     before: "0",     after: "22 hrs", color: "#ffdd00" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const map = { HOT: ["#ff4444","#ff000018"], WARM: ["#ffdd00","#ffdd0018"], COLD: ["#666","#66666618"] };
  const [c, bg] = map[score] || map.COLD;
  return (
    <span style={{ fontFamily:"monospace", fontSize:"9px", fontWeight:"700", color:c, background:bg, border:`1px solid ${c}44`, padding:"2px 7px", borderRadius:"4px", letterSpacing:"1px" }}>
      {score}
    </span>
  );
}

function StatusPill({ status }) {
  const map = { New: "#555", Qualified: "#ffdd00", Booked: "#00ff88" };
  const c = map[status] || "#555";
  return (
    <span style={{ fontSize:"11px", color:c, fontWeight:"600" }}>● {status}</span>
  );
}

// ─── PRE-QUAL MODAL ──────────────────────────────────────────────────────────
function PreQualModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState("");
  const [vol, setVol] = useState("");

  const bizOpts = ["HVAC Contractor", "HVAC Dealer / Distributor", "HVAC Service Company", "Other Home Services"];
  const volOpts = ["Under 50 calls/mo", "50–150 calls/mo", "150–300 calls/mo", "300+ calls/mo"];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" }}>
      <div style={{ background:"#0f0f0f", border:"1px solid #222", borderRadius:"16px", padding:"36px 32px", maxWidth:"420px", width:"100%", position:"relative" }}>
        {/* progress */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"28px" }}>
          {[1,2].map(s => <div key={s} style={{ flex:1, height:"3px", borderRadius:"2px", background:step>=s?"#00ff88":"#1c1c1c", transition:"background 0.3s" }} />)}
        </div>

        {step === 1 && <>
          <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#00ff88", letterSpacing:"3px", marginBottom:"8px" }}>STEP 1 OF 2</div>
          <h2 style={{ fontSize:"20px", fontWeight:"700", color:"#fff", margin:"0 0 6px" }}>What describes your business?</h2>
          <p style={{ fontSize:"13px", color:"#555", margin:"0 0 22px" }}>We'll tailor the demo to your operation.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"24px" }}>
            {bizOpts.map(o => (
              <button key={o} onClick={() => setBiz(o)} style={{ padding:"12px 16px", borderRadius:"8px", textAlign:"left", fontSize:"13px", fontWeight:"500", cursor:"pointer", transition:"all 0.2s", background:biz===o?"rgba(0,255,136,0.1)":"#141414", border:biz===o?"1px solid #00ff88":"1px solid #222", color:biz===o?"#00ff88":"#777" }}>
                {o}
              </button>
            ))}
          </div>
          <button onClick={() => biz && setStep(2)} style={{ width:"100%", padding:"14px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:biz?"pointer":"not-allowed", background:biz?"#00ff88":"#1a1a1a", color:biz?"#000":"#333", border:"none" }}>
            NEXT →
          </button>
        </>}

        {step === 2 && <>
          <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#00ff88", letterSpacing:"3px", marginBottom:"8px" }}>STEP 2 OF 2</div>
          <h2 style={{ fontSize:"20px", fontWeight:"700", color:"#fff", margin:"0 0 6px" }}>Monthly inbound call volume?</h2>
          <p style={{ fontSize:"13px", color:"#555", margin:"0 0 22px" }}>Helps us show you accurate ROI numbers.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"24px" }}>
            {volOpts.map(o => (
              <button key={o} onClick={() => setVol(o)} style={{ padding:"12px 16px", borderRadius:"8px", textAlign:"left", fontSize:"13px", fontWeight:"500", cursor:"pointer", transition:"all 0.2s", background:vol===o?"rgba(0,255,136,0.1)":"#141414", border:vol===o?"1px solid #00ff88":"1px solid #222", color:vol===o?"#00ff88":"#777" }}>
                {o}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={() => setStep(1)} style={{ padding:"14px 18px", borderRadius:"8px", fontSize:"12px", cursor:"pointer", background:"transparent", border:"1px solid #222", color:"#555" }}>← Back</button>
            <button onClick={() => { if(vol) { window.open(CALENDLY_URL,"_blank"); onClose(); }}} style={{ flex:1, padding:"14px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:vol?"pointer":"not-allowed", background:vol?"#00ff88":"#1a1a1a", color:vol?"#000":"#333", border:"none" }}>
              BOOK MY DEMO →
            </button>
          </div>
        </>}

        <button onClick={onClose} style={{ position:"absolute", top:"14px", right:"18px", background:"none", border:"none", color:"#333", fontSize:"22px", cursor:"pointer" }}>✕</button>
      </div>
    </div>
  );
}

// ─── SMS SIMULATOR ───────────────────────────────────────────────────────────
function SMSDemo() {
  const [visible, setVisible] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior:"smooth" });
  }, [visible]);

  function runDemo() {
    if (running) return;
    setRunning(true);
    setVisible([]);
    setDone(false);
    let i = 0;
    function next() {
      if (i >= SMS_SCRIPT.length) { setRunning(false); setDone(true); return; }
      const delay = SMS_SCRIPT[i].from === "ai" ? 900 : 1600;
      setTimeout(() => {
        setVisible(v => [...v, SMS_SCRIPT[i]]);
        i++;
        next();
      }, delay);
    }
    next();
  }

  return (
    <div style={{ background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:"16px", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ background:"#111", borderBottom:"1px solid #1a1a1a", padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"linear-gradient(135deg,#00ff88,#00cc66)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" }}>🤖</div>
          <div>
            <div style={{ fontSize:"13px", fontWeight:"600", color:"#fff" }}>Aria — AI Intake Agent</div>
            <div style={{ fontSize:"11px", color:"#00ff88" }}>● Online · Responding now</div>
          </div>
        </div>
        <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#333", letterSpacing:"2px" }}>LIVE DEMO</div>
      </div>

      {/* Chat window */}
      <div style={{ height:"340px", overflowY:"auto", padding:"18px", display:"flex", flexDirection:"column", gap:"12px", background:"#080808" }}>
        {visible.length === 0 && !running && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontSize:"11px", color:"#2a2a2a", textAlign:"center", lineHeight:1.8 }}>
            HIT "RUN DEMO" TO SEE<br/>THE AI QUALIFY A LIVE LEAD
          </div>
        )}
        {visible.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.from==="ai"?"flex-start":"flex-end" }}>
            <div style={{
              maxWidth:"78%", padding:"11px 14px", borderRadius:m.from==="ai"?"4px 14px 14px 14px":"14px 4px 14px 14px",
              background:m.from==="ai"?"#1a1a1a":"rgba(0,255,136,0.12)",
              border:m.from==="ai"?"1px solid #222":"1px solid rgba(0,255,136,0.2)",
              fontSize:"13px", color:m.from==="ai"?"#ccc":"#00ff88", lineHeight:1.6
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {running && visible.length > 0 && visible[visible.length-1].from === "lead" && (
          <div style={{ display:"flex", justifyContent:"flex-start" }}>
            <div style={{ padding:"11px 16px", borderRadius:"4px 14px 14px 14px", background:"#1a1a1a", border:"1px solid #222" }}>
              <span style={{ fontSize:"18px", letterSpacing:"2px", color:"#555" }}>···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div style={{ background:"#111", borderTop:"1px solid #1a1a1a", padding:"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {done && (
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"14px" }}>✅</span>
            <span style={{ fontSize:"12px", color:"#00ff88", fontWeight:"600" }}>Lead qualified & booked in under 3 minutes</span>
          </div>
        )}
        {!done && <div />}
        <button
          onClick={runDemo}
          disabled={running}
          style={{ padding:"9px 20px", borderRadius:"7px", fontSize:"12px", fontWeight:"700", cursor:running?"not-allowed":"pointer", background:running?"#1a1a1a":"#00ff88", color:running?"#444":"#000", border:"none", transition:"all 0.2s", letterSpacing:"0.5px" }}
        >
          {running ? "RUNNING..." : done ? "▶ REPLAY" : "▶ RUN DEMO"}
        </button>
      </div>
    </div>
  );
}

// ─── PIPELINE ────────────────────────────────────────────────────────────────
function Pipeline() {
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [moving, setMoving] = useState(null);

  const stages = ["New", "Qualified", "Booked"];
  const stageColor = { New:"#555", Qualified:"#ffdd00", Booked:"#00ff88" };

  function advance(id) {
    const lead = leads.find(l => l.id === id);
    const idx = stages.indexOf(lead.status);
    if (idx >= stages.length - 1) return;
    setMoving(id);
    setTimeout(() => {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: stages[idx+1] } : l));
      setMoving(null);
    }, 400);
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px" }}>
      {stages.map(stage => {
        const stageLeads = leads.filter(l => l.status === stage);
        const c = stageColor[stage];
        return (
          <div key={stage}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"10px", color:c, letterSpacing:"2px", fontWeight:"700" }}>{stage.toUpperCase()}</div>
              <div style={{ background:`${c}22`, border:`1px solid ${c}44`, borderRadius:"10px", padding:"1px 8px", fontFamily:"monospace", fontSize:"10px", color:c }}>{stageLeads.length}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", minHeight:"80px" }}>
              {stageLeads.map(l => (
                <div key={l.id} style={{ background:"#111", border:"1px solid #1c1c1c", borderRadius:"10px", padding:"12px 14px", opacity:moving===l.id?0.4:1, transition:"opacity 0.3s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px" }}>
                    <div style={{ fontSize:"13px", fontWeight:"600", color:"#e0e0e0" }}>{l.name}</div>
                    <ScoreBadge score={l.score} />
                  </div>
                  <div style={{ fontSize:"11px", color:"#555", marginBottom:"2px" }}>{l.issue}</div>
                  <div style={{ fontSize:"10px", color:"#333", marginBottom:"10px" }}>{l.time}</div>
                  {stage !== "Booked" && (
                    <button onClick={() => advance(l.id)} style={{ width:"100%", padding:"6px", borderRadius:"5px", fontSize:"10px", fontWeight:"700", cursor:"pointer", background:"transparent", border:`1px solid ${stageColor[stages[stages.indexOf(stage)+1]]}55`, color:stageColor[stages[stages.indexOf(stage)+1]], letterSpacing:"0.5px" }}>
                      → MOVE TO {stages[stages.indexOf(stage)+1].toUpperCase()}
                    </button>
                  )}
                  {stage === "Booked" && (
                    <div style={{ textAlign:"center", fontSize:"10px", color:"#00ff8877", letterSpacing:"1px" }}>✓ BOOKED</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ROI PANEL ───────────────────────────────────────────────────────────────
function ROIPanel() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"12px" }}>
      {ROI.map(r => (
        <div key={r.label} style={{ background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:"12px", padding:"20px" }}>
          <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#444", letterSpacing:"1px", marginBottom:"12px" }}>{r.label}</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:"10px" }}>
            <span style={{ fontSize:"13px", color:"#2a2a2a", textDecoration:"line-through" }}>{r.before}</span>
            <span style={{ fontSize:"22px", fontWeight:"800", color:r.color }}>{r.after}</span>
          </div>
          <div style={{ fontSize:"10px", color:"#2a2a2a", marginTop:"4px" }}>with Monkee Bizz AI</div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function Demo() {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState("sms");

  const tabs = [
    { id:"sms",      label:"💬 SMS Demo" },
    { id:"pipeline", label:"📋 Lead Pipeline" },
    { id:"roi",      label:"📈 ROI Calculator" },
  ];

  return (
    <div style={{ background:"#080808", minHeight:"100vh", color:"#e0e0e0", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      {showModal && <PreQualModal onClose={() => setShowModal(false)} />}

      {/* NAV */}
      <nav style={{ borderBottom:"1px solid #141414", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:"58px", position:"sticky", top:0, background:"#080808", zIndex:100 }}>
        <div>
          <div style={{ fontSize:"15px", fontWeight:"800", color:"#fff", letterSpacing:"0.3px", lineHeight:1.1 }}>Monkee Bizz AI</div>
          <div style={{ fontSize:"8px", color:"#00ff88", letterSpacing:"2px", fontWeight:"500" }}>POWERED BY MANOLOGICS</div>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background:"#00ff88", color:"#000", border:"none", padding:"9px 22px", borderRadius:"7px", fontSize:"12px", fontWeight:"700", cursor:"pointer", letterSpacing:"0.5px" }}>
          Book a Demo
        </button>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth:"800px", margin:"0 auto", padding:"60px 24px 40px", textAlign:"center" }}>
        <div style={{ display:"inline-block", background:"rgba(0,255,136,0.07)", border:"1px solid rgba(0,255,136,0.18)", borderRadius:"20px", padding:"5px 14px", marginBottom:"18px" }}>
          <span style={{ fontFamily:"monospace", fontSize:"9px", color:"#00ff88", letterSpacing:"2px" }}>HVAC AI WORKFORCE SYSTEM</span>
        </div>
        <h1 style={{ fontSize:"clamp(28px,5vw,52px)", fontWeight:"800", color:"#fff", lineHeight:1.15, margin:"0 0 16px", letterSpacing:"-0.5px" }}>
          Your AI Workforce.<br /><span style={{ color:"#00ff88" }}>Running 24/7.</span>
        </h1>
        <p style={{ fontSize:"16px", color:"#555", maxWidth:"480px", margin:"0 auto 28px", lineHeight:1.75 }}>
          Watch the system qualify leads, book appointments, and move your pipeline — automatically.
        </p>
        <button onClick={() => setShowModal(true)} style={{ background:"#00ff88", color:"#000", border:"none", padding:"15px 36px", borderRadius:"9px", fontSize:"14px", fontWeight:"800", cursor:"pointer", letterSpacing:"0.5px", boxShadow:"0 0 40px rgba(0,255,136,0.2)" }}>
          Book a Demo →
        </button>
        <div style={{ marginTop:"10px", fontSize:"11px", color:"#2a2a2a" }}>Free 30-min walkthrough. No pressure.</div>
      </section>

      {/* TABS */}
      <div style={{ maxWidth:"900px", margin:"0 auto", padding:"0 24px 48px" }}>
        <div style={{ display:"flex", gap:"6px", marginBottom:"20px", background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:"10px", padding:"5px" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"10px", borderRadius:"7px", fontSize:"12px", fontWeight:"600", cursor:"pointer", border:"none", transition:"all 0.2s", background:tab===t.id?"#1a1a1a":"transparent", color:tab===t.id?"#fff":"#555", boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.4)":"none" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "sms"      && <SMSDemo />}
        {tab === "pipeline" && <Pipeline />}
        {tab === "roi"      && <ROIPanel />}
      </div>

      {/* BOTTOM CTA */}
      <section style={{ background:"#0b0b0b", borderTop:"1px solid #141414", padding:"56px 24px", textAlign:"center" }}>
        <div style={{ maxWidth:"480px", margin:"0 auto" }}>
          <h2 style={{ fontSize:"26px", fontWeight:"700", color:"#fff", margin:"0 0 10px" }}>Ready to see it in your business?</h2>
          <p style={{ fontSize:"14px", color:"#555", margin:"0 0 28px", lineHeight:1.75 }}>Book a 30-minute demo and we'll show you exactly how this works for an HVAC operation like yours.</p>
          <button onClick={() => setShowModal(true)} style={{ background:"#00ff88", color:"#000", border:"none", padding:"15px 36px", borderRadius:"9px", fontSize:"14px", fontWeight:"800", cursor:"pointer", letterSpacing:"0.5px", boxShadow:"0 0 30px rgba(0,255,136,0.15)" }}>
            Book a Demo →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid #0f0f0f", padding:"20px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"8px" }}>
        <div>
          <div style={{ fontSize:"12px", fontWeight:"700", color:"#2a2a2a" }}>Monkee Bizz AI</div>
          <div style={{ fontSize:"8px", color:"#1a1a1a", letterSpacing:"1px" }}>POWERED BY MANOLOGICS</div>
        </div>
        <div style={{ fontSize:"10px", color:"#1c1c1c" }}>© 2026 Monkee Bizz AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
