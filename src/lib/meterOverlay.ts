import {
  OverlaySettings,
  ImageAdjustments,
  DEFAULT_IMAGE_ADJUSTMENTS,
} from "./types";
import {
  getOverlayScale,
  getOverlayBackgroundColor,
  clampOverlayPercent,
  drawAdjustedImage,
} from "./utils";

/** 7-segment bit masks: a b c d e f g */
const SEGMENTS: Record<string, number> = {
  "0": 0b1111110,
  "1": 0b0110000,
  "2": 0b1101101,
  "3": 0b1111001,
  "4": 0b0110011,
  "5": 0b1011011,
  "6": 0b1011111,
  "7": 0b1110000,
  "8": 0b1111111,
  "9": 0b1111011,
  "-": 0b0000001,
};

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  return rgbToHex(
    pa.r + (pb.r - pa.r) * t,
    pa.g + (pb.g - pa.g) * t,
    pa.b + (pb.b - pa.b) * t
  );
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function digitCellWidth(fontSize: number, spacing: number): number {
  return fontSize * 0.58 + spacing;
}

function punctuationWidth(fontSize: number, ch: string): number {
  if (ch === "." || ch === ",") return fontSize * 0.26;
  if (ch === " ") return fontSize * 0.35;
  return fontSize * 0.55;
}

/** Measure overlay box size in canvas pixels for the current settings. */
export function measureOverlayBox(
  ctx: CanvasRenderingContext2D,
  settings: OverlaySettings,
  canvasWidth: number
): { boxW: number; boxH: number } {
  const scale = getOverlayScale(canvasWidth);
  const fontSize = settings.fontSize * scale;
  const pad = settings.padding * scale;
  const spacing = (settings.letterSpacing ?? 0) * scale;
  const text = settings.text || "0";

  if (settings.digitStyle === "seven-segment") {
    let w = 0;
    for (const ch of text) {
      if (/\d|-/.test(ch)) w += digitCellWidth(fontSize, spacing);
      else w += punctuationWidth(fontSize, ch) + spacing * 0.35;
    }
    return {
      boxW: Math.max(fontSize, w - spacing * 0.2) + pad * 2,
      boxH: fontSize * 1.12 + pad * 2,
    };
  }

  if (settings.digitStyle === "lcd") {
    ctx.font = `${settings.fontWeight} ${fontSize}px "Courier New", "Lucida Console", monospace`;
  } else {
    ctx.font = `${settings.fontWeight} ${fontSize}px ui-monospace, Consolas, monospace`;
  }

  if (spacing > 0) {
    let w = 0;
    const chars = [...text];
    chars.forEach((ch, i) => {
      w += ctx.measureText(ch).width;
      if (i < chars.length - 1) w += spacing;
    });
    return { boxW: w + pad * 2, boxH: fontSize + pad * 2 };
  }

  const metrics = ctx.measureText(text);
  return { boxW: metrics.width + pad * 2, boxH: fontSize + pad * 2 };
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (thickness / 2);
  const ny = (dx / len) * (thickness / 2);
  const inset = thickness * 0.35;
  const ux = (dx / len) * inset;
  const uy = (dy / len) * inset;

  ctx.beginPath();
  ctx.moveTo(x1 + ux + nx, y1 + uy + ny);
  ctx.lineTo(x2 - ux + nx, y2 - uy + ny);
  ctx.lineTo(x2 - ux - nx, y2 - uy - ny);
  ctx.lineTo(x1 + ux - nx, y1 + uy - ny);
  ctx.closePath();
  ctx.fill();
}

function drawSevenSegmentDigit(
  ctx: CanvasRenderingContext2D,
  digit: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  softness: number,
  options?: {
    ghost?: boolean;
    ghostColor?: string;
    opacity?: number;
    thickness?: number;
  }
) {
  const mask = SEGMENTS[digit];
  if (mask == null) return;

  const thick = Math.max(0.85, Math.min(1.55, options?.thickness ?? 1));
  const t = Math.max(1.6, Math.min(w, h) * 0.13 * thick);
  const inset = t * 0.5;
  const left = x + inset;
  const right = x + w - inset;
  const top = y + inset;
  const bottom = y + h - inset;
  const midY = y + h / 2;

  const drawMask = (m: number, fill: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    if (softness > 0) {
      ctx.shadowColor = fill;
      ctx.shadowBlur = softness * 1.4;
    }
    if (m & 0b1000000) drawSegment(ctx, left + t, top, right - t, top, t);
    if (m & 0b0100000)
      drawSegment(ctx, right, top + t, right, midY - t * 0.35, t);
    if (m & 0b0010000)
      drawSegment(ctx, right, midY + t * 0.35, right, bottom - t, t);
    if (m & 0b0001000) drawSegment(ctx, left + t, bottom, right - t, bottom, t);
    if (m & 0b0000100)
      drawSegment(ctx, left, midY + t * 0.35, left, bottom - t, t);
    if (m & 0b0000010)
      drawSegment(ctx, left, top + t, left, midY - t * 0.35, t);
    if (m & 0b0000001) drawSegment(ctx, left + t, midY, right - t, midY, t);
    ctx.restore();
  };

  // Ghost full "8" — real LCD inactive segments behind plastic
  if (options?.ghost) {
    drawMask(0b1111111, options.ghostColor || "#9aa090", 0.16);
  }
  drawMask(mask, color, options?.opacity ?? 0.82);
}

function drawSevenSegmentText(
  ctx: CanvasRenderingContext2D,
  text: string,
  startX: number,
  centerY: number,
  fontSize: number,
  spacing: number,
  color: string,
  softness: number,
  options?: {
    ghost?: boolean;
    ghostColor?: string;
    opacity?: number;
    thickness?: number;
  }
) {
  const digitH = fontSize;
  const digitW = fontSize * 0.52;
  let x = startX;

  for (const ch of text) {
    if (/\d|-/.test(ch)) {
      drawSevenSegmentDigit(
        ctx,
        ch,
        x,
        centerY - digitH / 2,
        digitW,
        digitH,
        color,
        softness,
        options
      );
      x += digitCellWidth(fontSize, spacing);
    } else if (ch === "." || ch === ",") {
      const r = Math.max(1.1, fontSize * 0.065);
      ctx.save();
      ctx.globalAlpha = options?.opacity ?? 0.82;
      ctx.fillStyle = color;
      if (softness > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = softness * 1.2;
      }
      ctx.beginPath();
      ctx.arc(x + r, centerY + digitH * 0.38, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      x += punctuationWidth(fontSize, ch) + spacing * 0.35;
    } else {
      x += punctuationWidth(fontSize, ch) + spacing * 0.35;
    }
  }
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: OverlaySettings["align"],
  spacing: number,
  color: string,
  softness: number,
  opacity = 0.85
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  if (softness > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = softness * 2;
  }

  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total =
    widths.reduce((a, b) => a + b, 0) +
    Math.max(0, chars.length - 1) * spacing;

  let cursor =
    align === "left"
      ? x
      : align === "right"
        ? x - total
        : x - total / 2;

  ctx.textAlign = "left";
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cursor, y);
    cursor += widths[i] + spacing;
  });
  ctx.restore();
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

function resolveDigitLook(settings: OverlaySettings): {
  color: string;
  opacity: number;
  thickness: number;
  softness: number;
} {
  const darkness = Math.max(0, Math.min(100, settings.digitDarkness ?? 55)) / 100;
  // Push ink toward near-black as darkness increases
  const color = mixHex(settings.textColor, "#0c0e0b", darkness * 0.75);
  const baseOpacity = settings.digitOpacity ?? 0.82;
  const opacity = Math.min(1, baseOpacity + darkness * (1 - baseOpacity) * 0.85);
  const thickness = 0.9 + darkness * 0.55;
  // Slightly less blur when darker so digits stay sharp/gadha
  const softness = Math.max(0, (settings.softness ?? 1.2) * (1 - darkness * 0.35));
  return { color, opacity, thickness, softness };
}

function drawSoftCover(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  radius: number,
  bg: string,
  scale: number
) {
  const blur = Math.max(5, 10 * scale);
  ctx.save();
  ctx.shadowColor = bg;
  ctx.shadowBlur = blur;
  ctx.fillStyle = bg;
  roundRect(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = bg;
  roundRect(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.fill();
  ctx.restore();

  // Recessed LCD top shadow
  ctx.save();
  const g = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  g.addColorStop(0, "rgba(0,0,0,0.08)");
  g.addColorStop(0.18, "rgba(0,0,0,0)");
  g.addColorStop(0.82, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.05)");
  ctx.fillStyle = g;
  roundRect(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.fill();
  ctx.restore();
}

function drawDustLayer(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  intensity: number,
  seed: number
) {
  if (intensity <= 0) return;
  ctx.save();
  const count = Math.floor(((boxW * boxH) / 26) * intensity);
  let s = (seed % 2147483646) + 1;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    const x = boxX + rand() * boxW;
    const y = boxY + rand() * boxH;
    const a = 0.035 + rand() * 0.12 * intensity;
    const light = rand() > 0.42;
    ctx.fillStyle = light
      ? `rgba(232, 226, 210, ${a})`
      : `rgba(70, 65, 55, ${a * 0.65})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.35 + rand() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Plastic glare (top-right) over digits — matches real meter photos
  const grad = ctx.createLinearGradient(
    boxX + boxW * 0.35,
    boxY,
    boxX + boxW,
    boxY + boxH * 0.85
  );
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, `rgba(255,255,255,${0.05 * intensity})`);
  grad.addColorStop(1, `rgba(255,255,255,${0.13 * intensity})`);
  ctx.fillStyle = grad;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.restore();
}

/** Draw the reading overlay so it blends with a real dusty meter LCD. */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: OverlaySettings,
  options?: { showHandles?: boolean }
) {
  const text = settings.text;
  if (!text.trim()) return;

  const geom = getOverlayGeometry(ctx, settings, width, height);
  const {
    boxW,
    boxH,
    centerX,
    centerY,
    pad,
    fontSize,
    spacing,
    radius,
    rotation,
  } = geom;
  const skewX = ((settings.skewX ?? 0) * Math.PI) / 180;
  const scale = getOverlayScale(width);
  const look = resolveDigitLook(settings);
  const ghost = settings.ghostSegments ?? true;
  const dust = settings.dustIntensity ?? 0.55;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  if (skewX) ctx.transform(1, 0, Math.tan(skewX), 1, 0, 0);

  const boxX = -boxW / 2;
  const boxY = -boxH / 2;

  const bg = getOverlayBackgroundColor(settings);
  if (bg !== "transparent") {
    drawSoftCover(ctx, boxX, boxY, boxW, boxH, radius, bg, scale);
  }

  const bgHex =
    settings.background === "custom"
      ? settings.customBackground
      : settings.background === "white"
        ? "#f0f0f0"
        : settings.background === "black"
          ? "#111111"
          : settings.customBackground || "#c4c7bb";
  const ghostColor = mixHex(bgHex, look.color, 0.2);

  const layer = document.createElement("canvas");
  const padLayer = Math.ceil(14 * scale);
  layer.width = Math.max(1, Math.ceil(boxW + padLayer * 2));
  layer.height = Math.max(1, Math.ceil(boxH + padLayer * 2));
  const lctx = layer.getContext("2d");
  if (lctx) {
    lctx.translate(padLayer + boxW / 2, padLayer + boxH / 2);

    if (settings.digitStyle === "seven-segment") {
      let contentW = 0;
      for (const ch of text) {
        if (/\d|-/.test(ch)) contentW += digitCellWidth(fontSize, spacing);
        else contentW += punctuationWidth(fontSize, ch) + spacing * 0.35;
      }
      contentW = Math.max(0, contentW - spacing * 0.2);

      let startX = -boxW / 2 + pad;
      if (settings.align === "center") startX = -contentW / 2;
      else if (settings.align === "right") startX = boxW / 2 - pad - contentW;

      drawSevenSegmentText(
        lctx,
        text,
        startX,
        0,
        fontSize,
        spacing,
        look.color,
        look.softness,
        {
          ghost,
          ghostColor,
          opacity: look.opacity,
          thickness: look.thickness,
        }
      );
    } else {
      if (settings.digitStyle === "lcd") {
        lctx.font = `${settings.fontWeight} ${fontSize}px "Courier New", "Lucida Console", monospace`;
      } else {
        lctx.font = `${settings.fontWeight} ${fontSize}px ui-monospace, Consolas, monospace`;
      }
      let textX = 0;
      if (settings.align === "left") textX = -boxW / 2 + pad;
      else if (settings.align === "right") textX = boxW / 2 - pad;

      if (spacing > 0) {
        drawSpacedText(
          lctx,
          text,
          textX,
          0,
          settings.align,
          spacing,
          look.color,
          look.softness,
          look.opacity
        );
      } else {
        lctx.save();
        lctx.globalAlpha = look.opacity;
        lctx.fillStyle = look.color;
        lctx.textBaseline = "middle";
        lctx.textAlign =
          settings.align === "left"
            ? "left"
            : settings.align === "right"
              ? "right"
              : "center";
        if (look.softness > 0) {
          lctx.shadowColor = look.color;
          lctx.shadowBlur = look.softness * 1.8;
        }
        lctx.fillText(text, textX, 0);
        lctx.restore();
      }
    }

    ctx.save();
    if (look.softness > 0.25) {
      ctx.filter = `blur(${Math.min(1.6, look.softness * 0.4 * scale)}px)`;
    }
    ctx.drawImage(layer, boxX - padLayer, boxY - padLayer);
    ctx.filter = "none";
    ctx.restore();
  }

  // Dust + glare ON TOP — digits look behind plastic cover
  if (dust > 0) {
    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.clip();
    drawDustLayer(
      ctx,
      boxX,
      boxY,
      boxW,
      boxH,
      dust,
      Math.round(settings.x * 97 + settings.y * 13 + text.length * 17)
    );
    ctx.restore();
  }

  if (options?.showHandles) {
    drawTransformHandles(ctx, boxW, boxH);
  }

  ctx.restore();
}

export interface OverlayGeometry {
  boxW: number;
  boxH: number;
  centerX: number;
  centerY: number;
  boxX: number;
  boxY: number;
  pad: number;
  fontSize: number;
  spacing: number;
  softness: number;
  radius: number;
  rotation: number;
  aabbW: number;
  aabbH: number;
}

export function getOverlayGeometry(
  ctx: CanvasRenderingContext2D,
  settings: OverlaySettings,
  width: number,
  height: number
): OverlayGeometry {
  const scale = getOverlayScale(width);
  const fontSize = settings.fontSize * scale;
  const pad = settings.padding * scale;
  const radius = settings.borderRadius * scale;
  const spacing = (settings.letterSpacing ?? 0) * scale;
  const softness = (settings.softness ?? 0) * scale;
  const rotation = settings.rotation ?? 0;
  const skewRad = ((settings.skewX ?? 0) * Math.PI) / 180;

  const { boxW, boxH } = measureOverlayBox(ctx, settings, width);
  // Approximate AABB with rotation + skew
  const cos = Math.cos((rotation * Math.PI) / 180);
  const sin = Math.sin((rotation * Math.PI) / 180);
  const shear = Math.tan(skewRad);
  const corners = [
    [-boxW / 2, -boxH / 2],
    [boxW / 2, -boxH / 2],
    [boxW / 2, boxH / 2],
    [-boxW / 2, boxH / 2],
  ].map(([x, y]) => {
    const sx = x + y * shear;
    return { x: sx * cos - y * sin, y: sx * sin + y * cos };
  });
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const aabbW = Math.max(...xs) - Math.min(...xs);
  const aabbH = Math.max(...ys) - Math.min(...ys);

  const clamped = clampOverlayPercent(
    settings.x,
    settings.y,
    aabbW,
    aabbH,
    width,
    height
  );

  const centerX = (clamped.x / 100) * width;
  const centerY = (clamped.y / 100) * height;

  return {
    boxW,
    boxH,
    centerX,
    centerY,
    boxX: centerX - boxW / 2,
    boxY: centerY - boxH / 2,
    pad,
    fontSize,
    spacing,
    softness,
    radius,
    rotation,
    aabbW,
    aabbH,
  };
}

function drawTransformHandles(
  ctx: CanvasRenderingContext2D,
  boxW: number,
  boxH: number
) {
  const hw = boxW / 2;
  const hh = boxH / 2;
  const handle = Math.max(8, Math.min(boxW, boxH) * 0.12);

  ctx.save();
  ctx.strokeStyle = "rgba(37, 99, 235, 0.95)";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.5, handle * 0.18);
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(-hw, -hh, boxW, boxH);
  ctx.setLineDash([]);

  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  for (const [x, y] of corners) {
    ctx.beginPath();
    ctx.rect(x - handle / 2, y - handle / 2, handle, handle);
    ctx.fill();
    ctx.stroke();
  }

  const rotY = -hh - handle * 2.2;
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo(0, rotY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, rotY, handle * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export type OverlayHitTarget = "move" | "resize" | "rotate" | null;

export function hitTestOverlay(
  ctx: CanvasRenderingContext2D,
  settings: OverlaySettings,
  width: number,
  height: number,
  canvasX: number,
  canvasY: number
): OverlayHitTarget {
  if (!settings.text.trim()) return null;
  const geom = getOverlayGeometry(ctx, settings, width, height);
  const local = canvasToLocal(
    canvasX,
    canvasY,
    geom.centerX,
    geom.centerY,
    geom.rotation,
    settings.skewX ?? 0
  );
  const hw = geom.boxW / 2;
  const hh = geom.boxH / 2;
  const handle = Math.max(10, Math.min(geom.boxW, geom.boxH) * 0.14);
  const hitPad = handle * 0.85;

  const rotY = -hh - handle * 2.2;
  if (Math.hypot(local.x - 0, local.y - rotY) <= hitPad * 1.15) {
    return "rotate";
  }

  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  for (const [cx, cy] of corners) {
    if (
      Math.abs(local.x - cx) <= hitPad &&
      Math.abs(local.y - cy) <= hitPad
    ) {
      return "resize";
    }
  }

  if (Math.abs(local.x) <= hw + 2 && Math.abs(local.y) <= hh + 2) {
    return "move";
  }
  return null;
}

export function canvasToLocal(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  rotationDeg: number,
  skewXDeg = 0
): { x: number; y: number } {
  const rad = (-rotationDeg * Math.PI) / 180;
  const dx = x - centerX;
  const dy = y - centerY;
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  const shear = Math.tan((skewXDeg * Math.PI) / 180);
  // Inverse shear after un-rotation
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad) - ly * shear;
  return { x: lx, y: ly };
}

/**
 * Sample meter LCD under the overlay.
 * Prefers light panel pixels as background (Genus-style LCD) and dark as digits.
 */
export function sampleMeterScreenColors(
  imageUrl: string,
  settings: OverlaySettings,
  adjustments: ImageAdjustments = DEFAULT_IMAGE_ADJUSTMENTS
): Promise<{ background: string; textColor: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        drawAdjustedImage(ctx, img, canvas.width, canvas.height, adjustments);

        const probe: OverlaySettings = {
          ...settings,
          text: settings.text.trim() || "000000.0",
        };
        const geom = getOverlayGeometry(
          ctx,
          probe,
          canvas.width,
          canvas.height
        );
        let boxX = Math.floor(geom.centerX - geom.aabbW / 2);
        let boxY = Math.floor(geom.centerY - geom.aabbH / 2);
        let w = Math.ceil(geom.aabbW);
        let h = Math.ceil(geom.aabbH);
        boxX = Math.max(0, Math.min(canvas.width - 1, boxX));
        boxY = Math.max(0, Math.min(canvas.height - 1, boxY));
        w = Math.max(1, Math.min(canvas.width - boxX, w));
        h = Math.max(1, Math.min(canvas.height - boxY, h));

        const { data } = ctx.getImageData(boxX, boxY, w, h);
        const samples: { r: number; g: number; b: number; lum: number }[] = [];
        for (let y = 0; y < h; y += 2) {
          for (let x = 0; x < w; x += 2) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            samples.push({ r, g, b, lum: luminance(r, g, b) });
          }
        }
        if (!samples.length) {
          resolve({ background: "#c4c7bb", textColor: "#3a4038" });
          return;
        }

        samples.sort((a, b) => a.lum - b.lum);
        // Lightest ~40% ≈ LCD panel; darkest ~25% ≈ digit ink
        const lightStart = Math.floor(samples.length * 0.55);
        const darkEnd = Math.max(1, Math.floor(samples.length * 0.28));
        const light = samples.slice(lightStart);
        const dark = samples.slice(0, darkEnd);

        const avg = (
          arr: { r: number; g: number; b: number }[]
        ): { r: number; g: number; b: number } => {
          let r = 0;
          let g = 0;
          let b = 0;
          for (const p of arr) {
            r += p.r;
            g += p.g;
            b += p.b;
          }
          const n = arr.length || 1;
          return { r: r / n, g: g / n, b: b / n };
        };

        const bg = avg(light.length ? light : samples);
        const fg = avg(dark.length ? dark : samples);

        // Ensure enough contrast for readable LCD digits
        let textRgb = fg;
        if (Math.abs(luminance(bg.r, bg.g, bg.b) - luminance(fg.r, fg.g, fg.b)) < 18) {
          textRgb =
            luminance(bg.r, bg.g, bg.b) > 120
              ? { r: 45, g: 50, b: 42 }
              : { r: 210, g: 220, b: 200 };
        }

        resolve({
          background: rgbToHex(bg.r, bg.g, bg.b),
          textColor: rgbToHex(textRgb.r, textRgb.g, textRgb.b),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Color sample failed"));
      }
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageUrl;
  });
}

export function buildNaturalOverlayPatch(
  base: OverlaySettings,
  colors: { background: string; textColor: string }
): OverlaySettings {
  const bg = parseHex(colors.background);
  const isLightLcd = bg ? luminance(bg.r, bg.g, bg.b) > 110 : true;

  return {
    ...base,
    background: "custom",
    customBackground: colors.background,
    textColor: colors.textColor,
    opacity: 1,
    borderRadius: Math.min(base.borderRadius ?? 1, 2),
    digitStyle: "seven-segment",
    letterSpacing: base.letterSpacing ?? 3,
    softness: Math.max(base.softness ?? 1.2, 1),
    digitOpacity: isLightLcd ? 0.8 : 0.9,
    digitDarkness: base.digitDarkness ?? 55,
    ghostSegments: true,
    dustIntensity: Math.max(base.dustIntensity ?? 0.55, 0.45),
    padding: Math.min(Math.max(base.padding ?? 6, 4), 10),
  };
}

/** Look presets tuned from real Indian static kWh meter photos. */
export function applyMeterLookPreset(
  base: OverlaySettings,
  look: "lcd-dark" | "led-red" | "lcd-green"
): OverlaySettings {
  if (look === "led-red") {
    return {
      ...base,
      digitStyle: "seven-segment",
      background: "custom",
      customBackground: "#0a0a0a",
      textColor: "#e02020",
      opacity: 1,
      letterSpacing: 5,
      softness: 1.1,
      borderRadius: 2,
      padding: Math.max(base.padding, 6),
      digitOpacity: 0.92,
      digitDarkness: 70,
      ghostSegments: false,
      dustIntensity: 0.35,
    };
  }
  if (look === "lcd-green") {
    // Genus / PVVNL style pale LCD + charcoal digits + dust
    return {
      ...base,
      digitStyle: "seven-segment",
      background: "custom",
      customBackground: "#c4c7bb",
      textColor: "#3a4038",
      opacity: 1,
      letterSpacing: 3,
      softness: 1.25,
      borderRadius: 1,
      padding: 6,
      digitOpacity: 0.8,
      digitDarkness: 60,
      ghostSegments: true,
      dustIntensity: 0.6,
    };
  }
  return {
    ...base,
    digitStyle: "seven-segment",
    background: "custom",
    customBackground: "#1c2218",
    textColor: "#d5e0cc",
    opacity: 1,
    letterSpacing: 4,
    softness: 0.9,
    borderRadius: 2,
    padding: Math.max(base.padding, 6),
    digitOpacity: 0.88,
    digitDarkness: 40,
    ghostSegments: true,
    dustIntensity: 0.4,
  };
}
