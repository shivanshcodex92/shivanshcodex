"use client";

import { useState } from "react";
import { loginUser } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div style={{ maxWidth: 420, margin: "70px auto" }} className="card">
      <h2 style={{ marginTop: 0 }}>Login</h2>

      <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div style={{ height: 10 }} />
      <input className="input" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />

      <div style={{ height: 12 }} />
      <button
        className="btn"
        style={{ width: "100%" }}
        onClick={async () => {
          setMsg("");
          try {
            await loginUser(email, pass);
            window.location.href = "/app";
          } catch (e: any) {
            setMsg(e?.message || "Login failed");
          }
        }}
      >
        Login
      </button>

      <div style={{ height: 10 }} />
      <button className="btn" style={{ width: "100%" }} onClick={() => (window.location.href = "/register")}>
        Create new account
      </button>

      {msg ? <p style={{ color: "#ff8080" }}>{msg}</p> : null}
    </div>
  );
}
