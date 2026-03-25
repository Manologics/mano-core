import React, { useState } from "react";

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

// brand = { name, emoji, accentColor, tagline, source }
export default function PublicLeadForm({ brand }) {
  const accent = brand?.accentColor || "#00ff88";

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    business_type: "", service_need: "",
    urgency: "medium", budget: "", timeline: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const focusStyle = (e) => (e.target.style.borderColor = accent);
  const blurStyle  = (e) => (e.target.style.borderColor = "#222");

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
          source:        brand?.source || "public_form",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error || "Submission failed. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: "440px" }}>
          <div style={{ width: "80px", height: "80px", background: `linear-gradient(135deg,${accent},${accent}aa)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", margin: "0 auto 24px" }}>✓</div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: accent, letterSpacing: "3px", marginBottom: "12px" }}>SUBMISSION RECEIVED</div>
          <h2 style={{ color: "#fff", fontSize: "24px", marginBottom: "14px", fontWeight: "700" }}>We'll be in touch soon!</h2>
          <p style={{ color: "#555", fontSize: "14px", lineHeight: "1.7" }}>Your information has been saved. A member of our team will reach out to you shortly.</p>
          <div style={{ marginTop: "28px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "14px 18px", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>
            {form.name} · {form.email}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "540px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "56px", height: "56px", background: `linear-gradient(135deg,${accent},${accent}aa)`, borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", margin: "0 auto 14px" }}>
            {brand?.emoji || "🚀"}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: accent, letterSpacing: "3px", marginBottom: "8px" }}>{brand?.name || "GET STARTED"}</div>
          <h1 style={{ color: "#fff", fontSize: "26px", margin: "0 0 8px", fontWeight: "700" }}>Get Started Today</h1>
          <p style={{ color: "#555", fontSize: "13px" }}>{brand?.tagline || "Tell us about your business and we'll reach out with a custom plan."}</p>
        </div>

        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "16px", padding: "28px" }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Section: Your Info */}
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "2px", paddingBottom: "4px", borderBottom: "1px solid #1a1a1a" }}>YOUR INFO</div>

            <div>
              <label style={LBL}>FULL NAME *</label>
              <input style={INP} name="name" value={form.name} onChange={handle}
                placeholder="Your full name" autoComplete="name"
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={LBL}>PHONE *</label>
                <input style={INP} name="phone" value={form.phone} onChange={handle}
                  placeholder="(555) 000-0000" autoComplete="tel"
                  onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div>
                <label style={LBL}>EMAIL *</label>
                <input style={INP} name="email" type="email" value={form.email} onChange={handle}
                  placeholder="you@email.com" autoComplete="email"
                  onFocus={focusStyle} onBlur={blurStyle} />
              </div>
            </div>

            {/* Section: Your Business */}
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "2px", paddingBottom: "4px", borderBottom: "1px solid #1a1a1a", marginTop: "4px" }}>YOUR BUSINESS</div>

            <div>
              <label style={LBL}>BUSINESS TYPE</label>
              <select style={{ ...INP, cursor: "pointer" }} name="business_type" value={form.business_type} onChange={handle}>
                <option value="">Select your business type...</option>
                <option>Restaurant / Food & Beverage</option>
                <option>Salon / Beauty</option>
                <option>Contractor / Construction</option>
                <option>Retail / eCommerce</option>
                <option>Health & Wellness</option>
                <option>Real Estate</option>
                <option>Professional Services</option>
                <option>Automotive</option>
                <option>Education / Coaching</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label style={LBL}>WHAT DO YOU NEED HELP WITH?</label>
              <textarea style={{ ...INP, resize: "vertical" }} name="service_need" value={form.service_need}
                onChange={handle} rows={3} placeholder="Describe your biggest challenge or goal..."
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            {/* Section: Project Fit */}
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333", letterSpacing: "2px", paddingBottom: "4px", borderBottom: "1px solid #1a1a1a", marginTop: "4px" }}>PROJECT FIT</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={LBL}>BUDGET RANGE</label>
                <select style={{ ...INP, cursor: "pointer" }} name="budget" value={form.budget} onChange={handle}>
                  <option value="">Select a range...</option>
                  <option>Under $500</option>
                  <option>$500 – $1,000</option>
                  <option>$1,000 – $2,500</option>
                  <option>$2,500 – $5,000</option>
                  <option>$5,000 – $10,000</option>
                  <option>$10,000+</option>
                  <option>Not sure yet</option>
                </select>
              </div>
              <div>
                <label style={LBL}>TIMELINE</label>
                <select style={{ ...INP, cursor: "pointer" }} name="timeline" value={form.timeline} onChange={handle}>
                  <option value="">Select timeline...</option>
                  <option>ASAP</option>
                  <option>1-2 weeks</option>
                  <option>1 month</option>
                  <option>Just exploring</option>
                </select>
              </div>
            </div>

            <div>
              <label style={LBL}>URGENCY</label>
              <select style={{ ...INP, cursor: "pointer" }} name="urgency" value={form.urgency} onChange={handle}>
                <option value="low">Low — Just exploring options</option>
                <option value="medium">Medium — Ready in the next few weeks</option>
                <option value="high">High — Need this ASAP</option>
              </select>
            </div>

            {error && (
              <div style={{ color: "#ff3333", fontSize: "13px", fontFamily: "monospace", background: "#ff000011", border: "1px solid #ff333322", borderRadius: "6px", padding: "10px 14px" }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ background: loading ? "#0a1a10" : accent, color: loading ? accent : "#000", border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "2px", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
              {loading ? "SAVING..." : "SUBMIT →"}
            </button>

          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "16px", fontFamily: "monospace", fontSize: "10px", color: "#1a1a1a", letterSpacing: "1px" }}>
          POWERED BY MANO
        </div>
      </div>
    </div>
  );
}