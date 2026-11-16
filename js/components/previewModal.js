import { PHOTO_FORMATS, VIDEO_FORMATS } from '../constants/cameraConfig.js';
import { t } from '../i18n/i18n.js';
import { downloadCapture } from '../services/downloadService.js';
import { wasmService } from '../services/wasmService.js';
import { store } from '../state/store.js';
import { formatBytes } from '../utils/formatters.js';
import { showToast } from '../utils/toast.js';

export function initPreviewModal() {
  const backdrop = document.getElementById('preview-modal');
  const titleEl = document.getElementById('preview-modal-title');
  const subtitleEl = document.getElementById('preview-modal-subtitle');
  const mediaBox = document.getElementById('preview-media-box');
  const formatSelect = document.getElementById('preview-target-format');
  const btnConvert = document.getElementById('btn-preview-convert');
  const btnDownload = document.getElementById('btn-preview-download');
  const btnClose = document.getElementById('btn-close-preview');
  const btnCloseFooter = document.getElementById('btn-close-preview-footer');

  let activeId = null;

  function close() {
    activeId = null;
    mediaBox.innerHTML = '';
    backdrop.classList.add('hidden');
  }

  function renderModal(item) {
    if (!item) return close();
    titleEl.textContent = item.name;
    subtitleEl.textContent = `${item.format.toUpperCase()} • ${formatBytes(item.size)}`;

    mediaBox.innerHTML = '';
    if (item.type === 'photo' || item.format === 'gif') {
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = item.name;
      mediaBox.appendChild(img);
    } else {
      const video = document.createElement('video');
      video.src = item.url;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      mediaBox.appendChild(video);
    }

    formatSelect.innerHTML = '';
    const map = item.type === 'photo' ? PHOTO_FORMATS : VIDEO_FORMATS;
    for (const fmt of Object.values(map)) {
      if (item.type === 'video' && !fmt.useWasm) continue;
      const opt = document.createElement('option');
      opt.value = fmt.id;
      opt.textContent = fmt.label;
      formatSelect.appendChild(opt);
    }
    if (map[item.format]) {
      formatSelect.value = item.format;
    }

    btnConvert.disabled = item.converting;
    btnDownload.disabled = item.converting;
  }

  btnConvert.addEventListener('click', async () => {
    const item = store.getCapture(activeId);
    if (!item) return;

    const targetFmt = formatSelect.value;
    store.updateCapture(item.id, { converting: true });
    renderModal(store.getCapture(item.id));

    try {
      const onStatus = (status, key) => store.setWasmStatus(status, key);
      const res = item.type === 'photo'
        ? await wasmService.convertPhoto(item.blob, targetFmt, { onStatus })
        : await wasmService.convertVideo(item.blob, targetFmt, { onStatus });

      const base = item.name.replace(/\.[^.]+$/, '');
      store.updateCapture(item.id, {
        blob: res.blob,
        format: res.format,
        name: `${base}.${res.ext}`,
        converting: false
      });
      showToast(t('toast.wasmConverted', { format: res.format.toUpperCase() }), 'success');
      renderModal(store.getCapture(item.id));
    } catch (err) {
      store.updateCapture(item.id, { converting: false });
      showToast(t('toast.wasmFailed', { msg: err.message }), 'error');
      renderModal(store.getCapture(item.id));
    }
  });

  btnDownload.addEventListener('click', () => {
    const item = store.getCapture(activeId);
    if (item) downloadCapture(item);
  });

  btnClose.addEventListener('click', close);
  btnCloseFooter.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  return {
    open(id) {
      const item = store.getCapture(id);
      if (!item) return;
      activeId = id;
      renderModal(item);
      backdrop.classList.remove('hidden');
    }
  };
}
