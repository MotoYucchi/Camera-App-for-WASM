import { PHOTO_FORMATS, VIDEO_FORMATS } from './constants/cameraConfig.js';
import { initCameraControls } from './components/cameraControls.js';
import { initGallery } from './components/gallery.js';
import { initPreviewModal } from './components/previewModal.js';
import { initProDial } from './components/proDial.js';
import { initViewfinder } from './components/viewfinder.js';
import { i18n, t } from './i18n/i18n.js';
import { cameraService } from './services/cameraService.js';
import { wasmService } from './services/wasmService.js';
import { store } from './state/store.js';
import { formatTimestampForFilename } from './utils/formatters.js';
import { initLongPressTooltips } from './utils/longPress.js';
import { showToast } from './utils/toast.js';

function pickSupportedRecorderMime() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for (const mime of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

function initApp() {
  i18n.applyToDOM();
  initLongPressTooltips();
  initProDial();

  const langSelector = document.getElementById('lang-selector');
  const statusBadge = document.getElementById('wasm-status-badge');
  const statusText = document.getElementById('wasm-status-text');
  const btnPreloadWasm = document.getElementById('btn-preload-wasm');
  const btnTopWasm = document.getElementById('btn-top-wasm');

  let mediaRecorder = null;
  let recordedChunks = [];
  let recTimerInterval = null;
  let isCountingDown = false;

  function syncWasmBadge() {
    if (statusBadge) statusBadge.className = `status-badge status-${store.wasmStatus}`;
    if (statusText) statusText.textContent = store.getWasmStatusText();
    const busy = store.wasmStatus === 'loading' || store.wasmStatus === 'ready' || store.wasmStatus === 'busy';
    if (btnPreloadWasm) btnPreloadWasm.disabled = busy;
    if (btnTopWasm) {
      btnTopWasm.classList.toggle('active', store.wasmStatus === 'ready');
    }
  }

  store.subscribe(syncWasmBadge);
  i18n.subscribe(syncWasmBadge);
  syncWasmBadge();

  langSelector?.addEventListener('change', (e) => {
    i18n.setLang(e.target.value, { persist: true });
    showToast(t('toast.langChanged'), 'info');
  });

  function preloadWasm() {
    wasmService.ensureLoaded((status, key) => store.setWasmStatus(status, key)).catch(() => {});
  }

  btnPreloadWasm?.addEventListener('click', preloadWasm);
  btnTopWasm?.addEventListener('click', preloadWasm);

  const previewModal = initPreviewModal();
  const gallery = initGallery({
    onOpenPreview: (id) => previewModal.open(id)
  });

  const viewfinder = initViewfinder({
    onStartCamera: () => activateCamera({ deviceId: store.activeDeviceId, facingMode: store.facingMode }),
    onSwitchFacing: () => switchFacingMode(),
    onSelectDevice: (deviceId) => selectDevice(deviceId),
    onShutter: () => handleShutter(),
    onOpenGallery: () => gallery.openOverlay()
  });

  async function activateCamera({
    deviceId = '',
    facingMode = store.facingMode,
    resolutionId = store.resolutionId,
    customWidth = store.customWidth,
    customHeight = store.customHeight,
    fps = store.fps,
    includeAudio = store.includeAudio
  } = {}) {
    store.setState({ cameraState: 'starting', cameraError: null });
    try {
      const res = await cameraService.startCamera({
        deviceId,
        facingMode,
        resolutionId,
        customWidth,
        customHeight,
        fps,
        includeAudio
      });
      viewfinder.setStream(res.stream);
      store.setState({
        cameraState: 'active',
        cameraError: null,
        devices: res.devices,
        capabilities: res.capabilities || {},
        activeDeviceId: res.activeDeviceId,
        facingMode: res.facingMode,
        mirror: res.facingMode === 'user',
        actualResolution: res.width && res.height ? `${res.width}×${res.height}` : ''
      });
      return res;
    } catch (err) {
      viewfinder.setStream(null);
      store.setState({
        cameraState: 'error',
        cameraError: err.message
      });
      showToast(err.message, 'error');
      return null;
    }
  }

  async function switchFacingMode() {
    if (store.isRecording) return;
    const nextFacing = store.facingMode === 'user' ? 'environment' : 'user';
    const res = await activateCamera({
      deviceId: '',
      facingMode: nextFacing
    });
    if (res?.label) {
      showToast(t('toast.cameraSwitched', { label: res.label }), 'info');
    }
  }

  async function selectDevice(deviceId) {
    if (store.isRecording || !deviceId) return;
    const res = await activateCamera({ deviceId });
    if (res?.label) {
      showToast(t('toast.cameraSwitched', { label: res.label }), 'info');
    }
  }

  async function refreshDevices() {
    const devices = await cameraService.enumerateVideoDevices();
    store.setState({ devices });
  }

  async function handleShutter() {
    if (store.cameraState !== 'active' || isCountingDown) return;

    if (store.mode === 'photo') {
      if (store.timerSeconds > 0) {
        isCountingDown = true;
        await viewfinder.runCountdown(store.timerSeconds);
        isCountingDown = false;
      }

      if (store.pro.nightSight) {
        showToast(t('vf.nightCapturing'), 'info', 1200);
      }

      viewfinder.triggerFlash();

      const fmt = PHOTO_FORMATS[store.photoFormat] || PHOTO_FORMATS.png;
      const { blob, width, height } = await viewfinder.captureFrameToBlob({
        format: fmt.id,
        mirror: store.mirror,
        nightSight: store.pro.nightSight
      });

      if (blob) {
        const name = `photo_${formatTimestampForFilename()}.${fmt.ext}`;
        store.addCapture({
          type: 'photo',
          blob,
          name,
          format: fmt.id,
          width,
          height
        });
        showToast(t('toast.photoCaptured', { format: fmt.id.toUpperCase() }), 'success');
      }
      return;
    }

    if (!store.isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }

  function startRecording() {
    if (!cameraService.stream) return;
    const mimeType = pickSupportedRecorderMime();
    recordedChunks = [];

    try {
      mediaRecorder = mimeType
        ? new MediaRecorder(cameraService.stream, { mimeType })
        : new MediaRecorder(cameraService.stream);
    } catch {
      mediaRecorder = new MediaRecorder(cameraService.stream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      clearInterval(recTimerInterval);
      store.setState({ isRecording: false, recordingSeconds: 0 });

      const rawBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
      const targetFmt = VIDEO_FORMATS[store.videoFormat] || VIDEO_FORMATS.webm;
      const baseName = `video_${formatTimestampForFilename()}`;

      const item = store.addCapture({
        type: 'video',
        blob: rawBlob,
        name: `${baseName}.webm`,
        format: 'webm',
        converting: targetFmt.useWasm
      });

      showToast(t('toast.videoRecorded'), 'success');

      if (targetFmt.useWasm) {
        try {
          const res = await wasmService.convertVideo(rawBlob, targetFmt.id, {
            onStatus: (status, key) => store.setWasmStatus(status, key)
          });
          store.updateCapture(item.id, {
            blob: res.blob,
            format: res.format,
            name: `${baseName}.${res.ext}`,
            converting: false
          });
          showToast(t('toast.wasmConverted', { format: res.format.toUpperCase() }), 'success');
        } catch (err) {
          store.updateCapture(item.id, { converting: false });
          showToast(t('toast.wasmFailed', { msg: err.message }), 'error');
        }
      }
    };

    mediaRecorder.start(250);
    store.setState({ isRecording: true, recordingSeconds: 0 });
    recTimerInterval = setInterval(() => {
      store.setState({ recordingSeconds: store.recordingSeconds + 1 });
    }, 1000);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }

  initCameraControls({
    onSelectDevice: selectDevice,
    onRefreshDevices: refreshDevices,
    onSwitchFacing: switchFacingMode,
    onChangeResolution: (resolutionId) => {
      store.setState({ resolutionId });
      if (store.cameraState === 'active') {
        activateCamera({ deviceId: store.activeDeviceId, facingMode: store.facingMode, resolutionId });
      }
    },
    onChangeFps: (fps) => {
      store.setState({ fps });
      if (store.cameraState === 'active') {
        activateCamera({ deviceId: store.activeDeviceId, facingMode: store.facingMode, fps });
      }
    },
    onApplyCustomResolution: (customWidth, customHeight) => {
      store.setState({ resolutionId: 'manual', customWidth, customHeight });
      if (store.cameraState === 'active') {
        activateCamera({ deviceId: store.activeDeviceId, facingMode: store.facingMode, resolutionId: 'manual', customWidth, customHeight });
      }
    },
    onChangeAudio: (includeAudio) => {
      store.setState({ includeAudio });
      if (store.cameraState === 'active') {
        activateCamera({ deviceId: store.activeDeviceId, facingMode: store.facingMode, includeAudio });
      }
    }
  });

  cameraService.onDeviceChange((devices) => {
    store.setState({ devices });
  });

  window.addEventListener('beforeunload', () => {
    cameraService.stopStream();
  });
}

document.addEventListener('DOMContentLoaded', initApp);
