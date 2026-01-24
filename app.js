import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDS6wdYNG2Q7ZUNPjUXdOn-Sqb3cLC4NgQ",
  authDomain: "shivanshcodex-5fa03.firebaseapp.com",
  projectId: "shivanshcodex-5fa03",
  storageBucket: "shivanshcodex-5fa03.firebasestorage.app",
  messagingSenderId: "160989825267",
  appId: "1:160989825267:web:891e3ac888a46df3920f86",
  measurementId: "G-76T69H9HM5"
};

initializeApp(firebaseConfig);
getAuth();
getFirestore();

console.log("Firebase connected");
