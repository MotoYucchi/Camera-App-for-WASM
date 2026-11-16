import { FILTER_PRESETS } from '../constants/cameraConfig.js';
import { store } from '../state/store.js';
import { formatDuration } from '../utils/formatters.js';

export function initViewfinder({ onStartCamera, onSwitchFacing, onShutter }) {
  const videoEl = document.getElementById('vf-video');
  const gridEl = document.getElementById('vf-grid');
  const placeholderEl = document.getElementById('vf-placeholder');
  const placeholderTitleEl = document.getElementById('vf-placeholder-title');
  const placeholderDescEl = document.getElementById('vf-placeholder-desc');
  const btnStartCam = document.getElementById('btn-start-camera');

  const resBadgeEl = document.getElementById('vf-res-badge');
  const recBadgeEl = document.getElementById('vf-rec-badge');
  const recTimeEl = document.getElementById('vf-rec-time');
  const countdownEl = document.getElementById('vf-countdown');
  const flashEl = document.getElementById('vf-flash');

  const btnSwitchFacing = document.getElementById('btn-switch-facing');
  const btnModePhoto = document.getElementById('btn-mode-photo');
  const btnModeVideo = document.getElementById('btn-mode-video');
  const btnShutter = document.getElementById('btn-shutter');

  btnStartCam?.addEventListener('click', onStartCamera);
  btnSwitchFacing?.addEventListener('click', onSwitchFacing);
  btnModePhoto?.addEventListener('click', () => {
    if (!store.isRecording) store.setState({ mode: 'photo' });
  });
  btnModeVideo?.addEventListener('click', () => {
    if (!store.isRecording) store.setState({ mode: 'video' });
  });
  btnShutter?.addEventListener('click', onShutter);

  function sync() {
    const active = store.cameraState === 'active';
    placeholderEl.classList.toggle('hidden', active);

    if (store.cameraState === 'error' && store.cameraError) {
      placeholderTitleEl.textContent = 'Camera Error';
      placeholderDescEl.textContent = store.cameraError;
    }

    // Mirror & Filter
    videoEl.classList.toggle('mirrored', Boolean(store.mirror));
    const filter = FILTER_PRESETS.find((f) => f.id === store.filterId);
    videoEl.style.filter = filter ? filter.css : 'none';

    // Grid overlay
    gridEl.className = 'grid-overlay';
    if (store.gridMode === 'thirds') gridEl.classList.add('grid-thirds');
    if (store.gridMode === 'cross') gridEl.classList.add('grid-cross');

    // Resolution HUD
    if (active && store.actualResolution) {
      resBadgeEl.textContent = store.actualResolution;
      resBadgeEl.classList.remove('hidden');
    } else {
      resBadgeEl.classList.add('hidden');
    }

    // Recording HUD
    recBadgeEl.classList.toggle('hidden', !store.isRecording);
    recTimeEl.textContent = formatDuration(store.recordingSeconds);

    // Mode tabs & Shutter button
    btnModePhoto.classList.toggle('active', store.mode === 'photo');
    btnModeVideo.classList.toggle('active', store.mode === 'video');
    btnModePhoto.disabled = store.isRecording;
    btnModeVideo.disabled = store.isRecording;

    btnShutter.disabled = !active;
    btnShutter.classList.toggle('video-mode', store.mode === 'video');
    btnShutter.classList.toggle('recording', store.isRecording);

    btnSwitchFacing.disabled = !active || store.isRecording;
  }

  store.subscribe(sync);
  sync();

  return {
    videoEl,
    setStream(stream) {
      videoEl.srcObject = stream || null;
      if (stream) {
        videoEl.play().catch(() => {});
      }
    },
    triggerFlash() {
      flashEl.classList.remove('active');
      void flashEl.offsetWidth;
      flashEl.classList.add('active');
    },
    async runCountdown(seconds) {
      if (!seconds || seconds <= 0) return;
      countdownEl.classList.remove('hidden');
      for (let s = seconds; s >= 1; s--) {
        countdownEl.textContent = String(s);
        await new Promise((r) => setTimeout(r, 1000));
      }
      countdownEl.classList.add('hidden');
    },
    captureFrameToBlob({ format = 'png', mirror = false, filterCss = 'none' } = {}) {
      const w = videoEl.videoWidth || 1280;
      const h = videoEl.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      if (filterCss && filterCss !== 'none') {
        ctx.filter = filterCss;
      }
      if (mirror) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoEl, 0, 0, w, h);

      const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve({ blob, width: w, height: h }), mime, 0.92);
      });
    }
  };
}
