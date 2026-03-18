import React, { useState } from "react";
import { Lead } from "../api/entities";

function nowUTC() { return new Date().toISOString(); }
function generateToken() { return Math.random().toString(36).substring(2,10).toUpperCase()+"-"+Date.now().toString(36).toUpperCase(); }

const INP = { width:"100%", background:"#111", border:"1px solid #222", borderRadius:"9px", padding:"12px 14px", color:"#ddd", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s" };
const LBL = { display:"block", fontFamily:"monospace", fontSize:"10px", color:"#555", letterSpacing:"2px", marginBottom:"6px" };

function scoreLead(form) {
  const urgencyScore = { high:3, medium:2, low:1 }[form.urgency] || 1;
  const total = urgencyScore + (form.email?1:0) + (form.phone?1:0) + (form.business_type?1:0) + (form.service_need?1:0);
  return total >= 6 ? "HOT" : total >= 4 ? "WARM" : "COLD";
}
function routeLead(score) {
  return score === "HOT" ? "Action Required" : score === "WARM" ? "Follow Up" : "Nurture";
}

export default function LeadForm() {
  const [form, setForm] = useState({ name:"", phone:"", email:"", business_type:"", service_need:"", urgency:"medium" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = e => setForm({...form,[e.target.name]:e.target.value});

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) { setError("Name, phone and email are required."); return; }
    setLoading(true); setError("");
    try {
      const score = scoreLead(form);
      const status = routeLead(score);
      await Lead.create({
        ...form, score, status,
        webhook_status: "none", processing_mode: "internal",
        submission_token: generateToken(),
      });
      setSubmitted(true);
    } catch(e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  if (submitted) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:"420px" }}>
        <div style={{ fontSize:"64px", marginBottom:"20px" }}>✅</div>
        <div style={{ fontFamily:"monospace", fontSize:"11px", color:"#00ff88", letterSpacing:"3px", marginBottom:"12px" }}>SUBMISSION RECEIVED</div>
        <h2 style={{ color:"#fff", fontSize:"24px", marginBottom:"12px" }}>We'll be in touch soon!</h2>
        <p style={{ color:"#555", fontSize:"14px", lineHeight:"1.6" }}>Our team has received your information and will contact you shortly.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:"520px" }}>
        <div style={{ textAlign:"center", marginBottom:"32px" }}>
          <div style={{ width:"56px", height:"56px", background:"linear-gradient(135deg,#00ff88,#00cc66)", borderRadius:"16px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", margin:"0 auto 14px" }}>🐒</div>
          <div style={{ fontFamily:"monospace", fontSize:"11px", color:"#00ff88", letterSpacing:"3px", marginBottom:"8px" }}>MONKEE BIZZ AI</div>
          <h1 style={{ color:"#fff", fontSize:"26px", margin:"0 0 8px", fontWeight:"700" }}>Get Started Today</h1>
          <p style={{ color:"#555", fontSize:"13px" }}>Tell us about your business and we'll reach out with a custom plan.</p>
        </div>

        <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"16px", padding:"28px" }}>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
            <div>
              <label style={LBL}>FULL NAME *</label>
              <input style={INP} name="name" value={form.name} onChange={handle} placeholder="Your full name"
                onFocus={e=>e.target.style.borderColor="#00ff88"} onBlur={e=>e.target.style.borderColor="#222"} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
              <div>
                <label style={LBL}>PHONE NUMBER *</label>
                <input style={INP} name="phone" value={form.phone} onChange={handle} placeholder="(555) 000-0000"
                  onFocus={e=>e.target.style.borderColor="#00ff88"} onBlur={e=>e.target.style.borderColor="#222"} />
              </div>
              <div>
                <label style={LBL}>EMAIL *</label>
                <input style={INP} name="email" type="email" value={form.email} onChange={handle} placeholder="you@email.com"
                  onFocus={e=>e.target.style.borderColor="#00ff88"} onBlur={e=>e.target.style.borderColor="#222"} />
              </div>
            </div>
            <div>
              <label style={LBL}>BUSINESS TYPE</label>
              <select style={{ ...INP, cursor:"pointer" }} name="business_type" value={form.business_type} onChange={handle}>
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
            <div>
              <label style={LBL}>SERVICE NEED</label>
              <textarea style={{ ...INP, resize:"vertical" }} name="service_need" value={form.service_need} onChange={handle} rows={3}
                placeholder="What are you looking for help with? Be as specific as you like..."
                onFocus={e=>e.target.style.borderColor="#00ff88"} onBlur={e=>e.target.style.borderColor="#222"} />
            </div>
            <div>
              <label style={LBL}>URGENCY</label>
              <select style={{ ...INP, cursor:"pointer" }} name="urgency" value={form.urgency} onChange={handle}>
                <option value="low">Low — Just exploring options</option>
                <option value="medium">Medium — Ready in the next few weeks</option>
                <option value="high">High — Need this ASAP</option>
              </select>
            </div>
            {error && <div style={{ color:"#ff3333", fontSize:"13px", fontFamily:"monospace", background:"#ff000011", border:"1px solid #ff333322", borderRadius:"6px", padding:"10px 14px" }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ background:loading?"#0a3320":"#00ff88", color:loading?"#00ff88":"#000", border:"none", borderRadius:"10px", padding:"14px", fontSize:"14px", fontWeight:"700", fontFamily:"monospace", letterSpacing:"2px", cursor:loading?"not-allowed":"pointer", transition:"all 0.15s" }}>
              {loading?"SUBMITTING...":"SUBMIT →"}
            </button>
          </form>
        </div>
        <div style={{ textAlign:"center", marginTop:"16px", fontFamily:"monospace", fontSize:"10px", color:"#222", letterSpacing:"1px" }}>POWERED BY MONKEE BIZZ AI — SAOS</div>
      </div>
    </div>
  );
}
