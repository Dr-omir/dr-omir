import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase.js";

export async function recordActivity({ uid, type, resourceId = null, title = "" }) {
  if (!uid || !type) return;
  await addDoc(collection(db, "activities"), {
    uid,
    type,
    resourceId,
    title,
    createdAt: serverTimestamp(),
  });
}

export async function listUserActivities(uid) {
  if (!uid) return [];
  const snapshot = await getDocs(
    query(collection(db, "activities"), where("uid", "==", uid)),
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function summarizeActivities(activities = []) {
  return activities.reduce(
    (summary, activity) => {
      summary.total += 1;
      if (activity.type === "lecture_opened") summary.lectures += 1;
      if (activity.type === "resource_opened") summary.resources += 1;
      if (activity.type === "video_watched") summary.videos += 1;
      return summary;
    },
    { total: 0, lectures: 0, resources: 0, videos: 0 },
  );
}
