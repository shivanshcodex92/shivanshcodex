import { db, auth } from "./firebase.js";
import {
  collection, doc, addDoc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

let currentChat=null;

window.startChat = async ()=>{
  const uname = searchUser.value;
  currentChat = auth.currentUser.uid + "_" + uname;
};

window.send = async ()=>{
  if(!currentChat) return;
  await addDoc(collection(db,"chats",currentChat,"messages"),{
    text: msgInput.value,
    uid: auth.currentUser.uid,
    time: Date.now()
  });
  msgInput.value="";
};

onSnapshot(
  collection(db,"chats"),
  ()=>{}
);
