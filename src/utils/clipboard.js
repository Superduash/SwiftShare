/**
 * clipboard.js — Cross-browser clipboard utilities
 * 
 * Implements:
 *  - Task 11.3: Clipboard API with execCommand fallback for Firefox < 126 / unsupported
 *  - Task 11.5: Web Share API feature detection with clipboard fallback
 */

/**
 * Copy text to clipboard.
 * Uses the modern Clipboard API where available, falls back to execCommand('copy').
 * Gracefully handles cases where the page is not focused.
 *
 * @param {string} text  Text to copy
 * @returns {Promise<boolean>} true if successful, false otherwise
 */
export async function copyToClipboard(text) {
  if (typeof text !== 'string') return false;

  // Modern API (Chrome 66+, Firefox 63+, Edge 79+, Safari 13.1+)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // May fail if document is not focused or permission denied
      // Fall through to execCommand
    }
  }

  // Legacy fallback (IE11+, all Firefox before 63, older Safari)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Make textarea invisible and off-screen to avoid layout shift
    Object.assign(textArea.style, {
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
    });

    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Check if the Web Share API is available for sharing URLs/text.
 * Feature-detects both the API and the specific share data.
 *
 * @param {object} data  Share data: { title?, text?, url? }
 * @returns {boolean}
 */
export function canWebShare(data = {}) {
  if (!navigator.share || typeof navigator.share !== 'function') return false;
  if (!navigator.canShare) return true; // API exists but canShare unavailable — optimistically allow

  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

/**
 * Share using Web Share API, falling back to clipboard copy.
 *
 * @param {object} options  { title, text, url, fallbackText? }
 * @returns {Promise<'shared'|'copied'|'failed'>}
 */
export async function shareOrCopy(options = {}) {
  const { title, text, url, fallbackText } = options;
  const shareData = { title, text, url };

  if (canWebShare(shareData)) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (err) {
      // User dismissed the share sheet — don't fall through to copy
      if (err.name === 'AbortError') return 'failed';
      // Fall through to clipboard on other errors
    }
  }

  // Clipboard fallback
  const copyText = fallbackText || url || text || '';
  const copied = await copyToClipboard(copyText);
  return copied ? 'copied' : 'failed';
}

export function isImageFile(file) {
  const type = file?.type || file?.mimeType || '';
  const name = file?.name || file?.originalName || '';
  return Boolean(type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name));
}

export function isTextFile(file) {
  const type = file?.type || file?.mimeType || '';
  const name = file?.name || file?.originalName || '';
  return Boolean(
    type.startsWith('text/') ||
    /json|javascript|typescript|xml|yaml|html|csv|plain/i.test(type) ||
    /\.(txt|md|json|js|jsx|ts|tsx|html|css|scss|xml|csv|yaml|yml|py|sh|c|cpp|h|java|rs|go|sql|env|log|ini|toml|conf)$/i.test(name)
  );
}

async function convertBlobToPng(blob) {
  if (blob.type === 'image/png') return blob;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 300;
      canvas.height = img.naturalHeight || img.height || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Copy file content to clipboard (applies to images & text files).
 * Fallback to filename if file type is unsupported or operation fails.
 */
export async function copyFileToClipboard(file, fileUrl) {
  const fileName = file?.name || file?.originalName || '';

  // 1. Image files -> copy image binary to clipboard
  if (isImageFile(file)) {
    try {
      let blob = null;
      if (file instanceof Blob) {
        blob = file;
      } else if (fileUrl) {
        const resp = await fetch(fileUrl);
        if (resp.ok) blob = await resp.blob();
      }

      if (blob && navigator.clipboard && typeof navigator.clipboard.write === 'function') {
        const pngBlob = await convertBlobToPng(blob);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': pngBlob }),
        ]);
        return { success: true, type: 'image' };
      }
    } catch (err) {
      console.warn('Image clipboard copy failed, falling back:', err);
    }
  }

  // 2. Text / code files -> copy text content to clipboard
  if (isTextFile(file)) {
    try {
      let text = null;
      if (typeof file?.text === 'function') {
        text = await file.text();
      } else if (typeof file?.text === 'string') {
        text = file.text;
      } else if (typeof file?.content === 'string') {
        text = file.content;
      } else if (fileUrl) {
        const resp = await fetch(fileUrl);
        if (resp.ok) text = await resp.text();
      }

      if (typeof text === 'string') {
        const copied = await copyToClipboard(text);
        if (copied) {
          return { success: true, type: 'text' };
        }
      }
    } catch (err) {
      console.warn('Text clipboard copy failed, falling back:', err);
    }
  }

  // 3. Fallback for binary files (zip, pdf, video) or when direct copy is not supported
  const copied = await copyToClipboard(fileName);
  return { success: copied, type: 'name', isFallback: isImageFile(file) || isTextFile(file) };
}
