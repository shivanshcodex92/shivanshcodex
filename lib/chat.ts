import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export function chatId(a: string, b: string) {
  return [a, b].sort().join("_");
}

export async function getUser(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function findUser(username: string) {
  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function startChat(myUid: string, otherUid: string) {
  const id = chatId(myUid, otherUid);
  const ref = doc(db, "chats", id);
  if ((await getDoc(ref)).exists()) return id;

  const me = await getUser(myUid);
  const other = await getUser(otherUid);

  await setDoc(ref, {
    users: [myUid, otherUid],
    names: {
      [myUid]: me.username,
      [otherUid]: other.username,
    },
    lastMessage: "",
    lastAt: serverTimestamp(),
  });

  return id;
}

export function listenChats(uid: string, cb: any) {
  const q = query(collection(db, "chats"), where("users", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.lastAt?.seconds || 0) - (a.lastAt?.seconds || 0))
    );
  });
}

export function listenMessages(chatId: string, cb: any) {
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function sendMessage(chatId: string, uid: string, text: string) {
  if (!text.trim()) return;

  await addDoc(collection(db, "chats", chatId, "messages"), {
    text,
    uid,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    lastAt: serverTimestamp(),
  });
}
