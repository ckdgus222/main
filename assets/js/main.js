(() => {
  "use strict";

  const destinations = Array.from(document.querySelectorAll(".section-nav a[href^='#']"))
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(({ section }) => section);

  if (!destinations.length) return;

  let scheduled = false;

  function updateNavigation() {
    scheduled = false;
    const readingLine = Math.min(window.innerHeight * 0.28, 220);
    const pageHeight = document.documentElement.scrollHeight;
    const atBottom = pageHeight > window.innerHeight + 2
      && window.scrollY + window.innerHeight >= pageHeight - 2;
    let current = destinations[0];

    for (const destination of destinations) {
      if (destination.section.getBoundingClientRect().top <= readingLine) current = destination;
    }
    if (atBottom) {
      // 마지막 두 영역이 함께 보이면 사용자가 이동한 앵커를 우선합니다.
      const anchor = destinations.find(({ link, section }) => {
        const top = section.getBoundingClientRect().top;
        return link.hash === window.location.hash && top >= 0 && top < window.innerHeight;
      });
      current = anchor || destinations[destinations.length - 1];
    }

    for (const destination of destinations) {
      const active = destination === current;
      destination.link.classList.toggle("is-active", active);
      if (active) destination.link.setAttribute("aria-current", "location");
      else destination.link.removeAttribute("aria-current");
    }
  }

  function scheduleNavigation() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateNavigation);
  }

  window.addEventListener("scroll", scheduleNavigation, { passive: true });
  window.addEventListener("resize", scheduleNavigation, { passive: true });
  window.addEventListener("hashchange", scheduleNavigation);
  window.addEventListener("pageshow", scheduleNavigation);
  window.addEventListener("load", scheduleNavigation);
  document.addEventListener("toggle", scheduleNavigation, true);
  if (document.fonts) document.fonts.ready.then(scheduleNavigation);
  scheduleNavigation();
})();
