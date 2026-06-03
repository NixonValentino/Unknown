/**
 * dashboard.js — UnknownBooks
 * Terhubung penuh dengan Flask backend:
 *  - User data dibaca dari window.__USER__ (dikirim Flask lewat Jinja2)
 *  - Logout POST ke /auth/logout → redirect ke landing
 *  - Book card klik → navigasi ke /detail dengan query string
 */

/* ════════════════════════════════════════════
   INIT USER DARI SESSION FLASK
════════════════════════════════════════════ */

const USER = window.__USER__ || { name: '', email: '', initials: '?' };

// Isi avatar & nama di sidebar
document.getElementById('avatarEl').textContent   = USER.initials;
document.getElementById('avatarName').textContent  = USER.name;

// Isi dropdown header
const dropName  = document.getElementById('dropdownUserName');
const dropEmail = document.getElementById('dropdownUserEmail');
if (dropName)  dropName.textContent  = USER.name  || 'Profil Saya';
if (dropEmail) dropEmail.textContent = USER.email || '';


/* ════════════════════════════════════════════
   THEME
════════════════════════════════════════════ */

let currentTheme = localStorage.getItem('mb-theme') || 'light';
let sidebarExpanded = false;
let activeDropdown = null;

applyTheme(currentTheme, false);

function applyTheme(theme, animate = true) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mb-theme', theme);

    const label = document.getElementById('themeSwitchLabel');
    if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';

    document.getElementById('optLight')?.classList.toggle('active', theme === 'light');
    document.getElementById('optDark')?.classList.toggle('active', theme === 'dark');
}

function setTheme(theme) {
    applyTheme(theme);
    closeAll();
}

document.getElementById('themeSwitch').addEventListener('click', () => {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
});

document.getElementById('themeSwitch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    }
});


/* ════════════════════════════════════════════
   SIDEBAR TOGGLE
════════════════════════════════════════════ */

document.getElementById('sidebarToggle').addEventListener('click', () => {
    sidebarExpanded = !sidebarExpanded;
    document.getElementById('sidebar').classList.toggle('expanded', sidebarExpanded);
});


/* ════════════════════════════════════════════
   NAV ITEMS — highlight aktif
════════════════════════════════════════════ */

document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        this.classList.add('active');
        document.querySelector('.topbar__title').textContent = this.dataset.page;
        closeAll();
    });
});


/* ════════════════════════════════════════════
   DROPDOWN UTILITY
════════════════════════════════════════════ */

function positionDropdown(dropdown, trigger) {
    const tr  = trigger.getBoundingClientRect();
    const sbW = document.getElementById('sidebar').getBoundingClientRect().width;
    dropdown.style.left = (sbW + 8) + 'px';
    dropdown.style.top  = Math.max(8, tr.top - 4) + 'px';
}

function openDropdown(dropdown, trigger) {
    if (activeDropdown && activeDropdown !== dropdown) {
        activeDropdown.classList.remove('open');
    }
    positionDropdown(dropdown, trigger);
    dropdown.classList.toggle('open');
    activeDropdown = dropdown.classList.contains('open') ? dropdown : null;
    document.getElementById('overlay').classList.toggle('active', !!activeDropdown);
}

function closeAll() {
    document.querySelectorAll('.dropdown').forEach((d) => d.classList.remove('open'));
    document.getElementById('overlay').classList.remove('active');
    activeDropdown = null;
}

document.getElementById('profileBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    openDropdown(document.getElementById('profileDropdown'), this);
});

document.getElementById('settingsBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    openDropdown(document.getElementById('settingsDropdown'), this);
});

document.getElementById('overlay').addEventListener('click', closeAll);


/* ════════════════════════════════════════════
   LOGOUT — POST ke /auth/logout
════════════════════════════════════════════ */

document.getElementById('logoutBtn').addEventListener('click', async () => {
    closeAll();

    // Nonaktifkan tombol agar tidak diklik ganda
    const btn = document.getElementById('logoutBtn');
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';

    try {
        const res  = await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        });
        const data = await res.json();

        if (data.redirect) {
            window.location.href = data.redirect;
        } else {
            window.location.href = '/';
        }
    } catch (err) {
        console.error('Logout gagal:', err);
        // Fallback: redirect ke landing meski fetch gagal
        window.location.href = '/';
    }
});


/* ════════════════════════════════════════════
   SEARCH — fokus dari sidebar
════════════════════════════════════════════ */

function focusSearch(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('searchInput');
    if (input) {
        input.focus();
        input.select();
    }
    closeAll();
}


/* ════════════════════════════════════════════
   BOOK CARDS — navigasi ke /detail
   Data diambil dari data-* attribute (lebih bersih)
════════════════════════════════════════════ */

document.querySelectorAll('.books-card').forEach(function (card) {
    card.style.cursor = 'pointer';

    card.addEventListener('click', function () {
        // Ambil semua data dari data-* attribute pada card
        const cover  = card.dataset.cover  || card.querySelector('.book-cover')?.src  || '';
        const title  = card.dataset.title  || card.querySelector('.book-title')?.textContent?.trim() || '';
        const author = card.dataset.author || card.querySelector('.book-author span')?.textContent?.trim() || '';
        const stars  = card.dataset.stars  || card.querySelector('.stars')?.textContent || '★★★★★';
        const rating = card.dataset.rating || card.querySelector('.rating-text')?.textContent || '';
        const badge  = card.dataset.badge  || '';
        const lang   = card.dataset.lang   || '';
        const desc   = card.dataset.desc   || 'Deskripsi belum tersedia.';

        const params = new URLSearchParams({ cover, title, author, stars, rating, badge, lang, desc });
        window.location.href = '/detail?' + params.toString();
    });
});
