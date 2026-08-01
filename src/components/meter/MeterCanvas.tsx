"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  PointerEvent as ReactPointerEvent,
} from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { OverlaySettings } from "@/lib/types";
import { getOverlayBackgroundColor, cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";

interface MeterCanvasProps {
  imageUrl: string;
  settings: OverlaySettings;
  showOverlay: boolean;
  onSettingsChange: (settings: OverlaySettings) => void;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}

export function MeterCanvas({
  imageUrl,
  settings,
  showOverlay,
  onSettingsChange,
  canvasRef,
}: MeterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  const draw = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    if (showOverlay && settings.text.trim()) {
      drawOverlay(ctx, canvas.width, canvas.height, settings);
    }

    // Keep export canvas in sync
    if (canvasRef) {
      canvasRef.current = canvas;
    }
  }, [settings, showOverlay, canvasRef]);

  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setReady(true);
      draw();
    };
    img.onerror = () => setReady(false);
    img.src = imageUrl;

    return () => {
      imageRef.current = null;
    };
  }, [imageUrl, draw]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw, settings, showOverlay]);

  const getPercentFromPointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: settings.x, y: settings.y };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showOverlay || !settings.text.trim()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const pos = getPercentFromPointer(e);
    onSettingsChange({ ...settings, ...pos });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const pos = getPercentFromPointer(e);
    onSettingsChange({ ...settings, ...pos });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const fitZoom = () => setZoom(1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={fitZoom}>
          <Maximize2 className="h-4 w-4" />
          Fit
        </Button>
        <span className="text-xs text-muted">{Math.round(zoom * 100)}%</span>
        {naturalSize.w > 0 && (
          <span className="text-xs text-muted">
            {naturalSize.w}×{naturalSize.h}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="overflow-auto rounded-2xl border border-border bg-slate-100"
        style={{ maxHeight: "min(70vh, 640px)" }}
      >
        <div
          className="flex min-h-[200px] items-center justify-center p-2 sm:p-4"
          style={{ minWidth: zoom > 1 ? `${zoom * 100}%` : undefined }}
        >
          <canvas
            ref={displayCanvasRef}
            className={cn(
              "max-w-full touch-none rounded-lg bg-white shadow-sm",
              dragging ? "cursor-grabbing" : showOverlay ? "cursor-grab" : "cursor-default"
            )}
            style={{
              width: zoom === 1 ? "100%" : `${zoom * 100}%`,
              height: "auto",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-label="Meter image canvas editor"
          />
        </div>
      </div>
      {showOverlay && (
        <p className="text-xs text-muted">
          Drag the reading overlay on the image to reposition it.
        </p>
      )}
    </div>
  );
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: OverlaySettings
) {
  const text = settings.text;
  const fontSize = settings.fontSize;
  ctx.font = `${settings.fontWeight} ${fontSize}px monospace, ui-monospace, system-ui`;
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const pad = settings.padding;
  const boxW = textWidth + pad * 2;
  const boxH = fontSize + pad * 2;

  const centerX = (settings.x / 100) * width;
  const centerY = (settings.y / 100) * height;
  const boxX = centerX - boxW / 2;
  const boxY = centerY - boxH / 2;

  const bg = getOverlayBackgroundColor(settings);
  if (bg !== "transparent") {
    ctx.fillStyle = bg;
    roundRect(ctx, boxX, boxY, boxW, boxH, settings.borderRadius);
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

/** Renders final image to an offscreen canvas for download/preview */
export function renderFinalCanvas(
  imageUrl: string,
  settings: OverlaySettings,
  showOverlay: boolean
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      if (showOverlay && settings.text.trim()) {
        drawOverlay(ctx, canvas.width, canvas.height, settings);
      }
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageUrl;
  });
}
