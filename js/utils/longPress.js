import { i18n, t } from '../i18n/i18n.js';
import { showToast } from './toast.js';

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD_PX = 12;

export function initLongPressTooltips() {
  function syncAriaTitles() {
    document.querySelectorAll('[data-tip-key]').forEach((el) => {
      const text = t(el.dataset.tipKey);
      el.setAttribute('title', text);
      if (!el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', text);
      }
    });
  }

  syncAriaTitles();
  i18n.subscribe(syncAriaTitles);

  let timer = null;
  let startX = 0;
  let startY = 0;
  let activeEl = null;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest?.('[data-tip-key]');
    if (!target) return;

    activeEl = target;
    startX = e.clientX;
    startY = e.clientY;
    delete target.dataset.longPressed;

    clearTimer();
    timer = setTimeout(() => {
      if (!activeEl) return;
      activeEl.dataset.longPressed = '1';
      showToast(t(activeEl.dataset.tipKey), 'info', 2800);
      if (navigator.vibrate) {
        try { navigator.vibrate(18); } catch {}
      }
    }, LONG_PRESS_MS);
  }, { passive: true });

  document.addEventListener('pointermove', (e) => {
    if (!timer) return;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
      clearTimer();
    }
  }, { passive: true });

  document.addEventListener('pointerup', clearTimer, { passive: true });
  document.addEventListener('pointercancel', clearTimer, { passive: true });

  // Prevent tap action if long-press just triggered
  document.addEventListener('click', (e) => {
    const target = e.target.closest?.('[data-tip-key]');
    if (target && target.dataset.longPressed === '1') {
      e.preventDefault();
      e.stopImmediatePropagation();
      delete target.dataset.longPressed;
    }
  }, true);

  // Suppress native context menu on long-press icon buttons
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest?.('[data-tip-key]')) {
      e.preventDefault();
    }
  });
}
