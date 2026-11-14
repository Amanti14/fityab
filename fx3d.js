/* ==========================================================================
   FitYab — shared 3D layer (fx3d.js)
   One fixed, non-interactive WebGL canvas behind the HTML content.
   Offline-safe: loads vendor/three.min.js ONLY (no CDN, ever). Every reason
   the 3D is off is shown in the on-screen readout AND logged:
     - "library missing"      vendor/three.min.js is not in the repo yet
     - "reduced motion"       visitor asked for reduced motion (static frame)
     - "WebGL unavailable"    device/browser cannot create a WebGL context
   Budget: pixelRatio capped (2 desktop / 1.5 phone), rendering pauses when
   the tab is hidden or FX3D.pause() is called, everything is disposed on
   pagehide, and webglcontextlost is handled without crashing the page.
   Public API (window.FX3D): { on, start(opts), pause(), resume(), dispose() }
     opts.getProgress()  -> 0..1 world/scroll progress (drives camera.x)
     opts.getWorldWidth() -> px width of the horizontal world (scales scene)
   ========================================================================== */
(function () {
  'use strict';

  /* ---- Hero subject slot: the owner drops files in, no code changes. ----
     Probe order: video -> transparent cut-out -> GIF -> labelled placeholder. */
  var SUBJECT = {
    video: ['videos/person.webm', 'videos/person.mp4'],
    cutout: ['images/person.png', 'images/person.webp'],
    poster: 'images/person-poster.jpg',
    gif: 'images/person.gif'
  };

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var statusEl = null;

  function log(msg, on) {
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'fx3d-status';
      statusEl.id = 'fx3dStatus';
      statusEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(statusEl);
    }
    statusEl.textContent = msg;
    statusEl.classList.add(on ? 'on' : 'off');
    if (window.console) console.info('[fx3d]', msg);
  }

  function off(msg) {
    root.classList.add('fx3d-off');
    log(msg, false);
    window.FX3D = { on: false, start: function () {}, pause: function () {}, resume: function () {}, dispose: function () {} };
  }

  /* ---- load the local three.js, then boot (no CDN fallback, ever) ---- */
  function boot() {
    if (window.THREE) { try { init(); } catch (err) { failScene(err); } return; }
    var s = document.createElement('script');
    s.src = 'vendor/three.min.js';
    s.onload = function () {
      if (!window.THREE) { off('3D OFF — LIBRARY MISSING (vendor/three.min.js)'); return; }
      try { init(); } catch (err) { failScene(err); }
    };
    s.onerror = function () { off('3D OFF — LIBRARY MISSING (vendor/three.min.js)'); };
    document.head.appendChild(s);
  }

  function failScene(err) {
    if (window.console) console.error('[fx3d] scene failed:', err);
    off('3D OFF — SCENE ERROR (' + (err && err.message ? err.message : 'unknown') + ')');
  }

  /* ---- WebGL available at all? ---- */
  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (_) { return false; }
  }

  /* ====================================================================== */
  function init() {
    if (reduced && !webglOK()) { off('3D OFF — REDUCED MOTION'); return; }
    if (!webglOK()) { off('3D OFF — WEBGL UNAVAILABLE'); return; }

    var canvas = document.createElement('canvas');
    canvas.className = 'fx3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    var isPhone = window.innerWidth < 900;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isPhone, powerPreference: 'high-performance' });
    } catch (err) { failScene(err); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isPhone ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.028);

    var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0.6, 16);

    /* ---------- lights: dim ambient, red rims, one cool key ---------- */
    scene.add(new THREE.AmbientLight(0x404040, 0.5));
    var key = new THREE.DirectionalLight(0xbfd4ff, 0.55); key.position.set(-6, 10, 8); scene.add(key);
    var rimA = new THREE.PointLight(0xDC2626, 1.4, 40); rimA.position.set(4, 3, 6); scene.add(rimA);
    var rimB = new THREE.PointLight(0x991B1B, 1.0, 36); rimB.position.set(-5, -2, 5); scene.add(rimB);

    /* ---------- world width (px -> scene units) ---------- */
    var X_RANGE = 46;
    var opts = { getProgress: function () { return 0; }, getWorldWidth: function () { return 0; } };

    /* ---------- materials ---------- */
    var mSteel = new THREE.MeshLambertMaterial({ color: 0x8a8f98 });
    var mDark = new THREE.MeshLambertMaterial({ color: 0x14161a });
    var mRed = new THREE.MeshLambertMaterial({ color: 0xDC2626, emissive: 0x5c0a0a });
    var mRedD = new THREE.MeshLambertMaterial({ color: 0x991B1B, emissive: 0x3a0707 });

    /* ---------- perspective grid floor ---------- */
    var grid = new THREE.GridHelper(240, 80, 0x571414, 0x1c0808);
    grid.position.y = -7;
    scene.add(grid);

    var animated = [];   // { mesh, fn(t, dt) }

    function floaty(mesh, speed, amp) {
      animated.push({ mesh: mesh, fn: function (t) {
        mesh.position.y = mesh.userData.y0 + Math.sin(t * speed + mesh.userData.ph) * amp;
        if (mesh.userData.spin) mesh.rotation[mesh.userData.spin] = t * mesh.userData.spinV;
      } });
      mesh.userData.y0 = mesh.position.y;
      mesh.userData.ph = Math.random() * Math.PI * 2;
    }

    /* ---------- barbell plates drifting along the whole world ---------- */
    var plateGeo = new THREE.TorusGeometry(1.15, 0.42, 10, 28);
    var plateHole = new THREE.TorusGeometry(0.55, 0.16, 8, 20);
    var nPlates = isPhone ? 5 : 9;
    for (var i = 0; i < nPlates; i++) {
      var g = new THREE.Group();
      var p = new THREE.Mesh(plateGeo, i % 3 === 0 ? mRed : (i % 3 === 1 ? mSteel : mDark));
      var h = new THREE.Mesh(plateHole, mSteel);
      g.add(p); g.add(h);
      g.position.set(-4 + (X_RANGE + 10) * (i / Math.max(1, nPlates - 1)), -3 + Math.random() * 6, -4 + Math.random() * 6);
      g.rotation.set(Math.random() * 0.6 - 0.3, Math.random() * Math.PI, Math.random() * 0.5);
      g.userData.spin = 'z'; g.userData.spinV = 0.15 + Math.random() * 0.25;
      floaty(g, 0.4 + Math.random() * 0.4, 0.35);
      scene.add(g);
    }

    /* ---------- hero chapter: rotating dumbbell ---------- */
    var dumb = new THREE.Group();
    var barGeo = new THREE.CylinderGeometry(0.18, 0.18, 5.6, 12);
    var bar = new THREE.Mesh(barGeo, mSteel); bar.rotation.z = Math.PI / 2; dumb.add(bar);
    [-2.2, 2.2].forEach(function (x) {
      [-1, 1].forEach(function (s) {
        var pl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.35, 20), mRedD);
        pl.rotation.z = Math.PI / 2; pl.position.set(x + s * 0.45, 0, 0); dumb.add(pl);
      });
    });
    dumb.position.set(1.5, 1.6, -3.5);
    dumb.userData.spin = 'x'; dumb.userData.spinV = 0.5;
    floaty(dumb, 0.6, 0.3);
    scene.add(dumb);

    /* ---------- stats chapter: holographic counter rings ---------- */
    [0, 1, 2].forEach(function (k) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.1 + k * 0.5, 0.03, 8, 40),
        new THREE.MeshBasicMaterial({ color: 0xDC2626, wireframe: false, transparent: true, opacity: 0.65 - k * 0.15 }));
      ring.position.set(4.5 + k * 1.4, 2.4, -2.5);
      ring.userData.spin = 'y'; ring.userData.spinV = 0.35 + k * 0.2;
      floaty(ring, 0.5 + k * 0.2, 0.25);
      scene.add(ring);
    });

    /* ---------- programs chapter: four glowing plan crystals ---------- */
    var planCols = [0xDC2626, 0x0EA5E9, 0x22C55E, 0xF59E0B];
    planCols.forEach(function (c, k) {
      var cr = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.95),
        new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, transparent: true, opacity: 0.92 }));
      cr.position.set(-6 + k * 4.4, 1.4, -3 + (k % 2) * 2);
      cr.userData.spin = 'y'; cr.userData.spinV = 0.6 + k * 0.12;
      floaty(cr, 0.7 + k * 0.15, 0.45);
      scene.add(cr);
    });

    /* ---------- supplements chapter: rotating tub ---------- */
    var tub = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.1, 20), mDark);
    var lid = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.35, 20), mRed);
    var band = new THREE.Mesh(new THREE.CylinderGeometry(0.87, 0.87, 0.5, 20), mRedD);
    lid.position.y = 1.2; band.position.y = 0.2;
    tub.add(body); tub.add(lid); tub.add(band);
    tub.position.set(5.2, -0.6, -1.5);
    tub.userData.spin = 'y'; tub.userData.spinV = 0.4;
    floaty(tub, 0.5, 0.3);
    scene.add(tub);

    /* ---------- clothing chapter: floating tilted garment cards ---------- */
    [0, 1, 2].forEach(function (k) {
      var card = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 3.4),
        new THREE.MeshLambertMaterial({ color: 0x0d0d0f, emissive: 0x220505, side: THREE.DoubleSide }));
      card.position.set(-1 + k * 2.6, -0.5 + k * 0.7, -2 - k);
      card.rotation.set(0.15, 0.5 - k * 0.4, 0.08);
      card.userData.spin = 'y'; card.userData.spinV = 0.1;
      floaty(card, 0.45 + k * 0.1, 0.3);
      scene.add(card);
    });

    /* ---------- E11even: extruded "11" pillars near the end ---------- */
    var pillarGeo = new THREE.BoxGeometry(0.9, 5.2, 0.9);
    var p1 = new THREE.Mesh(pillarGeo, mRed); p1.position.set(-1.2, 0.4, -3);
    var p2 = new THREE.Mesh(pillarGeo, mRedD); p2.position.set(0.4, -0.2, -3.6);
    p1.userData.spin = 'y'; p1.userData.spinV = 0.08;
    p2.userData.spin = 'y'; p2.userData.spinV = -0.08;
    floaty(p1, 0.3, 0.2); floaty(p2, 0.35, 0.2);
    scene.add(p1); scene.add(p2);

    /* ---------- drifting red dust ---------- */
    var nDust = isPhone ? 140 : 420;
    var dustGeo = new THREE.BufferGeometry();
    var pos = new Float32Array(nDust * 3);
    for (var d = 0; d < nDust; d++) {
      pos[d * 3] = -6 + Math.random() * (X_RANGE + 12);
      pos[d * 3 + 1] = -7 + Math.random() * 14;
      pos[d * 3 + 2] = -8 + Math.random() * 12;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xDC2626, size: 0.09, transparent: true, opacity: 0.55, sizeAttenuation: true }));
    scene.add(dust);

    /* ---------- hero subject slot (video -> cutout -> gif -> placeholder) ---------- */
    var subject = null;
    var glow = null;
    var glowTex = makeGlowTexture();
    function addGlow() {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xDC2626, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.scale.set(9, 9, 1);
      sp.position.set(3.1, 0.3, -0.6);
      scene.add(sp);
      glow = sp;
    }
    addGlow();

    function mountSubject(texture, aspect, isVideo) {
      var h = Math.min(5.4, 4.4 / (aspect || 0.75));
      var w = h * (aspect || 0.75);
      var mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      var plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      plane.position.set(3.1, 0.2, 0.4);
      plane.userData.isVideo = !!isVideo;
      scene.add(plane);
      subject = plane;
    }

    function placeholderTexture() {
      var c = document.createElement('canvas'); c.width = 512; c.height = 1024;
      var x = c.getContext('2d');
      x.fillStyle = 'rgba(255,255,255,.07)'; x.strokeStyle = 'rgba(220,38,38,.55)'; x.lineWidth = 3;
      x.setLineDash([14, 10]);
      // stylised bodybuilder silhouette
      x.beginPath(); x.arc(256, 150, 62, 0, Math.PI * 2); x.fill(); x.stroke();               // head
      x.beginPath(); x.moveTo(150, 300); x.quadraticCurveTo(256, 240, 362, 300);             // shoulders
      x.lineTo(400, 560); x.lineTo(360, 575); x.lineTo(330, 380); x.lineTo(300, 700);          // right side
      x.lineTo(330, 950); x.lineTo(265, 950); x.lineTo(240, 700); x.lineTo(215, 950);
      x.lineTo(150, 950); x.lineTo(180, 700); x.lineTo(150, 380); x.lineTo(110, 575);
      x.lineTo(70, 560); x.closePath(); x.fill(); x.stroke();                                  // torso/legs
      x.setLineDash([]);
      x.fillStyle = '#DC2626'; x.font = '700 34px Rajdhani, Arial, sans-serif'; x.textAlign = 'center';
      x.fillText('SUBJECT SLOT', 256, 1010);
      x.fillStyle = '#9CA3AF'; x.font = '600 20px Menlo, monospace';
      x.fillText('images/person.png', 256, 530);
      var t = new THREE.CanvasTexture(c);
      return t;
    }
    mountSubject(placeholderTexture(), 0.5, false);

    function probeCutout(list, i) {
      if (i >= list.length) { return; }   // keep placeholder
      var tl = new THREE.TextureLoader();
      tl.load(list[i], function (tex) {
        if (subject) { scene.remove(subject); subject.geometry.dispose(); subject.material.dispose(); }
        tex.minFilter = THREE.LinearFilter;
        mountSubject(tex, tex.image.width / tex.image.height, false);
      }, undefined, function () { probeCutout(list, i + 1); });
    }

    function probeVideo() {
      if (reduced) { probeCutout(SUBJECT.cutout, 0); return; }
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
      var settled = false;
      var timer = setTimeout(function () { if (!settled) { settled = true; probeCutout(SUBJECT.cutout, 0); } }, 3500);
      v.addEventListener('canplay', function () {
        if (settled) return; settled = true; clearTimeout(timer);
        var playPromise = v.play(); if (playPromise) playPromise.catch(function () {});
        if (subject) { scene.remove(subject); subject.geometry.dispose(); subject.material.dispose(); }
        var tex = new THREE.VideoTexture(v); tex.minFilter = THREE.LinearFilter;
        mountSubject(tex, (v.videoWidth / v.videoHeight) || 0.75, true);
      });
      v.addEventListener('error', function () { if (!settled) { settled = true; clearTimeout(timer); probeCutout(SUBJECT.cutout, 0); } });
      SUBJECT.video.forEach(function (src) {
        var s = document.createElement('source'); s.src = src; v.appendChild(s);
      });
    }
    probeVideo();

    /* ---------- pointer parallax (desktop, fine pointer only) ---------- */
    var px = 0, py = 0, tx = 0, ty = 0;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
      window.addEventListener('mousemove', function (e) {
        tx = (e.clientX / window.innerWidth) * 2 - 1;
        ty = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }

    /* ---------- camera follows the scroll ---------- */
    var clock = new THREE.Clock();
    var running = !reduced;
    var hidden = document.hidden;
    var paused = false;
    var rafId = 0;

    function layout() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', layout);

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      off('3D OFF — CONTEXT LOST');
    });

    function frame() {
      rafId = 0;
      if (!running || hidden || paused) return;
      var dt = clock.getDelta();
      var t = clock.elapsedTime;
      var prog = Math.max(0, Math.min(1, opts.getProgress() || 0));

      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      camera.position.x = prog * X_RANGE + px * 0.8;
      camera.position.y = 0.6 - py * 0.5 + Math.sin(t * 0.5) * 0.12;
      camera.lookAt(camera.position.x + 4 + px * 2, 0.4, 0);
      var fov = 52 + Math.sin(prog * Math.PI) * 6;
      if (Math.abs(fov - camera.fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }

      for (var i = 0; i < animated.length; i++) animated[i].fn(t, dt);
      // dust drifts slowly sideways, wrapping around the world
      dust.position.x = Math.sin(t * 0.05) * 0.6;
      if (subject) {
        subject.rotation.y = -0.12 + px * 0.22 + Math.sin(t * 0.4) * 0.03;
        subject.position.x = 3.1 + prog * X_RANGE * 0.15;   // slides with the camera a little
        subject.material.opacity = 1;
      }
      if (glow) glow.material.rotation = t * 0.1;

      renderer.render(scene, camera);
      if (!reduced) rafId = requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', function () {
      hidden = document.hidden;
      if (!hidden && running && !paused && !reduced) { clock.getDelta(); frame(); }
    });

    root.classList.add('fx3d-on');
    log(reduced ? '3D: STATIC FRAME — REDUCED MOTION' : '3D: ONLINE · WEBGL · 60FPS TARGET', true);

    if (reduced) { renderer.render(scene, camera); }   // one static frame, no travel
    else frame();

    /* ---------- public API ---------- */
    var disposed = false;
    window.FX3D = {
      on: true,
      start: function (o) { if (o) { if (o.getProgress) opts.getProgress = o.getProgress; if (o.getWorldWidth) opts.getWorldWidth = o.getWorldWidth; } },
      pause: function () { paused = true; },
      resume: function () { paused = false; if (running && !hidden && !reduced && !rafId) { clock.getDelta(); frame(); } },
      dispose: function () {
        if (disposed) return; disposed = true; running = false;
        if (rafId) cancelAnimationFrame(rafId);
        scene.traverse(function (obj) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (obj.material.map && obj.material.map.dispose) obj.material.map.dispose();
            obj.material.dispose();
          }
        });
        renderer.dispose();
        canvas.remove();
        root.classList.remove('fx3d-on');
      }
    };
    window.addEventListener('pagehide', function () { if (window.FX3D && window.FX3D.dispose) window.FX3D.dispose(); });
  }

  function makeGlowTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(220,38,38,.55)');
    g.addColorStop(0.5, 'rgba(220,38,38,.16)');
    g.addColorStop(1, 'rgba(220,38,38,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  boot();
})();
