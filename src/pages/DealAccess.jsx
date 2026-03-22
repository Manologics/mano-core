import { useState } from "react";

const REDIRECT_URL = "https://surplussyndicatestore.com/deal-machine";
const SUBMIT_ENDPOINT = "https://api.base44.com/api/apps/69b9620de5303495dd309130/functions/dealAccessSubmit";

export default function DealAccess() {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setErrorMsg("All fields required.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setStatus("success");
      // Slight delay so user sees confirmation flash, then redirect
      setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, 800);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Try again.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#000000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Arial Black', 'Impact', sans-serif",
    }}>
      {/* Background texture overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 0%, rgba(250,204,21,0.07) 0%, transparent 70%)",
        zIndex: 0,
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: "420px",
      }}>

        {/* Badge */}
        <div style={{
          textAlign: "center", marginBottom: "20px",
        }}>
          <span style={{
            display: "inline-block",
            background: "#FACC15",
            color: "#000",
            fontSize: "10px",
            fontWeight: "900",
            letterSpacing: "3px",
            padding: "5px 14px",
            borderRadius: "2px",
            textTransform: "uppercase",
          }}>
            🔥 EXCLUSIVE ACCESS
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          color: "#FACC15",
          fontSize: "clamp(42px, 12vw, 64px)",
          fontWeight: "900",
          textAlign: "center",
          lineHeight: "0.95",
          letterSpacing: "-1px",
          textTransform: "uppercase",
          margin: "0 0 16px",
          textShadow: "0 0 40px rgba(250,204,21,0.4), 0 2px 0 rgba(0,0,0,0.8)",
        }}>
          UNLOCK<br />THE DROP
        </h1>

        {/* Subheadline */}
        <p style={{
          color: "#a1a1aa",
          fontSize: "15px",
          textAlign: "center",
          fontFamily: "'Arial', sans-serif",
          fontWeight: "400",
          letterSpacing: "0.3px",
          margin: "0 0 32px",
          lineHeight: "1.5",
        }}>
          Once it's gone, it's gone.<br />
          <span style={{ color: "#fff", fontWeight: "600" }}>Get access before everyone else.</span>
        </p>

        {/* Form Card */}
        <div style={{
          background: "#111111",
          border: "1px solid #27272a",
          borderRadius: "12px",
          padding: "28px 24px",
        }}>
          {status === "success" ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔥</div>
              <p style={{
                color: "#FACC15", fontWeight: "900", fontSize: "20px",
                fontFamily: "'Arial Black', sans-serif", letterSpacing: "1px",
                textTransform: "uppercase", margin: "0 0 8px",
              }}>YOU'RE IN!</p>
              <p style={{ color: "#a1a1aa", fontSize: "13px", fontFamily: "'Arial', sans-serif" }}>
                Redirecting you to the deal…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="on">

              {/* Full Name */}
              <div style={{ marginBottom: "14px" }}>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#FACC15"}
                  onBlur={e => e.target.style.borderColor = "#3f3f46"}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: "14px" }}>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#FACC15"}
                  onBlur={e => e.target.style.borderColor = "#3f3f46"}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: "22px" }}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#FACC15"}
                  onBlur={e => e.target.style.borderColor = "#3f3f46"}
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <p style={{
                  color: "#f87171", fontSize: "13px", textAlign: "center",
                  fontFamily: "'Arial', sans-serif", margin: "0 0 14px",
                }}>{errorMsg}</p>
              )}

              {/* CTA Button */}
              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  width: "100%",
                  padding: "17px",
                  background: status === "loading" ? "#ca9a0a" : "#FACC15",
                  color: "#000000",
                  fontSize: "15px",
                  fontWeight: "900",
                  fontFamily: "'Arial Black', sans-serif",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  border: "none",
                  borderRadius: "8px",
                  cursor: status === "loading" ? "not-allowed" : "pointer",
                  boxShadow: status === "loading"
                    ? "none"
                    : "0 0 20px rgba(250,204,21,0.5), 0 0 40px rgba(250,204,21,0.2)",
                  transition: "all 0.15s ease",
                  display: "block",
                }}
              >
                {status === "loading" ? "LOCKING YOU IN…" : "GET ACCESS NOW"}
              </button>

              {/* Micro text */}
              <p style={{
                color: "#52525b",
                fontSize: "11px",
                textAlign: "center",
                fontFamily: "'Arial', sans-serif",
                margin: "12px 0 0",
                letterSpacing: "0.5px",
              }}>
                Limited inventory. No spam.
              </p>
            </form>
          )}
        </div>

        {/* Bottom brand */}
        <p style={{
          color: "#3f3f46",
          fontSize: "10px",
          textAlign: "center",
          fontFamily: "monospace",
          letterSpacing: "2px",
          marginTop: "24px",
          textTransform: "uppercase",
        }}>
          SURPLUS SYNDICATE · DEAL MACHINE
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px", // 16px prevents iOS zoom
  fontFamily: "'Arial', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
  WebkitAppearance: "none",
};
