import { FILTER_PRESETS } from '../constants/cameraConfig.js';
import { store } from '../state/store.js';
import { formatDuration } from '../utils/formatters.js';

export function buildCompositeFilterCss() {
  const parts = [];
  const preset = FILTER_PRESETS.find((f) => f.id === store.filterId);
  if (preset?.css) parts.push(preset.css);

  const p = store.pro;
  let brightness = p.brightness;
  let contrast = 1 + (p.shadows * -0.004); // lifting shadows softens harsh contrast slightly

  if (p.nightSight) {
    brightness *= 1.32;
    contrast *= 1.08;
  }

  if (Math.abs(brightness - 1) > 0.01) {
    parts.push(`brightness(${brightness.toFixed(2)})`);
  }
  if (Math.abs(contrast - 1) > 0.01) {
    parts.push(`contrast(${contrast.toFixed(2)})`);
  }
  if (p.shadows > 0) {
    // Subtle saturation compensation when lifting shadows
    parts.push(`saturate(${(1 + p.shadows * 0.003).toFixed(2)})`);
  }
  if (p.wbShift > 0) {
    // Warm shift
    const amt = (p.wbShift / 100).toFixed(2);
    parts.push(`sepia(${amt}) saturate(${(1 + p.wbShift * 0.004).toFixed(2)})`);
  } else if (p.wbShift < 0) {
    // Cool shift
    const deg = Math.round(p.wbShift * 0.35);
    parts.push(`hue-rotate(${deg}deg) saturate(${(1 + Math.abs(p.wbShift) * 0.003).toFixed(2)})`);
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

export function initViewfinder({ onStartCamera, onSwitchFacing, onSelectDevice, onShutter, onOpenGallery }) {
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
  const lensBarEl = document.getElementById('vf-lens-bar');

  const btnTopTimer = document.getElementById('btn-top-timer');
  const btnTopGrid = document.getElementById('btn-top-grid');
  const btnTopMirror = document.getElementById('btn-top-mirror');
  const btnTopNight = document.getElementById('btn-top-night');

  const btnGalleryThumb = document.getElementById('btn-gallery-thumb');
  const btnSwitchFacing = document.getElementById('btn-switch-facing');
  const btnModePhoto = document.getElementById('btn-mode-photo');
  const btnModeVideo = document.getElementById('btn-mode-video');
  const btnShutter = document.getElementById('btn-shutter');

  btnStartCam?.addEventListener('click', onStartCamera);
  btnSwitchFacing?.addEventListener('click', onSwitchFacing);
  btnGalleryThumb?.addEventListener('click', onOpenGallery);

  btnModePhoto?.addEventListener('click', () => {
    if (!store.isRecording) store.setState({ mode: 'photo' });
  });
  btnModeVideo?.addEventListener('click', () => {
    if (!store.isRecording) store.setState({ mode: 'video' });
  });
  btnShutter?.addEventListener('click', onShutter);

  btnTopTimer?.addEventListener('click', () => {
    const cycle = [0, 3, 5, 10];
    const next = cycle[(cycle.indexOf(store.timerSeconds) + 1) % cycle.length];
    store.setState({ timerSeconds: next });
  });

  btnTopGrid?.addEventListener('click', () => {
    const cycle = ['none', 'thirds', 'cross'];
    const next = cycle[(cycle.indexOf(store.gridMode) + 1) % cycle.length];
    store.setState({ gridMode: next });
  });

  btnTopMirror?.addEventListener('click', () => {
    store.setState({ mirror: !store.mirror });
  });

  btnTopNight?.addEventListener('click', () => {
    store.setPro({ nightSight: !store.pro.nightSight });
  });

  function renderLensBar() {
    lensBarEl.innerHTML = '';
    if (store.cameraState !== 'active' || store.devices.length <= 1) {
      lensBarEl.classList.add('hidden');
      return;
    }

    lensBarEl.classList.remove('hidden');
    store.devices.forEach((dev, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lens-pill-btn';
      if (dev.deviceId === store.activeDeviceId) {
        btn.classList.add('active');
      }
      const lower = dev.label.toLowerCase();
      let shortLabel = `${idx + 1}`;
      if (lower.includes('ultra') || lower.includes('0.5')) shortLabel = '.5';
      else if (lower.includes('tele')) shortLabel = '2x';
      else if (lower.includes('front') || lower.includes('user')) shortLabel = 'F';
      else if (lower.includes('back') || lower.includes('rear') || lower.includes('wide')) shortLabel = `${idx + 1}x`;

      btn.textContent = shortLabel;
      btn.title = dev.label;
      btn.disabled = store.isRecording;
      btn.addEventListener('click', () => onSelectDevice(dev.deviceId));
      lensBarEl.appendChild(btn);
    });
  }

  function renderGalleryThumb() {
    const latest = store.captures[0];
    if (!latest) {
      btnGalleryThumb.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>`;
      return;
    }
    btnGalleryThumb.innerHTML = '';
    if (latest.type === 'photo' || latest.format === 'gif') {
      const img = document.createElement('img');
      img.src = latest.url;
      img.alt = latest.name;
      btnGalleryThumb.appendChild(img);
    } else {
      const vid = document.createElement('video');
      vid.src = latest.url;
      vid.muted = true;
      vid.playsInline = true;
      btnGalleryThumb.appendChild(vid);
    }
  }

  function sync() {
    const active = store.cameraState === 'active';
    placeholderEl.classList.toggle('hidden', active);

    if (store.cameraState === 'error' && store.cameraError) {
      placeholderTitleEl.textContent = 'Camera Error';
      placeholderDescEl.textContent = store.cameraError;
    }

    videoEl.classList.toggle('mirrored', Boolean(store.mirror));
    videoEl.style.filter = buildCompositeFilterCss();

    gridEl.className = 'grid-overlay';
    if (store.gridMode === 'thirds') gridEl.classList.add('grid-thirds');
    if (store.gridMode === 'cross') gridEl.classList.add('grid-cross');

    btnTopTimer?.classList.toggle('active', store.timerSeconds > 0);
    btnTopGrid?.classList.toggle('active', store.gridMode !== 'none');
    btnTopMirror?.classList.toggle('active', store.mirror);
    btnTopNight?.classList.toggle('active', store.pro.nightSight);

    if (active && store.actualResolution) {
      resBadgeEl.textContent = store.actualResolution;
      resBadgeEl.classList.remove('hidden');
    } else {
      resBadgeEl.classList.add('hidden');
    }

    recBadgeEl.classList.toggle('hidden', !store.isRecording);
    recTimeEl.textContent = formatDuration(store.recordingSeconds);

    btnModePhoto.classList.toggle('active', store.mode === 'photo');
    btnModeVideo.classList.toggle('active', store.mode === 'video');
    btnModePhoto.disabled = store.isRecording;
    btnModeVideo.disabled = store.isRecording;

    btnShutter.disabled = !active;
    btnShutter.classList.toggle('video-mode', store.mode === 'video');
    btnShutter.classList.toggle('recording', store.isRecording);
    btnSwitchFacing.disabled = !active || store.isRecording;

    renderLensBar();
    renderGalleryThumb();
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
    async captureFrameToBlob({ format = 'png', mirror = false, nightSight = false } = {}) {
      const w = videoEl.videoWidth || 1280;
      const h = videoEl.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: nightSight });
      const filterCss = buildCompositeFilterCss();

      const drawOnce = () => {
        ctx.save();
        ctx.clearRect(0, 0, w, h);
        if (filterCss && filterCss !== 'none') {
          ctx.filter = filterCss;
        }
        if (mirror) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoEl, 0, 0, w, h);
        ctx.restore();
      };

      if (nightSight) {
        // Multi-frame burst averaging (4 frames) for low-light noise reduction
        const frames = 4;
        const accum = new Uint32Array(w * h * 4);
        for (let f = 0; f < frames; f++) {
          drawOnce();
          const imgData = ctx.getImageData(0, 0, w, h).data;
          for (let i = 0; i < imgData.length; i++) {
            accum[i] += imgData[i];
          }
          if (f < frames - 1) {
            await new Promise((r) => setTimeout(r, 55));
          }
        }
        const out = ctx.createImageData(w, h);
        for (let i = 0; i < accum.length; i++) {
          out.data[i] = Math.min(255, Math.round(accum[i] / frames));
        }
        ctx.putImageData(out, 0, 0);
      } else {
        drawOnce();
      }

      const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve({ blob, width: w, height: h }), mime, 0.92);
      });
    }
  };
}
