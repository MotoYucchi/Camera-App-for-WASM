import { RESOLUTION_PRESETS } from '../constants/cameraConfig.js';
import { t } from '../i18n/i18n.js';

class CameraService {
  constructor() {
    this.stream = null;
    this.deviceChangeHandler = null;
  }

  isSupported() {
    return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  isSecureContextOk() {
    return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  stopStream() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
  }

  async enumerateVideoDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${idx + 1}`
      }));
  }

  buildVideoConstraints({ deviceId, facingMode, resolutionId }) {
    const res = RESOLUTION_PRESETS.find((r) => r.id === resolutionId);
    const video = {};

    if (deviceId) {
      video.deviceId = { exact: deviceId };
    } else if (facingMode) {
      video.facingMode = { ideal: facingMode };
    }

    if (res && res.width && res.height) {
      video.width = { ideal: res.width };
      video.height = { ideal: res.height };
    }

    return video;
  }

  async startCamera({ deviceId = '', facingMode = 'environment', resolutionId = '1080p', includeAudio = false } = {}) {
    if (!this.isSecureContextOk()) {
      throw new Error(t('err.insecure'));
    }
    if (!this.isSupported()) {
      throw new Error(t('err.notFound'));
    }

    // Always release previous camera stream before requesting a new one
    this.stopStream();

    const videoConstraints = this.buildVideoConstraints({ deviceId, facingMode, resolutionId });
    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: includeAudio
      });
    } catch (err) {
      // Retry with relaxed constraints if OverconstrainedError or resolution fails
      if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        const fallbackVideo = deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: facingMode } };
        stream = await navigator.mediaDevices.getUserMedia({
          video: fallbackVideo,
          audio: includeAudio
        });
      } else {
        throw new Error(this.formatCameraError(err));
      }
    }

    this.stream = stream;
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack?.getSettings?.() || {};
    const devices = await this.enumerateVideoDevices();

    return {
      stream,
      devices,
      activeDeviceId: settings.deviceId || deviceId || '',
      facingMode: settings.facingMode || facingMode,
      width: settings.width || 0,
      height: settings.height || 0,
      label: videoTrack?.label || ''
    };
  }

  formatCameraError(err) {
    if (!err) return t('err.generic', { msg: 'Unknown error' });
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return t('err.notAllowed');
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return t('err.notFound');
      case 'NotReadableError':
      case 'TrackStartError':
        return t('err.notReadable');
      default:
        return t('err.generic', { msg: err.message || err.name });
    }
  }

  onDeviceChange(callback) {
    if (!navigator.mediaDevices?.addEventListener) return;
    if (this.deviceChangeHandler) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
    }
    this.deviceChangeHandler = async () => {
      const devices = await this.enumerateVideoDevices();
      callback(devices);
    };
    navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
  }
}

export const cameraService = new CameraService();
