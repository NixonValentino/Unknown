// Ambil data buku dari URL parameter
var params = new URLSearchParams(window.location.search);

var cover  = params.get('cover')  || '/assets/bookShowcase/1.svg';
var title  = params.get('title')  || 'Judul Buku';
var author = params.get('author') || 'Nama Penulis';
var rating = params.get('rating') || '5/5';
var stars  = params.get('stars')  || '★★★★★';
var badge  = params.get('badge')  || '';
var lang   = params.get('lang')   || '';
var desc   = params.get('desc')   || 'Deskripsi buku belum tersedia.';

// Isi elemen
document.getElementById('detailCover').src = cover;
document.getElementById('detailCover').alt = title;
document.getElementById('detailTitle').textContent = title;
document.getElementById('detailAuthorName').textContent = author;
document.getElementById('detailStars').textContent = stars;
document.getElementById('detailRatingText').textContent = rating;
document.getElementById('detailDesc').textContent = desc;

// Badge
var badgeEl = document.getElementById('detailBadge');
if (badge === 'free') {
  badgeEl.textContent = 'GRATIS';
  badgeEl.className = 'detail-badge badge-free';
} else if (badge === 'premium') {
  badgeEl.textContent = '👑 PREMIUM';
  badgeEl.className = 'detail-badge badge-premium';
}

// Bahasa
if (lang) {
  document.getElementById('detailLangWrap').style.display = 'block';
  document.getElementById('detailLang').textContent = 'Tersedia: ' + lang;
}

// Judul halaman
document.title = title + ' - Unknown Books';

// Tombol baca (ganti URL sesuai halaman reader kamu)
document.getElementById('btnRead').addEventListener('click', function () {
  window.location.href = '/read?book=' + encodeURIComponent(title);
});

var landingCards = document.querySelectorAll('.books-card');
landingCards.forEach(function (card) {
  card.addEventListener('click', function () {
    window.location.href = '/login';
  });
});

// Tombol simpan
document.getElementById('btnSave').addEventListener('click', function () {
  var btn = document.getElementById('btnSave');
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Tersimpan';
  btn.style.color = '#e03a2f';
  btn.style.borderColor = '#e03a2f';
});

// Terapkan tema yang tersimpan
var theme = localStorage.getItem('mb-theme') || 'light';
document.documentElement.setAttribute('data-theme', theme);
