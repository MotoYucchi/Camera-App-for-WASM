import { t } from '../i18n/i18n.js';
import { downloadCapture } from '../services/downloadService.js';
import { store } from '../state/store.js';
import { formatBytes } from '../utils/formatters.js';

export function initGallery({ onOpenPreview }) {
  const listEl = document.getElementById('gallery-list');
  const emptyEl = document.getElementById('gallery-empty');
  const summaryEl = document.getElementById('gallery-summary');
  const btnZip = document.getElementById('btn-download-zip');
  const btnClear = document.getElementById('btn-clear-gallery');

  function render() {
    const count = store.captures.length;
    summaryEl.textContent = t('gallery.count', { count });
    btnZip.disabled = count === 0;
    btnClear.disabled = count === 0;

    listEl.innerHTML = '';
    if (count === 0) {
      listEl.appendChild(emptyEl);
      emptyEl.classList.remove('hidden');
      return;
    }

    for (const item of store.captures) {
      const card = document.createElement('article');
      card.className = 'gallery-card';

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'gallery-thumb-wrap';
      thumbWrap.addEventListener('click', () => onOpenPreview(item.id));

      if (item.type === 'photo') {
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
      listEl.appendChild(card);
    }
  }

  store.subscribe(render);
  render();
}
