/* AI Venture Night — landing page interactions */
(function () {
  'use strict';

  /**
   * Submissions go to the Supabase table `hackathon_applications`
   * (see supabase/hackathon_applications.sql), using the same VITE_SUPABASE_* env as the main app.
   * FORM_ENDPOINT, when set, overrides that with a plain JSON POST (Formspree, Make/Zapier webhook…).
   */
  var FORM_ENDPOINT = '';
  var env = (import.meta && import.meta.env) || {};
  var SUPABASE_URL = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  var SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || '';
  var COLUMNS = ['kind', 'track', 'name', 'phone', 'email', 'occupation'];

  var EVENT_START = new Date('2026-11-26T19:00:00+02:00');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* After Effects-style Easy Ease as a JS timing function (stronger ~70% influence for long scrolls) */
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function at(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var d = slope(t, x1, x2);
        if (Math.abs(d) < 1e-6) break;
        t -= (at(t, x1, x2) - x) / d;
      }
      return at(t, y1, y2);
    };
  }
  var easyEase = bezier(0.33, 0, 0.67, 1);
  var easyEaseSoft = bezier(0.7, 0, 0.3, 1);

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Nav ---------- */
  var nav = $('#nav');
  var burger = $('#burger');
  var links = $('#navLinks');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
    nav.classList.toggle('menu-open', open);
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  $$('a', links).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* ---------- Scroll-driven bits (nav state, timeline, active track) ---------- */
  var timeline = $('#timeline');
  var tlItems = $$('.tl', timeline);
  var tracks = $$('.track');
  var ticking = false;
  var tlTarget = 0, tlCurrent = 0, tlRunning = false;
  // The rail chases the scroll position with exponential smoothing, so it glides instead of stepping.
  function tlFollow() {
    tlCurrent += (tlTarget - tlCurrent) * (reduceMotion ? 1 : 0.08);
    if (Math.abs(tlTarget - tlCurrent) < 0.0005) tlCurrent = tlTarget;
    timeline.style.setProperty('--p', tlCurrent.toFixed(4));
    if (tlCurrent !== tlTarget) requestAnimationFrame(tlFollow); else tlRunning = false;
  }
  function onScroll() {
    var vh = window.innerHeight;
    nav.classList.toggle('is-scrolled', window.scrollY > 24);

    var r = timeline.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height || 1)));
    tlTarget = p;
    if (!tlRunning) { tlRunning = true; requestAnimationFrame(tlFollow); }
    tlItems.forEach(function (li) {
      li.classList.toggle('is-lit', li.getBoundingClientRect().top < vh * 0.75);
    });

    tracks.forEach(function (t) {
      var b = t.getBoundingClientRect();
      t.classList.toggle('is-active', b.top < vh * 0.5 && b.bottom > vh * 0.5);
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Anchor scrolling with Easy Ease ---------- */
  var scrollAnim = null;
  function easeScrollTo(y) {
    var start = window.scrollY, dist = y - start;
    if (reduceMotion || Math.abs(dist) < 2) { window.scrollTo(0, y); return; }
    var dur = Math.min(1600, Math.max(700, Math.abs(dist) * 0.45));
    var t0 = null;
    if (scrollAnim) cancelAnimationFrame(scrollAnim);
    function step(now) {
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, start + dist * easyEaseSoft(k));
      scrollAnim = k < 1 ? requestAnimationFrame(step) : null;
    }
    scrollAnim = requestAnimationFrame(step);
  }
  // A wheel or touch from the visitor takes over immediately.
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = null; } }, { passive: true });
  });
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target && id !== 'top') return;
      e.preventDefault();
      var y = target ? target.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0) : 0;
      easeScrollTo(Math.max(0, y));
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });

  /* ---------- Pointer glow on track cards ---------- */
  if (!reduceMotion) {
    $$('.pick').forEach(function (card) {
      var tx = 0, ty = 0, cx = 0, cy = 0, running = false;
      function follow() {
        cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
        card.style.setProperty('--mx', cx.toFixed(1) + 'px');
        card.style.setProperty('--my', cy.toFixed(1) + 'px');
        if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5) requestAnimationFrame(follow); else running = false;
      }
      card.addEventListener('pointerenter', function (e) {
        var b = card.getBoundingClientRect();
        cx = tx = e.clientX - b.left; cy = ty = e.clientY - b.top;
      });
      card.addEventListener('pointermove', function (e) {
        var b = card.getBoundingClientRect();
        tx = e.clientX - b.left; ty = e.clientY - b.top;
        if (!running) { running = true; requestAnimationFrame(follow); }
      });
    });
  }

  /* ---------- Flare: glow orb sweeps side to side with Easy Ease and lights the line ---------- */
  var flares = $$('.flare');
  var PASS = 7000; // ms per side-to-side pass
  var sweepStart = null;
  function sweep(now) {
    if (sweepStart === null) sweepStart = now;
    var k = ((now - sweepStart) % (PASS * 2)) / PASS;           // 0..2: there and back
    var e = easyEase(k < 1 ? k : 2 - k);                       // ease in and out of each turn
    var x = 8 + 84 * e;
    flares.forEach(function (f) { f.style.setProperty('--glow-x', x.toFixed(2) + '%'); });
    requestAnimationFrame(sweep);
  }
  if (flares.length && !reduceMotion) requestAnimationFrame(sweep);

  /* ---------- Countdown ---------- */
  var cd = {};
  $$('[data-cd]').forEach(function (el) { cd[el.getAttribute('data-cd')] = el; });
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function tick() {
    var diff = Math.max(0, EVENT_START - new Date());
    var s = Math.floor(diff / 1000);
    cd.d.textContent = Math.floor(s / 86400);
    cd.h.textContent = pad(Math.floor(s / 3600) % 24);
    cd.m.textContent = pad(Math.floor(s / 60) % 60);
    cd.s.textContent = pad(s % 60);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Application modal ---------- */
  var modal = $('#applyModal');
  var applyForm = $('#applyForm');
  var lastFocus = null;

  function selectTrack(track) {
    $$('input[name="track"]', applyForm).forEach(function (r) { r.checked = r.value === track; });
    $$('.cond', applyForm).forEach(function (c) { c.classList.toggle('is-on', c.getAttribute('data-for') === track); });
    $('.seg', applyForm).classList.remove('is-invalid');
  }

  function openModal(track) {
    lastFocus = document.activeElement;
    resetForm(applyForm);
    selectTrack(track || '');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    setTimeout(function () {
      var first = track ? $('input[name="name"]', applyForm) : $('input[name="track"]', applyForm);
      if (first) first.focus({ preventScroll: true });
    }, 60);
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  $$('[data-apply]').forEach(function (btn) {
    btn.addEventListener('click', function () { setMenu(false); openModal(btn.getAttribute('data-apply')); });
  });
  $$('[data-close]', modal).forEach(function (el) { el.addEventListener('click', closeModal); });
  $$('input[name="track"]', applyForm).forEach(function (r) {
    r.addEventListener('change', function () { selectTrack(r.value); });
  });
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      var f = $$('button, input, select, textarea, a[href]', modal).filter(function (el) { return el.offsetParent !== null || el.type === 'radio'; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Forms ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^[+\d][\d\s\-()]{7,}$/;

  function fieldOf(input) { return input.closest('.field'); }
  function mark(input, bad) { var f = fieldOf(input); if (f) f.classList.toggle('is-invalid', bad); return bad; }

  function validate(form) {
    var bad = false;
    $$('input[required], select[required], textarea[required]', form).forEach(function (el) {
      var v = el.value.trim();
      var wrong = !v ||
        (el.type === 'email' && !EMAIL_RE.test(v)) ||
        (el.type === 'tel' && !PHONE_RE.test(v));
      if (mark(el, wrong)) bad = true;
    });
    if (form === applyForm) {
      var track = $('input[name="track"]:checked', form);
      if (!track) { $('.seg', form).classList.add('is-invalid'); bad = true; }
    }
    return !bad;
  }

  function serialize(form) {
    var data = { kind: form.getAttribute('data-kind'), submitted_at: new Date().toISOString() };
    var active = $('input[name="track"]:checked', form);
    $$('input, select, textarea', form).forEach(function (el) {
      if (!el.name || (el.type === 'radio' && !el.checked)) return;
      var cond = el.closest('.cond');
      if (cond && (!active || cond.getAttribute('data-for') !== active.value)) return;
      if (el.value.trim()) data[el.name] = el.value.trim();
    });
    return data;
  }

  function resetForm(form) {
    form.classList.remove('is-sent');
    var done = $('.form__done', form);
    if (done) done.remove();
    form.reset();
    $$('.is-invalid', form).forEach(function (el) { el.classList.remove('is-invalid'); });
    var msg = $('.form__msg', form);
    msg.textContent = ''; msg.classList.remove('is-error');
  }

  function showDone(form) {
    var isLead = form.getAttribute('data-kind') === 'lead';
    var done = document.createElement('div');
    done.className = 'form__done';
    done.innerHTML =
      '<div class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<h3>' + (isLead ? 'תודה! קיבלנו את הפרטים.' : 'המועמדות התקבלה!') + '</h3>' +
      '<p>' + (isLead ? 'נחזור אליכם בהקדם כדי לעזור לבחור את המסלול המתאים.' : 'נעבור על הפרטים ונחזור אליכם עם הצעדים הבאים. נתראה ב־26.11.') + '</p>';
    form.appendChild(done);
    form.classList.add('is-sent');
  }

  function deliver(data) {
    if (FORM_ENDPOINT) {
      return fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) { if (!r.ok) throw new Error(r.status); });
    }
    if (SUPABASE_URL && SUPABASE_KEY) {
      var row = { details: {} };
      Object.keys(data).forEach(function (k) {
        if (k === 'submitted_at' || k === 'website') return;
        if (COLUMNS.indexOf(k) > -1) row[k] = data[k]; else row.details[k] = data[k];
      });
      return fetch(SUPABASE_URL + '/rest/v1/hackathon_applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + SUPABASE_KEY,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(row)
      }).then(function (r) { if (!r.ok) throw new Error(r.status); });
    }
    return Promise.reject(new Error('No form backend configured (set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY or FORM_ENDPOINT)'));
  }

  function submit(form) {
    form.addEventListener('input', function (e) { if (e.target.closest('.is-invalid')) mark(e.target, false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form__msg', form);
      msg.classList.remove('is-error');
      if (!validate(form)) {
        msg.textContent = 'נא למלא את השדות המסומנים.';
        msg.classList.add('is-error');
        var bad = $('.is-invalid input, .is-invalid select, .is-invalid textarea, .seg.is-invalid input', form);
        if (bad) bad.focus();
        return;
      }
      var data = serialize(form);
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      msg.textContent = 'שולח…';

      // Honeypot: bots fill the hidden field, people don't — pretend success and drop it.
      var trap = $('input[name="website"]', form);
      var send = trap && trap.value ? Promise.resolve() : deliver(data);

      send.then(function () {
        msg.textContent = '';
        showDone(form);
      }).catch(function (err) {
        console.error('[AI Venture Night] submit failed:', err);
        msg.textContent = 'משהו השתבש בשליחה. נסו שוב בעוד רגע.';
        msg.classList.add('is-error');
      }).then(function () { btn.disabled = false; });
    });
  }
  submit(applyForm);
  submit($('#leadForm'));
})();
