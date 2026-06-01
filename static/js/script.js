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

  var btnLogin = document.getElementById('btnMain');
  if (btnLogin) {
    btnLogin.addEventListener('click', function () {
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

// navigation

document.addEventListener('DOMContentLoaded', function () {

  var hamburger = document.getElementById('hamburger');
  var navMenu   = document.getElementById('navMenu');
  var navAuth   = document.getElementById('navAuth');

  hamburger.addEventListener('click', function () {
    var isOpen = hamburger.classList.toggle('open');
    navMenu.classList.toggle('open', isOpen);
    navAuth.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });


  navMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      hamburger.classList.remove('open');
      navMenu.classList.remove('open');
      navAuth.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

});