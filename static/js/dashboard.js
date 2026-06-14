/* ════════════════════════════════════════════
   USER DATA
════════════════════════════════════════════ */

const USER = window.__USER__ || { name: '', email: '', initials: '?', role: 'user', is_premium: false };

document.getElementById('avatarEl').textContent  = USER.initials;
document.getElementById('avatarName').textContent = USER.name;

const dropName  = document.getElementById('dropdownUserName');
const dropEmail = document.getElementById('dropdownUserEmail');
const dropBadge = document.getElementById('dropdownPremiumBadge');
const avatarRole = document.getElementById('avatarRole');

if (dropName)  dropName.textContent  = USER.name  || 'Profil Saya';
if (dropEmail) dropEmail.textContent = USER.email || '';

if (USER.is_premium) {
    if (dropBadge)  dropBadge.style.display  = 'flex';
    if (avatarRole) avatarRole.textContent    = '👑 Premium';
}

/* ════════════════════════════════════════════
   ROLE-BASED UI
════════════════════════════════════════════ */

(function applyRoleUI() {
    const role = USER.role || 'user';

    // ── Penulis: Tampilkan nav Tambah Buku, sembunyikan Subscribe ──
    if (role === 'author') {
        const navTambah = document.getElementById('navTambahBuku');
        if (navTambah) navTambah.style.display = '';

        // Sembunyikan link subscribe di kedua dropdown
        ['dropdownSubscribeLink', 'settingsSubscribeLink'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Ganti label role di sidebar
        if (avatarRole) avatarRole.textContent = '✍️ Penulis';
    }

    // ── Admin: Tidak pernah sampai di sini (redirect ke /admin) ──
    // Tapi kalau ada, sembunyikan subscribe juga
    if (role === 'admin') {
        ['dropdownSubscribeLink', 'settingsSubscribeLink'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        if (avatarRole) avatarRole.textContent = '🛡️ Admin';
    }
})();


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
    document.getElementById('optDark')?.classList.toggle('active',  theme === 'dark');
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
   PANEL SWITCHING
════════════════════════════════════════════ */

function showPanel(name) {
    // Sembunyikan semua panel
    document.getElementById('panelHome').style.display        = 'none';
    document.getElementById('panelKoleksi').style.display     = 'none';
    const panelTambah = document.getElementById('panelTambahBuku');
    if (panelTambah) panelTambah.style.display = 'none';

    // Hapus active dari semua nav item
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const titleEl = document.getElementById('topbarTitle');

    if (name === 'home') {
        document.getElementById('panelHome').style.display  = '';
        document.getElementById('navHome').classList.add('active');
        if (titleEl) titleEl.textContent = 'Home';
    } else if (name === 'koleksi') {
        document.getElementById('panelKoleksi').style.display = '';
        document.getElementById('navKoleksi').classList.add('active');
        if (titleEl) titleEl.textContent = 'Koleksi';
        loadKoleksi();
    } else if (name === 'tambahBuku') {
        if (panelTambah) panelTambah.style.display = '';
        const navTambah = document.getElementById('navTambahBuku');
        if (navTambah) navTambah.classList.add('active');
        if (titleEl) titleEl.textContent = 'Tambah Buku';
    }
}

// Nav items click handlers
document.getElementById('navHome').addEventListener('click', function(e) {
    e.preventDefault();
    showPanel('home');
    closeAll();
});

document.getElementById('navKoleksi').addEventListener('click', function(e) {
    e.preventDefault();
    showPanel('koleksi');
    closeAll();
});

document.getElementById('navCari').addEventListener('click', function(e) {
    e.preventDefault();
    focusSearch(e);
});

const navTambahBukuEl = document.getElementById('navTambahBuku');
if (navTambahBukuEl) {
    navTambahBukuEl.addEventListener('click', function(e) {
        e.preventDefault();
        showPanel('tambahBuku');
        closeAll();
    });
}


/* ════════════════════════════════════════════
   KOLEKSI — fetch & render saved books
════════════════════════════════════════════ */

let koleksiLoaded = false;

async function loadKoleksi() {
    if (koleksiLoaded) return; // sudah di-load, tidak perlu fetch ulang
    koleksiLoaded = false; // reset agar selalu fresh

    const grid     = document.getElementById('koleksiGrid');
    const empty    = document.getElementById('koleksiEmpty');
    const countEl  = document.getElementById('koleksiCount');

    grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Memuat koleksi...</div>';
    empty.style.display = 'none';

    try {
        const res  = await fetch('/api/collection', { credentials: 'same-origin' });
        const data = await res.json();

        grid.innerHTML = '';

        if (!data.success || data.count === 0) {
            empty.style.display  = 'flex';
            if (countEl) countEl.textContent = '0 buku';
            return;
        }

        if (countEl) countEl.textContent = `${data.count} buku`;

        data.books.forEach(book => {
            const badgeHtml = book.badge === 'premium'
                ? '<span class="book-badge badge-premium">👑 PREMIUM</span>'
                : '<span class="book-badge badge-free">GRATIS</span>';

            const initials = book.author.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
            const colors   = ['#c0392b', '#366560', '#1a1a1a', '#7a1a1a', '#2c3e50'];
            const color    = colors[book.id % colors.length];

            const card = document.createElement('div');
            card.className = 'books-card';
            card.dataset.title  = book.title;
            card.dataset.author = book.author;
            card.dataset.desc   = book.desc;
            card.dataset.badge  = book.badge;
            card.dataset.cover  = book.cover;
            card.dataset.stars  = book.stars;
            card.dataset.rating = book.rating;
            card.dataset.lang   = book.lang || '';
            card.style.cursor   = 'pointer';

            card.innerHTML = `
                <div class="book-cover-wrap">
                    ${badgeHtml}
                    <img src="${book.cover}" alt="${escapeHtml(book.title)}" class="book-cover" />
                </div>
                <div class="book-info">
                    <h3 class="book-title">${escapeHtml(book.title)}</h3>
                    <div class="book-author">
                        <span class="author-avatar" style="background:${color};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border-radius:50%;width:22px;height:22px;">${initials}</span>
                        <span>${escapeHtml(book.author)}</span>
                    </div>
                    <div class="book-rating">
                        <span class="stars">${book.stars}</span>
                        <span class="rating-text">${book.rating}</span>
                    </div>
                </div>`;

            card.addEventListener('click', function() {
                navigateToDetail(card);
            });

            grid.appendChild(card);
        });

        koleksiLoaded = true;

    } catch (err) {
        console.error('Gagal load koleksi:', err);
        grid.innerHTML = '<div style="padding:40px;text-align:center;color:#c0392b;">Gagal memuat koleksi. Coba refresh halaman.</div>';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ════════════════════════════════════════════
   DROPDOWN UTILITY
════════════════════════════════════════════ */

function positionDropdown(dropdown, trigger) {
    const tr    = trigger.getBoundingClientRect();
    const sbW   = document.getElementById('sidebar').getBoundingClientRect().width;
    const ddW   = 240;   // min-width dropdown
    const ddH   = dropdown.scrollHeight || 320; // perkiraan tinggi dropdown
    const vpH   = window.innerHeight;

    // Posisi horizontal: kanan sidebar
    dropdown.style.left = (sbW + 8) + 'px';
    dropdown.style.right = 'auto';

    // Posisi vertikal: usahakan sejajar trigger, tapi jangan keluar viewport
    let top = tr.top - 4;
    if (top + ddH > vpH - 8) {
        // Geser ke atas supaya dropdown tidak terpotong di bawah
        top = vpH - ddH - 8;
    }
    if (top < 8) top = 8;
    dropdown.style.top = top + 'px';
    dropdown.style.maxHeight = (vpH - top - 8) + 'px';
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

    // ── Inject CSS untuk search ──
    const style = document.createElement('style');
    style.textContent = `
        .topbar__search { position: relative; }

        .search-clear-btn {
            position: absolute;
            right: 10px; top: 50%;
            transform: translateY(-50%);
            background: none; border: none;
            cursor: pointer; padding: 4px;
            display: flex; align-items: center;
            color: var(--text-muted);
            opacity: 0; pointer-events: none;
            transition: opacity 0.15s, color 0.15s;
            border-radius: 50%;
        }
        .search-clear-btn.visible { opacity: 1; pointer-events: auto; }
        .search-clear-btn:hover { color: var(--text); background: var(--surface2); }
        .search-clear-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; }

        .topbar__search input { padding-right: 32px; }

        .search-hl {
            background: rgba(192, 57, 43, 0.15);
            color: var(--accent);
            border-radius: 2px; padding: 0 1px; font-weight: 700;
        }
        [data-theme="dark"] .search-hl { background: rgba(232, 64, 64, 0.2); color: #ff6666; }

        .books-card.search-hidden { display: none !important; }
        .books-card.search-visible { animation: cardFadeIn 0.2s ease forwards; }
        @keyframes cardFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        #searchEmptyState {
            display: none; flex-direction: column;
            align-items: center; justify-content: center;
            padding: 64px 24px; text-align: center;
            color: var(--text-muted); grid-column: 1 / -1;
        }
        #searchEmptyState.visible { display: flex; }
        #searchEmptyState .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
        #searchEmptyState h3 { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        #searchEmptyState p  { font-size: 14px; line-height: 1.6; }

        #searchMeta {
            font-size: 13px; color: var(--text-muted);
            margin-bottom: 16px; display: none;
            align-items: center; gap: 8px;
        }
        #searchMeta.visible { display: flex; }
        #searchMeta strong { color: var(--accent); font-weight: 700; }

        .detail-premium-notice {
            display:flex; align-items:center; gap:8px;
            padding:10px 14px; margin:10px 0;
            background:rgba(245,158,11,0.1);
            border:1px solid rgba(245,158,11,0.3);
            border-radius:10px;
            font-size:0.85rem; color:#b45309;
        }
        [data-theme="dark"] .detail-premium-notice { color:#fbbf24; background:rgba(245,158,11,0.08); }
        .detail-premium-notice a { color:var(--accent); font-weight:600; }
    `;
    document.head.appendChild(style);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'search-clear-btn';
    clearBtn.title = 'Hapus pencarian';
    clearBtn.setAttribute('aria-label', 'Hapus pencarian');
    clearBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    searchInput.parentElement.appendChild(clearBtn);

    const booksGrid = document.getElementById('booksGrid');
    const searchMeta = document.createElement('div');
    searchMeta.id = 'searchMeta';
    searchMeta.innerHTML = `<span>Menampilkan <strong id="searchCount">0</strong> hasil untuk "<span id="searchQueryLabel"></span>"</span>`;
    booksGrid.parentElement.insertBefore(searchMeta, booksGrid);

    const emptyState = document.createElement('div');
    emptyState.id = 'searchEmptyState';
    emptyState.innerHTML = `
        <div class="empty-icon">📚</div>
        <h3>Tidak ada hasil</h3>
        <p>Coba kata kunci lain seperti judul buku,<br>nama penulis, atau deskripsi.</p>
    `;
    booksGrid.appendChild(emptyState);

    const cards = Array.from(document.querySelectorAll('#booksGrid .books-card'));
    const cardData = cards.map(card => {
        const titleEl  = card.querySelector('.book-title');
        const authorEl = card.querySelector('.book-author span:last-child');
        return {
            el: card, titleEl, authorEl,
            titleOrig:  titleEl  ? titleEl.textContent  : '',
            authorOrig: authorEl ? authorEl.textContent : '',
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

    function highlight(text, query) {
        if (!query) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="search-hl">$1</span>');
    }

    function restoreAll() {
        cardData.forEach(({ titleEl, authorEl, titleOrig, authorOrig }) => {
            if (titleEl)  titleEl.innerHTML  = titleOrig;
            if (authorEl) authorEl.innerHTML = authorOrig;
        });
    }

    function runSearch(query) {
        const q = query.trim().toLowerCase();
        clearBtn.classList.toggle('visible', q.length > 0);

        if (!q) {
            restoreAll();
            cards.forEach(card => card.classList.remove('search-hidden', 'search-visible'));
            emptyState.classList.remove('visible');
            searchMeta.classList.remove('visible');
            document.getElementById('topbarTitle').textContent = 'Home';
            return;
        }

        // Switch ke panel home untuk search
        if (document.getElementById('panelHome').style.display === 'none') {
            showPanel('home');
        }

        document.getElementById('topbarTitle').textContent = 'Pencarian';
        let visibleCount = 0;

        cardData.forEach(({ el, titleEl, authorEl, titleOrig, authorOrig, searchText }) => {
            const matches = searchText.includes(q);
            if (matches) {
                el.classList.remove('search-hidden');
                el.classList.add('search-visible');
                visibleCount++;
                if (titleEl)  titleEl.innerHTML  = highlight(titleOrig, query.trim());
                if (authorEl) authorEl.innerHTML = highlight(authorOrig, query.trim());
            } else {
                el.classList.add('search-hidden');
                el.classList.remove('search-visible');
                if (titleEl)  titleEl.innerHTML  = titleOrig;
                if (authorEl) authorEl.innerHTML = authorOrig;
            }
        });

        emptyState.classList.toggle('visible', visibleCount === 0);
        const countEl = document.getElementById('searchCount');
        const labelEl = document.getElementById('searchQueryLabel');
        if (countEl) countEl.textContent = visibleCount;
        if (labelEl) labelEl.textContent = query.trim();
        searchMeta.classList.add('visible');
    }

    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => runSearch(searchInput.value), 200);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        runSearch('');
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchInput.blur();
            runSearch('');
        }
    });

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
   SEARCH — fokus dari sidebar
════════════════════════════════════════════ */

function focusSearch(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('searchInput');
    if (input) {
        // pastikan panel home aktif
        showPanel('home');
        input.focus();
        input.select();
    }
    closeAll();
}


/* ════════════════════════════════════════════
   BOOK CARDS — navigasi ke /detail
════════════════════════════════════════════ */

function navigateToDetail(card) {
    const id     = card.dataset.id     || '0';
    const cover  = card.dataset.cover  || card.querySelector('.book-cover')?.src  || '';
    const title  = card.dataset.title  || card.querySelector('.book-title')?.textContent?.trim() || '';
    const author = card.dataset.author || card.querySelector('.book-author span:last-child')?.textContent?.trim() || '';
    const stars  = card.dataset.stars  || card.querySelector('.stars')?.textContent || '★★★★★';
    const rating = card.dataset.rating || card.querySelector('.rating-text')?.textContent || '';
    const badge  = card.dataset.badge  || '';
    const lang   = card.dataset.lang   || '';
    const desc   = card.dataset.desc   || 'Deskripsi belum tersedia.';

    const params = new URLSearchParams({ id, cover, title, author, stars, rating, badge, lang, desc });
    window.location.href = '/detail?' + params.toString();
}

document.querySelectorAll('#booksGrid .books-card').forEach(function (card) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function () {
        navigateToDetail(card);
    });
});


/* ════════════════════════════════════════════
   TAMBAH BUKU — form logic (author only)
════════════════════════════════════════════ */

(function initTambahBuku() {
    // Hanya init kalau elemen ada (author only)
    const form        = document.getElementById('addBookForm');
    const coverInput  = document.getElementById('coverInput');
    const coverPreview= document.getElementById('coverPreview');
    const coverPlaceholder = document.getElementById('coverPlaceholder');
    const addBookBtn  = document.getElementById('addBookBtn');
    const addBookAlert= document.getElementById('addBookAlert');
    const addBookSuccess = document.getElementById('addBookSuccess');

    if (!form) return;

    // ── Cover preview ──
    if (coverInput) {
        coverInput.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                showAddAlert('Ukuran file melebihi 5 MB.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (coverPreview) {
                    coverPreview.src = e.target.result;
                    coverPreview.style.display = 'block';
                }
                if (coverPlaceholder) coverPlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        });
    }

    // ── Form submit ──
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const title = (document.getElementById('bookTitle')?.value || '').trim();
        const titleError = document.getElementById('bookTitleError');

        if (!title) {
            if (titleError) {
                titleError.textContent = 'Judul buku wajib diisi.';
                titleError.style.color = '#ef4444';
            }
            document.getElementById('bookTitle')?.focus();
            return;
        }
        if (titleError) titleError.textContent = '';

        // Build FormData
        const formData = new FormData(form);

        // Disable button
        if (addBookBtn) {
            addBookBtn.disabled = true;
            const btnText = document.getElementById('addBookBtnText');
            if (btnText) btnText.textContent = 'Mempublikasikan…';
        }
        hideAddAlert();

        try {
            const res  = await fetch('/api/book/add', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            const data = await res.json();

            if (!data.success) {
                showAddAlert(data.message || 'Gagal menambahkan buku.', 'error');
                return;
            }

            // Success state
            form.style.display = 'none';
            if (addBookSuccess) addBookSuccess.style.display = 'block';

        } catch (err) {
            console.error('addBook error:', err);
            showAddAlert('Terjadi kesalahan. Pastikan koneksi Anda aktif.', 'error');
        } finally {
            if (addBookBtn) {
                addBookBtn.disabled = false;
                const btnText = document.getElementById('addBookBtnText');
                if (btnText) btnText.textContent = 'Publikasikan Buku';
            }
        }
    });

    function showAddAlert(message, type) {
        if (!addBookAlert) return;
        addBookAlert.textContent = message;
        addBookAlert.style.display = 'block';
        addBookAlert.style.background = type === 'error'
            ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';
        addBookAlert.style.border = `1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`;
        addBookAlert.style.color  = type === 'error' ? '#ef4444' : '#22c55e';
        addBookAlert.style.padding = '12px 16px';
        addBookAlert.style.borderRadius = '10px';
        addBookAlert.style.fontSize = '13.5px';
        addBookAlert.style.fontWeight = '500';
    }

    function hideAddAlert() {
        if (addBookAlert) addBookAlert.style.display = 'none';
    }
})();

// ── Badge selector ──
function setBadge(value) {
    const input       = document.getElementById('bookBadge');
    const freeBtnEl   = document.getElementById('badgeFree');
    const premiumBtnEl= document.getElementById('badgePremium');
    if (!input) return;
    input.value = value;
    if (freeBtnEl)    freeBtnEl.classList.toggle('active',    value === 'free');
    if (premiumBtnEl) premiumBtnEl.classList.toggle('active', value === 'premium');
}

// ── Reset form ──
function resetAddBookForm() {
    const form = document.getElementById('addBookForm');
    const success = document.getElementById('addBookSuccess');
    const coverPreview = document.getElementById('coverPreview');
    const coverPlaceholder = document.getElementById('coverPlaceholder');
    const addBookAlert = document.getElementById('addBookAlert');

    if (form) {
        form.reset();
        form.style.display = '';
    }
    if (success) success.style.display = 'none';
    if (coverPreview) { coverPreview.src = ''; coverPreview.style.display = 'none'; }
    if (coverPlaceholder) coverPlaceholder.style.display = '';
    if (addBookAlert) addBookAlert.style.display = 'none';
    setBadge('free');
}