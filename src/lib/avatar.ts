const MAX_AVATAR_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_URL_LENGTH = 80000;
export const AVATAR_CROP_VIEW_SIZE = 240;

export const AVATAR_URL_PATTERN =
  /^(|https:\/\/[^\s]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/;

export interface AvatarCropTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
}

export function isValidAvatarUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_AVATAR_URL_LENGTH &&
    AVATAR_URL_PATTERN.test(value)
  );
}

export function validateAvatarImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, or WebP).');
  }
  if (file.size > MAX_AVATAR_FILE_BYTES) {
    throw new Error('Image is too large. Please pick a photo under 10 MB.');
  }
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error('Could not read the selected image file. Please try a JPG, PNG, or WebP photo.')
      );
    };
    img.src = objectUrl;
  });
}

export function getCropGeometry(
  imgWidth: number,
  imgHeight: number,
  zoom: number,
  rotationDeg: number,
  viewSize = AVATAR_CROP_VIEW_SIZE
) {
  const normalizedRot = ((rotationDeg % 360) + 360) % 360;
  const swapped = normalizedRot === 90 || normalizedRot === 270;
  const rotW = swapped ? imgHeight : imgWidth;
  const rotH = swapped ? imgWidth : imgHeight;
  const baseScale = Math.max(viewSize / Math.max(1, rotW), viewSize / Math.max(1, rotH));
  const clampedZoom = Math.min(3.5, Math.max(1, zoom));
  const scale = baseScale * clampedZoom;
  const dispW = rotW * scale;
  const dispH = rotH * scale;
  const maxOffsetX = Math.max(0, (dispW - viewSize) / 2);
  const maxOffsetY = Math.max(0, (dispH - viewSize) / 2);

  return {
    baseScale,
    scale,
    dispW,
    dispH,
    maxOffsetX,
    maxOffsetY,
    normalizedRot,
  };
}

export function clampCropOffsets(
  imgWidth: number,
  imgHeight: number,
  zoom: number,
  rotationDeg: number,
  offsetX: number,
  offsetY: number,
  viewSize = AVATAR_CROP_VIEW_SIZE
): { offsetX: number; offsetY: number } {
  const { maxOffsetX, maxOffsetY } = getCropGeometry(
    imgWidth,
    imgHeight,
    zoom,
    rotationDeg,
    viewSize
  );
  return {
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY)),
  };
}

export function drawCroppedAvatarToContext(
  ctx: CanvasRenderingContext2D,
  targetSize: number,
  img: HTMLImageElement,
  transform: AvatarCropTransform,
  viewSize = AVATAR_CROP_VIEW_SIZE
): void {
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;
  const { scale, normalizedRot } = getCropGeometry(
    srcWidth,
    srcHeight,
    transform.zoom,
    transform.rotationDeg,
    viewSize
  );
  const clamped = clampCropOffsets(
    srcWidth,
    srcHeight,
    transform.zoom,
    transform.rotationDeg,
    transform.offsetX,
    transform.offsetY,
    viewSize
  );

  const ratio = targetSize / viewSize;
  const renderScale = scale * ratio;

  // White backdrop prevents transparent PNGs from turning black when encoded as JPEG.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetSize, targetSize);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(
    targetSize / 2 + clamped.offsetX * ratio,
    targetSize / 2 + clamped.offsetY * ratio
  );
  ctx.rotate((normalizedRot * Math.PI) / 180);
  ctx.drawImage(
    img,
    -(srcWidth * renderScale) / 2,
    -(srcHeight * renderScale) / 2,
    srcWidth * renderScale,
    srcHeight * renderScale
  );
  ctx.restore();
}

export function exportCroppedAvatarDataUrl(
  img: HTMLImageElement,
  transform: AvatarCropTransform,
  viewSize = AVATAR_CROP_VIEW_SIZE
): string {
  const attempts: Array<{ size: number; quality: number }> = [
    { size: 224, quality: 0.85 },
    { size: 192, quality: 0.8 },
    { size: 160, quality: 0.8 },
    { size: 160, quality: 0.68 },
    { size: 128, quality: 0.65 },
    { size: 96, quality: 0.6 },
  ];

  for (const { size, quality } of attempts) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Image processing is unavailable in this browser.');
    }
    drawCroppedAvatarToContext(ctx, size, img, transform, viewSize);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (isValidAvatarUrl(dataUrl) && dataUrl.length <= 75000) {
      return dataUrl;
    }
  }

  throw new Error('Could not compress this image small enough. Please try another photo.');
}

/**
 * Validates, center-crops, and compresses an uploaded profile image into a
 * compact JPEG data URL suitable for syncing across devices via Firestore.
 */
export async function processAvatarImageFile(file: File): Promise<string> {
  validateAvatarImageFile(file);
  const img = await loadImageFromFile(file);
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error('Could not decode the selected image.');
  }

  return exportCroppedAvatarDataUrl(img, {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotationDeg: 0,
  });
}
