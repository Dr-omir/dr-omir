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

const certificatesCollection = collection(db, "certificates");

export async function listCertificates() {
  const snapshot = await getDocs(certificatesCollection);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
}

export async function createCertificate(data) {
  return addDoc(certificatesCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCertificate(id, data) {
  return updateDoc(doc(db, "certificates", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function removeCertificate(id) {
  return deleteDoc(doc(db, "certificates", id));
}

function timestampValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}
