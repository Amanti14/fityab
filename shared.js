/* ==========================================================================
   FitYab — shared header & footer
   Edit the NAV_LINKS array (and the footer markup below) to change the
   navigation or footer on EVERY page at once. Each page just needs:
     <div id="site-header"></div> ... <script src="shared.js"></script>
     <div id="site-footer"></div> ... <script>SiteInclude.renderFooter();</script>
   ========================================================================== */
(function () {
  var LOGO_URL = 'https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/047625f7-6c76-422e-df4b-9de3f23a0f00/publicContain';

  var NAV_LINKS = [
    { href: 'fityab.html', label: 'Home' },
    { href: 'about.html', label: 'About' },
    { href: 'online-coaching.html', label: 'Online Coaching' },
    { href: 'supplements.html', label: 'Supplements' },
    { href: 'e11even.html', label: 'E11even Clothing' },
    { href: 'transformations.html', label: 'Transformations' }
  ];

  var current = (location.pathname.split('/').pop() || 'fityab.html');
  if (current === '') current = 'fityab.html';

  // Only the shop pages have a working cart (openCart()/cartCount are
  // defined in those pages' own <script> blocks). Add the cart button
  // there only, everywhere else just show the CTA.
  var SHOP_PAGES = ['supplements.html', 'e11even.html'];
  var isShopPage = SHOP_PAGES.indexOf(current) !== -1;

  function navLinksHTML(cls) {
    return NAV_LINKS.map(function (l) {
      var active = (l.href === current) ? ' active' : '';
      return '<a href="' + l.href + '" class="' + cls + active + '">' + l.label + '</a>';
    }).join('');
  }

  function renderHeader() {
    var el = document.getElementById('site-header');
    if (!el) return;

    var cartBtn = isShopPage
      ? '<button class="cart-icon-btn" onclick="openCart()" aria-label="Open cart">' +
          '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>' +
          'Cart<span class="cart-count" id="cartCount">0</span>' +
        '</button>'
      : '';
    var mobCartBtn = isShopPage
      ? '<button class="mob-cta" onclick="openCart()">View Cart (<span id="cartCountMob">0</span>)</button>'
      : '';

    el.innerHTML =
      '<div class="wrap"><div class="hdr">' +
        '<a href="fityab.html" class="logo"><img src="' + LOGO_URL + '" alt="FitYab"/></a>' +
        '<nav class="desk-nav">' +
          navLinksHTML('nav-a') +
          cartBtn +
          '<a href="online-coaching.html" class="btn btn-red">Start Your Transformation</a>' +
        '</nav>' +
        '<button class="mob-btn" id="menuBtn" aria-label="Menu">' +
          '<svg width="30" height="30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>' +
        '</button>' +
      '</div></div>' +
      '<div class="mob-menu" id="mobMenu"><div class="mob-inner">' +
        navLinksHTML('mob-a') +
        mobCartBtn +
        '<a href="online-coaching.html" class="btn btn-red" style="text-align:center;justify-content:center;margin-top:.5rem;">Start Your Transformation</a>' +
      '</div></div>';

    var menuBtn = document.getElementById('menuBtn');
    var mobMenu = document.getElementById('mobMenu');
    if (menuBtn && mobMenu) {
      menuBtn.addEventListener('click', function () {
        mobMenu.classList.toggle('open');
      });
      mobMenu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { mobMenu.classList.remove('open'); });
      });
    }
  }

  function renderFooter() {
    var el = document.getElementById('site-footer');
    if (!el) return;

    var quickLinks = NAV_LINKS
      .filter(function (l) { return l.href !== 'fityab.html'; })
      .map(function (l) { return '<a href="' + l.href + '">' + l.label + '</a>'; })
      .join('');

    el.innerHTML =
      '<div class="fwrap"><div class="fgrid">' +
        '<div>' +
          '<div class="flogo"><img src="' + LOGO_URL + '" alt="FitYab"/></div>' +
          '<p class="fdesc">Transform your body with professional coaching, premium supplements, and fitness gear. Your journey to a stronger, healthier you starts here.</p>' +
          '<div class="socrow">' +
            '<a href="#" class="socbtn" aria-label="Twitter"><svg viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></a>' +
            '<a href="#" class="socbtn" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>' +
            '<a href="#" class="socbtn" aria-label="YouTube"><svg viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg></a>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="fcoltitle">Quick Links</div>' +
          '<div class="flinks">' + quickLinks + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="fcoltitle">Contact</div>' +
          '<div class="contact-row"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg><span>info@fityab.com</span></div>' +
          '<div class="contact-row"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><span>+1 (555) 123-4567</span></div>' +
          '<a href="online-coaching.html" class="btn btn-red" style="margin-top:.5rem;display:inline-flex;font-size:.9rem;padding:.55rem 1.2rem;">Get In Touch</a>' +
        '</div>' +
      '</div>' +
      '<div class="fbar">' +
        '<p class="fcopy">\u00A9 2026 FitYab. All rights reserved.</p>' +
        '<div class="fpol"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Shipping Policy</a></div>' +
      '</div></div>';
  }

  // Header renders itself as soon as this file loads (its placeholder div
  // is already on the page by then). Footer is rendered on demand because
  // its placeholder sits lower in the page, after this script tag.
  renderHeader();
  window.SiteInclude = { renderFooter: renderFooter };
})();
