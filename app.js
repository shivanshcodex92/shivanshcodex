import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  orderBy,
  limit,
  writeBatch,
  increment,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================
   Firebase Config (YOUR API)
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyDS6wdYNG2Q7ZUNPjUXdOn-Sqb3cLC4NgQ",
  authDomain: "shivanshcodex-5fa03.firebaseapp.com",
  projectId: "shivanshcodex-5fa03",
  storageBucket: "shivanshcodex-5fa03.firebasestorage.app",
  messagingSenderId: "160989825267",
  appId: "1:160989825267:web:891e3ac888a46df3920f86",
  measurementId: "G-76T69H9HM5",
};

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch {}
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   DOM
========================= */
const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const logoutBtn = document.getElementById("logoutBtn");

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const loginMsg = document.getElementById("loginMsg");

const meLabel = document.getElementById("meLabel");
const addUserInput = document.getElementById("addUserInput");
const addUserBtn = document.getElementById("addUserBtn");
const chatListEl = document.getElementById("chatList");

const chatAvatar = document.getElementById("chatAvatar");
const chatName = document.getElementById("chatName");
const chatStatus = document.getElementById("chatStatus");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const tabs = document.querySelectorAll(".tab");
const toastEl = document.getElementById("toast");
const moreBtn = document.getElementById("moreBtn");

/* =========================
   Helpers
========================= */
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => (toastEl.style.display = "none"), 1600);
}

function safeUser(u) {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\.]/g, "");
}

/* username->fake email (so UI me sirf username/password) */
function emailFromUsername(username) {
  const u = safeUser(username);
  return `${u}@shivanshcodex.local`;
}

function initials(name) {
  const s = (name || "?").trim();
  return s ? s[0].toUpperCase() : "?";
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m} ${ampm}`;
}

/* deterministic chatId avoids composite index */
function chatIdFor(u1, u2) {
  return [u1, u2].sort().join("_");
}

async function upsertUserProfile(uid, username) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      username,
      online: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      username,
      online: true,
      lastSeen: serverTimestamp(),
    });
  }
}

async function setOnline(uid, online) {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  try {
    await updateDoc(ref, {
      online,
      lastSeen: serverTimestamp(),
    });
  } catch {}
}

function showLogin() {
  loginScreen.style.display = "block";
  appScreen.style.display = "none";
  logoutBtn.style.display = "none";
}
function showApp() {
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
  logoutBtn.style.display = "inline-flex";
}

/* =========================
   Auth + State
========================= */
let me = null; // { uid, username }
let chatsUnsub = null;
let msgsUnsub = null;
let activeChat = null; // { chatId, otherUid, otherUsername }

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    me = null;
    activeChat = null;
    stopAllListeners();
    showLogin();
    return;
  }

  // load username from /users/{uid}
  const uref = doc(db, "users", user.uid);
  const usnap = await getDoc(uref);
  const username = usnap.exists() ? usnap.data().username : "user";
  me = { uid: user.uid, username };

  showApp();
  meLabel.textContent = `You: ${me.username}`;

  await setOnline(me.uid, true);
  listenChats();
});

window.addEventListener("beforeunload", () => {
  if (me?.uid) setOnline(me.uid, false);
});

/* =========================
   Login / Signup
========================= */
async function doSignup() {
  const username = safeUser(usernameEl.value);
  const password = String(passwordEl.value || "");
  if (!username || password.length < 6) {
    loginMsg.textContent = "Username required + Password min 6 characters";
    return;
  }

  try {
    const email = emailFromUsername(username);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await upsertUserProfile(cred.user.uid, username);
    loginMsg.textContent = "Account created ✅";
  } catch (e) {
    loginMsg.textContent = e?.message || "Signup failed";
  }
}

async function doLogin() {
  const username = safeUser(usernameEl.value);
  const password = String(passwordEl.value || "");
  if (!username || !password) {
    loginMsg.textContent = "Enter username + password";
    return;
  }

  try {
    const email = emailFromUsername(username);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await upsertUserProfile(cred.user.uid, username);
    loginMsg.textContent = "Logged in ✅";
  } catch (e) {
    loginMsg.textContent =
      "Login failed (username/password wrong or account not created)";
  }
}

/* CLICK FIX: ensure overlay never blocks */
loginBtn.addEventListener("click", doLogin);
signupBtn.addEventListener("click", doSignup);

passwordEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});

logoutBtn.addEventListener("click", async () => {
  if (me?.uid) await setOnline(me.uid, false);
  await signOut(auth);
});

tabs.forEach((t) => {
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const tab = t.dataset.tab;
    if (tab !== "chats") toast("Coming soon 👀");
  });
});

moreBtn.addEventListener("click", () => {
  toast("Coming soon 👀");
});

/* =========================
   Chats (List)
========================= */
function stopAllListeners() {
  if (chatsUnsub) chatsUnsub();
  chatsUnsub = null;
  if (msgsUnsub) msgsUnsub();
  msgsUnsub = null;
}

function listenChats() {
  if (!me?.uid) return;
  stopAllListeners();

  const qChats = query(collection(db, "chats"), where("participants", "array-contains", me.uid));

  chatsUnsub = onSnapshot(qChats, async (snap) => {
    const docs = [];
    snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));

    // client-side sort (avoid composite index)
    docs.sort((a, b) => {
      const ta = a.lastMessageAt?.toMillis?.() || 0;
      const tb = b.lastMessageAt?.toMillis?.() || 0;
      return tb - ta;
    });

    renderChatList(docs);
  });
}

function renderChatList(chats) {
  chatListEl.innerHTML = "";

  if (!chats.length) {
    chatListEl.innerHTML = `<div class="emptyState" style="padding:14px;">No chats yet. Add user by username 👆</div>`;
    return;
  }

  for (const c of chats) {
    const otherUid = (c.participants || []).find((x) => x !== me.uid);
    const otherUsername = c.participantUsernames?.[otherUid] || "User";
    const unread = c.unread?.[me.uid] || 0;
    const online = c.participantOnline?.[otherUid] || false;

    const row = document.createElement("div");
    row.className = "chatRow" + (activeChat?.chatId === c.id ? " active" : "");
    row.innerHTML = `
      <div class="avatar">${initials(otherUsername)}</div>
      <div class="chatMeta">
        <div class="chatTop">
          <div class="chatUser">${otherUsername}</div>
          <div class="chatTime">${fmtTime(c.lastMessageAt)}</div>
        </div>
        <div class="chatBottom">
          <div class="chatLast">${c.lastMessage || ""}</div>
          <div class="badges">
            <div class="dot ${online ? "online" : ""}"></div>
            ${unread ? `<div class="unread">${unread}</div>` : ""}
          </div>
        </div>
      </div>
    `;

    row.addEventListener("click", () => openChat(c.id, otherUid, otherUsername));
    chatListEl.appendChild(row);
  }
}

/* =========================
   Add user by username -> start chat
========================= */
addUserBtn.addEventListener("click", async () => {
  if (!me?.uid) return;
  const uname = safeUser(addUserInput.value);
  if (!uname) return toast("Username likho");

  // find user by username
  const qU = query(collection(db, "users"), where("username", "==", uname), limit(1));
  const s = await getDocs(qU);

  if (s.empty) return toast("User not found");

  const other = s.docs[0].data();
  if (other.uid === me.uid) return toast("Apna username nahi 😄");

  await ensureChat(other.uid, other.username);
  addUserInput.value = "";
});

async function ensureChat(otherUid, otherUsername) {
  const id = chatIdFor(me.uid, otherUid);
  const ref = doc(db, "chats", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      chatId: id,
      participants: [me.uid, otherUid],
      participantUsernames: {
        [me.uid]: me.username,
        [otherUid]: otherUsername,
      },
      participantOnline: {
        [me.uid]: true,
        [otherUid]: false,
      },
      unread: { [me.uid]: 0, [otherUid]: 0 },
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } else {
    // update usernames if changed
    await updateDoc(ref, {
      [`participantUsernames.${me.uid}`]: me.username,
      [`participantUsernames.${otherUid}`]: otherUsername,
    });
  }

  // Open immediately
  await openChat(id, otherUid, otherUsername);
}

/* =========================
   Open Chat + Messages listener
========================= */
async function openChat(chatId, otherUid, otherUsername) {
  activeChat = { chatId, otherUid, otherUsername };

  // header
  chatAvatar.textContent = initials(otherUsername);
  chatName.textContent = otherUsername;
  chatStatus.textContent = "Loading...";

  // mark me online inside chat
  await updateDoc(doc(db, "chats", chatId), {
    [`participantOnline.${me.uid}`]: true,
  });

  // stop previous msgs listener
  if (msgsUnsub) msgsUnsub();

  // unread reset
  await updateDoc(doc(db, "chats", chatId), {
    [`unread.${me.uid}`]: 0,
  });

  // listen other user's online from users doc
  onSnapshot(doc(db, "users", otherUid), (snap) => {
    if (!snap.exists()) return;
    const u = snap.data();
    chatStatus.textContent = u.online ? "Online" : "Offline";
    // store in chat doc also (so chat list can show)
    updateDoc(doc(db, "chats", chatId), {
      [`participantOnline.${otherUid}`]: !!u.online,
    }).catch(() => {});
  });

  messagesEl.innerHTML = "";

  const qMsgs = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  msgsUnsub = onSnapshot(qMsgs, (snap) => {
    messagesEl.innerHTML = "";
    if (snap.empty) {
      messagesEl.innerHTML = `<div class="emptyState">Say hi 👋</div>`;
      return;
    }

    snap.forEach((d) => {
      const m = d.data();
      const div = document.createElement("div");
      const mine = m.senderId === me.uid;
      div.className = "bubble " + (mine ? "me" : "");
      div.innerHTML = `
        <div>${escapeHtml(m.text || "")}</div>
        <div class="time">${fmtTime(m.createdAt)}</div>
      `;
      messagesEl.appendChild(div);
    });

    // auto scroll bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  // rerender chat list highlight
  // (it will update on next snapshot automatically)
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =========================
   Send Message
========================= */
async function sendMessage() {
  if (!me?.uid) return;
  if (!activeChat?.chatId) return toast("Select a chat first");
  const text = String(messageInput.value || "").trim();
  if (!text) return;

  const chatRef = doc(db, "chats", activeChat.chatId);
  const msgRef = collection(db, "chats", activeChat.chatId, "messages");

  messageInput.value = "";

  // write message + update chat meta + unread increment for other user
  const batch = writeBatch(db);

  const newMsg = doc(msgRef); // auto id
  batch.set(newMsg, {
    text,
    senderId: me.uid,
    createdAt: serverTimestamp(),
  });

  batch.update(chatRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    [`unread.${activeChat.otherUid}`]: increment(1),
    [`unread.${me.uid}`]: 0,
    [`participantOnline.${me.uid}`]: true,
  });

  await batch.commit();
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
