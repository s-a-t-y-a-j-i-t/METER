"use client";

/**
 * Prepare a meter photo for Tesseract — upscale, grayscale, boost contrast.
 * LCD digits (dark on pale green) read much better after this.
 */
export async function preprocessMeterImageForOcr(
  imageUrl: string
): Promise<string> {
  const img = await loadImage(imageUrl);
  const maxEdge = 1600;
  const longest = Math.max(img.naturalWidth, img.naturalHeight, 1);
  // Upscale small phone crops; downscale huge camera shots
  let scale = 1;
  if (longest < 900) scale = 900 / longest;
  else if (longest > maxEdge) scale = maxEdge / longest;

  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return imageUrl;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // Grayscale + contrast stretch for LCD panels
  let min = 255;
  let max = 0;
  const gray = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[p] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }

  const range = Math.max(1, max - min);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    // Stretch then boost mid contrast
    let v = ((gray[p] - min) / range) * 255;
    v = (v - 128) * 1.55 + 128;
    v = Math.max(0, Math.min(255, v));
    // Soft threshold — keep some gray for anti-alias but push toward B/W
    if (v < 110) v = Math.max(0, v * 0.55);
    else if (v > 160) v = Math.min(255, 200 + (v - 160) * 0.7);
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}
