"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { logoutUser, getUserById } from "@/lib/auth";
import {
  ChatDoc,
  MessageDoc,
  findUserByUsername,
  listenChats,
  listenMessages,
  otherUsername,
  sendMessage,
  startChat,
} from "@/lib/chat";

export default function AppPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);

  const [chats, setChats] = useState<Array<{ id: string } & ChatDoc>>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId) || null, [chats, activeChatId]);

  const [messages, setMessages] = useState<Array<{ id: string } & MessageDoc>>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/login";
        return;
      }
      setUid(u.uid);
      setMe(await getUserById(u.uid));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = listenChats(uid, (rows) => {
      setChats(rows);
      if (!activeChatId && rows.length) setActiveChatId(rows[0].id); // WhatsApp-like
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const unsub = listenMessages(activeChatId, (rows) => {
      setMessages(rows);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return () => unsub();
  }, [activeChatId]);

  if (!uid) return <div style={{ padding: 16 }}>Loading...</div>;

  const title = activeChat ? otherUsername(activeChat, uid) : "No chat selected";

  async function onAddUser() {
    setStatus("");
    const u = searchUsername.trim().toLowerCase();
    if (!u) return;

    const found = await findUserByUsername(u);
    if (!found) return setStatus("User not found ❌");
    if (found.uid === uid) return setStatus("Khud ko add nahi kar sakte 😄");

    const chatId = await startChat(uid, found.uid);
    setActiveChatId(chatId);
    setSearchUsername("");
    setStatus(`Chat ready with @${u} ✅`);
  }

  async function onSend() {
    if (!activeChatId) return;
    const t = text.trim();
    if (!t) return;
    setText("");
    await sendMessage(activeChatId, uid, t);
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Shivanshcodex</div>
            <div style={{ opacity: 0.65, fontSize: 12 }}>Logged in: {me?.username || "user"}</div>
          </div>
          <button
            className="btn"
            onClick={async () => {
              await logoutUser();
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            className="input"
            placeholder="Add user by username"
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddUser()}
          />
          <button className="btn" onClick={onAddUser} title="Add user">
            +
          </button>
        </div>

        {status ? <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{status}</div> : null}

        <div className="list">
          {chats.length === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 10 }}>
              No chats yet. Username add karke start karo.
            </div>
          ) : null}

          {chats.map((c) => (
            <div
              key={c.id}
              className={"item " + (c.id === activeChatId ? "active" : "")}
              onClick={() => setActiveChatId(c.id)}
            >
              <div style={{ fontWeight: 800 }}>{otherUsername(c, uid)}</div>
              <div style={{ opacity: 0.7, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.lastMessage || "No messages yet"}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat */}
      <main className="main">
        <div className="top">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
              title="DP"
            />
            <div style={{ fontWeight: 900 }}>{title}</div>
          </div>
          <div style={{ opacity: 0.6, fontSize: 12 }}>{activeChatId ? "Online" : ""}</div>
        </div>

        <div className="messages">
          {!activeChatId ? (
            <div style={{ opacity: 0.7 }}>Select a chat</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={"bubble " + (m.senderId === uid ? "me" : "")}>
                {m.text}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="bottom">
          <input
            className="input"
            placeholder="Type a message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            disabled={!activeChatId}
          />
          <button className="btn" onClick={onSend} disabled={!activeChatId} title="Send">
            ➤
          </button>
        </div>
      </main>
    </div>
  );
              }
