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
