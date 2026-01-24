import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  getFirestore,
  doc, setDoc, getDoc,
  collection, query, where,
  addDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDS6wdYNG2Q7ZUNPjUXdOn-Sqb3cLC4NgQ",
  authDomain: "shivanshcodex-5fa03.firebaseapp.com",
  projectId: "shivanshcodex-5fa03",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

let currentChatId = null;
let currentUser = null;

/* AUTH */
loginBtn.onclick = () =>
  signInWithEmailAndPassword(auth,email.value,password.value);

registerBtn.onclick = async () => {
  const res = await createUserWithEmailAndPassword(auth,email.value,password.value);
  await setDoc(doc(db,"users",res.user.uid),{
    username:username.value,
    uid:res.user.uid
  });
};

logoutBtn.onclick = () => signOut(auth);

/* AUTH STATE */
onAuthStateChanged(auth, user => {
  if(user){
    currentUser = user;
    auth.classList.add("hidden");
    chatApp.classList.remove("hidden");
  }
});

/* ADD USER / START CHAT */
addUserBtn.onclick = async () => {
  const q = query(collection(db,"users"),where("username","==",searchUser.value));
  onSnapshot(q,snap=>{
    snap.forEach(async u=>{
      const chatRef = await addDoc(collection(db,"chats"),{
        users:[currentUser.uid,u.id]
      });
      loadChat(chatRef.id,u.data().username);
    });
  });
};

/* LOAD CHAT */
function loadChat(id,name){
  currentChatId=id;
  chatHeader.innerText=name;
  messages.innerHTML="";
  onSnapshot(collection(db,"chats",id,"messages"),snap=>{
    messages.innerHTML="";
    snap.forEach(m=>{
      const d=m.data();
      const div=document.createElement("div");
      div.className="msg "+(d.sender===currentUser.uid?"me":"other");
      div.innerText=d.text;
      messages.appendChild(div);
    });
  });
}

/* SEND MESSAGE */
sendBtn.onclick = async () => {
  if(!currentChatId) return;
  await addDoc(collection(db,"chats",currentChatId,"messages"),{
    text:messageInput.value,
    sender:currentUser.uid,
    createdAt:serverTimestamp()
  });
  messageInput.value="";
};
