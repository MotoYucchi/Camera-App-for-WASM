import { FFmpeg } from '../../vendor/ffmpeg/index.js';
import { fetchFile } from '../../vendor/ffmpeg-util/index.js';
import { PHOTO_FORMATS, VIDEO_FORMATS } from '../constants/cameraConfig.js';

class WasmService {
  constructor() {
    this.ffmpeg = null;
    this.loadPromise = null;
    this.execQueue = Promise.resolve();
  }

  async ensureLoaded(onStatus) {
    if (this.ffmpeg && this.ffmpeg.loaded) {
      return this.ffmpeg;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      onStatus?.('loading', 'wasm.loading');
      const ffmpeg = new FFmpeg();

      const localCoreURL = new URL('../../vendor/ffmpeg-core/ffmpeg-core.js', import.meta.url).href;
      const localWasmURL = new URL('../../vendor/ffmpeg-core/ffmpeg-core.wasm', import.meta.url).href;

      try {
        await ffmpeg.load({
          coreURL: localCoreURL,
          wasmURL: localWasmURL
        });
      } catch (localErr) {
        console.warn('Local FFmpeg core load failed, trying CDN fallback:', localErr);
        const cdnBase = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
        await ffmpeg.load({
          coreURL: `${cdnBase}/ffmpeg-core.js`,
          wasmURL: `${cdnBase}/ffmpeg-core.wasm`
        });
      }

      this.ffmpeg = ffmpeg;
      onStatus?.('ready', 'wasm.ready');
      return ffmpeg;
    })().catch((err) => {
      this.loadPromise = null;
      onStatus?.('error', 'wasm.error');
      throw err;
    });

    return this.loadPromise;
  }

  enqueue(taskFn) {
    const run = this.execQueue.then(taskFn, taskFn);
    this.execQueue = run.catch(() => {});
    return run;
  }

  async convertPhoto(blob, targetFormatId, { onStatus } = {}) {
    const fmt = PHOTO_FORMATS[targetFormatId];
    if (!fmt) throw new Error(`Unsupported photo format: ${targetFormatId}`);

    return this.enqueue(async () => {
      const ffmpeg = await this.ensureLoaded(onStatus);
      onStatus?.('busy', 'wasm.busy');

      const uid = Date.now();
      const inputName = `in_photo_${uid}.png`;
      const outputName = `out_photo_${uid}.${fmt.ext}`;

      try {
        await ffmpeg.writeFile(inputName, await fetchFile(blob));

        const args = ['-i', inputName];
        if (fmt.id === 'jpeg') {
          args.push('-q:v', '2');
        } else if (fmt.id === 'webp') {
          args.push('-quality', '92');
        }
        args.push('-y', outputName);

        const code = await ffmpeg.exec(args);
        if (code !== 0) {
          throw new Error(`FFmpeg exited with code ${code}`);
        }

        const outData = await ffmpeg.readFile(outputName);
        return {
          blob: new Blob([outData.buffer], { type: fmt.mime }),
          format: fmt.id,
          ext: fmt.ext
        };
      } finally {
        await this.safeDelete(ffmpeg, inputName);
        await this.safeDelete(ffmpeg, outputName);
        onStatus?.('ready', 'wasm.ready');
      }
    });
  }

  async convertVideo(blob, targetFormatId, { onStatus } = {}) {
    const fmt = VIDEO_FORMATS[targetFormatId];
    if (!fmt) throw new Error(`Unsupported video format: ${targetFormatId}`);

    if (!fmt.useWasm) {
      return { blob, format: fmt.id, ext: fmt.ext };
    }

    return this.enqueue(async () => {
      const ffmpeg = await this.ensureLoaded(onStatus);
      onStatus?.('busy', 'wasm.busy');

      const uid = Date.now();
      const inputName = `in_video_${uid}.webm`;
      const outputName = `out_video_${uid}.${fmt.ext}`;

      try {
        await ffmpeg.writeFile(inputName, await fetchFile(blob));

        let args;
        if (fmt.id === 'mp4') {
          args = [
            '-i', inputName,
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y', outputName
          ];
        } else {
          // High-quality animated GIF
          args = [
            '-i', inputName,
            '-vf', 'fps=12,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
            '-y', outputName
          ];
        }

        const code = await ffmpeg.exec(args);
        if (code !== 0) {
          throw new Error(`FFmpeg exited with code ${code}`);
        }

        const outData = await ffmpeg.readFile(outputName);
        return {
          blob: new Blob([outData.buffer], { type: fmt.mime }),
          format: fmt.id,
          ext: fmt.ext
        };
      } finally {
        await this.safeDelete(ffmpeg, inputName);
        await this.safeDelete(ffmpeg, outputName);
        onStatus?.('ready', 'wasm.ready');
      }
    });
  }

  async safeDelete(ffmpeg, path) {
    try {
      await ffmpeg.deleteFile(path);
    } catch {
      // Ignore if already removed
    }
  }
}

export const wasmService = new WasmService();
