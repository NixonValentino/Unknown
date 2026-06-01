function toggleFaq(el) {
    const item = el.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  }

document.addEventListener('DOMContentLoaded', function () {

  var TARGET_URL = '/login';

  
  var btnLoadMore = document.getElementById('btnLoadMore');
  if (btnLoadMore) {
    btnLoadMore.addEventListener('click', function () {
      window.location.href = TARGET_URL;
    });
  }

 
  var cards = document.querySelectorAll('.book-card');
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      window.location.href = TARGET_URL;
    });
  });

});