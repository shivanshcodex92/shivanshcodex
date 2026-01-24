import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs,
  query, where, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/** ✅ FIREBASE CONFIG (your API) */
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

/** ✅ UI */
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");

const loginCard = document.getElementById("loginCard");
const listPanel = document.getElementById("listPanel");
const dmPanel = document.getElementById("dmPanel");

const meName = document.getElementById("meName");
const addUserInput = document.getElementById("addUserInput");
const addUserBtn = document.getElementById("addUserBtn");
const chatList = document.getElementById("chatList");

const backBtn = document.getElementById("backBtn");
const dmName = document.getElementById("dmName");
const dmStatusText = document.getElementById("dmStatusText");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

const tabUpdates = document.getElementById("tabUpdates");
const tabCommunities = document.getElementById("tabCommunities");
const tabCalls = document.getElementById("tabCalls");
const toast = document.getElementById("toast");

/** ✅ Local session */
let me = null; // { uid, username }
let activeChat = null; // { chatId, otherUid, otherUsername }
let unsubMessages = null;
let unsubChats = null;

/** Helpers */
const toastShow = (txt="Coming soon")=>{
  toast.textContent = txt;
  toast.style.display = "block";
  setTimeout(()=>toast.style.display="none", 1400);
};

const hash = async (s)=>{
  // simple hash (not secure). ok for demo
  let h = 0;
  for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  return String(h);
};

const setAuthUI = (loggedIn)=>{
  if (loggedIn){
    loginCard.style.display = "none";
    listPanel.style.display = "block";
  } else {
    loginCard.style.display = "block";
    listPanel.style.display = "none";
    dmPanel.style.display = "none";
    document.body.classList.remove("in-chat");
  }
};

const openDMUI = (open)=>{
  if (open){
    dmPanel.style.display = "block";
    listPanel.style.display = "none";
    document.body.classList.add("in-chat"); // ✅ top header hide
  } else {
    dmPanel.style.display = "none";
    listPanel.style.display = "block";
    document.body.classList.remove("in-chat");
  }
};

const nowTime = ()=>{
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2,"0");
  const ampm = h>=12 ? "PM" : "AM";
  h = h%12; if (h===0) h=12;
  return `${h}:${m} ${ampm}`;
};

/** ✅ Firestore structure:
 * users/{uid} => { username, passHash, online, lastSeen }
 * chats/{chatId} => { members:[uid1,uid2], memberUsernames:{uid:username}, lastMessage, lastAt, unread:{uid:number} }
 * chats/{chatId}/messages/{msgId} => { text, senderId, createdAt }
 */

const userDocByUsername = async (uname)=>{
  const qy = query(collection(db,"users"), where("username","==", uname), limit(1));
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid:d.id, ...d.data() };
};

const ensureChatId = (uid1, uid2)=>{
  // stable order
  return [uid1,uid2].sort().join("_");
};

const ensureChat = async (otherUsername)=>{
  const other = await userDocByUsername(otherUsername);
  if (!other) throw new Error("User not found");

  const chatId = ensureChatId(me.uid, other.uid);
  const chatRef = doc(db,"chats",chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()){
    await setDoc(chatRef,{
      members:[me.uid, other.uid],
      memberUsernames:{
        [me.uid]: me.username,
        [other.uid]: other.username
      },
      lastMessage:"",
      lastAt: serverTimestamp(),
      unread:{
        [me.uid]:0,
        [other.uid]:0
      }
    });
  } else {
    // ensure usernames map exists
    const data = chatSnap.data();
    const map = data.memberUsernames || {};
    if (!map[me.uid] || !map[other.uid]){
      await updateDoc(chatRef,{
        [`memberUsernames.${me.uid}`]: me.username,
        [`memberUsernames.${other.uid}`]: other.username
      });
    }
  }

  return { chatId, otherUid: other.uid, otherUsername: other.username };
};

const renderChatItem = (chatId, data)=>{
  const otherUid = data.members.find(x=>x!==me.uid);
  const otherName = (data.memberUsernames && data.memberUsernames[otherUid]) || "user";
  const last = data.lastMessage || "";
  const unread = (data.unread && data.unread[me.uid]) || 0;
  const time = data.lastAt?.toDate ? (()=> {
    const d=data.lastAt.toDate();
    let h=d.getHours(); const m=String(d.getMinutes()).padStart(2,"0");
    const ampm=h>=12?"PM":"AM"; h=h%12; if(h===0)h=12;
    return `${h}:${m} ${ampm}`;
  })() : "";

  const el = document.createElement("div");
  el.className = "chatItem";
  el.innerHTML = `
    <div class="avatar">${otherName[0]?.toUpperCase() || "U"}</div>
    <div class="chatMid">
      <div class="chatName">${otherName}</div>
      <div class="chatLast">${last}</div>
    </div>
    <div class="chatRight">
      <div class="time">${time}</div>
      <div class="badgeRow">
        <span class="onlineDot"></span>
        ${unread>0 ? `<span class="unread">${unread}</span>` : ``}
      </div>
    </div>
  `;

  el.addEventListener("click", async ()=>{
    await openChat(chatId, otherUid, otherName);
  });

  return el;
};

const listenChats = ()=>{
  if (unsubChats) unsubChats();
  const qy = query(
    collection(db,"chats"),
    where("members","array-contains", me.uid),
    orderBy("lastAt","desc"),
    limit(30)
  );

  unsubChats = onSnapshot(qy, (snap)=>{
    chatList.innerHTML = "";
    snap.forEach(docu=>{
      chatList.appendChild(renderChatItem(docu.id, docu.data()));
    });
  });
};

const openChat = async (chatId, otherUid, otherUsername)=>{
  activeChat = { chatId, otherUid, otherUsername };

  dmName.textContent = otherUsername;
  dmStatusText.textContent = "Online";
  openDMUI(true); // ✅ DM open => hide top header

  // reset unread for me
  await updateDoc(doc(db,"chats",chatId), {
    [`unread.${me.uid}`]: 0
  });

  // messages listen
  if (unsubMessages) unsubMessages();
  const msgsRef = collection(db,"chats",chatId,"messages");
  const qy = query(msgsRef, orderBy("createdAt","asc"), limit(200));

  unsubMessages = onSnapshot(qy, (snap)=>{
    messagesEl.innerHTML = "";
    snap.forEach(d=>{
      const m = d.data();
      const isMe = m.senderId === me.uid;
      const div = document.createElement("div");
      div.className = `bubble ${isMe ? "me" : ""}`;
      const ts = m.createdAt?.toDate ? (()=> {
        const dt=m.createdAt.toDate();
        let h=dt.getHours(); const mm=String(dt.getMinutes()).padStart(2,"0");
        const ampm=h>=12?"PM":"AM"; h=h%12; if(h===0)h=12;
        return `${h}:${mm} ${ampm}`;
      })() : nowTime();

      div.innerHTML = `<div class="t">${m.text || ""}</div><div class="ts">${ts}</div>`;
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
};

const sendMessage = async ()=>{
  if (!activeChat) return;

  const text = msgInput.value.trim();
  if (!text) return;
  msgInput.value = "";

  const { chatId, otherUid } = activeChat;

  // add message
  await addDoc(collection(db,"chats",chatId,"messages"),{
    text,
    senderId: me.uid,
    createdAt: serverTimestamp()
  });

  // update chat meta + unread for other
  const chatRef = doc(db,"chats",chatId);
  const chatSnap = await getDoc(chatRef);
  const data = chatSnap.data();
  const prevUnread = (data.unread && data.unread[otherUid]) || 0;

  await updateDoc(chatRef,{
    lastMessage:text,
    lastAt: serverTimestamp(),
    [`unread.${otherUid}`]: prevUnread + 1
  });
};

/** ✅ LOGIN/CREATE */
const doCreate = async ()=>{
  const uname = usernameInput.value.trim();
  const pass = passwordInput.value.trim();
  if (!uname || !pass) return alert("username + password required");

  const exists = await userDocByUsername(uname);
  if (exists) return alert("Username already taken");

  const uid = crypto.randomUUID();
  const passHash = await hash(pass);

  await setDoc(doc(db,"users",uid),{
    username: uname,
    passHash,
    online: true,
    lastSeen: serverTimestamp()
  });

  me = { uid, username: uname };
  localStorage.setItem("me_uid", uid);
  localStorage.setItem("me_username", uname);

  meName.textContent = uname;
  setAuthUI(true);
  listenChats();
};

const doLogin = async ()=>{
  const uname = usernameInput.value.trim();
  const pass = passwordInput.value.trim();
  if (!uname || !pass) return alert("username + password required");

  const u = await userDocByUsername(uname);
  if (!u) return alert("User not found");

  const passHash = await hash(pass);
  if (passHash !== u.passHash) return alert("Wrong password");

  me = { uid: u.uid, username: u.username };

  localStorage.setItem("me_uid", me.uid);
  localStorage.setItem("me_username", me.username);

  await updateDoc(doc(db,"users", me.uid),{
    online:true,
    lastSeen: serverTimestamp()
  });

  meName.textContent = me.username;
  setAuthUI(true);
  listenChats();
};

const doLogout = async ()=>{
  if (me?.uid){
    try{
      await updateDoc(doc(db,"users", me.uid),{
        online:false,
        lastSeen: serverTimestamp()
      });
    }catch{}
  }
  me = null;
  activeChat = null;

  if (unsubMessages) unsubMessages();
  if (unsubChats) unsubChats();

  localStorage.removeItem("me_uid");
  localStorage.removeItem("me_username");

  setAuthUI(false);
};

/** ✅ Add user -> create/open chat (but chat open ONLY after clicking chat item like WhatsApp) */
const addUser = async ()=>{
  const uname = addUserInput.value.trim();
  if (!uname) return;
  if (!me) return;

  if (uname === me.username) return alert("Apna khud ka username nahi");

  try{
    await ensureChat(uname); // creates chat and it will appear in list
    addUserInput.value = "";
  }catch(e){
    alert(e.message || "Failed");
  }
};

/** ✅ BACK */
backBtn.addEventListener("click", ()=>{
  // stop messages listener
  if (unsubMessages) unsubMessages();
  unsubMessages = null;
  activeChat = null;
  openDMUI(false); // ✅ back => show list + show topbar
});

/** ✅ Buttons */
loginBtn.addEventListener("click", doLogin);
createBtn.addEventListener("click", doCreate);
logoutBtn.addEventListener("click", doLogout);

addUserBtn.addEventListener("click", addUser);
addUserInput.addEventListener("keydown",(e)=>{
  if (e.key==="Enter") addUser();
});

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown",(e)=>{
  if (e.key==="Enter") sendMessage();
});

/** Coming soon tabs */
tabUpdates.addEventListener("click", ()=>toastShow("Coming soon"));
tabCommunities.addEventListener("click", ()=>toastShow("Coming soon"));
tabCalls.addEventListener("click", ()=>toastShow("Coming soon"));

/** ✅ Auto session restore */
(async ()=>{
  const uid = localStorage.getItem("me_uid");
  const uname = localStorage.getItem("me_username");

  setAuthUI(false);

  if (uid && uname){
    me = { uid, username: uname };
    meName.textContent = uname;
    setAuthUI(true);
    listenChats();
  }
})();
