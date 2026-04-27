import React, { useState } from "react";

const G = {
  gold:    "#D4AF37",
  goldDim: "#A8891F",
  goldBg:  "rgba(212,175,55,0.07)",
  goldBd:  "rgba(212,175,55,0.22)",
  red:     "#EF4444",
  redBg:   "rgba(239,68,68,0.07)",
  redBd:   "rgba(239,68,68,0.20)",
  green:   "#22C55E",
  white:   "#FFFFFF",
  gray:    "#888888",
  dim:     "#444444",
  panel:   "#121212",
  border:  "#222222",
  borderDim:"#1A1A1A",
};

const CAL = "https://calendly.com/monkee-bizznus/30min";

const INP_STYLE = {
  background: "#0C0C0C",
  border: `1px solid #2a2a2a`,
  borderRadius: "10px",
  padding: "14px 16px",
  color: G.white,
  fontFamily: "'Space Mono', monospace",
  fontSize: "18px",
  fontWeight: 700,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

export default function RevenueLossCalculator() {
  const [missedCalls, setMissedCalls]   = useState("");
  const [avgJobValue, setAvgJobValue]   = useState("");
  const [calculated,  setCalculated]    = useState(false);
  const [focusMissed, setFocusMissed]   = useState(false);
  const [focusJob,    setFocusJob]       = useState(false);

  const missed  = parseFloat(missedCalls) || 0;
  const jobVal  = parseFloat(avgJobValue)  || 0;
  // Assume 30% close rate on missed calls, 4.3 weeks/month
  const monthlyLoss = Math.round(missed * 4.3 * 0.3 * jobVal);
  const yearlyLoss  = monthlyLoss * 12;

  const canCalculate = missed > 0 && jobVal > 0;

  function handleCalculate() {
    if (canCalculate) setCalculated(true);
  }

  function handleReset() {
    setMissedCalls(""); setAvgJobValue(""); setCalculated(false);
  }

  return (
    <div style={{
      background: G.panel,
      border: `1px solid ${calculated ? G.goldBd : G.border}`,
      borderRadius: "20px",
      marginBottom: "32px",
      overflow: "hidden",
      transition: "border-color 0.4s, box-shadow 0.4s",
      boxShadow: calculated ? `0 0 60px rgba(212,175,55,0.10)` : "none",
    }}>

      {/* ── Urgency Banner ──────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(90deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.05) 100%)`,
        borderBottom: `1px solid ${G.redBd}`,
        padding: "12px 28px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
      }}>
        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:G.red, boxShadow:`0 0 8px ${G.red}`, flexShrink:0 }} />
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"#FCA5A5", fontWeight:500, flex:1 }}>
          Most contractors respond in <strong style={{ color:"#FCA5A5" }}>15–30 minutes</strong>. Your leads go with whoever responds first.
        </span>
        <span style={{
          fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.red,
          background:G.redBg, border:`1px solid ${G.redBd}`,
          borderRadius:"20px", padding:"4px 12px", letterSpacing:"1px", whiteSpace:"nowrap",
        }}>
          78% HIRE THE FIRST RESPONDER
        </span>
      </div>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ padding:"32px 32px 24px", background:"linear-gradient(180deg, #161616 0%, #121212 100%)" }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.gold, letterSpacing:"3px", marginBottom:"10px" }}>
          REVENUE LOSS DIAGNOSIS
        </div>
        <h2 style={{
          fontFamily:"'DM Sans',sans-serif", fontSize:"clamp(18px, 2.5vw, 26px)",
          fontWeight:800, color:G.white, margin:"0 0 6px", lineHeight:1.2, letterSpacing:"-0.3px",
        }}>
          How much are you losing to missed calls?
        </h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:G.gray, margin:0, lineHeight:1.6 }}>
          Enter two numbers. Get your exact revenue leak — right now.
        </p>
      </div>

      <div style={{ borderTop:`1px solid ${G.borderDim}` }} />

      {/* ── Inputs or Result ────────────────────────────────── */}
      {!calculated ? (
        <div style={{ padding:"28px 32px 32px" }}>
          <div className="calc-inputs" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"20px" }}>

            {/* Missed calls input */}
            <div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.gray, letterSpacing:"2px", marginBottom:"8px" }}>
                MISSED CALLS / WEEK
              </div>
              <input
                type="number"
                min="0"
                placeholder="e.g. 8"
                value={missedCalls}
                onChange={e => setMissedCalls(e.target.value)}
                onFocus={() => setFocusMissed(true)}
                onBlur={() => setFocusMissed(false)}
                style={{ ...INP_STYLE, borderColor: focusMissed ? G.gold : "#2a2a2a", color: missedCalls ? G.gold : G.dim }}
              />
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#333", marginTop:"5px" }}>
                Calls you miss after hours, on jobs, or on weekends
              </div>
            </div>

            {/* Avg job value input */}
            <div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.gray, letterSpacing:"2px", marginBottom:"8px" }}>
                AVG JOB VALUE ($)
              </div>
              <input
                type="number"
                min="0"
                placeholder="e.g. 850"
                value={avgJobValue}
                onChange={e => setAvgJobValue(e.target.value)}
                onFocus={() => setFocusJob(true)}
                onBlur={() => setFocusJob(false)}
                style={{ ...INP_STYLE, borderColor: focusJob ? G.gold : "#2a2a2a", color: avgJobValue ? G.gold : G.dim }}
              />
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#333", marginTop:"5px" }}>
                Typical revenue per completed job
              </div>
            </div>
          </div>

          {/* Live preview while typing */}
          {canCalculate && (
            <div style={{
              background:"rgba(239,68,68,0.05)", border:`1px solid ${G.redBd}`,
              borderRadius:"12px", padding:"14px 18px", marginBottom:"20px",
              display:"flex", alignItems:"center", gap:"12px",
            }}>
              <span style={{ fontSize:"18px" }}>⚠️</span>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:"#FCA5A5" }}>
                At a glance: approx{" "}
                <strong style={{ color:G.red, fontSize:"16px" }}>${monthlyLoss.toLocaleString()}</strong>
                /mo going to competitors
              </div>
            </div>
          )}

          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "12px",
              border: "none",
              fontFamily: "'Space Mono',monospace",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              cursor: canCalculate ? "pointer" : "not-allowed",
              background: canCalculate
                ? `linear-gradient(135deg, ${G.gold} 0%, ${G.goldDim} 100%)`
                : "#1a1a1a",
              color: canCalculate ? "#000" : "#333",
              boxShadow: canCalculate ? `0 0 32px rgba(212,175,55,0.35)` : "none",
              transition: "all 0.2s",
            }}
          >
            SHOW ME HOW MUCH I'M LOSING →
          </button>
        </div>
      ) : (
        <div style={{ padding:"32px" }}>
          {/* ── Big diagnosis result ── */}
          <div style={{
            background: `linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(212,175,55,0.05) 100%)`,
            border: `1px solid ${G.redBd}`,
            borderRadius: "16px",
            padding: "28px",
            marginBottom: "20px",
            textAlign: "center",
          }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:G.red, letterSpacing:"3px", marginBottom:"14px" }}>
              ⚠ DIAGNOSIS COMPLETE
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", color:"#FCA5A5", marginBottom:"16px", lineHeight:1.5 }}>
              You are losing approximately
            </div>
            <div style={{
              fontFamily:"'Space Mono',monospace",
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 700,
              color: G.gold,
              lineHeight: 1,
              marginBottom: "8px",
              textShadow: `0 0 40px rgba(212,175,55,0.4)`,
              letterSpacing: "-1px",
            }}>
              ${monthlyLoss.toLocaleString()}<span style={{ fontSize:"0.45em", color:G.goldDim, letterSpacing:"1px" }}>/month</span>
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:G.dim, marginBottom:"20px" }}>
              in missed calls — that's{" "}
              <span style={{ color:G.red, fontWeight:700, fontSize:"16px" }}>
                ${yearlyLoss.toLocaleString()}/year
              </span>{" "}
              going to your competitors.
            </div>

            {/* Stat badges */}
            <div style={{ display:"flex", gap:"10px", justifyContent:"center", flexWrap:"wrap", marginBottom:"8px" }}>
              {[
                { label:"Monthly Loss",  val:`$${monthlyLoss.toLocaleString()}`,  c:G.red  },
                { label:"Yearly Loss",   val:`$${yearlyLoss.toLocaleString()}`,   c:G.red  },
                { label:"Missed/Week",   val:`${missed} calls`,                    c:G.gold },
                { label:"Avg Job Value", val:`$${jobVal.toLocaleString()}`,        c:G.gold },
              ].map(b => (
                <div key={b.label} style={{
                  background:"#0C0C0C", border:`1px solid ${b.c}33`,
                  borderRadius:"10px", padding:"12px 18px", textAlign:"center", minWidth:"100px",
                }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:G.dim, letterSpacing:"1px", marginBottom:"5px" }}>{b.label}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"14px", fontWeight:700, color:b.c }}>{b.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 78% stat ── */}
          <div style={{
            display:"flex", alignItems:"center", gap:"16px",
            background:"rgba(212,175,55,0.04)", border:`1px solid ${G.goldBd}`,
            borderRadius:"12px", padding:"16px 20px", marginBottom:"20px",
          }}>
            <div style={{
              fontFamily:"'Space Mono',monospace", fontSize:"32px", fontWeight:700,
              color:G.gold, lineHeight:1, flexShrink:0,
            }}>78%</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:G.gray, lineHeight:1.6 }}>
              of customers hire <strong style={{ color:G.white }}>the first responder</strong>. 
              Every minute you don't answer, someone else is closing that job.
            </div>
          </div>

          {/* ── Primary CTA ── */}
          <button
            onClick={() => window.open(CAL, "_blank")}
            style={{
              width: "100%",
              padding: "20px",
              borderRadius: "12px",
              border: "none",
              fontFamily: "'Space Mono',monospace",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              cursor: "pointer",
              background: `linear-gradient(135deg, ${G.gold} 0%, ${G.goldDim} 100%)`,
              color: "#000",
              boxShadow: `0 0 40px rgba(212,175,55,0.40), 0 4px 16px rgba(0,0,0,0.4)`,
              marginBottom: "12px",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 0 60px rgba(212,175,55,0.55), 0 8px 24px rgba(0,0,0,0.5)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=`0 0 40px rgba(212,175,55,0.40), 0 4px 16px rgba(0,0,0,0.4)`; }}
          >
            FIX THIS NOW — BOOK DEMO →
          </button>

          <button
            onClick={handleReset}
            style={{
              width:"100%", padding:"12px", borderRadius:"10px",
              background:"transparent", border:`1px solid #2a2a2a`,
              fontFamily:"'Space Mono',monospace", fontSize:"10px", fontWeight:700,
              color:"#555", cursor:"pointer", letterSpacing:"1px",
              transition:"border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#444"; e.currentTarget.style.color="#999"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#2a2a2a"; e.currentTarget.style.color="#555"; }}
          >
            RECALCULATE
          </button>
        </div>
      )}
    </div>
  );
}