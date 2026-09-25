export function isDiscordCdnUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('cdn.discordapp.com') || url.includes('media.discordapp.net');
}

export function getSafeImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return trimmed;
}

export async function optimizeImage(
  fileOrBlob: File | Blob,
  maxWidthOrOptions: number | { maxWidth?: number; maxHeight?: number; quality?: number } = 800,
  maxHeightParam = 800,
  qualityParam = 0.85
): Promise<string> {
  let maxWidth = 800;
  let maxHeight = maxHeightParam;
  let quality = qualityParam;

  if (typeof maxWidthOrOptions === 'object' && maxWidthOrOptions !== null) {
    if (maxWidthOrOptions.maxWidth !== undefined) maxWidth = maxWidthOrOptions.maxWidth;
    if (maxWidthOrOptions.maxHeight !== undefined) maxHeight = maxWidthOrOptions.maxHeight;
    if (maxWidthOrOptions.quality !== undefined) quality = maxWidthOrOptions.quality;
  } else if (typeof maxWidthOrOptions === 'number') {
    maxWidth = maxWidthOrOptions;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for optimization'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file/blob'));
    reader.readAsDataURL(fileOrBlob);
  });
}
