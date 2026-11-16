import { FILTER_PRESETS, PHOTO_FORMATS, RESOLUTION_PRESETS, VIDEO_FORMATS } from '../constants/cameraConfig.js';
import { i18n, t } from '../i18n/i18n.js';
import { store } from '../state/store.js';
import { showToast } from '../utils/toast.js';

export function initCameraControls({ onSelectDevice, onRefreshDevices, onSwitchFacing, onChangeResolution, onChangeAudio }) {
  // Full-screen Settings Overlay
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsOverlay = document.getElementById('settings-overlay');
  const btnCloseSettings = document.getElementById('btn-close-settings');

  // Bottom Sheet (Quick Adjustments)
  const btnOpenQuick = document.getElementById('btn-open-quick');
  const quickBackdrop = document.getElementById('quick-sheet-backdrop');
  const btnCloseQuick = document.getElementById('btn-close-quick');

  // Detailed Settings Controls
  const deviceSelect = document.getElementById('ctrl-device');
  const btnRefresh = document.getElementById('btn-refresh-devices');
  const btnFlip = document.getElementById('btn-ctrl-flip');
  const resolutionSelect = document.getElementById('ctrl-resolution');
  const gridSelect = document.getElementById('ctrl-grid');
  const timerSelect = document.getElementById('ctrl-timer');
  const mirrorCheckbox = document.getElementById('ctrl-mirror');
  const audioCheckbox = document.getElementById('ctrl-audio');
  const langSelectOverlay = document.getElementById('ctrl-lang-overlay');

  // Quick Sheet Controls
  const filterChipsEl = document.getElementById('ctrl-filter-chips');
  const photoFormatSelect = document.getElementById('ctrl-photo-format');
  const videoFormatSelect = document.getElementById('ctrl-video-format');

  // Open/Close Full-screen Settings
  btnOpenSettings?.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
  btnCloseSettings?.addEventListener('click', () => settingsOverlay.classList.add('hidden'));

  // Open/Close Quick Bottom Sheet
  btnOpenQuick?.addEventListener('click', () => quickBackdrop.classList.remove('hidden'));
  btnCloseQuick?.addEventListener('click', () => quickBackdrop.classList.add('hidden'));
  quickBackdrop?.addEventListener('click', (e) => {
    if (e.target === quickBackdrop) quickBackdrop.classList.add('hidden');
  });

  // Populate static selects
  RESOLUTION_PRESETS.forEach((res) => {
    const opt = document.createElement('option');
    opt.value = res.id;
    opt.textContent = res.label;
    resolutionSelect.appendChild(opt);
  });

  Object.values(PHOTO_FORMATS).forEach((fmt) => {
    const opt = document.createElement('option');
    opt.value = fmt.id;
    opt.textContent = fmt.label;
    photoFormatSelect.appendChild(opt);
  });

  Object.values(VIDEO_FORMATS).forEach((fmt) => {
    const opt = document.createElement('option');
    opt.value = fmt.id;
    opt.textContent = fmt.label;
    videoFormatSelect.appendChild(opt);
  });

  FILTER_PRESETS.forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip';
    btn.dataset.filterId = f.id;
    btn.textContent = f.label;
    btn.addEventListener('click', () => {
      store.setState({ filterId: f.id });
    });
    filterChipsEl.appendChild(btn);
  });

  deviceSelect.addEventListener('change', (e) => onSelectDevice(e.target.value));
  btnRefresh.addEventListener('click', onRefreshDevices);
  btnFlip.addEventListener('click', onSwitchFacing);
  resolutionSelect.addEventListener('change', (e) => onChangeResolution(e.target.value));
  gridSelect.addEventListener('change', (e) => store.setState({ gridMode: e.target.value }));
  timerSelect.addEventListener('change', (e) => store.setState({ timerSeconds: Number(e.target.value) || 0 }));
  mirrorCheckbox.addEventListener('change', (e) => store.setState({ mirror: e.target.checked }));
  audioCheckbox.addEventListener('change', (e) => onChangeAudio(e.target.checked));
  photoFormatSelect.addEventListener('change', (e) => store.setState({ photoFormat: e.target.value }));
  videoFormatSelect.addEventListener('change', (e) => store.setState({ videoFormat: e.target.value }));

  langSelectOverlay?.addEventListener('change', (e) => {
    i18n.setLang(e.target.value, { persist: true });
    showToast(t('toast.langChanged'), 'info');
  });

  function sync() {
    const currentVal = store.activeDeviceId;
    deviceSelect.innerHTML = '';
    if (store.devices.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = t('ctrl.deviceAuto');
      deviceSelect.appendChild(opt);
    } else {
      for (const dev of store.devices) {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = dev.label;
        deviceSelect.appendChild(opt);
      }
      if (currentVal) deviceSelect.value = currentVal;
    }

    const locked = store.isRecording;
    deviceSelect.disabled = locked || store.devices.length === 0;
    resolutionSelect.disabled = locked;
    audioCheckbox.disabled = locked;
    btnFlip.disabled = locked || store.cameraState !== 'active';

    resolutionSelect.value = store.resolutionId;
    gridSelect.value = store.gridMode;
    timerSelect.value = String(store.timerSeconds);
    mirrorCheckbox.checked = store.mirror;
    audioCheckbox.checked = store.includeAudio;
    photoFormatSelect.value = store.photoFormat;
    videoFormatSelect.value = store.videoFormat;
    if (langSelectOverlay) langSelectOverlay.value = i18n.getLang();

    filterChipsEl.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.filterId === store.filterId);
    });
  }

  store.subscribe(sync);
  i18n.subscribe(sync);
  sync();
}
