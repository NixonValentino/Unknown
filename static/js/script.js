function toggleFaq(el) {
  const item = el.closest(".faq-item");
  const isOpen = item.classList.contains("open");
  document
    .querySelectorAll(".faq-item.open")
    .forEach((i) => i.classList.remove("open"));
  if (!isOpen) item.classList.add("open");
}

document.addEventListener("DOMContentLoaded", function () {
  var TARGET_URL = "/login";

  var btnLoadMore = document.getElementById("btnLoadMore");
  if (btnLoadMore) {
    btnLoadMore.addEventListener("click", function () {
      window.location.href = TARGET_URL;
    });
  }

  var btnLogin = document.getElementById("btnMain");
  if (btnLogin) {
    btnLogin.addEventListener("click", function () {
      window.location.href = TARGET_URL;
    });
  }

  var cards = document.querySelectorAll(".book-card");
  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      window.location.href = TARGET_URL;
    });
  });
});

// navigation

document.addEventListener("DOMContentLoaded", function () {
  var hamburger = document.getElementById("hamburger");
  var navMenu = document.getElementById("navMenu");
  var navAuth = document.getElementById("navAuth");

  hamburger.addEventListener("click", function () {
    var isOpen = hamburger.classList.toggle("open");
    navMenu.classList.toggle("open", isOpen);
    navAuth.classList.toggle("open", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  // Tambahkan setelah kode btnLoadMore
  var landingCards = document.querySelectorAll(".books-card");
  landingCards.forEach(function (card) {
    card.addEventListener("click", function () {
      window.location.href = "/login";
    });
  });

  navMenu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      hamburger.classList.remove("open");
      navMenu.classList.remove("open");
      navAuth.classList.remove("open");
      document.body.style.overflow = "";
    });
  });
});

// Intro

(function () {
  var QUOTE =
    "Buku adalah jendela dunia. Setiap halaman membawa kamu lebih dekat ke versi terbaik dirimu.";
  var AUTHOR = "— Unknown Books";
  var WORD_DELAY = 120;
  var HOLD_DURATION = 2000;
  var PROGRESS_DURATION = 0;

  var overlay = document.getElementById("intro-overlay");
  var quoteEl = document.getElementById("intro-quote");
  var authorEl = document.getElementById("intro-author");
  var skipBtn = document.getElementById("intro-skip");
  var progress = document.getElementById("intro-progress");

  var words = QUOTE.split(" ");
  words.forEach(function (word) {
    var span = document.createElement("span");
    span.classList.add("word");
    span.textContent = word;
    quoteEl.appendChild(span);
  });

  var spans = quoteEl.querySelectorAll(".word");
  var totalWordTime = words.length * WORD_DELAY;
  PROGRESS_DURATION = totalWordTime + HOLD_DURATION;

  progress.style.transitionDuration = PROGRESS_DURATION + "ms";
  setTimeout(function () {
    progress.style.width = "100%";
  }, 50);

  spans.forEach(function (span, i) {
    setTimeout(function () {
      span.classList.add("visible");
    }, i * WORD_DELAY);
  });

  setTimeout(function () {
    authorEl.textContent = AUTHOR;
    authorEl.classList.add("visible");
  }, totalWordTime);

  setTimeout(function () {
    dismissIntro();
  }, PROGRESS_DURATION);

  skipBtn.addEventListener("click", dismissIntro);

  function dismissIntro() {
    overlay.style.transition =
      "transform 0.9s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.9s ease";
    overlay.style.transform = "translateY(-100%)";
    overlay.style.opacity = "0";
    setTimeout(function () {
      overlay.remove();
    }, 900);
  }
})();
