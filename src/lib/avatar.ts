const MAX_AVATAR_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_URL_LENGTH = 80000;

export const AVATAR_URL_PATTERN =
  /^(|https:\/\/[^\s]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/;

export function isValidAvatarUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_AVATAR_URL_LENGTH &&
    AVATAR_URL_PATTERN.test(value)
  );
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the selected image file. Please try a JPG, PNG, or WebP photo.'));
    };
    img.src = objectUrl;
  });
}

function renderSquareJpeg(img: HTMLImageElement, targetSize: number, quality: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Image processing is unavailable in this browser.');
  }

  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;
  const side = Math.min(srcWidth, srcHeight);
  const sx = Math.max(0, (srcWidth - side) / 2);
  const sy = Math.max(0, (srcHeight - side) / 2);

  // White backdrop prevents transparent PNGs from turning black when encoded as JPEG.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetSize, targetSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Validates, center-crops, and compresses an uploaded profile image into a
 * compact JPEG data URL suitable for syncing across devices via Firestore.
 */
export async function processAvatarImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, or WebP).');
  }
  if (file.size > MAX_AVATAR_FILE_BYTES) {
    throw new Error('Image is too large. Please pick a photo under 10 MB.');
  }

  const img = await loadImageFromFile(file);
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error('Could not decode the selected image.');
  }

  const attempts: Array<{ size: number; quality: number }> = [
    { size: 160, quality: 0.82 },
    { size: 160, quality: 0.68 },
    { size: 128, quality: 0.65 },
    { size: 96, quality: 0.6 },
  ];

  for (const { size, quality } of attempts) {
    const dataUrl = renderSquareJpeg(img, size, quality);
    if (isValidAvatarUrl(dataUrl) && dataUrl.length <= 75000) {
      return dataUrl;
    }
  }

  throw new Error('Could not compress this image small enough. Please try another photo.');
}
