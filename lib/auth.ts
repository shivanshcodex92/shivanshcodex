import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export async function isUsernameTaken(username: string) {
  const u = username.trim().toLowerCase();
  const qy = query(collection(db, "users"), where("username", "==", u), limit(1));
  const snap = await getDocs(qy);
  return !snap.empty;
}

export async function registerUser(email: string, password: string, username: string) {
  const u = username.trim().toLowerCase();
  const e = email.trim().toLowerCase();

  const cred = await createUserWithEmailAndPassword(auth, e, password);

  await setDoc(doc(db, "users", cred.user.uid), {
    email: e,
    username: u,
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

export async function loginUser(email: string, password: string) {
  const e = email.trim().toLowerCase();
  const cred = await signInWithEmailAndPassword(auth, e, password);
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getUserById(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as any) };
}
