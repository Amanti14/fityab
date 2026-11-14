/* ==========================================================================
   FitYab — Home page script. Requires fx.js (loaded first) for motion;
   the chat demo works even without it.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- AI chat demo ---------- */
  var chatMessages = $('#chatMessages');
  var input = $('#chatInputField');
  var sendBtn = $('#chatSendBtn');

  if (chatMessages && input && sendBtn) {
    // Re-use the existing bubbles as templates so avatars/styling stay identical.
    var userTpl = $('.chat-msg.user', chatMessages);
    var aiTpl = $('.chat-msg:not(.user)', chatMessages);

    var addMessage = function (tpl, text) {
      var node = tpl.cloneNode(true);
      var bubble = $('.msg-bubble', node);
      bubble.textContent = text;            // textContent: visitor input is never parsed as HTML
      chatMessages.appendChild(node);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    var send = function () {
      var text = input.value.trim();
      if (!text || !userTpl || !aiTpl) return;
      addMessage(userTpl, text);
      input.value = '';
      setTimeout(function () {
        addMessage(aiTpl, 'Thanks for your question! Our full AI chat is coming soon. In the meantime, check out our coaching programs for personalized guidance! 💪');
      }, 800);
    };

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    chatMessages.setAttribute('aria-live', 'polite');
    sendBtn.setAttribute('aria-label', 'Send message');
    input.setAttribute('aria-label', 'Ask the FitYab AI assistant');
  }

  /* Both "Chat with AI" buttons take you to the live chat box and focus it */
  $$('[data-open-chat]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = $('#ai-chat');
      if (!target) return;
      var FX = window.FX;
      if (FX && FX.scrollTo) FX.scrollTo(target, { offset: 0, duration: 1.2 });
      else target.scrollIntoView({ behavior: 'smooth' });
      setTimeout(function () { if (input) input.focus({ preventScroll: true }); }, 1100);
    });
  });


  /* ---------- Compact navbar after a little scrolling ---------- */
  (function () {
    var onScroll = function () { document.body.classList.toggle('hdr-compact', window.scrollY > 60); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ---------- Plan finder: goal -> matching program (reads the program cards, so
     prices and features only ever need editing in one place) ---------- */
  (function () {
    var goals = $$('.hm-goal');
    var box = $('#planMatch');
    var panels = $$('.hs-prog');
    if (!goals.length || !box || panels.length < goals.length) return;

    var empty = $('.hm-match-empty', box);
    var card = $('.hm-match-card', box);
    var k = function (sel) { return $(sel, card); };

    function show(i) {
      var panel = panels[i];
      if (!panel) return;
      goals.forEach(function (g, n) {
        g.setAttribute('aria-checked', n === i ? 'true' : 'false');
        g.tabIndex = n === i ? 0 : -1;
      });
      card.style.setProperty('--pc', panel.style.getPropertyValue('--pc') || '#DC2626');
      k('.hm-match-name').textContent = $('.hs-title', panel).textContent;
      k('.hm-match-desc').textContent = $('.hs-desc', panel).textContent;
      var feat = k('.hm-match-feat');
      feat.textContent = '';
      $$('.hs-feat li', panel).forEach(function (li) {
        var n = document.createElement('li');
        n.textContent = li.textContent.trim();
        feat.appendChild(n);
      });
      var price = k('.hm-match-price');
      price.textContent = '';
      Array.prototype.forEach.call($('.hs-price', panel).childNodes, function (n) { price.appendChild(n.cloneNode(true)); });
      empty.hidden = true;
      card.hidden = false;
      // replay the entrance animation on every change
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    }

    goals.forEach(function (g, i) {
      g.tabIndex = i === 0 ? 0 : -1;
      g.addEventListener('click', function () { show(i); });
      g.addEventListener('keydown', function (e) {
        var n = goals.length, to = -1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') to = (i + 1) % n;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = (i - 1 + n) % n;
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); show(i); return; }
        if (to > -1) { e.preventDefault(); show(to); goals[to].focus(); }
      });
    });
  })();

  /* ---------- Client results wall: shows itself only when result photos exist.
     Drop images/result-1.jpg ... images/result-6.jpg into the images folder. ---------- */
  (function () {
    var section = $('#results'), grid = $('#resGrid');
    if (!section || !grid) return;
    var max = 6, found = new Array(max), pending = max;

    function settle() {
      if (--pending > 0) return;
      var shown = 0;
      found.forEach(function (src, i) {
        if (!src) return;
        var fig = document.createElement('figure');
        fig.className = 'hm-res';
        fig.style.animationDelay = (shown * 90) + 'ms';
        var img = document.createElement('img');
        img.src = src;
        img.alt = 'FitYab client transformation, photo ' + (i + 1);
        img.loading = 'lazy';
        img.decoding = 'async';
        fig.appendChild(img);
        grid.appendChild(fig);
        shown++;
      });
      if (shown) {
        section.hidden = false;
        // page got taller above later scroll triggers -> recalculate
        if (window.FX && window.FX.ScrollTrigger) window.FX.ScrollTrigger.refresh();
      }
    }

    for (var i = 1; i <= max; i++) {
      (function (n) {
        var probe = new Image();
        probe.onload = function () { found[n - 1] = probe.src; settle(); };
        probe.onerror = function () { settle(); };
        probe.src = 'images/result-' + n + '.jpg';
      })(i);
    }
  })();

  /* ---------- Motion beyond this point needs the engine ---------- */
  var FX = window.FX;
  if (!FX || FX.reduced) return;

  var gsap = FX.gsap;

  /* ---------- How it works: the connecting line draws as you scroll ---------- */
  var fill = $('#stepsFill');
  var stepsWrap = $('.hm-steps-wrap');
  if (fill && stepsWrap) {
    FX.mm.add({ wide: '(min-width: 900px)', narrow: '(max-width: 899px)' }, function (ctx) {
      var wide = ctx.conditions.wide;
      var to = { ease: 'none', scrollTrigger: { trigger: stepsWrap, start: 'top 75%', end: 'bottom 55%', scrub: true } };
      if (wide) to.scaleX = 1; else to.scaleY = 1;
      gsap.fromTo(fill, wide ? { scaleX: 0 } : { scaleY: 0 }, to);
    });
  }

  var section = $('#programs');
  if (!section) return;

  /* ======================================================================
     DESKTOP (>=900px): the futuristic side-scrolling 3D world.
     fxworld.js assembles the chapters into one pinned horizontal track and
     pulls in fx3d.js (Three.js scene) itself. If WebGL or vendor/three.min.js
     is unavailable, fx3d.js shows the reason on screen and the world still
     runs on GSAP alone — never a blank page.
     PHONES/TABLETS: unchanged — the existing pinned/swipe programs gallery.
     ====================================================================== */
  if (window.matchMedia('(min-width: 900px)').matches) {

    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'fx3d.css';
    document.head.appendChild(css);

    /* Labelled subject-slot fallback for the hero (visible only when the 3D
       layer is off — see .fx-subject-fallback in fx3d.css). The real trainer
       media goes in images/ or videos/ and is picked up automatically. */
    var hero = $('#hero');
    if (hero) {
      var fb = document.createElement('div');
      fb.className = 'fx-subject-fallback';
      fb.setAttribute('aria-hidden', 'true');
      fb.innerHTML =
        '<svg viewBox="0 0 200 400" fill="none" stroke="rgba(220,38,38,.55)" stroke-width="3" stroke-dasharray="10 8">' +
          '<circle cx="100" cy="58" r="24"/>' +
          '<path d="M60 120 L140 120 L150 220 L130 225 L115 265 L125 385 L85 385 L95 265 L80 225 L60 220 Z"/>' +
          '<path d="M60 120 L30 215 M140 120 L170 215"/>' +
        '</svg>' +
        '<span style="font:700 .62rem/1.6 ui-monospace,Menlo,monospace;letter-spacing:.08em;color:var(--ab-mute);text-transform:uppercase">' +
          'subject slot<br>images/person.png</span>';
      hero.appendChild(fb);
    }

    var s = document.createElement('script');
    s.src = 'fxworld.js';
    document.head.appendChild(s);
    return;
  }

  /* ---------- Programs: pinned horizontal gallery (small screens path) ---------- */
  FX.hscroll({
    section: section,
    viewport: $('#hsView'),
    track: $('#hsTrack'),
    bar: $('#hsBar'),
    label: $('#hsLab'),
    count: $('#hsCnt'),
    panelSel: '.hs-panel',
    pinnedClass: 'is-pinned',
    onTravel: function (travel) {
      var track = $('#hsTrack');

      // Card slides in as its panel arrives
      $$('.hs-prog', track).forEach(function (panel) {
        var card = $('.hs-card', panel);
        gsap.fromTo(card, { opacity: 0, x: 90 }, { opacity: 1, x: 0, ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: travel, start: 'left 96%', end: 'left 58%', scrub: true } });
      });

      // Giant outlined price drifts at a different speed
      $$('[data-hsbg]', track).forEach(function (el) {
        gsap.fromTo(el, { xPercent: 28 }, { xPercent: -28, ease: 'none',
          scrollTrigger: { trigger: el.closest('.hs-panel'), containerAnimation: travel, start: 'left right', end: 'right left', scrub: true } });
      });

      var outro = $('.hs-outro', track);
      if (outro) gsap.fromTo(outro.children, { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.12, ease: 'none',
        scrollTrigger: { trigger: outro, containerAnimation: travel, start: 'left 95%', end: 'left 60%', scrub: true } });
    }
  });
})();
