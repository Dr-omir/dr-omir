import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase.js";

const COLLECTION = "siteAnalytics";
const VISITOR_KEY = "drOmirAnalyticsVisitorId";
const SESSION_KEY = "drOmirAnalyticsSessionId";
const SESSION_STARTED_KEY = "drOmirAnalyticsSessionStartedAt";
let heartbeatTimer = null;
let sessionEnded = false;
let activeSessionId = null;

function randomId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = randomId("visitor");
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = randomId("session");
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
  }
  return id;
}

async function writeEvent(data) {
  try {
    await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Analytics must never break the website.
    console.warn("Analytics event could not be recorded:", error?.code || error?.message || error);
  }
}

export async function trackSiteEvent(type, extra = {}) {
  const sessionId = activeSessionId || getSessionId();
  await writeEvent({
    eventType: type,
    sessionId,
    visitorId: getVisitorId(),
    page: location.pathname.split("/").pop() || "index.html",
    ...extra,
  });
}

export async function startSiteAnalytics(page = "home") {
  if (location.protocol === "file:") return;

  const sessionId = getSessionId();
  activeSessionId = sessionId;

  const startedAt = Number(sessionStorage.getItem(SESSION_STARTED_KEY) || Date.now());
  const alreadyStarted = sessionStorage.getItem("drOmirAnalyticsStarted") === "1";

  if (!alreadyStarted) {
    sessionStorage.setItem("drOmirAnalyticsStarted", "1");
    await trackSiteEvent("session_start", {
      page,
      referrer: document.referrer ? new URL(document.referrer).hostname : "direct",
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
  }

  await trackSiteEvent("page_view", { page });

  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (document.visibilityState === "visible" && !sessionEnded) {
      const elapsedSec = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      trackSiteEvent("session_heartbeat", { page, elapsedSec });
    }
  }, 120000);

  const endSession = () => {
    if (sessionEnded) return;
    sessionEnded = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    const elapsedSec = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    void trackSiteEvent("session_end", { page, elapsedSec });
  };

  window.addEventListener("pagehide", endSession, { once: true });
}

export async function trackContentOpen({ type, contentId = null, title = "" }) {
  return trackSiteEvent("content_open", {
    contentType: type,
    contentId,
    title,
  });
}

export async function listSiteAnalytics({ days = 30, maxEvents = 1000 } = {}) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("createdAt", ">=", cutoff),
      orderBy("createdAt", "desc"),
      limit(maxEvents),
    ),
  );

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
