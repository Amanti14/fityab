/* ==========================================================================
   FitYab — shared cinematic engine (fx.js)
   Used by the Home and About pages. Page scripts (home.js / about.js) load
   AFTER this file and use  window.FX  for anything page-specific.

   Lenis (smooth scroll) + GSAP ScrollTrigger, wired together. Degrades:
     - no GSAP / script error  -> html.anim removed, page is plain & fully visible
     - prefers-reduced-motion  -> no Lenis, no pin, no parallax, no overlay
     - touch / small screens   -> native swipe gallery instead of the pinned scroll

   Markup hooks (all optional):
     .sp.chars / .sp.words  split text            .rv / .rvp   reveal on scroll
     .num-up[data-to]       count-up number       [data-px]    horizontal parallax (hero lines)
     [data-py]              vertical parallax     [data-pimg]  image drift inside its frame
     [data-cursor="LABEL"]  cursor label          [data-magnetic] magnetic button
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');

  function fail() { root.classList.remove('anim'); }

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  if (!window.gsap || !window.ScrollTrigger) { fail(); return; }

  try { init(); } catch (err) {
    if (window.console) console.error('[fx] motion disabled:', err);
    fail();
    window.FX = undefined;
  }

  function init() {
    var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    var reduced = reduceMQ.matches;
    window.__abReady = true;

    splitText();
    initCounters(gsap, ScrollTrigger, reduced);

    var FX = window.FX = {
      gsap: gsap, ScrollTrigger: ScrollTrigger, lenis: null, mm: null,
      reduced: reduced, fine: fineMQ, $: $, $$: $$, pad: pad,
      hscroll: function () {}   // replaced below when motion is allowed
    };

    if (reduced) { root.classList.remove('anim'); return; }

    /* ------------------------------------------------------------------
       Lenis <-> ScrollTrigger
       ------------------------------------------------------------------ */
    var lenis = null;
    if (window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    FX.lenis = lenis;
    FX.scrollTo = function (target, opts) {
      var el = typeof target === 'string' ? $(target) : target;
      if (!el) return;
      if (lenis) lenis.scrollTo(el, opts || { offset: 0, duration: 1.4 });
      else el.scrollIntoView({ behavior: 'smooth' });
    };

    /* In-page anchors */
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var target = id.length > 1 ? $(id) : null;
        if (!target) return;
        e.preventDefault();
        FX.scrollTo(target);
      });
    });

    /* ------------------------------------------------------------------
       Page-enter wipe, then start the reveals
       ------------------------------------------------------------------ */
    var pt = $('#pt'), ptR = $('.pt-r'), ptK = $('.pt-k');
    var revealsStarted = false;
    function startReveals() {
      if (revealsStarted) return;
      revealsStarted = true;
      observeReveals();
    }
    if (pt) {
      pt.style.animation = 'none';
      gsap.set(pt, { visibility: 'visible' });
      gsap.set([ptR, ptK], { clipPath: 'inset(0% 0% 0% 0%)' });
      gsap.timeline({ delay: 0.15, onComplete: function () { gsap.set(pt, { visibility: 'hidden' }); } })
        .fromTo(ptK.firstElementChild, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
        .to(ptK, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' }, '+=0.15')
        .to(ptR, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' }, '<0.12')
        .add(startReveals, '<0.45');
      setTimeout(startReveals, 3000);
    } else {
      startReveals();
    }

    window.addEventListener('pageshow', function (e) {   // back/forward cache
      if (e.persisted && pt) {
        gsap.set(pt, { visibility: 'hidden' });
        gsap.set([ptR, ptK], { clipPath: 'inset(0% 0% 100% 0%)' });
        if (lenis) lenis.start();
      }
    });

    /* ------------------------------------------------------------------
       Leaving: cover the screen, then navigate (internal links only)
       ------------------------------------------------------------------ */
    var leaving = false;
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || !pt || leaving) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (_) { return; }
      if (url.protocol !== location.protocol || url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      leaving = true;
      if (lenis) lenis.stop();
      gsap.set(pt, { visibility: 'visible' });
      gsap.set([ptR, ptK], { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.timeline({ onComplete: function () { location.href = url.href; } })
        .to(ptR, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.inOut' })
        .to(ptK, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.inOut' }, '<0.1')
        .fromTo(ptK.firstElementChild, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }, '<0.25');
      setTimeout(function () { location.href = url.href; }, 2200);
    });

    /* ------------------------------------------------------------------
       Generic scroll effects (attribute driven)
       ------------------------------------------------------------------ */
    var mm = gsap.matchMedia();
    FX.mm = mm;

    mm.add({ big: '(min-width: 900px)', small: '(max-width: 899px)' }, function (ctx) {
      var k = ctx.conditions.big ? 1 : 0.5;

      // [data-px="-6"]  -> horizontal drift across the hero
      $$('[data-px]').forEach(function (el) {
        var host = el.closest('.ab-hero') || el.parentNode;
        gsap.to(el, { xPercent: parseFloat(el.dataset.px) * k, ease: 'none',
          scrollTrigger: { trigger: host, start: 'top top', end: 'bottom top', scrub: true } });
      });

      // [data-py="-14"] -> vertical drift (percent of own height) over its section
      $$('[data-py]').forEach(function (el) {
        var host = el.closest('section') || el.parentNode;
        var inHero = !!el.closest('.ab-hero');
        gsap.to(el, { yPercent: parseFloat(el.dataset.py) * k, ease: 'none',
          scrollTrigger: { trigger: host, start: inHero ? 'top top' : 'top bottom', end: 'bottom top', scrub: true } });
      });

      // [data-pimg] -> image drifts inside its masked frame
      $$('[data-pimg]').forEach(function (img) {
        if (img.closest('.j-viewport, .hs-viewport')) return;   // gallery images handled by hscroll
        var amt = parseFloat(img.dataset.pimg) || 5;
        var host = img.parentNode;
        var inHero = !!img.closest('.ab-hero');
        gsap.fromTo(img, { yPercent: -amt * k }, { yPercent: amt * k, ease: 'none',
          scrollTrigger: { trigger: host, start: inHero ? 'top top' : 'top bottom', end: 'bottom top', scrub: true } });
      });

      // Any .sp.words paragraph lights up word by word as you scroll past
      $$('.sp.words').forEach(function (p) {
        var words = $$('.swd', p);
        if (!words.length) return;
        gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.12,
          scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 48%', scrub: true } });
      });
    });

    /* ------------------------------------------------------------------
       Pinned horizontal gallery (desktop) — swipe gallery on touch
       cfg: { section, viewport, track, bar, label, count, pinnedClass,
              onTravel(travel, panels) }
       ------------------------------------------------------------------ */
    FX.hscroll = function (cfg) {
      var section = cfg.section, viewport = cfg.viewport, track = cfg.track;
      if (!section || !viewport || !track) return;
      var pinnedClass = cfg.pinnedClass || 'is-pinned';

      mm.add('(min-width: 900px)', function () {
        section.classList.add(pinnedClass);
        var panels = $$(cfg.panelSel || '.j-panel, .hs-panel', track);
        var last = -1;
        var dist = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };

        var travel = gsap.to(track, {
          x: function () { return -dist(); },
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: function () { return '+=' + dist(); },
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: function (self) {
              if (cfg.bar) gsap.set(cfg.bar, { scaleX: self.progress });
              var i = Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1)));
              if (i !== last) {
                last = i;
                if (cfg.label) cfg.label.textContent = panels[i].dataset.label || '';
                if (cfg.count) cfg.count.textContent = pad(i + 1) + ' / ' + pad(panels.length);
              }
            }
          }
        });
        if (cfg.count) cfg.count.textContent = '01 / ' + pad(panels.length);
        if (cfg.onTravel) cfg.onTravel(travel, panels);

        return function () { section.classList.remove(pinnedClass); };
      });
    };

    /* Fonts + images change layout width -> recalculate once they settle */
    var refresh = function () { ScrollTrigger.refresh(); };
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

    initCursor(gsap);
    initMagnetic(gsap);

    /* ---------- reveals ---------- */
    function observeReveals() {
      var targets = $$('.sp.chars, .rv, .rvp');
      // Hero is on screen at load: reveal it directly, in sequence
      var hero = $('.ab-hero');
      var seq = 0;
      targets = targets.filter(function (t) {
        if (hero && hero.contains(t)) {
          t.style.transitionDelay = (seq++ * 120) + 'ms';
          t.classList.add('in');
          return false;
        }
        return true;
      });
      if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('in'); }); return; }
      // An element clipped to nothing (.rvp) has no visible area for the observer,
      // so watch its parent and reveal the child when the parent comes into view.
      var map = new Map();
      targets.forEach(function (t) {
        var o = t.classList.contains('rvp') ? t.parentNode : t;
        if (!map.has(o)) map.set(o, []);
        map.get(o).push(t);
      });
      var io = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (en) {
          if (en.isIntersecting || en.boundingClientRect.top < 0) {
            (map.get(en.target) || []).forEach(function (t) {
              t.style.transitionDelay = (n++ * 70) + 'ms';
              t.classList.add('in');
            });
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
      map.forEach(function (_, o) { io.observe(o); });
    }
  }

  /* ======================================================================
     Helpers
     ====================================================================== */

  // Split headings / paragraphs into masked chars or words
  // (screen readers get a plain visually-hidden copy; the pieces are aria-hidden)
  function splitText() {
    $$('.sp').forEach(function (el) {
      var chars = el.classList.contains('chars');
      var text = el.textContent.replace(/\s+/g, ' ').trim();
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      var idx = 0;

      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (tok) {
              if (!tok) return;
              if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span');
              w.className = 'sw';
              w.setAttribute('aria-hidden', 'true');
              if (chars) {
                Array.prototype.forEach.call(tok, function (ch) {
                  var c = document.createElement('span');
                  c.className = 'sc';
                  c.textContent = ch;
                  c.style.transitionDelay = (idx++ * 22) + 'ms';
                  w.appendChild(c);
                });
              } else {
                w.classList.add('swd');
                w.textContent = tok;
              }
              frag.appendChild(w);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1 && !n.classList.contains('sw') && !n.classList.contains('sr-only')) {
            if (n.tagName === 'BR') return;
            walk(n);
          }
        });
      })(el);

      el.classList.add(chars ? 'chars' : 'words');
      el.insertBefore(sr, el.firstChild);
    });
  }

  function initCounters(gsap, ScrollTrigger, reduced) {
    $$('.num-up').forEach(function (el) {
      var to = parseFloat(el.dataset.to);
      if (reduced || isNaN(to)) return;
      var o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(o, { v: to, duration: 2, ease: 'power3.out',
            onUpdate: function () { el.textContent = Math.round(o.v); },
            onComplete: function () { el.textContent = to; } });
        }
      });
    });
  }

  function initCursor(gsap) {
    var cur = document.getElementById('cur');
    if (!cur || !fineMQ.matches) return;
    root.classList.add('has-cursor');
    var ring = cur.querySelector('.cur-ring'), dot = cur.querySelector('.cur-dot'), label = ring.querySelector('span');
    var rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    var dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' });
    cur.classList.add('is-hidden');

    window.addEventListener('mousemove', function (e) {
      cur.classList.remove('is-hidden');
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.classList.add('is-hidden'); });

    document.addEventListener('mouseover', function (e) {
      var lab = e.target.closest && e.target.closest('[data-cursor]');
      var link = e.target.closest && e.target.closest('a, button, input, [data-magnetic]');
      cur.classList.toggle('is-label', !!lab);
      cur.classList.toggle('is-link', !lab && !!link);
      label.textContent = lab ? lab.getAttribute('data-cursor') : '';
    });
  }

  function initMagnetic(gsap) {
    if (!fineMQ.matches) return;
    $$('[data-magnetic]').forEach(function (el) {
      var x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      var y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * 0.28);
        y((e.clientY - (r.top + r.height / 2)) * 0.28);
      });
      el.addEventListener('mouseleave', function () { x(0); y(0); });
    });
  }
})();
