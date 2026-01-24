import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// 🔑 username → fake email
function makeEmail(username) {
  return `${username}@shivanshcodex.chat`;
}

window.register = async () => {
  const user = username.value.trim();
  const pass = password.value.trim();

  if (!user || !pass) {
    alert("Username & password required");
    return;
  }

  const email = makeEmail(user);

  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);

    await setDoc(doc(db, "users", res.user.uid), {
      username: user,
      online: true,
      createdAt: Date.now()
    });

    showChatUI();
  } catch (err) {
    alert(err.message);
  }
};

window.login = async () => {
  const user = username.value.trim();
  const pass = password.value.trim();

  if (!user || !pass) {
    alert("Username & password required");
    return;
  }

  const email = makeEmail(user);

  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);

    await updateDoc(doc(db, "users", res.user.uid), {
      online: true
    });

    showChatUI();
  } catch (err) {
    alert("Wrong username or password");
  }
};

window.logout = async () => {
  if (auth.currentUser) {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      online: false
    });
  }
  await signOut(auth);
  location.reload();
};

function showChatUI() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("chatApp").style.display = "block";
}
