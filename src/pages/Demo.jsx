import React, { useState } from "react";

const CALENDLY_URL = "https://calendly.com/monkee-bizznus/30min";

// ─── Pre-qual Modal ─────────────────────────────────────────────────────────
function PreQualModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [bizType, setBizType] = useState("");
  const [callVolume, setCallVolume] = useState("");

  const bizTypes = [
    "HVAC Contractor",
    "HVAC Dealer / Distributor",
    "HVAC Service Company",
    "Other",
  ];

  const callVolumes = [
    "Under 50 calls/month",
    "50–150 calls/month",
    "150–300 calls/month",
    "300+ calls/month",
  ];

  function handleRedirect() {
    window.open(CALENDLY_URL, "_blank");
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px"
    }}>
      <div style={{
        background: "#0f0f0f", border: "1px solid #222", borderRadius: "16px",
        padding: "36px 32px", maxWidth: "440px", width: "100%",
        boxShadow: "0 0 60px rgba(0,255,136,0.08)"
      }}>
        {/* Step indicator */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: "3px", borderRadius: "2px",
              background: step >= s ? "#00ff88" : "#1a1a1a",
              transition: "background 0.3s"
            }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#00ff88", letterSpacing: "3px", marginBottom: "8px" }}>STEP 1 OF 2</div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", margin: "0 0 6px" }}>What best describes your business?</h2>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 24px" }}>We'll make sure the demo is relevant to your operation.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
              {bizTypes.map(opt => (
                <button key={opt} onClick={() => setBizType(opt)} style={{
                  padding: "13px 16px", borderRadius: "8px", cursor: "pointer",
                  textAlign: "left", fontSize: "13px", fontWeight: "500",
                  transition: "all 0.2s",
                  background: bizType === opt ? "rgba(0,255,136,0.1)" : "#141414",
                  border: bizType === opt ? "1px solid #00ff88" : "1px solid #222",
                  color: bizType === opt ? "#00ff88" : "#888",
                }}>
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!bizType}
              style={{
                width: "100%", padding: "14px", borderRadius: "8px",
                fontSize: "13px", fontWeight: "700", letterSpacing: "1px",
                cursor: bizType ? "pointer" : "not-allowed",
                background: bizType ? "#00ff88" : "#1a1a1a",
                color: bizType ? "#000" : "#333",
                border: "none", transition: "all 0.2s",
              }}
            >
              NEXT →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#00ff88", letterSpacing: "3px", marginBottom: "8px" }}>STEP 2 OF 2</div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", margin: "0 0 6px" }}>How many inbound calls do you handle monthly?</h2>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 24px" }}>This helps us show you the right ROI numbers.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
              {callVolumes.map(opt => (
                <button key={opt} onClick={() => setCallVolume(opt)} style={{
                  padding: "13px 16px", borderRadius: "8px", cursor: "pointer",
                  textAlign: "left", fontSize: "13px", fontWeight: "500",
                  transition: "all 0.2s",
                  background: callVolume === opt ? "rgba(0,255,136,0.1)" : "#141414",
                  border: callVolume === opt ? "1px solid #00ff88" : "1px solid #222",
                  color: callVolume === opt ? "#00ff88" : "#888",
                }}>
                  {opt}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setStep(1)} style={{
                flex: "0 0 auto", padding: "14px 18px", borderRadius: "8px",
                fontSize: "12px", cursor: "pointer",
                background: "transparent", border: "1px solid #222", color: "#555",
              }}>← Back</button>
              <button
                onClick={handleRedirect}
                disabled={!callVolume}
                style={{
                  flex: 1, padding: "14px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: "700", letterSpacing: "1px",
                  cursor: callVolume ? "pointer" : "not-allowed",
                  background: callVolume ? "#00ff88" : "#1a1a1a",
                  color: callVolume ? "#000" : "#333",
                  border: "none", transition: "all 0.2s",
                }}
              >
                BOOK MY DEMO →
              </button>
            </div>
          </>
        )}

        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "20px",
          background: "none", border: "none", color: "#333",
          fontSize: "20px", cursor: "pointer", lineHeight: 1,
        }}>✕</button>
      </div>
    </div>
  );
}

// ─── Main Demo Page ──────────────────────────────────────────────────────────
export default function Demo() {
  const [showModal, setShowModal] = useState(false);

  const metrics = [
    { label: "Avg Response Time", before: "4–6 hrs", after: "< 90 sec", color: "#00ff88" },
    { label: "Missed Calls Recovered", before: "~20%", after: "94%", color: "#00ff88" },
    { label: "Monthly Calls Handled", before: "Manual", after: "Automated", color: "#ffdd00" },
    { label: "Booking Rate", before: "35%", after: "72%", color: "#00ff88" },
  ];

  const features = [
    {
      icon: "🤖",
      title: "AI Intake Agent",
      desc: "Answers every call, qualifies the lead, scores urgency in real time — no human required.",
    },
    {
      icon: "📅",
      title: "Auto-Booking Engine",
      desc: "Converts calls into booked appointments without touching your calendar.",
    },
    {
      icon: "🔁",
      title: "Follow-Up Sequences",
      desc: "SMS + email follow-ups fire automatically. No lead goes cold.",
    },
    {
      icon: "📊",
      title: "Live Command Center",
      desc: "Every lead, call, and booking tracked in one dashboard — real-time.",
    },
  ];

  return (
    <div style={{ background: "#080808", minHeight: "100vh", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {showModal && <PreQualModal onClose={() => setShowModal(false)} />}

      {/* NAV */}
      <nav style={{ borderBottom: "1px solid #141414", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px", position: "sticky", top: 0, background: "#080808", zIndex: 100 }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#fff", letterSpacing: "0.5px", lineHeight: 1.1 }}>Monkee Bizz AI</div>
          <div style={{ fontSize: "9px", color: "#00ff88", letterSpacing: "2px", fontWeight: "500" }}>POWERED BY MANOLOGICS</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "#00ff88", color: "#000", border: "none",
            padding: "9px 20px", borderRadius: "7px", fontSize: "12px",
            fontWeight: "700", cursor: "pointer", letterSpacing: "0.5px",
          }}
        >
          Book a Demo
        </button>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: "880px", margin: "0 auto", padding: "80px 24px 64px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "20px", padding: "5px 14px", marginBottom: "20px" }}>
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px" }}>BUILT FOR HVAC CONTRACTORS</span>
        </div>

        <h1 style={{ fontSize: "clamp(32px,5vw,58px)", fontWeight: "800", color: "#fff", lineHeight: 1.15, margin: "0 0 20px", letterSpacing: "-0.5px" }}>
          Your AI Workforce.<br />
          <span style={{ color: "#00ff88" }}>Running 24/7.</span>
        </h1>

        <p style={{ fontSize: "18px", color: "#666", maxWidth: "560px", margin: "0 auto 36px", lineHeight: 1.7 }}>
          Monkee Bizz AI installs a fully automated intake, booking, and follow-up system into your HVAC business — so you never miss a call or lose a lead again.
        </p>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "#00ff88", color: "#000", border: "none",
            padding: "17px 40px", borderRadius: "10px", fontSize: "15px",
            fontWeight: "800", cursor: "pointer", letterSpacing: "0.5px",
            boxShadow: "0 0 40px rgba(0,255,136,0.25)", transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Book a Demo →
        </button>

        <div style={{ marginTop: "14px", fontSize: "12px", color: "#333" }}>Free 30-minute walkthrough. No pressure.</div>
      </section>

      {/* METRICS */}
      <section style={{ background: "#0c0c0c", borderTop: "1px solid #141414", borderBottom: "1px solid #141414", padding: "48px 24px" }}>
        <div style={{ maxWidth: "880px", margin: "0 auto" }}>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", letterSpacing: "3px", textAlign: "center", marginBottom: "32px" }}>BEFORE VS. AFTER</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px" }}>
            {metrics.map(m => (
              <div key={m.label} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", letterSpacing: "1px", marginBottom: "12px" }}>{m.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#333", textDecoration: "line-through" }}>{m.before}</span>
                  <span style={{ fontSize: "12px", color: "#333" }}>→</span>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: m.color }}>{m.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: "880px", margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#444", letterSpacing: "3px", marginBottom: "12px" }}>WHAT'S INCLUDED</div>
        <h2 style={{ fontSize: "28px", fontWeight: "700", color: "#fff", margin: "0 0 36px" }}>5 AI agents. One system.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px" }}>
          {features.map(f => (
            <div key={f.title} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "24px" }}>
              <div style={{ fontSize: "26px", marginBottom: "12px" }}>{f.icon}</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>{f.title}</div>
              <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ background: "#0c0c0c", borderTop: "1px solid #141414", padding: "64px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", color: "#fff", margin: "0 0 12px" }}>Ready to see it live?</h2>
          <p style={{ fontSize: "15px", color: "#555", margin: "0 0 32px", lineHeight: 1.7 }}>Book a 30-minute demo and we'll walk you through exactly how it works in an HVAC operation like yours.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: "#00ff88", color: "#000", border: "none",
              padding: "17px 40px", borderRadius: "10px", fontSize: "15px",
              fontWeight: "800", cursor: "pointer", letterSpacing: "0.5px",
              boxShadow: "0 0 40px rgba(0,255,136,0.15)",
            }}
          >
            Book a Demo →
          </button>
          <div style={{ marginTop: "14px", fontSize: "12px", color: "#2a2a2a" }}>Free 30-minute walkthrough. No pressure.</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #111", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#333" }}>Monkee Bizz AI</div>
          <div style={{ fontSize: "9px", color: "#222", letterSpacing: "1px" }}>POWERED BY MANOLOGICS</div>
        </div>
        <div style={{ fontSize: "11px", color: "#222" }}>© 2026 Monkee Bizz AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
