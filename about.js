/* ==========================================================================
   FitYab — About page script. Requires fx.js (loaded first) for motion;
   the compare slider and values tabs work even without it.
   ========================================================================== */
(function () {
  'use strict';

  var fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Before / after slider ---------- */
  (function () {
    var ba = document.getElementById('ba');
    if (!ba) return;
    var range = ba.querySelector('.ba-range');
    var set = function () { ba.style.setProperty('--pos', range.value + '%'); };
    range.addEventListener('input', set);
    set();
  })();

  /* ---------- Values index (tabs) ---------- */
  (function () {
    var tabs = $$('.v-btn');
    var panels = $$('.v-panel');
    if (!tabs.length) return;
    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[k].classList.toggle('on', on);
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('mouseenter', function () { if (fineMQ.matches) select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length;
        if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); select((i + 1) % n, true); }
        else if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); select((i - 1 + n) % n, true); }
        else if (k === 'Home') { e.preventDefault(); select(0, true); }
        else if (k === 'End') { e.preventDefault(); select(n - 1, true); }
      });
    });
  })();

  /* ---------- Journey: pinned horizontal gallery ---------- */
  var FX = window.FX;
  if (!FX || FX.reduced) return;

  var gsap = FX.gsap, $ = FX.$;
  var journey = $('#journey');
  if (!journey) return;

  FX.hscroll({
    section: journey,
    viewport: $('#jView'),
    track: $('#jTrack'),
    bar: $('#jBar'),
    label: $('#jLab'),
    count: $('#jCnt'),
    panelSel: '.j-panel',
    onTravel: function (travel) {
      var track = $('#jTrack');

      // photo wipes in + drifts, driven by the horizontal travel itself
      $$('.j-photo.reveal', track).forEach(function (fig) {
        var panel = fig.closest('.j-panel');
        gsap.fromTo(fig, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: travel, start: 'left 92%', end: 'left 45%', scrub: true } });
        var img = $('img', fig);
        if (img) gsap.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: travel, start: 'left right', end: 'right left', scrub: true } });
      });

      $$('[data-year]', track).forEach(function (yr) {
        gsap.fromTo(yr, { xPercent: 18 }, { xPercent: -18, ease: 'none',
          scrollTrigger: { trigger: yr.closest('.j-panel'), containerAnimation: travel, start: 'left right', end: 'right left', scrub: true } });
      });

      $$('.j-copy', track).forEach(function (c) {
        if (c.closest('.j-intro')) return;
        gsap.fromTo(c, { opacity: 0, x: 60 }, { opacity: 1, x: 0, ease: 'none',
          scrollTrigger: { trigger: c.closest('.j-panel'), containerAnimation: travel, start: 'left 85%', end: 'left 50%', scrub: true } });
      });

      /* ---------- Journey-only 3D camera sync (desktop only) ----------
         Keep the existing Journey pin as the sole horizontal story. The
         Three.js canvas is loaded only while this gallery is active; the
         surrounding About page remains a normal vertical page. */
      if (!window.matchMedia('(min-width: 900px)').matches || window.__fityabJourney3D) return;
      window.__fityabJourney3D = true;

      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'fx3d.css';
      document.head.appendChild(css);

      var script = document.createElement('script');
      script.src = 'fx3d.js';
      script.onload = function () {
        var fx3d = window.FX3D;
        var journeyST = travel && travel.scrollTrigger;
        if (!fx3d || !fx3d.on || !journeyST) return;

        /* Scroll progress of the pinned Journey drives the camera position. */
        fx3d.start({
          getProgress: function () { return journeyST.progress || 0; },
          getWorldWidth: function () { return track.scrollWidth; }
        });

        /* Pause rendering while this Journey is outside the viewport. */
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) fx3d.resume();
              else fx3d.pause();
            });
          }, { threshold: 0 });
          io.observe(journey);
        }
      };
      script.onerror = function () {
        if (window.console) console.info('[FitYab Journey] 3D unavailable: fx3d.js could not load.');
      };
      document.head.appendChild(script);
    }
  });
})();
