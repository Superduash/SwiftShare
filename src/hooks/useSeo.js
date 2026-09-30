import { useEffect } from 'react';

/**
 * Lightweight SEO hook for SPA route metadata management.
 * Keeps document.title, meta description, and robots directives in sync with client navigation.
 * 
 * @param {Object} options
 * @param {string} [options.title] - Document title
 * @param {string} [options.description] - Meta description
 * @param {boolean} [options.noindex] - Whether to set noindex, nofollow
 */
export function useSeo({ title, description, noindex = false } = {}) {
  useEffect(() => {
    // 1. Title
    if (title) {
      document.title = title.includes('SwiftShare') ? title : `${title} | SwiftShare`;
    }

    // 2. Meta description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    // 3. Robots directive
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }

    if (noindex) {
      metaRobots.setAttribute('content', 'noindex, nofollow, noarchive');
    } else {
      metaRobots.setAttribute('content', 'index, follow, max-image-preview:large');
    }
  }, [title, description, noindex]);
}
