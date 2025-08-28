/** Firebase & App setup (ES modules from CDN) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc,deleteDoc,
  query, orderBy, limit, startAfter, where, startAt, endAt
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyAAjjwH4z2HWyKOOflySU-l1fXaTR89LeU",
  authDomain: "create-stories-d6b8e.firebaseapp.com",
  projectId: "create-stories-d6b8e",
  storageBucket: "create-stories-d6b8e.firebasestorage.app",
  messagingSenderId: "530177556304",
  appId: "1:530177556304:web:47bb327a9e049229a6f655",
  measurementId: "G-358D7BVM6N"
};



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/** Utilities */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const toast = (m) => alert(m); // simple toast

/** Theme & font controls (persist by localStorage) */
(function setupPrefs(){
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("theme") || "light";
  root.setAttribute("data-theme", savedTheme);
  const savedFont = localStorage.getItem("font") || "system-ui";
  const savedSize = localStorage.getItem("fontSize") || "16px";
  document.body.style.fontFamily = savedFont;
  document.body.style.fontSize = savedSize;

  const themeBtn = $("#themeToggle");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const t = root.getAttribute("data-theme")==="light"?"dark":"light";
    root.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
  });

  const fontSelect = $("#fontSelect");
  if (fontSelect) {
    fontSelect.value = savedFont;
    fontSelect.addEventListener("change", (e)=>{
      document.body.style.fontFamily = e.target.value;
      localStorage.setItem("font", e.target.value);
    });
  }
  const fontSize = $("#fontSize");
  if (fontSize) {
    fontSize.value = savedSize;
    fontSize.addEventListener("change", (e)=>{
      document.body.style.fontSize = e.target.value;
      localStorage.setItem("fontSize", e.target.value);
    });
  } 
})();

/** Global auth UI (avatar, menu, admin link) */
onAuthStateChanged(auth, async (user) => {
  const page = document.body.dataset.page;
  const avatar = $("#userAvatar");
  const logoutBtn = $("#logoutBtn");
  const adminLink = $("#adminLink");
  const userMenu = $("#userMenu");
  const userInfo = $("#userInfo");

  if (avatar) avatar.onclick = ()=> userMenu?.classList.toggle("hidden");

  if (user) {
    const profRef = doc(db, "users", user.uid);
    const profSnap = await getDoc(profRef);
    const profile = profSnap.exists() ? profSnap.data() : {};
    const nickname = profile.nickname || user.displayName || user.email;
    if (userInfo) userInfo.textContent = nickname;
    if (avatar) avatar.src = profile.avatarUrl || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(nickname)}`;
    if (logoutBtn) logoutBtn.style.display = "block";
    if (adminLink) adminLink.hidden = !profile.admin;

    if (page === "admin") ensureAdmin(profile);
  } else {
    if (logoutBtn) logoutBtn.style.display = "none";
    if (adminLink) adminLink.hidden = true;
    if (document.body.dataset.page === "admin") window.location.href = "login.html";
  }
});

if ($("#logoutBtn")) $("#logoutBtn").addEventListener("click", async ()=>{ await signOut(auth); window.location.href = "index.html"; });

/** Page routers */
const page = document.body.dataset.page;
if (page === "login") initLogin();
if (page === "register") initRegister();
if (page === "index") initIndex();
if (page === "admin") initAdmin();

/** ---- LOGIN ---- */
function initLogin(){
  const form = $("#loginForm");
  form?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "index.html";
    } catch(err) {
      toast("Đăng nhập thất bại: " + err.message);
    }
  });
}

/** ---- REGISTER ---- */
function initRegister(){
  const form = $("#registerForm");
  form?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = $("#regEmail").value.trim();
    const password = $("#regPassword").value;
    const nickname = $("#regNickname").value.trim();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: nickname });
      await setDoc(doc(db, "users", cred.user.uid), {
        email, nickname, admin:false, createdAt: Date.now()
      });
      toast("Đăng ký thành công!");
      window.location.href = "index.html";
    } catch(err) {
      toast("Đăng ký thất bại: " + err.message);
    }
  });
}

/** ---- INDEX (list + search + open story + like chapter) ---- */
function initIndex(){
  const listEl = $("#storiesList");
  const pageInfo = $("#pageInfo");
  const prevBtn = $("#prevPage");
  const nextBtn = $("#nextPage");
  const searchInput = $("#searchInput");
  const drawer = $("#storyDetail");
  const closeStory = $("#closeStory");

  let currentPage = 1;
  const pageSize = 10;
  let lastVisible = null;
  let cursors = []; // keep stack of cursors per page

  async function loadPage(reset=false){
    listEl.innerHTML = "";
    let baseQ = null;
    const term = (searchInput?.value || "").trim();
    if (term) {
      // search by title prefix
      baseQ = query(collection(db, "stories"), orderBy("title"),
        startAt(term), endAt(term + "\uf8ff"), limit(pageSize+1));
    } else {
      baseQ = query(collection(db, "stories"), orderBy("createdAt","desc"), limit(pageSize+1));
    }

    if (!reset && lastVisible) {
      // paginate forwards from saved cursor
      baseQ = query(baseQ, startAfter(lastVisible));
    }

    const snap = await getDocs(baseQ);
    const docs = snap.docs.slice(0, pageSize);
    lastVisible = docs[docs.length-1] || null;

    // buttons state
    prevBtn.disabled = currentPage===1;
    nextBtn.disabled = snap.docs.length <= pageSize;

    docs.forEach(d=> renderStoryCard(d.id, d.data()));
    pageInfo.textContent = `Trang ${currentPage}`;
  }

  function renderStoryCard(id, data){
    const card = document.createElement("div");
    card.className = "story-card";
    const cover = data.coverUrl || "https://placehold.co/600x800?text=No+Cover";
    card.innerHTML = `
      <img src="${cover}" alt="cover"/>
      <div class="meta">
        <div class="badge">${new Date(data.createdAt||Date.now()).toLocaleDateString()}</div>
        <h3>${data.title}</h3>
        <p class="badge">${data.description||""}</p>
        <button class="btn subtle" data-open="${id}">Mở các chương</button>
      </div>
    `;
    listEl.appendChild(card);
  }

  prevBtn?.addEventListener("click", async ()=>{
    if (currentPage<=1) return;
    // Simplified: reload from beginning with page-1 * pageSize offset (client-side)
    currentPage--;
    lastVisible = null;
    await loadPage(true);
  });

  nextBtn?.addEventListener("click", async ()=>{
    if (nextBtn.disabled) return;
    currentPage++;
    await loadPage(false);
  });

  searchInput?.addEventListener("input", async ()=>{
    currentPage = 1;
    lastVisible = null;
    await loadPage(true);
  });

  listEl?.addEventListener("click", async (e)=>{
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    const storyId = btn.dataset.open;
    openStory(storyId);
  });

  closeStory?.addEventListener("click", ()=> drawer.hidden = true);

  async function openStory(storyId){
    const storyRef = doc(db, "stories", storyId);
    const storySnap = await getDoc(storyRef);
    if (!storySnap.exists()) return toast("Không tìm thấy truyện");
    const data = storySnap.data();
    $("#detailTitle").textContent = data.title;
    $("#detailDesc").textContent = data.description || "";
    $("#detailCover").src = data.coverUrl || "https://placehold.co/600x800?text=No+Cover";

    // load chapters ordered by createdAt
    const chSnap = await getDocs(query(collection(db, "stories", storyId, "chapters"), orderBy("createdAt","asc")));
    const list = $("#chaptersList"); list.innerHTML="";
    chSnap.forEach(ch=>{
      const chData = ch.data();
      const likedBy = chData.likedBy || [];
      const me = auth.currentUser?.uid;
      const liked = me ? likedBy.includes(me) : false;
      const item = document.createElement("div");
      item.className = "chapter";
      item.innerHTML = `
        <div class="title">${chData.title||"Chương"}</div>
        <div class="content">${(chData.content||"").replace(/\n/g,"<br/>")}</div>
        <div class="like-row">
          <small>${new Date(chData.createdAt||Date.now()).toLocaleString()}</small>
          <div>
            <button data-like="${storyId}|${ch.id}" ${liked?"disabled":""}>❤ Thích (<span class="likec">${(likedBy.length||0)}</span>)</button>
          </div>
        </div>
      `;
      list.appendChild(item);
    });
    drawer.hidden = false;
  }

  // Like handler
  $("#chaptersList")?.addEventListener("click", async (e)=>{
    const btn = e.target.closest("button[data-like]");
    if (!btn) return;
    const user = auth.currentUser;
    if (!user) return toast("Vui lòng đăng nhập để like");
    const [storyId, chId] = btn.dataset.like.split("|");
    const chRef = doc(db, "stories", storyId, "chapters", chId);
    const snap = await getDoc(chRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const likedBy = new Set(data.likedBy || []);
    if (likedBy.has(user.uid)) return;
    likedBy.add(user.uid);
    await setDoc(chRef, { likedBy: Array.from(likedBy) }, { merge:true });
    btn.disabled = true;
    const c = btn.querySelector(".likec");
    if (c) c.textContent = String(likedBy.size);
  });

  // Initial
  loadPage(true);
}

/** ---- ADMIN ---- */
/* ============================
   // Admin
============================ */

// Danh sách email admin (bạn sửa email của bạn vào đây)
const ADMIN_EMAILS = ["admin@gmail.com"];

// Hàm kiểm tra có phải admin không
function isAdmin(user) {
  return user && ADMIN_EMAILS.includes(user.email);
}

// Hàm bảo vệ trang admin.html
async function ensureAdmin(user) {
  const guard = document.getElementById("adminGuard");
  if (!isAdmin(user)) {
    guard.textContent = "Bạn không có quyền truy cập. Liên hệ Admin để được cấp quyền.";
    setTimeout(() => {
      window.location.href = "index.html"; // quay lại trang chính
    }, 2000);
    return false;
  } else {
    guard.classList.add("hidden");
    document.getElementById("createStory").hidden = false;
    document.getElementById("manageChapters").hidden = false;
    document.getElementById("manageStories").hidden = false;
    await loadStoryOptions();
    await loadStoriesForAdmin();
    return true;
  }
}

// Khi trạng thái đăng nhập thay đổi
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("Đã đăng nhập:", user.email);

    // Nếu đang ở trang admin.html thì check quyền
    if (window.location.pathname.includes("admin.html")) {
      await ensureAdmin(user);
    }
  } else {
    console.log("Chưa đăng nhập");
    if (window.location.pathname.includes("admin.html")) {
      window.location.href = "login.html";
    }
  }
});



function initAdmin(){
  const createBtn = $("#createStoryBtn");
  if (createBtn) {
    createBtn.replaceWith(createBtn.cloneNode(true)); // xoá hết listener cũ
    $("#createStoryBtn").addEventListener("click", async () => {
      await handleCreateStory();
    });
  }

  const addChapterBtn = $("#addChapterBtn");
  if (addChapterBtn) {
    addChapterBtn.replaceWith(addChapterBtn.cloneNode(true));
    $("#addChapterBtn").addEventListener("click", async () => {
      await handleAddChapter();
    });
  }
}

async function handleCreateStory(){
  const title = $("#storyTitle").value.trim();
  if (!title) return toast("Nhập tiêu đề");
  const description = $("#storyDesc").value.trim();
  const coverUrl = $("#storyCoverUrl").value.trim() || "https://placehold.co/600x800?text=No+Cover";

  try {
    const docRef = await addDoc(collection(db, "stories"), {
      title,
      description,
      coverUrl,
      createdAt: Date.now(),
      authorUid: auth.currentUser?.uid || null
    });
    toast("Đã tạo truyện!");
    $("#storyTitle").value = "";
    $("#storyDesc").value = "";
    $("#storyCoverUrl").value = "";
    await loadStoryOptions(docRef.id);
  } catch(err) {
    toast("Lỗi tạo truyện: " + err.message);
  }
}

async function handleAddChapter(){
  const storyId = $("#storySelect").value;
  if (!storyId) return toast("Chọn truyện");
  const title = $("#chapterTitle").value.trim() || "Chương mới";
  const content = $("#chapterContent").value.trim();
  try {
    await addDoc(collection(db, "stories", storyId, "chapters"), {
      title, content, createdAt: Date.now(), likedBy: []
    });
    toast("Đã thêm chương");
    $("#chapterTitle").value = "";
    $("#chapterContent").value = "";
  } catch(err) {
    toast("Lỗi thêm chương: " + err.message);
  }
}

async function loadStoriesForAdmin(){
  const container = $("#storyList");
  if (!container) return;
  container.innerHTML = "";

  const snap = await getDocs(query(collection(db, "stories"), orderBy("createdAt","desc")));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "story-item";
    div.innerHTML = `
      <strong>${data.title}</strong> 
      <button class="btn btn-edit" data-edit="${docSnap.id}">Sửa</button>
      <button class="btn btn-delete" data-del="${docSnap.id}">Xóa</button>
    `;
    container.appendChild(div);
  });
}

// Gọi khi vào admin
if (page === "admin") {
  initAdmin();
  loadStoriesForAdmin();
}

let editingId = null; // để nhớ ID truyện đang sửa

document.addEventListener("click", async (e) => {
  // XÓA
  if (e.target.matches("[data-del]")) {
    const id = e.target.dataset.del;
    if (confirm("Bạn chắc chắn muốn xóa truyện này?")) {
      await deleteDoc(doc(db, "stories", id));
      toast("Đã xóa truyện");
      loadStoriesForAdmin();
      loadStoryOptions();
    }
  }

  // SỬA
  if (e.target.matches("[data-edit]")) {
  const id = e.target.dataset.edit;
  const snap = await getDoc(doc(db, "stories", id));
  if (!snap.exists()) return toast("Không tìm thấy truyện");
  const data = snap.data();

  document.getElementById("editTitle").value = data.title;
  document.getElementById("editDesc").value = data.description || "";
  document.getElementById("editContent").value = data.content || ""; // 👈 thêm dòng này
  document.getElementById("editForm").hidden = false;
  editingId = id;
}
});

// Nút Lưu
document.getElementById("saveEditBtn").addEventListener("click", async () => {
  if (!editingId) return;

  const newTitle = document.getElementById("editTitle").value.trim();
  const newDesc = document.getElementById("editDesc").value.trim();
  const newContent = document.getElementById("editContent").value.trim(); // 👈 lấy nội dung

  await setDoc(doc(db, "stories", editingId), {
    title: newTitle,
    description: newDesc,
    content: newContent
  }, { merge: true });

  toast("Đã cập nhật truyện");
  document.getElementById("editForm").hidden = true;
  editingId = null;

  loadStoriesForAdmin();
  loadStoryOptions();
});


// Nút Hủy
document.getElementById("cancelEditBtn").addEventListener("click", () => {
  document.getElementById("editForm").hidden = true;
  editingId = null;
});



async function loadStoryOptions(selectId){
  const sel = $("#storySelect");
  if (!sel) return;
  sel.innerHTML = "";
  const snap = await getDocs(query(collection(db, "stories"), orderBy("createdAt","desc")));
  snap.forEach(d=>{
    const o = document.createElement("option");
    o.value = d.id;
    o.textContent = d.data().title;
    sel.appendChild(o);
  });
  if (selectId) sel.value = selectId;
}
