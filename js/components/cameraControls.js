import { FILTER_PRESETS, PHOTO_FORMATS, RESOLUTION_PRESETS, VIDEO_FORMATS } from '../constants/cameraConfig.js';
import { i18n, t } from '../i18n/i18n.js';
import { cameraService } from '../services/cameraService.js';
import { store } from '../state/store.js';
import { showToast } from '../utils/toast.js';

export function initCameraControls({ onSelectDevice, onRefreshDevices, onSwitchFacing, onChangeResolution, onChangeAudio }) {
  // 1. Bottom-Left: Photo Settings Bottom Sheet (Pixel Camera style)
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsSheetBackdrop = document.getElementById('settings-sheet-backdrop');
  const btnOpenFullFromSheet = document.getElementById('btn-open-full-settings');

  // 2. Full-Screen Detailed Settings Overlay (opened via "..." in Photo Settings sheet)
  const settingsOverlay = document.getElementById('settings-overlay');
  const btnCloseSettings = document.getElementById('btn-close-settings');

  // 3. Bottom-Right: Quick & Manual Pro Bottom Sheet
  const btnOpenQuick = document.getElementById('btn-open-quick');
  const quickBackdrop = document.getElementById('quick-sheet-backdrop');
  const btnCloseQuick = document.getElementById('btn-close-quick');
  const btnResetPro = document.getElementById('btn-reset-pro');

  // Photo Settings Sheet Elements
  const sheetTimerVal = document.getElementById('sheet-timer-val');
  const sheetGridVal = document.getElementById('sheet-grid-val');
  const sheetMirrorVal = document.getElementById('sheet-mirror-val');
  const sheetPhotoFmtVal = document.getElementById('sheet-photo-fmt-val');
  const sheetVideoFmtVal = document.getElementById('sheet-video-fmt-val');
  const sheetAudioVal = document.getElementById('sheet-audio-val');

  // Full-Screen Settings Controls
  const deviceSelect = document.getElementById('ctrl-device');
  const btnRefresh = document.getElementById('btn-refresh-devices');
  const btnFlip = document.getElementById('btn-ctrl-flip');
  const resolutionSelect = document.getElementById('ctrl-resolution');
  const gridSelect = document.getElementById('ctrl-grid');
  const timerSelect = document.getElementById('ctrl-timer');
  const mirrorCheckbox = document.getElementById('ctrl-mirror');
  const audioCheckbox = document.getElementById('ctrl-audio');
  const langSelectOverlay = document.getElementById('ctrl-lang-overlay');

  // Quick & Pro Sheet Elements
  const filterChipsEl = document.getElementById('ctrl-filter-chips');
  const proBrightness = document.getElementById('pro-brightness');
  const proBrightnessVal = document.getElementById('pro-brightness-val');
  const proShadows = document.getElementById('pro-shadows');
  const proShadowsVal = document.getElementById('pro-shadows-val');
  const proWbShift = document.getElementById('pro-wb-shift');
  const proWbShiftVal = document.getElementById('pro-wb-shift-val');
  const proNightSight = document.getElementById('pro-night-sight');

  // Hardware WebRTC Pro Controls
  const proEv = document.getElementById('pro-ev');
  const proEvVal = document.getElementById('pro-ev-val');
  const proEvAuto = document.getElementById('pro-ev-auto');
  const proEvHwBadge = document.getElementById('pro-ev-hw');

  const proIso = document.getElementById('pro-iso');
  const proIsoVal = document.getElementById('pro-iso-val');
  const proIsoAuto = document.getElementById('pro-iso-auto');
  const proIsoHwBadge = document.getElementById('pro-iso-hw');

  const proShutter = document.getElementById('pro-shutter');
  const proShutterVal = document.getElementById('pro-shutter-val');
  const proShutterAuto = document.getElementById('pro-shutter-auto');
  const proShutterHwBadge = document.getElementById('pro-shutter-hw');

  const proFocus = document.getElementById('pro-focus');
  const proFocusVal = document.getElementById('pro-focus-val');
  const proFocusAuto = document.getElementById('pro-focus-auto');
  const proFocusHwBadge = document.getElementById('pro-focus-hw');

  const proColorTemp = document.getElementById('pro-color-temp');
  const proColorTempVal = document.getElementById('pro-color-temp-val');
  const proWbAuto = document.getElementById('pro-wb-auto');
  const proWbHwBadge = document.getElementById('pro-wb-hw');

  // Sheet & Overlay Open/Close
  btnOpenSettings?.addEventListener('click', () => settingsSheetBackdrop.classList.remove('hidden'));
  settingsSheetBackdrop?.addEventListener('click', (e) => {
    if (e.target === settingsSheetBackdrop) settingsSheetBackdrop.classList.add('hidden');
  });

  btnOpenFullFromSheet?.addEventListener('click', () => {
    settingsSheetBackdrop.classList.add('hidden');
    settingsOverlay.classList.remove('hidden');
  });
  btnCloseSettings?.addEventListener('click', () => settingsOverlay.classList.add('hidden'));

  btnCloseQuick?.addEventListener('click', () => quickBackdrop.classList.add('hidden'));
  quickBackdrop?.addEventListener('click', (e) => {
    if (e.target === quickBackdrop) quickBackdrop.classList.add('hidden');
  });

  // Pill Choice Delegated Handlers in Photo Settings Sheet
  settingsSheetBackdrop?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-choice');
    if (!btn) return;
    const { setting, value } = btn.dataset;
    if (setting === 'timer') store.setState({ timerSeconds: Number(value) });
    if (setting === 'grid') store.setState({ gridMode: value });
    if (setting === 'mirror') store.setState({ mirror: value === 'true' });
    if (setting === 'photoFormat') store.setState({ photoFormat: value });
    if (setting === 'videoFormat') store.setState({ videoFormat: value });
    if (setting === 'audio') onChangeAudio(value === 'true');
  });

  // Populate static selects in Full-Screen Settings
  RESOLUTION_PRESETS.forEach((res) => {
    const opt = document.createElement('option');
    opt.value = res.id;
    opt.textContent = res.label;
    resolutionSelect.appendChild(opt);
  });

  // Filter chips in Quick Sheet
  FILTER_PRESETS.forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip';
    btn.dataset.filterId = f.id;
    btn.textContent = f.label;
    btn.addEventListener('click', () => store.setState({ filterId: f.id }));
    filterChipsEl.appendChild(btn);
  });

  // Full-Screen Settings Listeners
  deviceSelect.addEventListener('change', (e) => onSelectDevice(e.target.value));
  btnRefresh.addEventListener('click', onRefreshDevices);
  btnFlip.addEventListener('click', onSwitchFacing);
  resolutionSelect.addEventListener('change', (e) => onChangeResolution(e.target.value));
  gridSelect.addEventListener('change', (e) => store.setState({ gridMode: e.target.value }));
  timerSelect.addEventListener('change', (e) => store.setState({ timerSeconds: Number(e.target.value) || 0 }));
  mirrorCheckbox.addEventListener('change', (e) => store.setState({ mirror: e.target.checked }));
  audioCheckbox.addEventListener('change', (e) => onChangeAudio(e.target.checked));
  langSelectOverlay?.addEventListener('change', (e) => {
    i18n.setLang(e.target.value, { persist: true });
    showToast(t('toast.langChanged'), 'info');
  });

  // Software Pro Sliders
  proBrightness?.addEventListener('input', (e) => store.setPro({ brightness: Number(e.target.value) }));
  proShadows?.addEventListener('input', (e) => store.setPro({ shadows: Number(e.target.value) }));
  proWbShift?.addEventListener('input', (e) => store.setPro({ wbShift: Number(e.target.value) }));
  proNightSight?.addEventListener('change', (e) => store.setPro({ nightSight: e.target.checked }));

  // Hardware WebRTC Pro Sliders
  proEv?.addEventListener('input', async (e) => {
    const val = Number(e.target.value);
    store.setPro({ ev: val, evAuto: false });
    await cameraService.applyAdvancedConstraint({ exposureCompensation: val });
  });
  proEvAuto?.addEventListener('click', async () => {
    store.setPro({ ev: 0, evAuto: true });
    await cameraService.applyAdvancedConstraint({ exposureCompensation: 0 });
  });

  proIso?.addEventListener('input', async (e) => {
    const val = Number(e.target.value);
    store.setPro({ iso: val, isoAuto: false });
    await cameraService.applyAdvancedConstraint({ exposureMode: 'manual', iso: val });
  });
  proIsoAuto?.addEventListener('click', async () => {
    store.setPro({ isoAuto: true });
    await cameraService.applyAdvancedConstraint({ exposureMode: 'continuous' });
  });

  proShutter?.addEventListener('input', async (e) => {
    const val = Number(e.target.value);
    store.setPro({ shutter: val, shutterAuto: false });
    await cameraService.applyAdvancedConstraint({ exposureMode: 'manual', exposureTime: val });
  });
  proShutterAuto?.addEventListener('click', async () => {
    store.setPro({ shutterAuto: true });
    await cameraService.applyAdvancedConstraint({ exposureMode: 'continuous' });
  });

  proFocus?.addEventListener('input', async (e) => {
    const val = Number(e.target.value);
    store.setPro({ focus: val, focusAuto: false });
    await cameraService.applyAdvancedConstraint({ focusMode: 'manual', focusDistance: val });
  });
  proFocusAuto?.addEventListener('click', async () => {
    store.setPro({ focusAuto: true });
    await cameraService.applyAdvancedConstraint({ focusMode: 'continuous' });
  });

  proColorTemp?.addEventListener('input', async (e) => {
    const val = Number(e.target.value);
    store.setPro({ colorTemp: val, wbAuto: false });
    await cameraService.applyAdvancedConstraint({ whiteBalanceMode: 'manual', colorTemperature: val });
  });
  proWbAuto?.addEventListener('click', async () => {
    store.setPro({ wbAuto: true });
    await cameraService.applyAdvancedConstraint({ whiteBalanceMode: 'continuous' });
  });

  btnResetPro?.addEventListener('click', async () => {
    store.resetPro();
    await cameraService.applyAdvancedConstraint({
      exposureMode: 'continuous',
      focusMode: 'continuous',
      whiteBalanceMode: 'continuous',
      exposureCompensation: 0
    });
  });

  function syncHwRange(rangeEl, autoBtn, badgeEl, cap, val, isAuto, formatFn) {
    if (!rangeEl) return;
    const supported = Boolean(cap && typeof cap.min === 'number' && typeof cap.max === 'number');
    rangeEl.disabled = !supported || store.cameraState !== 'active';
    if (autoBtn) {
      autoBtn.classList.toggle('hidden', !supported);
      autoBtn.classList.toggle('active', isAuto);
    }
    if (badgeEl) {
      badgeEl.classList.toggle('hidden', supported);
    }
    if (supported) {
      rangeEl.min = cap.min;
      rangeEl.max = cap.max;
      rangeEl.step = cap.step || (cap.max - cap.min) / 40;
      rangeEl.value = Math.min(cap.max, Math.max(cap.min, val || cap.min));
    }
    return supported ? (isAuto ? t('pro.auto') : formatFn(Number(rangeEl.value))) : t('pro.hwUnsupported');
  }

  function sync() {
    // Photo Settings Sheet Pill Highlights & Values
    if (sheetTimerVal) sheetTimerVal.textContent = store.timerSeconds === 0 ? 'OFF' : `${store.timerSeconds}s`;
    if (sheetGridVal) sheetGridVal.textContent = store.gridMode.toUpperCase();
    if (sheetMirrorVal) sheetMirrorVal.textContent = store.mirror ? 'ON' : 'OFF';
    if (sheetPhotoFmtVal) sheetPhotoFmtVal.textContent = (PHOTO_FORMATS[store.photoFormat]?.label || store.photoFormat).toUpperCase();
    if (sheetVideoFmtVal) sheetVideoFmtVal.textContent = (VIDEO_FORMATS[store.videoFormat]?.label || store.videoFormat).toUpperCase();
    if (sheetAudioVal) sheetAudioVal.textContent = store.includeAudio ? 'ON' : 'OFF';

    settingsSheetBackdrop?.querySelectorAll('.pill-choice').forEach((btn) => {
      const { setting, value } = btn.dataset;
      let active = false;
      if (setting === 'timer') active = String(store.timerSeconds) === value;
      if (setting === 'grid') active = store.gridMode === value;
      if (setting === 'mirror') active = String(store.mirror) === value;
      if (setting === 'photoFormat') active = store.photoFormat === value;
      if (setting === 'videoFormat') active = store.videoFormat === value;
      if (setting === 'audio') active = String(store.includeAudio) === value;
      btn.classList.toggle('active', active);
    });

    // Device Dropdown
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
    if (langSelectOverlay) langSelectOverlay.value = i18n.getLang();

    filterChipsEl.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.filterId === store.filterId);
    });

    // Software Pro Sliders
    const p = store.pro;
    if (proBrightness) proBrightness.value = p.brightness;
    if (proBrightnessVal) proBrightnessVal.textContent = `${Math.round(p.brightness * 100)}%`;
    if (proShadows) proShadows.value = p.shadows;
    if (proShadowsVal) proShadowsVal.textContent = p.shadows > 0 ? `+${p.shadows}` : `${p.shadows}`;
    if (proWbShift) proWbShift.value = p.wbShift;
    if (proWbShiftVal) proWbShiftVal.textContent = p.wbShift === 0 ? 'Neutral' : p.wbShift > 0 ? `+${p.wbShift} Warm` : `${p.wbShift} Cool`;
    if (proNightSight) proNightSight.checked = p.nightSight;

    // Hardware Pro Sliders
    const caps = store.capabilities || {};
    if (proEvVal) {
      proEvVal.textContent = syncHwRange(proEv, proEvAuto, proEvHwBadge, caps.exposureCompensation, p.ev, p.evAuto, (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} EV`);
    }
    if (proIsoVal) {
      proIsoVal.textContent = syncHwRange(proIso, proIsoAuto, proIsoHwBadge, caps.iso, p.iso, p.isoAuto, (v) => `ISO ${Math.round(v)}`);
    }
    if (proShutterVal) {
      proShutterVal.textContent = syncHwRange(proShutter, proShutterAuto, proShutterHwBadge, caps.exposureTime, p.shutter, p.shutterAuto, (v) => {
        // exposureTime is typically in 100µs units or seconds depending on browser
        const sec = v > 1 ? v / 10000 : v;
        return sec < 1 ? `1/${Math.max(1, Math.round(1 / sec))}s` : `${sec.toFixed(1)}s`;
      });
    }
    if (proFocusVal) {
      proFocusVal.textContent = syncHwRange(proFocus, proFocusAuto, proFocusHwBadge, caps.focusDistance, p.focus, p.focusAuto, (v) => `${v.toFixed(2)}m`);
    }
    if (proColorTempVal) {
      proColorTempVal.textContent = syncHwRange(proColorTemp, proWbAuto, proWbHwBadge, caps.colorTemperature, p.colorTemp, p.wbAuto, (v) => `${Math.round(v)}K`);
    }
  }

  store.subscribe(sync);
  i18n.subscribe(sync);
  sync();
}
