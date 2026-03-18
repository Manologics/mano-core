import React, { useState, useEffect } from "react";
import { createClient } from "@base44/sdk";

const base44 = createClient({ appId: "69b9620de5303495dd309130" });
const Lead = base44.entities.Lead;
const ActivityLog = base44.entities.ActivityLog;

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

function Sidebar() {
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
          const a = n.path === "/AgentIntake";
          return (
            <a key={n.path} href={n.path} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "7px", marginBottom: "3px", textDecoration: "none", background: a ? "rgba(0,255,136,0.1)" : "transparent", border: a ? "1px solid rgba(0,255,136,0.25)" : "1px solid transparent" }}>
              <span style={{ fontSize: "14px" }}>{n.icon}</span>
              <span style={{ fontSize: "12px", color: a ? "#00ff88" : "#777", fontWeight: a ? "600" : "400" }}>{n.label}</span>
            </a>
          );
        })}
      </nav>
      <div style={{ padding: "12px", borderTop: "1px solid #1a1a1a", fontFamily: "monospace", fontSize: "9px", color: "#222" }}>SAOS BUILD 1</div>
    </aside>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────
function nowUTC() { return new Date().toISOString(); }
function generateToken() { return Math.random().toString(36).substring(2,10).toUpperCase()+"-"+Date.now().toString(36).toUpperCase(); }
async function writeLog(lead_id, event) {
  try { await ActivityLog.create({ lead_id, event, created_at: nowUTC() }); } catch(e) { console.error(e); }
}

// ── Processing pipeline ──────────────────────────────────────────────────
function buildNullSafeScore(score) {
  if (!score || score === "" || score === "PENDING") return null;
  return ["HOT","WARM","COLD"].includes(score) ? score : null;
}
function buildNullSafeStatus(status) {
  if (!status || status === "" || status === "New") return null;
  const finals = ["Action Required","Follow Up","Nurture","Contacted","Appointment Requested","Booked","Closed — Won","Closed — No Response"];
  return finals.includes(status) ? status : null;
}
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function SCORE_LEAD(lead) {
  const u = { high:3, medium:2, low:1 }[lead.urgency] || 1;
  const total = u + (lead.email?1:0) + (lead.phone?1:0) + (lead.business_type?1:0) + (lead.service_need?1:0);
  const score = total >= 6 ? "HOT" : total >= 4 ? "WARM" : "COLD";
  await Lead.update(lead.id, { score });
  await writeLog(lead.id, `Score assigned: ${score} (internal)`);
  return score;
}
async function ROUTE_LEAD(lead, score) {
  const status = score === "HOT" ? "Action Required" : score === "WARM" ? "Follow Up" : "Nurture";
  await Lead.update(lead.id, { status });
  await writeLog(lead.id, `Status set to: ${status} (internal)`);
  return status;
}
async function NOTIFY_ADMIN(lead) { await writeLog(lead.id, `Admin notification sent (internal)`); }
async function CONFIRM_LEAD(lead) { await writeLog(lead.id, `Lead confirmation sent (internal)`); }

async function FORWARD_TO_WEBHOOK(lead, url) {
  const payload = {
    lead_id: lead.id, name: lead.name, phone: lead.phone||null, email: lead.email||null,
    business_type: lead.business_type||null, service_need: lead.service_need||null, urgency: lead.urgency||null,
    score: buildNullSafeScore(lead.score), status: buildNullSafeStatus(lead.status),
    submission_token: lead.submission_token, created_at: lead.created_date||nowUTC(), source: "base44_intake_form",
  };
  let attempt = 1, lastError = null;
  while (attempt <= 2) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload), signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 200) {
        await Lead.update(lead.id, { webhook_status:"fired" });
        await writeLog(lead.id, attempt===1 ? "Webhook fired to n8n" : "Webhook fired to n8n (attempt 2)");
        return { success: true };
      } else { lastError = `HTTP ${res.status}`; }
    } catch(e) { lastError = e.name==="AbortError" ? "Timeout" : `Network error: ${e.message}`; }
    if (attempt < 2) {
      await writeLog(lead.id, `Webhook attempt ${attempt} failed — retrying in 2 seconds (${lastError})`);
      await sleep(2000); attempt++;
    } else break;
  }
  await writeLog(lead.id, `Webhook failed after 2 attempts — (${lastError})`);
  return { success: false, error: lastError };
}

async function processLead(lead, mode, webhookUrl) {
  if (mode === "internal") {
    await writeLog(lead.id, "Processing mode: internal");
    const score = await SCORE_LEAD(lead);
    await ROUTE_LEAD(lead, score);
    await NOTIFY_ADMIN(lead);
    await CONFIRM_LEAD(lead);
  } else {
    await writeLog(lead.id, "Processing mode: webhook");
    if (!webhookUrl || !webhookUrl.trim()) {
      await writeLog(lead.id, "Webhook not configured — falling back to internal mode");
      const score = await SCORE_LEAD(lead);
      await ROUTE_LEAD(lead, score);
      await NOTIFY_ADMIN(lead); await CONFIRM_LEAD(lead); return;
    }
    await Lead.update(lead.id, { webhook_status:"pending" });
    const result = await FORWARD_TO_WEBHOOK(lead, webhookUrl);
    if (!result.success) {
      await Lead.update(lead.id, { webhook_status:"failed" });
      const score = await SCORE_LEAD(lead);
      await ROUTE_LEAD(lead, score);
      await NOTIFY_ADMIN(lead); await CONFIRM_LEAD(lead);
      await writeLog(lead.id, "Fallback to internal mode — webhook unavailable");
    }
  }
}

// ── UI ───────────────────────────────────────────────────────────────────
const INP = { width:"100%", background:"#0f0f0f", border:"1px solid #222", borderRadius:"7px", padding:"9px 11px", color:"#ddd", fontSize:"12px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
const LBL = { display:"block", fontFamily:"monospace", fontSize:"9px", color:"#555", letterSpacing:"2px", marginBottom:"4px" };

function ScoreBadge({ score }) {
  const m = { HOT:{c:"#ff3333",bg:"#ff000020"}, WARM:{c:"#ffdd00",bg:"#ffdd0020"}, COLD:{c:"#888",bg:"#88888820"}, PENDING:{c:"#444",bg:"#44444420"} };
  const s = m[score] || m.PENDING;
  return <span style={{ fontFamily:"monospace", fontSize:"10px", fontWeight:"bold", color:s.c, background:s.bg, border:`1px solid ${s.c}44`, padding:"2px 7px", borderRadius:"4px", letterSpacing:"1px" }}>{score||"PENDING"}</span>;
}
function StatusBadge({ status }) {
  const c = status==="Action Required"?"#ff3333":status==="Follow Up"?"#ffdd00":status==="Booked"?"#00ff88":"#555";
  return <span style={{ fontFamily:"monospace", fontSize:"10px", color:c, background:`${c}20`, border:`1px solid ${c}44`, padding:"2px 7px", borderRadius:"4px" }}>{status||"New"}</span>;
}
function WebhookBadge({ ws }) {
  const m = { fired:{c:"#00ff88",l:"FIRED"}, pending:{c:"#ffdd00",l:"PENDING"}, failed:{c:"#ff3333",l:"FAILED"}, none:{c:"#333",l:"—"} };
  const s = m[ws] || m.none;
  return <span style={{ fontFamily:"monospace", fontSize:"10px", color:s.c, background:`${s.c}15`, border:`1px solid ${s.c}33`, padding:"2px 7px", borderRadius:"4px" }}>{s.l}</span>;
}

function LogPanel({ leadId, logs }) {
  const items = logs.filter(l => l.lead_id === leadId);
  if (!items.length) return <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#2a2a2a" }}>NO LOG ENTRIES</div>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
      {items.map(l => (
        <div key={l.id} style={{ display:"flex", gap:"10px", padding:"5px 8px", background:"#0f0f0f", borderRadius:"5px", borderLeft:"2px solid #1a1a1a" }}>
          <span style={{ fontFamily:"monospace", fontSize:"9px", color:"#333", whiteSpace:"nowrap", flexShrink:0 }}>{l.created_at ? new Date(l.created_at).toLocaleTimeString() : "—"}</span>
          <span style={{ fontSize:"11px", color:"#666" }}>{l.event}</span>
        </div>
      ))}
    </div>
  );
}

function LeadRow({ lead, logs, onNotesUpdate }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);
  const saveNotes = async (e) => { e.stopPropagation(); setSaving(true); await Lead.update(lead.id,{notes}); onNotesUpdate(lead.id,notes); setSaving(false); };
  return (
    <>
      <tr onClick={() => setOpen(!open)} style={{ borderBottom:"1px solid #0f0f0f", cursor:"pointer" }}>
        <td style={{ padding:"10px 12px", fontSize:"10px", color:"#333", fontFamily:"monospace" }}>{open?"▼":"▶"}</td>
        <td style={{ padding:"10px 12px", fontSize:"12px", color:"#ddd", fontWeight:"500" }}>{lead.name}</td>
        <td style={{ padding:"10px 12px", fontSize:"11px", color:"#666" }}>{lead.email||"—"}</td>
        <td style={{ padding:"10px 12px", fontSize:"11px", color:"#666" }}>{lead.phone||"—"}</td>
        <td style={{ padding:"10px 12px", fontSize:"11px", color:"#777" }}>{lead.business_type||"—"}</td>
        <td style={{ padding:"10px 12px" }}><ScoreBadge score={lead.score} /></td>
        <td style={{ padding:"10px 12px" }}><StatusBadge status={lead.status} /></td>
        <td style={{ padding:"10px 12px" }}><WebhookBadge ws={lead.webhook_status||"none"} /></td>
        <td style={{ padding:"10px 12px", fontSize:"10px", color:"#444" }}>{lead.created_date ? new Date(lead.created_date).toLocaleDateString() : "—"}</td>
      </tr>
      {open && (
        <tr style={{ background:"#0d0d0d" }}>
          <td colSpan={9} style={{ padding:"16px 18px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
              <div>
                <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#444", letterSpacing:"2px", marginBottom:"10px" }}>LEAD DETAILS</div>
                {[["Service Need",lead.service_need],["Urgency",lead.urgency],["Mode",lead.processing_mode],["Token",lead.submission_token]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid #111", fontSize:"11px" }}>
                    <span style={{ color:"#444", fontFamily:"monospace", fontSize:"9px" }}>{k}</span>
                    <span style={{ color:"#777" }}>{v||"—"}</span>
                  </div>
                ))}
                <div style={{ marginTop:"12px" }}>
                  <label style={LBL}>NOTES</label>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} onClick={e=>e.stopPropagation()} rows={3}
                    style={{ ...INP, resize:"vertical", fontSize:"11px" }} placeholder="Add notes..." />
                  <button onClick={saveNotes} disabled={saving}
                    style={{ marginTop:"5px", background:"transparent", border:"1px solid #00ff8844", color:"#00ff88", padding:"4px 12px", borderRadius:"5px", fontFamily:"monospace", fontSize:"9px", cursor:"pointer" }}>
                    {saving?"SAVING...":"SAVE NOTES"}
                  </button>
                </div>
              </div>
              <div>
                <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#444", letterSpacing:"2px", marginBottom:"10px" }}>ACTIVITY LOG</div>
                <LogPanel leadId={lead.id} logs={logs} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AddLeadForm({ onSuccess, mode, webhookUrl }) {
  const [form, setForm] = useState({ name:"", phone:"", email:"", business_type:"", service_need:"", urgency:"medium" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const handle = e => setForm({...form,[e.target.name]:e.target.value});
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) { setErr("Name is required."); return; }
    setLoading(true); setErr("");
    try {
      const token = generateToken();
      const lead = await Lead.create({ ...form, score:"PENDING", status:"New", webhook_status:"none", processing_mode:mode, submission_token:token });
      processLead(lead, mode, webhookUrl).catch(console.error);
      setForm({ name:"", phone:"", email:"", business_type:"", service_need:"", urgency:"medium" });
      onSuccess(lead);
    } catch(e) { setErr("Failed to save. Try again."); }
    setLoading(false);
  };
  return (
    <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
        <div><label style={LBL}>NAME *</label><input style={INP} name="name" value={form.name} onChange={handle} placeholder="Full name" /></div>
        <div><label style={LBL}>PHONE</label><input style={INP} name="phone" value={form.phone} onChange={handle} placeholder="(555) 000-0000" /></div>
      </div>
      <div><label style={LBL}>EMAIL</label><input style={INP} name="email" type="email" value={form.email} onChange={handle} placeholder="email@example.com" /></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
        <div><label style={LBL}>BUSINESS TYPE</label><input style={INP} name="business_type" value={form.business_type} onChange={handle} placeholder="e.g. Restaurant..." /></div>
        <div><label style={LBL}>URGENCY</label>
          <select style={{ ...INP, cursor:"pointer" }} name="urgency" value={form.urgency} onChange={handle}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </div>
      </div>
      <div><label style={LBL}>SERVICE NEED</label><input style={INP} name="service_need" value={form.service_need} onChange={handle} placeholder="What do they need?" /></div>
      {err && <div style={{ color:"#ff3333", fontSize:"11px", fontFamily:"monospace", background:"#ff000010", border:"1px solid #ff333322", borderRadius:"5px", padding:"7px 10px" }}>{err}</div>}
      <button type="submit" disabled={loading} style={{ background:loading?"#0a3320":"#00ff88", color:loading?"#00ff88":"#000", border:"none", borderRadius:"7px", padding:"10px", fontSize:"11px", fontWeight:"700", fontFamily:"monospace", letterSpacing:"2px", cursor:loading?"not-allowed":"pointer" }}>
        {loading?"SAVING...":"ADD LEAD →"}
      </button>
    </form>
  );
}

export default function AgentIntake() {
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("internal");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterScore, setFilterScore] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [l, al] = await Promise.all([Lead.list(), ActivityLog.list()]);
      setLeads(l.sort((a,b) => new Date(b.created_date)-new Date(a.created_date)));
      setLogs(al);
    } catch(e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onLeadAdded = (lead) => {
    setLeads(prev => [lead, ...prev]);
    setShowForm(false);
    setToast(`Lead "${lead.name}" saved — processing...`);
    setTimeout(() => setToast(""), 4000);
    setTimeout(() => { ActivityLog.list().then(setLogs).catch(()=>{}); }, 3500);
    setTimeout(() => { load(); }, 8000);
  };

  const filtered = leads.filter(l => {
    if (filterScore !== "ALL" && l.score !== filterScore) return false;
    if (filterStatus !== "ALL" && l.status !== filterStatus) return false;
    if (search) { const q = search.toLowerCase(); return (l.name||"").toLowerCase().includes(q)||(l.email||"").toLowerCase().includes(q)||(l.business_type||"").toLowerCase().includes(q); }
    return true;
  });

  const hot = leads.filter(l=>l.score==="HOT").length;
  const warm = leads.filter(l=>l.score==="WARM").length;
  const cold = leads.filter(l=>l.score==="COLD").length;
  const pending = leads.filter(l=>l.score==="PENDING").length;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0a0a0a", color:"#e0e0e0", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <Sidebar />
      <main style={{ flex:1, overflow:"auto", padding:"28px", maxWidth:"1300px" }}>
        <div style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"3px", marginBottom:"5px" }}>AGENT 01</div>
        <h1 style={{ fontSize:"22px", fontWeight:"700", color:"#fff", margin:"0 0 4px" }}>Intake Agent</h1>
        <p style={{ color:"#555", fontSize:"12px", marginBottom:"20px" }}>Lead capture, scoring, and routing.</p>

        <div style={{ display:"flex", gap:"10px", marginBottom:"20px", flexWrap:"wrap" }}>
          {[["TOTAL",leads.length,"#00ff88"],["HOT",hot,"#ff3333"],["WARM",warm,"#ffdd00"],["COLD",cold,"#888"],["PENDING",pending,"#444"]].map(([l,v,c]) => (
            <div key={l} style={{ background:"#111", border:`1px solid ${c}22`, borderRadius:"9px", padding:"12px 16px", minWidth:"90px" }}>
              <div style={{ fontFamily:"monospace", fontSize:"8px", color:"#444", letterSpacing:"2px", marginBottom:"3px" }}>{l}</div>
              <div style={{ fontSize:"26px", fontWeight:"700", color:c, lineHeight:1 }}>{loading?"…":v}</div>
            </div>
          ))}
        </div>

        <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"10px", padding:"16px", marginBottom:"16px", display:"flex", gap:"20px", flexWrap:"wrap", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#444", letterSpacing:"2px", marginBottom:"8px" }}>PROCESSING MODE</div>
            <div style={{ display:"flex", gap:"6px" }}>
              {["internal","webhook"].map(m => (
                <button key={m} onClick={()=>setMode(m)} style={{ padding:"7px 14px", borderRadius:"6px", cursor:"pointer", fontFamily:"monospace", fontSize:"10px", letterSpacing:"1px", background:mode===m?(m==="webhook"?"#ffdd0020":"#00ff8820"):"transparent", border:mode===m?`1px solid ${m==="webhook"?"#ffdd00":"#00ff88"}`:"1px solid #1a1a1a", color:mode===m?(m==="webhook"?"#ffdd00":"#00ff88"):"#444" }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {mode==="webhook" && (
            <div style={{ flex:1, minWidth:"240px" }}>
              <label style={LBL}>N8N WEBHOOK URL</label>
              <div style={{ display:"flex", gap:"6px" }}>
                <input style={{ ...INP, flex:1 }} value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} placeholder="https://your-n8n.app/webhook/..." />
                <button onClick={()=>{setWebhookSaved(true);setTimeout(()=>setWebhookSaved(false),2000);}} style={{ background:webhookSaved?"#ffdd0020":"transparent", border:`1px solid ${webhookSaved?"#ffdd00":"#333"}`, color:webhookSaved?"#ffdd00":"#555", padding:"9px 12px", borderRadius:"7px", cursor:"pointer", fontFamily:"monospace", fontSize:"9px", whiteSpace:"nowrap" }}>
                  {webhookSaved?"SAVED ✓":"SAVE"}
                </button>
              </div>
            </div>
          )}
        </div>

        {toast && <div style={{ background:"#00ff8812", border:"1px solid #00ff8844", borderRadius:"7px", padding:"9px 14px", marginBottom:"14px", fontFamily:"monospace", fontSize:"11px", color:"#00ff88" }}>✓ {toast}</div>}

        <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:"12px", overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1a1a", display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontFamily:"monospace", fontSize:"10px", color:"#00ff88", letterSpacing:"2px" }}>LEADS</span>
            <input style={{ ...INP, width:"160px", padding:"6px 10px" }} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ ...INP, width:"110px", padding:"6px 9px", cursor:"pointer" }} value={filterScore} onChange={e=>setFilterScore(e.target.value)}>
              <option value="ALL">All Scores</option>
              <option value="HOT">HOT</option><option value="WARM">WARM</option><option value="COLD">COLD</option><option value="PENDING">PENDING</option>
            </select>
            <select style={{ ...INP, width:"150px", padding:"6px 9px", cursor:"pointer" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="New">New</option><option value="Action Required">Action Required</option>
              <option value="Follow Up">Follow Up</option><option value="Nurture">Nurture</option>
              <option value="Contacted">Contacted</option><option value="Booked">Booked</option>
            </select>
            <button onClick={()=>setShowForm(!showForm)} style={{ marginLeft:"auto", background:showForm?"transparent":"#00ff88", color:showForm?"#555":"#000", border:showForm?"1px solid #222":"none", padding:"7px 14px", borderRadius:"7px", cursor:"pointer", fontFamily:"monospace", fontSize:"10px", fontWeight:"700" }}>
              {showForm?"CANCEL":"+ ADD LEAD"}
            </button>
            <button onClick={load} style={{ background:"transparent", border:"1px solid #1a1a1a", color:"#444", padding:"7px 10px", borderRadius:"7px", cursor:"pointer", fontFamily:"monospace", fontSize:"9px" }}>↺</button>
          </div>

          {showForm && (
            <div style={{ padding:"18px", borderBottom:"1px solid #1a1a1a", background:"#0d0d0d" }}>
              <div style={{ fontFamily:"monospace", fontSize:"9px", color:"#444", letterSpacing:"2px", marginBottom:"12px" }}>ADD LEAD — MODE: {mode.toUpperCase()}</div>
              <AddLeadForm onSuccess={onLeadAdded} mode={mode} webhookUrl={webhookUrl} />
            </div>
          )}

          {loading ? (
            <div style={{ padding:"40px", textAlign:"center", fontFamily:"monospace", fontSize:"11px", color:"#333" }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:"40px", textAlign:"center", fontFamily:"monospace", fontSize:"11px", color:"#2a2a2a" }}>NO LEADS MATCH FILTERS</div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ borderBottom:"1px solid #1a1a1a" }}>
                  {["","NAME","EMAIL","PHONE","BUSINESS TYPE","SCORE","STATUS","WEBHOOK","DATE"].map(h => (
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontFamily:"monospace", fontSize:"8px", color:"#333", letterSpacing:"1px", fontWeight:"normal" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(lead => (
                    <LeadRow key={lead.id} lead={lead} logs={logs} onNotesUpdate={(id,n)=>setLeads(prev=>prev.map(l=>l.id===id?{...l,notes:n}:l))} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
