'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area } from 'react-easy-crop';
import { X } from 'lucide-react';

export interface ImageCropperModalProps {
  /** File the user selected. Modal opens only when this is non-null. */
  file: File | null;
  /** Width / height ratio of the crop box (e.g. 1 for a circle avatar, 3 for a wide cover). */
  aspect: number;
  /** Shape of the crop preview mask — 'round' for profile avatars, 'rect' for covers. */
  shape?: 'round' | 'rect';
  /** Title shown in the modal header. */
  title?: string;
  /** Max dimension (width or height) of the exported image, in pixels. */
  outputMaxDim?: number;
  onClose: () => void;
  /** Fires with a cropped JPEG File ready for upload. Modal closes after. */
  onConfirm: (cropped: File) => void;
}

export default function ImageCropperModal({
  file,
  aspect,
  shape = 'rect',
  title = 'Crop image',
  outputMaxDim = 1600,
  onClose,
  onConfirm,
}: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [exporting, setExporting] = useState(false);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Load the selected File into a blob URL. Revoke on unmount / file change.
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Body scroll lock + focus restore while the modal is open.
  useEffect(() => {
    if (!file) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
      previouslyFocused.current?.focus?.();
    };
  }, [file, onClose]);

  const onCropComplete = useCallback((_: Area, px: Area) => {
    setCroppedArea(px);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file || !imageSrc || !croppedArea) return;
    setExporting(true);
    try {
      const cropped = await cropImageToFile({
        src: imageSrc,
        area: croppedArea,
        outputMaxDim,
        originalName: file.name,
      });
      onConfirm(cropped);
    } finally {
      setExporting(false);
    }
  }, [file, imageSrc, croppedArea, outputMaxDim, onConfirm]);

  if (!file || !imageSrc) return null;
  if (typeof document === 'undefined') return null;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--mf-hairline-strong)',
          background: 'var(--mf-surface-1)',
          flexShrink: 0,
        }}
      >
        <div
          className="mf-font-display"
          style={{ fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.005em' }}
        >
          {title}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="mf-btn mf-btn-ghost"
          style={{ width: 40, height: 40, padding: 0 }}
        >
          <X size={18} />
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          background: '#0A0A0B',
        }}
      >
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={shape}
          showGrid
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          restrictPosition
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '14px 20px',
          borderTop: '1px solid var(--mf-hairline-strong)',
          background: 'var(--mf-surface-1)',
          flexShrink: 0,
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
          }}
          className="mf-font-mono mf-fg-dim"
        >
          <span
            style={{
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              minWidth: 40,
            }}
          >
            ZOOM
          </span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--mf-accent)' }}
            aria-label="Zoom"
          />
          <span className="tnum" style={{ minWidth: 40, textAlign: 'right' }}>
            {zoom.toFixed(2)}×
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            className="mf-btn"
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="mf-btn mf-btn-primary"
            disabled={exporting || !croppedArea}
          >
            {exporting ? 'Cropping…' : 'Use this crop'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

// Renders the selected crop area onto a canvas, scales it down to
// outputMaxDim on the longest edge, and exports a JPEG File. We drop the
// alpha channel (JPEG handles photos better than PNG here) and run a
// quality-0.9 encode so covers/avatars stay under a few hundred KB.
async function cropImageToFile({
  src,
  area,
  outputMaxDim,
  originalName,
}: {
  src: string;
  area: Area;
  outputMaxDim: number;
  originalName: string;
}): Promise<File> {
  const img = await loadImage(src);
  const cropW = area.width;
  const cropH = area.height;
  const scale = Math.min(1, outputMaxDim / Math.max(cropW, cropH));
  const outW = Math.round(cropW * scale);
  const outH = Math.round(cropH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  // Paint a solid background so transparent source pixels don't bleed
  // through after the JPEG encode.
  ctx.fillStyle = '#0A0A0B';
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(
    img,
    area.x,
    area.y,
    cropW,
    cropH,
    0,
    0,
    outW,
    outH,
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      'image/jpeg',
      0.9,
    );
  });

  const baseName = originalName.replace(/\.[^./]+$/, '') || 'image';
  return new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = src;
  });
}
