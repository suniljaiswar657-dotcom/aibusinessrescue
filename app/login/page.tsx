"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage("");
    const supabase = getSupabase();
    if (!supabase) { setMessage("Supabase setup pending. Add the two NEXT_PUBLIC_SUPABASE values in your environment."); return; }
    setBusy(true);
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm, then sign in.");
    else router.push("/");
  }
  return <main className="auth-shell"><section className="auth-card">
    <a className="brand" href="/"><span className="brand-mark">BR</span><span>BUSINESS RESCUE<small>BUSINESS OS</small></span></a>
    <div className="eyebrow">YOUR BUSINESS, UNDER CONTROL</div>
    <h1>{mode === "signin" ? "Welcome back." : "Create your workspace."}</h1>
    <p className="muted">Leads, customers and follow-ups — all in one place.</p>
    <form onSubmit={submit} className="auth-form">
      <label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com"/></label>
      <label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
      <button className="primary-btn full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
    </form>
    {message && <p className="notice">{message}</p>}
    <p className="switch-auth">{mode === "signin" ? "New here?" : "Already have an account?"} <button onClick={()=>setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create account" : "Sign in"}</button></p>
    <a className="back-link" href="/">← Back to dashboard preview</a>
  </section></main>;
}
