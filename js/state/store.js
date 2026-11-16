import { createDefaultProSettings } from '../constants/cameraConfig.js';
import { t } from '../i18n/i18n.js';

let nextCaptureId = 1;

class CameraStore {
  constructor() {
    this.devices = [];
    this.activeDeviceId = '';
    this.facingMode = 'environment'; // 'environment' | 'user'
    this.resolutionId = '1080p';
    this.gridMode = 'thirds'; // 'none' | 'thirds' | 'cross'
    this.timerSeconds = 0; // 0 | 3 | 5 | 10
    this.mirror = false;
    this.includeAudio = false;
    this.flickerMode = 'auto'; // 'auto' | '50' | '60'
    this.filterId = 'none';
    this.mode = 'photo'; // 'photo' | 'video'
    this.photoFormat = 'png';
    this.videoFormat = 'mp4';

    this.capabilities = {};
    this.pro = createDefaultProSettings();

    this.cameraState = 'idle'; // 'idle' | 'starting' | 'active' | 'error'
    this.cameraError = null;
    this.actualResolution = '';
    this.isRecording = false;
    this.recordingSeconds = 0;

    this.wasmStatus = 'idle'; // 'idle' | 'loading' | 'ready' | 'busy' | 'error'
    this.wasmStatusKey = 'wasm.idle';

    this.captures = [];
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      fn(this);
    }
  }

  setState(patch) {
    Object.assign(this, patch);
    this.notify();
  }

  setPro(patch) {
    this.pro = { ...this.pro, ...patch };
    this.notify();
  }

  resetPro() {
    this.pro = createDefaultProSettings();
    this.notify();
  }

  setWasmStatus(status, key) {
    this.wasmStatus = status;
    this.wasmStatusKey = key || `wasm.${status}`;
    this.notify();
  }

  addCapture(entry) {
    const id = `cap-${nextCaptureId++}`;
    const url = URL.createObjectURL(entry.blob);
    const item = {
      id,
      type: entry.type,
      blob: entry.blob,
      url,
      name: entry.name,
      format: entry.format,
      size: entry.blob.size,
      width: entry.width || 0,
      height: entry.height || 0,
      createdAt: new Date(),
      converting: false
    };
    this.captures.unshift(item);
    this.notify();
    return item;
  }

  getCapture(id) {
    return this.captures.find((c) => c.id === id) || null;
  }

  updateCapture(id, patch) {
    const item = this.getCapture(id);
    if (!item) return;
    if (patch.blob && item.url) {
      URL.revokeObjectURL(item.url);
      patch.url = URL.createObjectURL(patch.blob);
      patch.size = patch.blob.size;
    }
    Object.assign(item, patch);
    this.notify();
  }

  removeCapture(id) {
    const idx = this.captures.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const [removed] = this.captures.splice(idx, 1);
    if (removed.url) URL.revokeObjectURL(removed.url);
    this.notify();
  }

  clearCaptures() {
    for (const item of this.captures) {
      if (item.url) URL.revokeObjectURL(item.url);
    }
    this.captures = [];
    this.notify();
  }

  getWasmStatusText() {
    return t(this.wasmStatusKey);
  }
}

export const store = new CameraStore();
