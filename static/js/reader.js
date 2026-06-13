/**
 * reader.js — UnknownBooks Flipbook Engine
 * Mengambil konten buku dari /api/book/<id>/pages
 */

/* ══════════════════════════════════════════════
   INISIALISASI — ambil data dari server
══════════════════════════════════════════════ */

const BOOK_ID   = window.__BOOK_ID__;
const BOOK_META = window.__BOOK_META__ || { title: 'UnknownBooks', author: '' };

let BOOK_PAGES     = [];
let currentSpread  = 0;
let TOTAL_PAGES    = 0;
let TOTAL_SPREADS  = 0;
let isFlipping     = false;

/* ── DOM Elements ── */
const bookTitle    = document.getElementById('bookTitle');
const bookAuthor   = document.getElementById('bookAuthor');
const leftContent  = document.getElementById('leftContent');
const rightContent = document.getElementById('rightContent');
const leftPageNum  = document.getElementById('leftPageNum');
const rightPageNum = document.getElementById('rightPageNum');
const flipCard     = document.getElementById('flipCard');
const flipFront    = document.getElementById('flipFrontContent');
const flipBack     = document.getElementById('flipBackContent');
const btnPrev      = document.getElementById('btnPrev');
const btnNext      = document.getElementById('btnNext');
const pageIndicator = document.getElementById('pageIndicator');
const btnToc       = document.getElementById('btnToc');
const tocSidebar   = document.getElementById('tocSidebar');
const tocOverlay   = document.getElementById('tocOverlay');
const tocClose     = document.getElementById('tocClose');
const tocList      = document.getElementById('tocList');
const btnFullscreen = document.getElementById('btnFullscreen');
const clickLeft    = document.getElementById('clickLeft');
const clickRight   = document.getElementById('clickRight');

/* ── Set metadata dari window.__BOOK_META__ ── */
bookTitle.textContent  = BOOK_META.title;
bookAuthor.textContent = BOOK_META.author;

/* ══════════════════════════════════════════════
   FETCH KONTEN BUKU DARI API
══════════════════════════════════════════════ */

async function loadBook() {
  try {
    showLoading(true);
    const res  = await fetch(`/api/book/${BOOK_ID}/pages`, { credentials: 'same-origin' });
    const data = await res.json();

    if (!data.success) {
      // Konten premium atau buku tidak ada
      showError(data.message || 'Gagal memuat konten buku.');
      return;
    }

    BOOK_PAGES = data.pages;

    // Pastikan total halaman genap
    if (BOOK_PAGES.length % 2 !== 0) {
      BOOK_PAGES.push({ type: 'blank', content: '', chapterNum: null, chapterTitle: null });
    }

    TOTAL_PAGES   = BOOK_PAGES.length;
    TOTAL_SPREADS = Math.floor(TOTAL_PAGES / 2);

    showLoading(false);
    buildToc();
    renderSpread(0);

  } catch (err) {
    console.error('Gagal fetch buku:', err);
    showError('Gagal terhubung ke server. Silakan refresh halaman.');
  }
}

function showLoading(on) {
  // Tampilkan/sembunyikan loading state di area buku
  const wrapper = document.getElementById('bookWrapper');
  if (on) {
    leftContent.innerHTML  = '<div class="page-content" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-secondary);font-size:0.9rem;">Memuat...</div>';
    rightContent.innerHTML = '<div class="page-content blank-page"></div>';
    btnPrev.disabled = true;
    btnNext.disabled = true;
  }
}

function showError(msg) {
  leftContent.innerHTML  = `<div class="page-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:24px;text-align:center;"><p style="color:#c0392b;font-weight:600;margin-bottom:12px;">⚠️ ${msg}</p><a href="/subscribe" style="padding:8px 20px;background:#c0392b;color:#fff;border-radius:8px;text-decoration:none;font-size:0.9rem;">Berlangganan Premium</a></div>`;
  rightContent.innerHTML = '<div class="page-content blank-page"></div>';
}

/* ══════════════════════════════════════════════
   RENDER HALAMAN
══════════════════════════════════════════════ */

function renderPage(pageIndex) {
  if (pageIndex < 0 || pageIndex >= TOTAL_PAGES) return '';
  const page = BOOK_PAGES[pageIndex];

  switch (page.type) {
    case 'cover':
      return `
        <div class="page-content cover-page">
          <div class="cover-title">${escapeHtml(BOOK_META.title)}</div>
          <div class="cover-divider"></div>
          <div class="cover-author">${escapeHtml(BOOK_META.author)}</div>
          <div class="cover-badge">UnknownBooks</div>
        </div>`;

    case 'chapter':
      return `
        <div class="page-content" style="display:flex;flex-direction:column;justify-content:center;padding:48px 36px;">
          <div style="font-family:var(--font-main);font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--color-secondary);margin-bottom:16px;">
            Bab ${page.chapterNum || ''}
          </div>
          <h1 style="font-family:var(--font-secondary);font-size:1.8rem;font-weight:700;line-height:1.2;margin-bottom:20px;">${escapeHtml(page.chapterTitle || '')}</h1>
          <div style="width:32px;height:2px;background:var(--color-secondary);"></div>
        </div>`;

    case 'text':
      return `<div class="page-content">${page.content}</div>`;

    case 'blank':
    default:
      return `<div class="page-content blank-page">~</div>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderPageNumber(pageIndex, el) {
  if (pageIndex <= 0) {
    el.textContent = '';
    return;
  }
  el.textContent = pageIndex + 1;
}

function renderSpread(spreadIndex) {
  const leftIdx  = spreadIndex * 2;
  const rightIdx = spreadIndex * 2 + 1;

  leftContent.innerHTML  = renderPage(leftIdx);
  rightContent.innerHTML = renderPage(rightIdx);

  renderPageNumber(leftIdx,  leftPageNum);
  renderPageNumber(rightIdx, rightPageNum);

  pageIndicator.textContent = `${leftIdx + 1}–${rightIdx + 1} / ${TOTAL_PAGES}`;

  btnPrev.disabled = spreadIndex === 0;
  btnNext.disabled = spreadIndex === TOTAL_SPREADS - 1;

  updateTocActive(leftIdx);
}

/* ══════════════════════════════════════════════
   FLIP ANIMASI
══════════════════════════════════════════════ */

function getFlipDur() {
  return (parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--flip-dur')) || 0.6) * 1000;
}

function flipNext() {
  if (isFlipping || currentSpread >= TOTAL_SPREADS - 1) return;
  isFlipping = true;

  const nextSpread  = currentSpread + 1;
  const nextLeftIdx  = nextSpread * 2;
  const nextRightIdx = nextSpread * 2 + 1;

  flipFront.innerHTML = renderPage(currentSpread * 2 + 1);
  flipBack.innerHTML  = renderPage(nextLeftIdx);

  flipCard.style.left = '';
  flipCard.classList.remove('flipping-prev');
  flipCard.classList.add('flipping-next');

  const dur = getFlipDur();

  setTimeout(() => {
    leftContent.innerHTML  = renderPage(nextLeftIdx);
    rightContent.innerHTML = renderPage(nextRightIdx);
    renderPageNumber(nextLeftIdx,  leftPageNum);
    renderPageNumber(nextRightIdx, rightPageNum);
  }, dur / 2);

  setTimeout(() => {
    flipCard.classList.remove('flipping-next');
    currentSpread = nextSpread;
    pageIndicator.textContent = `${nextLeftIdx + 1}–${nextRightIdx + 1} / ${TOTAL_PAGES}`;
    btnPrev.disabled = currentSpread === 0;
    btnNext.disabled = currentSpread === TOTAL_SPREADS - 1;
    updateTocActive(nextLeftIdx);
    isFlipping = false;
  }, dur + 50);
}

function flipPrev() {
  if (isFlipping || currentSpread <= 0) return;
  isFlipping = true;

  const prevSpread   = currentSpread - 1;
  const prevLeftIdx  = prevSpread * 2;
  const prevRightIdx = prevSpread * 2 + 1;

  flipFront.innerHTML = renderPage(currentSpread * 2);
  flipBack.innerHTML  = renderPage(prevRightIdx);

  flipCard.classList.remove('flipping-next');
  flipCard.classList.add('flipping-prev');

  const dur = getFlipDur();

  setTimeout(() => {
    leftContent.innerHTML  = renderPage(prevLeftIdx);
    rightContent.innerHTML = renderPage(prevRightIdx);
    renderPageNumber(prevLeftIdx,  leftPageNum);
    renderPageNumber(prevRightIdx, rightPageNum);
  }, dur / 2);

  setTimeout(() => {
    flipCard.classList.remove('flipping-prev');
    currentSpread = prevSpread;
    pageIndicator.textContent = `${prevLeftIdx + 1}–${prevRightIdx + 1} / ${TOTAL_PAGES}`;
    btnPrev.disabled = currentSpread === 0;
    btnNext.disabled = currentSpread === TOTAL_SPREADS - 1;
    updateTocActive(prevLeftIdx);
    isFlipping = false;
  }, dur + 50);
}

/* ══════════════════════════════════════════════
   TABLE OF CONTENTS
══════════════════════════════════════════════ */

function buildToc() {
  tocList.innerHTML = '';
  BOOK_PAGES.forEach((page, idx) => {
    if (page.tocLabel || page.type === 'cover') {
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.href   = '#';

      const numSpan = document.createElement('span');
      numSpan.className   = 'toc-num';
      numSpan.textContent = idx + 1;

      a.appendChild(numSpan);
      a.appendChild(document.createTextNode(page.tocLabel || 'Cover'));
      a.dataset.pageIndex = idx;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSpread = Math.floor(idx / 2);
        currentSpread = targetSpread;
        renderSpread(currentSpread);
        closeToc();
      });

      li.appendChild(a);
      tocList.appendChild(li);
    }
  });
}

function updateTocActive(pageIndex) {
  tocList.querySelectorAll('a').forEach((a) => {
    const pi     = parseInt(a.dataset.pageIndex);
    const spread = Math.floor(pi / 2);
    a.classList.toggle('active', spread === currentSpread);
  });
}

function openToc()  { tocSidebar.classList.add('open');    tocOverlay.classList.add('open'); }
function closeToc() { tocSidebar.classList.remove('open'); tocOverlay.classList.remove('open'); }

/* ══════════════════════════════════════════════
   FULLSCREEN
══════════════════════════════════════════════ */

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  const icon = document.getElementById('fsIcon');
  if (document.fullscreenElement) {
    icon.innerHTML = `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>`;
  } else {
    icon.innerHTML = `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`;
  }
});

/* ══════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════ */

btnNext.addEventListener('click', flipNext);
btnPrev.addEventListener('click', flipPrev);
clickRight.addEventListener('click', flipNext);
clickLeft.addEventListener('click', flipPrev);

btnToc.addEventListener('click', openToc);
tocClose.addEventListener('click', closeToc);
tocOverlay.addEventListener('click', closeToc);
btnFullscreen.addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'PageDown') flipNext();
  if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   flipPrev();
  if (e.key === 'Escape')  closeToc();
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
});

/* ══════════════════════════════════════════════
   INIT — fetch buku saat halaman dimuat
══════════════════════════════════════════════ */

loadBook();
