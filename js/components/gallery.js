import { t } from '../i18n/i18n.js';
import { downloadAllAsZip, downloadCapture } from '../services/downloadService.js';
import { store } from '../state/store.js';
import { formatBytes } from '../utils/formatters.js';
import { showToast } from '../utils/toast.js';

export function initGallery({ onOpenPreview }) {
  const desktopListEl = document.getElementById('gallery-list');
  const desktopEmptyEl = document.getElementById('gallery-empty');
  const summaryEl = document.getElementById('gallery-summary');
  const btnZip = document.getElementById('btn-download-zip');
  const btnClear = document.getElementById('btn-clear-gallery');

  // Full-screen Gallery Overlay (for mobile/tablet thumb button)
  const galleryOverlay = document.getElementById('gallery-overlay');
  const btnCloseGalleryOverlay = document.getElementById('btn-close-gallery-overlay');
  const overlayListEl = document.getElementById('gallery-overlay-list');
  const btnOverlayZip = document.getElementById('btn-overlay-zip');
  const btnOverlayClear = document.getElementById('btn-overlay-clear');

  btnCloseGalleryOverlay?.addEventListener('click', () => {
    galleryOverlay.classList.add('hidden');
  });

  async function handleZip() {
    try {
      await downloadAllAsZip(store.captures);
      showToast(t('toast.zipStarted'), 'success');
    } catch (err) {
      showToast(t('toast.zipError', { msg: err.message }), 'error');
    }
  }

  function handleClear() {
    store.clearCaptures();
    showToast(t('toast.galleryCleared'), 'info');
  }

  btnZip?.addEventListener('click', handleZip);
  btnOverlayZip?.addEventListener('click', handleZip);
  btnClear?.addEventListener('click', handleClear);
  btnOverlayClear?.addEventListener('click', handleClear);

  function buildCardsInto(container, emptyNode) {
    container.innerHTML = '';
    if (store.captures.length === 0) {
      if (emptyNode) {
        container.appendChild(emptyNode);
        emptyNode.classList.remove('hidden');
      } else {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.style.gridColumn = '1 / -1';
        p.textContent = t('gallery.emptyTitle');
        container.appendChild(p);
      }
      return;
    }

    for (const item of store.captures) {
      const card = document.createElement('article');
      card.className = 'gallery-card';

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'gallery-thumb-wrap';
      thumbWrap.addEventListener('click', () => onOpenPreview(item.id));

      if (item.type === 'photo' || item.format === 'gif') {
        const img = document.createElement('img');
        img.className = 'gallery-thumb';
        img.src = item.url;
        img.alt = item.name;
        thumbWrap.appendChild(img);
      } else {
        const vid = document.createElement('video');
        vid.className = 'gallery-thumb';
        vid.src = item.url;
        vid.muted = true;
        vid.playsInline = true;
        thumbWrap.appendChild(vid);
      }

      const badge = document.createElement('span');
      badge.className = 'gallery-badge';
      badge.textContent = item.converting ? '...' : item.format.toUpperCase();
      thumbWrap.appendChild(badge);

      const body = document.createElement('div');
      body.className = 'gallery-card-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'gallery-name';
      nameEl.textContent = item.name;
      nameEl.title = item.name;

      const metaEl = document.createElement('div');
      metaEl.className = 'gallery-meta';
      const dimText = item.width && item.height ? `${item.width}×${item.height}` : item.type.toUpperCase();
      metaEl.innerHTML = `<span>${dimText}</span><span class="mono">${formatBytes(item.size)}</span>`;

      const actionsEl = document.createElement('div');
      actionsEl.className = 'gallery-actions';

      const btnSave = document.createElement('button');
      btnSave.type = 'button';
      btnSave.className = 'btn btn-primary btn-xs';
      btnSave.textContent = t('gallery.download');
      btnSave.disabled = item.converting;
      btnSave.addEventListener('click', () => downloadCapture(item));

      const btnWasm = document.createElement('button');
      btnWasm.type = 'button';
      btnWasm.className = 'btn btn-secondary btn-xs';
      btnWasm.textContent = item.converting ? t('gallery.converting') : t('gallery.convertWasm');
      btnWasm.disabled = item.converting;
      btnWasm.addEventListener('click', () => onOpenPreview(item.id));

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn btn-ghost btn-xs';
      btnDel.textContent = t('gallery.delete');
      btnDel.disabled = item.converting;
      btnDel.addEventListener('click', () => store.removeCapture(item.id));

      actionsEl.append(btnSave, btnWasm, btnDel);
      body.append(nameEl, metaEl, actionsEl);
      card.append(thumbWrap, body);
      container.appendChild(card);
    }
  }

  function render() {
    const count = store.captures.length;
    summaryEl.textContent = t('gallery.count', { count });
    btnZip.disabled = count === 0;
    btnClear.disabled = count === 0;
    btnOverlayZip.disabled = count === 0;
    btnOverlayClear.disabled = count === 0;

    buildCardsInto(desktopListEl, desktopEmptyEl);
    buildCardsInto(overlayListEl, null);
  }

  store.subscribe(render);
  render();

  return {
    openOverlay() {
      galleryOverlay.classList.remove('hidden');
    }
  };
}
