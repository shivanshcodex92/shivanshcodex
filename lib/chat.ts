import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { getUserById } from "./auth";

export type ChatDoc = {
  users: string[];
  usernames: Record<string, string>; // { uid: username }
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt?: any;
};

export type MessageDoc = {
  text: string;
  senderId: string;
  createdAt: any;
};

// deterministic chat id (WhatsApp-like: one chat per pair)
export function chatIdFor(a: string, b: string) {
  return [a, b].sort().join("_");
}

export async function findUserByUsername(username: string) {
  const u = username.trim().toLowerCase();
  const qy = query(collection(db, "users"), where("username", "==", u), limit(1));
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...(d.data() as any) };
}

export async function startChat(myUid: string, otherUid: string) {
  const cid = chatIdFor(myUid, otherUid);
  const ref = doc(db, "chats", cid);
  const snap = await getDoc(ref);
  if (snap.exists()) return cid;

  const me = await getUserById(myUid);
  const other = await getUserById(otherUid);

  await setDoc(ref, {
    users: [myUid, otherUid],
    usernames: {
      [myUid]: me?.username || "me",
      [otherUid]: other?.username || "user",
    },
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  } satisfies ChatDoc);

  return cid;
}

export function listenChats(myUid: string, cb: (rows: Array<{ id: string } & ChatDoc>) => void) {
  const qy = query(collection(db, "chats"), where("users", "array-contains", myUid));

  return onSnapshot(qy, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChatDoc) }));

    // client sort newest first
    rows.sort((a, b) => {
      const at = a.lastMessageAt?.seconds ?? 0;
      const bt = b.lastMessageAt?.seconds ?? 0;
      return bt - at;
    });

    cb(rows);
  });
}

export function listenMessages(chatId: string, cb: (rows: Array<{ id: string } & MessageDoc>) => void) {
  const qy = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(qy, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MessageDoc) })));
  });
}

export async function sendMessage(chatId: string, myUid: string, text: string) {
  const t = text.trim();
  if (!t) return;

  await addDoc(collection(db, "chats", chatId, "messages"), {
    text: t,
    senderId: myUid,
    createdAt: serverTimestamp(),
  } satisfies MessageDoc);

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: t,
    lastMessageAt: serverTimestamp(),
  });
}

export function otherUsername(chat: ChatDoc, myUid: string) {
  const otherUid = chat.users.find((u) => u !== myUid);
  if (!otherUid) return "Chat";
  return chat.usernames?.[otherUid] || "Chat";
}
