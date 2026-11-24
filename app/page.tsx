"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Lead = { id:string; name:string; phone:string|null; email?:string|null; requirement:string|null; budget:number|null; location:string|null; status:string; follow_up_date:string|null; source?:string; notes?:string|null; created_at:string };
const statuses = ["New Lead","Contacted","Qualified","Site Visit","Negotiation","Converted","Follow-up","Lost"];
const money = (n:number) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n || 0);
const initialForm = {name:"",phone:"",requirement:"",budget:"",location:"",follow_up_date:"",status:"New Lead",notes:""};
export default function Home() {
  const router = useRouter();
  const [user,setUser] = useState<string|null>(null);
  const [leads,setLeads] = useState<Lead[]>([]);
  const [loading,setLoading] = useState(true);
  const [configured,setConfigured] = useState(true);
  const [tab,setTab] = useState("Overview");
  const [query,setQuery] = useState("");
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState(initialForm);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [aiPrompt,setAiPrompt] = useState("");
  const [aiAnswer,setAiAnswer] = useState("");
  const [aiBusy,setAiBusy] = useState(false);
  const [businessName,setBusinessName] = useState("My Business");

  async function load() {
    const sb = getSupabase();
    if (!sb) { setConfigured(false); setLoading(false); return; }
    const {data:{user:current}} = await sb.auth.getUser();
    setUser(current?.id || null);
    if (current) {
      const [{data:rows},{data:profile}] = await Promise.all([
        sb.from("leads").select("*").order("created_at",{ascending:false}),
        sb.from("business_profiles").select("business_name").eq("id",current.id).maybeSingle()
      ]);
      setLeads((rows || []) as Lead[]);
      if (profile?.business_name) setBusinessName(profile.business_name);
    }
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);
  const filtered = useMemo(()=>leads.filter(l=>[l.name,l.phone,l.requirement,l.location,l.status].join(" ").toLowerCase().includes(query.toLowerCase())),[leads,query]);
  const today = new Date().toISOString().slice(0,10);
  const followups = leads.filter(l=>l.follow_up_date && l.follow_up_date <= today && !["Converted","Lost"].includes(l.status));
  const active = leads.filter(l=>!["Converted","Lost"].includes(l.status));
  const converted = leads.filter(l=>l.status === "Converted");
  const pipeline = leads.reduce((sum,l)=>sum + Number(l.budget || 0),0);

  async function saveLead(e:FormEvent) {
    e.preventDefault(); setError("");
    const sb=getSupabase(); if (!sb || !user) { setError("Sign in and connect Supabase before saving live customer records."); return; }
    setSaving(true);
    const payload = {user_id:user,name:form.name.trim(),phone:form.phone.trim()||null,requirement:form.requirement.trim()||null,budget:form.budget ? Number(form.budget) : null,location:form.location.trim()||null,follow_up_date:form.follow_up_date||null,status:form.status,notes:form.notes.trim()||null};
    const {data,error:err}=await sb.from("leads").insert(payload).select().single();
    setSaving(false);
    if(err){setError(err.message);return;}
    setLeads(prev=>[data as Lead,...prev]); setForm(initialForm); setShowForm(false);
  }
  async function updateStatus(id:string,status:string) {
    const sb=getSupabase(); if(!sb) return;
    const {error:err}=await sb.from("leads").update({status,updated_at:new Date().toISOString()}).eq("id",id);
    if(err){setError(err.message);return;}
    setLeads(prev=>prev.map(l=>l.id===id?{...l,status}:l));
  }
  async function removeLead(id:string) {
    if(!confirm("Is customer record ko delete karna hai?")) return;
    const sb=getSupabase(); if(!sb) return;
    const {error:err}=await sb.from("leads").delete().eq("id",id);
    if(err){setError(err.message);return;}
    setLeads(prev=>prev.filter(l=>l.id!==id));
  }
  async function askAI(e:FormEvent) {
    e.preventDefault(); setAiBusy(true); setAiAnswer("");
    try {
      const sb=getSupabase();
      const {data:{session}} = sb ? await sb.auth.getSession() : {data:{session:null}};
      if (!session) { setAiAnswer("AI assistant use karne ke liye pehle sign in karo."); setAiBusy(false); return; }
      const r=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},body:JSON.stringify({prompt:aiPrompt})});
      const d=await r.json(); setAiAnswer(d.answer || d.error || "No response.");
    } catch {setAiAnswer("AI service unavailable. Try again.");}
    setAiBusy(false);
  }
  async function signOut(){const sb=getSupabase(); if(sb) await sb.auth.signOut(); setUser(null); setLeads([]);}
  const nav=[["Overview","▦"],["Customers & Leads","◉"],["Follow-ups","↗"],["Quotations","▤"],["AI Assistant","✳"],["Reports","▥"],["Settings","⚙"]];
  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/"><span className="brand-mark">BR</span><span>BUSINESS RESCUE<small>BUSINESS OS</small></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace"><span className="workspace-icon">B</span><span>{businessName}<small>{user ? "Connected account" : "Preview workspace"}</small></span><span className="chevron">⌄</span></div>
      <nav>{nav.map(([name,icon])=><button key={name} onClick={()=>setTab(name)} className={tab===name?"nav-item active":"nav-item"}><span>{icon}</span>{name}{name==="Follow-ups" && followups.length>0 && <i>{followups.length}</i>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✦</span><b>Need a hand?</b><p>Your business command centre, made simple.</p><button onClick={()=>setTab("AI Assistant")}>Ask AI assistant ↗</button></div><div className="user-row"><div className="avatar">{user?"U":"G"}</div><div className="user-meta"><b>{user ? "Your account" : "Guest preview"}</b><small>{user ? "Signed in" : "Not signed in"}</small></div>{user && <button className="icon-btn" onClick={signOut} title="Sign out">↪</button>}</div></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">BR</span> BUSINESS RESCUE</div><div className="breadcrumb">Workspace <span>/</span> {tab}</div><div className="top-actions"><span className={configured?"connection":"connection warning"}><i/> {configured?(user?"Database connected":"Preview mode"):"Setup required"}</span><button className="outline-btn" onClick={()=>router.push("/login")}>{user?"Account":"Sign in"}</button></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">TUESDAY, YOUR BUSINESS AT A GLANCE</div><h1>{tab==="Overview"?"Good to see you.":tab}</h1><p className="muted">{tab==="Overview"?"Here’s what’s happening with your business today.":"Keep every customer conversation moving forward."}</p></div><button className="primary-btn" onClick={()=>{setTab("Customers & Leads");setShowForm(true)}}>＋ Add customer</button></div>
        {!configured && <div className="setup-banner"><b>Connect your database to activate live mode.</b><span>Supabase URL + anon key required. Follow README setup instructions.</span><a href="https://supabase.com/dashboard" target="_blank">Open Supabase ↗</a></div>}
        {error && <div className="error-banner">{error}</div>}
        {tab==="Overview" && <>
          <div className="metric-grid">
            <Metric label="Total customers" value={leads.length.toString()} note="All captured leads" icon="◉"/>
            <Metric label="Active opportunities" value={active.length.toString()} note="Not yet closed" icon="↗"/>
            <Metric label="Converted customers" value={converted.length.toString()} note="Successfully won" icon="✓"/>
            <Metric label="Pipeline value" value={money(pipeline)} note="Based on lead budgets" icon="₹"/>
          </div>
          <div className="dashboard-grid">
            <section className="panel"><div className="panel-head"><div><h2>Recent customers</h2><p>Latest enquiries added to your workspace</p></div><button className="text-btn" onClick={()=>setTab("Customers & Leads")}>View all ↗</button></div><LeadTable leads={leads.slice(0,5)} onStatus={updateStatus} onDelete={removeLead}/></section>
            <section className="panel follow-panel"><div className="panel-head"><div><h2>Follow-up queue</h2><p>Customers who need your attention</p></div><span className="count-pill">{followups.length} due</span></div>{followups.length===0?<Empty text="No follow-ups due. You’re all caught up."/>:followups.slice(0,5).map(l=><div className="follow-row" key={l.id}><div className="follow-avatar">{l.name.slice(0,1).toUpperCase()}</div><div className="follow-info"><b>{l.name}</b><small>{l.requirement || "Customer enquiry"}</small></div><span className="due-label">{l.follow_up_date===today?"Today":"Overdue"}</span></div>)}</section>
          </div>
          <section className="panel quick-panel"><div><div className="eyebrow">WORK SMARTER</div><h2>Your business toolkit</h2><p className="muted">Everything you need to keep work moving.</p></div><div className="quick-actions"><button onClick={()=>{setTab("Customers & Leads");setShowForm(true)}}><span>＋</span><b>Add a lead</b><small>Capture a new enquiry</small></button><button onClick={()=>setTab("Follow-ups")}><span>↗</span><b>Track follow-ups</b><small>Never miss a callback</small></button><button onClick={()=>setTab("AI Assistant")}><span>✳</span><b>Ask your AI</b><small>Get practical business help</small></button></div></section>
        </>}
        {tab==="Customers & Leads" && <section className="panel"><div className="panel-head"><div><h2>Customer directory</h2><p>Manage enquiries, status and customer details.</p></div><button className="primary-btn small" onClick={()=>setShowForm(!showForm)}>＋ Add customer</button></div>
          {showForm && <form className="lead-form" onSubmit={saveLead}><div className="form-grid"><label>Customer name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Rahul Sharma"/></label><label>Phone number<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91"/></label><label>Requirement<input value={form.requirement} onChange={e=>setForm({...form,requirement:e.target.value})} placeholder="What do they need?"/></label><label>Budget (₹)<input type="number" min="0" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} placeholder="50000"/></label><label>Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="City / area"/></label><label>Follow-up date<input type="date" value={form.follow_up_date} onChange={e=>setForm({...form,follow_up_date:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label className="wide">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Important customer details…"/></label></div><div className="form-actions"><button type="button" className="outline-btn" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-btn" disabled={saving}>{saving?"Saving…":"Save customer"}</button></div></form>}
          <div className="table-toolbar"><input className="search-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="⌕  Search customers…"/><span className="muted">{filtered.length} records</span></div><LeadTable leads={filtered} onStatus={updateStatus} onDelete={removeLead}/>
        </section>}
        {tab==="Follow-ups" && <section className="panel"><div className="panel-head"><div><h2>Follow-up manager</h2><p>Prioritise callbacks and keep your pipeline moving.</p></div><span className="count-pill">{followups.length} due now</span></div>{leads.filter(l=>l.follow_up_date).sort((a,b)=>(a.follow_up_date||"").localeCompare(b.follow_up_date||"")).length===0?<Empty text="No follow-up dates yet. Add a date while creating a customer record."/>:<LeadTable leads={leads.filter(l=>l.follow_up_date).sort((a,b)=>(a.follow_up_date||"").localeCompare(b.follow_up_date||""))} onStatus={updateStatus} onDelete={removeLead}/>}</section>}
        {tab==="AI Assistant" && <section className="panel ai-panel"><div className="ai-orb">✳</div><div className="eyebrow">BUSINESS INTELLIGENCE</div><h2>Your AI business assistant</h2><p className="muted">Ask for help writing customer replies, planning promotions, improving sales or organising operations.</p><form onSubmit={askAI} className="ai-form"><textarea required value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="Example: Write a polite WhatsApp reply for a customer asking about my service price…"/><button className="primary-btn" disabled={aiBusy}>{aiBusy?"Thinking…":"Generate answer ✦"}</button></form>{aiAnswer && <div className="ai-answer"><b>AI response</b><p>{aiAnswer}</p></div>}<div className="suggestions"><button onClick={()=>setAiPrompt("Give me 5 low-budget marketing ideas for my local business.")}>Marketing ideas</button><button onClick={()=>setAiPrompt("Write a friendly follow-up message for a customer who has not replied.")}>Follow-up message</button><button onClick={()=>setAiPrompt("Create a simple 7-day plan to get more local customers.")}>7-day growth plan</button></div></section>}
        {tab==="Quotations" && <section className="panel placeholder-panel"><div className="tool-icon">▤</div><h2>Quotation builder</h2><p>Create itemised estimates with quantities, discounts and GST. This module is next in the MVP build.</p><span className="status-chip">In development</span></section>}
        {tab==="Reports" && <section className="panel"><div className="panel-head"><div><h2>Business snapshot</h2><p>Live totals calculated from your customer records.</p></div></div><div className="report-grid"><div><small>Total leads</small><b>{leads.length}</b></div><div><small>Active pipeline</small><b>{money(active.reduce((s,l)=>s+Number(l.budget||0),0))}</b></div><div><small>Converted value</small><b>{money(converted.reduce((s,l)=>s+Number(l.budget||0),0))}</b></div><div><small>Follow-ups due</small><b>{followups.length}</b></div></div></section>}
        {tab==="Settings" && <section className="panel settings-panel"><h2>Workspace settings</h2><p className="muted">Business identity and account connection.</p><label>Business name<input value={businessName} onChange={e=>setBusinessName(e.target.value)}/></label><p className="muted">Business profile editing will be connected to your Supabase profile in the next settings pass.</p><div className="settings-row"><span>Database</span><b>{configured?(user?"Connected":"Not signed in"):"Not configured"}</b></div><div className="settings-row"><span>AI assistant</span><b>Server key required</b></div><a className="text-btn" href="/login">Manage account ↗</a></section>}
        <footer className="footer">AI BUSINESS RESCUE <span>Built for the people who build local businesses.</span><span>Secure workspace · Your data stays yours</span></footer>
      </div>
    </section>
  </main>;
}
function Metric({label,value,note,icon}:{label:string;value:string;note:string;icon:string}){return <div className="metric-card"><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{note}</small></div>}
function Empty({text}:{text:string}){return <div className="empty-state"><span>✧</span><p>{text}</p></div>}
function LeadTable({leads,onStatus,onDelete}:{leads:Lead[];onStatus:(id:string,status:string)=>void;onDelete:(id:string)=>void}) {
  if(!leads.length)return <Empty text="No customers yet. Add your first enquiry to get started."/>;
  return <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Requirement</th><th>Budget</th><th>Follow-up</th><th>Status</th><th></th></tr></thead><tbody>{leads.map(l=><tr key={l.id}><td><div className="customer-cell"><span className="customer-avatar">{l.name.slice(0,1).toUpperCase()}</span><span><b>{l.name}</b><small>{l.phone || l.location || "No contact details"}</small></span></div></td><td>{l.requirement || "—"}</td><td>{l.budget?money(Number(l.budget)):"—"}</td><td>{l.follow_up_date || "—"}</td><td><select className="status-select" value={l.status} onChange={e=>onStatus(l.id,e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></td><td><button className="delete-btn" onClick={()=>onDelete(l.id)} title="Delete customer">×</button></td></tr>)}</tbody></table></div>;
}
