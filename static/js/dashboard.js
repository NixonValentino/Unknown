const USER = window.__USER__ || { name: '', email: '', initials: '?' };
 
document.getElementById('avatarEl').textContent  = USER.initials;
document.getElementById('avatarName').textContent = USER.name;
 
const dropName  = document.getElementById('dropdownUserName');
const dropEmail = document.getElementById('dropdownUserEmail');
if (dropName)  dropName.textContent  = USER.name  || 'Profil Saya';
if (dropEmail) dropEmail.textContent = USER.email || '';
 
 
/* ════════════════════════════════════════════
   THEME
════════════════════════════════════════════ */
 
let currentTheme    = localStorage.getItem('mb-theme') || 'light';
let sidebarExpanded = false;
let activeDropdown  = null;
 
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
   LOGOUT
════════════════════════════════════════════ */
 
document.getElementById('logoutBtn').addEventListener('click', async () => {
    closeAll();
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
        window.location.href = data.redirect || '/';
    } catch {
        window.location.href = '/';
    }
});
 
 
/* ════════════════════════════════════════════
   SEARCH — real-time filter + highlight
════════════════════════════════════════════ */
 
(function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
 
    // ── Inject CSS untuk search (clear btn, highlight, empty state) ──
    const style = document.createElement('style');
    style.textContent = `
        /* Wrapper search agar clear btn bisa di-absolute */
        .topbar__search { position: relative; }
 
        .search-clear-btn {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            color: var(--text-muted);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s, color 0.15s;
            border-radius: 50%;
        }
        .search-clear-btn.visible {
            opacity: 1;
            pointer-events: auto;
        }
        .search-clear-btn:hover { color: var(--text); background: var(--surface2); }
        .search-clear-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; }
 
        /* Padding kanan input saat ada clear btn */
        .topbar__search input { padding-right: 32px; }
 
        /* Highlight teks yang cocok */
        .search-hl {
            background: rgba(192, 57, 43, 0.15);
            color: var(--accent);
            border-radius: 2px;
            padding: 0 1px;
            font-weight: 700;
        }
        [data-theme="dark"] .search-hl {
            background: rgba(232, 64, 64, 0.2);
            color: #ff6666;
        }
 
        /* Card disembunyikan saat tidak cocok */
        .books-card.search-hidden {
            display: none !important;
        }
 
        /* Animasi kartu yang muncul */
        .books-card.search-visible {
            animation: cardFadeIn 0.2s ease forwards;
        }
        @keyframes cardFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
 
        /* Empty state */
        #searchEmptyState {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px 24px;
            text-align: center;
            color: var(--text-muted);
            grid-column: 1 / -1;
        }
        #searchEmptyState.visible { display: flex; }
        #searchEmptyState .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
        #searchEmptyState h3 { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        #searchEmptyState p  { font-size: 14px; line-height: 1.6; }
 
        /* Search meta info (jumlah hasil) */
        #searchMeta {
            font-size: 13px;
            color: var(--text-muted);
            margin-bottom: 16px;
            display: none;
            align-items: center;
            gap: 8px;
        }
        #searchMeta.visible { display: flex; }
        #searchMeta strong { color: var(--accent); font-weight: 700; }
    `;
    document.head.appendChild(style);
 
    // ── Tambahkan clear button ke dalam wrapper search ──
    const clearBtn = document.createElement('button');
    clearBtn.className = 'search-clear-btn';
    clearBtn.title = 'Hapus pencarian';
    clearBtn.setAttribute('aria-label', 'Hapus pencarian');
    clearBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    searchInput.parentElement.appendChild(clearBtn);
 
    // ── Tambahkan meta info (jumlah hasil) di atas grid ──
    const booksGrid = document.querySelector('.books-grid');
    const searchMeta = document.createElement('div');
    searchMeta.id = 'searchMeta';
    searchMeta.innerHTML = `<span>Menampilkan <strong id="searchCount">0</strong> hasil untuk "<span id="searchQueryLabel"></span>"</span>`;
    booksGrid.parentElement.insertBefore(searchMeta, booksGrid);
 
    // ── Tambahkan empty state ke dalam grid ──
    const emptyState = document.createElement('div');
    emptyState.id = 'searchEmptyState';
    emptyState.innerHTML = `
        <div class="empty-icon">📚</div>
        <h3>Tidak ada hasil</h3>
        <p>Coba kata kunci lain seperti judul buku,<br>nama penulis, atau deskripsi.</p>
    `;
    booksGrid.appendChild(emptyState);
 
    // ── Kumpulkan semua data kartu sekali saja ──
    const cards = Array.from(document.querySelectorAll('.books-card'));
    const cardData = cards.map(card => {
        // Simpan teks asli tiap elemen yang akan di-highlight
        const titleEl  = card.querySelector('.book-title');
        const authorEl = card.querySelector('.book-author span');
        return {
            el:         card,
            titleEl,
            authorEl,
            // Text asli (disimpan agar bisa di-restore)
            titleOrig:  titleEl  ? titleEl.textContent  : '',
            authorOrig: authorEl ? authorEl.textContent : '',
            // Semua teks untuk dicari
            searchText: [
                card.dataset.title  || '',
                card.dataset.author || '',
                card.dataset.desc   || '',
                card.dataset.badge  || '',
                card.dataset.lang   || '',
                titleEl  ? titleEl.textContent  : '',
                authorEl ? authorEl.textContent : '',
            ].join(' ').toLowerCase(),
        };
    });
 
    // ── Fungsi highlight ──
    function highlight(text, query) {
        if (!query) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="search-hl">$1</span>');
    }
 
    // ── Restore semua teks ke aslinya ──
    function restoreAll() {
        cardData.forEach(({ titleEl, authorEl, titleOrig, authorOrig }) => {
            if (titleEl)  titleEl.innerHTML  = titleOrig;
            if (authorEl) authorEl.innerHTML = authorOrig;
        });
    }
 
    // ── Filter dan render ──
    function runSearch(query) {
        const q = query.trim().toLowerCase();
 
        // Toggle clear btn
        if (q.length > 0) {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
        }
 
        // Tidak ada query → reset semua
        if (!q) {
            restoreAll();
            cards.forEach(card => {
                card.classList.remove('search-hidden', 'search-visible');
            });
            emptyState.classList.remove('visible');
            searchMeta.classList.remove('visible');
            document.querySelector('.topbar__title').textContent = 'Home';
            return;
        }
 
        document.querySelector('.topbar__title').textContent = 'Pencarian';
 
        let visibleCount = 0;
 
        cardData.forEach(({ el, titleEl, authorEl, titleOrig, authorOrig, searchText }) => {
            const matches = searchText.includes(q);
 
            if (matches) {
                el.classList.remove('search-hidden');
                el.classList.add('search-visible');
                visibleCount++;
 
                // Highlight judul dan author
                if (titleEl)  titleEl.innerHTML  = highlight(titleOrig, query.trim());
                if (authorEl) authorEl.innerHTML = highlight(authorOrig, query.trim());
            } else {
                el.classList.add('search-hidden');
                el.classList.remove('search-visible');
 
                // Restore teks jika tersembunyi
                if (titleEl)  titleEl.innerHTML  = titleOrig;
                if (authorEl) authorEl.innerHTML = authorOrig;
            }
        });
 
        // Empty state
        if (visibleCount === 0) {
            emptyState.classList.add('visible');
        } else {
            emptyState.classList.remove('visible');
        }
 
        // Search meta
        const countEl = document.getElementById('searchCount');
        const labelEl = document.getElementById('searchQueryLabel');
        if (countEl) countEl.textContent = visibleCount;
        if (labelEl) labelEl.textContent = query.trim();
        searchMeta.classList.add('visible');
    }
 
    // ── Debounce ──
    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => runSearch(searchInput.value), 200);
    });
 
    // ── Clear btn ──
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        runSearch('');
    });
 
    // ── Escape key ──
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchInput.blur();
            runSearch('');
        }
    });
 
    // ── Ctrl+K atau "/" fokus ke search ──
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            searchInput.focus();
        }
    });
})();
 
 
/* ════════════════════════════════════════════
   SEARCH — fokus dari sidebar (nav Cari)
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
════════════════════════════════════════════ */
 
document.querySelectorAll('.books-card').forEach(function (card) {
    card.style.cursor = 'pointer';
 
    card.addEventListener('click', function () {
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