/* Alisha Jordan — portfolio
   Two small jobs: the mobile nav toggle, and a gentle reveal on scroll.
   Both no-op safely if the markup isn't present. */

(function () {
  'use strict';

  /* ---------------------------------------------------------- Mobile nav */

  var toggle = document.querySelector('.nav__toggle');
  var links = document.getElementById('nav-links');

  if (toggle && links) {
    var mq = window.matchMedia('(max-width: 46rem)');

    var sync = function () {
      if (mq.matches) {
        links.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        links.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
      }
    };

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      links.hidden = open;
    });

    // Close the menu when a link is chosen, and on Escape.
    links.addEventListener('click', function (e) {
      if (e.target.closest('a') && mq.matches) { sync(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mq.matches && !links.hidden) {
        sync();
        toggle.focus();
      }
    });

    mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
    sync();
  }

  /* ------------------------------------------------------ Reveal on scroll */

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    // Nothing to animate — make sure content is visible either way.
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-visible'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  Array.prototype.forEach.call(targets, function (el, i) {
    el.style.transitionDelay = Math.min(i % 3, 2) * 70 + 'ms';
    io.observe(el);
  });
})();

/* ---------------------------------------------------------------------------
   Case study extras: the reading progress bar, the sticky rail highlight,
   and the carousel controls. Kept in its own function so the early return
   above can't skip it. Each block bails quietly if its markup isn't on the page.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------- Reading progress */

  var bar = document.querySelector('.progress');
  if (bar) {
    var draw = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(window.scrollY / h, 1) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    };
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () { draw(); ticking = false; });
    }, { passive: true });
    draw();
  }

  /* ------------------------------------------------------- Sticky rail TOC */

  var rail = document.querySelector('.rail');
  if (rail) {
    var links = Array.prototype.slice.call(rail.querySelectorAll('a[href^="#"]'));
    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);

    if (sections.length) {
      // Worked out from scroll position rather than IntersectionObserver:
      // an observer only reports crossings, so a jump-scroll or a scroll back
      // up leaves the wrong link marked. This always names the heading the
      // reader has most recently passed.
      var spy = function () {
        var line = window.scrollY + window.innerHeight * 0.25;
        var active = sections[0];
        sections.forEach(function (s) { if (s.offsetTop <= line) { active = s; } });
        links.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + active.id);
        });
      };
      var spyTicking = false;
      window.addEventListener('scroll', function () {
        if (spyTicking) { return; }
        spyTicking = true;
        window.requestAnimationFrame(function () { spy(); spyTicking = false; });
      }, { passive: true });
      spy();
    }
  }

  /* ------------------------------------------------------------- Carousels */

  Array.prototype.forEach.call(document.querySelectorAll('.slider'), function (slider) {
    var track = slider.querySelector('.slider__track');
    if (!track) { return; }

    var slides = Array.prototype.slice.call(track.children);
    if (slides.length < 2) { return; }

    // Controls are built here, not in the HTML: with no JS the track is still
    // a perfectly usable scrolling strip, and dead buttons would be worse.
    // The track scrolls, so it needs to be reachable and operable by keyboard.
    // Chrome does not make an overflow container focusable on its own.
    track.tabIndex = 0;
    track.setAttribute('role', 'group');
    if (!track.hasAttribute('aria-label')) {
      track.setAttribute('aria-label', 'Image carousel, ' + slides.length + ' items');
    }

    var nav = document.createElement('div');
    nav.className = 'slider__nav';
    nav.innerHTML =
      '<button class="slider__btn" type="button" data-dir="-1">' +
      '<span class="visually-hidden">Previous</span><span aria-hidden="true">&larr;</span></button>' +
      '<button class="slider__btn" type="button" data-dir="1">' +
      '<span class="visually-hidden">Next</span><span aria-hidden="true">&rarr;</span></button>' +
      '<p class="slider__count" aria-live="polite"></p>';
    slider.appendChild(nav);

    var prev = nav.querySelector('[data-dir="-1"]');
    var next = nav.querySelector('[data-dir="1"]');
    var count = nav.querySelector('.slider__count');

    var current = function () {
      var i = Math.round(track.scrollLeft / (slides[0].offsetWidth + 24));
      return Math.max(0, Math.min(i, slides.length - 1));
    };

    var sync = function () {
      var i = current();
      count.textContent = (i + 1) + ' of ' + slides.length;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    };

    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('.slider__btn');
      if (!btn) { return; }
      var target = slides[Math.max(0, Math.min(current() + Number(btn.dataset.dir), slides.length - 1))];
      track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
    });

    track.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) { return; }
      e.preventDefault();
      var target = slides[Math.max(0, Math.min(current() + dir, slides.length - 1))];
      track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
    });

    var t;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(sync, 90);
    }, { passive: true });

    sync();
  });
})();

/* ---------------------------------------------------------------------------
   Scroll storytelling: headings that assemble word by word, and numbers that
   count up when they arrive. The heavier scroll work (image curtains, parallax
   fans, hero drift) is done in CSS with scroll-driven timelines, so it stays
   off the main thread. This file only handles the two things CSS cannot do on
   its own: splitting text into words, and counting.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) { return; }

  /* --------------------------------------------------- Split headings */

  var headings = document.querySelectorAll(
    '.hero h1, .case-hero h1, .section h2, .case-body h2'
  );

  Array.prototype.forEach.call(headings, function (h) {
    // Only plain-text headings. Anything with markup inside is left alone
    // rather than risking a link or a <strong> being flattened.
    var plain = Array.prototype.every.call(h.childNodes, function (n) {
      return n.nodeType === 3;
    });
    if (!plain || !h.textContent.trim()) { return; }
    // Screen-reader-only headings are clipped to 1px, so they never trip the
    // observer and would sit at opacity 0 forever. Nothing to animate anyway.
    if (h.classList.contains('visually-hidden')) { return; }

    // Split on plain spaces only: a non-breaking space is there on purpose
    // (Alisha&nbsp;Jordan) and must survive as a single unbreakable token.
    var words = h.textContent.trim().split(/ +/);
    h.textContent = '';
    words.forEach(function (word, i) {
      var mask = document.createElement('span');
      mask.className = 'w';
      mask.style.setProperty('--i', i);
      var inner = document.createElement('i');
      inner.textContent = word;
      mask.appendChild(inner);
      h.appendChild(mask);
      if (i < words.length - 1) { h.appendChild(document.createTextNode(' ')); }
    });
    h.classList.add('heading-split');
    // The words now carry the entrance, so drop the whole-element fade that
    // would otherwise run underneath it.
    h.classList.remove('rise');
  });

  /* ------------------------------------------------------- Count up */

  var counters = [];

  Array.prototype.forEach.call(document.querySelectorAll('.task__score'), function (el) {
    var node = el.firstChild;
    if (node && node.nodeType === 3 && /^[\d.]+$/.test(node.textContent.trim())) {
      counters.push({ node: node, to: parseFloat(node.textContent) });
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll('.bar__label span:last-child'), function (el) {
    if (/^[\d.]+$/.test(el.textContent.trim())) {
      counters.push({ node: el.firstChild, to: parseFloat(el.textContent) });
    }
  });

  var run = function (c) {
    var dp = (String(c.to).split('.')[1] || '').length;
    var start = null;
    var step = function (t) {
      if (start === null) { start = t; }
      var p = Math.min((t - start) / 900, 1);
      // Ease out, so it decelerates into the real figure.
      var v = c.to * (1 - Math.pow(1 - p, 3));
      c.node.textContent = v.toFixed(dp);
      if (p < 1) { window.requestAnimationFrame(step); }
    };
    window.requestAnimationFrame(step);
  };

  if (counters.length) {
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        counters.forEach(function (c) {
          if (!seen.has(c.node) && e.target.contains(c.node.parentNode)) {
            seen.add(c.node);
            run(c);
          }
        });
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });

    counters.forEach(function (c) {
      var host = c.node.parentNode.closest('.task, .bars') || c.node.parentNode;
      io.observe(host);
    });
    // Hold the final value until they scroll in, so nothing flashes.
    counters.forEach(function (c) { c.node.textContent = (0).toFixed((String(c.to).split('.')[1] || '').length); });
  }

  /* Headings use the existing .reveal observer, so hand them over to it. */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); revealIO.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  Array.prototype.forEach.call(document.querySelectorAll('.heading-split'), function (h) {
    revealIO.observe(h);
  });
})();

/* ==========================================================================
   4. Scroll timelines: don't start anything mid-way

   The scroll-driven arrivals in section 23 of the stylesheet are keyed to how
   far an element has entered the viewport. That is exactly right once you are
   scrolling and exactly wrong at load, because anything already sitting on the
   first screen is, by that measure, already part-way through its animation and
   paints half-faded. So: whatever is visible when the page opens gets tagged
   and opts out. Those elements are fully visible in their base state, so the
   stylesheet just switches the animation off for them.
   ========================================================================== */
(function () {
  if (!window.CSS || !CSS.supports || !CSS.supports('animation-timeline: view()')) { return; }

  var sel = '.cards .card, .methods .method, .quote, .callout, .finding,' +
            '.about-card, .task, .figure, .phones .phone';
  var h = window.innerHeight || document.documentElement.clientHeight;

  Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
    var top = el.getBoundingClientRect().top;
    if (top < h) { el.classList.add('in-view-at-load'); }
  });
})();

/* ==========================================================================
   5. About photo deck

   A stack of portraits in one arch. Next brings the card behind to the front
   and sends the current one forward and out; previous runs it the other way.
   Position is a data attribute rather than a class, so the stylesheet holds
   all the geometry and this only has to do arithmetic.

   Wraps around. Hides itself entirely if there is only one photo, which is
   what happens the moment somebody deletes two <li>s.
   ========================================================================== */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-deck]'), function (deck) {
    var cards = Array.prototype.slice.call(deck.querySelectorAll('.deck__card'));
    if (cards.length < 2) { return; }

    var wrap     = deck.closest('.deck-wrap') || deck.parentNode;
    var controls = wrap.querySelector('[data-deck-controls]');
    var counter  = wrap.querySelector('[data-deck-i]');
    var total    = wrap.querySelector('[data-deck-n]');
    var current  = 0;
    var leaving  = -1;

    if (controls) { controls.hidden = false; }
    if (total) { total.textContent = String(cards.length); }

    function paint() {
      cards.forEach(function (card, i) {
        var offset = (i - current + cards.length) % cards.length;
        card.setAttribute('data-pos', i === leaving ? 'out' : String(Math.min(offset, 3)));
        // Only the front card is reachable; the ones behind it are decoration.
        card.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
      });
      if (counter) { counter.textContent = String(current + 1); }
    }

    function go(step) {
      leaving = step > 0 ? current : -1;
      current = (current + step + cards.length) % cards.length;
      paint();
      // Let the outgoing card finish travelling before it rejoins the stack.
      window.setTimeout(function () { leaving = -1; paint(); }, 420);
    }

    var next = wrap.querySelector('[data-deck-next]');
    var prev = wrap.querySelector('[data-deck-prev]');
    if (next) { next.addEventListener('click', function () { go(1); }); }
    if (prev) { prev.addEventListener('click', function () { go(-1); }); }

    paint();
  });
})();
