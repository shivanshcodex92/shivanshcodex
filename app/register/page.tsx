"use client";

import { useState } from "react";
import { registerWithUsername } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await registerWithUsername(email, pass, username);
      router.replace("/app");
    } catch (err: any) {
      setMsg(err?.message || "Register failed");
    }
  }

  return (
    <div className="pageCenter">
      <div className="card">
        <div style={{ fontSize: 22, fontWeight: 900 }}>Register</div>
        <div className="sub">Create username then login</div>

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <input className="input" placeholder="Username (unique)" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="btn btnPrimary" type="submit">Register</button>
        </form>

        {msg && <div style={{ marginTop: 12, color: "#ffb4b4" }}>{msg}</div>}

        <div style={{ marginTop: 14, color: "#8696a0", fontSize: 13 }}>
          Already have account? <a href="/login" style={{ color: "#00a884", fontWeight: 800 }}>Login</a>
        </div>
      </div>
    </div>
  );
}
