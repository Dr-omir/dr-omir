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

const resourcesCollection = collection(db, "resources");

export async function listResources() {
  const snapshot = await getDocs(resourcesCollection);

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
}

export async function createResource(data) {
  return addDoc(resourcesCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateResource(id, data) {
  return updateDoc(doc(db, "resources", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function removeResource(id) {
  return deleteDoc(doc(db, "resources", id));
}

function timestampValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}
