import {
  initializeAuth,
  signIn,
  signInWithGoogle,
  register,
  sendPasswordReset,
  resendVerificationEmail,
  refreshCurrentUser,
  linkPendingGoogleCredential,
  hasPendingGoogleCredential,
  clearPendingGoogleCredential,
} from "./services-auth.js";
import { auth } from "./firebase.js";

const $ = (id) => document.getElementById(id);
let mode = "login";
let isSubmitting = false;
let lastGoogleEmail = "";

function message(text = "", type = "") {
  const el = $("pageMessage");
  if (!el) return;
  el.textContent = text;
  el.className = `auth-message ${type}`.trim();
}

function setMode(next) {
  mode = next;
  const login = next === "login";
  const register = next === "register";
  const recovery = next === "recovery";

  $("pageLoginTab")?.classList.toggle("active", login);
  $("pageRegisterTab")?.classList.toggle("active", register);
  $("pageRegisterFields")?.classList.toggle("hidden", !register);
  $("pageConfirmGroup")?.classList.toggle("hidden", !register);
  $("pagePasswordGroup")?.classList.toggle("hidden", recovery);
  $("pageForgotLink")?.classList.toggle("hidden", !login);
  $("pageRecoveryBack")?.classList.toggle("hidden", !recovery);
  $("pagePasswordStrength")?.classList.toggle("hidden", !register);
  $("pageGoogle")?.classList.toggle("hidden", recovery);
  $("pageDivider")?.classList.toggle("hidden", recovery);
  $("pageSecurityNote")?.classList.toggle("hidden", recovery);

  if ($("pageAuthTitle")) {
    $("pageAuthTitle").textContent = login
      ? "Welcome back"
      : register
        ? "Create your account"
        : "Reset your password";
  }

  if ($("pageAuthSubtitle")) {
    $("pageAuthSubtitle").textContent = login
      ? "Sign in securely to continue your medical learning journey."
      : register
        ? "Create your secure Dr.Omir learning account."
        : "Enter your email and we’ll send you a secure reset link.";
  }

  if ($("pageSubmit")) {
    $("pageSubmit").textContent = login ? "Sign In" : register ? "Create Account" : "Send Reset Link";
  }

  const passwordInput = $("pagePassword");
  if (passwordInput) {
    passwordInput.setAttribute("autocomplete", register ? "new-password" : "current-password");
    passwordInput.required = !recovery;
  }
  $("pageEmail")?.focus();
  message();
}

function showVerificationState() {
  $("pageAuthForm")?.classList.add("hidden");
  $("pageVerification")?.classList.remove("hidden");
  const email = auth.currentUser?.email || "your email address";
  if ($("pageVerificationEmail")) $("pageVerificationEmail").textContent = email;
  const verificationMessage = $("pageVerificationMessage");
  if (verificationMessage) { verificationMessage.textContent = "Verification email sent. Check your inbox and spam folder."; verificationMessage.className = "auth-message success"; }
}

function hideVerificationState() {
  $("pageVerification")?.classList.add("hidden");
  $("pageAuthForm")?.classList.remove("hidden");
}

function friendlyError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/user-not-found": "The email or password is incorrect.",
    "auth/wrong-password": "The email or password is incorrect.",
    "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
    "auth/weak-password": "Choose a stronger password that meets the password policy.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/password-does-not-meet-requirements": "Your password does not meet the current security requirements.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
    "auth/cancelled-popup-request": "Another sign-in window is already open.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait a little and try again.",
    "auth/operation-not-allowed": "This sign-in method is currently unavailable.",
    "auth/credential-already-in-use": "This Google account is already linked to another Dr.Omir account.",
    "auth/provider-already-linked": "This sign-in method is already linked to your account.",
    "auth/requires-recent-login": "For security, please sign in again and retry.",
    "permission-denied": "Your account could not be prepared. Please try again.",
  };
  return map[code] || "We couldn't complete that request. Please try again.";
}

function setBusy(busy, label = "Please wait…") {
  isSubmitting = busy;
  ["pageSubmit", "pageGoogle", "pageLoginTab", "pageRegisterTab"].forEach((id) => {
    if ($(id)) $(id).disabled = busy;
  });
  if (busy && $("pageSubmit")) $("pageSubmit").textContent = label;
}

async function submitAuth(event) {
  event.preventDefault();
  if (isSubmitting) return;

  const email = $("pageEmail")?.value.trim().toLowerCase() || "";
  const password = $("pagePassword")?.value || "";
  const fullName = $("pageFullName")?.value.trim() || "";
  const confirm = $("pageConfirmPassword")?.value || "";

  if (!email) {
    message("Enter your email address.", "error");
    return;
  }

  if (mode === "recovery") {
    setBusy(true, "Sending reset link…");
    message("Preparing your secure reset email…", "info");
    try {
      await sendPasswordReset(email);
      message("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.", "success");
    } catch (error) {
      console.error("Password reset error:", error);
      message(error?.code === "auth/invalid-email" ? "Enter a valid email address." : "We couldn't send the reset link right now. Please try again.", "error");
    } finally {
      setBusy(false);
      setMode("recovery");
    }
    return;
  }

  if (!password) {
    message("Enter your password.", "error");
    return;
  }

  if (mode === "register" && !fullName) {
    message("Enter your full name.", "error");
    return;
  }

  if (mode === "register" && password !== confirm) {
    message("Passwords do not match.", "error");
    return;
  }

  if (mode === "register" && password.length < 8) {
    message("Use at least 8 characters for your password.", "error");
    return;
  }

  setBusy(true, mode === "login" ? "Signing in…" : "Creating account…");
  message("Please wait…", "info");

  try {
    if (mode === "login") {
      const profile = await signIn(email, password);

      if (hasPendingGoogleCredential()) {
        if (lastGoogleEmail && lastGoogleEmail.toLowerCase() === email.toLowerCase()) {
          await linkPendingGoogleCredential(auth.currentUser);
          lastGoogleEmail = "";
          message("Google has been linked to your account. Redirecting…", "success");
        } else {
          message("Sign in with the same email that you use for Google, then we can link the accounts.", "error");
          return;
        }
      }

      if (profile?.role === "admin") {
        window.location.replace("admin.html");
        return;
      }

      if (auth.currentUser && !auth.currentUser.emailVerified) {
        showVerificationState();
        message("Please verify your email before continuing.", "info");
        return;
      }

      window.location.replace("../index.html");
      return;
    }

    const profile = await register(email, password, fullName);
    if (profile?.role === "admin") {
      window.location.replace("admin.html");
      return;
    }

    showVerificationState();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error?.code === "auth/account-exists-with-different-credential") {
      lastGoogleEmail = error.pendingEmail || "";
      message("This email already has an account. Sign in with its password to securely link Google to the same account.", "error");
    } else {
      message(friendlyError(error), "error");
    }
  } finally {
    setBusy(false);
    if (mode === "login") $("pageSubmit").textContent = "Sign In";
    if (mode === "register") $("pageSubmit").textContent = "Create Account";
    if (mode === "recovery") $("pageSubmit").textContent = "Send Reset Link";
  }
}

$("pageLoginTab")?.addEventListener("click", () => { hideVerificationState(); setMode("login"); });
$("pageRegisterTab")?.addEventListener("click", () => { hideVerificationState(); setMode("register"); });
$("pageForgotLink")?.addEventListener("click", (event) => { event.preventDefault(); setMode("recovery"); });
$("pageRecoveryBack")?.addEventListener("click", (event) => { event.preventDefault(); setMode("login"); });
$("pageAuthForm")?.addEventListener("submit", submitAuth);
$("pageGoogle")?.addEventListener("click", async () => {
  if (isSubmitting) return;
  setBusy(true, "Connecting to Google…");
  message("Connecting securely to Google…", "info");
  try {
    const profile = await signInWithGoogle();
    if (profile?.role === "admin") {
      window.location.replace("admin.html");
      return;
    }
    window.location.replace("../index.html");
  } catch (error) {
    console.error("Google authentication error:", error);
    if (error?.code === "auth/account-exists-with-different-credential") {
      lastGoogleEmail = error.pendingEmail || "";
      message("This email already has a password account. Sign in with that password now to link Google securely.", "error");
      setMode("login");
      if (lastGoogleEmail && $("pageEmail")) $("pageEmail").value = lastGoogleEmail;
    } else {
      message(friendlyError(error), "error");
    }
  } finally {
    setBusy(false);
    $("pageSubmit").textContent = mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Link";
  }
});

$("pageResendVerification")?.addEventListener("click", async () => {
  if (isSubmitting) return;
  setBusy(true, "Sending…");
  try {
    await resendVerificationEmail();
    const verificationMessage = $("pageVerificationMessage");
    if (verificationMessage) { verificationMessage.textContent = "A fresh verification email has been sent. Check your inbox and spam folder."; verificationMessage.className = "auth-message success"; }
  } catch (error) {
    console.error(error);
    const verificationMessage = $("pageVerificationMessage");
    if (verificationMessage) { verificationMessage.textContent = error?.code === "auth/too-many-requests" ? "Please wait before requesting another email." : "We couldn't send another verification email yet."; verificationMessage.className = "auth-message error"; }
  } finally {
    setBusy(false);
    $("pageSubmit").textContent = mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Link";
  }
});

$("pageIveVerified")?.addEventListener("click", async () => {
  if (isSubmitting) return;
  setBusy(true, "Checking…");
  try {
    const user = await refreshCurrentUser();
    if (user?.emailVerified) {
      window.location.replace("../index.html");
      return;
    }
    const verificationMessage = $("pageVerificationMessage");
    if (verificationMessage) { verificationMessage.textContent = "Your email is not verified yet. Open the latest email, verify it, then try again."; verificationMessage.className = "auth-message error"; }
  } catch (error) {
    console.error(error);
    const verificationMessage = $("pageVerificationMessage");
    if (verificationMessage) { verificationMessage.textContent = "We couldn't check verification status. Please refresh and try again."; verificationMessage.className = "auth-message error"; }
  } finally {
    setBusy(false);
    $("pageSubmit").textContent = mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Link";
  }
});

function setPasswordVisibility(inputId, buttonId) {
  const input = $(inputId);
  const button = $(buttonId);
  if (!input || !button) return;
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  button.setAttribute("title", showing ? "Show password" : "Hide password");
  button.setAttribute("aria-pressed", showing ? "false" : "true");
}

$("pageTogglePassword")?.addEventListener("click", () => setPasswordVisibility("pagePassword", "pageTogglePassword"));
$("pageToggleConfirmPassword")?.addEventListener("click", () => setPasswordVisibility("pageConfirmPassword", "pageToggleConfirmPassword"));

function updatePasswordStrength() {
  const password = $("pagePassword")?.value || "";
  const panel = $("pagePasswordStrength");
  const bar = $("pagePasswordStrengthBar");
  const text = $("pagePasswordStrengthText");
  if (!panel || !bar || !text) return;

  const rules = {
    Length: password.length >= 8,
    Lower: /[a-z]/.test(password),
    Upper: /[A-Z]/.test(password),
    Number: /\d/.test(password),
    Symbol: /[^A-Za-z0-9]/.test(password),
  };

  Object.entries(rules).forEach(([name, met]) => {
    const rule = $(`pageRule${name}`);
    rule?.classList.toggle("met", met);
  });

  const score = Object.values(rules).filter(Boolean).length;
  const level = !password || score <= 2 ? "weak" : score <= 4 ? "medium" : "strong";
  panel.dataset.level = level;
  bar.style.width = password ? `${score * 20}%` : "0%";
  text.textContent = password ? (level === "strong" ? "Strong password" : level === "medium" ? "Medium password" : "Weak password") : "Password strength";
}

$("pagePassword")?.addEventListener("input", updatePasswordStrength);

initializeAuth().catch((error) => {
  console.error("Auth initialization error:", error);
  message("Could not initialize authentication. Please refresh the page.", "error");
});
