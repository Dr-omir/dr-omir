import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7WKllwpaftcFMXPiu8dLnyvnI3Ffcmts",
  authDomain: "dr-omir.firebaseapp.com",
  projectId: "dr-omir",
  storageBucket: "dr-omir.firebasestorage.app",
  messagingSenderId: "571607473140",
  appId: "1:571607473140:web:acb2b51db6c8dedc3db7a1",
  measurementId: "G-QZYPXNPKSR",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
