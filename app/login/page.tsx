"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await login(email, pass);
      router.replace("/app");
    } catch (err: any) {
      setMsg(err?.message || "Login failed");
    }
  }

  return (
    <div className="pageCenter">
      <div className="card">
        <div style={{ fontSize: 22, fontWeight: 900 }}>Login</div>
        <div className="sub">WhatsApp-like chat</div>

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="btn btnPrimary" type="submit">Login</button>
        </form>

        {msg && <div style={{ marginTop: 12, color: "#ffb4b4" }}>{msg}</div>}

        <div style={{ marginTop: 14, color: "#8696a0", fontSize: 13 }}>
          New user? <a href="/register" style={{ color: "#00a884", fontWeight: 800 }}>Register</a>
        </div>
      </div>
    </div>
  );
}
