(() => {
  const links = [...document.querySelectorAll('.section-nav a')];
  let pending = false;

  function update() {
    pending = false;
    let active = links[0];
    for (const link of links) {
      const target = document.getElementById(link.hash.slice(1));
      if (window.scrollY > 4 && target && target.getBoundingClientRect().top <= 48) {
        active = link;
      }
    }
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      active = links[links.length - 1];
    }
    for (const link of links) {
      if (link === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('toggle', schedule, true);
  if (document.fonts) document.fonts.ready.then(schedule);
  update();

  // Content stays visible without JavaScript or animation support.
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionPreference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const animations = new Map();
  const skillCards = [...document.querySelectorAll('.skill-card')];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      observer.unobserve(element);
      if (motionPreference.matches || element.contains(document.activeElement)) continue;

      const index = skillCards.indexOf(element);
      const delay = index >= 0 && window.matchMedia('(min-width: 768px)').matches ? (index % 2) * 70 : 0;
      const animation = element.animate(
        [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 520, delay, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'backwards' }
      );
      animations.set(element, animation);
      animation.onfinish = animation.oncancel = () => animations.delete(element);
    }
  }, { threshold: 0.08 });

  document.querySelectorAll('.intro-copy, .intro-detail, .section-heading, .skill-card, .featured-project-card, .work-card, .contact')
    .forEach(element => observer.observe(element));

  // Keyboard focus must never land on a temporarily transparent control.
  document.addEventListener('focusin', (event) => {
    for (const [element, animation] of animations) {
      if (element.contains(event.target)) animation.cancel();
    }
  });

  motionPreference.addEventListener('change', () => {
    if (!motionPreference.matches) return;
    observer.disconnect();
    for (const animation of animations.values()) animation.cancel();
  });
  window.addEventListener('beforeprint', () => {
    observer.disconnect();
    for (const animation of animations.values()) animation.cancel();
  });
})();
