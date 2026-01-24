"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {
  findUser,
  listenChats,
  listenMessages,
  sendMessage,
  startChat,
} from "@/lib/chat";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [username, setUsername] = useState("");

  const [chats, setChats] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    return listenChats(user.uid, setChats);
  }, [user]);

  useEffect(() => {
    if (!active) return;
    return listenMessages(active, setMsgs);
  }, [active]);

  if (!user) {
    return (
      <div className="bg" style={{ padding: 40 }}>
        <h2>Login / Register</h2>
        <input placeholder="email" onChange={(e) => setEmail(e.target.value)} /><br />
        <input placeholder="password" type="password" onChange={(e) => setPass(e.target.value)} /><br />
        <input placeholder="username (register only)" onChange={(e) => setUsername(e.target.value)} /><br />
        <button onClick={async () => {
          if (username) {
            const c = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", c.user.uid), { username, email });
          } else {
            await signInWithEmailAndPassword(auth, email, pass);
          }
        }}>Go</button>
      </div>
    );
  }

  return (
    <div className="bg" style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: 280 }}>
        <button onClick={() => signOut(auth)}>Logout</button>
        <input placeholder="add user" onChange={(e) => setSearch(e.target.value)} />
        <button onClick={async () => {
          const u = await findUser(search);
          if (u) setActive(await startChat(user.uid, u.uid));
        }}>+</button>

        {chats.map(c => (
          <div key={c.id} onClick={() => setActive(c.id)}>
            {Object.values(c.names).find((n: any) => n !== username)}
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {msgs.map(m => <div key={m.id}>{m.text}</div>)}
        <input value={text} onChange={(e) => setText(e.target.value)} />
        <button onClick={() => { sendMessage(active!, user.uid, text); setText(""); }}>➤</button>
      </div>
    </div>
  );
}
