import { auth } from "./firebase.js";
import { initializeAuth, observeAuth, logout, ensureUserProfile, updateUserProfile } from "./services-auth.js";
import { listCategories, createCategory, updateCategory, removeCategory } from "./services-categories.js";
import { listResources, createResource, updateResource, removeResource } from "./services-resources.js";
import { listVideos, createVideo, updateVideo, removeVideo } from "./services-videos.js";
import { listCertificates, createCertificate, updateCertificate, removeCertificate } from "./services-certificates.js";
import { listSiteAnalytics } from "./services-analytics.js";

const $ = (id) => document.getElementById(id);
const state = { profile: null, categories: [], resources: [], videos: [], certificates: [], activeCategoryId: null, resourcePage: 1, contentEdit: null, contentDelete: null, resourceEditId: null, resourceDeleteId: null };
const PAGE_SIZE = 8;
let analyticsDays = 30;
let analyticsEvents = [];

const ui = {
  categoriesList: $("categoriesList"), categoriesLoading: $("categoriesLoading"), categoriesError: $("categoriesError"), categoriesEmpty: $("categoriesEmpty"),
  categoryForm: $("categoryForm"), categoryFormWrapper: $("categoryFormWrapper"), categoryName: $("categoryName"), categoryDescription: $("categoryDescription"), categoryType: $("categoryType"), createCategoryBtn: $("createCategoryBtn"), showCategoryFormBtn: $("showCategoryFormBtn"), cancelCategoryBtn: $("cancelCategoryBtn"),
  resourceForm: $("resourceForm"), resourceTitle: $("resourceTitle"), resourceCategory: $("resourceCategory"), resourceDescription: $("resourceDescription"), resourceUrl: $("resourceUrl"), addResourceBtn: $("addResourceBtn"),
  adminResourcesList: $("adminResourcesList"), resourcesLoading: $("resourcesLoading"), resourcesError: $("resourcesError"), resourcesEmpty: $("resourcesEmpty"), resourceCount: $("resourceCount"), refreshResourcesBtn: $("refreshResourcesBtn"),
  videoForm: $("videoForm"), videoTitle: $("videoTitle"), videoCategory: $("videoCategory"), videoDescription: $("videoDescription"), videoUrl: $("videoUrl"), addVideoBtn: $("addVideoBtn"), videosLoading: $("videosLoading"), videosError: $("videosError"), adminVideosList: $("adminVideosList"),
  certificateForm: $("certificateForm"), certificateTitle: $("certificateTitle"), certificateDate: $("certificateDate"), certificateDescription: $("certificateDescription"), certificateImageUrl: $("certificateImageUrl"), certificateUrl: $("certificateUrl"), addCertificateBtn: $("addCertificateBtn"), certificatesLoading: $("certificatesLoading"), certificatesError: $("certificatesError"), adminCertificatesList: $("adminCertificatesList"),
  adminProfileName: $("adminProfileName"), adminProfileEmail: $("adminProfileEmail"), adminProfileForm: $("adminProfileForm"), adminProfileFullName: $("adminProfileFullName"), adminProfileEmailInput: $("adminProfileEmailInput"), adminProfileUniversity: $("adminProfileUniversity"), adminProfileSpecialty: $("adminProfileSpecialty"), adminProfilePhotoURL: $("adminProfilePhotoURL"), adminProfileBio: $("adminProfileBio"), adminProfileSave: $("adminProfileSave"), adminProfileMessage: $("adminProfileMessage"), overviewResources: $("overviewResources"), overviewCategories: $("overviewCategories"), overviewVideos: $("overviewVideos"), overviewCertificates: $("overviewCertificates"), overviewVisitors: $("overviewVisitors"), overviewVisitorsDelta: $("overviewVisitorsDelta"), overviewAvgTime: $("overviewAvgTime"), analyticsVisitors: $("analyticsVisitors"), analyticsVisitorsNote: $("analyticsVisitorsNote"), analyticsSessions: $("analyticsSessions"), analyticsPageViews: $("analyticsPageViews"), analyticsAvgTime: $("analyticsAvgTime"), analyticsContentOpens: $("analyticsContentOpens"), analyticsActive: $("analyticsActive"), analyticsChartStatus: $("analyticsChartStatus"), analyticsNoData: $("analyticsNoData"), trafficChart: $("trafficChart"), engagementDonut: $("engagementDonut"), engagementTotal: $("engagementTotal"), engagementLegend: $("engagementLegend"), topContentList: $("topContentList"), trafficSourcesList: $("trafficSourcesList"), analyticsRange: document.querySelector(".analytics-range"), logoutBtn: $("logoutBtn"),
  popup: $("resourcePopup"), popupBox: document.querySelector(".resource-popup-box"), popupIcon: $("popupIcon"), popupTitle: $("popupTitle"), popupSubtitle: $("popupSubtitle"), popupDetails: $("popupDetails"), popupTimer: $("popupTimer"),
};
let popupTimeout; let popupInterval;

function showPopup({ type = "success", title = "DONE", subtitle = "", details = [] }) {
  clearTimeout(popupTimeout); clearInterval(popupInterval); if (!ui.popup) return;
  ui.popupBox?.classList.toggle("error", type === "error"); ui.popupIcon.textContent = type === "error" ? "!" : "✓"; ui.popupTitle.textContent = title; ui.popupSubtitle.textContent = subtitle; ui.popupDetails.innerHTML = "";
  details.forEach(({ label, value, isLink }) => { const row = document.createElement("div"); row.className = "popup-detail-row"; const l = document.createElement("div"); l.className = "popup-detail-label"; l.textContent = label; const v = document.createElement("div"); v.className = "popup-detail-value"; if (isLink && value) { const a = document.createElement("a"); a.href = value; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = value; v.appendChild(a); } else v.textContent = value ?? ""; row.append(l, v); ui.popupDetails.appendChild(row); });
  ui.popup.classList.add("show"); ui.popup.setAttribute("aria-hidden", "false"); let seconds = 3; ui.popupTimer.textContent = `Closing in ${seconds} seconds...`;
  popupInterval = setInterval(() => { seconds -= 1; if (seconds > 0) ui.popupTimer.textContent = `Closing in ${seconds} seconds...`; }, 1000); popupTimeout = setTimeout(hidePopup, 3000);
}
function hidePopup() { clearTimeout(popupTimeout); clearInterval(popupInterval); ui.popup?.classList.remove("show"); ui.popup?.setAttribute("aria-hidden", "true"); }
function setLoading(el, value) { if (el) el.hidden = !value; }
function setError(el, message) { if (!el) return; el.hidden = !message; el.textContent = message || ""; }
function setAdminProfileMessage(text = "", type = "info") {
  if (!ui.adminProfileMessage) return;
  ui.adminProfileMessage.textContent = text;
  ui.adminProfileMessage.className = `admin-profile-message ${type}`;
}

function fillAdminProfile(profile, user) {
  if (!profile) return;
  ui.adminProfileName.textContent = profile.fullName || "Dr. Omir";
  ui.adminProfileEmail.textContent = profile.email || user?.email || "";
  if (ui.adminProfileFullName) ui.adminProfileFullName.value = profile.fullName || user?.displayName || "";
  if (ui.adminProfileEmailInput) ui.adminProfileEmailInput.value = profile.email || user?.email || "";
  if (ui.adminProfileUniversity) ui.adminProfileUniversity.value = profile.university || "";
  if (ui.adminProfileSpecialty) ui.adminProfileSpecialty.value = profile.specialty || "";
  if (ui.adminProfilePhotoURL) ui.adminProfilePhotoURL.value = profile.photoURL || user?.photoURL || "";
  if (ui.adminProfileBio) ui.adminProfileBio.value = profile.bio || "";
}

async function saveAdminProfile(event) {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user || state.profile?.role !== "admin") return;

  const fullName = ui.adminProfileFullName?.value.trim() || "";
  if (!fullName) {
    setAdminProfileMessage("Full name is required.", "error");
    ui.adminProfileFullName?.focus();
    return;
  }

  ui.adminProfileSave.disabled = true;
  ui.adminProfileSave.textContent = "Saving...";
  setAdminProfileMessage("Saving admin profile...", "info");

  try {
    const updated = await updateUserProfile(user, {
      fullName,
      university: ui.adminProfileUniversity?.value.trim() || "",
      specialty: ui.adminProfileSpecialty?.value.trim() || "",
      photoURL: ui.adminProfilePhotoURL?.value.trim() || "",
      bio: ui.adminProfileBio?.value.trim() || "",
    });

    state.profile = updated || state.profile;
    fillAdminProfile(state.profile, user);
    setAdminProfileMessage("Admin profile updated successfully.", "success");
    showPopup({
      type: "success",
      title: "PROFILE UPDATED",
      subtitle: "The administrator profile was saved successfully.",
      details: [{ label: "Name", value: fullName }],
    });
  } catch (error) {
    console.error("Admin profile update error:", error);
    setAdminProfileMessage("Could not update the admin profile.", "error");
  } finally {
    ui.adminProfileSave.disabled = false;
    ui.adminProfileSave.textContent = "Save Admin Profile";
  }
}
function formatDate(value) { if (!value) return "Date unavailable"; const d = typeof value.toDate === "function" ? value.toDate() : new Date((value.seconds || 0) * 1000); return Number.isNaN(d.getTime()) ? "Date unavailable" : d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
function timestamp(value) { if (!value) return 0; if (typeof value.toMillis === "function") return value.toMillis(); if (typeof value.seconds === "number") return value.seconds * 1000; return 0; }
function categoryForResource(resource) { if (resource.categoryId) return state.categories.find((c) => c.id === resource.categoryId) || null; const n = String(resource.categoryName || resource.category || "").trim().toLowerCase(); return state.categories.find((c) => String(c.name || "").trim().toLowerCase() === n) || null; }
function belongs(resource, categoryId) { return categoryForResource(resource)?.id === categoryId; }
function categoryName(id) { return state.categories.find((c) => c.id === id)?.name || "Uncategorized"; }
function validUrl(value) { try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } }

function populateCategorySelect(select, type = "resource", includeEmpty = true) {
  if (!select) return;

  select.innerHTML = includeEmpty ? '<option value="">Select category</option>' : "";

  const allowed = state.categories.filter((category) => {
    const categoryType = category.type || "resource";
    return categoryType === type || categoryType === "both";
  });

  allowed.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });

  if (allowed.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = type === "video"
      ? "No video categories yet"
      : "No resource categories yet";
    option.disabled = true;
    select.appendChild(option);
  }
}

function renderCategories() {
  if (!ui.categoriesList) return;

  ui.categoriesList.innerHTML = "";
  ui.categoriesEmpty.hidden = state.categories.length > 0;

  state.categories.forEach((category) => {
    const categoryType = category.type || "resource";
    const resourceCount = state.resources.filter((resource) => belongs(resource, category.id)).length;
    const videoCount = state.videos.filter((video) => video.categoryId === category.id).length;

    const typeLabel = categoryType === "video"
      ? "VIDEOS"
      : categoryType === "both"
        ? "RESOURCES + VIDEOS"
        : "RESOURCES";

    const item = document.createElement("article");
    item.className = "category-item category-clickable";
    item.tabIndex = 0;
    item.innerHTML = '<div class="category-item-main"><div class="category-item-icon">📁</div><div class="category-item-text"><div class="category-item-name"></div><div class="admin-role-badge category-type-badge"></div><div class="category-item-description"></div><div class="category-item-resource-count"></div></div></div><div class="category-item-right"><span class="category-open-label">Open →</span><div class="category-item-actions"><button type="button" class="category-edit-btn">Edit</button><button type="button" class="category-delete-btn">Delete</button></div></div>';

    item.querySelector(".category-item-name").textContent = category.name;
    item.querySelector(".category-type-badge").textContent = typeLabel;
    item.querySelector(".category-item-description").textContent = category.description || "No description";

    const counts = [];
    if (categoryType === "resource" || categoryType === "both") {
      counts.push(`${resourceCount} ${resourceCount === 1 ? "resource" : "resources"}`);
    }
    if (categoryType === "video" || categoryType === "both") {
      counts.push(`${videoCount} ${videoCount === 1 ? "video" : "videos"}`);
    }
    item.querySelector(".category-item-resource-count").textContent = counts.join(" · ");

    const canOpenResources = categoryType === "resource" || categoryType === "both";
    if (!canOpenResources) {
      item.classList.remove("category-clickable");
      item.querySelector(".category-open-label").textContent = "Video category";
    }

    item.addEventListener("click", (e) => {
      if (!e.target.closest("button") && canOpenResources) openCategory(category.id);
    });

    item.addEventListener("keydown", (e) => {
      if (!e.target.closest("button") && canOpenResources && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openCategory(category.id);
      }
    });

    item.querySelector(".category-edit-btn").onclick = (e) => {
      e.stopPropagation();
      editCategory(category.id);
    };

    item.querySelector(".category-delete-btn").onclick = (e) => {
      e.stopPropagation();
      deleteCategory(category.id);
    };

    ui.categoriesList.appendChild(item);
  });
}


function analyticsDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDuration(seconds) {
  const value = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(value / 60);
  const secs = value % 60;
  return minutes ? `${minutes}m ${secs}s` : `${secs}s`;
}
function analyticsMetrics(events) {
  const starts = events.filter(e => e.eventType === "session_start");
  const pageViews = events.filter(e => e.eventType === "page_view");
  const opens = events.filter(e => e.eventType === "content_open");
  const heartbeats = events.filter(e => e.eventType === "session_heartbeat");
  const ends = events.filter(e => e.eventType === "session_end");
  const visitorSet = new Set(starts.map(e => e.visitorId).filter(Boolean));
  const durations = new Map();
  [...heartbeats, ...ends].forEach(e => {
    if (!e.sessionId) return;
    const current = Number(e.elapsedSec || 0);
    durations.set(e.sessionId, Math.max(durations.get(e.sessionId) || 0, current));
  });
  const measured = [...durations.values()].filter(v => v > 0);
  const avg = measured.length ? measured.reduce((a,b) => a+b, 0) / measured.length : 0;
  const activeCutoff = Date.now() - 5 * 60 * 1000;
  const activeSessions = new Set(heartbeats.filter(e => {
    const d = analyticsDate(e.createdAt);
    return d && d.getTime() >= activeCutoff;
  }).map(e => e.sessionId).filter(Boolean));
  return { starts, pageViews, opens, ends, visitorSet, avg, activeSessions, durations };
}
function drawTrafficChart(events) {
  const canvas = ui.trafficChart;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 700;
  const height = canvas.clientHeight || 250;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const now = new Date();
  const days = [];
  for (let i = analyticsDays - 1; i >= 0; i -= 1) {
    const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - i); days.push(d);
  }
  const buckets = days.map(day => ({ day, visitors:new Set(), views:0 }));
  events.forEach(e => {
    const d = analyticsDate(e.createdAt); if (!d) return;
    const key = new Date(d); key.setHours(0,0,0,0);
    const index = buckets.findIndex(b => b.day.getTime() === key.getTime()); if (index < 0) return;
    if (e.eventType === "session_start" && e.visitorId) buckets[index].visitors.add(e.visitorId);
    if (e.eventType === "page_view") buckets[index].views += 1;
  });
  const visitors = buckets.map(b => b.visitors.size), views = buckets.map(b => b.views);
  const max = Math.max(1, ...visitors, ...views);
  const left = 38, right = 12, top = 12, bottom = 30;
  const chartW = width-left-right, chartH = height-top-bottom;
  ctx.strokeStyle = "#e6eef3"; ctx.lineWidth = 1;
  for (let i=0;i<4;i++){const y=top+(chartH*i/3);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();}
  const x = i => left + (chartW * (days.length === 1 ? .5 : i/(days.length-1)));
  const plot = (values, stroke, fill) => {
    ctx.beginPath(); values.forEach((v,i)=>{const y=top+chartH-(v/max)*chartH;i===0?ctx.moveTo(x(i),y):ctx.lineTo(x(i),y);});
    ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
    ctx.lineTo(x(values.length-1),top+chartH);ctx.lineTo(x(0),top+chartH);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    ctx.beginPath(); values.forEach((v,i)=>{const y=top+chartH-(v/max)*chartH;i===0?ctx.moveTo(x(i),y):ctx.lineTo(x(i),y);});ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
  };
  plot(views,"#087fc4","rgba(8,127,196,.08)");
  plot(visitors,"#09a7c8","rgba(9,167,200,.05)");
  ctx.fillStyle="#7d8f9e";ctx.font="10px Inter, sans-serif";ctx.textAlign="center";
  const labelCount=Math.min(7, days.length);
  for(let i=0;i<labelCount;i++){const idx=Math.round(i*(days.length-1)/(labelCount-1||1));ctx.fillText(days[idx].toLocaleDateString("en-US",{month:"short",day:"numeric"}),x(idx),height-10);}
  ctx.textAlign="left";ctx.fillStyle="#087fc4";ctx.fillText("Page views",left,10);ctx.fillStyle="#09a7c8";ctx.fillText("Visitors",left+72,10);
}
function renderAnalytics(events) {
  const metrics = analyticsMetrics(events);
  const visitors = metrics.visitorSet.size;
  ui.analyticsVisitors.textContent = visitors;
  ui.analyticsVisitorsNote.textContent = visitors ? `last ${analyticsDays} days` : "No data yet";
  ui.analyticsSessions.textContent = metrics.starts.length;
  ui.analyticsPageViews.textContent = metrics.pageViews.length;
  ui.analyticsAvgTime.textContent = formatDuration(metrics.avg);
  ui.analyticsContentOpens.textContent = metrics.opens.length;
  ui.analyticsActive.textContent = metrics.activeSessions.size;
  ui.overviewVisitors.textContent = visitors;
  ui.overviewVisitorsDelta.textContent = `last ${analyticsDays} days`;
  ui.overviewAvgTime.textContent = formatDuration(metrics.avg);
  ui.analyticsChartStatus.textContent = events.length ? `Last ${analyticsDays} days` : "Waiting for data";
  ui.analyticsNoData.classList.toggle("hidden", events.length > 0);
  drawTrafficChart(events);

  const byType = { resource:0, video:0, other:0 };
  const contentCounts = new Map();
  metrics.opens.forEach(e => { const type=e.contentType||"other"; byType[type]=(byType[type]||0)+1; const key=e.title||"Untitled content"; const old=contentCounts.get(key)||{count:0,type}; old.count+=1;contentCounts.set(key,old); });
  const total = metrics.opens.length;
  ui.engagementTotal.textContent = total;
  const resourcePct = total ? byType.resource/total*100 : 0;
  const videoPct = total ? byType.video/total*100 : 0;
  ui.engagementDonut.style.background = total ? `conic-gradient(#087fc4 0 ${resourcePct}%, #09a7c8 ${resourcePct}% ${resourcePct+videoPct}%, #b9cbd7 ${resourcePct+videoPct}% 100%)` : "conic-gradient(#dce8ef 0 100%)";
  const legend=[['resource','Resources','#087fc4'],['video','Videos','#09a7c8'],['other','Other','#b9cbd7']];
  ui.engagementLegend.innerHTML = legend.map(([key,label,hex])=>`<div class="engagement-legend-row"><span><i class="legend-dot" style="background:${hex}"></i>${label}</span><strong>${byType[key]||0}</strong></div>`).join("");
  const top=[...contentCounts.entries()].sort((a,b)=>b[1].count-a[1].count).slice(0,6);
  ui.topContentList.innerHTML = top.length ? top.map(([title,item],i)=>`<div class="top-content-row"><span class="top-content-rank">${i+1}</span><div><strong title="${title.replace(/"/g,'&quot;')}">${title}</strong><small>${item.type === "video" ? "Video" : "Resource"}</small></div><span>${item.count}</span></div>`).join("") : '<div class="analytics-empty-row">No content opens recorded yet.</div>';
  const sourceCounts = new Map();
  metrics.starts.forEach(e=>{const source=e.referrer||"direct";sourceCounts.set(source,(sourceCounts.get(source)||0)+1);});
  const sources=[...sourceCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
  ui.trafficSourcesList.innerHTML = sources.length ? sources.map(([source,count])=>`<div class="source-row"><div><strong>${source}</strong><small>Session starts</small></div><span>${count}</span></div>`).join("") : '<div class="analytics-empty-row">No source data yet.</div>';
}
async function loadAnalytics() {
  try { analyticsEvents = await listSiteAnalytics({days: analyticsDays, maxEvents: 1000}); renderAnalytics(analyticsEvents); }
  catch (error) { console.warn("Analytics unavailable:", error); renderAnalytics([]); ui.analyticsChartStatus.textContent = "Analytics unavailable"; }
}
function setupAnalytics() {
  ui.analyticsRange?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-days]"); if (!button) return;
    analyticsDays = Number(button.dataset.days)||30;
    ui.analyticsRange.querySelectorAll("button[data-days]").forEach(b=>b.classList.toggle("active",b===button));
    await loadAnalytics();
  });
  $("refreshAnalyticsBtn")?.addEventListener("click", loadAnalytics);
  window.addEventListener("resize", ()=>{ if(analyticsEvents.length) drawTrafficChart(analyticsEvents); });
}

function updateOverview() { ui.overviewResources.textContent = state.resources.length; ui.overviewCategories.textContent = state.categories.length; ui.overviewVideos.textContent = state.videos.length; ui.overviewCertificates.textContent = state.certificates.length; ui.resourceCount.textContent = `${state.resources.length} ${state.resources.length === 1 ? "Resource" : "Resources"}`; }
function showCategoryOverview() { state.activeCategoryId = null; ui.categoriesList?.classList.remove("category-view-hidden"); ui.adminResourcesList.innerHTML = '<div class="resources-category-hint"><div class="resources-category-hint-icon">📚</div><div><strong>Choose a category above</strong><p>Open a category to view, search, paginate, edit or delete its resources.</p></div></div>'; ui.resourcesEmpty.hidden = true; renderResourcesHeader(); }
function renderResourcesHeader() { const header = document.querySelector(".admin-resources-header"); if (!header) return; header.innerHTML = '<div><span class="admin-resources-label">FIRESTORE</span><h2>Resources Management</h2><p>Select a category to view and manage its resources.</p></div><div class="admin-resources-actions"><div id="resourceCount" class="resource-count"></div><button id="refreshResourcesBtn" type="button" class="refresh-resources-btn">↻ Refresh</button></div>'; ui.resourceCount = $("resourceCount"); updateOverview(); $("refreshResourcesBtn").onclick = refreshDashboard; }
function openCategory(id) { const c = state.categories.find((x) => x.id === id); if (!c) return; state.activeCategoryId = id; state.resourcePage = 1; ui.categoriesList?.classList.add("category-view-hidden"); renderCategoryResources(c); document.querySelector(".admin-resources-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function renderCategoryResources(category) {
  const all = state.resources.filter((r) => belongs(r, category.id)).sort((a,b) => timestamp(b.createdAt)-timestamp(a.createdAt)); const header = document.querySelector(".admin-resources-header");
  if (header) { header.innerHTML = '<div class="category-resource-header-left"><button type="button" id="backToCategoriesBtn" class="resources-back-btn">← Back to Categories</button><div class="category-resource-heading"><span class="admin-resources-label">CATEGORY</span><h2></h2><p></p></div></div><div class="admin-resources-actions"><div class="resource-count"></div><button id="refreshCategoryBtn" type="button" class="refresh-resources-btn">↻ Refresh</button></div>'; header.querySelector("h2").textContent = `📁 ${category.name}`; header.querySelector("p").textContent = category.description || "Resources in this category"; header.querySelector(".resource-count").textContent = `${all.length} ${all.length === 1 ? "Resource" : "Resources"}`; $("backToCategoriesBtn").onclick = showCategoryOverview; $("refreshCategoryBtn").onclick = refreshDashboard; }
  ui.adminResourcesList.innerHTML = "";
  if (!all.length) { ui.resourcesEmpty.hidden = false; ui.resourcesEmpty.innerHTML = `<div class="resources-empty-icon">📂</div><h3>No Resources in ${category.name}</h3><p>Add a resource above and choose this category.</p>`; return; }
  ui.resourcesEmpty.hidden = true; const toolbar = document.createElement("div"); toolbar.className = "category-resource-toolbar"; toolbar.innerHTML = '<div class="category-resource-search-wrap"><span>⌕</span><input type="search" placeholder="Search resources..."></div><div class="category-resource-toolbar-count"></div>'; const cards = document.createElement("div"); cards.className = "category-resource-cards"; const pager = document.createElement("div"); pager.className = "resource-pagination"; ui.adminResourcesList.append(toolbar, cards, pager);
  function render() { const term = toolbar.querySelector("input").value.trim().toLowerCase(); const filtered = all.filter((r) => `${r.title||""} ${r.description||""} ${r.url||""}`.toLowerCase().includes(term)); const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); state.resourcePage = Math.min(state.resourcePage, pages); const start = (state.resourcePage-1)*PAGE_SIZE; const pageItems = filtered.slice(start, start+PAGE_SIZE); cards.innerHTML = ""; pageItems.forEach((r) => cards.appendChild(createResourceCard(r, category))); toolbar.querySelector(".category-resource-toolbar-count").textContent = `${filtered.length} matching resources`; renderPager(pager, pages, state.resourcePage, (p) => { state.resourcePage=p; render(); }); }
  toolbar.querySelector("input").oninput = () => { state.resourcePage=1; render(); }; render();
}
function renderPager(container, pages, current, onPage) { container.innerHTML = ""; if (pages <= 1) return; const make = (label, disabled, page) => { const b=document.createElement("button"); b.type="button"; b.textContent=label; b.disabled=disabled; b.onclick=()=>onPage(page); return b; }; container.appendChild(make("←", current===1, current-1)); for(let p=1;p<=pages;p++){ if(p===1||p===pages||Math.abs(p-current)<=2){ const b=make(String(p),false,p); if(p===current)b.classList.add("active"); container.appendChild(b);} else if(!container.lastChild?.classList.contains("ellipsis")){ const s=document.createElement("span");s.className="ellipsis";s.textContent="…";container.appendChild(s);} } container.appendChild(make("→", current===pages, current+1)); }
function createResourceCard(resource, category) { const card=document.createElement("article"); card.className="admin-resource-item"; card.innerHTML='<div class="admin-resource-main"><div class="admin-resource-icon">FILE</div><div class="admin-resource-info"><div class="admin-resource-category"></div><h3></h3><p></p><div class="admin-resource-meta"><span></span><span></span></div></div></div><div class="admin-resource-actions"><a class="admin-resource-open" target="_blank" rel="noopener noreferrer">Open</a><button type="button" class="admin-resource-edit">Edit</button><button type="button" class="admin-resource-delete">Delete</button></div>'; card.querySelector(".admin-resource-category").textContent=category.name.toUpperCase(); card.querySelector("h3").textContent=resource.title||"Untitled Resource"; card.querySelector("p").textContent=resource.description||"No description"; card.querySelector(".admin-resource-meta span").textContent=`📅 ${formatDate(resource.createdAt)}`; card.querySelectorAll(".admin-resource-meta span")[1].textContent=`ID: ${resource.id}`; card.querySelector(".admin-resource-open").href=resource.url||"#"; card.querySelector(".admin-resource-edit").onclick=()=>openResourceEdit(resource.id); card.querySelector(".admin-resource-delete").onclick=()=>openResourceDelete(resource.id); return card; }

function openResourceEdit(id){ const r=state.resources.find(x=>x.id===id); if(!r)return; state.resourceEditId=id; const m=$("resourceEditModal"); m.querySelector("#editResourceTitle").value=r.title||""; m.querySelector("#editResourceDescription").value=r.description||""; m.querySelector("#editResourceUrl").value=r.url||""; populateCategorySelect($("editResourceCategory")); $("editResourceCategory").value=categoryForResource(r)?.id||""; m.classList.add("show"); m.setAttribute("aria-hidden","false"); document.body.classList.add("modal-open"); }
function closeResourceEdit(){ $("resourceEditModal")?.classList.remove("show"); $("resourceEditModal")?.setAttribute("aria-hidden","true"); document.body.classList.remove("modal-open"); state.resourceEditId=null; }
async function saveResourceEdit(e){ e.preventDefault(); const id=state.resourceEditId;if(!id)return; const title=$("editResourceTitle").value.trim(), categoryId=$("editResourceCategory").value, description=$("editResourceDescription").value.trim(), url=$("editResourceUrl").value.trim(); if(!title||!categoryId||!description||!validUrl(url)){showPopup({type:"error",title:"INVALID DATA",subtitle:"Complete the resource fields with a valid URL."});return;} const c=state.categories.find(x=>x.id===categoryId); const b=document.querySelector("#resourceEditForm .resource-edit-save");b.disabled=true;b.textContent="Saving...";try{await updateResource(id,{title,category:c.name,categoryId,categoryName:c.name,description,url});closeResourceEdit();await loadData();showPopup({title:"UPDATED",subtitle:"Resource updated successfully.",details:[{label:"Name",value:title},{label:"Category",value:c.name}]});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not update the resource.",details:[{label:"Error",value:error.code||"Unknown error"}]});}finally{b.disabled=false;b.textContent="Save Changes";}}
function openResourceDelete(id){const r=state.resources.find(x=>x.id===id);if(!r)return;state.resourceDeleteId=id;$("delete-resource-name")?.textContent;$("resourceDeleteModal .delete-resource-name").textContent=r.title||"Untitled Resource";$("resourceDeleteModal").classList.add("show");$("resourceDeleteModal").setAttribute("aria-hidden","false");document.body.classList.add("modal-open");}
function closeResourceDelete(){$("resourceDeleteModal")?.classList.remove("show");$("resourceDeleteModal")?.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");state.resourceDeleteId=null;}
async function confirmResourceDelete(){const id=state.resourceDeleteId;if(!id)return;const r=state.resources.find(x=>x.id===id);const b=$("confirmResourceDelete");b.disabled=true;b.textContent="Deleting...";try{await removeResource(id);closeResourceDelete();await loadData();showPopup({title:"DELETED",subtitle:"Resource deleted successfully.",details:[{label:"Resource",value:r?.title||"Untitled Resource"}]});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not delete the resource.",details:[{label:"Error",value:error.code||"Unknown error"}]});}finally{b.disabled=false;b.textContent="Delete";}}

async function editCategory(id){const c=state.categories.find(x=>x.id===id);if(!c)return;const name=prompt("Category name:",c.name);if(name===null)return;const desc=prompt("Category description:",c.description||"");if(desc===null)return;const clean=name.trim();if(!clean){showPopup({type:"error",title:"INVALID NAME",subtitle:"Category name cannot be empty."});return;}try{await updateCategory(id,{name:clean,description:desc.trim()});await loadData();showPopup({title:"UPDATED",subtitle:"Category updated successfully.",details:[{label:"Category",value:clean}]});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not update the category.",details:[{label:"Error",value:error.code||"Unknown error"}]});}}
async function deleteCategory(id){const c=state.categories.find(x=>x.id===id);if(!c)return;const resourceCount=state.resources.filter(r=>belongs(r,id)).length;const videoCount=state.videos.filter(v=>v.categoryId===id).length;if(resourceCount||videoCount){showPopup({type:"error",title:"CANNOT DELETE",subtitle:"This category is still in use.",details:[{label:"Resources",value:String(resourceCount)},{label:"Videos",value:String(videoCount)}]});return;}if(!confirm(`Delete "${c.name}"?`))return;try{await removeCategory(id);await loadData();showPopup({title:"DELETED",subtitle:"Category deleted successfully.",details:[{label:"Category",value:c.name}]});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not delete the category.",details:[{label:"Error",value:error.code||"Unknown error"}]});}}

function renderContentList(){renderVideos();renderCertificates();}
function renderVideos(){ui.adminVideosList.innerHTML=""; if(!state.videos.length){ui.adminVideosList.innerHTML='<div class="resources-empty">No videos yet.</div>';return;} state.videos.forEach(v=>{const card=document.createElement("article");card.className="admin-content-item";card.innerHTML='<div><span class="admin-content-type">VIDEO</span><h3></h3><p></p><small></small></div><div class="admin-content-actions"><a target="_blank" rel="noopener" class="admin-resource-open">Open</a><button type="button" class="admin-resource-edit">Edit</button><button type="button" class="admin-resource-delete">Delete</button></div>';card.querySelector("h3").textContent=v.title||"Untitled";card.querySelector("p").textContent=v.description||"No description";card.querySelector("small").textContent=categoryName(v.categoryId);card.querySelector("a").href=v.url||"#";card.querySelector(".admin-resource-edit").onclick=()=>openContentEdit("video",v.id);card.querySelector(".admin-resource-delete").onclick=()=>openContentDelete("video",v.id);ui.adminVideosList.appendChild(card);});}
function renderCertificates(){ui.adminCertificatesList.innerHTML=""; if(!state.certificates.length){ui.adminCertificatesList.innerHTML='<div class="resources-empty">No certificates yet.</div>';return;} state.certificates.forEach(c=>{const card=document.createElement("article");card.className="admin-content-item";card.innerHTML='<div><span class="admin-content-type">CERTIFICATE</span><h3></h3><p></p><small></small></div><div class="admin-content-actions"><a target="_blank" rel="noopener" class="admin-resource-open">Open</a><button type="button" class="admin-resource-edit">Edit</button><button type="button" class="admin-resource-delete">Delete</button></div>';card.querySelector("h3").textContent=c.title||"Untitled";card.querySelector("p").textContent=c.description||"No description";card.querySelector("small").textContent=c.date||"No date";const a=card.querySelector("a");a.href=c.url||c.imageUrl||"#";a.textContent=c.url?"Open":"View";card.querySelector(".admin-resource-edit").onclick=()=>openContentEdit("certificate",c.id);card.querySelector(".admin-resource-delete").onclick=()=>openContentDelete("certificate",c.id);ui.adminCertificatesList.appendChild(card);});}
function openContentEdit(type,id){state.contentEdit={type,id};const data=type==="video"?state.videos.find(x=>x.id===id):state.certificates.find(x=>x.id===id);if(!data)return;const m=$("contentEditModal");$("contentEditTitle").textContent=type==="video"?"Edit Video":"Edit Certificate";$("editContentTitle").value=data.title||"";$("editContentDescription").value=data.description||"";$("editContentCategory").innerHTML="<option value=''>Select category</option>";state.categories.filter(c=>{const t=c.type||"resource";return type==="video" ? (t==="video"||t==="both") : true;}).forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;o.selected=c.id===data.categoryId;$("editContentCategory").appendChild(o);});$("editContentUrl").value=data.url||"";$("editContentDate").value=data.date||"";$("editContentImage").value=data.imageUrl||"";$("editContentCategoryWrap").style.display=type==="video"?"flex":"none";$("editContentUrlWrap").style.display="flex";$("editContentDateWrap").style.display=type==="certificate"?"flex":"none";$("editContentImageWrap").style.display=type==="certificate"?"flex":"none";m.classList.add("show");m.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");}
function closeContentEdit(){$("contentEditModal")?.classList.remove("show");$("contentEditModal")?.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");state.contentEdit=null;}
async function saveContentEdit(e){e.preventDefault();if(!state.contentEdit)return;const {type,id}=state.contentEdit;const title=$("editContentTitle").value.trim(),description=$("editContentDescription").value.trim(),url=$("editContentUrl").value.trim();if(!title||!description||!validUrl(url)){showPopup({type:"error",title:"INVALID DATA",subtitle:"Complete the required fields with valid URLs."});return;}const b=document.querySelector("#contentEditForm .resource-edit-save");b.disabled=true;b.textContent="Saving...";try{if(type==="video"){const c=state.categories.find(x=>x.id===$("editContentCategory").value);if(!c){showPopup({type:"error",title:"CATEGORY REQUIRED",subtitle:"Choose a category."});return;}await updateVideo(id,{title,description,url,categoryId:c.id,categoryName:c.name});}else{const image=$("editContentImage").value.trim();if(image&&!validUrl(image)){showPopup({type:"error",title:"INVALID IMAGE URL",subtitle:"Enter a valid image URL."});return;}await updateCertificate(id,{title,description,url,date:$("editContentDate").value,imageUrl:image});}closeContentEdit();await loadData();showPopup({title:"UPDATED",subtitle:`${type==="video"?"Video":"Certificate"} updated successfully.`,details:[{label:"Title",value:title}]});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not update the item.",details:[{label:"Error",value:error.code||"Unknown error"}]});}finally{b.disabled=false;b.textContent="Save Changes";}}
function openContentDelete(type,id){state.contentDelete={type,id};const data=type==="video"?state.videos.find(x=>x.id===id):state.certificates.find(x=>x.id===id);$("deleteContentName").textContent=data?.title||"Untitled";$("contentDeleteModal").classList.add("show");$("contentDeleteModal").setAttribute("aria-hidden","false");document.body.classList.add("modal-open");}
function closeContentDelete(){$("contentDeleteModal")?.classList.remove("show");$("contentDeleteModal")?.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");state.contentDelete=null;}
async function confirmContentDelete(){if(!state.contentDelete)return;const {type,id}=state.contentDelete;const b=$("confirmContentDelete");b.disabled=true;b.textContent="Deleting...";try{if(type==="video")await removeVideo(id);else await removeCertificate(id);closeContentDelete();await loadData();showPopup({title:"DELETED",subtitle:`${type==="video"?"Video":"Certificate"} deleted successfully.`});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not delete the item.",details:[{label:"Error",value:error.code||"Unknown error"}]});}finally{b.disabled=false;b.textContent="Delete";}}

async function handleCreateCategory(e){
  e.preventDefault();

  const name = ui.categoryName.value.trim();
  const description = ui.categoryDescription.value.trim();
  const type = ui.categoryType.value || "resource";

  if (!name) {
    showPopup({ type:"error", title:"MISSING DATA", subtitle:"Enter a category name." });
    ui.categoryName.focus();
    return;
  }

  if (!type) {
    showPopup({ type:"error", title:"MISSING DATA", subtitle:"Choose where this category will be used." });
    ui.categoryType.focus();
    return;
  }

  if (state.categories.some(c => c.name.trim().toLowerCase() === name.toLowerCase())) {
    showPopup({ type:"error", title:"ALREADY EXISTS", subtitle:"This category already exists." });
    return;
  }

  ui.createCategoryBtn.disabled = true;
  ui.createCategoryBtn.textContent = "Creating...";

  try {
    await createCategory({ name, description, type });
    ui.categoryForm.reset();
    ui.categoryType.value = "resource";
    ui.categoryFormWrapper.hidden = true;
    await loadData();

    const typeLabel = type === "video" ? "Videos" : type === "both" ? "Resources + Videos" : "Resources";

    showPopup({
      title:"DONE",
      subtitle:"Category created successfully.",
      details:[
        { label:"Category", value:name },
        { label:"Used for", value:typeLabel },
      ],
    });
  } catch(error) {
    showPopup({ type:"error", title:"ERROR", subtitle:"Could not create the category.", details:[{ label:"Error", value:error.code||"Unknown error" }] });
  } finally {
    ui.createCategoryBtn.disabled = false;
    ui.createCategoryBtn.textContent = "Create Category";
  }
}
async function handleCreateResource(e){e.preventDefault();const title=ui.resourceTitle.value.trim(),categoryId=ui.resourceCategory.value,description=ui.resourceDescription.value.trim(),url=ui.resourceUrl.value.trim();if(!title||!categoryId||!description||!validUrl(url)){showPopup({type:"error",title:"INVALID DATA",subtitle:"Complete the resource fields with a valid URL."});return;}const c=state.categories.find(x=>x.id===categoryId);ui.addResourceBtn.disabled=true;ui.addResourceBtn.textContent="Adding...";try{await createResource({title,description,url,categoryId,categoryName:c.name,category:c.name});ui.resourceForm.reset();await loadData();showPopup({title:"DONE",subtitle:"Resource added successfully.",details:[{label:"Name",value:title},{label:"Category",value:c.name},{label:"Link",value:url,isLink:true}]});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not add the resource.",details:[{label:"Error",value:error.code||"Unknown error"}]});}finally{ui.addResourceBtn.disabled=false;ui.addResourceBtn.textContent="Add Resource";}}
async function handleCreateVideo(e){e.preventDefault();const title=ui.videoTitle.value.trim(),categoryId=ui.videoCategory.value,description=ui.videoDescription.value.trim(),url=ui.videoUrl.value.trim();if(!title||!categoryId||!description||!validUrl(url)){showPopup({type:"error",title:"INVALID DATA",subtitle:"Complete the video fields with a valid URL."});return;}const c=state.categories.find(x=>x.id===categoryId);ui.addVideoBtn.disabled=true;ui.addVideoBtn.textContent="Adding...";try{await createVideo({title,description,url,categoryId,categoryName:c.name});ui.videoForm.reset();await loadData();showPopup({title:"DONE",subtitle:"Video added successfully.",details:[{label:"Title",value:title},{label:"Category",value:c.name}]});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not add the video.",details:[{label:"Error",value:error.code||"Unknown error"}]});}finally{ui.addVideoBtn.disabled=false;ui.addVideoBtn.textContent="Add Video";}}
async function handleCreateCertificate(e){e.preventDefault();const title=ui.certificateTitle.value.trim(),description=ui.certificateDescription.value.trim(),date=ui.certificateDate.value,imageUrl=ui.certificateImageUrl.value.trim(),url=ui.certificateUrl.value.trim();if(!title||!description){showPopup({type:"error",title:"MISSING DATA",subtitle:"Title and description are required."});return;}if((imageUrl&&!validUrl(imageUrl))||(url&&!validUrl(url))){showPopup({type:"error",title:"INVALID LINK",subtitle:"Use valid http/https URLs."});return;}ui.addCertificateBtn.disabled=true;ui.addCertificateBtn.textContent="Adding...";try{await createCertificate({title,description,date,imageUrl,url});ui.certificateForm.reset();await loadData();showPopup({title:"DONE",subtitle:"Certificate added successfully.",details:[{label:"Title",value:title},{label:"Date",value:date||"Not specified"}]});}catch(error){showPopup({type:"error",title:"ERROR",subtitle:"Could not add the certificate.",details:[{label:"Error",value:error.code||"Unknown error"}]});}finally{ui.addCertificateBtn.disabled=false;ui.addCertificateBtn.textContent="Add Certificate";}}

async function loadData(){setLoading(ui.categoriesLoading,true);setLoading(ui.resourcesLoading,true);setLoading(ui.videosLoading,true);setLoading(ui.certificatesLoading,true);setError(ui.categoriesError,"");setError(ui.resourcesError,"");setError(ui.videosError,"");setError(ui.certificatesError,"");try{const [categories,resources,videos,certificates]=await Promise.all([listCategories(),listResources(),listVideos(),listCertificates()]);state.categories=categories;state.resources=resources;state.videos=videos;state.certificates=certificates;await loadAnalytics();populateCategorySelect(ui.resourceCategory, "resource");populateCategorySelect(ui.videoCategory, "video");renderCategories();renderContentList();updateOverview();if(state.activeCategoryId){const c=state.categories.find(x=>x.id===state.activeCategoryId);c?renderCategoryResources(c):showCategoryOverview();}else showCategoryOverview();}catch(error){console.error(error);setError(ui.categoriesError,"Could not load categories.");setError(ui.resourcesError,"Could not load resources.");setError(ui.videosError,"Could not load videos.");setError(ui.certificatesError,"Could not load certificates.");}finally{setLoading(ui.categoriesLoading,false);setLoading(ui.resourcesLoading,false);setLoading(ui.videosLoading,false);setLoading(ui.certificatesLoading,false);}}
async function refreshDashboard(){const b=$("refreshResourcesBtn")||$("refreshCategoryBtn");if(b){b.disabled=true;b.textContent="Loading...";}try{await loadData();}finally{const current=$("refreshResourcesBtn")||$("refreshCategoryBtn");if(current){current.disabled=false;current.textContent="↻ Refresh";}}}
function setupEvents(){ui.adminProfileForm?.addEventListener("submit",saveAdminProfile);ui.showCategoryFormBtn?.addEventListener("click",()=>{ui.categoryFormWrapper.hidden=false;ui.categoryName.focus();});ui.cancelCategoryBtn?.addEventListener("click",()=>{ui.categoryForm.reset();ui.categoryFormWrapper.hidden=true;});ui.categoryForm?.addEventListener("submit",handleCreateCategory);ui.resourceForm?.addEventListener("submit",handleCreateResource);ui.videoForm?.addEventListener("submit",handleCreateVideo);ui.certificateForm?.addEventListener("submit",handleCreateCertificate);ui.refreshResourcesBtn?.addEventListener("click",refreshDashboard);$("closeResourcePopup")?.addEventListener("click",hidePopup);ui.popup?.addEventListener("click",e=>{if(e.target===ui.popup)hidePopup();});$("resourceEditForm")?.addEventListener("submit",saveResourceEdit);$("cancelResourceEdit")?.addEventListener("click",closeResourceEdit);$("resourceEditModal")?.addEventListener("click",e=>{if(e.target.id==="resourceEditModal")closeResourceEdit();});$("confirmResourceDelete")?.addEventListener("click",confirmResourceDelete);$("cancelResourceDelete")?.addEventListener("click",closeResourceDelete);$("resourceDeleteModal")?.addEventListener("click",e=>{if(e.target.id==="resourceDeleteModal")closeResourceDelete();});$("contentEditForm")?.addEventListener("submit",saveContentEdit);$("cancelContentEdit")?.addEventListener("click",closeContentEdit);$("contentEditModal")?.addEventListener("click",e=>{if(e.target.id==="contentEditModal")closeContentEdit();});$("confirmContentDelete")?.addEventListener("click",confirmContentDelete);$("cancelContentDelete")?.addEventListener("click",closeContentDelete);$("contentDeleteModal")?.addEventListener("click",e=>{if(e.target.id==="contentDeleteModal")closeContentDelete();});ui.logoutBtn?.addEventListener("click",async()=>{try{ui.logoutBtn.disabled=true;await logout();}finally{window.location.replace("../index.html");}});}

async function start(){await initializeAuth();observeAuth(async(user)=>{if(!user){window.location.replace("../index.html");return;}try{const profile=await ensureUserProfile(user);if(profile?.role!=="admin"){window.location.replace("../index.html");return;}state.profile=profile;fillAdminProfile(profile,user);setupAnalytics();setupEvents();await loadData();}catch(error){console.error("Admin startup error:",error);showPopup({type:"error",title:"ACCESS ERROR",subtitle:"Could not prepare the admin dashboard.",details:[{label:"Error",value:error.code||error.message||"Unknown error"}]});}});}
start().catch(console.error);
