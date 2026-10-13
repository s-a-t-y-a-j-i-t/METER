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
import { clampOverlayPercent, drawAdjustedImage, cn } from "@/lib/utils";
import {
  drawOverlay,
  getOverlayGeometry,
  hitTestOverlay,
  ensureMeterFontLoaded,
  OverlayHitTarget,
} from "@/lib/meterOverlay";
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
  /** Fired after move / resize / rotate finishes — useful for rematching colors. */
  onTransformEnd?: (settings: OverlaySettings) => void;
}

type DragState = {
  mode: OverlayHitTarget;
  startX: number;
  startY: number;
  startSettings: OverlaySettings;
  startDist: number;
  startAngle: number;
};

export function MeterCanvas({
  imageUrl,
  settings,
  adjustments = DEFAULT_IMAGE_ADJUSTMENTS,
  showOverlay,
  onSettingsChange,
  onImageError,
  onTransformEnd,
}: MeterCanvasProps) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const settingsRef = useRef(settings);
  const dragRef = useRef<DragState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [hoverMode, setHoverMode] = useState<OverlayHitTarget>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (showOverlay) setEditing(true);
  }, [showOverlay, imageUrl]);

  useEffect(() => {
    let cancelled = false;
    void ensureMeterFontLoaded().then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const display = getDisplaySize(img.naturalWidth, img.naturalHeight);
    canvas.width = display.w;
    canvas.height = display.h;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAdjustedImage(ctx, img, canvas.width, canvas.height, adjustments);

    if (showOverlay && settings.text.trim()) {
      drawOverlay(ctx, canvas.width, canvas.height, settings, {
        showHandles: editing,
      });
    }
  }, [settings, showOverlay, adjustments, editing]);

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
  }, [ready, fontReady, draw]);

  const pointerToCanvas = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const clampPos = useCallback(
    (rawX: number, rawY: number, next: OverlaySettings) => {
      const canvas = displayCanvasRef.current;
      if (!canvas) return { x: rawX, y: rawY };
      const ctx = canvas.getContext("2d");
      if (!ctx) return { x: rawX, y: rawY };
      const geom = getOverlayGeometry(ctx, next, canvas.width, canvas.height);
      return clampOverlayPercent(
        rawX,
        rawY,
        geom.aabbW,
        geom.aabbH,
        canvas.width,
        canvas.height
      );
    },
    []
  );

  const cursorForMode = (mode: OverlayHitTarget) => {
    if (mode === "resize") return "nwse-resize";
    if (mode === "rotate") return "grab";
    if (mode === "move") return dragging ? "grabbing" : "move";
    return showOverlay ? "default" : "default";
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showOverlay || !settings.text.trim()) return;
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pt = pointerToCanvas(e);
    const mode = hitTestOverlay(
      ctx,
      settings,
      canvas.width,
      canvas.height,
      pt.x,
      pt.y
    );
    if (!mode) {
      setEditing(false);
      setHoverMode(null);
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      return;
    }

    setEditing(true);
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const geom = getOverlayGeometry(ctx, settings, canvas.width, canvas.height);
    const dx = pt.x - geom.centerX;
    const dy = pt.y - geom.centerY;

    dragRef.current = {
      mode,
      startX: pt.x,
      startY: pt.y,
      startSettings: { ...settings },
      startDist: Math.max(8, Math.hypot(dx, dy)),
      startAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
    };
    setDragging(true);
    setHoverMode(mode);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pt = pointerToCanvas(e);

    if (!dragRef.current) {
      if (showOverlay && settings.text.trim()) {
        const mode = hitTestOverlay(
          ctx,
          settings,
          canvas.width,
          canvas.height,
          pt.x,
          pt.y
        );
        setHoverMode(mode);
      }
      return;
    }

    e.preventDefault();
    const drag = dragRef.current;
    const start = drag.startSettings;

    if (drag.mode === "move") {
      const dxPct = ((pt.x - drag.startX) / canvas.width) * 100;
      const dyPct = ((pt.y - drag.startY) / canvas.height) * 100;
      const next = {
        ...start,
        x: start.x + dxPct,
        y: start.y + dyPct,
      };
      const pos = clampPos(next.x, next.y, next);
      onSettingsChange({ ...next, ...pos });
      return;
    }

    if (drag.mode === "resize") {
      const geom = getOverlayGeometry(ctx, start, canvas.width, canvas.height);
      const dist = Math.max(8, Math.hypot(pt.x - geom.centerX, pt.y - geom.centerY));
      const scaleFactor = dist / drag.startDist;
      const nextSize = Math.round(
        Math.max(12, Math.min(140, start.fontSize * scaleFactor))
      );
      const nextPad = Math.round(
        Math.max(0, Math.min(40, start.padding * Math.sqrt(scaleFactor)))
      );
      onSettingsChange({
        ...start,
        fontSize: nextSize,
        padding: nextPad,
      });
      return;
    }

    if (drag.mode === "rotate") {
      const geom = getOverlayGeometry(ctx, start, canvas.width, canvas.height);
      const angle = (Math.atan2(pt.y - geom.centerY, pt.x - geom.centerX) * 180) / Math.PI;
      let delta = angle - drag.startAngle;
      // Normalize to avoid jumps
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const rotation = Math.max(
        -60,
        Math.min(60, Math.round((start.rotation + delta) * 10) / 10)
      );
      onSettingsChange({ ...start, rotation });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const hadDrag = !!dragRef.current;
    dragRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (hadDrag) {
      onTransformEnd?.(settingsRef.current);
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
    <div className="space-y-2 sm:space-y-3">
      <div
        className="flex items-center gap-1.5 sm:flex-wrap sm:gap-2"
        role="toolbar"
        aria-label="Zoom controls"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="min-h-11 min-w-11 touch-manipulation"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span
          className="min-w-[3rem] text-center text-sm font-semibold tabular-nums text-text"
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
          className="min-h-11 min-w-11 touch-manipulation"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fitZoom}
          aria-label="Fit image to view"
          className="min-h-11 touch-manipulation px-3"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="ml-1">Fit</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetZoom}
          aria-label="Reset zoom"
          className="hidden min-h-11 touch-manipulation sm:inline-flex"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={viewportRef}
        className="overflow-auto rounded-[var(--radius-card)] border border-border bg-bg-muted overscroll-contain"
        style={{ maxHeight: "min(58vh, 560px)" }}
      >
        <div
          className="flex min-h-[180px] items-center justify-center p-1.5 sm:min-h-[200px] sm:p-4"
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
              "max-w-full rounded-lg bg-surface shadow-sm touch-none",
              !ready && "hidden"
            )}
            style={{
              width: "100%",
              height: "auto",
              touchAction: "none",
              cursor: cursorForMode(hoverMode),
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-label="Meter image canvas editor — drag to move, corners to resize, top handle to rotate"
            role="img"
          />
        </div>
      </div>
      {showOverlay && (
        <p className="rounded-xl bg-primary-light/60 px-3 py-2 text-xs leading-relaxed text-text-secondary sm:bg-transparent sm:px-0 sm:py-0">
          <span className="font-semibold text-primary sm:text-text-secondary">
            Tip:
          </span>{" "}
          {editing
            ? "Drag the number to move · corner boxes to resize · top circle to rotate. Tap the photo to hide the box."
            : "Tap the number to show the edit box again."}
        </p>
      )}
    </div>
  );
}

export { drawOverlay } from "@/lib/meterOverlay";

/**
 * Export canvas at original image resolution (no editor handles).
 */
export function renderFinalCanvas(
  imageUrl: string,
  settings: OverlaySettings,
  showOverlay: boolean,
  adjustments: ImageAdjustments = DEFAULT_IMAGE_ADJUSTMENTS
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        await ensureMeterFontLoaded();
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
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Font load failed"));
      }
    })();
  });
}
