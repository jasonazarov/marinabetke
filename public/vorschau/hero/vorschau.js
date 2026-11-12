/* VORSCHAU: Vorschläge für die Hero-Animation. Umschalten unten, mit ← → oder ?v=0…5 */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  var hv = document.querySelector('.hv');
  if (!hero || !hv) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DESC = [
    '<b>Jetzt:</b> das Video vom See wie auf marinabetke.de, hell überblendet.',
    '<b>Morgenlicht:</b> Über dem See geht langsam die Sonne auf, der Nebel lichtet sich, Licht glitzert auf dem Wasser. Aus der Nacht in den Morgen: Hoffnung, ohne ein Wort.',
    '<b>Nachhall:</b> Ein Tropfen fällt ins Wasser. Die Ringe laufen weiter und werden mit jedem Ring schwächer, bis der See wieder still ist. Marinas eigener Begriff: Der Grund ist weg, die Reaktion läuft nach.',
    '<b>Atem:</b> Ein Lichtkreis atmet ruhig ein (4 Sekunden) und aus (6 Sekunden). Passt zu „Dein Körper noch nicht“: Wer hinschaut, atmet unwillkürlich mit.',
    '<b>Gedankenkarussell:</b> Die Sätze, die nachts kreisen, drehen sich, werden langsamer und lösen sich in Licht auf. Danach ist es still.',
    '<b>Loslassen:</b> Ein verknoteter Faden entwirrt sich zu einer ruhigen Welle über dem Wasser. Passt zum Programm „Endlich Loslassen“.'
  ];

  /* ---------------------------------------------------------- Hilfen */
  var W = 0, H = 0;
  function size() { var r = hero.getBoundingClientRect(); W = r.width; H = r.height; }
  function pct(name) { return parseFloat(getComputedStyle(hv).getPropertyValue(name)) / 100; }
  var ease = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };

  /* ------------------------------------------- 1 Glitzern auf dem Wasser */
  var glints = hv.querySelector('[data-glints]');
  for (var g = 0; g < 18; g++) {
    var i = document.createElement('i');
    i.style.left = (54 + Math.random() * 42) + '%';
    i.style.top = (74 + Math.random() * 22) + '%';
    i.style.animationDelay = (Math.random() * 3.2).toFixed(2) + 's';
    i.style.animationDuration = (2.4 + Math.random() * 2).toFixed(2) + 's';
    glints.appendChild(i);
  }

  /* -------------------------------------------------- 2 Nachhall-Ringe */
  var canvas = hv.querySelector('[data-ripples]');
  var ctx = canvas.getContext('2d');
  var RING_GAP = .85, RINGS = 6, LIFE = 4.6, CYCLE = 12;
  function ripples(t) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var x = W * pct('--wx'), y = H * pct('--wy');
    var c = t % CYCLE;
    var speed = Math.max(70, Math.min(W, 1400) * .11);
    // Tropfen fällt
    if (c < .6) {
      var f = c / .6;
      ctx.fillStyle = 'rgba(255,255,255,' + (.35 + .6 * f) + ')';
      ctx.beginPath(); ctx.ellipse(x, y - 60 * (1 - f * f), 2.4, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Aufprall: kurzes Leuchten
    if (c > .6 && c < 1.4) {
      var k = (c - .6) / .8;
      var gr = ctx.createRadialGradient(x, y, 0, x, y, 40);
      gr.addColorStop(0, 'rgba(255,255,255,' + (.7 * (1 - k)) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, 40, 12, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (var n = 0; n < RINGS; n++) {
      var born = .6 + n * RING_GAP, age = c - born;
      if (age < 0 || age > LIFE) continue;
      var strength = Math.pow(.72, n);                 // jeder Ring schwächer
      var a = Math.min(1, strength * 1.25) * Math.pow(1 - age / LIFE, 1.4);
      var r = 8 + speed * 1.15 * age * (1 - n * .05);
      ctx.lineWidth = 3 * (1 - age / LIFE) + .8;
      ctx.strokeStyle = 'rgba(255,255,255,' + (a * .95).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, r, r * .2, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(22,90,150,' + (a * .35).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x, y + 2.5, r * 1.01, r * .2, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  /* --------------------------------------------- 4 Gedankenkarussell */
  var WORDS = ['Warum habe ich nichts gemerkt?', 'Können wir reden?', 'War ich schuld?', 'Was macht sie gerade?', 'Ich hätte …', 'Lass endlich los.', 'Vielleicht ändert sie sich.'];
  var box = hv.querySelector('[data-thoughts]');
  var pills = WORDS.map(function (w) { var el = document.createElement('span'); el.className = 'hv-thought'; el.textContent = w; box.appendChild(el); return { el: el, w: 0, h: 0, sparks: [] }; });
  var T_CYCLE = 15, T_DISSOLVE = 7, T_GAP = .5;
  var angle = 0, lastT = 0;
  function thoughts(t, dt) {
    var c = t % T_CYCLE;
    if (c < dt + .02) { angle = 0; pills.forEach(function (p) { p.sparks.forEach(function (s) { s.el.remove(); }); p.sparks = []; }); }
    var cx = W * pct('--cx'), cy = H * pct('--cy');
    var rx = Math.min(250, W * .19), ry = rx * .45;
    var slow = c < T_DISSOLVE ? 1 : Math.max(.15, 1 - (c - T_DISSOLVE) / 4);
    angle += dt * .55 * slow;
    pills.forEach(function (p, i) {
      if (!p.w) { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; }
      var a = angle + i * Math.PI * 2 / pills.length;
      var z = (Math.sin(a) + 1) / 2;                       // 0 hinten, 1 vorne
      var x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      var appear = clamp01(c / 1.2);
      var gone = clamp01((c - (T_DISSOLVE + i * T_GAP)) / 1);
      var op = appear * (1 - gone) * (.42 + .58 * z);
      var blur = (1 - z) * 1.4 + gone * 9;
      var s = (.8 + .2 * z) * (1 - gone * .25);
      p.el.style.opacity = op.toFixed(3);
      p.el.style.filter = 'blur(' + blur.toFixed(2) + 'px)';
      p.el.style.transform = 'translate(' + (x - p.w / 2).toFixed(1) + 'px,' + (y - p.h / 2 - gone * 24).toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
      p.el.style.zIndex = String(Math.round(z * 10));
      // beim Auflösen: Funken steigen auf
      if (gone > 0 && !p.sparks.length) {
        for (var k = 0; k < 9; k++) {
          var sp = document.createElement('i'); sp.className = 'hv-spark'; box.appendChild(sp);
          p.sparks.push({ el: sp, x: x + (Math.random() - .5) * p.w * .8, y: y + (Math.random() - .5) * p.h, vx: (Math.random() - .5) * 18, vy: -20 - Math.random() * 40, born: c });
        }
      }
      p.sparks.forEach(function (sp) {
        var age = c - sp.born, o = clamp01(1 - age / 2.2);
        sp.el.style.opacity = o.toFixed(3);
        sp.el.style.transform = 'translate(' + (sp.x + sp.vx * age).toFixed(1) + 'px,' + (sp.y + sp.vy * age).toFixed(1) + 'px)';
      });
    });
  }

  /* ------------------------------------------------ 5 Faden entwirrt sich */
  var svg = hv.querySelector('[data-thread]');
  var line = svg.querySelector('[data-thread-line]'), glow = svg.querySelector('[data-thread-glow]');
  var N = 170, L_CYCLE = 16;
  function knot(u, cx, cy, r, wob) {
    var t = u * Math.PI * 2;
    return [cx + r * (.9 * Math.cos(t) + .55 * Math.cos(3.1 * t + .8) + .25 * Math.sin(7.3 * t + wob)),
            cy + r * (.72 * Math.sin(2 * t) + .45 * Math.sin(4.2 * t + .3) + .2 * Math.cos(9 * t - wob))];
  }
  function wave(u, ph) {
    var x = W * (.36 + .7 * u), base = H * .47;               // an der nebligen Uferlinie, über dem Boot
    if (W <= 900) { x = W * (-.05 + 1.1 * u); base = H * pct('--wy') - H * .06; }
    return [x, base + Math.sin(u * Math.PI * 3.2 + ph) * H * .022 * (.35 + .65 * u)];
  }
  function smooth(pts) {
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
           (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' +
           p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function thread(t) {
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0));
    var c = t % L_CYCLE;
    var cx = W * pct('--cx'), cy = H * pct('--cy'), r = Math.min(W, H) * .12;
    var P = clamp01((c - 1.6) / 5.4);                     // 0 verknotet → 1 Welle
    var pts = [];
    for (var i = 0; i < N; i++) {
      var u = i / (N - 1);
      var a = knot(u, cx, cy, r * (1 + .03 * Math.sin(c * 3)), c * .6);
      var b = wave(u, c * 1.1);
      var local = ease(clamp01(P * 1.35 - u * .35));          // löst sich von links nach rechts
      pts.push([a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local]);
    }
    var d = smooth(pts);
    line.setAttribute('d', d); glow.setAttribute('d', d);
    var op = clamp01(c / .8) * (1 - clamp01((c - 13.4) / 1.4));
    svg.style.opacity = op.toFixed(3);
  }

  /* ------------------------------------------------------- Umschalten */
  var v = 0;
  var btns = [].slice.call(document.querySelectorAll('.hv-switch [data-v]'));
  var desc = document.querySelector('[data-desc]');
  var start = performance.now();
  function setV(n, push) {
    v = (n + 6) % 6;
    document.body.setAttribute('data-v', String(v));
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-v') === v)); });
    desc.innerHTML = DESC[v];
    start = performance.now(); lastT = 0; angle = 0;
    pills.forEach(function (p) { p.sparks.forEach(function (s) { s.el.remove(); }); p.sparks = []; });
    if (typeof showLabel === 'function') showLabel();
    if (push !== false) { try { history.replaceState(null, '', '?v=' + v + (document.body.classList.contains('is-rec') ? '&rec=1' : '')); } catch (e) {} }
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { setV(+b.getAttribute('data-v')); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') setV(v + 1);
    if (e.key === 'ArrowLeft') setV(v - 1);
  });
  var TITLES = ['Jetzt', 'Morgenlicht', 'Nachhall', 'Atem', 'Gedankenkarussell', 'Loslassen'];
  var label = document.createElement('div'); label.className = 'hv-label'; hero.appendChild(label);
  if (/[?&]rec=1/.test(location.search)) document.body.classList.add('is-rec');
  var showLabel = function () { label.innerHTML = (v ? '<b>Vorschlag ' + v + '</b>' : '') + TITLES[v]; };
  var m = /[?&]v=(\d)/.exec(location.search);
  setV(m ? +m[1] : 1, false);
  showLabel();

  function frame(now) {
    size();
    var t = (now - start) / 1000, dt = Math.min(.1, Math.max(0, t - lastT)); lastT = t;
    if (reduce) t = 9.5;
    if (v === 2) ripples(reduce ? 3 : t);
    if (v === 4) thoughts(t, dt);
    if (v === 5) thread(reduce ? 9 : t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
