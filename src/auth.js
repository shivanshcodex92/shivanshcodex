import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

window.register = async () => {
  const email = email.value;
  const pass = password.value;
  const user = username.value;

  const res = await createUserWithEmailAndPassword(auth,email,pass);
  await setDoc(doc(db,"users",res.user.uid),{
    username:user,
    online:true
  });
  loginUI();
};

window.login = async () => {
  await signInWithEmailAndPassword(auth,email.value,password.value);
  loginUI();
};

window.logout = async () => {
  await signOut(auth);
  location.reload();
};

function loginUI(){
  document.getElementById("loginBox").style.display="none";
  document.getElementById("chatApp").style.display="block";
}
