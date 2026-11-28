import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Move,
  RotateCcw,
  RotateCw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AVATAR_CROP_VIEW_SIZE,
  clampCropOffsets,
  drawCroppedAvatarToContext,
  exportCroppedAvatarDataUrl,
  loadImageFromFile,
  validateAvatarImageFile,
} from '../../lib/avatar';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface AvatarCropModalProps {
  file: File | null;
  saving?: boolean;
  onChooseAnother: () => void;
  onCancel: () => void;
  onSave: (dataUrl: string) => Promise<void> | void;
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  file,
  saving = false,
  onChooseAnother,
  onCancel,
  onSave,
}) => {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!file) {
      setImageEl(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadingImage(true);
    setLoadError(null);
    setZoom(1);
    setRotationDeg(0);
    setOffsetX(0);
    setOffsetY(0);

    try {
      validateAvatarImageFile(file);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Invalid image file.');
      setLoadingImage(false);
      return;
    }

    loadImageFromFile(file)
      .then((img) => {
        if (cancelled) return;
        if (!img.naturalWidth || !img.naturalHeight) {
          setLoadError('Could not decode the selected image.');
        } else {
          setImageEl(img);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : 'Could not load the selected image.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!imageEl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const targetSize = Math.round(AVATAR_CROP_VIEW_SIZE * dpr);
    if (canvas.width !== targetSize || canvas.height !== targetSize) {
      canvas.width = targetSize;
      canvas.height = targetSize;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCroppedAvatarToContext(ctx, targetSize, imageEl, {
      zoom,
      offsetX,
      offsetY,
      rotationDeg,
    });
  }, [imageEl, zoom, offsetX, offsetY, rotationDeg]);

  if (!file || typeof document === 'undefined') return null;

  const updateZoom = (nextZoomRaw: number) => {
    const nextZoom = Math.min(3.5, Math.max(1, Number(nextZoomRaw.toFixed(2))));
    setZoom(nextZoom);
    if (imageEl) {
      const clamped = clampCropOffsets(
        imageEl.naturalWidth || imageEl.width,
        imageEl.naturalHeight || imageEl.height,
        nextZoom,
        rotationDeg,
        offsetX,
        offsetY
      );
      setOffsetX(clamped.offsetX);
      setOffsetY(clamped.offsetY);
    }
  };

  const handleRotate = () => {
    const nextRot = (rotationDeg + 90) % 360;
    setRotationDeg(nextRot);
    if (imageEl) {
      const clamped = clampCropOffsets(
        imageEl.naturalWidth || imageEl.width,
        imageEl.naturalHeight || imageEl.height,
        zoom,
        nextRot,
        offsetX,
        offsetY
      );
      setOffsetX(clamped.offsetX);
      setOffsetY(clamped.offsetY);
    }
  };

  const handleReset = () => {
    setZoom(1);
    setRotationDeg(0);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageEl || saving) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originOffsetX: offsetX,
      originOffsetY: offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageEl || !dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const clamped = clampCropOffsets(
      imageEl.naturalWidth || imageEl.width,
      imageEl.naturalHeight || imageEl.height,
      zoom,
      rotationDeg,
      dragRef.current.originOffsetX + dx,
      dragRef.current.originOffsetY + dy
    );
    setOffsetX(clamped.offsetX);
    setOffsetY(clamped.offsetY);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!imageEl || saving) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.14 : -0.14;
    updateZoom(zoom + step);
  };

  const handleConfirmSave = async () => {
    if (!imageEl || saving) return;
    setLoadError(null);
    try {
      const dataUrl = exportCroppedAvatarDataUrl(imageEl, {
        zoom,
        offsetX,
        offsetY,
        rotationDeg,
      });
      await onSave(dataUrl);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not save cropped photo.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-modal-title"
      onClick={() => {
        if (!saving) onCancel();
      }}
    >
      <Card
        padding="md"
        className="animate-pop w-full max-w-md max-h-[90dvh] overflow-y-auto space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="avatar-crop-modal-title"
              className="font-display text-lg font-bold text-slate-950 dark:text-white"
            >
              Resize &amp; Crop Photo
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag to reposition and adjust zoom before saving
            </p>
          </div>
          {!saving && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close photo editor"
              className="min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {loadError && (
          <AlertBanner tone="error" title="Photo notice">
            {loadError}
          </AlertBanner>
        )}

        {/* Interactive Square Crop Viewport with Circular Avatar Guide */}
        <div className="flex flex-col items-center gap-2.5">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onWheel={handleWheel}
            className={`relative w-60 h-60 rounded-2xl overflow-hidden border border-stone-200 dark:border-neutral-700 bg-stone-100 dark:bg-neutral-900 select-none touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            aria-label="Profile photo crop area. Drag to reposition."
          >
            {loadingImage ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-500 dark:text-neutral-400">
                Loading photo…
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-60 h-60 block pointer-events-none"
              />
            )}

            {/* Circular cutout shadow showing final avatar framing */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div className="w-60 h-60 rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.42)]" />
            </div>

            {/* Subtle alignment crosshairs visible while dragging */}
            {isDragging && (
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/30" />
              </div>
            )}
          </div>

          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-neutral-400">
            <Move className="h-3 w-3" aria-hidden="true" />
            Drag photo to center your face inside the circle
          </p>
        </div>

        {/* Zoom & Rotate Controls */}
        <div className="rounded-xl border border-stone-200/80 dark:border-neutral-800 bg-[#FAF9F6] dark:bg-neutral-900/80 p-3 space-y-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!imageEl || zoom <= 1 || saving}
              onClick={() => updateZoom(zoom - 0.15)}
              aria-label="Zoom out"
              className="h-8 w-8 rounded-full border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
            >
              <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <input
              type="range"
              min={1}
              max={3.5}
              step={0.05}
              value={zoom}
              disabled={!imageEl || saving}
              onChange={(e) => updateZoom(Number(e.target.value))}
              aria-label="Zoom level"
              className="flex-1 accent-blue-700 cursor-pointer"
            />
            <button
              type="button"
              disabled={!imageEl || zoom >= 3.5 || saving}
              onClick={() => updateZoom(zoom + 0.15)}
              aria-label="Zoom in"
              className="h-8 w-8 rounded-full border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
            >
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="text-xs font-bold tabular-nums text-slate-600 dark:text-neutral-300 w-10 text-right shrink-0">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!imageEl || saving}
                icon={<RotateCw className="h-3.5 w-3.5" />}
                onClick={handleRotate}
              >
                Rotate 90°
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!imageEl || saving}
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={saving}
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={onChooseAnother}
            >
              Change
            </Button>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={saving}
            disabled={!imageEl || loadingImage}
            icon={<Check className="h-4 w-4" />}
            onClick={() => {
              void handleConfirmSave();
            }}
          >
            Save Photo
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};
