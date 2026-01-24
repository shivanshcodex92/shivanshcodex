import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection,
  query, where, getDocs, onSnapshot, orderBy, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/** ✅ YOUR FIREBASE CONFIG */
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
const db = getFirestore(app);
const auth = getAuth(app);

/** DOM */
const screenLogin = document.getElementById("screenLogin");
const screenList  = document.getElementById("screenList");
const screenChat  = document.getElementById("screenChat");

const inpUsername = document.getElementById("inpUsername");
const inpPassword = document.getElementById("inpPassword");
const btnLogin    = document.getElementById("btnLogin");
const btnCreate   = document.getElementById("btnCreate");
const loginMsg    = document.getElementById("loginMsg");

const btnLogout   = document.getElementById("btnLogout");
const youLine     = document.getElementById("youLine");

const inpAddUser  = document.getElementById("inpAddUser");
const btnAddUser  = document.getElementById("btnAddUser");
const chatList    = document.getElementById("chatList");

const btnBack     = document.getElementById("btnBack");
const chatNameEl  = document.getElementById("chatName");
const chatStatusEl= document.getElementById("chatStatus");
const messagesEl  = document.getElementById("messages");
const inpMsg      = document.getElementById("inpMsg");
const btnSend     = document.getElementById("btnSend");

const toastEl     = document.getElementById("toast");
const modal       = document.getElementById("modal");
const btnCloseModal = document.getElementById("btnCloseModal");

let currentUser = null;         // auth user
let currentProfile = null;      // { uid, username }
let currentChatId = null;       // open chat
let currentOtherUid = null;     // other user uid
let unsubChatList = null;
let unsubMessages = null;

/** Utils */
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(()=>toastEl.classList.remove("show"), 1800);
}
function show(el){ el.style.display = ""; }
function hide(el){ el.style.display = "none"; }
function safe(s){ return (s||"").trim().toLowerCase(); }

/** ✅ IMPORTANT: your "username+password" login uses Firebase Auth under the hood
    We convert username to fake email: username@app.local */
function usernameToEmail(username){
  return `${safe(username)}@app.local`;
}

function formatTime(ts){
  if(!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}

/** UI control */
function renderScreens(){
  btnLogout.style.display = currentUser ? "inline-flex" : "none";

  // ✅ when chat open -> hide topbar
  if (currentUser && currentChatId) {
    document.body.classList.add("in-chat");
  } else {
    document.body.classList.remove("in-chat");
  }

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

/** Create user profile in Firestore */
async function ensureProfile(uid, username){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref, {
      uid,
      username: safe(username),
      online: true,
      lastSeen: serverTimestamp()
    });
  }else{
    await updateDoc(ref, { online:true, lastSeen: serverTimestamp() });
  }
}

async function setOnline(uid, online){
  if(!uid) return;
  const ref = doc(db, "users", uid);
  try{
    await updateDoc(ref, { online, lastSeen: serverTimestamp() });
  }catch(e){}
}

/** Find user by username */
async function findUserByUsername(username){
  const qy = query(collection(db,"users"), where("username","==", safe(username)));
  const snap = await getDocs(qy);
  if(snap.empty) return null;
  return snap.docs[0].data(); // {uid, username,...}
}

/** Chat id deterministic for 1-1 */
function makeChatId(uid1, uid2){
  return [uid1, uid2].sort().join("_");
}

/** Create/ensure chat doc */
async function ensureChatDoc(chatId, uidA, uidB){
  const ref = doc(db, "chats", chatId);
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref, {
      chatId,
      members: [uidA, uidB],
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastSender: ""
    });
  }
}

/** Open chat */
async function openChatWithUser(other){
  if(!currentProfile) return;
  currentOtherUid = other.uid;
  currentChatId = makeChatId(currentProfile.uid, other.uid);

  await ensureChatDoc(currentChatId, currentProfile.uid, other.uid);

  chatNameEl.textContent = other.username || "User";
  chatStatusEl.textContent = "Online";

  renderScreens();
  listenMessages();
}

/** Listen chat list */
function listenChatList(){
  if(unsubChatList) unsubChatList();

  // chats where members contains my uid
  const qy = query(collection(db,"chats"), where("members","array-contains", currentProfile.uid));
  unsubChatList = onSnapshot(qy, async (snap)=>{
    const chats = snap.docs.map(d=>d.data());
    // sort by lastMessageAt desc
    chats.sort((a,b)=>{
      const ta = a.lastMessageAt?.seconds || 0;
      const tb = b.lastMessageAt?.seconds || 0;
      return tb - ta;
    });

    chatList.innerHTML = "";

    for(const c of chats){
      const otherUid = (c.members || []).find(x=>x !== currentProfile.uid);
      const other = await getUserByUid(otherUid);

      const item = document.createElement("div");
      item.className = "chatItem";

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = (other?.username || "U").slice(0,1).toUpperCase();

      const main = document.createElement("div");
      main.className = "chatMain";

      const top = document.createElement("div");
      top.className = "chatNameRow";

      const name = document.createElement("div");
      name.className = "chatU";
      name.textContent = other?.username || "user";

      const time = document.createElement("div");
      time.className = "chatTime";
      time.textContent = formatTime(c.lastMessageAt);

      top.appendChild(name);
      top.appendChild(time);

      const preview = document.createElement("div");
      preview.className = "chatPreview";
      preview.textContent = c.lastMessage || "";

      main.appendChild(top);
      main.appendChild(preview);

      const right = document.createElement("div");
      right.className = "chatRight";

      // online dot (simple)
      const dot = document.createElement("div");
      dot.className = "dot";
      dot.style.opacity = (other?.online ? "1" : "0.25");

      // unread (simple demo: always 0 here unless you implement per-user unread)
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = "1"; // demo look
      badge.style.display = "none"; // keep hidden by default

      right.appendChild(dot);
      right.appendChild(badge);

      item.appendChild(avatar);
      item.appendChild(main);
      item.appendChild(right);

      item.addEventListener("click", ()=>{
        openChatWithUser(other);
      });

      chatList.appendChild(item);
    }
  });
}

/** get user by uid */
async function getUserByUid(uid){
  if(!uid) return null;
  const ref = doc(db,"users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/** Listen messages */
function listenMessages(){
  if(unsubMessages) unsubMessages();

  messagesEl.innerHTML = "";
  const msgsRef = collection(db, "chats", currentChatId, "messages");
  const qy = query(msgsRef, orderBy("createdAt", "asc"));

  unsubMessages = onSnapshot(qy, (snap)=>{
    messagesEl.innerHTML = "";
    snap.docs.forEach(d=>{
      const m = d.data();

      const bubble = document.createElement("div");
      bubble.className = "bubble " + (m.senderUid === currentProfile.uid ? "me" : "other");
      bubble.textContent = m.text || "";

      const time = document.createElement("div");
      time.className = "bTime";
      time.textContent = formatTime(m.createdAt);

      bubble.appendChild(time);
      messagesEl.appendChild(bubble);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

/** send message */
async function sendMessage(){
  const text = inpMsg.value.trim();
  if(!text || !currentChatId) return;

  inpMsg.value = "";
  const ref = collection(db, "chats", currentChatId, "messages");

  await addDoc(ref, {
    text,
    senderUid: currentProfile.uid,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db,"chats", currentChatId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastSender: currentProfile.uid
  });
}

/** Tabs: coming soon */
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const t = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    if(t !== "chats"){
      modal.style.display = "";
    }
  });
});
btnCloseModal.addEventListener("click", ()=> modal.style.display="none");

/** Login */
btnLogin.addEventListener("click", async ()=>{
  loginMsg.textContent = "";
  const u = inpUsername.value.trim();
  const p = inpPassword.value.trim();
  if(!u || !p) { loginMsg.textContent = "Username & password required"; return; }

  try{
    const email = usernameToEmail(u);
    const res = await signInWithEmailAndPassword(auth, email, p);
    await ensureProfile(res.user.uid, u);
    toast("Logged in ✅");
  }catch(e){
    loginMsg.textContent = "Login failed. (Create account first)";
  }
});

/** Create account */
btnCreate.addEventListener("click", async ()=>{
  loginMsg.textContent = "";
  const u = inpUsername.value.trim();
  const p = inpPassword.value.trim();
  if(!u || !p) { loginMsg.textContent = "Username & password required"; return; }

  try{
    const email = usernameToEmail(u);
    const res = await createUserWithEmailAndPassword(auth, email, p);
    await ensureProfile(res.user.uid, u);
    toast("Account created ✅");
  }catch(e){
    loginMsg.textContent = "Create failed. Username already used? try different.";
  }
});

/** Logout */
btnLogout.addEventListener("click", async ()=>{
  if(!currentUser) return;
  await setOnline(currentUser.uid, false);
  await signOut(auth);
  toast("Logged out");
});

/** Add user + start chat */
btnAddUser.addEventListener("click", async ()=>{
  const target = inpAddUser.value.trim();
  if(!target) return;

  const user = await findUserByUsername(target);
  if(!user) { toast("User not found"); return; }
  if(user.uid === currentProfile.uid) { toast("Khud ko add nahi kar sakte"); return; }

  inpAddUser.value = "";
  await openChatWithUser(user);
});

/** Back from chat */
btnBack.addEventListener("click", ()=>{
  currentChatId = null;
  currentOtherUid = null;
  if(unsubMessages) unsubMessages();
  unsubMessages = null;
  renderScreens();
});

/** send */
btnSend.addEventListener("click", sendMessage);
inpMsg.addEventListener("keydown", (e)=>{
  if(e.key === "Enter") sendMessage();
});

/** Auth state */
onAuthStateChanged(auth, async (user)=>{
  currentUser = user;

  if(!user){
    currentProfile = null;
    currentChatId = null;
    currentOtherUid = null;
    if(unsubChatList) unsubChatList();
    if(unsubMessages) unsubMessages();
    unsubChatList = null;
    unsubMessages = null;
    renderScreens();
    return;
  }

  // load profile
  const profile = await getDoc(doc(db,"users", user.uid));
  currentProfile = profile.exists() ? profile.data() : { uid:user.uid, username:"user" };

  youLine.textContent = `You: ${currentProfile.username || "user"}`;

  await setOnline(user.uid, true);
  listenChatList();
  renderScreens();
});

/** mark offline on close */
window.addEventListener("beforeunload", ()=>{
  if(currentUser) setOnline(currentUser.uid, false);
});
