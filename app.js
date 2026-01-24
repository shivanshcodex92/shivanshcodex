import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* 🔑 YOUR FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyDS6wdYNG2Q7ZUNPjUXdOn-Sqb3cLC4NgQ",
  authDomain: "shivanshcodex-5fa03.firebaseapp.com",
  projectId: "shivanshcodex-5fa03",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

let currentUser, currentChatId;

/* AUTH */
window.register = async () => {
  const email = email.value;
  const pass = password.value;
  const uname = username.value;

  const res = await createUserWithEmailAndPassword(auth, email, pass);
  await setDoc(doc(db, "users", res.user.uid), { username: uname });
};

window.login = async () => {
  await signInWithEmailAndPassword(auth, email.value, password.value);
};

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, async user => {
  if (!user) return;
  currentUser = user;
  loginBox.classList.add("hidden");
  chatApp.classList.remove("hidden");
});

/* CHAT */
window.startChat = async () => {
  const q = query(collection(db, "users"), where("username", "==", searchUser.value));
  const snap = await getDocs(q);
  snap.forEach(async u => {
    const chatRef = await addDoc(collection(db, "chats"), {
      members: [currentUser.uid, u.id],
      created: serverTimestamp()
    });
    loadChat(chatRef.id);
  });
};

function loadChat(id) {
  currentChatId = id;
  chatHeader.innerText = "Chat";
  onSnapshot(collection(db, "chats", id, "messages"), snap => {
    messages.innerHTML = "";
    snap.forEach(m => {
      const d = m.data();
      const div = document.createElement("div");
      div.className = "msg " + (d.sender === currentUser.uid ? "me" : "other");
      div.innerText = d.text;
      messages.appendChild(div);
    });
  });
}

window.sendMessage = async () => {
  if (!currentChatId) return;
  await addDoc(collection(db, "chats", currentChatId, "messages"), {
    text: msgInput.value,
    sender: currentUser.uid,
    time: serverTimestamp()
  });
  msgInput.value = "";
};
