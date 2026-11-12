/* VORSCHAU: Hintergrundvideo des Hero umschalten. Unten klicken, ← → oder ?v=0…5 (&rec=1 für Aufnahmen) */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  var photo = document.querySelector('.hero__photo');
  var video = document.querySelector('.hero__video');
  var img = photo && photo.querySelector('img');
  var source = photo && photo.querySelector('source');
  if (!hero || !photo || !video) return;

  var M = '/assets/images/hero-';
  var V = [
    { name: 'Alt: Boot', filter: 'brightness(1.22) saturate(.92) contrast(.94)', src: '/assets/images/scene-01-loop.mp4', srcM: '/assets/images/scene-01-loop-m.mp4',
      poster: '/assets/images/scene-01-2000.webp', posterM: '/assets/images/scene-01-m2.webp', hx: '72% 50%', hxm: '38% 50%',
      desc: '<b>Alt, zum Vergleich:</b> das Boot auf dem See, wie bisher.' },
    { name: 'Atem', filter: 'brightness(1) saturate(1) contrast(1.03)', src: M + 'atem.mp4', srcM: M + 'atem-m.mp4', poster: M + 'atem.webp', posterM: M + 'atem-m.webp', hx: '70% 18%', hxm: '50% 0%',
      desc: '<b>Atem:</b> Ein Mann atmet mit geschlossenen Augen ruhig ein und aus, vor hellem Himmel. Direkt zur Überschrift: Der Kopf weiß es schon, jetzt kommt der Körper zur Ruhe. <small>Video: Kampus Production, Pexels</small>' },
    { name: 'Aus dem Nebel', filter: 'brightness(1.08) saturate(.95) contrast(1)', src: M + 'nebel.mp4', srcM: M + 'nebel-m.mp4', poster: M + 'nebel.webp', posterM: M + 'nebel-m.webp', hx: '70% 55%', hxm: '50% 50%',
      desc: '<b>Aus dem Nebel:</b> Ein Mann geht durch den Nebel auf die aufgehende Sonne zu und wird immer kleiner. Der Weg heraus, Schritt für Schritt. <small>Video: Matthias Groeneveld, Pexels, kühler eingefärbt</small>' },
    { name: 'Am Meer', filter: 'brightness(1.02) saturate(.95) contrast(1.03)', src: M + 'meer.mp4', srcM: M + 'meer-m.mp4', poster: M + 'meer.webp', posterM: M + 'meer-m.webp', hx: '70% 50%', hxm: '50% 50%',
      desc: '<b>Am Meer:</b> Ein Mann steht am Wasser, die Wellen kommen und gehen. Wie der Nachhall: Es kommt wieder, aber er steht. <small>Video: Laker, Pexels</small>' },
    { name: 'Ins Licht', filter: 'brightness(1.1) saturate(.92) contrast(.98)', src: M + 'licht.mp4', srcM: M + 'licht-m.mp4', poster: M + 'licht.webp', posterM: M + 'licht-m.webp', hx: '70% 50%', hxm: '50% 50%',
      desc: '<b>Ins Licht:</b> Ein Mann geht in einen Wald, durch den Lichtstrahlen fallen. Aufbruch, ohne dass es laut wird. <small>Video: Bart Hoogteijling, Pexels, kühler eingefärbt</small>' },
    { name: 'Über den Wolken', filter: 'brightness(.97) saturate(1.05) contrast(1.1)', src: M + 'wolken.mp4', srcM: M + 'wolken-m.mp4', poster: M + 'wolken.webp', posterM: M + 'wolken-m.webp', hx: '70% 50%', hxm: '50% 50%',
      desc: '<b>Über den Wolken:</b> Sonnenaufgang über einer Wolkendecke, ganz ohne Person. Hoffnung, ruhig und weit. <small>Video: Matthias Groeneveld, Pexels, kühler eingefärbt</small>' }
  ];

  var btns = [].slice.call(document.querySelectorAll('.vv-switch [data-v]'));
  var desc = document.querySelector('[data-desc]');
  var rec = /[?&]rec=1/.test(location.search);
  if (rec) document.body.classList.add('is-rec');
  var label = document.createElement('div'); label.className = 'vv-label'; hero.appendChild(label);
  var mobile = function () { return matchMedia('(max-width: 900px)').matches; };
  var cur = -1;

  function apply(n) {
    var v = V[n];
    photo.style.setProperty('--hx', v.hx);
    photo.style.setProperty('--hxm', v.hxm);
    video.style.filter = v.filter;  // Helligkeit je Video (das Boot braucht mehr als helle Motive)
    if (source) source.srcset = v.posterM;
    if (img) { img.removeAttribute('srcset'); img.src = v.poster; }
    video.dataset.src = v.src; video.dataset.srcM = v.srcM;
    video.classList.remove('is-on');
    video.src = mobile() ? v.srcM : v.src;
    video.addEventListener('playing', function () { video.classList.add('is-on'); }, { once: true });
    var p = video.play(); if (p && p.catch) p.catch(function () {});
  }

  function setV(n) {
    n = (n + V.length) % V.length;
    if (n === cur) return;
    var first = cur === -1;
    cur = n;
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-v') === n)); });
    desc.innerHTML = V[n].desc;
    label.innerHTML = (n ? '<b>Vorschlag ' + n + '</b>' : '') + V[n].name;
    try { history.replaceState(null, '', '?v=' + n + (rec ? '&rec=1' : '')); } catch (e) {}
    if (first) { apply(n); return; }
    photo.classList.add('is-switching');
    setTimeout(function () { apply(n); photo.classList.remove('is-switching'); }, 450);
  }

  btns.forEach(function (b) { b.addEventListener('click', function () { setV(+b.getAttribute('data-v')); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') setV(cur + 1);
    if (e.key === 'ArrowLeft') setV(cur - 1);
  });
  var m = /[?&]v=(\d)/.exec(location.search);
  // Nach dem Hero-Video-Skript der Seite starten (es setzt die Quelle 300 ms nach „load“).
  var start = function () { setTimeout(function () { setV(m ? +m[1] : 1); }, 350); };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
