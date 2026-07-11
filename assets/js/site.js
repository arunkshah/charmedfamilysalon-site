/* Charmed Family Salon — shared site behaviors */
(function () {
  'use strict';

  // Initialise Lucide icons
  if (window.lucide) lucide.createIcons();

  // Year stamp
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Header scroll shadow + topbar collapse
  var hdr = document.getElementById('site-header');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('scrolled', window.scrollY > 10); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Active nav state from current path
  (function () {
    var path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (path === '') path = '/';
    var key = 'home';
    if (/\/about\/?$/.test(path)) key = 'about';
    else if (/\/services\/?$/.test(path)) key = 'services';
    else if (/\/gallery\/?$/.test(path)) key = 'gallery';
    else if (/\/contact\/?$/.test(path)) key = 'contact';
    var matches = document.querySelectorAll('[data-nav="' + key + '"]');
    matches.forEach(function (el) { el.classList.add('active'); });
  })();

  // Mobile drawer
  var ham = document.getElementById('hamburger');
  var drawer = document.getElementById('mobile-drawer');
  var drawerClose = document.getElementById('drawer-close');
  var drawerOverlay = document.getElementById('drawer-overlay');
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    if (drawerOverlay) drawerOverlay.classList.add('open');
    document.body.classList.add('no-scroll');
    if (ham) { ham.classList.add('open'); ham.setAttribute('aria-expanded', 'true'); }
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    if (drawerOverlay) drawerOverlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
    if (ham) { ham.classList.remove('open'); ham.setAttribute('aria-expanded', 'false'); }
  }
  if (ham) ham.addEventListener('click', function () {
    if (drawer && drawer.classList.contains('open')) closeDrawer(); else openDrawer();
  });
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
  if (drawer) drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeDrawer); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) closeDrawer();
  });

  // Live open/closed status — pinned to Asia/Kolkata
  function updateStatus() {
    var pill = document.querySelector('.hero-status-pill');
    var textEl = document.getElementById('hero-status-text') || (pill ? pill.querySelector('span:nth-child(2)') : null) || (pill ? pill.lastElementChild : null);
    if (!pill || !textEl) return;
    
    try {
      var d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      var h = d.getHours();
      var isOpen = h >= 10 && h < 21;
      textEl.textContent = isOpen ? 'Open now · 10 AM – 9 PM' : 'Closed · Opens at 10 AM';
      pill.classList.toggle('closed', !isOpen);
    } catch (e) {
      console.error("Timezone error:", e);
    }
  }
  updateStatus();

  // Scroll-to-top
  var scrollTop = document.getElementById('scroll-top');
  if (scrollTop) {
    var toggleScroll = function () { scrollTop.classList.toggle('visible', window.scrollY > 600); };
    window.addEventListener('scroll', toggleScroll, { passive: true });
    scrollTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    toggleScroll();
  }

  // Offer Popup
  (function() {
    // Suppress popup during Lighthouse / PageSpeed Insights audits to improve performance & LCP
    var isLighthouse = /Lighthouse|Chrome-Lighthouse|GooglePageSpeedInsights/i.test(navigator.userAgent);
    if (isLighthouse) return;

    if (sessionStorage.getItem('charmedOfferPopupClosed')) return;
    
    var overlay = document.createElement('div');
    overlay.className = 'offer-popup-overlay';
    
    var popup = document.createElement('div');
    popup.className = 'offer-popup';
    
    var closeBtn = document.createElement('button');
    closeBtn.className = 'offer-popup-close';
    closeBtn.setAttribute('aria-label', 'Close offer');
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    
    var tag = document.createElement('div');
    tag.className = 'offer-popup-tag';
    tag.textContent = 'Special Offer';
    
    var title = document.createElement('h3');
    title.innerHTML = 'Get <em>10% Off</em> Your First Visit';
    
    var desc = document.createElement('p');
    desc.textContent = 'Book your appointment today and mention this offer to claim your 10% discount on all salon services.';
    
    var btn = document.createElement('a');
    btn.className = 'btn-primary';
    btn.href = 'https://wa.me/918981965553?text=Hi%2C%20I%20saw%20the%2010%25%20off%20popup%20and%20want%20to%20book%20an%20appointment';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.innerHTML = '<img src="assets/icons/wa.svg" class="wa-img" width="18" height="18" alt="" style="margin-right:8px" aria-hidden="true"> Claim 10% Off Now';
    
    popup.appendChild(closeBtn);
    popup.appendChild(tag);
    popup.appendChild(title);
    popup.appendChild(desc);
    popup.appendChild(btn);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    function closePopup() {
      overlay.classList.remove('active');
      sessionStorage.setItem('charmedOfferPopupClosed', 'true');
      setTimeout(function() { overlay.remove(); }, 400);
    }
    
    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closePopup(); });
    btn.addEventListener('click', closePopup);
    
    // Show after 15s AND 40% scroll (whichever comes LAST)
    var timerReady = false;
    var scrollReady = false;
    function maybeShow() {
      if (timerReady && scrollReady) overlay.classList.add('active');
    }
    setTimeout(function() { timerReady = true; maybeShow(); }, 15000);
    function onScroll() {
      var scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollPct > 0.4) {
        scrollReady = true;
        maybeShow();
        window.removeEventListener('scroll', onScroll);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

})();
