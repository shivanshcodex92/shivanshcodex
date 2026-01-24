// Firebase (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/** ✅ YOUR FIREBASE CONFIG (same as you sent) */
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
getAnalytics(app);

const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const loginCard = document.getElementById("loginCard");
const appCard = document.getElementById("appCard");

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");

const loginBtn = document.getElementById("loginBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");

const meName = document.getElementById("meName");

const addUserInput = document.getElementById("addUserInput");
const addUserBtn = document.getElementById("addUserBtn");

const chatList = document.getElementById("chatList");

const chatName = document.getElementById("chatName");
const chatStatus = document.getElementById("chatStatus");

const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// ✅ NEW refs for UI control
const composerWrap = document.getElementById("composerWrap");
const emptyState = document.getElementById("emptyState");

let currentUser = null;
let currentUsername = null;

let activeChatId = null;
let activeOtherUid = null;
let activeOtherUsername = null;

let unsubChats = null;
let unsubMessages = null;

// helpers
function usernameToEmail(username) {
  // fake email mapping, so you can login with username+password (no gmail needed)
  const safe = String(username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${safe}@shivanshcodex.local`;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

async function getUsernameByUid(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().username : null;
}

async function findUserByUsername(username) {
  const uname = String(username || "").trim().toLowerCase();
  if (!uname) return null;

  const qy = query(collection(db, "users"), where("username", "==", uname), limit(1));
  const snap = await getDocs(qy);
  if (snap.empty) return null;

  const d = snap.docs[0];
  return { uid: d.id, ...d.data() };
}

function makeChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

// UI switches
function showLogin() {
  loginCard.style.display = "block";
  appCard.style.display = "none";
}

function showApp() {
  loginCard.style.display = "none";
  appCard.style.display = "grid";

  // ✅ default state: no chat selected
  composerWrap.style.display = "none";
  emptyState.style.display = "block";
  chatName.textContent = "Select a chat";
  chatStatus.textContent = "—";
}

// Auth
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    currentUsername = null;
    cleanupRealtime();
    showLogin();
    return;
  }

  currentUser = user;
  currentUsername = await getUsernameByUid(user.uid);
  if (!currentUsername) currentUsername = "user";

  meName.textContent = currentUsername;

  // set online
  await setDoc(
    doc(db, "users", user.uid),
    { username: currentUsername.toLowerCase(), online: true, lastSeen: serverTimestamp() },
    { merge: true }
  );

  showApp();
  listenChats();
});

// Login / Create
loginBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  const uname = usernameInput.value.trim().toLowerCase();
  const pass = passwordInput.value.trim();
  if (!uname || !pass) return (loginError.textContent = "Username & password required");

  try {
    await signInWithEmailAndPassword(auth, usernameToEmail(uname), pass);
  } catch (e) {
    loginError.textContent = e?.message || "Login failed";
  }
});

createBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  const uname = usernameInput.value.trim().toLowerCase();
  const pass = passwordInput.value.trim();
  if (!uname || !pass) return (loginError.textContent = "Username & password required");

  try {
    const cred = await createUserWithEmailAndPassword(auth, usernameToEmail(uname), pass);

    // create user profile
    await setDoc(doc(db, "users", cred.user.uid), {
      username: uname,
      online: true,
      lastSeen: serverTimestamp(),
    });

    // also update display immediately
    meName.textContent = uname;
  } catch (e) {
    loginError.textContent = e?.message || "Create account failed";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  if (currentUser) {
    await updateDoc(doc(db, "users", currentUser.uid), {
      online: false,
      lastSeen: serverTimestamp(),
    });
  }

  // ✅ reset UI state
  composerWrap.style.display = "none";
  emptyState.style.display = "block";

  await signOut(auth);
});

// Add user -> start chat
addUserBtn.addEventListener("click", async () => {
  const uname = addUserInput.value.trim().toLowerCase();
  addUserInput.value = "";
  if (!uname || !currentUser) return;

  const other = await findUserByUsername(uname);
  if (!other) return alert("User not found");

  if (other.uid === currentUser.uid) return alert("Cannot chat with yourself");

  const chatId = makeChatId(currentUser.uid, other.uid);
  const chatRef = doc(db, "chats", chatId);

  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    await setDoc(chatRef, {
      members: [currentUser.uid, other.uid],
      memberUsernames: {
        [currentUser.uid]: currentUsername,
        [other.uid]: other.username,
      },
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      unread: {
        [currentUser.uid]: 0,
        [other.uid]: 0,
      },
    });
  }

  openChat(chatId, other.uid, other.username);
});

// Chat list
function listenChats() {
  if (!currentUser) return;

  if (unsubChats) unsubChats();

  const qy = query(
    collection(db, "chats"),
    where("members", "array-contains", currentUser.uid),
    orderBy("lastMessageAt", "desc")
  );

  unsubChats = onSnapshot(qy, async (snap) => {
    chatList.innerHTML = "";

    if (snap.empty) {
      chatList.innerHTML = `<div class="muted">No chats yet. Add user to start.</div>`;
      return;
    }

    for (const d of snap.docs) {
      const data = d.data();
      const chatId = d.id;

      const otherUid = data.members.find((x) => x !== currentUser.uid);
      const otherUsername =
        data?.memberUsernames?.[otherUid] || (await getUsernameByUid(otherUid)) || "user";

      const lastMsg = data.lastMessage || "";
      const lastAt = data.lastMessageAt;
      const time = lastAt ? formatTime(lastAt) : "";
      const unreadCount = data?.unread?.[currentUser.uid] || 0;

      // online status (read from users doc)
      let online = false;
      try {
        const u = await getDoc(doc(db, "users", otherUid));
        online = u.exists() ? !!u.data().online : false;
      } catch {}

      const row = document.createElement("div");
      row.className = `chatRow ${activeChatId === chatId ? "active" : ""}`;
      row.innerHTML = `
        <div class="avatar">${escapeHtml(otherUsername[0] || "U").toUpperCase()}</div>
        <div class="chatMeta">
          <div class="chatTop">
            <div class="chatUser">${escapeHtml(otherUsername)}</div>
            <div class="chatTime">${escapeHtml(time)}</div>
          </div>
          <div class="chatBottom">
            <div class="chatPreview">${escapeHtml(lastMsg)}</div>
            <div class="chatRight">
              <span class="dot ${online ? "on" : ""}"></span>
              ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ""}
            </div>
          </div>
        </div>
      `;

      row.addEventListener("click", () => openChat(chatId, otherUid, otherUsername));
      chatList.appendChild(row);
    }
  });
}

async function openChat(chatId, otherUid, otherUsername) {
  activeChatId = chatId;
  activeOtherUid = otherUid;
  activeOtherUsername = otherUsername;

  // ✅ show composer only when a chat is opened
  composerWrap.style.display = "flex";
  emptyState.style.display = "none";

  chatName.textContent = otherUsername;
  chatStatus.textContent = "Online"; // (simple)

  // reset unread for me
  await updateDoc(doc(db, "chats", chatId), {
    [`unread.${currentUser.uid}`]: 0,
  });

  listenMessages();
}

function listenMessages() {
  if (!activeChatId) return;

  if (unsubMessages) unsubMessages();

  messagesEl.innerHTML = "";

  const msgsRef = collection(db, "chats", activeChatId, "messages");
  const qy = query(msgsRef, orderBy("createdAt", "asc"), limit(200));

  unsubMessages = onSnapshot(qy, (snap) => {
    messagesEl.innerHTML = "";

    snap.forEach((d) => {
      const m = d.data();
      const mine = m.senderUid === currentUser.uid;

      const bubble = document.createElement("div");
      bubble.className = `bubble ${mine ? "mine" : "theirs"}`;
      bubble.innerHTML = `
        <div class="txt">${escapeHtml(m.text || "")}</div>
        <div class="tm">${escapeHtml(formatTime(m.createdAt))}</div>
      `;
      messagesEl.appendChild(bubble);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// Send message
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !activeChatId) return;

  messageInput.value = "";

  const msgRef = collection(db, "chats", activeChatId, "messages");

  await addDoc(msgRef, {
    text,
    senderUid: currentUser.uid,
    senderUsername: currentUsername,
    createdAt: serverTimestamp(),
  });

  // update chat last message + unread for other
  const chatRef = doc(db, "chats", activeChatId);
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) {
    const data = chatSnap.data();
    const otherUid = data.members.find((x) => x !== currentUser.uid);
    const otherUnread = (data?.unread?.[otherUid] || 0) + 1;

    await updateDoc(chatRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      [`unread.${otherUid}`]: otherUnread,
    });
  }
}

// cleanup
function cleanupRealtime() {
  if (unsubChats) unsubChats();
  if (unsubMessages) unsubMessages();
  unsubChats = null;
  unsubMessages = null;

  activeChatId = null;
  activeOtherUid = null;
  activeOtherUsername = null;

  chatList.innerHTML = "";
  messagesEl.innerHTML = `<div id="emptyState" class="emptyState">Select a chat</div>`;
}
