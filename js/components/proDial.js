import { FILTER_PRESETS } from '../constants/cameraConfig.js';
import { t } from '../i18n/i18n.js';
import { cameraService } from '../services/cameraService.js';
import { store } from '../state/store.js';

const PARAMS = [
  { id: 'wb', label: 'WB', type: 'wb' },
  { id: 'iso', label: 'ISO', type: 'hw', capKey: 'iso' },
  { id: 'ev', label: 'EV', type: 'ev' },
  { id: 'mf', label: 'MF', type: 'hw', capKey: 'focusDistance' },
  { id: 's', label: 'S', type: 'hw', capKey: 'exposureTime' },
  { id: 'brt', label: 'BRT', type: 'sw' },
  { id: 'shd', label: 'SHD', type: 'sw' },
  { id: 'night', label: 'NIGHT', type: 'toggle' },
  { id: 'flt', label: 'FLT', type: 'filter' }
];

export function initProDial() {
  const dialOverlay = document.getElementById('pro-dial-overlay');
  const btnOpenQuick = document.getElementById('btn-open-quick');
  const btnCloseDial = document.getElementById('btn-close-pro-dial');
  const btnReset = document.getElementById('btn-pro-dial-reset');
  const btnAuto = document.getElementById('btn-pro-dial-auto');
  const btnOpenSheet = document.getElementById('btn-pro-dial-sheet');
  const readOutEl = document.getElementById('pro-dial-readout');
  const svgEl = document.getElementById('pro-dial-svg');
  const ticksGroup = document.getElementById('pro-dial-ticks');
  const stripEl = document.getElementById('pro-dial-strip');

  let activeParamId = 'wb';
  let isOpen = false;
  let hwPending = false;
  let hwQueued = null;

  function applyHardwareThrottled(constraintObj) {
    hwQueued = constraintObj;
    if (hwPending) return;
    hwPending = true;
    const flush = async () => {
      while (hwQueued) {
        const next = hwQueued;
        hwQueued = null;
        await cameraService.applyAdvancedConstraint(next);
      }
      hwPending = false;
    };
    flush();
  }

  function toggleOpen(force) {
    isOpen = typeof force === 'boolean' ? force : !isOpen;
    dialOverlay.classList.toggle('hidden', !isOpen);
    btnOpenQuick?.classList.toggle('active', isOpen);
    if (isOpen) render();
  }

  btnOpenQuick?.addEventListener('click', () => toggleOpen());
  btnCloseDial?.addEventListener('click', () => toggleOpen(false));
  btnOpenSheet?.addEventListener('click', () => {
    toggleOpen(false);
    document.getElementById('quick-sheet-backdrop')?.classList.remove('hidden');
  });

  btnReset?.addEventListener('click', async () => {
    store.resetPro();
    store.setState({ filterId: 'none' });
    await cameraService.applyAdvancedConstraint({
      exposureMode: 'continuous',
      focusMode: 'continuous',
      whiteBalanceMode: 'continuous',
      exposureCompensation: 0
    });
  });

  btnAuto?.addEventListener('click', async () => {
    const caps = store.capabilities || {};
    if (activeParamId === 'wb') {
      store.setPro({ wbAuto: true, wbShift: 0 });
      if (caps.colorTemperature) await cameraService.applyAdvancedConstraint({ whiteBalanceMode: 'continuous' });
    } else if (activeParamId === 'iso') {
      store.setPro({ isoAuto: true });
      await cameraService.applyAdvancedConstraint({ exposureMode: 'continuous' });
    } else if (activeParamId === 'ev') {
      if (caps.exposureCompensation) {
        store.setPro({ evAuto: true, ev: 0 });
        await cameraService.applyAdvancedConstraint({ exposureCompensation: 0 });
      } else {
        store.setPro({ evAuto: true, ev: 0, brightness: 1.0 });
      }
    } else if (activeParamId === 'mf') {
      store.setPro({ focusAuto: true });
      await cameraService.applyAdvancedConstraint({ focusMode: 'continuous' });
    } else if (activeParamId === 's') {
      store.setPro({ shutterAuto: true });
      await cameraService.applyAdvancedConstraint({ exposureMode: 'continuous' });
    } else if (activeParamId === 'brt') {
      store.setPro({ brightness: 1.0 });
    } else if (activeParamId === 'shd') {
      store.setPro({ shadows: 0 });
    } else if (activeParamId === 'night') {
      store.setPro({ nightSight: !store.pro.nightSight });
    } else if (activeParamId === 'flt') {
      store.setState({ filterId: 'none' });
    }
  });

  function getParamState(id) {
    const caps = store.capabilities || {};
    const p = store.pro;

    switch (id) {
      case 'wb': {
        if (caps.colorTemperature) {
          const { min, max } = caps.colorTemperature;
          const val = p.wbAuto ? (min + max) / 2 : p.colorTemp;
          return {
            supported: true,
            canAuto: true,
            isAuto: p.wbAuto,
            t: (val - min) / (max - min || 1),
            display: p.wbAuto ? 'AWB' : `${Math.round(val)}K`,
            min,
            max
          };
        }
        return {
          supported: true,
          canAuto: true,
          isAuto: p.wbShift === 0,
          t: (p.wbShift + 50) / 100,
          display: p.wbShift === 0 ? 'AWB' : (p.wbShift > 0 ? `+${p.wbShift}W` : `${p.wbShift}C`),
          min: -50,
          max: 50
        };
      }
      case 'iso': {
        const cap = caps.iso;
        if (!cap) return { supported: false, canAuto: false, isAuto: true, t: 0.5, display: 'N/A' };
        const val = p.isoAuto ? cap.min : p.iso;
        return {
          supported: true,
          canAuto: true,
          isAuto: p.isoAuto,
          t: (val - cap.min) / (cap.max - cap.min || 1),
          display: p.isoAuto ? 'auto' : `${Math.round(val)}`,
          min: cap.min,
          max: cap.max
        };
      }
      case 'ev': {
        const cap = caps.exposureCompensation;
        if (cap) {
          const val = p.evAuto ? 0 : p.ev;
          return {
            supported: true,
            canAuto: true,
            isAuto: p.evAuto,
            t: (val - cap.min) / (cap.max - cap.min || 1),
            display: p.evAuto ? '0' : `${val >= 0 ? '+' : ''}${val.toFixed(1)}`,
            min: cap.min,
            max: cap.max
          };
        }
        // Fallback to software brightness
        return {
          supported: true,
          canAuto: true,
          isAuto: Math.abs(p.brightness - 1) < 0.01,
          t: (p.brightness - 0.5) / 1.3,
          display: `${Math.round((p.brightness - 1) * 100)}%`,
          min: 0.5,
          max: 1.8
        };
      }
      case 'mf': {
        const cap = caps.focusDistance;
        if (!cap) return { supported: false, canAuto: false, isAuto: true, t: 0.5, display: 'N/A' };
        const val = p.focusAuto ? cap.min : p.focus;
        return {
          supported: true,
          canAuto: true,
          isAuto: p.focusAuto,
          t: (val - cap.min) / (cap.max - cap.min || 1),
          display: p.focusAuto ? 'auto' : `${val.toFixed(2)}`,
          min: cap.min,
          max: cap.max
        };
      }
      case 's': {
        const cap = caps.exposureTime;
        if (!cap) return { supported: false, canAuto: false, isAuto: true, t: 0.5, display: 'N/A' };
        const val = p.shutterAuto ? cap.min : p.shutter;
        const sec = val > 1 ? val / 10000 : val;
        const label = sec < 1 ? `1/${Math.max(1, Math.round(1 / sec))}` : `${sec.toFixed(1)}s`;
        return {
          supported: true,
          canAuto: true,
          isAuto: p.shutterAuto,
          t: (val - cap.min) / (cap.max - cap.min || 1),
          display: p.shutterAuto ? 'auto' : label,
          min: cap.min,
          max: cap.max
        };
      }
      case 'brt':
        return {
          supported: true,
          canAuto: true,
          isAuto: Math.abs(p.brightness - 1) < 0.01,
          t: (p.brightness - 0.5) / 1.3,
          display: `${Math.round(p.brightness * 100)}%`,
          min: 0.5,
          max: 1.8
        };
      case 'shd':
        return {
          supported: true,
          canAuto: true,
          isAuto: p.shadows === 0,
          t: (p.shadows + 40) / 100,
          display: p.shadows > 0 ? `+${p.shadows}` : `${p.shadows}`,
          min: -40,
          max: 60
        };
      case 'night':
        return {
          supported: true,
          canAuto: false,
          isAuto: false,
          t: p.nightSight ? 1 : 0,
          display: p.nightSight ? 'ON' : 'OFF'
        };
      case 'flt': {
        const idx = Math.max(0, FILTER_PRESETS.findIndex((f) => f.id === store.filterId));
        return {
          supported: true,
          canAuto: true,
          isAuto: store.filterId === 'none',
          t: idx / Math.max(1, FILTER_PRESETS.length - 1),
          display: FILTER_PRESETS[idx]?.label || 'Normal'
        };
      }
      default:
        return { supported: false, canAuto: false, isAuto: true, t: 0.5, display: '-' };
    }
  }

  function applyNormValue(id, normT) {
    const clamped = Math.max(0, Math.min(1, normT));
    const caps = store.capabilities || {};

    if (id === 'wb') {
      if (caps.colorTemperature) {
        const { min, max } = caps.colorTemperature;
        const val = Math.round(min + clamped * (max - min));
        store.setPro({ colorTemp: val, wbAuto: false });
        applyHardwareThrottled({ whiteBalanceMode: 'manual', colorTemperature: val });
      } else {
        const val = Math.round(-50 + clamped * 100);
        store.setPro({ wbShift: val });
      }
    } else if (id === 'iso' && caps.iso) {
      const { min, max } = caps.iso;
      const val = Math.round(min + clamped * (max - min));
      store.setPro({ iso: val, isoAuto: false });
      applyHardwareThrottled({ exposureMode: 'manual', iso: val });
    } else if (id === 'ev') {
      if (caps.exposureCompensation) {
        const { min, max } = caps.exposureCompensation;
        const val = Number((min + clamped * (max - min)).toFixed(1));
        store.setPro({ ev: val, evAuto: false });
        applyHardwareThrottled({ exposureCompensation: val });
      } else {
        const val = Number((0.5 + clamped * 1.3).toFixed(2));
        store.setPro({ brightness: val });
      }
    } else if (id === 'mf' && caps.focusDistance) {
      const { min, max } = caps.focusDistance;
      const val = Number((min + clamped * (max - min)).toFixed(2));
      store.setPro({ focus: val, focusAuto: false });
      applyHardwareThrottled({ focusMode: 'manual', focusDistance: val });
    } else if (id === 's' && caps.exposureTime) {
      const { min, max } = caps.exposureTime;
      const val = Math.round(min + clamped * (max - min));
      store.setPro({ shutter: val, shutterAuto: false });
      applyHardwareThrottled({ exposureMode: 'manual', exposureTime: val });
    } else if (id === 'brt') {
      const val = Number((0.5 + clamped * 1.3).toFixed(2));
      store.setPro({ brightness: val });
    } else if (id === 'shd') {
      const val = Math.round(-40 + clamped * 100);
      store.setPro({ shadows: val });
    } else if (id === 'night') {
      store.setPro({ nightSight: clamped >= 0.5 });
    } else if (id === 'flt') {
      const idx = Math.round(clamped * (FILTER_PRESETS.length - 1));
      store.setState({ filterId: FILTER_PRESETS[idx].id });
    }
  }

  function renderArcTicks(normT, supported) {
    ticksGroup.innerHTML = '';
    const cx = 180;
    const cy = 225;
    const R = 198;
    const totalTicks = 33;
    const spanDeg = 76;

    for (let i = 0; i < totalTicks; i++) {
      const u = i / (totalTicks - 1);
      const deg = (u - normT) * spanDeg;
      if (Math.abs(deg) > 46) continue;

      const rad = (deg - 90) * (Math.PI / 180);
      const isMajor = i % 4 === 0;
      const len = isMajor ? 12 : 7;
      const x1 = cx + Math.cos(rad) * R;
      const y1 = cy + Math.sin(rad) * R;
      const x2 = cx + Math.cos(rad) * (R - len);
      const y2 = cy + Math.sin(rad) * (R - len);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1.toFixed(1));
      line.setAttribute('y1', y1.toFixed(1));
      line.setAttribute('x2', x2.toFixed(1));
      line.setAttribute('y2', y2.toFixed(1));

      const fade = Math.max(0.15, 1 - Math.abs(deg) / 46);
      const isCenter = Math.abs(deg) < 1.6;
      line.setAttribute('stroke', isCenter && supported ? '#f59e0b' : `rgba(241, 244, 248, ${fade.toFixed(2)})`);
      line.setAttribute('stroke-width', isMajor || isCenter ? '2' : '1.3');
      line.setAttribute('stroke-linecap', 'round');
      ticksGroup.appendChild(line);
    }
  }

  function renderStrip() {
    stripEl.innerHTML = '';
    for (const param of PARAMS) {
      const st = getParamState(param.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pro-strip-item';
      if (param.id === activeParamId) btn.classList.add('active');
      if (!st.supported) btn.classList.add('unsupported');

      btn.innerHTML = `
        <span class="pro-strip-label">${param.label}</span>
        <span class="pro-strip-val">${st.display}</span>
      `;
      btn.addEventListener('click', () => {
        if (param.id === 'night' && activeParamId === 'night') {
          store.setPro({ nightSight: !store.pro.nightSight });
          return;
        }
        activeParamId = param.id;
        render();
      });
      stripEl.appendChild(btn);
    }
  }

  function render() {
    if (!isOpen) return;
    const st = getParamState(activeParamId);
    renderArcTicks(st.t, st.supported);
    renderStrip();

    const activeMeta = PARAMS.find((p) => p.id === activeParamId);
    if (readOutEl) {
      readOutEl.textContent = st.supported
        ? `${activeMeta?.label || ''} : ${st.display}`
        : `${activeMeta?.label || ''} : ${t('pro.hwUnsupported')}`;
    }
    if (btnAuto) {
      btnAuto.classList.toggle('hidden', !st.canAuto);
      btnAuto.classList.toggle('active', st.isAuto);
    }
  }

  // Drag-to-rotate arc dial
  let dragging = false;
  let dragStartX = 0;
  let dragStartT = 0.5;

  svgEl?.addEventListener('pointerdown', (e) => {
    const st = getParamState(activeParamId);
    if (!st.supported) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartT = st.t;
    svgEl.setPointerCapture(e.pointerId);
  });

  svgEl?.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    // Dragging left increases value, dragging right decreases (physical dial feel)
    const nextT = dragStartT - dx / 220;
    applyNormValue(activeParamId, nextT);
  });

  svgEl?.addEventListener('pointerup', () => { dragging = false; });
  svgEl?.addEventListener('pointercancel', () => { dragging = false; });

  svgEl?.addEventListener('wheel', (e) => {
    const st = getParamState(activeParamId);
    if (!st.supported) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.04 : 0.04;
    applyNormValue(activeParamId, st.t + delta);
  }, { passive: false });

  store.subscribe(render);
}
