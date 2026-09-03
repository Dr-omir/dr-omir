import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase.js";

const videosCollection = collection(db, "videos");

export async function listVideos() {
  const snapshot = await getDocs(videosCollection);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
}

export async function createVideo(data) {
  return addDoc(videosCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateVideo(id, data) {
  return updateDoc(doc(db, "videos", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function removeVideo(id) {
  return deleteDoc(doc(db, "videos", id));
}

function timestampValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}
