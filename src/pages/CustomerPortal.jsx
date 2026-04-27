import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toE164(phone) {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d[0] === "1") return "+" + d;
  return phone || "";
}

function fmt(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return isNaN(d) ? dt : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return isNaN(d) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function extractSmsHistory(notes) {
  if (!notes) return [];
  return notes
    .split("\n")
    .filter((l) => l.includes("[Inbound SMS") || l.includes("SMS sent") || l.includes("First SMS"))
    .map((l) => {
      const tsMatch = l.match(/\[([^\]]+)\]/);
      const ts = tsMatch ? tsMatch[1] : null;
      const text = l.replace(/\[[^\]]*\]/g, "").replace(/SID:[^\s]*/g, "").trim().replace(/^[:—\-\s]+/, "");
      return { ts: ts ? fmt(ts) : null, text: text || l };
    })
    .filter((x) => x.text);
}

const STATUS_COLOR = {
  New: { bg: "#1a2a1a", border: "#00ff88", text: "#00ff88" },
  "Action Required": { bg: "#2a1a00", border: "#ff8800", text: "#ff8800" },
  "Follow Up": { bg: "#1a1a2a", border: "#4488ff", text: "#4488ff" },
  Nurture: { bg: "#1a1a1a", border: "#666", text: "#888" },
  Contacted: { bg: "#1a2a2a", border: "#00ccaa", text: "#00ccaa" },
  "Appointment Requested": { bg: "#2a2a10", border: "#ddcc00", text: "#ddcc00" },
  Booked: { bg: "#001a2a", border: "#00aaff", text: "#00aaff" },
  "Closed — Won": { bg: "#0a1a0a", border: "#00ff88", text: "#00ff88" },
  "Closed — No Response": { bg: "#1a1010", border: "#444", text: "#555" },
};

const SCORE_COLOR = { HOT: "#ff4444", WARM: "#ff9900", COLD: "#4488ff", PENDING: "#666" };

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || { bg: "#111", border: "#333", text: "#888" };
  return (
    <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", fontFamily: "monospace", letterSpacing: "0.5px" }}>
      {status || "Unknown"}
    </span>
  );
}

function ScoreDot({ score }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: SCORE_COLOR[score] || "#444", display: "inline-block" }} />
      <span style={{ color: SCORE_COLOR[score] || "#666", fontSize: "11px", fontFamily: "monospace", fontWeight: "700" }}>{score || "PENDING"}</span>
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
      <span style={{ color: "#555", fontSize: "12px", minWidth: "130px", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#ccc", fontSize: "13px" }}>{value || "—"}</span>
    </div>
  );
}

function Card({ title, icon, children, style }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "22px", ...style }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px", borderBottom: "1px solid #1a1a1a", paddingBottom: "12px" }}>
          {icon && <span style={{ fontSize: "16px" }}>{icon}</span>}
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "2px", fontWeight: "700" }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Lookup screen ─────────────────────────────────────────────────────────────
function LookupScreen({ onFound }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async (e) => {
    e.preventDefault();
    setError("");
    if (!phone.trim()) { setError("Please enter your phone number."); return; }
    setLoading(true);
    try {
      const all = await base44.entities.Lead.list();
      const e164 = toE164(phone.trim());
      const match = all.find((l) => l.phone && (toE164(l.phone) === e164 || l.phone === phone.trim()));
      if (!match) {
        setError("No account found for that number. Please double-check or contact us.");
      } else {
        // Fetch bookings for this lead
        let bookings = [];
        try {
          bookings = await base44.entities.Booking.list();
          bookings = bookings.filter((b) => b.lead_id === match.id);
        } catch (_) {}
        onFound({ lead: match, bookings });
      }
    } catch (err) {
      setError("Lookup failed. Please try again.");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ fontSize: "42px", marginBottom: "10px" }}>🐒</div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "3px" }}>MONKEE BIZZ AI</div>
          <h1 style={{ fontSize: "20px", color: "#fff", fontWeight: "700", margin: "10px 0 6px" }}>Customer Portal</h1>
          <p style={{ color: "#555", fontSize: "13px" }}>Enter the phone number on your account to view your service status.</p>
        </div>

        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "28px" }}>
          <form onSubmit={lookup}>
            <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "8px", fontFamily: "monospace" }}>PHONE NUMBER</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(602) 555-0100"
              style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "13px 16px", color: "#fff", fontSize: "15px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            {error && (
              <div style={{ marginTop: "10px", color: "#ff5555", fontSize: "12px", background: "#1a0808", border: "1px solid #330000", borderRadius: "8px", padding: "10px 14px" }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", marginTop: "16px", background: loading ? "#1a1a1a" : "linear-gradient(135deg,#00ff88,#00cc66)", color: loading ? "#444" : "#000", border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.5px" }}
            >
              {loading ? "Looking up…" : "View My Account →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#2a2a2a", fontSize: "11px", marginTop: "20px" }}>
          Powered by Monkee Bizz AI · SAOS v1.0
        </p>
      </div>
    </div>
  );
}

// ── Portal dashboard ──────────────────────────────────────────────────────────
function PortalDashboard({ lead, bookings, onLogout }) {
  const upcoming = bookings.filter((b) => ["Requested", "Confirmed", "Rescheduled"].includes(b.status)).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  const past     = bookings.filter((b) => ["Completed", "No-Show", "Cancelled"].includes(b.status)).sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
  const smsHistory = extractSmsHistory(lead.notes);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "'Inter','Segoe UI',sans-serif", color: "#e0e0e0" }}>
      {/* Header */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "22px" }}>🐒</span>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px" }}>MONKEE BIZZ AI</div>
            <div style={{ fontSize: "13px", color: "#777" }}>Customer Portal</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", color: "#ccc", fontWeight: "600" }}>{lead.name}</div>
            <div style={{ fontSize: "11px", color: "#555" }}>{lead.phone}</div>
          </div>
          <button onClick={onLogout} style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#555", padding: "6px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Status summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
          {[
            { label: "Service Status", value: <StatusBadge status={lead.status} /> },
            { label: "Lead Score",     value: <ScoreDot score={lead.score} /> },
            { label: "Urgency",        value: <span style={{ color: lead.urgency === "high" ? "#ff4444" : lead.urgency === "medium" ? "#ff9900" : "#888", fontSize: "12px", fontWeight: "600", textTransform: "capitalize" }}>{lead.urgency || "—"}</span> },
            { label: "Appointments",   value: <span style={{ color: "#00ff88", fontWeight: "700", fontSize: "20px" }}>{bookings.length}</span> },
          ].map((item) => (
            <div key={item.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "18px 20px" }}>
              <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px" }}>{item.label}</div>
              <div>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Upcoming appointments */}
        <Card title="UPCOMING APPOINTMENTS" icon="📅">
          {upcoming.length === 0 ? (
            <div style={{ color: "#333", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No upcoming appointments scheduled.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {upcoming.map((b) => (
                <div key={b.id} style={{ background: "#0d0d0d", border: "1px solid #1a2a1a", borderRadius: "10px", padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div>
                    <div style={{ color: "#00ff88", fontWeight: "700", fontSize: "15px" }}>
                      {fmt(b.scheduled_date)} {b.scheduled_time ? `· ${b.scheduled_time}` : ""}
                    </div>
                    {b.timezone && <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>{b.timezone}</div>}
                    {b.notes && <div style={{ color: "#888", fontSize: "12px", marginTop: "6px" }}>{b.notes}</div>}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Service details */}
        <Card title="SERVICE DETAILS" icon="🔧">
          <InfoRow label="Service Need"    value={lead.service_need} />
          <InfoRow label="Business Type"   value={lead.business_type} />
          <InfoRow label="Budget"          value={lead.budget} />
          <InfoRow label="Timeline"        value={lead.timeline} />
          <InfoRow label="Source"          value={lead.source} />
          <InfoRow label="Submitted"       value={fmt(lead.created_date)} />
          <InfoRow label="Last Updated"    value={fmt(lead.updated_date)} />
        </Card>

        {/* Repair / appointment history */}
        {past.length > 0 && (
          <Card title="APPOINTMENT HISTORY" icon="🗂️">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {past.map((b) => (
                <div key={b.id} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div>
                    <div style={{ color: "#aaa", fontSize: "13px", fontWeight: "600" }}>
                      {fmt(b.scheduled_date)} {b.scheduled_time ? `· ${b.scheduled_time}` : ""}
                    </div>
                    {b.notes && <div style={{ color: "#555", fontSize: "12px", marginTop: "4px" }}>{b.notes}</div>}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Message history */}
        {smsHistory.length > 0 && (
          <Card title="MESSAGE HISTORY" icon="💬">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {smsHistory.map((msg, i) => (
                <div key={i} style={{ background: "#0d0d0d", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#888", borderLeft: "2px solid #1e3a1e" }}>
                  {msg.ts && <span style={{ color: "#3a5a3a", marginRight: "8px", fontFamily: "monospace", fontSize: "10px" }}>{msg.ts}</span>}
                  {msg.text}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Contact footer */}
        <div style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid #111" }}>
          <p style={{ color: "#333", fontSize: "12px" }}>
            Questions? Contact us at <a href="mailto:tex@monkeebizai.com" style={{ color: "#00ff88", textDecoration: "none" }}>tex@monkeebizai.com</a>
          </p>
          <p style={{ color: "#222", fontSize: "11px", marginTop: "6px" }}>Monkee Bizz AI · SAOS v1.0</p>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const [data, setData] = useState(null);

  const handleFound = ({ lead, bookings }) => setData({ lead, bookings });
  const handleLogout = () => setData(null);

  if (!data) return <LookupScreen onFound={handleFound} />;
  return <PortalDashboard lead={data.lead} bookings={data.bookings} onLogout={handleLogout} />;
}