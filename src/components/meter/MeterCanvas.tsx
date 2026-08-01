"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  PointerEvent as ReactPointerEvent,
} from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { OverlaySettings, ImageAdjustments, DEFAULT_IMAGE_ADJUSTMENTS } from "@/lib/types";
import {
  getOverlayBackgroundColor,
  clampOverlayPercent,
  getOverlayScale,
  drawAdjustedImage,
  cn,
} from "@/lib/utils";
import { Button } from "@/components/common/Button";

/** Cap editor preview bitmap size; exports still use full natural resolution. */
const MAX_DISPLAY_EDGE = 1600;

function getDisplaySize(naturalW: number, naturalH: number) {
  const longest = Math.max(naturalW, naturalH, 1);
  if (longest <= MAX_DISPLAY_EDGE) {
    return { w: naturalW, h: naturalH };
  }
  const scale = MAX_DISPLAY_EDGE / longest;
  return {
    w: Math.max(1, Math.round(naturalW * scale)),
    h: Math.max(1, Math.round(naturalH * scale)),
  };
}

interface MeterCanvasProps {
  imageUrl: string;
  settings: OverlaySettings;
  adjustments?: ImageAdjustments;
  showOverlay: boolean;
  onSettingsChange: (settings: OverlaySettings) => void;
  onImageError?: () => void;
}

export function MeterCanvas({
  imageUrl,
  settings,
  adjustments = DEFAULT_IMAGE_ADJUSTMENTS,
  showOverlay,
  onSettingsChange,
  onImageError,
}: MeterCanvasProps) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const draw = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scaled preview for performance; PNG/JPG export uses full natural size
    const display = getDisplaySize(img.naturalWidth, img.naturalHeight);
    canvas.width = display.w;
    canvas.height = display.h;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAdjustedImage(ctx, img, canvas.width, canvas.height, adjustments);

    if (showOverlay && settings.text.trim()) {
      drawOverlay(ctx, canvas.width, canvas.height, settings);
    }
  }, [settings, showOverlay, adjustments]);

  useEffect(() => {
    setReady(false);
    setLoadError(false);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setReady(true);
    };
    img.onerror = () => {
      imageRef.current = null;
      setReady(false);
      setLoadError(true);
      onImageError?.();
    };
    img.src = imageUrl;

    return () => {
      imageRef.current = null;
    };
  }, [imageUrl, onImageError]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw]);

  const measureBox = useCallback(
    (text: string) => {
      const display = getDisplaySize(naturalSize.w || 800, naturalSize.h || 600);
      const w = displayCanvasRef.current?.width || display.w;
      const scale = getOverlayScale(w);
      const fontSize = settings.fontSize * scale;
      const pad = settings.padding * scale;
      const canvas = displayCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.font = `${settings.fontWeight} ${fontSize}px monospace, ui-monospace, system-ui`;
          const textWidth = ctx.measureText(text || "0").width;
          return { boxW: textWidth + pad * 2, boxH: fontSize + pad * 2 };
        }
      }
      const approxChar = fontSize * 0.62;
      return {
        boxW: Math.max(fontSize, (text || "0").length * approxChar) + pad * 2,
        boxH: fontSize + pad * 2,
      };
    },
    [naturalSize.w, naturalSize.h, settings.fontSize, settings.fontWeight, settings.padding]
  );

  const getClampedPos = useCallback(
    (rawX: number, rawY: number) => {
      const { boxW, boxH } = measureBox(settings.text || "0");
      const display = getDisplaySize(naturalSize.w || 1, naturalSize.h || 1);
      const w = displayCanvasRef.current?.width || display.w;
      const h = displayCanvasRef.current?.height || display.h;
      return clampOverlayPercent(rawX, rawY, boxW, boxH, w, h);
    },
    [measureBox, settings.text, naturalSize.w, naturalSize.h]
  );

  const getPercentFromPointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: settings.x, y: settings.y };
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return { x: settings.x, y: settings.y };
    }
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return getClampedPos(x, y);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showOverlay || !settings.text.trim()) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = true;
    setDragging(true);
    const pos = getPercentFromPointer(e);
    onSettingsChange({ ...settings, ...pos });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const pos = getPercentFromPointer(e);
    onSettingsChange({ ...settings, ...pos });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = false;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const zoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const zoomIn = () => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  const fitZoom = () => {
    const viewport = viewportRef.current;
    if (!viewport || !naturalSize.w || !naturalSize.h) {
      setZoom(1);
      return;
    }
    const display = getDisplaySize(naturalSize.w, naturalSize.h);
    const availW = Math.max(120, viewport.clientWidth - 16);
    const availH = Math.max(120, Math.min(viewport.clientHeight || 480, 680) - 16);
    const fit = Math.min(availW / display.w, availH / display.h, 1);
    setZoom(Math.max(0.5, Math.min(3, Math.round(fit * 100) / 100) || 1));
  };
  const resetZoom = () => setZoom(1);

  if (loadError) {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center"
        role="alert"
      >
        <p className="text-sm font-medium text-red-700">
          Unable to process this image.
        </p>
        <p className="mt-1 text-xs text-red-600">Please try another image.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Zoom controls"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={zoomOut}
          aria-label="Zoom out"
          title="Zoom out"
          className="min-h-11 min-w-11"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Zoom −</span>
        </Button>
        <span
          className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text"
          aria-live="polite"
        >
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={zoomIn}
          aria-label="Zoom in"
          title="Zoom in"
          className="min-h-11 min-w-11"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Zoom +</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fitZoom}
          aria-label="Fit image to view"
          title="Fit"
          className="min-h-11"
        >
          <Maximize2 className="h-4 w-4" />
          Fit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetZoom}
          aria-label="Reset zoom"
          title="Reset zoom"
          className="min-h-11"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {naturalSize.w > 0 && (
          <span className="text-xs text-muted" title="Original image resolution">
            {naturalSize.w}×{naturalSize.h}
          </span>
        )}
      </div>

      <div
        ref={viewportRef}
        className="overflow-auto rounded-[var(--radius-card)] border border-border bg-bg-muted"
        style={{ maxHeight: "min(70vh, 680px)" }}
      >
        <div
          className="flex min-h-[200px] items-center justify-center p-2 sm:p-4"
          style={{
            width: zoom > 1 ? `${zoom * 100}%` : "100%",
            minWidth: zoom > 1 ? `${zoom * 100}%` : undefined,
          }}
        >
          {!ready && (
            <p className="py-16 text-sm text-muted" role="status">
              Loading image...
            </p>
          )}
          <canvas
            ref={displayCanvasRef}
            className={cn(
              "max-w-full rounded-lg bg-surface shadow-sm",
              !ready && "hidden",
              dragging
                ? "cursor-grabbing"
                : showOverlay
                  ? "cursor-grab"
                  : "cursor-default"
            )}
            style={{
              width: "100%",
              height: "auto",
              touchAction: "none",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-label="Meter image canvas editor"
            role="img"
          />
        </div>
      </div>
      {showOverlay && (
        <p className="text-xs text-muted">
          Drag the reading on the image to reposition it. Zoom affects the view
          only — downloads keep original resolution.
        </p>
      )}
    </div>
  );
}

/** Draw overlay scaled so UI sizes match visual preview at any native resolution. */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: OverlaySettings
) {
  const text = settings.text;
  const scale = getOverlayScale(width);
  const fontSize = settings.fontSize * scale;
  const pad = settings.padding * scale;
  const radius = settings.borderRadius * scale;

  ctx.font = `${settings.fontWeight} ${fontSize}px monospace, ui-monospace, system-ui`;
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(text);
  const boxW = metrics.width + pad * 2;
  const boxH = fontSize + pad * 2;

  const clamped = clampOverlayPercent(
    settings.x,
    settings.y,
    boxW,
    boxH,
    width,
    height
  );

  const centerX = (clamped.x / 100) * width;
  const centerY = (clamped.y / 100) * height;
  const boxX = centerX - boxW / 2;
  const boxY = centerY - boxH / 2;

  const bg = getOverlayBackgroundColor(settings);
  if (bg !== "transparent") {
    ctx.fillStyle = bg;
    roundRect(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.fill();
  }

  ctx.fillStyle = settings.textColor;
  let textX = centerX;
  if (settings.align === "left") {
    ctx.textAlign = "left";
    textX = boxX + pad;
  } else if (settings.align === "right") {
    ctx.textAlign = "right";
    textX = boxX + boxW - pad;
  } else {
    ctx.textAlign = "center";
  }
  ctx.fillText(text, textX, centerY);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Export canvas at original image resolution.
 * Overlay % positions + scaled sizes match the preview.
 */
export function renderFinalCanvas(
  imageUrl: string,
  settings: OverlaySettings,
  showOverlay: boolean,
  adjustments: ImageAdjustments = DEFAULT_IMAGE_ADJUSTMENTS
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        drawAdjustedImage(ctx, img, canvas.width, canvas.height, adjustments);
        if (showOverlay && settings.text.trim()) {
          drawOverlay(ctx, canvas.width, canvas.height, settings);
        }
        resolve(canvas);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Render failed"));
      }
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageUrl;
  });
}
