/* main.js — interactions, scroll reveals, nav, tabs */
(function () {

  /* ── CUSTOM CURSOR ── */
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;
  let cursorVisible = false;
  let rafCursor;

  function tickCursor() {
    // Spring follow for the ring: 14% of remaining distance per frame
    ringX += (mouseX - ringX) * 0.14;
    ringY += (mouseY - ringY) * 0.14;

    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';

    rafCursor = requestAnimationFrame(tickCursor);
  }

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!cursorVisible) {
      // Snap ring to dot position on first move to prevent it flying in from 0,0
      ringX = mouseX;
      ringY = mouseY;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
      cursorVisible = true;
      tickCursor();
    }
  });

  // Hover detection — interactive elements
  const interactiveSelectors = 'a, button, .tab-btn, label, [role="button"]';

  document.addEventListener('mouseover', e => {
    const overAppWindow = e.target.closest('.app-window');
    const overInteractive = e.target.closest(interactiveSelectors);

    // Clear all states first
    dot.classList.remove('is-hovering');
    ring.classList.remove('is-hovering', 'is-on-window');

    if (overInteractive) {
      dot.classList.add('is-hovering');
      ring.classList.add('is-hovering');
    } else if (overAppWindow) {
      ring.classList.add('is-on-window');
    }
  });

  // Hide cursor when leaving the window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
    cursorVisible = false;
    cancelAnimationFrame(rafCursor);
  });

  document.addEventListener('mouseenter', () => {
    if (!cursorVisible) return;
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });


  /* ── HERO PARALLAX ── */
  const hero = document.getElementById('hero');

  // Only run parallax when the hero is in view
  let heroInView = true;
  const heroObserver = new IntersectionObserver(entries => {
    heroInView = entries[0].isIntersecting;
  }, { threshold: 0 });
  if (hero) heroObserver.observe(hero);

  const parallaxLayers = [
    { el: document.querySelector('.n1'), tx: 0, ty: 0, mx: 0.018, my: 0.012 },
    { el: document.querySelector('.n2'), tx: 0, ty: 0, mx: -0.014, my: -0.010 },
    { el: document.querySelector('.n3'), tx: 0, ty: 0, mx: 0.022, my: 0.016 },
    { el: document.querySelector('.hero-content'), tx: 0, ty: 0, mx: -0.010, my: -0.007 },
    { el: document.querySelector('.hero-preview'), tx: 0, ty: 0, mx: -0.006, my: -0.004 },
  ];

  // Filter out any nulls in case selectors don't match
  const activeLayers = parallaxLayers.filter(l => l.el !== null);

  let heroMouseX = 0, heroMouseY = 0;   // raw target offsets from center
  let rafParallax;

  function tickParallax() {
    if (!heroInView) {
      rafParallax = requestAnimationFrame(tickParallax);
      return;
    }

    for (const layer of activeLayers) {
      const targetX = heroMouseX * layer.mx;
      const targetY = heroMouseY * layer.my;

      // Lerp current position toward target at 6% per frame
      layer.tx += (targetX - layer.tx) * 0.06;
      layer.ty += (targetY - layer.ty) * 0.06;

      layer.el.style.transform = `translate(${layer.tx}px, ${layer.ty}px)`;
    }

    rafParallax = requestAnimationFrame(tickParallax);
  }

  // Reuse the existing mousemove listener's coordinates
  // by reading from the already-tracked mouseX/mouseY values.
  // We update heroMouseX/Y as offset from viewport center.
  window.addEventListener('mousemove', e => {
    heroMouseX = e.clientX - window.innerWidth / 2;
    heroMouseY = e.clientY - window.innerHeight / 2;
  });

  // Start the parallax loop immediately (runs even before first mousemove,
  // just lerps toward 0 which is a no-op)
  tickParallax();

  // On resize, reset all layer positions to avoid drift
  window.addEventListener('resize', () => {
    for (const layer of activeLayers) {
      layer.tx = 0;
      layer.ty = 0;
      layer.el.style.transform = 'translate(0px, 0px)';
    }
    heroMouseX = 0;
    heroMouseY = 0;
  });


  /* ── NAV scroll behaviour ── */
  const nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── HERO INTERACTIVE TABS ── */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(id) {
    tabBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.tab === id);
    });

    const current = document.querySelector('.tab-pane.active');
    const next = document.getElementById('pane-' + id);
    if (!next || current === next) return;

    current.style.opacity = '0';
    current.style.transform = 'translateY(6px)';

    setTimeout(() => {
      current.classList.remove('active');
      current.style.opacity = '';
      current.style.transform = '';

      next.classList.add('active');
      next.style.opacity = '0';
      next.style.transform = 'translateY(6px)';
      // force reflow
      next.getBoundingClientRect();
      next.style.transition = 'opacity .28s ease, transform .28s ease';
      next.style.opacity = '1';
      next.style.transform = 'translateY(0)';

      setTimeout(() => {
        next.style.transition = '';
      }, 300);
    }, 180);
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // add transition style to all panes
  tabPanes.forEach(p => {
    p.style.transition = 'opacity .18s ease, transform .18s ease';
  });

  /* ── SCROLL REVEAL ── */
  const revealEls = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // stagger siblings inside the same parent
        const parent = entry.target.parentElement;
        const siblings = Array.from(parent.querySelectorAll('.reveal:not(.in)'));
        siblings.forEach((el, i) => {
          const base = parseFloat(getComputedStyle(el).transitionDelay) || 0;
          const extra = siblings.indexOf(el) * 0.07;
          el.style.transitionDelay = (base + extra) + 's';
          requestAnimationFrame(() => el.classList.add('in'));
        });
        // always trigger the observed element too
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => observer.observe(el));


  /* ── AUTO cycle tabs every 4s if user hasn't interacted ── */
  const tabOrder = ['contacts', 'pipeline', 'outreach', 'intel'];
  let tabIdx = 0;
  let autoCycle = true;

  tabBtns.forEach(b => {
    b.addEventListener('click', () => { autoCycle = false; });
  });

  setInterval(() => {
    if (!autoCycle) return;
    tabIdx = (tabIdx + 1) % tabOrder.length;
    switchTab(tabOrder[tabIdx]);
  }, 4200);

})();
