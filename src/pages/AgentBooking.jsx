import React, { useState, useEffect } from "react";
import { createClient } from "@base44/sdk";

const base44 = createClient({ appId: "69b9620de5303495dd309130" });
const Lead = base44.entities.Lead;
const Booking = base44.entities.Booking;
const ActivityLog = base44.entities.ActivityLog;
const AppSettings = base44.entities.AppSettings;

const NAV = [
  { label: "Command Center", path: "/CommandCenter", icon: "⚡" },
  { label: "Agent 1: Intake", path: "/AgentIntake", icon: "🤖" },
  { label: "Agent 2: Booking", path: "/AgentBooking", icon: "🤖" },
  { label: "Agent 3: Follow-Up", path: "/AgentFollowUp", icon: "🤖" },
  { label: "Agent 4: Retention", path: "/AgentRetention", icon: "🤖" },
  { label: "Agent 5: Ops", path: "/AgentOps", icon: "🤖" },
  { label: "Settings", path: "/Settings", icon: "⚙️" },
  { label: "📋 Lead Form", path: "/LeadForm", icon: "" },
];

function Sidebar({ current, confirmedCount }) {
  return (
    <aside style={{ width: "220px", background: "#0f0f0f", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0, minHeight: "100vh" }}>
      <div style={{ padding: "18px 14px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg,#00ff88,#00cc66)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>🐒</div>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px", fontWeight: "bold" }}>MONKEE BIZZ AI</div>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#333" }}>SAOS v1.0</div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV.map(n => {
          const a = current === n.path;
          const badge = n.path === "/AgentBooking" && confirmedCount > 0 ? confirmedCount : null;
          return (
            <a key={n.path} href={n.path} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "7px", marginBottom: "3px", textDecoration: "none", background: a ? "rgba(0,255,136,0.1)" : "transparent", border: a ? "1px solid rgba(0,255,136,0.25)" : "1px solid transparent", position: "relative" }}>
              <span style={{ fontSize: "14px" }}>{n.icon}</span>
              <span style={{ fontSize: "12px", color: a ? "#00ff88" : "#777", fontWeight: a ? "600" : "400" }}>{n.label}</span>
              {badge && <span style={{ position: "absolute", right: "8px", background: "#00ff88", color: "#000", fontSize: "9px", fontWeight: "bold", padding: "2px 6px", borderRadius: "10px", fontFamily: "monospace" }}>{badge}</span>}
            </a>
          );
        })}
      </nav>
      <div style={{ padding: "12px", borderTop: "1px solid #1a1a1a", fontFamily: "monospace", fontSize: "9px", color: "#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

function StatusBadge({ status }) {
  const styles = {
    "Requested": { c: "#ffdd00", bg: "#ffdd0020", border: "#ffdd0044" },
    "Confirmed": { c: "#00ff88", bg: "#00ff8820", border: "#00ff8844" },
    "Rescheduled": { c: "#00ccff", bg: "#00ccff20", border: "#00ccff44" },
    "Completed": { c: "#fff", bg: "#00ff88", border: "#00ff88" },
    "No-Show": { c: "#ff3333", bg: "#ff333320", border: "#ff333344" },
    "Cancelled": { c: "#888", bg: "#88888820", border: "#88888844" }
  };
  const s = styles[status] || styles.Requested;
  return <span style={{ fontFamily: "monospace", fontSize: "10px", color: s.c, background: s.bg, border: `1px solid ${s.border}`, padding: "3px 8px", borderRadius: "4px", fontWeight: "600" }}>{status}</span>;
}

function ScoreBadge({ score }) {
  const m = { HOT: { c: "#ff3333", bg: "#ff000020" }, WARM: { c: "#ffdd00", bg: "#ffdd0020" }, COLD: { c: "#888", bg: "#88888820" } };
  const s = m[score] || m.COLD;
  return <span style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold", color: s.c, background: s.bg, border: `1px solid ${s.c}44`, padding: "2px 7px", borderRadius: "4px" }}>{score}</span>;
}

async function writeLog(lead_id, event) {
  try { await ActivityLog.create({ lead_id, event, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
}

async function getSetting(key, defaultValue = "") {
  try {
    const settings = await AppSettings.filter({ key });
    return settings.length > 0 ? settings[0].value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export default function AgentBooking() {
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendlyConfigured, setCalendlyConfigured] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [b, l] = await Promise.all([Booking.list(), Lead.list()]);
      setBookings(b.sort((a, b) => new Date(a.scheduled_date + " " + a.scheduled_time) - new Date(b.scheduled_date + " " + b.scheduled_time)));
      setLeads(l);

      const apiKey = await getSetting("calendly_api_key");
      const eventUrl = await getSetting("calendly_event_url");
      setCalendlyConfigured(!!(apiKey && eventUrl));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter(b => ["Confirmed", "Rescheduled"].includes(b.status)).length;
  const todayBookings = bookings.filter(b => b.scheduled_date === new Date().toISOString().split("T")[0] && ["Confirmed", "Rescheduled"].includes(b.status)).length;
  const noShows = bookings.filter(b => b.status === "No-Show").length;

  const eligible = leads.filter(l => ["HOT", "WARM"].includes(l.score)).length;
  const offered = leads.filter(l => l.booking_offered === true).length;
  const requested = bookings.length;
  const confirmed = bookings.filter(b => ["Confirmed", "Rescheduled", "Completed", "No-Show"].includes(b.status)).length;
  const completed = bookings.filter(b => b.status === "Completed").length;
  const noShowCount = bookings.filter(b => b.status === "No-Show").length;

  const offerRate = eligible > 0 ? Math.round((offered / eligible) * 100) : 0;
  const requestRate = offered > 0 ? Math.round((requested / offered) * 100) : 0;
  const confirmRate = requested > 0 ? Math.round((confirmed / requested) * 100) : 0;
  const completeRate = confirmed > 0 ? Math.round((completed / confirmed) * 100) : 0;
  const noShowRate = confirmed > 0 ? Math.round((noShowCount / confirmed) * 100) : 0;

  const getColor = (rate) => rate > 60 ? "#00ff88" : rate >= 30 ? "#ffdd00" : "#ff3333";

  let insight = "";
  if (noShowRate > 30) insight = "⚠️ High no-show rate. Consider adding SMS reminders via Twilio.";
  else if (completeRate < 50) insight = "⚠️ Less than half of confirmed appointments are completing. Review reminder sequence.";
  else if (confirmRate > 80) insight = "✓ Strong booking conversion. Agent 2 is performing well.";
  else if (offerRate < 40) insight = "⚠️ Less than half of qualified leads are being offered slots. Check Calendly configuration.";

  const handleAction = async (booking, action) => {
    if (action === "complete") {
      await Booking.update(booking.id, { status: "Completed" });
      await Lead.update(booking.lead_id, { status: "Closed — Won" });
      await writeLog(booking.lead_id, `Appointment marked as completed`);
      load();
    } else if (action === "noshow") {
      await Booking.update(booking.id, { status: "No-Show", no_show_flagged: true });
      await Lead.update(booking.lead_id, { status: "Follow Up" });
      await writeLog(booking.lead_id, `Marked as no-show — returned to follow up`);
      load();
    } else if (action === "cancel") {
      await Booking.update(booking.id, { status: "Cancelled" });
      await Lead.update(booking.lead_id, { status: "Action Required" });
      await writeLog(booking.lead_id, `Appointment cancelled`);
      load();
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <Sidebar current="/AgentBooking" confirmedCount={confirmedCount} />
      <main style={{ flex: 1, overflow: "auto", padding: "28px", maxWidth: "1300px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "3px", marginBottom: "5px" }}>AGENT 02</div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px" }}>Booking Agent</h1>
            <p style={{ color: "#555", fontSize: "12px" }}>Appointment scheduling, confirmation, and reminders</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: calendlyConfigured ? "#00ff88" : "#ff3333" }}></div>
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: calendlyConfigured ? "#00ff88" : "#ff3333", letterSpacing: "1px" }}>
              {calendlyConfigured ? "ACTIVE" : "NOT CONNECTED"}
            </span>
            {!calendlyConfigured && <a href="/Settings" style={{ marginLeft: "8px", fontSize: "10px", color: "#555", textDecoration: "underline" }}>Configure in Settings</a>}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {[["TOTAL BOOKINGS", totalBookings, "#00ff88"], ["CONFIRMED", confirmedCount, "#00ff88"], ["TODAY", todayBookings, "#ffdd00"], ["NO-SHOWS", noShows, "#ff3333"]].map(([l, v, c]) => (
            <div key={l} style={{ background: "#111", border: `1px solid ${c}22`, borderRadius: "9px", padding: "12px 16px", minWidth: "120px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "8px", color: "#444", letterSpacing: "2px", marginBottom: "3px" }}>{l}</div>
              <div style={{ fontSize: "26px", fontWeight: "700", color: c, lineHeight: 1 }}>{loading ? "…" : v}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "18px", marginBottom: "20px" }}>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px", marginBottom: "14px" }}>CONVERSION FUNNEL</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "12px" }}>
            {[["Eligible Leads", eligible, offerRate], ["Booking Offered", offered, requestRate], ["Booking Requested", requested, confirmRate], ["Confirmed", confirmed, completeRate], ["Completed", completed, null], ["No-Show → Agent 3", noShowCount, noShowRate]].map(([stage, count, rate], i) => (
              <div key={i} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "7px", padding: "10px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px" }}>{stage}</div>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "#ddd", lineHeight: 1, marginBottom: "4px" }}>{count}</div>
                {rate !== null && <div style={{ fontSize: "10px", fontFamily: "monospace", color: getColor(rate), fontWeight: "600" }}>{rate}%</div>}
              </div>
            ))}
          </div>
          {insight && <div style={{ fontSize: "11px", color: "#888", padding: "10px", background: "#0f0f0f", borderRadius: "6px", borderLeft: "3px solid #00ff88" }}>{insight}</div>}
        </div>

        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "2px" }}>BOOKINGS</span>
            <button onClick={load} style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#444", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "9px" }}>↺</button>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#333" }}>LOADING...</div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "#2a2a2a" }}>No bookings yet. Qualified leads will appear here once they schedule.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    {["LEAD NAME", "PHONE", "SCORE", "DATE", "TIME", "STATUS", "REMINDERS", "BOOKED AT", "ACTIONS"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontFamily: "monospace", fontSize: "8px", color: "#333", letterSpacing: "1px", fontWeight: "normal" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const lead = leads.find(l => l.id === b.lead_id);
                    return (
                      <tr key={b.id} style={{ borderBottom: "1px solid #0f0f0f" }}>
                        <td style={{ padding: "10px 12px", fontSize: "12px", color: "#ddd", fontWeight: "500" }}>{lead?.name || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: "11px", color: "#666" }}>{lead?.phone || "—"}</td>
                        <td style={{ padding: "10px 12px" }}><ScoreBadge score={lead?.score} /></td>
                        <td style={{ padding: "10px 12px", fontSize: "11px", color: "#aaa" }}>{b.scheduled_date || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: "11px", color: "#aaa" }}>{b.scheduled_time || "—"}</td>
                        <td style={{ padding: "10px 12px" }}><StatusBadge status={b.status} /></td>
                        <td style={{ padding: "10px 12px", fontSize: "10px", color: "#555" }}>
                          {b.reminder_24hr_sent ? "✓ 24hr " : ""}{b.reminder_1hr_sent ? "✓ 1hr" : ""}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "10px", color: "#444" }}>{b.created_date ? new Date(b.created_date).toLocaleDateString() : "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {["Confirmed", "Requested", "Rescheduled"].includes(b.status) && (
                              <>
                                <button onClick={() => handleAction(b, "complete")} style={{ padding: "4px 8px", fontSize: "9px", background: "transparent", border: "1px solid #00ff8844", color: "#00ff88", borderRadius: "4px", cursor: "pointer" }}>Complete</button>
                                <button onClick={() => handleAction(b, "noshow")} style={{ padding: "4px 8px", fontSize: "9px", background: "transparent", border: "1px solid #ff333344", color: "#ff3333", borderRadius: "4px", cursor: "pointer" }}>No-Show</button>
                                <button onClick={() => handleAction(b, "cancel")} style={{ padding: "4px 8px", fontSize: "9px", background: "transparent", border: "1px solid #88888844", color: "#888", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}