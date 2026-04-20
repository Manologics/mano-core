import React, { useState, useEffect, useRef } from "react";

const CALENDLY_URL = "https://calendly.com/monkee-bizznus/30min";

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const MOCK_LEADS = [
  { id: 1, name: "Marcus Webb",    phone: "(602) 555-0182", issue: "AC not cooling — 108° outside",  status: "New",       score: "HOT",  time: "2 min ago" },
  { id: 2, name: "Sandra Ortiz",  phone: "(480) 555-0247", issue: "No heat — system completely dead", status: "Contacted", score: "HOT",  time: "11 min ago" },
  { id: 3, name: "Derek Lane",    phone: "(623) 555-0391", issue: "Thermostat not responding",        status: "Qualified", score: "WARM", time: "28 min ago" },
  { id: 4, name: "Tonya Simms",   phone: "(602) 555-0518", issue: "Annual tune-up",                   status: "Booked",   score: "WARM", time: "1 hr ago" },
  { id: 5, name: "James Pruitt",  phone: "(480) 555-0663", issue: "Loud banging noise — outdoor unit", status: "New",      score: "HOT",  time: "47 min ago" },
  { id: 6, name: "Lena Figueroa", phone: "(623) 555-0774", issue: "Filter replacement + checkup",     status: "Booked",   score: "COLD", time: "2 hrs ago" },
];

const SMS_SCRIPT = [
  { from: "ai",   text: "Hi Marcus, this is Mano from Valley Cool HVAC 👋 We just got your request — sounds like your AC isn't cooling. Can you confirm?" },
  { from: "lead", text: "Yeah it's blowing warm air. It's 108 outside right now, this is bad" },
  { from: "ai",   text: "I hear you — that's urgent. Is the fan running or is the whole system off?" },
  { from: "lead", text: "Fan is running, just warm air coming out" },
  { from: "ai",   text: "Got it. That's likely a refrigerant or compressor issue. Our tech can be there today. Does this afternoon work — say 2–5 PM?" },
  { from: "lead", text: "Yes 2pm works perfect" },
  { from: "ai",   text: "✅ Booked. Tech arriving 2–3 PM today. You'll get a text 30 min before they arrive. Anything else?" },
  { from: "lead", text: "No that's great, thank you!" },
  { from: "ai",   text: "You're all set Marcus 🙌 We'll take care of you. Stay cool." },
];

const ROI_ITEMS = [
  { label: "Missed Calls / Month",    before: "~40",    after: "0",        color: "#00ff88" },
  { label: "Avg Response Time",       before: "4–6 hrs", after: "< 90 sec", color: "#00ff88" },
  { label: "Leads Auto-Qualified",    before: "Manual",  after: "100%",     color: "#ffdd00" },
  { label: "Booking Rate",            before: "35%",     after: "72%",      color: "#00ff88" },
  { label: "Est. Monthly Revenue",    before: "$18K",    after: "$31K",     color: "#00ff88" },
  { label: "Staff Hours Saved / Week",before: "0 hrs",   after: "22 hrs",   color: "#ffdd00" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const map = {
    HOT:  ["#ff4444", "#ff000015"],
    WARM: ["#ffdd00", "#ffdd0015"],
    COLD: ["#555555", "#55555515"],
  };
  const [c, bg] = map[score] || map.COLD;
  return (
    <span style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: "700", color: c, background: bg, border: `1px solid ${c}44`, padding: "2px 7px", borderRadius: "4px", letterSpacing: "1px" }}>
      {score}
    </span>
  );
}

// ─── PRE-QUAL MODAL ──────────────────────────────────────────────────────────
function PreQualModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState("");
  const [vol, setVol] = useState("");

  const bizOpts = ["HVAC Contractor", "HVAC Dealer / Distributor", "HVAC Service Company", "Other Home Services"];
  const volOpts = ["Under 50 calls/mo", "50–150 calls/mo", "150–300 calls/mo", "300+ calls/mo"];

  const btn = (active) => ({
    width: "100%", padding: "14px", borderRadius: "8px", fontSize: "13px",
    fontWeight: "700", border: "none", transition: "all 0.2s",
    cursor: active ? "pointer" : "not-allowed",
    background: active ? "#00ff88" : "#1a1a1a",
    color: active ? "#000" : "#333",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: "16px", padding: "36px 32px", maxWidth: "420px", width: "100%", position: "relative" }}>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
          {[1, 2].map(s => (
            <div key={s} style={{ flex: 1, height: "3px", borderRadius: "2px", background: step >= s ? "#00ff88" : "#1c1c1c", transition: "background 0.3s" }} />
          ))}
        </div>

        {step === 1 && <>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#00ff88", letterSpacing: "3px", marginBottom: "8px" }}>STEP 1 OF 2</div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", margin: "0 0 6px" }}>What describes your business?</h2>
          <p style={{ fontSize: "13px", color: "#555", margin: "0 0 22px" }}>We'll tailor the demo to your operation.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {bizOpts.map(o => (
              <button key={o} onClick={() => setBiz(o)} style={{ padding: "12px 16px", borderRadius: "8px", textAlign: "left", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "all 0.2s", background: biz === o ? "rgba(0,255,136,0.1)" : "#141414", border: biz === o ? "1px solid #00ff88" : "1px solid #222", color: biz === o ? "#00ff88" : "#777" }}>
                {o}
              </button>
            ))}
          </div>
          <button onClick={() => biz && setStep(2)} style={btn(!!biz)}>NEXT →</button>
        </>}

        {step === 2 && <>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#00ff88", letterSpacing: "3px", marginBottom: "8px" }}>STEP 2 OF 2</div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", margin: "0 0 6px" }}>Monthly inbound call volume?</h2>
          <p style={{ fontSize: "13px", color: "#555", margin: "0 0 22px" }}>We'll show you exactly how much revenue you're leaving on the table.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {volOpts.map(o => (
              <button key={o} onClick={() => setVol(o)} style={{ padding: "12px 16px", borderRadius: "8px", textAlign: "left", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "all 0.2s", background: vol === o ? "rgba(0,255,136,0.1)" : "#141414", border: vol === o ? "1px solid #00ff88" : "1px solid #222", color: vol === o ? "#00ff88" : "#777" }}>
                {o}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setStep(1)} style={{ padding: "14px 18px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", background: "transparent", border: "1px solid #222", color: "#555" }}>← Back</button>
            <button onClick={() => { if (vol) { window.open(CALENDLY_URL, "_blank"); onClose(); }}} style={{ ...btn(!!vol), flex: 1 }}>BOOK MY DEMO →</button>
          </div>
        </>}

        <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "18px", background: "none", border: "none", color: "#444", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>
    </div>
  );
}

// ─── SMS SIMULATOR ────────────────────────────────────────────────────────────
function SMSDemo() {
  const [visible, setVisible] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible]);

  function runDemo() {
    if (running) return;
    setRunning(true);
    setVisible([]);
    setDone(false);
    let i = 0;
    function next() {
      if (i >= SMS_SCRIPT.length) { setRunning(false); setDone(true); return; }
      const delay = SMS_SCRIPT[i].from === "ai" ? 900 : 1700;
      setTimeout(() => {
        setVisible(v => [...v, SMS_SCRIPT[i]]);
        i++;
        next();
      }, delay);
    }
    next();
  }

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "16px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#111", borderBottom: "1px solid #1c1c1c", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg,#00ff88,#00cc66)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🤖</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>Mano — AI Intake Agent</div>
            <div style={{ fontSize: "11px", color: "#00ff88" }}>● Online · Responding now</div>
          </div>
        </div>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#2a2a2a", letterSpacing: "2px" }}>LIVE SIMULATION</div>
      </div>

      {/* Chat */}
      <div style={{ height: "360px", overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", background: "#080808" }}>
        {visible.length === 0 && !running && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <div style={{ fontSize: "32px" }}>💬</div>
            <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#2a2a2a", textAlign: "center", letterSpacing: "1px", lineHeight: 1.8 }}>
              PRESS RUN TO WATCH MANO<br />QUALIFY A REAL HVAC LEAD
            </div>
          </div>
        )}
        {visible.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "ai" ? "flex-start" : "flex-end" }}>
            {m.from === "ai" && <div style={{ fontSize: "10px", color: "#333", marginBottom: "4px", marginLeft: "2px" }}>Mano</div>}
            {m.from === "lead" && <div style={{ fontSize: "10px", color: "#333", marginBottom: "4px", marginRight: "2px" }}>Marcus</div>}
            <div style={{
              maxWidth: "78%", padding: "12px 16px",
              borderRadius: m.from === "ai" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
              background: m.from === "ai" ? "#181818" : "rgba(0,255,136,0.1)",
              border: m.from === "ai" ? "1px solid #222" : "1px solid rgba(0,255,136,0.2)",
              fontSize: "13px", color: m.from === "ai" ? "#ccc" : "#00ff88", lineHeight: 1.65,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {running && visible.length > 0 && visible[visible.length - 1].from === "lead" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ fontSize: "10px", color: "#333", marginBottom: "4px", marginLeft: "2px" }}>Mano</div>
            <div style={{ padding: "12px 18px", borderRadius: "4px 16px 16px 16px", background: "#181818", border: "1px solid #222" }}>
              <span style={{ fontSize: "20px", letterSpacing: "3px", color: "#444" }}>···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div style={{ background: "#111", borderTop: "1px solid #1c1c1c", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          {done && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>✅</span>
              <span style={{ fontSize: "12px", color: "#00ff88", fontWeight: "600" }}>Lead qualified & booked in under 3 minutes</span>
            </div>
          )}
        </div>
        <button
          onClick={runDemo}
          disabled={running}
          style={{ padding: "10px 22px", borderRadius: "7px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px", cursor: running ? "not-allowed" : "pointer", background: running ? "#1a1a1a" : "#00ff88", color: running ? "#444" : "#000", border: "none", transition: "all 0.2s" }}
        >
          {running ? "RUNNING..." : done ? "▶ REPLAY" : "▶ RUN DEMO"}
        </button>
      </div>
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function Pipeline() {
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [moving, setMoving] = useState(null);

  const stages = ["New", "Contacted", "Qualified", "Booked"];
  const stageColors = { New: "#555", Contacted: "#4da6ff", Qualified: "#ffdd00", Booked: "#00ff88" };

  function advance(id) {
    const lead = leads.find(l => l.id === id);
    const idx = stages.indexOf(lead.status);
    if (idx >= stages.length - 1) return;
    setMoving(id);
    setTimeout(() => {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: stages[idx + 1] } : l));
      setMoving(null);
    }, 350);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
      {stages.map(stage => {
        const c = stageColors[stage];
        const stageLeads = leads.filter(l => l.status === stage);
        const nextStage = stages[stages.indexOf(stage) + 1];
        return (
          <div key={stage}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: c, letterSpacing: "2px", fontWeight: "700" }}>{stage.toUpperCase()}</div>
              <div style={{ background: `${c}18`, border: `1px solid ${c}44`, borderRadius: "10px", padding: "1px 8px", fontFamily: "monospace", fontSize: "9px", color: c }}>{stageLeads.length}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minHeight: "60px" }}>
              {stageLeads.map(l => (
                <div key={l.id} style={{ background: "#111", border: "1px solid #1c1c1c", borderRadius: "10px", padding: "12px 12px", opacity: moving === l.id ? 0.3 : 1, transition: "opacity 0.3s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#e0e0e0" }}>{l.name}</div>
                    <ScoreBadge score={l.score} />
                  </div>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px", lineHeight: 1.4 }}>{l.issue}</div>
                  <div style={{ fontSize: "9px", color: "#2a2a2a", marginBottom: "10px" }}>{l.time}</div>
                  {stage !== "Booked" && (
                    <button onClick={() => advance(l.id)} style={{ width: "100%", padding: "6px", borderRadius: "5px", fontSize: "9px", fontWeight: "700", cursor: "pointer", background: "transparent", border: `1px solid ${stageColors[nextStage]}44`, color: stageColors[nextStage], letterSpacing: "0.5px", transition: "all 0.2s" }}>
                      → {nextStage.toUpperCase()}
                    </button>
                  )}
                  {stage === "Booked" && (
                    <div style={{ textAlign: "center", fontSize: "9px", color: "#00ff8866", letterSpacing: "1px", fontFamily: "monospace" }}>✓ BOOKED</div>
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

// ─── ROI PANEL ────────────────────────────────────────────────────────────────
function ROIPanel() {
  return (
    <div>
      {/* Hero ROI number */}
      <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "16px", padding: "36px 32px", textAlign: "center", marginBottom: "16px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#444", letterSpacing: "3px", marginBottom: "12px" }}>IF YOU MISS JUST 5 CALLS A WEEK</div>
        <div style={{ fontSize: "clamp(48px,8vw,80px)", fontWeight: "900", color: "#ff4444", lineHeight: 1, marginBottom: "10px", letterSpacing: "-2px" }}>
          $2K–$5K
        </div>
        <div style={{ fontSize: "16px", color: "#666", fontWeight: "500" }}>in lost jobs — every single month</div>
        <div style={{ marginTop: "16px", display: "inline-block", background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.18)", borderRadius: "8px", padding: "8px 20px" }}>
          <span style={{ fontSize: "13px", color: "#00ff88", fontWeight: "600" }}>Mano recovers every one of those calls. Automatically.</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "10px" }}>
        {ROI_ITEMS.map(r => (
          <div key={r.label} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "18px 20px" }}>
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", letterSpacing: "1px", marginBottom: "10px" }}>{r.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#252525", textDecoration: "line-through" }}>{r.before}</span>
              <span style={{ fontSize: "22px", fontWeight: "800", color: r.color, lineHeight: 1 }}>{r.after}</span>
            </div>
            <div style={{ fontSize: "9px", color: "#222", marginTop: "4px", letterSpacing: "0.5px" }}>with Monkee Bizz AI</div>
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
    { id: "sms",      label: "💬  SMS Demo" },
    { id: "pipeline", label: "📋  Lead Pipeline" },
    { id: "roi",      label: "📈  ROI Panel" },
  ];

  const CTAPrimary = ({ style = {} }) => (
    <button
      onClick={() => setShowModal(true)}
      style={{ background: "#ff4444", color: "#fff", border: "none", padding: "15px 32px", borderRadius: "9px", fontSize: "14px", fontWeight: "800", cursor: "pointer", letterSpacing: "0.3px", boxShadow: "0 0 32px rgba(255,68,68,0.25)", transition: "transform 0.2s", ...style }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      See How Many Jobs You're Losing →
    </button>
  );

  const CTASecondary = ({ style = {} }) => (
    <button
      onClick={() => setShowModal(true)}
      style={{ background: "transparent", color: "#888", border: "1px solid #222", padding: "14px 28px", borderRadius: "9px", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s", ...style }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#ccc"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#888"; }}
    >
      Book a Demo
    </button>
  );

  return (
    <div style={{ background: "#080808", minHeight: "100vh", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {showModal && <PreQualModal onClose={() => setShowModal(false)} />}

      {/* NAV */}
      <nav style={{ borderBottom: "1px solid #111", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "58px", position: "sticky", top: 0, background: "rgba(8,8,8,0.96)", backdropFilter: "blur(10px)", zIndex: 100 }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#fff", letterSpacing: "0.3px", lineHeight: 1.15 }}>Monkee Bizz AI</div>
          <div style={{ fontSize: "8px", color: "#00ff88", letterSpacing: "2px", fontWeight: "600" }}>POWERED BY MANOLOGICS</div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <CTASecondary />
          <CTAPrimary />
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: "820px", margin: "0 auto", padding: "72px 24px 52px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: "20px", padding: "5px 14px", marginBottom: "20px" }}>
          <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#ff6666", letterSpacing: "2px" }}>HVAC CONTRACTORS — READ THIS</span>
        </div>

        <h1 style={{ fontSize: "clamp(30px,5.5vw,56px)", fontWeight: "900", color: "#fff", lineHeight: 1.12, margin: "0 0 20px", letterSpacing: "-0.5px" }}>
          Stop Losing Jobs<br /><span style={{ color: "#ff4444" }}>From Missed Calls</span>
        </h1>

        <p style={{ fontSize: "17px", color: "#666", maxWidth: "520px", margin: "0 auto 14px", lineHeight: 1.75 }}>
          Mano responds in seconds, qualifies the lead, and books the job — automatically. 24/7. No extra staff. No missed opportunities.
        </p>

        <p style={{ fontSize: "14px", color: "#444", maxWidth: "420px", margin: "0 auto 36px", lineHeight: 1.6 }}>
          If you miss just 5 calls a week, that's <strong style={{ color: "#ff4444" }}>$2,000–$5,000 in lost jobs</strong> every month.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <CTAPrimary />
          <CTASecondary />
        </div>

        <div style={{ marginTop: "12px", fontSize: "11px", color: "#2a2a2a" }}>Free 30-min walkthrough. No pressure.</div>
      </section>

      {/* DEMO TABS */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px 64px" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "4px" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "11px", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "none", transition: "all 0.2s", background: tab === t.id ? "#1a1a1a" : "transparent", color: tab === t.id ? "#fff" : "#444", boxShadow: tab === t.id ? "0 1px 6px rgba(0,0,0,0.5)" : "none" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "sms"      && <SMSDemo />}
        {tab === "pipeline" && <Pipeline />}
        {tab === "roi"      && <ROIPanel />}
      </div>

      {/* BOTTOM CTA */}
      <section style={{ background: "#0b0b0b", borderTop: "1px solid #111", padding: "64px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#fff", margin: "0 0 10px" }}>Ready to stop losing jobs?</h2>
          <p style={{ fontSize: "15px", color: "#555", margin: "0 0 28px", lineHeight: 1.75 }}>
            Book a free 30-minute demo. We'll show you exactly how Mano works in an HVAC operation like yours.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <CTAPrimary />
            <CTASecondary />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #0f0f0f", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#2a2a2a" }}>Monkee Bizz AI</div>
          <div style={{ fontSize: "8px", color: "#1a1a1a", letterSpacing: "1px" }}>POWERED BY MANOLOGICS</div>
        </div>
        <div style={{ fontSize: "10px", color: "#1c1c1c" }}>© 2026 Monkee Bizz AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
