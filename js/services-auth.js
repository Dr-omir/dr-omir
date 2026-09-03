import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  linkWithCredential,
  reload,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

// Keep the administrator bootstrap email in one place.
// Firestore Rules remain the real authorization boundary.
export const ADMIN_EMAILS = ["dr.omir.ahmed@gmail.com"];

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let pendingGoogleCredential = null;

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes((email || "").trim().toLowerCase());
}

export async function initializeAuth() {
  await setPersistence(auth, browserLocalPersistence);
  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  }
}

export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email, password) {
  await setPersistence(auth, browserLocalPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return ensureUserProfile(credential.user);
}

export async function signInWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    pendingGoogleCredential = null;
    return ensureUserProfile(credential.user);
  } catch (error) {
    if (error?.code === "auth/account-exists-with-different-credential") {
      pendingGoogleCredential = GoogleAuthProvider.credentialFromError(error);
      error.pendingEmail = error.customData?.email || error.email || "";
    }
    throw error;
  }
}

export function hasPendingGoogleCredential() {
  return Boolean(pendingGoogleCredential);
}

export async function linkPendingGoogleCredential(user) {
  if (!user) throw new Error("User is required.");
  if (!pendingGoogleCredential) throw new Error("No pending Google credential.");

  const credential = pendingGoogleCredential;
  pendingGoogleCredential = null;

  try {
    await linkWithCredential(user, credential);
    await reload(user);
    return ensureUserProfile(user);
  } catch (error) {
    pendingGoogleCredential = credential;
    throw error;
  }
}

export function clearPendingGoogleCredential() {
  pendingGoogleCredential = null;
}

export async function register(email, password, fullName) {
  await setPersistence(auth, browserLocalPersistence);
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (fullName) {
    await updateProfile(credential.user, { displayName: fullName });
  }

  await createUserProfile(credential.user, {
    fullName,
    photoURL: credential.user.photoURL || "",
    role: "user",
  });

  // Verification is sent immediately after password account creation.
  await sendEmailVerification(credential.user);

  return getUserProfile(credential.user);
}

export async function resendVerificationEmail(user = auth.currentUser) {
  if (!user) throw new Error("No signed-in user.");
  if (user.emailVerified) return false;
  await sendEmailVerification(user);
  return true;
}

export async function refreshCurrentUser() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function sendPasswordReset(email) {
  const normalizedEmail = (email || "").trim();
  if (!normalizedEmail) throw new Error("auth/invalid-email");

  await sendPasswordResetEmail(auth, normalizedEmail);
  // Intentionally do not expose whether the address exists.
  return true;
}

export async function logout() {
  pendingGoogleCredential = null;
  await signOut(auth);
}

export async function getUserProfile(user) {
  if (!user) return null;
  const snapshot = await getDoc(doc(db, "users", user.uid));
  if (!snapshot.exists()) return null;

  return {
    uid: user.uid,
    email: user.email || "",
    emailVerified: Boolean(user.emailVerified),
    providerIds: (user.providerData || []).map((provider) => provider.providerId),
    ...snapshot.data(),
  };
}

export async function ensureUserProfile(user) {
  if (!user) return null;

  const existingProfile = await getUserProfile(user);
  if (existingProfile) return existingProfile;

  const role = isAdminEmail(user.email) ? "admin" : "user";

  await createUserProfile(user, {
    fullName: user.displayName || "",
    photoURL: user.photoURL || "",
    role,
  });

  return getUserProfile(user);
}

export async function createUserProfile(user, data = {}) {
  if (!user) throw new Error("User is required.");

  const requestedRole = data.role || "user";
  const safeRole = isAdminEmail(user.email) && requestedRole === "admin"
    ? "admin"
    : "user";

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email || "",
      fullName: data.fullName || user.displayName || "",
      photoURL: data.photoURL || user.photoURL || "",
      role: safeRole,
      bio: data.bio || "",
      university: data.university || "",
      specialty: data.specialty || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateUserProfile(user, data = {}) {
  if (!user) throw new Error("User is required.");

  const currentProfile = await getUserProfile(user);
  if (!currentProfile) throw new Error("User profile does not exist.");

  const safeRole = currentProfile.role === "admin" && isAdminEmail(user.email)
    ? "admin"
    : "user";

  const fullName = data.fullName ?? currentProfile.fullName ?? user.displayName ?? "";
  const photoURL = data.photoURL ?? currentProfile.photoURL ?? user.photoURL ?? "";

  if (fullName !== (user.displayName || "") || photoURL !== (user.photoURL || "")) {
    await updateProfile(user, { displayName: fullName, photoURL });
  }

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email || "",
      fullName,
      photoURL,
      role: safeRole,
      bio: data.bio ?? currentProfile.bio ?? "",
      university: data.university ?? currentProfile.university ?? "",
      specialty: data.specialty ?? currentProfile.specialty ?? "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return getUserProfile(user);
}
