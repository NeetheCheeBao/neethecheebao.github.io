/* 二维码解码 Worker
 * 把「缩放 → 识别 → 对比度增强 → 再识别」全部放到后台线程，
 * 主线程只负责画界面，图片再大、批量再多也不会把页面卡住。
 */
importScripts("vendor/jsQR.min.js");

const MAX_SIDE = 1500; // 单次识别的最长边上限，超出先缩小（太大反而更慢更不准）
const MIN_SIDE = 40; // 太小没意义
const SCALES = [1, 0.6, 1.6, 0.35, 2.4]; // 相对基准尺寸的尝试倍数

function scan(ctx, w, h) {
  if (typeof jsQR !== "function") throw new Error("jsQR not loaded");
  const image = ctx.getImageData(0, 0, w, h);
  const code = jsQR(image.data, w, h, { inversionAttempts: "attemptBoth" });
  return code && code.data ? code.data : null;
}

/** 线性拉伸对比度，处理灰蒙蒙的截图/翻拍图；几乎纯色时直接跳过 */
function stretch(ctx, w, h) {
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = max - min;
  if (range < 16) return false;
  const k = 255 / range;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = (d[i] - min) * k;
    d[i + 1] = (d[i + 1] - min) * k;
    d[i + 2] = (d[i + 2] - min) * k;
  }
  ctx.putImageData(image, 0, 0);
  return true;
}

function decode(bitmap) {
  const W = bitmap.width;
  const H = bitmap.height;
  const base = Math.min(1, MAX_SIDE / Math.max(W, H));
  const seen = new Set();

  for (const s of SCALES) {
    const w = Math.round(W * base * s);
    const h = Math.round(H * base * s);
    if (w < MIN_SIDE || h < MIN_SIDE) continue;

    const key = w + "x" + h;
    if (seen.has(key)) continue;
    seen.add(key);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);

    let result = scan(ctx, w, h);
    if (result) return result;

    if (stretch(ctx, w, h)) {
      result = scan(ctx, w, h);
      if (result) return result;
    }
  }
  return null;
}

self.onmessage = (e) => {
  const { id, bitmap } = e.data || {};
  if (!bitmap) {
    self.postMessage({ id, result: null, error: "no-bitmap" });
    return;
  }
  try {
    self.postMessage({ id, result: decode(bitmap) });
  } catch (err) {
    self.postMessage({ id, result: null, error: String((err && err.message) || err) });
  } finally {
    if (typeof bitmap.close === "function") bitmap.close();
  }
};
