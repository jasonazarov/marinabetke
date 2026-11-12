/* VORSCHAU: Atem-Varianten für das Hero-Video. Unten klicken, ← → oder ?v=0…5 (&rec=1 für Aufnahmen) */
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
    { name: 'Atem 1 · bisher', filter: 'brightness(1) saturate(1) contrast(1.03)', src: M + 'atem.mp4', srcM: M + 'atem-m.mp4', poster: M + 'atem.webp', posterM: M + 'atem-m.webp', hx: '70% 18%', hxm: '50% 0%',
      desc: '<b>Atem 1, bisher:</b> Ein bärtiger Mann atmet mit geschlossenen Augen ruhig ein und aus, vor hellem Himmel. <small>Video: Kampus Production, Pexels</small>' },
    { name: 'Atem 2 · Profil', filter: 'brightness(1.03) saturate(.95) contrast(1.02)', src: M + 'atem-profil.mp4', srcM: M + 'atem-profil-m.mp4', poster: M + 'atem-profil.webp', posterM: M + 'atem-profil-m.webp', hx: '70% 25%', hxm: '50% 20%',
      desc: '<b>Atem 2, Profil:</b> Ein Mann um die 40 atmet im Profil mit geschlossenen Augen, sein Blick geht zum Text. Ruhig, nah, erwachsen: passt zu Männern nach langen Beziehungen. <small>Video: James Cheney, Pexels, gespiegelt und kühler</small>' },
    { name: 'Atem 3 · Im Wind', filter: 'brightness(1.02) saturate(.95) contrast(1.02)', src: M + 'atem-wind.mp4', srcM: M + 'atem-wind-m.mp4', poster: M + 'atem-wind.webp', posterM: M + 'atem-wind-m.webp', hx: '70% 20%', hxm: '50% 10%',
      desc: '<b>Atem 3, im Wind:</b> Ein Mann steht vor hellem Himmel im Wind, die Haare wehen, er bleibt ruhig und blickt am Ende nach vorn. Standhaft, obwohl es stürmt. <small>Video: Tima Miroshnichenko, Pexels, gespiegelt</small>' },
    { name: 'Atem 4 · Im Licht', filter: 'brightness(.98) saturate(1) contrast(1.06)', src: M + 'atem-licht.mp4', srcM: M + 'atem-licht-m.mp4', poster: M + 'atem-licht.webp', posterM: M + 'atem-licht-m.webp', hx: '70% 40%', hxm: '50% 30%',
      desc: '<b>Atem 4, im Licht:</b> Ein Mann liegt mit geschlossenen Augen im Licht, alles hell und weich. Loslassen, auch körperlich. <small>Video: Ron Lach, Pexels, ins Querformat gedreht</small>' },
    { name: 'Atem 5 · Am Meer', filter: 'brightness(1.06) saturate(.95) contrast(1)', src: M + 'atem-meer.mp4', srcM: M + 'atem-meer-m.mp4', poster: M + 'atem-meer.webp', posterM: M + 'atem-meer-m.webp', hx: '70% 55%', hxm: '50% 40%',
      desc: '<b>Atem 5, am Meer:</b> Ein Mann sitzt ruhig am grauen Meer und atmet. Ruhiger Ort, ruhiger Körper. <small>Video: Anastasia Shuraeva, Pexels, kühler</small>' }
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
    label.innerHTML = V[n].name;
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
