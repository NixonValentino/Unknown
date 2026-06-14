/* ════════════════════════════════════════════
   ADMIN PANEL — admin.js
   UnknownBooks Admin Dashboard Logic
════════════════════════════════════════════ */

const ADMIN   = window.__ADMIN__  || {};
const STATS0  = window.__STATS__  || {};

// ── Theme ──
let adminTheme = localStorage.getItem('mb-theme') || 'dark';
applyAdminTheme(adminTheme, false);

function applyAdminTheme(theme, animate) {
    adminTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mb-theme', theme);
}

document.getElementById('adminThemeBtn').addEventListener('click', () => {
    applyAdminTheme(adminTheme === 'dark' ? 'light' : 'dark');
});

// ── Init UI ──
document.getElementById('adminAvatarEl').textContent = ADMIN.initials || 'AD';
document.getElementById('adminNameEl').textContent   = ADMIN.name || 'Admin';
const welcomeNameEl = document.getElementById('adminWelcomeName');
if (welcomeNameEl) welcomeNameEl.textContent = ADMIN.name || 'Admin';

// ── Clock ──
function updateClock() {
    const now = new Date();
    const t = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clockEl = document.getElementById('adminClock');
    if (clockEl) clockEl.textContent = t;
}
updateClock();
setInterval(updateClock, 1000);

// ── Stat Cards ──
function animateCount(el, target) {
    if (!el) return;
    let current = 0;
    const step  = Math.max(1, Math.ceil(target / 30));
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
    }, 30);
}

animateCount(document.getElementById('statUsers'),   STATS0.total_users   || 0);
animateCount(document.getElementById('statAuthors'), STATS0.total_authors || 0);
animateCount(document.getElementById('statBooks'),   STATS0.total_books   || 0);
animateCount(document.getElementById('statBlocked'), STATS0.total_blocked || 0);

// ── Mobile sidebar toggle ──
const menuBtn = document.getElementById('adminMenuBtn');
const sidebar = document.getElementById('adminSidebar');
if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// ═══════════════════════════════════════════
//  PANEL SWITCHING
// ═══════════════════════════════════════════

function showAdminPanel(name) {
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));

    const titleEl = document.getElementById('adminPageTitle');

    if (name === 'dashboard') {
        document.getElementById('panelDashboard').style.display = '';
        document.getElementById('navDashboard').classList.add('active');
        if (titleEl) titleEl.textContent = 'Dashboard';
    } else if (name === 'users') {
        document.getElementById('panelUsers').style.display = '';
        document.getElementById('navUsers').classList.add('active');
        if (titleEl) titleEl.textContent = 'Kelola Pengguna';
        loadUsers();
    }

    if (sidebar) sidebar.classList.remove('open');
}

// ═══════════════════════════════════════════
//  LOGOUT
// ═══════════════════════════════════════════

document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
    const btn = document.getElementById('adminLogoutBtn');
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    try {
        const res  = await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        });
        const data = await res.json();
        window.location.href = data.redirect || '/';
    } catch {
        window.location.href = '/';
    }
});

// ═══════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════

let toastTimer = null;

function showToast(message, type = 'success') {
    const toast = document.getElementById('adminToast');
    if (!toast) return;
    clearTimeout(toastTimer);

    const icon = type === 'success'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

    toast.innerHTML = icon + message;
    toast.className = `admin-toast admin-toast--${type}`;
    toast.style.display = 'flex';

    toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.opacity = '';
            toast.style.transition = '';
        }, 300);
    }, 3500);
}

// ═══════════════════════════════════════════
//  LOAD USERS
// ═══════════════════════════════════════════

let allUsers      = [];
let activeFilter  = 'all';
let searchQuery   = '';

async function loadUsers() {
    const loadingEl   = document.getElementById('usersLoading');
    const tableWrapEl = document.getElementById('usersTableWrap');

    if (loadingEl)   loadingEl.style.display = 'flex';
    if (tableWrapEl) tableWrapEl.style.display = 'none';

    try {
        const res  = await fetch('/api/admin/users', { credentials: 'same-origin' });
        const data = await res.json();

        if (!data.success) {
            showToast('Gagal memuat data pengguna.', 'error');
            if (loadingEl) loadingEl.style.display = 'none';
            return;
        }

        allUsers = data.users || [];
        renderUsers();

    } catch (err) {
        console.error(err);
        showToast('Terjadi kesalahan saat memuat data.', 'error');
    } finally {
        if (loadingEl)   loadingEl.style.display = 'none';
        if (tableWrapEl) tableWrapEl.style.display = '';
    }
}

function renderUsers() {
    const tbody    = document.getElementById('usersTableBody');
    const emptyEl  = document.getElementById('usersEmptyState');
    if (!tbody) return;

    let filtered = allUsers;

    // Filter by role / blocked
    if (activeFilter === 'user')    filtered = filtered.filter(u => u.role === 'user');
    if (activeFilter === 'author')  filtered = filtered.filter(u => u.role === 'author');
    if (activeFilter === 'blocked') filtered = filtered.filter(u => u.is_blocked);

    // Search filter
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(u =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
    }

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    const avatarColors = ['#6c63ff', '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6'];

    filtered.forEach((u, idx) => {
        const initials  = u.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const avatarBg  = avatarColors[u.id % avatarColors.length];
        const roleBadge = u.role === 'author'
            ? '<span class="role-badge role-badge--author">✍️ Penulis</span>'
            : '<span class="role-badge role-badge--user">📖 Pembaca</span>';

        const statusBadge = u.is_blocked
            ? '<span class="status-badge status-badge--blocked">Diblokir</span>'
            : '<span class="status-badge status-badge--active">Aktif</span>';

        const actionBtn = u.is_blocked
            ? `<button class="action-btn action-btn--unblock" onclick="toggleBlock(${u.id}, false, this)">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                   Buka Blokir
               </button>`
            : `<button class="action-btn action-btn--block" onclick="toggleBlock(${u.id}, true, this)">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                   Blokir
               </button>`;

        const tr = document.createElement('tr');
        tr.id = `user-row-${u.id}`;
        tr.innerHTML = `
            <td style="color:var(--admin-text-muted); font-size:12px;">${idx + 1}</td>
            <td>
                <div class="user-cell">
                    <div class="user-cell__avatar" style="background:${avatarBg};">${initials}</div>
                    <span class="user-cell__name">${escapeHtml(u.name)}</span>
                </div>
            </td>
            <td style="color:var(--admin-text-muted); font-size:13px;">${escapeHtml(u.email)}</td>
            <td>${roleBadge}</td>
            <td id="status-cell-${u.id}">${statusBadge}</td>
            <td id="action-cell-${u.id}">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ── Filter ──
function filterUsers(filter) {
    activeFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.filter === filter);
    });
    renderUsers();
}

// ── Search ──
const userSearchInput = document.getElementById('userSearchInput');
if (userSearchInput) {
    let debounce = null;
    userSearchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            searchQuery = userSearchInput.value;
            renderUsers();
        }, 200);
    });
}

// ═══════════════════════════════════════════
//  BLOCK / UNBLOCK USER
// ═══════════════════════════════════════════

async function toggleBlock(userId, shouldBlock, btn) {
    const originalHtml   = btn.innerHTML;
    btn.disabled         = true;
    btn.style.opacity    = '0.6';
    btn.innerHTML        = '…';

    const endpoint = shouldBlock
        ? `/api/admin/block/${userId}`
        : `/api/admin/unblock/${userId}`;

    try {
        const res  = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin'
        });
        const data = await res.json();

        if (!data.success) {
            showToast(data.message || 'Gagal memproses permintaan.', 'error');
            btn.innerHTML      = originalHtml;
            btn.disabled       = false;
            btn.style.opacity  = '';
            return;
        }

        showToast(data.message, 'success');

        // Update user in allUsers list
        const userIdx = allUsers.findIndex(u => u.id === userId);
        if (userIdx !== -1) {
            allUsers[userIdx].is_blocked = shouldBlock;
        }

        // Update status cell & action cell in-place
        const statusCell = document.getElementById(`status-cell-${userId}`);
        const actionCell = document.getElementById(`action-cell-${userId}`);

        if (statusCell) {
            statusCell.innerHTML = shouldBlock
                ? '<span class="status-badge status-badge--blocked">Diblokir</span>'
                : '<span class="status-badge status-badge--active">Aktif</span>';
        }

        if (actionCell) {
            actionCell.innerHTML = shouldBlock
                ? `<button class="action-btn action-btn--unblock" onclick="toggleBlock(${userId}, false, this)">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                       Buka Blokir
                   </button>`
                : `<button class="action-btn action-btn--block" onclick="toggleBlock(${userId}, true, this)">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                       Blokir
                   </button>`;
        }

        // Update stat card
        updateBlockedStat();

    } catch (err) {
        console.error(err);
        showToast('Terjadi kesalahan jaringan.', 'error');
        btn.innerHTML     = originalHtml;
        btn.disabled      = false;
        btn.style.opacity = '';
    }
}

function updateBlockedStat() {
    const total = allUsers.filter(u => u.is_blocked).length;
    const el = document.getElementById('statBlocked');
    if (el) el.textContent = total;
}

// ─── Helper ───
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
