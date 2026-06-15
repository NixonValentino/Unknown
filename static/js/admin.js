/* ════════════════════════════════════════════
   ADMIN PANEL — admin.js
   UnknownBooks Admin Dashboard Logic
════════════════════════════════════════════ */

const ADMIN = window.__ADMIN__ || {};
const STATS0 = window.__STATS__ || {};

/* ── Theme ── */
let adminTheme = localStorage.getItem("mb-theme") || "dark";
applyAdminTheme(adminTheme);

function applyAdminTheme(theme) {
  adminTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("mb-theme", theme);
}

document.getElementById("adminThemeBtn").addEventListener("click", () => {
  applyAdminTheme(adminTheme === "dark" ? "light" : "dark");
});

/* ── Init UI ── */
document.getElementById("adminAvatarEl").textContent = ADMIN.initials || "AD";
document.getElementById("adminNameEl").textContent = ADMIN.name || "Admin";
const welcomeNameEl = document.getElementById("adminWelcomeName");
if (welcomeNameEl) welcomeNameEl.textContent = ADMIN.name || "Admin";

/* ── Clock ── */
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const el = document.getElementById("adminClock");
  if (el) el.textContent = t;
}
updateClock();
setInterval(updateClock, 1000);

/* ── Stat Cards ── */
function animateCount(el, target) {
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

animateCount(document.getElementById("statUsers"), STATS0.total_users || 0);
animateCount(document.getElementById("statAuthors"), STATS0.total_authors || 0);
animateCount(document.getElementById("statBooks"), STATS0.total_books || 0);
animateCount(document.getElementById("statBlocked"), STATS0.total_blocked || 0);

/* ── Mobile sidebar toggle ── */
const menuBtn = document.getElementById("adminMenuBtn");
const sidebar = document.getElementById("adminSidebar");
if (menuBtn && sidebar) {
  menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  });
}

/* ═══════════════════════════════════════════
   PANEL SWITCHING
═══════════════════════════════════════════ */

const PANELS = {
  dashboard: {
    panelId: "panelDashboard",
    navId: "navDashboard",
    title: "Dashboard",
  },
  users: {
    panelId: "panelUsers",
    navId: "navUsers",
    title: "Semua Pengguna",
    loader: () => loadUsers(),
  },
  readers: {
    panelId: "panelReaders",
    navId: "navReaders",
    title: "Pembaca",
    loader: () => loadReaders(),
  },
  authors: {
    panelId: "panelAuthors",
    navId: "navAuthors",
    title: "Penulis",
    loader: () => loadAuthors(),
  },
};

function showAdminPanel(name) {
  document
    .querySelectorAll(".admin-panel")
    .forEach((p) => (p.style.display = "none"));
  document
    .querySelectorAll(".admin-nav-item")
    .forEach((n) => n.classList.remove("active"));

  const cfg = PANELS[name];
  if (!cfg) return;

  document.getElementById(cfg.panelId).style.display = "";
  document.getElementById(cfg.navId).classList.add("active");

  const titleEl = document.getElementById("adminPageTitle");
  if (titleEl) titleEl.textContent = cfg.title;

  if (cfg.loader) cfg.loader();
  if (sidebar) sidebar.classList.remove("open");
}

/* ═══════════════════════════════════════════
   LOGOUT
═══════════════════════════════════════════ */

document
  .getElementById("adminLogoutBtn")
  .addEventListener("click", async () => {
    const btn = document.getElementById("adminLogoutBtn");
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
    try {
      const res = await fetch("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      const data = await res.json();
      window.location.href = data.redirect || "/";
    } catch {
      window.location.href = "/";
    }
  });

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */

let toastTimer = null;

function showToast(message, type = "success") {
  const toast = document.getElementById("adminToast");
  if (!toast) return;
  clearTimeout(toastTimer);

  const icon =
    type === "success"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  toast.innerHTML = icon + message;
  toast.className = `admin-toast admin-toast--${type}`;
  toast.style.display = "flex";
  toast.style.opacity = "";
  toast.style.transition = "";

  toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => {
      toast.style.display = "none";
      toast.style.opacity = "";
      toast.style.transition = "";
    }, 300);
  }, 3500);
}

/* ═══════════════════════════════════════════
   SHARED USER DATA
═══════════════════════════════════════════ */

let allUsers = [];
let dataLoaded = false;

async function fetchAllUsers() {
  if (dataLoaded) return;
  const res = await fetch("/api/admin/users", { credentials: "same-origin" });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Gagal memuat data.");
  allUsers = data.users || [];
  dataLoaded = true;
}

function invalidateCache() {
  dataLoaded = false;
}

const AVATAR_COLORS = [
  "#6c63ff",
  "#3b82f6",
  "#a855f7",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#c9a96e",
];

function getAvatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function roleBadge(role) {
  return role === "author"
    ? '<span class="role-badge role-badge--author">✍️ Penulis</span>'
    : '<span class="role-badge role-badge--user">📖 Pembaca</span>';
}

function statusBadge(isBlocked) {
  return isBlocked
    ? '<span class="status-badge status-badge--blocked">Diblokir</span>'
    : '<span class="status-badge status-badge--active">Aktif</span>';
}

function blockActionBtn(userId, isBlocked) {
  return isBlocked
    ? `<button class="action-btn action-btn--unblock" onclick="toggleBlock(${userId}, false, this)">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
               Buka Blokir
           </button>`
    : `<button class="action-btn action-btn--block" onclick="toggleBlock(${userId}, true, this)">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
               Blokir
           </button>`;
}

function buildRow(u, idx, showPremium = false) {
  const initials = getInitials(u.name);
  const avatarBg = getAvatarColor(u.id);

  const premiumCell = showPremium
    ? `<td>${
        u.is_premium
          ? '<span class="status-badge status-badge--active">Premium</span>'
          : '<span style="color:var(--text-dim);font-size:12px;">Gratis</span>'
      }</td>`
    : `<td>${roleBadge(u.role)}</td>`;

  const tr = document.createElement("tr");
  tr.id = `user-row-${u.id}`;
  tr.innerHTML = `
        <td style="color:var(--text-muted); font-size:12px;">${idx + 1}</td>
        <td>
            <div class="user-cell">
                <div class="user-cell__avatar" style="background:${avatarBg};">${escapeHtml(initials)}</div>
                <span class="user-cell__name">${escapeHtml(u.name)}</span>
            </div>
        </td>
        <td style="color:var(--text-muted); font-size:13px;">${escapeHtml(u.email)}</td>
        ${premiumCell}
        <td id="status-cell-${u.id}">${statusBadge(u.is_blocked)}</td>
        <td id="action-cell-${u.id}">${blockActionBtn(u.id, u.is_blocked)}</td>
    `;
  return tr;
}

/* ═══════════════════════════════════════════
   PANEL: SEMUA PENGGUNA
═══════════════════════════════════════════ */

let activeFilter = "all";
let searchQuery = "";

async function loadUsers() {
  const loadingEl = document.getElementById("usersLoading");
  const tableWrapEl = document.getElementById("usersTableWrap");

  if (loadingEl) loadingEl.style.display = "flex";
  if (tableWrapEl) tableWrapEl.style.display = "none";

  try {
    await fetchAllUsers();
    renderUsersTable();
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat data pengguna.", "error");
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
    if (tableWrapEl) tableWrapEl.style.display = "";
  }
}

function renderUsersTable() {
  const tbody = document.getElementById("usersTableBody");
  const emptyEl = document.getElementById("usersEmptyState");
  if (!tbody) return;

  let filtered = [...allUsers];
  if (activeFilter === "user")
    filtered = filtered.filter((u) => u.role === "user");
  if (activeFilter === "author")
    filtered = filtered.filter((u) => u.role === "author");
  if (activeFilter === "blocked")
    filtered = filtered.filter((u) => u.is_blocked);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }

  tbody.innerHTML = "";
  if (filtered.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";
  filtered.forEach((u, idx) => tbody.appendChild(buildRow(u, idx)));
}

function filterUsers(filter) {
  activeFilter = filter;
  document.querySelectorAll(".filter-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.filter === filter);
  });
  renderUsersTable();
}

const userSearchInput = document.getElementById("userSearchInput");
if (userSearchInput) {
  let debounceFn = null;
  userSearchInput.addEventListener("input", () => {
    clearTimeout(debounceFn);
    debounceFn = setTimeout(() => {
      searchQuery = userSearchInput.value;
      renderUsersTable();
    }, 200);
  });
}

/* ═══════════════════════════════════════════
   PANEL: PEMBACA
═══════════════════════════════════════════ */

let readerSearchQuery = "";

async function loadReaders() {
  const loadingEl = document.getElementById("readersLoading");
  const tableWrapEl = document.getElementById("readersTableWrap");

  if (loadingEl) loadingEl.style.display = "flex";
  if (tableWrapEl) tableWrapEl.style.display = "none";

  try {
    await fetchAllUsers();
    renderReadersTable();
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat data pembaca.", "error");
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
    if (tableWrapEl) tableWrapEl.style.display = "";
  }
}

function renderReadersTable() {
  const tbody = document.getElementById("readersTableBody");
  const emptyEl = document.getElementById("readersEmptyState");
  if (!tbody) return;

  let filtered = allUsers.filter((u) => u.role === "user");
  if (readerSearchQuery) {
    const q = readerSearchQuery.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }

  tbody.innerHTML = "";
  if (filtered.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";
  filtered.forEach((u, idx) => tbody.appendChild(buildRow(u, idx, true)));
}

const readerSearchInput = document.getElementById("readerSearchInput");
if (readerSearchInput) {
  let debounceFn = null;
  readerSearchInput.addEventListener("input", () => {
    clearTimeout(debounceFn);
    debounceFn = setTimeout(() => {
      readerSearchQuery = readerSearchInput.value;
      renderReadersTable();
    }, 200);
  });
}

/* ═══════════════════════════════════════════
   PANEL: PENULIS
═══════════════════════════════════════════ */

let authorSearchQuery = "";

async function loadAuthors() {
  const loadingEl = document.getElementById("authorsLoading");
  const tableWrapEl = document.getElementById("authorsTableWrap");

  if (loadingEl) loadingEl.style.display = "flex";
  if (tableWrapEl) tableWrapEl.style.display = "none";

  try {
    await fetchAllUsers();
    renderAuthorsTable();
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat data penulis.", "error");
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
    if (tableWrapEl) tableWrapEl.style.display = "";
  }
}

function renderAuthorsTable() {
  const tbody = document.getElementById("authorsTableBody");
  const emptyEl = document.getElementById("authorsEmptyState");
  if (!tbody) return;

  let filtered = allUsers.filter((u) => u.role === "author");
  if (authorSearchQuery) {
    const q = authorSearchQuery.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }

  tbody.innerHTML = "";
  if (filtered.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";
  filtered.forEach((u, idx) => tbody.appendChild(buildRow(u, idx)));
}

const authorSearchInput = document.getElementById("authorSearchInput");
if (authorSearchInput) {
  let debounceFn = null;
  authorSearchInput.addEventListener("input", () => {
    clearTimeout(debounceFn);
    debounceFn = setTimeout(() => {
      authorSearchQuery = authorSearchInput.value;
      renderAuthorsTable();
    }, 200);
  });
}

/* ═══════════════════════════════════════════
   BLOCK / UNBLOCK USER
═══════════════════════════════════════════ */

async function toggleBlock(userId, shouldBlock, btn) {
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.style.opacity = "0.5";
  btn.innerHTML = "…";

  const endpoint = shouldBlock
    ? `/api/admin/block/${userId}`
    : `/api/admin/unblock/${userId}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || "Gagal memproses permintaan.", "error");
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      btn.style.opacity = "";
      return;
    }

    showToast(data.message, "success");

    // Update in-memory cache
    const userIdx = allUsers.findIndex((u) => u.id === userId);
    if (userIdx !== -1) allUsers[userIdx].is_blocked = shouldBlock;

    // Update all status/action cells with this user's ID on the page
    document.querySelectorAll(`[id="status-cell-${userId}"]`).forEach((el) => {
      el.innerHTML = statusBadge(shouldBlock);
    });
    document.querySelectorAll(`[id="action-cell-${userId}"]`).forEach((el) => {
      el.innerHTML = blockActionBtn(userId, shouldBlock);
    });

    updateBlockedStat();
  } catch (err) {
    console.error(err);
    showToast("Terjadi kesalahan jaringan.", "error");
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    btn.style.opacity = "";
  }
}

function updateBlockedStat() {
  const total = allUsers.filter((u) => u.is_blocked).length;
  const el = document.getElementById("statBlocked");
  if (el) el.textContent = total;
}

/* ═══════════════════════════════════════════
   MODAL: BUAT AKUN PENULIS
═══════════════════════════════════════════ */

function openCreateAuthorModal() {
  document.getElementById("authorName").value = "";
  document.getElementById("authorEmail").value = "";
  document.getElementById("authorPassword").value = "";
  hideModalError();
  document.getElementById("createAuthorModal").style.display = "flex";
  setTimeout(() => document.getElementById("authorName").focus(), 100);
}

function closeCreateAuthorModal() {
  document.getElementById("createAuthorModal").style.display = "none";
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById("createAuthorModal")) {
    closeCreateAuthorModal();
  }
}

function showModalError(msg) {
  const el = document.getElementById("modalError");
  el.textContent = msg;
  el.style.display = "block";
}

function hideModalError() {
  const el = document.getElementById("modalError");
  el.style.display = "none";
  el.textContent = "";
}

async function submitCreateAuthor() {
  hideModalError();

  const name = document.getElementById("authorName").value.trim();
  const email = document.getElementById("authorEmail").value.trim();
  const password = document.getElementById("authorPassword").value;

  if (!name) return showModalError("Nama lengkap wajib diisi.");
  if (!email) return showModalError("Email wajib diisi.");
  if (!password) return showModalError("Kata sandi wajib diisi.");
  if (password.length < 6)
    return showModalError("Kata sandi minimal 6 karakter.");

  const btn = document.getElementById("btnCreateAuthor");
  btn.disabled = true;
  btn.textContent = "Membuat akun…";

  try {
    const res = await fetch("/api/admin/create-author", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!data.success) {
      showModalError(data.message || "Gagal membuat akun penulis.");
      return;
    }

    closeCreateAuthorModal();
    showToast(`Akun penulis "${name}" berhasil dibuat!`, "success");

    // Invalidate cache and refresh whichever panels are active
    invalidateCache();

    // Refresh stat
    const statEl = document.getElementById("statAuthors");
    if (statEl) statEl.textContent = parseInt(statEl.textContent || "0") + 1;

    // If panels are loaded, reload them
    if (document.getElementById("panelUsers").style.display !== "none")
      loadUsers();
    if (document.getElementById("panelAuthors").style.display !== "none")
      loadAuthors();
  } catch (err) {
    console.error(err);
    showModalError("Terjadi kesalahan jaringan. Coba lagi.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Buat Akun Penulis";
  }
}

/* ── Esc closes modal ── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCreateAuthorModal();
});

/* ─── Helper ─── */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
