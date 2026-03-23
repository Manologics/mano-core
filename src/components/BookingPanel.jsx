import React, { useState, useEffect } from "react";
import { fetchCalendlySlots } from "@/functions/fetchCalendlySlots";
import { confirmBooking } from "@/functions/confirmBooking";

const BLOCKED_STATUSES = ["Booked", "Closed — Won", "Closed — No Response"];

export default function BookingPanel({ lead, onBookingConfirmed }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [eventTypeUri, setEventTypeUri] = useState("");

  if (!lead || !["HOT", "WARM"].includes(lead.score) || BLOCKED_STATUSES.includes(lead.status)) return null;

  const fetchSlots = async () => {
    setLoading(true);
    setError("");
    setSelectedSlot(null);
    try {
      const res = await fetchCalendlySlots({ lead_id: lead.id });
      if (res.data.not_configured) {
        setNotConfigured(true);
      } else if (res.data.error) {
        setError(res.data.error);
      } else {
        setSlots(res.data.slots || []);
        setEventTypeUri(res.data.event_type_uri || "");
        setNotConfigured(false);
      }
    } catch (e) {
      setError("Failed to fetch availability. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchSlots(); }, [lead.id]);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setConfirming(true);
    setError("");
    try {
      const res = await confirmBooking({ lead_id: lead.id, slot: selectedSlot, notes, event_type_uri: eventTypeUri });
      if (res.data.error === "slot_taken") {
        setError(res.data.message);
        fetchSlots();
      } else if (res.data.error) {
        setError(res.data.error);
      } else {
        setConfirmed(res.data);
        if (onBookingConfirmed) onBookingConfirmed(res.data);
      }
    } catch (e) {
      setError("Booking failed. Please try again.");
    }
    setConfirming(false);
  };

  const LBL = { display: "block", fontFamily: "monospace", fontSize: "9px", color: "#555", letterSpacing: "2px", marginBottom: "5px" };

  if (confirmed) {
    return (
      <div style={{ marginTop: "16px", padding: "16px", background: "#0d1a13", border: "1px solid #00ff8844", borderRadius: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <div style={{ width: "32px", height: "32px", background: "#00ff88", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#000", fontWeight: "bold" }}>✓</div>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00ff88", letterSpacing: "1px" }}>APPOINTMENT CONFIRMED</div>
            <div style={{ fontSize: "12px", color: "#ddd", marginTop: "2px" }}>
              {confirmed.dateStr || confirmed.scheduled_date} at {confirmed.timeStr || confirmed.scheduled_time}
            </div>
          </div>
        </div>
        {confirmed.calendly_event_url && (
          <a href={confirmed.calendly_event_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "#00ff88", display: "inline-block", marginTop: "6px" }}>
            Add to calendar →
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: "16px", borderTop: "1px solid #1a1a1a", paddingTop: "14px" }}>
      <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#00ff88", letterSpacing: "3px", marginBottom: "12px" }}>SCHEDULE APPOINTMENT</div>

      {notConfigured ? (
        <div style={{ fontSize: "11px", color: "#555", fontFamily: "monospace" }}>
          Configure Calendly in <a href="/Settings" style={{ color: "#00ff88" }}>Settings</a> to enable booking.
        </div>
      ) : loading ? (
        <div style={{ fontSize: "11px", color: "#333", fontFamily: "monospace" }}>FETCHING AVAILABILITY...</div>
      ) : error ? (
        <div style={{ fontSize: "11px", color: "#ff3333", background: "#ff000012", border: "1px solid #ff333322", borderRadius: "6px", padding: "10px" }}>{error}</div>
      ) : slots.length === 0 ? (
        <div>
          <div style={{ fontSize: "11px", color: "#555" }}>No available slots found in the next 14 days.</div>
          <button onClick={fetchSlots} style={{ marginTop: "8px", fontSize: "10px", color: "#555", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>Refresh availability</button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            {slots.map((slot, i) => {
              const dt = new Date(slot.start_time);
              const selected = selectedSlot?.start_time === slot.start_time;
              return (
                <div key={i} onClick={() => setSelectedSlot(slot)}
                  style={{ padding: "10px 14px", borderRadius: "6px", cursor: "pointer", transition: "all 0.15s",
                    background: selected ? "#0d1a13" : "#1e1e1e",
                    border: selected ? "1px solid #00ff88" : "1px solid #333333" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#fff", fontWeight: "600" }}>
                        {dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </div>
                      <div style={{ fontSize: "11px", color: "#888", marginTop: "1px" }}>
                        {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
                      </div>
                    </div>
                    <div style={{ fontSize: "10px", color: "#555", fontFamily: "monospace" }}>
                      {slot.duration_minutes}min
                    </div>
                    {selected && <div style={{ fontSize: "14px", color: "#00ff88" }}>✓</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={fetchSlots} style={{ fontSize: "10px", color: "#555", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", marginBottom: "14px", display: "block" }}>
            Refresh availability
          </button>
          <div style={{ marginBottom: "14px" }}>
            <label style={LBL}>NOTES FOR APPOINTMENT</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              maxLength={500} rows={2}
              placeholder="Anything the owner should know before the call..."
              style={{ width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: "7px", padding: "9px 11px", color: "#ddd", fontSize: "11px", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>
          {error && (
            <div style={{ fontSize: "11px", color: "#ff3333", background: "#ff000012", border: "1px solid #ff333322", borderRadius: "6px", padding: "8px 12px", marginBottom: "10px" }}>
              ⚠ {error}
            </div>
          )}
          <button
            onClick={handleConfirm}
            disabled={!selectedSlot || confirming}
            style={{ width: "100%", padding: "12px", background: selectedSlot && !confirming ? "#00ff88" : "#1a1a1a", color: selectedSlot && !confirming ? "#000" : "#333", border: "none", borderRadius: "7px", fontSize: "11px", fontWeight: "700", fontFamily: "monospace", letterSpacing: "2px", cursor: selectedSlot && !confirming ? "pointer" : "not-allowed", transition: "all 0.15s" }}
          >
            {confirming ? "CONFIRMING..." : "CONFIRM APPOINTMENT"}
          </button>
        </>
      )}
    </div>
  );
}