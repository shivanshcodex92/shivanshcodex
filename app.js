import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/** ✅ Your Firebase config (as you sent) */
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
const auth = getAuth(app);
const db = getFirestore(app);

/** ---------- UI refs ---------- */
const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const logoutBtn = document.getElementById("logoutBtn");

const authTitle = document.getElementById("authTitle");
const primaryBtn = document.getElementById("primaryBtn");
const toggleBtn = document.getElementById("toggleBtn");
const authMsg = document.getElementById("authMsg");

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const usernameRow = document.getElementById("usernameRow");
const usernameEl = document.getElementById("username");

const meUser = document.getElementById("meUser");
const meEmail = document.getElementById("meEmail");

const searchUser = document.getElementById("searchUser");
const addUserBtn = document.getElementById("addUserBtn");
const statusMsg = document.getElementById("statusMsg");

const chatList = document.getElementById("chatList");
const chatTitle = document.getElementById("chatTitle");
const chatSub = document.getElementById("chatSub");

const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

/** ---------- state ---------- */
let mode = "login"; // login | register
let currentUser = null;
let myProfile = null;

let activeChatId = null;
let activeChat = null;

let unsubChats = null;
let unsubMsgs = null;

/** ---------- helpers ---------- */
function setMsg(el, text, isError=false){
  el.textContent = text || "";
  el.style.color = isError ? "#ff8080" : "rgba(255,255,255,0.85)";
}
function chatIdFor(a,b){ return [a,b].sort().join("_"); }

async function getMyProfile(uid){
  const s = await getDoc(doc(db, "users", uid));
  return s.exists() ? ({ uid: s.id, ...s.data() }) : null;
}

async function usernameTaken(username){
  const u = username.trim().toLowerCase();
  const qy = query(collection(db,"users"), where("username","==",u), limit(1));
  const snap = await getDocs(qy);
  return !snap.empty;
}

async function findUserByUsername(username){
  const u = username.trim().toLowerCase();
  const qy = query(collection(db,"users"), where("username","==",u), limit(1));
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() };
}

function otherName(chat, myUid){
  const otherUid = (chat.users || []).find(x => x !== myUid);
  if (!otherUid) return "Chat";
  return (chat.usernames && chat.usernames[otherUid]) ? chat.usernames[otherUid] : "Chat";
}

/** ---------- auth UI ---------- */
function setMode(next){
  mode = next;
  if (mode === "login"){
    authTitle.textContent = "Login";
    primaryBtn.textContent = "Login";
    toggleBtn.textContent = "Create account";
    usernameRow.classList.add("hidden");
  } else {
    authTitle.textContent = "Create account";
    primaryBtn.textContent = "Register";
    toggleBtn.textContent = "Back to login";
    usernameRow.classList.remove("hidden");
  }
  setMsg(authMsg, "");
}

toggleBtn.addEventListener("click", () => {
  setMode(mode === "login" ? "register" : "login");
});

primaryBtn.addEventListener("click", async () => {
  try{
    setMsg(authMsg, "Working...");
    const email = (emailEl.value || "").trim().toLowerCase();
    const pass = (passEl.value || "").trim();
    if (!email || !pass) return setMsg(authMsg, "Email & password required", true);

    if (mode === "login"){
      await signInWithEmailAndPassword(auth, email, pass);
      setMsg(authMsg, "");
      return;
    }

    // register
    const uname = (usernameEl.value || "").trim().toLowerCase();
    if (uname.length < 3) return setMsg(authMsg, "Username min 3 chars", true);
    if (await usernameTaken(uname)) return setMsg(authMsg, "Username already taken", true);

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db,"users", cred.user.uid), {
      email,
      username: uname,
      createdAt: serverTimestamp(),
    });
    setMsg(authMsg, "");
  }catch(e){
    setMsg(authMsg, e?.message || "Auth failed", true);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

/** ---------- chats ---------- */
function renderChats(chats){
  chatList.innerHTML = "";
  chats.forEach(c => {
    const div = document.createElement("div");
    div.className = "item" + (c.id === activeChatId ? " active" : "");
    div.innerHTML = `
      <div class="name">${otherName(c, currentUser.uid)}</div>
      <div class="last">${c.lastMessage ? c.lastMessage : "No messages yet"}</div>
    `;
    div.onclick = () => openChat(c);
    chatList.appendChild(div);
  });
}

function openChat(chatDoc){
  activeChatId = chatDoc.id;
  activeChat = chatDoc;

  chatTitle.textContent = otherName(chatDoc, currentUser.uid); // ✅ no chatId shown
  chatSub.textContent = "Online"; // placeholder

  msgInput.disabled = false;
  sendBtn.disabled = false;

  // listen messages
  if (unsubMsgs) unsubMsgs();
  messagesEl.innerHTML = "";

  const qy = query(
    collection(db, "chats", activeChatId, "messages"),
    orderBy("createdAt", "asc")
  );

  unsubMsgs = onSnapshot(qy, (snap) => {
    messagesEl.innerHTML = "";
    snap.docs.forEach(d => {
      const m = d.data();
      const b = document.createElement("div");
      b.className = "bubble" + (m.senderId === currentUser.uid ? " me" : "");
      b.textContent = m.text || "";
      messagesEl.appendChild(b);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  // re-render active highlight
  // (chats list will re-render from listener anyway)
}

addUserBtn.addEventListener("click", async () => {
  try{
    setMsg(statusMsg, "");
    const uname = (searchUser.value || "").trim().toLowerCase();
    if (!uname) return;

    const other = await findUserByUsername(uname);
    if (!other) return setMsg(statusMsg, "User not found ❌", true);
    if (other.uid === currentUser.uid) return setMsg(statusMsg, "Khud ko add nahi kar sakte 😄", true);

    const cid = chatIdFor(currentUser.uid, other.uid);
    const ref = doc(db, "chats", cid);
    const snap = await getDoc(ref);

    if (!snap.exists()){
      await setDoc(ref, {
        users: [currentUser.uid, other.uid],
        usernames: {
          [currentUser.uid]: myProfile?.username || "me",
          [other.uid]: other.username || "user",
        },
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }
    setMsg(statusMsg, `Chat ready with @${uname} ✅`);
    searchUser.value = "";

    // open newly created chat
    const chatSnap = await getDoc(ref);
    openChat({ id: cid, ...chatSnap.data() });

  }catch(e){
    setMsg(statusMsg, e?.message || "Add user failed", true);
  }
});

sendBtn.addEventListener("click", async () => {
  try{
    if (!activeChatId) return;
    const t = (msgInput.value || "").trim();
    if (!t) return;
    msgInput.value = "";

    await addDoc(collection(db, "chats", activeChatId, "messages"), {
      text: t,
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "chats", activeChatId), {
      lastMessage: t,
      lastMessageAt: serverTimestamp(),
    });

  }catch(e){
    console.error(e);
  }
});

/** ---------- auth state ---------- */
onAuthStateChanged(auth, async (u) => {
  currentUser = u;

  if (!u){
    // show auth
    authView.classList.remove("hidden");
    appView.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    setMode("login");

    // cleanup
    if (unsubChats) unsubChats();
    if (unsubMsgs) unsubMsgs();
    unsubChats = null; unsubMsgs = null;
    activeChatId = null; activeChat = null;
    return;
  }

  // show app
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  myProfile = await getMyProfile(u.uid);
  meUser.textContent = myProfile?.username ? `@${myProfile.username}` : "@user";
  meEmail.textContent = u.email || "";

  chatTitle.textContent = "Select a chat";
  chatSub.textContent = "—";
  msgInput.disabled = true;
  sendBtn.disabled = true;

  // listen chats (NO orderBy to avoid composite index)
  if (unsubChats) unsubChats();

  const qy = query(collection(db,"chats"), where("users","array-contains", u.uid));
  unsubChats = onSnapshot(qy, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // client sort newest first
    rows.sort((a,b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
    renderChats(rows);

    // auto open first chat if none selected
    if (!activeChatId && rows.length){
      openChat(rows[0]);
    }
  });
});
