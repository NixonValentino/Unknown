// Dashboard
let currentTheme = localStorage.getItem("mb-theme") || "light";
let sidebarExpanded = false;
let activeDropdown = null;

/* ── Init ───────────────────────────────────── */
applyTheme(currentTheme, false);

/* ── Theme ──────────────────────────────────── */
function applyTheme(theme, animate = true) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("mb-theme", theme);

  const label = document.getElementById("themeSwitchLabel");
  label.textContent = theme === "dark" ? "Dark" : "Light";

  document
    .getElementById("optLight")
    .classList.toggle("active", theme === "light");
  document
    .getElementById("optDark")
    .classList.toggle("active", theme === "dark");
}

function setTheme(theme) {
  applyTheme(theme);
  closeAll();
}

document.getElementById("themeSwitch").addEventListener("click", () => {
  applyTheme(currentTheme === "light" ? "dark" : "light");
});
document.getElementById("themeSwitch").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    applyTheme(currentTheme === "light" ? "dark" : "light");
  }
});

/* ── Sidebar toggle ─────────────────────────── */
document.getElementById("sidebarToggle").addEventListener("click", () => {
  sidebarExpanded = !sidebarExpanded;
  document
    .getElementById("sidebar")
    .classList.toggle("expanded", sidebarExpanded);
});

/* ── Nav items ──────────────────────────────── */
document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
  item.addEventListener("click", function () {
    document
      .querySelectorAll(".nav-item")
      .forEach((n) => n.classList.remove("active"));
    this.classList.add("active");
    const page = this.dataset.page;
    document.querySelector(".topbar__title").textContent = page;
    closeAll();
  });
});

/* ── Dropdown positioning helper ────────────── */
function positionDropdown(dropdown, trigger) {
  const tr = trigger.getBoundingClientRect();
  const sidebar = document.getElementById("sidebar");
  const sbW = sidebar.getBoundingClientRect().width;
  dropdown.style.left = sbW + 8 + "px";
  dropdown.style.top = Math.max(8, tr.top - 4) + "px";
}

function openDropdown(dropdown, trigger) {
  if (activeDropdown && activeDropdown !== dropdown) {
    activeDropdown.classList.remove("open");
  }
  positionDropdown(dropdown, trigger);
  dropdown.classList.toggle("open");
  activeDropdown = dropdown.classList.contains("open") ? dropdown : null;
  document
    .getElementById("overlay")
    .classList.toggle("active", !!activeDropdown);
}

function closeAll() {
  document
    .querySelectorAll(".dropdown")
    .forEach((d) => d.classList.remove("open"));
  document.getElementById("overlay").classList.remove("active");
  activeDropdown = null;
}

/* ── Profile btn ────────────────────────────── */
document.getElementById("profileBtn").addEventListener("click", function (e) {
  e.stopPropagation();
  openDropdown(document.getElementById("profileDropdown"), this);
});

/* ── Settings btn ───────────────────────────── */
document.getElementById("settingsBtn").addEventListener("click", function (e) {
  e.stopPropagation();
  openDropdown(document.getElementById("settingsDropdown"), this);
});



/* ── Overlay click → close ──────────────────── */
document.getElementById("overlay").addEventListener("click", closeAll);

/* ── Navigation helper ──────────────────────── */
function goTo(page) {
  document.querySelector(".topbar__title").textContent = page;
  closeAll();
  // Tambahkan logic routing sesungguhnya di sini
  console.log("Navigate to:", page);
}

/* ── Logout helper ──────────────────────────── */
function logout() {
  closeAll();
  alert("Anda telah keluar. (Sambungkan ke logika logout kamu di sini.)");
}

/* ── Profile name (isi dari user data kamu) ─── */
function setUser(name, initials) {
  document.getElementById("avatarEl").textContent =
    initials || name.charAt(0).toUpperCase();
  document.getElementById("avatarName").textContent = name;
}
// Contoh: setUser('Budi Santoso', 'BS');

/* ── Cart badge helper ──────────────────────── */
function setCartCount(n) {
  document.getElementById("cartBadge").textContent = n;
  document.getElementById("cartBadge").style.display = n > 0 ? "flex" : "none";
}
setCartCount(0);


document.querySelectorAll('.books-card').forEach(function (card) {
  card.style.cursor = 'pointer';
  card.addEventListener('click', function () {
    var cover  = card.querySelector('.book-cover')?.src || '';
    var title  = card.querySelector('.book-title')?.textContent || '';
    var author = card.querySelector('.book-author span')?.textContent || '';
    var stars  = card.querySelector('.stars')?.textContent || '★★★★★';
    var rating = card.querySelector('.rating-text')?.textContent || '';
    var lang   = card.querySelector('.book-lang')?.textContent?.replace('Tersedia: ', '') || '';

    var badgeEl = card.querySelector('.book-badge');
    var badge = '';
    if (badgeEl) {
      badge = badgeEl.classList.contains('badge-free') ? 'free' : 'premium';
    }

    var params = new URLSearchParams({
      cover:  cover,
      title:  title,
      author: author,
      stars:  stars,
      rating: rating,
      badge:  badge,
      lang:   lang,
      desc:   'Deskripsi lengkap buku ini belum tersedia. Silakan tambahkan dari data buku.'
    });

    window.location.href = '/static/detail.html?' + params.toString();
  });
});
