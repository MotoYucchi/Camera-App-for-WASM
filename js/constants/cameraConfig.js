export const RESOLUTION_PRESETS = [
  { id: 'auto', label: 'Auto', width: null, height: null },
  { id: '2160p', label: '4K (3840×2160)', width: 3840, height: 2160 },
  { id: '1080p', label: 'Full HD (1920×1080)', width: 1920, height: 1080 },
  { id: '720p', label: 'HD (1280×720)', width: 1280, height: 720 },
  { id: '480p', label: 'SD (640×480)', width: 640, height: 480 },
  { id: 'manual', label: 'Manual (Custom)', width: null, height: null }
];

export const FILTER_PRESETS = [
  { id: 'none', label: 'Normal', css: '' },
  { id: 'vivid', label: 'Vivid', css: 'contrast(1.16) saturate(1.32)' },
  { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.12)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.28) saturate(1.22) brightness(1.03)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(-14deg) saturate(1.12) contrast(1.06)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.42) contrast(0.94) brightness(0.96)' }
];

export const PHOTO_FORMATS = {
  png: { id: 'png', label: 'PNG', ext: 'png', mime: 'image/png' },
  jpeg: { id: 'jpeg', label: 'JPEG', ext: 'jpg', mime: 'image/jpeg' },
  webp: { id: 'webp', label: 'WebP', ext: 'webp', mime: 'image/webp' }
};

export const VIDEO_FORMATS = {
  mp4: { id: 'mp4', label: 'MP4 (WASM)', ext: 'mp4', mime: 'video/mp4', useWasm: true },
  gif: { id: 'gif', label: 'GIF (WASM)', ext: 'gif', mime: 'image/gif', useWasm: true },
  webm: { id: 'webm', label: 'WebM', ext: 'webm', mime: 'video/webm', useWasm: false }
};

export function createDefaultProSettings() {
  return {
    brightness: 1.0,      // 0.5 .. 1.8 (software)
    shadows: 0,           // -40 .. +60 (software contrast/gamma lift)
    wbShift: 0,           // -50 (Cool) .. +50 (Warm) (software WB fallback)
    nightSight: false,    // multi-frame stack + low-light boost

    ev: 0,                // hardware exposureCompensation
    evAuto: true,
    iso: 0,               // hardware iso
    isoAuto: true,
    shutter: 0,           // hardware exposureTime
    shutterAuto: true,
    focus: 0,             // hardware focusDistance (MF)
    focusAuto: true,
    colorTemp: 5000,      // hardware colorTemperature (WB)
    wbAuto: true
  };
}
