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
  function onScroll() {
    var vh = window.innerHeight;
    nav.classList.toggle('is-scrolled', window.scrollY > 24);

    var r = timeline.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height || 1)));
    timeline.style.setProperty('--p', p.toFixed(3));
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

  /* ---------- Pointer glow on track cards ---------- */
  if (!reduceMotion) {
    $$('.pick').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var b = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - b.left) + 'px');
        card.style.setProperty('--my', (e.clientY - b.top) + 'px');
      });
    });
  }

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
