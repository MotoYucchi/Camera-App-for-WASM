import { buildZipBlob } from '../utils/zipBuilder.js';
import { formatTimestampForFilename } from '../utils/formatters.js';

export function triggerDownload(blobOrUrl, filename) {
  const isUrl = typeof blobOrUrl === 'string';
  const url = isUrl ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (!isUrl) {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function downloadCapture(item) {
  if (!item?.blob) return;
  triggerDownload(item.url || item.blob, item.name);
}

export async function downloadAllAsZip(captures) {
  if (!captures || captures.length === 0) return;

  const usedNames = new Map();
  const entries = captures.map((item) => {
    let name = item.name;
    const count = usedNames.get(name) || 0;
    usedNames.set(name, count + 1);
    if (count > 0) {
      const dot = name.lastIndexOf('.');
      name = dot > 0
        ? `${name.slice(0, dot)} (${count})${name.slice(dot)}`
        : `${name} (${count})`;
    }
    return { name, data: item.blob };
  });

  const zipBlob = await buildZipBlob(entries);
  triggerDownload(zipBlob, `wasm_camera_${formatTimestampForFilename()}.zip`);
}
