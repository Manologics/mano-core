import React, { useState } from "react";

// Backend function endpoint — service-side only, no token exposed here
const SUBMIT_URL = "https://mano-dd309130.base44.app/functions/submitLead";

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
    budget: "",
    timeline: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim())  { setError("Full name is required.");     return; }
    if (!form.phone.trim()) { setError("Phone number is required.");  return; }
    if (!form.email.trim()) { setError("Email address is required."); return; }

    setLoading(true);
    try {
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          form.name.trim(),
          phone:         form.phone.trim(),
          email:         form.email.trim(),
          business_type: form.business_type || null,
          service_need:  form.service_need.trim() || null,
          urgency:       form.urgency,
          budget:        form.budget || null,
          timeline:      form.timeline || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setError(data.error || "Submission failed. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("LeadForm submit error:", err);
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  // ── Success ──────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: "440px" }}>
          <div style={{ width: "80px", height: "80px", background: "linear-gradient(135deg,#00ff88,#00cc66)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", margin: "0 auto 24px" }}>✓</div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "3px", marginBottom: "12px" }}>SUBMISSION RECEIVED</div>
          <h2 style={{ color: "#fff", fontSize: "24px", marginBottom: "14px", fontWeight: "700" }}>We'll be in touch soon!</h2>
          <p style={{ color: "#555", fontSize: "14px", lineHeight: "1.7" }}>Your information has been saved. A member of our team will reach out to you shortly.</p>
          <div style={{ marginTop: "28px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "14px 18px", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>
            {form.name} · {form.email}
          </div>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "56px", height: "56px", background: "linear-gradient(135deg,#00ff88,#00cc66)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", margin: "0 auto 14px" }}>🐒</div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "3px", marginBottom: "8px" }}>MONKEE BIZZ AI</div>
          <h1 style={{ color: "#fff", fontSize: "26px", margin: "0 0 8px", fontWeight: "700" }}>Get a Free Strategy Call</h1>
          <p style={{ color: "#555", fontSize: "13px" }}>Tell us about your business and we'll reach out with a custom plan — usually within the hour.</p>
        </div>

        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "16px", padding: "28px" }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Contact Info */}
            <div style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: "20px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "2px", marginBottom: "14px" }}>YOUR INFO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={LBL}>FULL NAME *</label>
                  <input style={INP} name="name" value={form.name} onChange={handle}
                    placeholder="Your full name" autoComplete="name"
                    onFocus={e => e.target.style.borderColor = "#00ff88"}
                    onBlur={e  => e.target.style.borderColor = "#222"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={LBL}>PHONE NUMBER *</label>
                    <input style={INP} name="phone" value={form.phone} onChange={handle}
                      placeholder="(555) 000-0000" autoComplete="tel"
                      onFocus={e => e.target.style.borderColor = "#00ff88"}
                      onBlur={e  => e.target.style.borderColor = "#222"} />
                  </div>
                  <div>
                    <label style={LBL}>EMAIL *</label>
                    <input style={INP} name="email" type="email" value={form.email} onChange={handle}
                      placeholder="you@email.com" autoComplete="email"
                      onFocus={e => e.target.style.borderColor = "#00ff88"}
                      onBlur={e  => e.target.style.borderColor = "#222"} />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: "20px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "2px", marginBottom: "14px" }}>YOUR BUSINESS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={LBL}>BUSINESS TYPE</label>
                  <select style={{ ...INP, cursor: "pointer" }} name="business_type" value={form.business_type} onChange={handle}>
                    <option value="">Select your industry...</option>
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
                <div>
                  <label style={LBL}>WHAT PROBLEM ARE YOU TRYING TO SOLVE RIGHT NOW?</label>
                  <textarea style={{ ...INP, resize: "vertical" }} name="service_need" value={form.service_need}
                    onChange={handle} rows={3} placeholder="Describe your challenge or goal — the more detail, the better."
                    onFocus={e => e.target.style.borderColor = "#00ff88"}
                    onBlur={e  => e.target.style.borderColor = "#222"} />
                </div>
              </div>
            </div>

            {/* Project Fit */}
            <div>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "2px", marginBottom: "14px" }}>PROJECT FIT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={LBL}>BUDGET RANGE</label>
                  <select style={{ ...INP, cursor: "pointer" }} name="budget" value={form.budget} onChange={handle}>
                    <option value="">Select a range...</option>
                    <option value="Under $500">Under $500</option>
                    <option value="$500 – $1,000">$500 – $1,000</option>
                    <option value="$1,000 – $2,500">$1,000 – $2,500</option>
                    <option value="$2,500 – $5,000">$2,500 – $5,000</option>
                    <option value="$5,000 – $10,000">$5,000 – $10,000</option>
                    <option value="$10,000+">$10,000+</option>
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                </div>
                <div>
                  <label style={LBL}>WHEN DO YOU NEED THIS?</label>
                  <select style={{ ...INP, cursor: "pointer" }} name="timeline" value={form.timeline} onChange={handle}>
                    <option value="">Select a timeline...</option>
                    <option value="ASAP">ASAP — I need this now</option>
                    <option value="1-2 weeks">In the next 1–2 weeks</option>
                    <option value="1 month">Within the next month</option>
                    <option value="Just exploring">Just exploring options</option>
                  </select>
                </div>
                <div>
                  <label style={LBL}>HOW URGENT IS THIS?</label>
                  <select style={{ ...INP, cursor: "pointer" }} name="urgency" value={form.urgency} onChange={handle}>
                    <option value="low">Low — No rush</option>
                    <option value="medium">Medium — Within a few weeks</option>
                    <option value="high">High — Need this ASAP</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ color: "#ff3333", fontSize: "13px", fontFamily: "monospace", background: "#ff000011", border: "1px solid #ff333322", borderRadius: "6px", padding: "10px 14px", lineHeight: "1.5" }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ background: loading ? "#0a3320" : "#00ff88", color: loading ? "#00ff88" : "#000", border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "2px", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
              {loading ? "SAVING..." : "SUBMIT →"}
            </button>

          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "16px", fontFamily: "monospace", fontSize: "10px", color: "#222", letterSpacing: "1px" }}>
          POWERED BY MONKEE BIZZ AI — SAOS
        </div>
      </div>
    </div>
  );
}