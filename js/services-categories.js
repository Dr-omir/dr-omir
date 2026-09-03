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

const categoriesCollection = collection(db, "categories");

export async function listCategories() {
  const snapshot = await getDocs(categoriesCollection);

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export async function createCategory(data) {
  return addDoc(categoriesCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCategory(id, data) {
  return updateDoc(doc(db, "categories", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function removeCategory(id) {
  return deleteDoc(doc(db, "categories", id));
}
