import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  collection, addDoc, query, where, getDocs,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const loginBox = document.getElementById("loginBox");
const appBox = document.getElementById("app");
const chatList = document.getElementById("chatList");
const messages = document.getElementById("messages");

let currentUser;
let currentChatId = null;

/* AUTH */
loginBtn.onclick = async () => {
  const email = email.value;
  const pass = password.value;
  await signInWithEmailAndPassword(auth, email, pass);
};

registerBtn.onclick = async () => {
  const emailV = email.value;
  const passV = password.value;
  const uname = username.value;

  const cred = await createUserWithEmailAndPassword(auth, emailV, passV);
  await addDoc(collection(db,"users"), {
    uid: cred.user.uid,
    username: uname
  });
};

logoutBtn.onclick = () => signOut(auth);

/* AUTH STATE */
onAuthStateChanged(auth, async (user)=>{
  if(user){
    currentUser = user;
    loginBox.classList.add("hidden");
    appBox.classList.remove("hidden");
    loadChats();
  }else{
    loginBox.classList.remove("hidden");
    appBox.classList.add("hidden");
  }
});

/* ADD USER / START CHAT */
addUserBtn.onclick = async ()=>{
  const uname = searchUser.value;
  const q = query(collection(db,"users"), where("username","==",uname));
  const snap = await getDocs(q);
  if(snap.empty) return alert("User not found");

  const other = snap.docs[0].data();
  const chatId = [currentUser.uid, other.uid].sort().join("_");

  await addDoc(collection(db,"chats"),{
    chatId,
    users: [currentUser.uid, other.uid],
    created: serverTimestamp()
  });

  loadChats();
};

/* LOAD CHAT LIST */
function loadChats(){
  chatList.innerHTML = "";
  const q = query(collection(db,"chats"), where("users","array-contains",currentUser.uid));
  onSnapshot(q,(snap)=>{
    chatList.innerHTML="";
    snap.forEach(doc=>{
      const li=document.createElement("li");
      li.innerText=doc.data().chatId;
      li.onclick=()=>openChat(doc.data().chatId);
      chatList.appendChild(li);
    });
  });
}

/* OPEN CHAT */
function openChat(chatId){
  currentChatId=chatId;
  messages.innerHTML="";
  const q=collection(db,"chats",chatId,"messages");
  onSnapshot(q,(snap)=>{
    messages.innerHTML="";
    snap.forEach(d=>{
      const div=document.createElement("div");
      div.className="msg "+(d.data().uid===currentUser.uid?"me":"other");
      div.innerText=d.data().text;
      messages.appendChild(div);
    });
  });
}

/* SEND MESSAGE */
sendBtn.onclick=async ()=>{
  if(!currentChatId) return;
  await addDoc(collection(db,"chats",currentChatId,"messages"),{
    text: messageInput.value,
    uid: currentUser.uid,
    time: serverTimestamp()
  });
  messageInput.value="";
};
