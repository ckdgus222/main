(() => {
  'use strict';

  const tokenValues = [...document.querySelectorAll('[data-token-value]')];
  const destinations = [...document.querySelectorAll('.ds-nav a[href^="#"]')]
    .map(link => ({ link, target: document.getElementById(link.hash.slice(1)) }))
    .filter(item => item.target);
  const status = document.getElementById('copy-status');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Map();
  let pending = false;

  function refreshTokens() {
    const styles = getComputedStyle(document.documentElement);
    for (const element of tokenValues) {
      const value = styles.getPropertyValue(element.dataset.tokenValue).trim();
      if (value) element.textContent = value;
    }
  }

  function updateNavigation() {
    pending = false;
    let active = destinations[0];
    for (const destination of destinations) {
      if (destination.target.getBoundingClientRect().top <= 120) active = destination;
    }
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      active = destinations[destinations.length - 1];
    }
    for (const destination of destinations) {
      if (destination === active) destination.link.setAttribute('aria-current', 'location');
      else destination.link.removeAttribute('aria-current');
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(updateNavigation);
  }

  function announce(message) {
    if (status) status.textContent = message;
  }

  function cancelMotion() {
    for (const animation of animations.values()) animation.cancel();
  }

  function replayMotion(button) {
    const samples = button.dataset.replay
      ? [document.getElementById(button.dataset.replay)].filter(Boolean)
      : [...document.querySelectorAll('.ds-motion-sample')];
    cancelMotion();
    if (motionPreference.matches || !Element.prototype.animate) {
      announce('동작 줄이기 설정에서는 예시를 바로 표시합니다.');
      return;
    }
    const tokens = getComputedStyle(document.documentElement);
    const duration = tokens.getPropertyValue('--dur-reveal').trim();
    const distance = tokens.getPropertyValue('--reveal-distance').trim();
    const easing = tokens.getPropertyValue('--ease-out').trim();
    if (!/^\d+(?:\.\d+)?ms$/.test(duration) || parseFloat(duration) <= 0
      || !/^\d+(?:\.\d+)?px$/.test(distance) || !CSS.supports('animation-timing-function', easing)) {
      announce('모션 토큰의 시간(ms), 거리(px), easing 값을 확인해 주세요.');
      return;
    }
    for (const sample of samples) {
      if (sample.contains(document.activeElement)) continue;
      let animation;
      try {
        animation = sample.animate(
          [{ opacity: 0, transform: `translateY(${distance})` }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: parseFloat(duration), easing, fill: 'backwards' }
        );
      } catch {
        announce('모션 토큰의 시간(ms), 거리(px), easing 값을 확인해 주세요.');
        continue;
      }
      animations.set(sample, animation);
      animation.onfinish = animation.oncancel = () => {
        if (animations.get(sample) === animation) animations.delete(sample);
      };
    }
  }

  for (const button of document.querySelectorAll('[data-copy-target], [data-copy-text], [data-replay]')) {
    button.hidden = false;
  }

  document.addEventListener('click', async event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button[data-copy-target], button[data-copy-text], button[data-replay]');
    if (!button) return;
    if (button.hasAttribute('data-replay')) {
      replayMotion(button);
      return;
    }
    const target = button.dataset.copyTarget && document.getElementById(button.dataset.copyTarget);
    const value = button.hasAttribute('data-copy-text') ? button.dataset.copyText : target?.textContent.trim();
    if (!value) return;
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(value);
      announce('복사했습니다.');
    } catch {
      if (target) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      announce('자동 복사를 사용할 수 없습니다. 코드나 토큰 이름을 선택해 복사해 주세요.');
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener('focusin', event => {
    for (const [sample, animation] of animations) {
      if (sample.contains(event.target)) animation.cancel();
    }
  });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) cancelMotion();
  });
  window.addEventListener('beforeprint', cancelMotion);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { refreshTokens(); schedule(); });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', () => { refreshTokens(); schedule(); });
  document.addEventListener('toggle', schedule, true);
  if (document.fonts) document.fonts.ready.then(schedule);
  refreshTokens();
  updateNavigation();
})();
