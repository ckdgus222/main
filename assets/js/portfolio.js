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
})();
