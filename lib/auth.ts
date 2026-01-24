"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type UserDoc = {
  uid: string;
  email: string;
  username: string;
  createdAt: any;
};

export function watchAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function getUserDoc(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function isUsernameTaken(username: string) {
  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function registerWithUsername(
  email: string,
  password: string,
  username: string
) {
  username = username.trim().toLowerCase();

  if (!username) throw new Error("Username required");
  if (username.length < 3) throw new Error("Username min 3 chars");

  const taken = await isUsernameTaken(username);
  if (taken) throw new Error("Username already taken");

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  const userDoc: UserDoc = {
    uid: cred.user.uid,
    email: cred.user.email || email,
    username,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", cred.user.uid), userDoc);
  return cred.user;
}

export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}
