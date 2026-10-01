/* Portfolio page behavior: navigation state, reveal motion and the timeline progress line.
   Every effect is optional: without JavaScript or with reduced motion, all content stays visible. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // Motion values come from tokens.css. Times are in ms and distances in px;
  // an unexpected format skips the motion and leaves the content in place.
  const tokens = getComputedStyle(root);
  function numberToken(name, unit) {
    const value = tokens.getPropertyValue(name).trim();
    return new RegExp(`^\\d+(?:\\.\\d+)?${unit}$`).test(value) ? parseFloat(value) : NaN;
  }
  const duration = numberToken('--dur-reveal', 'ms');
  const stagger = numberToken('--stagger', 'ms');
  const scrollDuration = numberToken('--dur-reveal-scroll', 'ms');
  const scrollStagger = numberToken('--stagger-scroll', 'ms');
  const distance = numberToken('--reveal-distance', 'px');
  const easing = tokens.getPropertyValue('--ease-out').trim();
  const motionReady = 'IntersectionObserver' in window
    && typeof Element.prototype.animate === 'function'
    && [duration, stagger, scrollDuration, scrollStagger, distance].every(Number.isFinite)
    && duration > 0
    && scrollDuration > 0
    && CSS.supports('animation-timing-function', easing);

  const animations = new Map();
  function reveal(element, time, delay = 0) {
    animations.get(element)?.cancel();
    let animation;
    try {
      animation = element.animate(
        [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'none' }],
        { duration: time, delay, easing, fill: 'backwards' }
      );
    } catch {
      return null; // A timing value the browser rejects leaves the content visible.
    }
    animations.set(element, animation);
    animation.onfinish = animation.oncancel = () => {
      if (animations.get(element) === animation) animations.delete(element);
    };
    return animation;
  }
  // Out of view, an element waits on the entrance's first frame,
  // so the entrance never starts by hiding something already on screen.
  function hold(element) {
    if (!motionReady || reducedMotion.matches) {
      animations.get(element)?.cancel();
      return;
    }
    if (animations.get(element)?.playState !== 'paused') reveal(element, scrollDuration)?.pause();
  }
  function cancelAll() {
    for (const animation of animations.values()) animation.cancel();
  }

  // Hero: CSS hides [data-hero-part] until d-hero-ready is set, so the first paint
  // never shows the text before it animates. Both happen in this same task.
  const heroParts = [...document.querySelectorAll('[data-hero-part]')];
  if (motionReady && !reducedMotion.matches && window.scrollY < window.innerHeight / 2) {
    heroParts.forEach((part, index) => reveal(part, duration, index * stagger));
  }
  root.classList.add('hero-ready');

  // Navigation: the header menu and the mobile tab bar share one set of sections.
  const header = document.querySelector('.site-header');
  const navLinks = [...document.querySelectorAll('[data-nav] a[href^="#"]')];
  const sections = [...new Set(navLinks.map(link => link.hash.slice(1)))]
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const railLinks = [...document.querySelectorAll('.rail a[href^="#"]')];
  const cases = railLinks.map(link => document.getElementById(link.hash.slice(1)));
  const timeline = document.querySelector('[data-timeline]');
  const track = timeline?.querySelector('.timeline-track');
  const progressLine = timeline?.querySelector('.timeline-progress');
  const nodes = timeline ? [...timeline.querySelectorAll('.timeline-node')] : [];
  let pending = false;

  function update() {
    pending = false;
    const offset = (header ? header.offsetHeight : 0) + 24;
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= offset) active = section;
    }
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= root.scrollHeight - 4) {
      active = sections[sections.length - 1];
    }
    for (const link of navLinks) {
      if (active && link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }

    // The case crossing 45% of the viewport is "current"; the line fills up to the same point.
    const anchor = window.innerHeight * 0.45;
    let current = -1;
    cases.forEach((item, index) => {
      if (item && item.getBoundingClientRect().top <= anchor) current = index;
    });
    railLinks.forEach((link, index) => link.classList.toggle('is-active', index === current));

    if (track && progressLine && timeline.classList.contains('is-live')) {
      const rect = track.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (anchor - rect.top) / Math.max(rect.height, 1)));
      progressLine.style.setProperty('--tl-progress', progress.toFixed(4));
      for (const node of nodes) {
        const dot = node.querySelector('.timeline-dot');
        const box = (dot && dot.offsetParent ? dot : node).getBoundingClientRect();
        node.classList.toggle('is-passed', box.top + box.height / 2 <= anchor);
      }
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }

  // With reduced motion the line stays fully drawn and every point stays lit.
  function setTimelineMode() {
    if (!timeline) return;
    const live = !reducedMotion.matches;
    timeline.classList.toggle('is-live', live);
    if (!live) {
      progressLine?.style.removeProperty('--tl-progress');
      nodes.forEach(node => node.classList.remove('is-passed'));
    }
  }

  // Sections and cards replay their entrance after fully leaving the viewport.
  // An element counts as "left" only once it is further out than the reveal distance:
  // otherwise the entrance transform itself could push it out and restart it every frame.
  if ('IntersectionObserver' in window) {
    const skillCards = [...document.querySelectorAll('.skill-card')];
    const wide = window.matchMedia('(min-width: 1024px)');
    const medium = window.matchMedia('(min-width: 768px)');
    const visible = new Set();
    const margin = (Number.isFinite(distance) ? distance : 0) + 8;
    const enter = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const element = entry.target;
        if (visible.has(element)) continue;
        if (entry.intersectionRatio < 0.08) {
          if (!entry.isIntersecting) hold(element);
          continue;
        }
        visible.add(element);
        element.classList.add('is-inview');
        if (!motionReady || reducedMotion.matches || element.contains(document.activeElement)) continue;
        const index = skillCards.indexOf(element);
        const columns = wide.matches ? 3 : medium.matches ? 2 : 1;
        reveal(element, scrollDuration, index >= 0 ? (index % columns) * scrollStagger : 0);
      }
    }, { threshold: [0.08] });
    const leave = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) continue;
        const element = entry.target;
        visible.delete(element);
        element.classList.remove('is-inview');
        hold(element);
      }
    }, { rootMargin: `${margin}px 0px` });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      enter.observe(element);
      leave.observe(element);
    });
  }

  // Keyboard focus must never land on a temporarily transparent control.
  document.addEventListener('focusin', event => {
    for (const [element, animation] of animations) {
      if (element.contains(event.target)) animation.cancel();
    }
  });

  // Glass sheen follows a fine pointer; one style write per frame at most.
  let sheenTarget = null;
  let sheenX = 0;
  let sheenY = 0;
  let sheenPending = false;
  function paintSheen() {
    sheenPending = false;
    if (!sheenTarget) return;
    sheenTarget.style.setProperty('--mx', `${sheenX}px`);
    sheenTarget.style.setProperty('--my', `${sheenY}px`);
  }
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || !(event.target instanceof Element)) return;
    const card = event.target.closest('.glass');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    sheenTarget = card;
    sheenX = Math.round(event.clientX - rect.left);
    sheenY = Math.round(event.clientY - rect.top);
    if (!sheenPending) {
      sheenPending = true;
      requestAnimationFrame(paintSheen);
    }
  }, { passive: true });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) cancelAll();
    setTimelineMode();
    schedule();
  });
  window.addEventListener('beforeprint', cancelAll);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('toggle', schedule, true);
  if (document.fonts) document.fonts.ready.then(schedule);

  setTimelineMode();
  update();
})();
