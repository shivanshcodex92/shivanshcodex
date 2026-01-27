import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, addDoc, query, where, getDocs, orderBy, limit, onSnapshot,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ===== Firebase config (your API) =====
const firebaseConfig = {
  apiKey: "AIzaSyDS6wdYNG2Q7ZUNPjUXdOn-Sqb3cLC4NgQ",
  authDomain: "shivanshcodex-5fa03.firebaseapp.com",
  projectId: "shivanshcodex-5fa03",
  storageBucket: "shivanshcodex-5fa03.firebasestorage.app",
  messagingSenderId: "160989825267",
  appId: "1:160989825267:web:891e3ac888a46df3920f86",
  measurementId: "G-76T69H9HM5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== UI refs =====
const screenLogin = document.getElementById("screen-login");
const screenList  = document.getElementById("screen-list");
const screenChat  = document.getElementById("screen-chat");

const btnLogout = document.getElementById("btnLogout");
const btnBack   = document.getElementById("btnBack");

// ✅ install button
const btnInstall = document.getElementById("btnInstall");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");
const btnCreate = document.getElementById("btnCreate");
const authMsg = document.getElementById("authMsg");

const meLine = document.getElementById("meLine");
const addUsername = document.getElementById("addUsername");
const btnAddUser = document.getElementById("btnAddUser");
const chatListEl = document.getElementById("chatList");
const listMsg = document.getElementById("listMsg");

const chatTitle = document.getElementById("chatTitle");
const chatStatus = document.getElementById("chatStatus");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const btnSend = document.getElementById("btnSend");

// bottom nav coming soon
["btnUpdates","btnCommunities","btnCalls"].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.onclick = () => alert("Coming soon");
});

// ===== state =====
let currentUser = null;     // { uid, username }
let currentChatId = null;   // string | null
let currentOther = null;    // { uid, username } | null

let unsubChats = null;
let unsubMsgs = null;

let isMarkingSeen = false;

// ===== helpers =====
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

function emailFromUsername(username){
  // fake email for firebase email/pass auth
  return `${username.toLowerCase()}@shivanshcodex.local`;
}

function cleanUsername(x){
  return (x||"").trim().toLowerCase();
}

function fmtTime(ts){
  if(!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  let h = d.getHours(); let m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if(h===0) h=12;
  const mm = String(m).padStart(2,"0");
  return `${h}:${mm} ${ampm}`;
}

function relTime(ts){
  if(!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff/1000);
  if(sec < 5) return "just now";
  if(sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec/60);
  if(min < 60) return `${min} min ago`;
  const hr = Math.floor(min/60);
  if(hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr/24);
  if(day === 1) return "yesterday";
  return `${day}d ago`;
}

/* ========= Install button (login page only) ========= */
let deferredPrompt = null;
let canInstall = false;

function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  canInstall = true;
  renderScreens();
});

window.addEventListener("appinstalled", ()=>{
  deferredPrompt = null;
  canInstall = false;
  renderScreens();
});

btnInstall?.addEventListener("click", async ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  canInstall = false;
  renderScreens();
});

function renderScreens(){
  btnLogout.style.display = currentUser ? "inline-flex" : "none";

  // ✅ Install button ONLY on login screen
  const showInstall = !currentUser && canInstall && !isStandalone();
  if(btnInstall) btnInstall.style.display = showInstall ? "inline-flex" : "none";

  if(!currentUser){
    show(screenLogin); hide(screenList); hide(screenChat);
    return;
  }

  hide(screenLogin);

  if(currentChatId){
    hide(screenList); show(screenChat);
  }else{
    show(screenList); hide(screenChat);
  }
}

// ===== AUTH (username+password UX) =====
btnCreate.onclick = async () => {
  authMsg.textContent = "";
  const username = cleanUsername(loginUsername.value);
  const password = (loginPassword.value || "").trim();

  if(!username || !password){
    authMsg.textContent = "username & password required";
    return;
  }

  try{
    const email = emailFromUsername(username);
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      username,
      createdAt: serverTimestamp(),
      online: true,
      lastSeen: serverTimestamp(),
    });

    authMsg.textContent = "Account created ✅";
  }catch(e){
    console.error(e);
    authMsg.textContent = e?.message || String(e);
  }
};

btnLogin.onclick = async () => {
  authMsg.textContent = "";
  const username = cleanUsername(loginUsername.value);
  const password = (loginPassword.value || "").trim();

  if(!username || !password){
    authMsg.textContent = "username & password required";
    return;
  }

  try{
    const email = emailFromUsername(username);
    await signInWithEmailAndPassword(auth, email, password);
  }catch(e){
    console.error(e);
    authMsg.textContent = e?.message || String(e);
  }
};

btnLogout.onclick = async () => {
  await signOut(auth);
};

// auth state listener
onAuthStateChanged(auth, async (user)=>{
  // cleanup listeners
  if(unsubChats){ unsubChats(); unsubChats=null; }
  if(unsubMsgs){ unsubMsgs(); unsubMsgs=null; }

  if(!user){
    currentUser = null;
    currentChatId = null;
    currentOther = null;
    messagesEl.innerHTML = "";
    chatListEl.innerHTML = "";
    renderScreens();
    return;
  }

  // load user profile
  const snap = await getDoc(doc(db, "users", user.uid));
  let username = snap.exists() ? (snap.data().username || "") : "";

  // if profile missing, fallback from email
  if(!username && user.email){
    username = user.email.split("@")[0];
    await setDoc(doc(db, "users", user.uid), { uid:user.uid, username }, { merge:true });
  }

  currentUser = { uid: user.uid, username };
  await setDoc(doc(db, "users", user.uid), { online:true, lastSeen: serverTimestamp() }, { merge:true });

  meLine.textContent = `You: ${username}`;
  currentChatId = null;
  currentOther = null;

  renderScreens();
  subscribeChatsList();
});

// ===== find user by username =====
async function findUserByUsername(username){
  const q1 = query(collection(db, "users"), where("username", "==", username));
  const qs = await getDocs(q1);
  if(qs.empty) return null;
  const d = qs.docs[0].data();
  return { uid: d.uid || qs.docs[0].id, username: d.username };
}

// ===== chat id deterministic =====
function makeChatId(a,b){
  return [a,b].sort().join("_");
}

// ===== start chat =====
async function startChat(myUid, otherUid){
  const chatId = makeChatId(myUid, otherUid);
  const ref = doc(db, "chats", chatId);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    await setDoc(ref, {
      users: [myUid, otherUid],
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastAt: serverTimestamp(),
      unread: { [myUid]: 0, [otherUid]: 0 }
    });
  }
  return chatId;
}

// ===== Add user => open chat screen =====
btnAddUser.onclick = async () => {
  listMsg.textContent = "";
  const uname = cleanUsername(addUsername.value);
  if(!uname) return;

  try{
    const other = await findUserByUsername(uname);
    if(!other){ listMsg.textContent = "User not found"; return; }
    if(other.uid === currentUser.uid){ listMsg.textContent = "Khud ko add nahi kar sakte"; return; }

    const chatId = await startChat(currentUser.uid, other.uid);
    addUsername.value = "";

    await openChat(chatId, other);
  }catch(e){
    console.error(e);
    listMsg.textContent = e?.message || String(e);
  }
};

// ===== seen marker (receiver marks messages as seen) =====
async function markMessagesAsSeen(chatId){
  if(!currentUser || !currentOther) return;
  if(isMarkingSeen) return;
  isMarkingSeen = true;

  try{
    const otherUid = currentOther.uid;

    const q1 = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const snap = await getDocs(q1);

    const batch = writeBatch(db);
    let count = 0;

    snap.forEach((docSnap)=>{
      const m = docSnap.data();
      if(m.senderId === otherUid){
        const seenBy = m.seenBy || {};
        if(!seenBy[currentUser.uid]){
          batch.update(docSnap.ref, { [`seenBy.${currentUser.uid}`]: serverTimestamp() });
          count++;
        }
      }
    });

    if(count > 0) await batch.commit();
  }catch(e){
    console.error("markMessagesAsSeen error:", e);
  }finally{
    isMarkingSeen = false;
  }
}

// ===== open chat full screen =====
async function openChat(chatId, other){
  currentChatId = chatId;
  currentOther = other;

  chatTitle.textContent = other.username;
  chatStatus.textContent = "Online";

  messagesEl.innerHTML = "";
  renderScreens();

  // mark unread to 0 for me
  await updateDoc(doc(db, "chats", chatId), {
    [`unread.${currentUser.uid}`]: 0
  });

  subscribeMessages(chatId);

  // subscribe other user's online
  onSnapshot(doc(db, "users", other.uid), (snap)=>{
    if(!snap.exists()) return;
    const d = snap.data();
    if(d.online){
      chatStatus.textContent = "Online";
    }else{
      chatStatus.textContent = d.lastSeen ? ("last seen " + fmtTime(d.lastSeen)) : "Offline";
    }
  });

  // initial seen mark
  await markMessagesAsSeen(chatId);
}

// back to list
btnBack.onclick = () => {
  if(unsubMsgs){ unsubMsgs(); unsubMsgs=null; }
  currentChatId = null;
  currentOther = null;
  messagesEl.innerHTML = "";
  renderScreens();
};

// ===== subscribe chats list =====
function subscribeChatsList(){
  if(unsubChats) unsubChats();

  const q1 = query(collection(db, "chats"), where("users", "array-contains", currentUser.uid));
  unsubChats = onSnapshot(q1, async (snap)=>{
    const rows = [];

    for(const docSnap of snap.docs){
      const c = docSnap.data();
      const chatId = docSnap.id;

      const otherUid = (c.users || []).find(u => u !== currentUser.uid);
      if(!otherUid) continue;

      const otherSnap = await getDoc(doc(db, "users", otherUid));
      const otherUsername = otherSnap.exists() ? otherSnap.data().username : "user";
      const online = otherSnap.exists() ? !!otherSnap.data().online : false;

      const unreadCount = (c.unread && c.unread[currentUser.uid]) ? c.unread[currentUser.uid] : 0;

      rows.push({
        chatId,
        other: { uid: otherUid, username: otherUsername },
        lastMessage: c.lastMessage || "",
        lastAt: c.lastAt || c.createdAt,
        unreadCount,
        online
      });
    }

    rows.sort((a,b)=>{
      const ta = a.lastAt?.toMillis ? a.lastAt.toMillis() : 0;
      const tb = b.lastAt?.toMillis ? b.lastAt.toMillis() : 0;
      return tb - ta;
    });

    renderChatList(rows);
  });
}

function renderChatList(rows){
  chatListEl.innerHTML = "";

  if(!rows.length){
    chatListEl.innerHTML = `<div style="color:rgba(255,255,255,.75); padding:10px;">No chats yet. Add a user to start.</div>`;
    return;
  }

  for(const r of rows){
    const div = document.createElement("div");
    div.className = "chatRow";

    div.innerHTML = `
      <div class="avatar">${(r.other.username||"?")[0].toUpperCase()}</div>
      <div class="mid">
        <div class="name">${r.other.username}</div>
        <div class="last">${escapeHtml(r.lastMessage || "—")}</div>
      </div>
      <div class="right">
        <div class="time">${fmtTime(r.lastAt)}</div>
        <div class="badges">
          ${r.online ? `<span class="dot"></span>` : ``}
          ${r.unreadCount ? `<span class="unread">${r.unreadCount}</span>` : ``}
        </div>
      </div>
    `;

    div.onclick = () => openChat(r.chatId, r.other);
    chatListEl.appendChild(div);
  }
}

// ===== subscribe messages =====
function subscribeMessages(chatId){
  if(unsubMsgs) unsubMsgs();

  const q1 = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"), limit(200));
  unsubMsgs = onSnapshot(q1, async (snap)=>{
    messagesEl.innerHTML = "";

    const myUid = currentUser.uid;
    const otherUid = currentOther?.uid;

    snap.forEach((d)=>{
      const m = d.data();
      const isMe = m.senderId === myUid;

      let seenLabel = "";
      if(isMe && otherUid){
        const seenTs = m.seenBy && m.seenBy[otherUid];
        if(seenTs){
          seenLabel = `<div class="seen">Seen ${relTime(seenTs)}</div>`;
        }
      }

      const bubble = document.createElement("div");
      bubble.className = "bubble" + (isMe ? " me" : "");
      bubble.innerHTML = `
        <div>${escapeHtml(m.text || "")}</div>
        <div class="meta">${fmtTime(m.createdAt)}</div>
        ${seenLabel}
      `;
      messagesEl.appendChild(bubble);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;

    // mark seen for incoming messages
    await markMessagesAsSeen(chatId);
  });
}

btnSend.onclick = async () => {
  const text = (msgInput.value || "").trim();
  if(!text || !currentChatId) return;

  msgInput.value = "";
  await sendMessage(currentChatId, currentUser.uid, text);
};

msgInput.addEventListener("keydown", (e)=>{
  if(e.key === "Enter") btnSend.click();
});

// ===== send message =====
async function sendMessage(chatId, myUid, text){
  const chatRef = doc(db, "chats", chatId);

  // who is other?
  const parts = chatId.split("_");
  const otherUid = parts[0] === myUid ? parts[1] : parts[0];

  await addDoc(collection(db, "chats", chatId, "messages"), {
    text,
    senderId: myUid,
    createdAt: serverTimestamp(),
    seenBy: { [myUid]: serverTimestamp() }
  });

  const chatSnap = await getDoc(chatRef);
  const unread = (chatSnap.exists() && chatSnap.data().unread) ? chatSnap.data().unread : {};
  const otherUnread = (unread[otherUid] || 0) + 1;

  await updateDoc(chatRef, {
    lastMessage: text,
    lastAt: serverTimestamp(),
    [`unread.${otherUid}`]: otherUnread
  });
}

// ===== small util =====
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// initial
renderScreens();
