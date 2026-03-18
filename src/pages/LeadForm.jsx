import React, { useState } from "react";
import { createClient } from "@base44/sdk";

// Direct SDK client — no auth required, public form
const base44 = createClient({ appId: "69b9620de5303495dd309130" });
const Lead = base44.entities.Lead;

function generateToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase() +
    "-" + Date.now().toString(36).toUpperCase();
}

function scoreLead(form) {
  const urgencyScore = { high: 3, medium: 2, low: 1 }[form.urgency] || 1;
  const total =
    urgencyScore +
    (form.email ? 1 : 0) +
    (form.phone ? 1 : 0) +
    (form.business_type ? 1 : 0) +
    (form.service_need ? 1 : 0);
  return total >= 6 ? "HOT" : total >= 4 ? "WARM" : "COLD";
}

function routeLead(score) {
  return score === "HOT" ? "Action Required" : score === "WARM" ? "Follow Up" : "Nurture";
}

const INP = {
  width: "100%",
  background: "#111",
  border: "1px solid #222",
  borderRadius: "9px",
  padding: "12px 14px",
  color: "#ddd",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const LBL = {
  display: "block",
  fontFamily: "monospace",
  fontSize: "10px",
  color: "#555",
  letterSpacing: "2px",
  marginBottom: "6px",
};

export default function LeadForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    business_type: "",
    service_need: "",
    urgency: "medium",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugMsg, setDebugMsg] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDebugMsg("");

    if (!form.name.trim()) { setError("Full name is required."); return; }
    if (!form.phone.trim()) { setError("Phone number is required."); return; }
    if (!form.email.trim()) { setError("Email address is required."); return; }

    setLoading(true);

    try {
      const score = scoreLead(form);
      const status = routeLead(score);
      const token = generateToken();

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        business_type: form.business_type || null,
        service_need: form.service_need.trim() || null,
        urgency: form.urgency,
        score: score,
        status: status,
        webhook_status: "none",
        processing_mode: "internal",
        submission_token: token,
      };

      await Lead.create(payload);
      setSubmitted(true);
    } catch (err) {
      console.error("Lead submission error:", err);
      const msg = err?.message || err?.toString() || "Unknown error";
      setError(`Submission failed: ${msg}. Please try again or contact support.`);
    }

    setLoading(false);
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0a",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", fontFamily: "'Inter','Segoe UI',sans-serif",
      }}>
        <div style={{ textAlign: "center", maxWidth: "440px" }}>
          <div style={{
            width: "80px", height: "80px",
            background: "linear-gradient(135deg,#00ff88,#00cc66)",
            borderRadius: "50%", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "36px", margin: "0 auto 24px",
          }}>✓</div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "3px", marginBottom: "12px" }}>
            SUBMISSION RECEIVED
          </div>
          <h2 style={{ color: "#fff", fontSize: "24px", marginBottom: "14px", fontWeight: "700" }}>
            We'll be in touch soon!
          </h2>
          <p style={{ color: "#555", fontSize: "14px", lineHeight: "1.7" }}>
            Your information has been saved. A member of our team will reach out to you shortly.
          </p>
          <div style={{
            marginTop: "28px", background: "#111", border: "1px solid #1a1a1a",
            borderRadius: "10px", padding: "14px 18px",
            fontFamily: "monospace", fontSize: "11px", color: "#333",
          }}>
            {form.name} · {form.email}
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "56px", height: "56px",
            background: "linear-gradient(135deg,#00ff88,#00cc66)",
            borderRadius: "16px", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "28px", margin: "0 auto 14px",
          }}>🐒</div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "3px", marginBottom: "8px" }}>
            MONKEE BIZZ AI
          </div>
          <h1 style={{ color: "#fff", fontSize: "26px", margin: "0 0 8px", fontWeight: "700" }}>
            Get Started Today
          </h1>
          <p style={{ color: "#555", fontSize: "13px" }}>
            Tell us about your business and we'll reach out with a custom plan.
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "16px", padding: "28px" }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Name */}
            <div>
              <label style={LBL}>FULL NAME *</label>
              <input
                style={INP} name="name" value={form.name} onChange={handle}
                placeholder="Your full name" autoComplete="name"
                onFocus={e => e.target.style.borderColor = "#00ff88"}
                onBlur={e => e.target.style.borderColor = "#222"}
              />
            </div>

            {/* Phone + Email */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={LBL}>PHONE NUMBER *</label>
                <input
                  style={INP} name="phone" value={form.phone} onChange={handle}
                  placeholder="(555) 000-0000" autoComplete="tel"
                  onFocus={e => e.target.style.borderColor = "#00ff88"}
                  onBlur={e => e.target.style.borderColor = "#222"}
                />
              </div>
              <div>
                <label style={LBL}>EMAIL *</label>
                <input
                  style={INP} name="email" type="email" value={form.email} onChange={handle}
                  placeholder="you@email.com" autoComplete="email"
                  onFocus={e => e.target.style.borderColor = "#00ff88"}
                  onBlur={e => e.target.style.borderColor = "#222"}
                />
              </div>
            </div>

            {/* Business Type */}
            <div>
              <label style={LBL}>BUSINESS TYPE</label>
              <select
                style={{ ...INP, cursor: "pointer" }}
                name="business_type" value={form.business_type} onChange={handle}
              >
                <option value="">Select your business type...</option>
                <option value="Restaurant / Food & Beverage">Restaurant / Food & Beverage</option>
                <option value="Salon / Beauty">Salon / Beauty</option>
                <option value="Contractor / Construction">Contractor / Construction</option>
                <option value="Retail / eCommerce">Retail / eCommerce</option>
                <option value="Health & Wellness">Health & Wellness</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Automotive">Automotive</option>
                <option value="Education / Coaching">Education / Coaching</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Service Need */}
            <div>
              <label style={LBL}>SERVICE NEED</label>
              <textarea
                style={{ ...INP, resize: "vertical" }}
                name="service_need" value={form.service_need} onChange={handle}
                rows={3} placeholder="What are you looking for help with?"
                onFocus={e => e.target.style.borderColor = "#00ff88"}
                onBlur={e => e.target.style.borderColor = "#222"}
              />
            </div>

            {/* Urgency */}
            <div>
              <label style={LBL}>URGENCY</label>
              <select
                style={{ ...INP, cursor: "pointer" }}
                name="urgency" value={form.urgency} onChange={handle}
              >
                <option value="low">Low — Just exploring options</option>
                <option value="medium">Medium — Ready in the next few weeks</option>
                <option value="high">High — Need this ASAP</option>
              </select>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                color: "#ff3333", fontSize: "13px", fontFamily: "monospace",
                background: "#ff000011", border: "1px solid #ff333322",
                borderRadius: "6px", padding: "10px 14px", lineHeight: "1.5",
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "#0a3320" : "#00ff88",
                color: loading ? "#00ff88" : "#000",
                border: "none", borderRadius: "10px", padding: "14px",
                fontSize: "14px", fontWeight: "700", fontFamily: "monospace",
                letterSpacing: "2px", cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {loading ? "SAVING..." : "SUBMIT →"}
            </button>

          </form>
        </div>

        <div style={{
          textAlign: "center", marginTop: "16px",
          fontFamily: "monospace", fontSize: "10px", color: "#222", letterSpacing: "1px",
        }}>
          POWERED BY MONKEE BIZZ AI — SAOS
        </div>
      </div>
    </div>
  );
}
