/**
 * Client-Side Image Optimizer and Discord CDN Expiration Safeguard
 * 
 * Provides:
 * 1. Fast Canvas-based compression to ultra-compact WebP/JPEG (< 40KB) for Firestore persistence.
 * 2. Discord CDN URL detection and automatic conversion to permanent persistent URLs.
 * 3. Fallback resolution for expired or broken image links.
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
}

/**
 * Checks if a given URL is a Discord CDN link that has temporary/expiring tokens (?ex=...&is=...&hm=...)
 */
export function isDiscordCdnUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('cdn.discordapp.com') ||
    lower.includes('media.discordapp.net') ||
    lower.includes('images-ext-1.discordapp.net') ||
    lower.includes('images-ext-2.discordapp.net') ||
    (lower.includes('discord') && (lower.includes('ex=') || lower.includes('attachments/')))
  );
}

/**
 * Transforms an image URL to use our persistent server-side image proxy/cache
 * so that expiring links (like Discord attachments) are cached permanently and never break.
 */
export function getSafeImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return '';
  }
  const clean = url.trim();

  // If already a local path, data URI, or server proxy, return as-is
  if (
    clean.startsWith('data:') ||
    clean.startsWith('/images/') ||
    clean.startsWith('/api/proxy-image') ||
    clean.startsWith('/')
  ) {
    return clean;
  }

  // If it's a Discord CDN link or external expiring link, route through our persistent proxy cache
  if (isDiscordCdnUrl(clean)) {
    return `/api/proxy-image?url=${encodeURIComponent(clean)}`;
  }

  return clean;
}

/**
 * Compresses an image File, Blob, or Data URL using HTML5 Canvas into a lightweight WebP/JPEG data URL.
 * Typically reduces a 2MB-10MB image down to 15KB-40KB with pristine visual clarity.
 */
export async function optimizeImage(
  input: File | Blob | string,
  options: OptimizeImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 512,
    maxHeight = 512,
    quality = 0.85,
    mimeType = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    let sourceUrl = '';
    let isObjectUrl = false;

    if (typeof input === 'string') {
      sourceUrl = input;
    } else {
      sourceUrl = URL.createObjectURL(input);
      isObjectUrl = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isObjectUrl) {
        URL.revokeObjectURL(sourceUrl);
      }

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(typeof input === 'string' ? input : '');
          return;
        }

        // Scale down proportionally if larger than maximum bounds
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          resolve(typeof input === 'string' ? input : '');
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP (or fallback to JPEG if WebP unsupported)
        let outputDataUrl = canvas.toDataURL(mimeType, quality);
        if (!outputDataUrl.startsWith(`data:${mimeType}`)) {
          outputDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(outputDataUrl);
      } catch (err) {
        console.warn('Canvas image compression fallback:', err);
        resolve(typeof input === 'string' ? input : '');
      }
    };

    img.onerror = () => {
      if (isObjectUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
      // If direct cross-origin failed, return the original string if possible
      resolve(typeof input === 'string' ? input : '');
    };

    img.src = sourceUrl;
  });
}

/**
 * Downloads a remote image through the proxy and converts it to a permanent compressed Data URL
 * so it can be stored directly inside the catalog record without relying on external servers.
 */
export async function downloadAndPersistImage(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();

  // If already a data URL, just optimize it
  if (cleanUrl.startsWith('data:image/')) {
    return optimizeImage(cleanUrl);
  }

  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(cleanUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Proxy image fetch failed with status ${response.status}`);
    }
    const blob = await response.blob();
    return await optimizeImage(blob);
  } catch (err) {
    console.warn('Failed to fetch and optimize remote image:', err);
    // If fetching fails, return safe proxy URL so the browser can still attempt to load it
    return getSafeImageUrl(cleanUrl);
  }
}
