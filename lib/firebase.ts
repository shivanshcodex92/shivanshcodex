import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ your Firebase config (as you sent)
const firebaseConfig = {
  apiKey: "AIzaSyDS6wdYNG2Q7ZUNPjUXdOn-Sqb3cLC4NgQ",
  authDomain: "shivanshcodex-5fa03.firebaseapp.com",
  projectId: "shivanshcodex-5fa03",
  storageBucket: "shivanshcodex-5fa03.firebasestorage.app",
  messagingSenderId: "160989825267",
  appId: "1:160989825267:web:891e3ac888a46df3920f86",
  measurementId: "G-76T69H9HM5",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
