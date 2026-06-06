/**
 * reader.js — UnknownBooks Flipbook Engine
 *
 * Cara pakai:
 *   1. Isi array BOOK_DATA di bawah dengan konten buku
 *   2. Set BOOK_META (judul, penulis)
 *   3. Setiap item di pages[] adalah satu halaman
 *      type: 'cover' | 'text' | 'chapter' | 'blank'
 */

/* ══════════════════════════════════════════════
   KONFIGURASI BUKU — edit bagian ini
══════════════════════════════════════════════ */

const BOOK_META = {
  title: "Nama Buku di Sini",
  author: "Nama Penulis",
};

const BOOK_PAGES = [
  // Halaman 0 — Cover
  {
    type: "cover",
    title: "Nama Buku",
    author: "Nama Penulis",
  },
  // Halaman 1 — Blank (balik cover)
  {
    type: "blank",
  },
  // Halaman 2 — Bab 1
  {
    type: "chapter",
    chapterNum: 1,
    chapterTitle: "Judul Bab Pertama",
    tocLabel: "Bab 1: Judul Bab Pertama",
  },
  // Halaman 3
  {
    type: "text",
    content: `
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
        `,
  },
  // Halaman 4
  {
    type: "text",
    content: `
            <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
            <p>Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.</p>
        `,
  },
  // Halaman 5 — Bab 2
  {
    type: "chapter",
    chapterNum: 2,
    chapterTitle: "Judul Bab Kedua",
    tocLabel: "Bab 2: Judul Bab Kedua",
  },
  // Halaman 6
  {
    type: "text",
    content: `
            <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati.</p>
            <p>Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.</p>
            <p>Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.</p>
        `,
  },
  // Halaman 7
  {
    type: "text",
    content: `
            <p>Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.</p>
            <p>Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.</p>
        `,
  },
  // Halaman 8 — Blank / Penutup
  {
    type: "blank",
  },
];

/* ══════════════════════════════════════════════
   ENGINE — tidak perlu diedit
══════════════════════════════════════════════ */

// Pastikan total halaman genap
if (BOOK_PAGES.length % 2 !== 0) {
  BOOK_PAGES.push({ type: "blank" });
}

const TOTAL_PAGES = BOOK_PAGES.length;
let currentSpread = 0; // spread = pasangan halaman (0, 2, 4, ...)
const TOTAL_SPREADS = Math.floor(TOTAL_PAGES / 2);
let isFlipping = false;

/* ── DOM Elements ── */
const bookTitle = document.getElementById("bookTitle");
const bookAuthor = document.getElementById("bookAuthor");
const leftContent = document.getElementById("leftContent");
const rightContent = document.getElementById("rightContent");
const leftPageNum = document.getElementById("leftPageNum");
const rightPageNum = document.getElementById("rightPageNum");
const flipCard = document.getElementById("flipCard");
const flipFront = document.getElementById("flipFrontContent");
const flipBack = document.getElementById("flipBackContent");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const pageIndicator = document.getElementById("pageIndicator");
const btnToc = document.getElementById("btnToc");
const tocSidebar = document.getElementById("tocSidebar");
const tocOverlay = document.getElementById("tocOverlay");
const tocClose = document.getElementById("tocClose");
const tocList = document.getElementById("tocList");
const btnFullscreen = document.getElementById("btnFullscreen");
const clickLeft = document.getElementById("clickLeft");
const clickRight = document.getElementById("clickRight");

/* ── Metadata ── */
bookTitle.textContent = BOOK_META.title;
bookAuthor.textContent = BOOK_META.author;

/* ══════════════════════════════════════════════
   RENDER HALAMAN
══════════════════════════════════════════════ */

function renderPage(pageIndex) {
  if (pageIndex < 0 || pageIndex >= TOTAL_PAGES) return "";
  const page = BOOK_PAGES[pageIndex];

  switch (page.type) {
    case "cover":
      return `
                <div class="page-content cover-page">
                    <div class="cover-title">${page.title}</div>
                    <div class="cover-divider"></div>
                    <div class="cover-author">${page.author}</div>
                    <div class="cover-badge">UnknownBooks</div>
                </div>`;

    case "chapter":
      return `
                <div class="page-content" style="display:flex;flex-direction:column;justify-content:center;padding:48px 36px;">
                    <div style="font-family:var(--font-main);font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--color-secondary);margin-bottom:16px;">
                        Bab ${page.chapterNum}
                    </div>
                    <h1 style="font-family:var(--font-secondary);font-size:1.8rem;font-weight:700;line-height:1.2;margin-bottom:20px;">${page.chapterTitle}</h1>
                    <div style="width:32px;height:2px;background:var(--color-secondary);"></div>
                </div>`;

    case "text":
      return `<div class="page-content">${page.content}</div>`;

    case "blank":
    default:
      return `<div class="page-content blank-page">~</div>`;
  }
}

function renderPageNumber(pageIndex, el) {
  if (pageIndex <= 0) {
    el.textContent = "";
    return;
  }
  el.textContent = pageIndex + 1;
}

function renderSpread(spreadIndex) {
  const leftIdx = spreadIndex * 2;
  const rightIdx = spreadIndex * 2 + 1;

  leftContent.innerHTML = renderPage(leftIdx);
  rightContent.innerHTML = renderPage(rightIdx);

  renderPageNumber(leftIdx, leftPageNum);
  renderPageNumber(rightIdx, rightPageNum);

  pageIndicator.textContent = `${leftIdx + 1}–${rightIdx + 1} / ${TOTAL_PAGES}`;

  btnPrev.disabled = spreadIndex === 0;
  btnNext.disabled = spreadIndex === TOTAL_SPREADS - 1;

  updateTocActive(leftIdx);
}

/* ══════════════════════════════════════════════
   FLIP ANIMASI
══════════════════════════════════════════════ */

function flipNext() {
  if (isFlipping || currentSpread >= TOTAL_SPREADS - 1) return;
  isFlipping = true;

  const nextSpread = currentSpread + 1;
  const nextLeftIdx = nextSpread * 2;
  const nextRightIdx = nextSpread * 2 + 1;

  // Front = halaman kanan sekarang, Back = halaman kiri berikutnya
  flipFront.innerHTML = renderPage(currentSpread * 2 + 1);
  flipBack.innerHTML = renderPage(nextLeftIdx);

  flipCard.style.left = ""; // reset
  flipCard.classList.remove("flipping-prev");
  flipCard.classList.add("flipping-next");

  // Di tengah animasi, update halaman yang diam
  setTimeout(
    () => {
      leftContent.innerHTML = renderPage(nextLeftIdx);
      rightContent.innerHTML = renderPage(nextRightIdx);
      renderPageNumber(nextLeftIdx, leftPageNum);
      renderPageNumber(nextRightIdx, rightPageNum);
    },
    (parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--flip-dur"),
    ) *
      1000) /
      2,
  );

  setTimeout(
    () => {
      flipCard.classList.remove("flipping-next");
      currentSpread = nextSpread;
      pageIndicator.textContent = `${nextLeftIdx + 1}–${nextRightIdx + 1} / ${TOTAL_PAGES}`;
      btnPrev.disabled = currentSpread === 0;
      btnNext.disabled = currentSpread === TOTAL_SPREADS - 1;
      updateTocActive(nextLeftIdx);
      isFlipping = false;
    },
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--flip-dur"),
    ) *
      1000 +
      50,
  );
}

function flipPrev() {
  if (isFlipping || currentSpread <= 0) return;
  isFlipping = true;

  const prevSpread = currentSpread - 1;
  const prevLeftIdx = prevSpread * 2;
  const prevRightIdx = prevSpread * 2 + 1;

  // Front = halaman kiri sekarang, Back = halaman kanan sebelumnya
  flipFront.innerHTML = renderPage(currentSpread * 2);
  flipBack.innerHTML = renderPage(prevRightIdx);

  flipCard.classList.remove("flipping-next");
  flipCard.classList.add("flipping-prev");

  setTimeout(
    () => {
      leftContent.innerHTML = renderPage(prevLeftIdx);
      rightContent.innerHTML = renderPage(prevRightIdx);
      renderPageNumber(prevLeftIdx, leftPageNum);
      renderPageNumber(prevRightIdx, rightPageNum);
    },
    (parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--flip-dur"),
    ) *
      1000) /
      2,
  );

  setTimeout(
    () => {
      flipCard.classList.remove("flipping-prev");
      currentSpread = prevSpread;
      pageIndicator.textContent = `${prevLeftIdx + 1}–${prevRightIdx + 1} / ${TOTAL_PAGES}`;
      btnPrev.disabled = currentSpread === 0;
      btnNext.disabled = currentSpread === TOTAL_SPREADS - 1;
      updateTocActive(prevLeftIdx);
      isFlipping = false;
    },
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--flip-dur"),
    ) *
      1000 +
      50,
  );
}

/* ══════════════════════════════════════════════
   TABLE OF CONTENTS
══════════════════════════════════════════════ */

function buildToc() {
  BOOK_PAGES.forEach((page, idx) => {
    if (page.tocLabel || page.type === "cover") {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";

      const numSpan = document.createElement("span");
      numSpan.className = "toc-num";
      numSpan.textContent = idx + 1;

      a.appendChild(numSpan);
      a.appendChild(document.createTextNode(page.tocLabel || "Cover"));
      a.dataset.pageIndex = idx;

      a.addEventListener("click", (e) => {
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
  tocList.querySelectorAll("a").forEach((a) => {
    const pi = parseInt(a.dataset.pageIndex);
    const spread = Math.floor(pi / 2);
    a.classList.toggle("active", spread === currentSpread);
  });
}

function openToc() {
  tocSidebar.classList.add("open");
  tocOverlay.classList.add("open");
}

function closeToc() {
  tocSidebar.classList.remove("open");
  tocOverlay.classList.remove("open");
}

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

document.addEventListener("fullscreenchange", () => {
  const icon = document.getElementById("fsIcon");
  if (document.fullscreenElement) {
    icon.innerHTML = `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>`;
  } else {
    icon.innerHTML = `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`;
  }
});

/* ══════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════ */

btnNext.addEventListener("click", flipNext);
btnPrev.addEventListener("click", flipPrev);
clickRight.addEventListener("click", flipNext);
clickLeft.addEventListener("click", flipPrev);

btnToc.addEventListener("click", openToc);
tocClose.addEventListener("click", closeToc);
tocOverlay.addEventListener("click", closeToc);
btnFullscreen.addEventListener("click", toggleFullscreen);

// Keyboard
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "PageDown") flipNext();
  if (e.key === "ArrowLeft" || e.key === "PageUp") flipPrev();
  if (e.key === "Escape") closeToc();
  if (e.key === "f" || e.key === "F") toggleFullscreen();
});

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */

buildToc();
renderSpread(0);
