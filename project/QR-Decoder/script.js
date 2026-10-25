(() => {
  "use strict";

  // ==================== 基础工具 ====================
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function toast(msg, duration = 2200) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), duration);
  }

  function formatTime(ts = Date.now()) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function isUrl(str) {
    try {
      const u = new URL(str);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function downloadFile(filename, content, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasJsQR = () => typeof window.jsQR === "function";
  const isImageFile = (f) =>
    (f.type && f.type.startsWith("image/")) || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(f.name || "");

  // ==================== 解码引擎状态提示 ====================
  function warnEngine(message) {
    let el = $("#engineBanner");
    if (!el) {
      el = document.createElement("div");
      el.id = "engineBanner";
      el.className = "engine-banner";
      $(".main").prepend(el);
    }
    el.textContent = message;
  }

  if (!hasJsQR()) {
    warnEngine("解码引擎未能加载（vendor/jsQR.min.js 缺失或被拦截），图片无法解码。");
  }

  // ==================== 历史记录（sessionStorage） ====================
  const HISTORY_KEY = "qr_decoder_history";
  const MAX_HISTORY = 200;

  function loadHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveHistory(list) {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  }

  function addToHistory(content, source = "图片") {
    const list = loadHistory();
    if (list[0] && list[0].content === content) return list[0];
    const item = {
      id: Date.now() + Math.random().toString(36).slice(2, 7),
      content,
      source,
      time: Date.now(),
    };
    list.unshift(item);
    saveHistory(list);
    return item;
  }

  // ==================== DOM 引用 ====================
  const tabs = $$(".tab");
  const panels = {
    upload: $("#upload-panel"),
    camera: $("#camera-panel"),
    history: $("#history-panel"),
  };

  const dropZone = $("#dropZone");
  const fileInput = $("#fileInput");
  const uploadBtn = $("#uploadBtn");
  const previewList = $("#previewList");
  const resultSection = $("#resultSection");
  const resultList = $("#resultList");
  const clearResultBtn = $("#clearResultBtn");
  const historyList = $("#historyList");
  const historyCount = $("#historyCount");
  const exportTxtBtn = $("#exportTxtBtn");
  const exportCsvBtn = $("#exportCsvBtn");
  const clearHistoryBtn = $("#clearHistoryBtn");

  const startCameraBtn = $("#startCameraBtn");
  const stopCameraBtn = $("#stopCameraBtn");
  const switchCameraBtn = $("#switchCameraBtn");

  // ==================== 解码 Worker ====================
  const MAX_SIDE = 1500;
  const SCALES = [1, 0.6, 1.6, 0.35, 2.4];
  const DECODE_TIMEOUT = 20000;

  let worker = null;
  let workerBroken = false;
  let jobSeq = 0;
  const jobs = new Map();

  function getWorker() {
    if (workerBroken) return null;
    if (worker) return worker;
    if (typeof Worker !== "function" || typeof OffscreenCanvas !== "function") {
      workerBroken = true;
      return null;
    }
    try {
      worker = new Worker("decoder-worker.js");
    } catch {
      // file:// 直接双击打开时浏览器会禁止 Worker，退回主线程解码
      workerBroken = true;
      return null;
    }

    worker.onmessage = (e) => {
      const { id, result, error } = e.data || {};
      const job = jobs.get(id);
      if (!job) return;
      jobs.delete(id);
      clearTimeout(job.timer);
      if (error) job.reject(new Error("worker-failed"));
      else job.resolve(result || null);
    };

    worker.onerror = () => {
      workerBroken = true;
      try {
        worker.terminate();
      } catch {}
      worker = null;
      jobs.forEach((job) => {
        clearTimeout(job.timer);
        job.reject(new Error("worker-failed"));
      });
      jobs.clear();
    };

    return worker;
  }

  function decodeInWorker(bitmap) {
    const w = getWorker();
    if (!w) return Promise.reject(new Error("worker-unavailable"));
    return new Promise((resolve, reject) => {
      const id = ++jobSeq;
      const timer = setTimeout(() => {
        jobs.delete(id);
        reject(new Error("timeout"));
      }, DECODE_TIMEOUT);
      jobs.set(id, { resolve, reject, timer });
      try {
        w.postMessage({ id, bitmap }, [bitmap]);
      } catch (err) {
        clearTimeout(timer);
        jobs.delete(id);
        reject(new Error("worker-failed"));
      }
    });
  }

  // ==================== 主线程兜底解码（Worker 不可用时） ====================
  function scanCanvas(ctx, w, h) {
    const image = ctx.getImageData(0, 0, w, h);
    const code = jsQR(image.data, w, h, { inversionAttempts: "attemptBoth" });
    return code && code.data ? code.data : null;
  }

  function stretchCanvas(ctx, w, h) {
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

  function decodeOnMainThread(source, width, height) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const base = Math.min(1, MAX_SIDE / Math.max(width, height));
    const seen = new Set();

    for (const s of SCALES) {
      const w = Math.round(width * base * s);
      const h = Math.round(height * base * s);
      if (w < 40 || h < 40) continue;

      const key = w + "x" + h;
      if (seen.has(key)) continue;
      seen.add(key);

      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, w, h);

      let result = scanCanvas(ctx, w, h);
      if (result) return result;

      if (stretchCanvas(ctx, w, h)) {
        result = scanCanvas(ctx, w, h);
        if (result) return result;
      }
    }
    return null;
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };
      img.src = url;
    });
  }

  /** 解码入口：Worker 优先，失败自动退回主线程 */
  async function decodeFile(file) {
    if (!hasJsQR()) throw new Error("engine-missing");

    if (typeof createImageBitmap === "function") {
      let bitmap = null;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        bitmap = null;
      }

      if (bitmap) {
        if (getWorker()) {
          try {
            return await decodeInWorker(bitmap);
          } catch (err) {
            if (err.message === "timeout") throw err;
            // Worker 出问题：bitmap 已被转移，下面重新读一次图片走主线程
          }
        } else {
          try {
            bitmap.close();
          } catch {}
        }
      }
    }

    const img = await loadImageFromFile(file);
    return decodeOnMainThread(img, img.naturalWidth, img.naturalHeight);
  }

  // ==================== 深度识别（按需加载 ZXing 内核） ====================
  let deepLibPromise = null;

  function ensureDeepLib() {
    if (window.Html5Qrcode) return Promise.resolve();
    if (deepLibPromise) return deepLibPromise;
    deepLibPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      const timer = setTimeout(() => {
        deepLibPromise = null;
        reject(new Error("加载超时"));
      }, 15000);
      s.src = "vendor/html5-qrcode.min.js";
      s.onload = () => {
        clearTimeout(timer);
        if (window.Html5Qrcode) resolve();
        else {
          deepLibPromise = null;
          reject(new Error("模块不可用"));
        }
      };
      s.onerror = () => {
        clearTimeout(timer);
        deepLibPromise = null;
        reject(new Error("模块加载失败"));
      };
      document.head.appendChild(s);
    });
    return deepLibPromise;
  }

  async function deepDecode(file) {
    await ensureDeepLib();
    const holder = $("#qr-scan-holder");
    const scanner = new Html5Qrcode(holder.id, false);
    try {
      const text = await scanner.scanFile(file, false);
      return text || null;
    } catch (err) {
      // 库在「图里没有二维码」时也是 reject，这种属于正常未识别，不当成故障
      const msg = String((err && (err.message || err)) || "");
      if (/MultiFormat Readers|detect the code|No code|NotFoundException/i.test(msg)) return null;
      throw err;
    } finally {
      try {
        await scanner.clear();
      } catch {}
    }
  }

  // ==================== Tab 切换 ====================
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(panels).forEach((p) => p.classList.remove("active"));
      const name = tab.dataset.tab;
      panels[name].classList.add("active");

      if (name === "history") renderHistory();
      if (name === "camera") ensureDeepLib().catch(() => {});
      if (name !== "camera" && html5QrCode && html5QrCode.isScanning) stopCamera();
    });
  });

  // ==================== 图片解码 ====================
  const objectUrls = new Set();

  function revokePreviews() {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.clear();
  }

  uploadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const files = [...e.dataTransfer.files].filter(isImageFile);
    if (files.length) handleFiles(files);
    else toast("请拖入图片文件");
  });

  fileInput.addEventListener("change", () => {
    const files = [...fileInput.files];
    fileInput.value = "";
    if (files.length) handleFiles(files);
  });

  // 粘贴支持
  document.addEventListener("paste", (e) => {
    if (!panels.upload.classList.contains("active")) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      e.preventDefault();
      handleFiles(files);
    }
  });

  /** 选中文件后立刻出预览和状态，再逐个解码，避免「点了没反应」 */
  async function handleFiles(files) {
    const images = [...files].filter(isImageFile);
    if (!images.length) {
      toast("请选择图片文件");
      return;
    }

    const queue = images.map((file) => ({ file, preview: createPreviewItem(file) }));
    for (const job of queue) {
      await decodeOne(job);
    }
  }
  async function decodeOne({ file, preview }) {
    preview.setStatus("正在解码…", "loading");
    const t0 = performance.now();

    try {
      const text = await decodeFile(file);
      if (text) {
        const cost = Math.round(performance.now() - t0);
        preview.setStatus(cost > 400 ? `解码成功 · ${cost}ms` : "解码成功", "success");
        showResult(text, "图片");
        addToHistory(text, "图片");
      } else {
        preview.setStatus("未识别到二维码", "error", { retry: true });
      }
    } catch (err) {
      const msg = String((err && err.message) || err);
      console.warn("Decode failed:", err);
      if (msg === "engine-missing") {
        preview.setStatus("解码引擎未加载", "error");
        warnEngine("解码引擎未能加载（vendor/jsQR.min.js 缺失或被拦截），图片无法解码。");
      } else if (msg === "timeout") {
        preview.setStatus("解码超时，可重试", "error", { retry: true });
      } else {
        preview.setStatus("解码失败，可重试", "error", { retry: true });
      }
    }
  }

  function createPreviewItem(file) {
    const item = document.createElement("div");
    item.className = "preview-item";

    const url = URL.createObjectURL(file);
    objectUrls.add(url);

    const img = document.createElement("img");
    img.src = url;
    img.alt = "";

    const info = document.createElement("div");
    info.className = "preview-info";

    const name = document.createElement("div");
    name.className = "preview-name";
    name.textContent = file.name || "粘贴的图片";

    const statusEl = document.createElement("div");
    statusEl.className = "preview-status loading";
    statusEl.textContent = "排队中…";

    info.append(name, statusEl);
    item.append(img, info);
    previewList.prepend(item);

    function setStatus(text, cls, opts = {}) {
      statusEl.className = `preview-status ${cls}`;
      statusEl.textContent = text;
      if (!opts.retry) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-btn";
      btn.textContent = "深度识别";
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        btn.disabled = true;
        setStatus("深度识别中…", "loading");
        try {
          const text = await deepDecode(file);
          if (text) {
            setStatus("解码成功", "success");
            showResult(text, "图片");
            addToHistory(text, "图片");
          } else {
            setStatus("仍未识别到二维码", "error");
          }
        } catch (err) {
          console.warn("Deep decode failed:", err);
          const msg = String((err && err.message) || err);
          if (/模块|超时/.test(msg)) {
            setStatus("识别模块加载失败", "error");
            toast("识别模块加载失败，请确认 vendor 目录存在");
          } else {
            setStatus("深度识别失败", "error");
          }
        }
      });
      statusEl.append(" ", btn);
    }

    return { el: item, setStatus };
  }

  // ==================== 结果展示 ====================
  function bindResultCard(root, content, source, time) {
    root.querySelector(".result-time").textContent = formatTime(time);
    root.querySelector(".result-source").textContent = source;
    root.querySelector(".result-content").textContent = content;

    root.querySelector(".copy-btn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content);
        toast("已复制到剪贴板");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = content;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast("已复制到剪贴板");
      }
    });

    const openBtn = root.querySelector(".open-btn");
    if (isUrl(content)) {
      openBtn.style.display = "inline-flex";
      openBtn.href = content;
    }
  }

  function showResult(content, source) {
    const card = $("#resultCardTpl").content.cloneNode(true);
    const root = card.querySelector(".result-card");
    bindResultCard(root, content, source, Date.now());
    resultList.prepend(root);
    resultSection.style.display = "block";
  }

  clearResultBtn.addEventListener("click", () => {
    resultList.innerHTML = "";
    previewList.innerHTML = "";
    revokePreviews();
    resultSection.style.display = "none";
  });

  // ==================== 摄像头（模块按需加载） ====================
  let html5QrCode = null;
  let currentCameraId = null;
  let cameras = [];

  async function startCamera() {
    startCameraBtn.disabled = true;
    const original = startCameraBtn.textContent;
    if (!window.Html5Qrcode) startCameraBtn.textContent = "正在加载模块…";

    try {
      await ensureDeepLib();
    } catch (err) {
      startCameraBtn.disabled = false;
      startCameraBtn.textContent = original;
      toast("摄像头模块加载失败，请确认 vendor 目录存在");
      return;
    }

    startCameraBtn.disabled = false;
    startCameraBtn.textContent = original;

    if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");

    try {
      cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        toast("未检测到摄像头");
        return;
      }

      const backCam = cameras.find((c) => /back|rear|environment/i.test(c.label));
      currentCameraId = (backCam || cameras[0]).id;

      await html5QrCode.start(
        currentCameraId,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          const now = Date.now();
          if (window._lastScan === decodedText && now - (window._lastScanTime || 0) < 3000) return;
          window._lastScan = decodedText;
          window._lastScanTime = now;

          showResult(decodedText, "摄像头");
          addToHistory(decodedText, "摄像头");
          toast("扫描成功！");
        },
        () => {}
      );

      startCameraBtn.style.display = "none";
      stopCameraBtn.style.display = "inline-flex";
      if (cameras.length > 1) switchCameraBtn.style.display = "inline-flex";
    } catch (err) {
      console.error(err);
      toast("启动摄像头失败，请检查权限");
    }
  }

  async function stopCamera() {
    if (html5QrCode && html5QrCode.isScanning) {
      try {
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (e) {
        console.warn(e);
      }
    }
    startCameraBtn.style.display = "inline-flex";
    stopCameraBtn.style.display = "none";
    switchCameraBtn.style.display = "none";
  }

  async function switchCamera() {
    if (!cameras || cameras.length < 2) return;
    const idx = cameras.findIndex((c) => c.id === currentCameraId);
    const next = cameras[(idx + 1) % cameras.length];
    await stopCamera();
    currentCameraId = next.id;
    setTimeout(startCamera, 300);
  }

  startCameraBtn.addEventListener("click", startCamera);
  stopCameraBtn.addEventListener("click", stopCamera);
  switchCameraBtn.addEventListener("click", switchCamera);

  // ==================== 历史记录渲染与导出 ====================
  function renderHistory() {
    const list = loadHistory();
    historyCount.textContent = `共 ${list.length} 条记录`;

    if (list.length === 0) {
      historyList.innerHTML = `<div class="empty-state">暂无解码记录</div>`;
      return;
    }

    historyList.innerHTML = "";
    list.forEach((item) => {
      const card = $("#resultCardTpl").content.cloneNode(true);
      const root = card.querySelector(".result-card");
      bindResultCard(root, item.content, item.source, item.time);
      historyList.appendChild(root);
    });
  }

  exportTxtBtn.addEventListener("click", () => {
    const list = loadHistory();
    if (!list.length) return toast("没有可导出的记录");
    const text = list
      .map((item, i) => `[${i + 1}] ${formatTime(item.time)} (${item.source})\n${item.content}\n`)
      .join("\n");
    downloadFile(`qr-history-${Date.now()}.txt`, text);
    toast("已导出 TXT");
  });

  exportCsvBtn.addEventListener("click", () => {
    const list = loadHistory();
    if (!list.length) return toast("没有可导出的记录");
    const header = "时间,来源,内容\n";
    const rows = list
      .map((item) => {
        const time = formatTime(item.time);
        const content = `"${item.content.replace(/"/g, '""')}"`;
        return `${time},${item.source},${content}`;
      })
      .join("\n");
    downloadFile(`qr-history-${Date.now()}.csv`, "\uFEFF" + header + rows, "text/csv;charset=utf-8");
    toast("已导出 CSV");
  });

  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("确定要清空所有历史记录吗？此操作不可恢复。")) {
      sessionStorage.removeItem(HISTORY_KEY);
      renderHistory();
      toast("已清空历史记录");
    }
  });

  // 页面卸载时关闭摄像头
  window.addEventListener("beforeunload", () => {
    if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(() => {});
    revokePreviews();
    if (worker) {
      try {
        worker.terminate();
      } catch {}
    }
  });
})();
