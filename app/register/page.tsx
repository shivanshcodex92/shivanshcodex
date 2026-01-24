"use client";

import { useState } from "react";
import { isUsernameTaken, registerUser } from "@/lib/auth";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div style={{ maxWidth: 420, margin: "70px auto" }} className="card">
      <h2 style={{ marginTop: 0 }}>Register</h2>

      <input className="input" placeholder="Username (unique)" value={username} onChange={(e) => setUsername(e.target.value)} />
      <div style={{ height: 10 }} />
      <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div style={{ height: 10 }} />
      <input className="input" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />

      <div style={{ height: 12 }} />
      <button
        className="btn"
        style={{ width: "100%" }}
        onClick={async () => {
          setMsg("");
          const u = username.trim();
          if (u.length < 3) return setMsg("Username min 3 chars");
          try {
            if (await isUsernameTaken(u)) return setMsg("Username already taken");

            await registerUser(email, pass, u);
            window.location.href = "/app";
          } catch (e: any) {
            setMsg(e?.message || "Register failed");
          }
        }}
      >
        Create Account
      </button>

      <div style={{ height: 10 }} />
      <button className="btn" style={{ width: "100%" }} onClick={() => (window.location.href = "/login")}>
        Back to login
      </button>

      {msg ? <p style={{ color: "#ff8080" }}>{msg}</p> : null}
      <p style={{ opacity: 0.7, fontSize: 13 }}>
        Tip: Dusre browser/incognito me dusra user register karke chat test karo.
      </p>
    </div>
  );
}
