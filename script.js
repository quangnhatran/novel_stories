/** Firebase & App setup (ES modules from CDN) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, deleteDoc, updateDoc,
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
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const toast = (m) => alert(m); // simple toast

/** Theme & font controls (persist by localStorage) */
(function setupPrefs() {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("theme") || "light";
  root.setAttribute("data-theme", savedTheme);
  const savedFont = localStorage.getItem("font") || "system-ui";
  const savedSize = localStorage.getItem("fontSize") || "16px";
  document.body.style.fontFamily = savedFont;
  document.body.style.fontSize = savedSize;

  const themeBtn = $("#themeToggle");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const t = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
  });

  const fontSelect = $("#fontSelect");
  if (fontSelect) {
    fontSelect.value = savedFont;
    fontSelect.addEventListener("change", (e) => {
      document.body.style.fontFamily = e.target.value;
      localStorage.setItem("font", e.target.value);
    });
  }
  const fontSize = $("#fontSize");
  if (fontSize) {
    fontSize.value = savedSize;
    fontSize.addEventListener("change", (e) => {
      document.body.style.fontSize = e.target.value;
      localStorage.setItem("fontSize", e.target.value);
    });
  }
})();
/** Settings Menu Toggle */
(function setupSettingsMenu() {
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsMenu = document.getElementById("settingsMenu");
  if (!settingsBtn || !settingsMenu) return;

  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // ngăn click lan ra ngoài
    settingsMenu.classList.toggle("show");
  });

  // click ra ngoài để đóng
  document.addEventListener("click", (e) => {
    if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
      settingsMenu.classList.remove("show");
    }
  });
})();


/** Global auth UI (avatar, menu, admin link) */
onAuthStateChanged(auth, async (user) => {
  const page = document.body.dataset.page;
  const avatar = $("#userAvatar");
  const logoutBtn = $("#logoutBtn");
  const adminLink = $("#adminLink");
  const userMenu = $("#userMenu");
  const userInfo = $("#userInfo");

  if (avatar) avatar.onclick = () => userMenu?.classList.toggle("hidden");

  if (user) {
    const profRef = doc(db, "users", user.uid);
    const profSnap = await getDoc(profRef);
    const profile = profSnap.exists() ? profSnap.data() : {};
    const nickname = profile.nickname || user.displayName || user.email;
    if (userInfo) userInfo.textContent = nickname;
    if (avatar) avatar.src = profile.avatarUrl || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(nickname)}`;
    if (logoutBtn) logoutBtn.style.display = "block";
    if (adminLink) adminLink.hidden = !profile.admin;
    const loginLink = $("#loginLink");
    const registerLink = $("#registerLink");
    if (loginLink) loginLink.style.display = "none";
    if (registerLink) registerLink.style.display = "none";


    if (page === "admin") ensureAdmin(profile);
  } else {
    if (userInfo) userInfo.textContent = "Khách";
    if (avatar) avatar.src = "default-avatar.png"; // hoặc để icon mặc định

    if (logoutBtn) logoutBtn.style.display = "none";
    if (adminLink) adminLink.hidden = true;

    const loginLink = $("#loginLink");
    const registerLink = $("#registerLink");
    if (loginLink) loginLink.style.display = "inline";
    if (registerLink) registerLink.style.display = "inline";

    if (document.body.dataset.page === "admin")
      window.location.href = "login.html";
  }
});

if ($("#logoutBtn")) {
  $("#logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    showModal({
      title: "Đăng xuất",
      message: "Bạn đã đăng xuất thành công!"
    });
    setTimeout(() => window.location.href = "index.html", 1500);
  });
}


/** Page routers */
const page = document.body.dataset.page;
if (page === "login") initLogin();
if (page === "register") initRegister();
if (page === "index") initIndex();
if (page === "admin") initAdmin();
// LOGIN //
/** ---- LOGIN ---- */
function initLogin() {
  const form = $("#loginForm");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Thành công
      showModal({
        title: "Đăng nhập thành công",
        message: "Chào mừng bạn quay lại!",
      });

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);

    } catch (err) {
      // Thất bại
      showModal({
        title: "Đăng nhập thất bại",
        message: "Sai email hoặc mật khẩu.",
        actionText: "Thử lại",
        onAction: () => console.log("User muốn thử lại")
      });
    }
  });
}




/** ---- REGISTER ---- */
function initRegister() {
  const form = $("#registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#regEmail").value.trim();
    const password = $("#regPassword").value;
    const nickname = $("#regNickname").value.trim();

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: nickname });
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        nickname,
        admin: false,
        createdAt: Date.now()
      });

      // Thành công
      alertModal("Tài khoản của bạn đã được tạo!", "🎉 Đăng ký thành công");

      setTimeout(() => window.location.href = "index.html", 2000);

    } catch (err) {
      console.error("Register error:", err);

      // Thất bại -> show modal đẹp
      if (err.code === "auth/email-already-in-use") {
        alertModal("Email này đã được sử dụng.", "❌ Đăng ký thất bại");
      } else if (err.code === "auth/weak-password") {
        alertModal("Mật khẩu quá yếu, vui lòng nhập ít nhất 6 ký tự.", "⚠️ Lỗi");
      } else {
        alertModal("Có lỗi xảy ra, vui lòng thử lại.", "❌ Đăng ký thất bại");
      }
    }
  });
}



/** ---- INDEX (list + search + open story + like chapter) ---- */
function initIndex() {
  const listEl = $("#storiesList");
  const pageInfo = $("#pageInfo");
  const prevBtn = $("#prevPage");
  const nextBtn = $("#nextPage");
  const searchInput = $("#searchInput");
  const drawer = $("#storyDetail");
  const closeStory = $("#closeStory");
  const homeBtn = $("#homeBtn"); // 

  let currentPage = 1;
  const pageSize = 10;
  let lastVisible = null;
  let cursors = []; // keep stack of cursors per page

  async function loadPage(reset = false) {
    listEl.innerHTML = "";
    const term = (searchInput?.value || "").trim().toLowerCase();

    // lấy hết stories (hoặc giới hạn nếu bạn sợ nhiều dữ liệu)
    const snap = await getDocs(query(
      collection(db, "stories"),
      orderBy("createdAt", "desc")
    ));

    let allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // lọc theo tên chứa từ khoá
    let filtered = term
      ? allDocs.filter(story => story.title.toLowerCase().includes(term))
      : allDocs;

    // phân trang thủ công
    const startIndex = (currentPage - 1) * pageSize;
    const docs = filtered.slice(startIndex, startIndex + pageSize);
    lastVisible = docs[docs.length - 1] || null;

    // cập nhật nút
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = startIndex + pageSize >= filtered.length;

    // render
    docs.forEach(d => renderStoryCard(d.id, d));
    pageInfo.textContent = `Trang ${currentPage}`;

    // --- Hòm thư ---
const mailModal = $("#mailModal");
const mailList = $("#mailList");
const mailBtn = $("#mailBtn");   // nút mở hòm thư ở header hay sidebar
const closeMail = $("#closeMail");

async function loadMails() {
  mailList.innerHTML = "<p>Đang tải...</p>";
  const snap = await getDocs(query(
    collection(db, "mails"),
    orderBy("createdAt", "desc")
  ));
  if (snap.empty) {
    mailList.innerHTML = "<p>(Chưa có thư nào)</p>";
    return;
  }
  mailList.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "mail-item";
    div.innerHTML = `
      <h4>${data.subject}</h4>
      <small>${new Date(data.createdAt).toLocaleString()}</small>
      <p>${data.body}</p>
      <hr>
    `;
    mailList.appendChild(div);
  });
}

mailBtn?.addEventListener("click", async () => {
  await loadMails();
  mailModal.hidden = false;
});

closeMail?.addEventListener("click", () => {
  mailModal.hidden = true;
});


  }
  function renderStoryCard(id, data) {
    const card = document.createElement("div");
    card.className = "story-card";
    const cover = data.coverUrl || "https://placehold.co/600x800?text=No+Cover";
    card.innerHTML = `
      <img src="${cover}" alt="cover"/>
      <div class="meta">
        <div class="badge">${new Date(data.createdAt || Date.now()).toLocaleDateString()}</div>
        <h3>${data.title}</h3>
        <p class="badge">${data.description || ""}</p>
        <button class="btn subtle" data-open="${id}">Đọc Ngay</button>
      </div>
    `;
    listEl.appendChild(card);
  }

  prevBtn?.addEventListener("click", async () => {
    if (currentPage <= 1) return;
    // Simplified: reload from beginning with page-1 * pageSize offset (client-side)
    currentPage--;
    lastVisible = null;
    await loadPage(true);
  });

  nextBtn?.addEventListener("click", async () => {
    if (nextBtn.disabled) return;
    currentPage++;
    await loadPage(false);
  });

  let typingTimer;
  const typingDelay = 1000; // ms

  searchInput.addEventListener("input", () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      loadPage(true);
    }, typingDelay);
  });


  listEl?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    const storyId = btn.dataset.open;
    openStory(storyId);
  });

  closeStory?.addEventListener("click", () => {
    drawer.hidden = true;
    listEl.style.display = "grid";
    homeBtn.hidden = true; // 👈 ẩn nút khi thoát đọc
  });

  async function openStory(storyId) {
    const storyRef = doc(db, "stories", storyId);
    const storySnap = await getDoc(storyRef);
    if (!storySnap.exists()) return toast("Không tìm thấy truyện");
    const data = storySnap.data();

    const drawer = $("#storyDetail");
    const list = $("#chaptersList");
    list.innerHTML = ""; // reset
    drawer.scrollTop = 0;

    // cập nhật thông tin truyện
    $("#detailTitle").textContent = data.title;
    $("#detailDesc").textContent = data.description || "";
    $("#detailCover").src = data.coverUrl || "https://placehold.co/600x800?text=No+Cover";

    // lấy danh sách chương
    const chSnap = await getDocs(query(
      collection(db, "stories", storyId, "chapters"),
      orderBy("createdAt", "asc")
    ));

    const chapters = [];
    chSnap.forEach(ch => chapters.push({ id: ch.id, ...ch.data() }));

    // render danh sách số chương
    const nav = document.createElement("div");
    nav.className = "chapter-nav";
    chapters.forEach((ch, i) => {
      const btn = document.createElement("button");
      btn.textContent = "Chương" + (i + 1);
      btn.className = "chapter-btn";
      btn.addEventListener("click", () => showChapter(i));
      nav.appendChild(btn);
    });
    list.appendChild(nav);

    // khung hiển thị nội dung chương
    const contentBox = document.createElement("div");
    contentBox.id = "chapterContentBox";
    list.appendChild(contentBox);

    // hàm hiển thị chương
    function showChapter(index) {
      const ch = chapters[index];
      const likedBy = ch.likedBy || [];
      const me = auth.currentUser?.uid;
      const liked = me ? likedBy.includes(me) : false;

      contentBox.innerHTML = `
      <h3>${ch.title || "Chương " + (index + 1)}</h3>
      <div class="content">${(ch.content || "").replace(/\n/g, "<br/>")}</div>
      <div class="like-row">
        <small>${new Date(ch.createdAt || Date.now()).toLocaleString()}</small>
        <button data-like="${storyId}|${ch.id}" ${liked ? "disabled" : ""}>
          ❤ Thích (<span class="likec">${likedBy.length || 0}</span>)
        </button>
      </div>
    `;

      // cập nhật highlight nút
      $$(".chapter-btn", nav).forEach((b, idx) => {
        b.classList.toggle("active", idx === index);
      });
    }

    // mặc định hiển thị chương 1
    if (chapters.length) showChapter(0);

    // ẩn danh sách card + hiện drawer
    $("#storiesList").style.display = "none";
    drawer.hidden = false;
    $("#homeBtn").hidden = false;
  }

  // Sự kiện bấm nút Trang chủ
  homeBtn?.addEventListener("click", () => {
    window.location.href = "index.html";
  });


  // Like handler
  $("#chaptersList")?.addEventListener("click", async (e) => {
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
    await setDoc(chRef, { likedBy: Array.from(likedBy) }, { merge: true });
    btn.disabled = true;
    const c = btn.querySelector(".likec");
    if (c) c.textContent = String(likedBy.size);
  });

  // Initial
  loadPage();
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
    const modal = document.getElementById("noAccessModal");
    if (modal) modal.hidden = false;

    // Tự động chuyển về trang chính sau 1 giây
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);

    return false;
  } else {
    guard.classList.add("hidden");
    const cs = document.getElementById("createStory");
    const mc = document.getElementById("manageChapters");
    const ms = document.getElementById("manageStories");
    const ec = document.getElementById("editChapterSection");

    if (ec) ec.hidden = true; // đảm bảo không bật sẵn
    if (cs) cs.hidden = false;
    if (mc) mc.hidden = false;
    if (ms) ms.hidden = false;

    await loadStoryOptions();
    await loadStoriesForAdmin();
    return true;
  }
}


// Khi trạng thái đăng nhập thay đổi
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (page === "admin") {
      const hasAdminAccess = await ensureAdmin(user);
      if (hasAdminAccess) {
        // Chỉ chạy khi user có quyền
        initAdmin();
        await loadStoriesForAdmin();
        await loadStoryOptions();
        await loadStoryOptionsEdit();
      }
      // 
    }
  } else {
    if (page === "admin") {
      window.location.href = "/login.html"; // chưa đăng nhập thì đi login
    }
  }
});





function initAdmin() {
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
// ===== Xử lý gửi thư từ Admin =====
const sendMailBtn = document.getElementById("sendMailBtn");
if (sendMailBtn) {
  sendMailBtn.addEventListener("click", async () => {
    const subject = document.getElementById("mailSubject").value.trim();
    const body = document.getElementById("mailBody").value.trim();

    // if (!subject || !body) {
    //   alert("⚠️ Vui lòng nhập đầy đủ tiêu đề và nội dung!");
    //   return;
    // }

    try {
      await addDoc(collection(db, "mails"), {
        subject,
        body,
        createdAt: Date.now(),
        read: false
      });

      document.getElementById("mailSubject").value = "";
      document.getElementById("mailBody").value = "";

      alert("✅ Thư đã được gửi!");
    } catch (err) {
      console.error("Lỗi gửi thư:", err);
      alert("❌ Gửi thư thất bại");
    }
  });
}


async function handleCreateStory() {
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

    // reset form
    $("#storyTitle").value = "";
    $("#storyDesc").value = "";
    $("#storyCoverUrl").value = "";

    // cập nhật danh sách select ngay
    const storySelect = $("#storySelect");
    if (storySelect) {
      const opt = document.createElement("option");
      opt.value = docRef.id;
      opt.textContent = title;
      storySelect.appendChild(opt);

      // chọn luôn truyện mới tạo
      storySelect.value = docRef.id;
    }

    // load lại danh sách chapter (rỗng lúc mới tạo)
    // await loadChapters(docRef.id);

  } catch (err) {
    toast("Lỗi tạo truyện: " + err.message);
  }
}

async function handleAddChapter() {
  const storyId = $("#storySelect").value;
  if (!storyId) return toast("Chọn truyện");
  const title = $("#chapterTitle").value.trim() || "Chương mới";
  const content = $("#chapterContent").value.trim();

  try {
    const docRef = await addDoc(collection(db, "stories", storyId, "chapters"), {
      title,
      content,
      createdAt: Date.now(),
      likedBy: []
    });
    toast("Đã thêm chương");

    // reset form
    $("#chapterTitle").value = "";
    $("#chapterContent").value = "";

    // cập nhật UI ngay, không reload
    const chapterList = $("#chapterList");
    if (chapterList) {
      const li = document.createElement("li");
      li.dataset.id = docRef.id;
      li.textContent = title;
      chapterList.appendChild(li);
    }

  } catch (err) {
    toast("Lỗi thêm chương: " + err.message);
  }

}


async function loadStoriesForAdmin() {
  const container = $("#storyList");
  if (!container) return;
  container.innerHTML = "";

  const snap = await getDocs(query(collection(db, "stories"), orderBy("createdAt", "desc")));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "story-item";
    div.innerHTML = `
      <strong>${data.title}</strong> 
      <button class="btn btn-edit" data-edit="${docSnap.id}">Sửa</button>
    `;
    container.appendChild(div);
  });
  document.querySelectorAll(".btn-edit").forEach(btn => {
  btn.addEventListener("click", e => {
    const storyId = e.target.dataset.edit;
    const editSection = document.getElementById("editChapterSection");
    if (editSection) {
      editSection.hidden = false;
    }
    loadStoryOptionsEdit();
    const select = document.getElementById("storySelectEdit");
    if (select) {
      select.value = storyId;
      select.dispatchEvent(new Event("change"));
    }
  });
});
}

// Gọi khi vào admin
// if (page === "admin") {
//   initAdmin();
//   loadStoriesForAdmin();
//   loadStoryOptions();
//   loadStoryOptionsEdit();
// }

let editingId = null; // để nhớ ID truyện đang sửa

// ==========================
// Quản lý chương
// ==========================

async function loadStoryOptionsEdit() {
  const select = document.getElementById("storySelectEdit");
  select.innerHTML = `<option value="">-- Chọn truyện --</option>`;
  const snap = await getDocs(collection(db, "stories"));
  snap.forEach(docSnap => {
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = docSnap.data().title;
    select.appendChild(opt);
  });
}

// Khi chọn truyện => load danh sách chương
document.getElementById("storySelectEdit").addEventListener("change", async (e) => {
  const storyId = e.target.value;
  const chapterSelect = document.getElementById("chapterSelect");
  chapterSelect.innerHTML = `<option value="">-- Chọn chương --</option>`;
  if (!storyId) return;

  const snap = await getDocs(query(collection(db, "stories", storyId, "chapters"), orderBy("createdAt")));
  snap.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch.id;
    opt.textContent = ch.data().title;
    chapterSelect.appendChild(opt);
  });
});

// Khi chọn chương => load dữ liệu vào form
document.getElementById("chapterSelect").addEventListener("change", async (e) => {
  const chapterId = e.target.value;
  const storyId = document.getElementById("storySelectEdit").value;
  if (!storyId || !chapterId) return;

  const snap = await getDoc(doc(db, "stories", storyId, "chapters", chapterId));
  if (!snap.exists()) return toast("Không tìm thấy chương");

  const data = snap.data();
  document.getElementById("editChapterTitle").value = data.title;
  document.getElementById("editChapterContent").value = data.content || "";
});

// Gắn event cho nút đóng modal
const modal = document.getElementById("updateSuccessModal");
const closeModalBtn = document.getElementById("closeModalBtn");

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    modal.close();
  });
}

// Trong đoạn saveChapterEditBtn:
document.getElementById("saveChapterEditBtn").addEventListener("click", async () => {
  const storyId = document.getElementById("storySelectEdit").value;
  const chapterId = document.getElementById("chapterSelect").value;

  if (!storyId || !chapterId) {
    toast("Chọn truyện và chương");
    return;
  }

  const newTitle = document.getElementById("editChapterTitle")?.value.trim();
  const newContent = document.getElementById("editChapterContent")?.value.trim();

  if (!newTitle || !newContent) {
    toast("Vui lòng nhập đầy đủ tiêu đề và nội dung");
    return;
  }

  try {
    await updateDoc(doc(db, "stories", storyId, "chapters", chapterId), {
      title: newTitle,
      content: newContent
    });



    // Show modal
    if (modal && typeof modal.showModal === "function") {
      modal.showModal();
    }

    document.getElementById("storySelectEdit").dispatchEvent(new Event("change"));

  } catch (err) {
    console.error("Lỗi cập nhật chương:", err);
    toast("❌ Lỗi khi cập nhật chương");
  }
});


// Nút Hủy
document.getElementById("cancelChapterEditBtn").addEventListener("click", () => {
  // Ẩn form chỉnh sửa
  document.getElementById("editChapterSection").hidden = false;

  // Reset các ô nhập
  document.getElementById("editChapterTitle").value = "";
  document.getElementById("editChapterContent").value = "";

  // Reset dropdown chương
  const chapterSelect = document.getElementById("chapterSelect");
  chapterSelect.innerHTML = '<option value="">-- Chọn chương --</option>';

  // Reset dropdown truyện
  const storySelectEdit = document.getElementById("storySelectEdit");
  storySelectEdit.value = "";
});


// Hàm xóa chương hoặc cả truyện
document.getElementById("deleteBtn").addEventListener("click", async () => {
  const storyId = document.getElementById("storySelectEdit").value;
  const chapterId = document.getElementById("chapterSelect").value;

  if (!storyId) return toast("Chọn truyện trước đã");

  try {
    if (chapterId) {
      // Xóa chương
      if (!(await confirmModal("Bạn có chắc muốn xóa chương này?"))) return;

      await deleteDoc(doc(db, "stories", storyId, "chapters", chapterId));
      showModal("Đã xóa chương");

      // Reload lại danh sách chương
      document.getElementById("storySelectEdit").dispatchEvent(new Event("change"));
    } else {
      // Xóa luôn cả truyện + các chương con
      // Xóa luôn cả truyện + các chương con
      if (!(await confirmModal("Bạn có chắc muốn xóa truyện này?"))) return;


      // Xóa tất cả chapters trước
      const chaptersSnap = await getDocs(collection(db, "stories", storyId, "chapters"));
      for (const chap of chaptersSnap.docs) {
        await deleteDoc(doc(db, "stories", storyId, "chapters", chap.id));
      }

      // Xoá truyện
      await deleteDoc(doc(db, "stories", storyId));
      showModal("Đã xóa truyện và toàn bộ chương");

      // ✅ Refresh cả 3 nơi: select thêm chương, select sửa chương, và danh sách truyện
      await Promise.all([
        loadStoryOptions(),      // #storySelect (Thêm chương)
        loadStoryOptionsEdit(),  // #storySelectEdit (Quản lý truyện)
        loadStoriesForAdmin()    // danh sách truyện ở khu quản lý
      ]);

      // Reset form sửa về mặc định & làm trống danh sách chương
      const storySelEdit = document.getElementById("storySelectEdit");
      storySelEdit.selectedIndex = 0;                 // về option "-- Chọn truyện --"
      storySelEdit.dispatchEvent(new Event("change"));// sẽ tự clear #chapterSelect
      document.getElementById("editChapterTitle").value = "";
      document.getElementById("editChapterContent").value = "";
    }
  } catch (err) {
    console.error("Lỗi khi xóa:", err);
    showModal("Xóa thất bại, thử lại sau");
  }
});

async function loadStoryOptions(selectId) {
  const sel = $("#storySelect");
  if (!sel) return;
  sel.innerHTML = "";
  const snap = await getDocs(query(collection(db, "stories"), orderBy("createdAt", "desc")));
  snap.forEach(d => {
    const o = document.createElement("option");
    o.value = d.id;
    o.textContent = d.data().title;
    sel.appendChild(o);
  });
  if (selectId) sel.value = selectId;
} 






