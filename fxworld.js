/* FitYab — horizontal world assembler (fxworld.js) v1
   Chapters -> one pinned side-scrolling world. FAQ and footer stay vertical.
   >=900px + motion: pin + dynamic travel + HUD + FX3D camera sync.
   <900px: never assembled, DOM untouched, fx3d.js not loaded. */
(function () {
  'use strict';

  var root = document.documentElement;
  var FX = window.FX;
  if (!FX || FX.reduced) return;
  if (window.matchMedia('(max-width: 899px)').matches) return;

  var CHAPTERS = [
    { sel: '#hero', label: 'Hero' },
    { sel: '.ab-marquee', label: 'Strip' },
    { sel: '#why', label: 'Why FitYab' },
    { sel: '#how', label: '4 Steps' },
    { sel: '#programs', label: 'Programs' },
    { sel: '#find-plan', label: 'Find Your Plan' },
    { sel: '#ai-chat', label: 'AI Chat' },
    { sel: '#supplements', label: 'Supplements' },
    { sel: '#clothing', label: 'Clothing' },
    { sel: '#results', label: 'Results' },
    { sel: '#cta', label: 'CTA' }
  ];

  var main = document.querySelector('main.ab-main');
  if (!main) return;

  var world = document.createElement('section');
  world.className = 'fxw';
  world.id = 'fxWorld';
  world.setAttribute('aria-label', 'FitYab - scroll through the chapters');

  var viewport = document.createElement('div');
  viewport.className = 'fxw-viewport';

  var track = document.createElement('div');
  track.className = 'fxw-track';

  var HUD = document.createElement('div');
  HUD.className = 'fxw-ui';
  HUD.setAttribute('aria-hidden', 'true');
  HUD.innerHTML = '<span class="lab" id="fxwLab">Hero</span>' +
    '<span class="bar"><i id="fxwBar"></i></span>' +
    '<span class="cnt" id="fxwCnt"></span>';
  world.appendChild(viewport);
  viewport.appendChild(track);
  world.appendChild(HUD);

  function wrapPanel(els, label) {
    var p = document.createElement('div');
    p.className = 'fxw-panel';
    p.dataset.label = label;
    els.forEach(function (el) { p.appendChild(el); });
    return p;
  }

  CHAPTERS.forEach(function (ch) {
    var el = main.querySelector(ch.sel);
    if (!el) return;
    track.appendChild(wrapPanel([el], ch.label));
  });

  /* stats strip belongs with the hero chapter */
  var statsSection = main.querySelector('.ab-stats');
  if (statsSection) {
    var heroPanel = track.firstElementChild;
    if (heroPanel) heroPanel.appendChild(statsSection);
  }

  main.insertBefore(world, main.firstElementChild);
  root.classList.add('fxw-on');

  var panels = [].slice.call(track.children).filter(function (p) {
    return p.classList.contains('fxw-panel');
  });
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var bar = document.getElementById('fxwBar');
  var lab = document.getElementById('fxwLab');
  var cnt = document.getElementById('fxwCnt');
  cnt.textContent = '01 / ' + pad(panels.length);

  var gsap = FX.gsap;
  var dist = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };

  var progressObj = { p: 0 };
  var last = -1;

  gsap.to(track, {
    x: function () { return -dist(); },
    ease: 'none',
    scrollTrigger: {
      trigger: world,
      start: 'top top',
      end: function () { return '+=' + dist(); },
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        progressObj.p = self.progress;
        gsap.set(bar, { scaleX: self.progress });
        var i = Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1)));
        if (i !== last) {
          last = i;
          lab.textContent = panels[i].dataset.label || '';
          cnt.textContent = pad(i + 1) + ' / ' + pad(panels.length);
        }
      }
    }
  });

  /* 3D: camera follows the same progress */
  var s = document.createElement('script');
  s.src = 'fx3d.js';
  s.onload = function () {
    if (window.FX3D && window.FX3D.on) {
      window.FX3D.start({
        getProgress: function () { return progressObj.p; },
        getWorldWidth: function () { return track.scrollWidth; }
      });
    }
  };
  document.head.appendChild(s);

  /* resize safety across the 900px breakpoint */
  var mm = window.matchMedia('(min-width: 900px)');
  function onMQ(e) {
    if (!e.matches) location.reload();
    else if (FX.ScrollTrigger) FX.ScrollTrigger.refresh();
  }
  if (mm.addEventListener) mm.addEventListener('change', onMQ);
  else if (mm.addListener) mm.addListener(onMQ);
})();
