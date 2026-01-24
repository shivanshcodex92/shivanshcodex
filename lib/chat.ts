"use client";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type ChatDoc = {
  chatId: string;
  members: string[]; // [uid1, uid2]
  memberUsernames: Record<string, string>; // uid -> username
  createdAt: any;
  updatedAt: any;
  lastMessage?: string;
  lastMessageAt?: any;
};

export type MessageDoc = {
  senderId: string;
  text: string;
  createdAt: any;
};

export async function findUserByUsername(username: string) {
  username = username.trim().toLowerCase();
  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...(d.data() as any) };
}

export function makeChatId(uidA: string, uidB: string) {
  const [a, b] = [uidA, uidB].sort();
  return `${a}_${b}`;
}

export function getOtherUserFromChat(chat: ChatDoc, myUid: string) {
  const otherUid = chat.members.find((m) => m !== myUid) || "";
  const otherUsername = chat.memberUsernames?.[otherUid] || "Chat";
  return { otherUid, otherUsername };
}

export async function ensureChat(params: {
  myUid: string;
  myUsername: string;
  otherUid: string;
  otherUsername: string;
}) {
  const { myUid, myUsername, otherUid, otherUsername } = params;

  const chatId = makeChatId(myUid, otherUid);
  const ref = doc(db, "chats", chatId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const chatDoc: ChatDoc = {
      chatId,
      members: [myUid, otherUid],
      memberUsernames: {
        [myUid]: myUsername,
        [otherUid]: otherUsername,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
    };
    await setDoc(ref, chatDoc);
  } else {
    // ensure usernames updated (in case)
    const data = snap.data() as ChatDoc;
    const merged = {
      ...data.memberUsernames,
      [myUid]: myUsername,
      [otherUid]: otherUsername,
    };
    await updateDoc(ref, { memberUsernames: merged, updatedAt: serverTimestamp() });
  }

  return chatId;
}

/**
 * Listen chats for current user.
 * NOTE: We do NOT orderBy in query to avoid composite index issues.
 * We sort client-side by updatedAt/lastMessageAt.
 */
export function listenChats(myUid: string, cb: (chats: ChatDoc[]) => void) {
  const q = query(collection(db, "chats"), where("members", "array-contains", myUid));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as ChatDoc);

    // client-side sort: latest first
    list.sort((a, b) => {
      const at = (a.lastMessageAt?.seconds || a.updatedAt?.seconds || 0) as number;
      const bt = (b.lastMessageAt?.seconds || b.updatedAt?.seconds || 0) as number;
      return bt - at;
    });

    cb(list);
  });
}

export function listenMessages(
  chatId: string,
  cb: (msgs: (MessageDoc & { id: string })[]) => void
) {
  const msgsRef = collection(db, "chats", chatId, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MessageDoc) })));
  });
}

export async function sendMessage(params: {
  chatId: string;
  senderId: string;
  text: string;
}) {
  const { chatId, senderId, text } = params;
  const clean = text.trim();
  if (!clean) return;

  const msgsRef = collection(db, "chats", chatId, "messages");
  await addDoc(msgsRef, {
    senderId,
    text: clean,
    createdAt: serverTimestamp(),
  } as MessageDoc);

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: clean,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
