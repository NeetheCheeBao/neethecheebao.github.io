(() => {
  // ==================== 工具函数 ====================
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function toast(msg, duration = 2000) {
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

  // ==================== 历史记录（localStorage） ====================
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
    // 避免连续重复
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

  // ==================== Tab 切换 ====================
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(panels).forEach((p) => p.classList.remove("active"));
      const name = tab.dataset.tab;
      panels[name].classList.add("active");

      if (name === "history") renderHistory();
      if (name !== "camera" && html5QrCode && html5QrCode.isScanning) {
        stopCamera();
      }
    });
  });

  // ==================== 图片解码 ====================
  uploadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    if (files.length) handleFiles(files);
  });

  fileInput.addEventListener("change", () => {
    const files = [...fileInput.files];
    if (files.length) handleFiles(files);
    fileInput.value = "";
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
      toast("已粘贴图片，正在解码…");
    }
  });

  async function handleFiles(files) {
    resultSection.style.display = "block";
    for (const file of files) {
      await decodeImageFile(file);
    }
  }

  function createPreviewItem(file) {
    const item = document.createElement("div");
    item.className = "preview-item";
    const url = URL.createObjectURL(file);
    item.innerHTML = `
      <img src="${url}" alt="preview" />
      <div class="preview-info">
        <div class="preview-name">${file.name || "粘贴的图片"}</div>
        <div class="preview-status loading">正在解码…</div>
      </div>
    `;
    previewList.prepend(item);
    return {
      el: item,
      statusEl: item.querySelector(".preview-status"),
      revoke: () => URL.revokeObjectURL(url),
    };
  }

  async function decodeImageFile(file) {
    const preview = createPreviewItem(file);
    try {
      const result = await robustDecode(file);
      if (result) {
        preview.statusEl.textContent = "解码成功";
        preview.statusEl.className = "preview-status success";
        showResult(result, "图片上传");
        addToHistory(result, "图片上传");
      } else {
        preview.statusEl.textContent = "未识别到二维码";
        preview.statusEl.className = "preview-status error";
      }
    } catch (err) {
      preview.statusEl.textContent = "未识别到二维码";
      preview.statusEl.className = "preview-status error";
      console.warn("Decode failed:", err);
    } finally {
      setTimeout(preview.revoke, 5000);
    }
  }

  /**
   * 多策略解码：提升截图、小二维码、低对比度图片的识别率
   */
  async function robustDecode(file) {
    // 1. 先用 html5-qrcode 官方方法（内部有较完善的处理）
    try {
      const text = await Html5Qrcode.scanFile(file, false);
      if (text) return text;
    } catch (_) {}

    // 2. 加载图片到 Image 对象
    const img = await loadImageFromFile(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // 尝试多种缩放比例（处理过大/过小的二维码）
    const scales = [1, 0.5, 0.75, 1.5, 2, 0.25];
    for (const scale of scales) {
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      // 限制最大边，避免内存爆炸
      if (w > 2000 || h > 2000) continue;

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      // 尝试原图 + 反色
      let result = tryJsQR(ctx, w, h, "attemptBoth");
      if (result) return result;

      // 增强对比度后再试
      enhanceContrast(ctx, w, h);
      result = tryJsQR(ctx, w, h, "attemptBoth");
      if (result) return result;
    }

    // 3. 再试一次 html5-qrcode（某些版本对大图更稳）
    try {
      const text = await Html5Qrcode.scanFile(file, true);
      if (text) return text;
    } catch (_) {}

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

  function tryJsQR(ctx, width, height, inversionAttempts = "attemptBoth") {
    // html5-qrcode 全局暴露了 jsQR
    if (typeof jsQR !== "function") return null;
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts,
      });
      return code && code.data ? code.data : null;
    } catch {
      return null;
    }
  }

  /** 简单对比度增强（线性拉伸） */
  function enhanceContrast(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }
    const range = max - min || 1;
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.min(255, Math.max(0, ((data[i + c] - min) / range) * 255));
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ==================== 结果展示 ====================
  function showResult(content, source) {
    const tpl = $("#resultCardTpl");
    const card = tpl.content.cloneNode(true);
    const root = card.querySelector(".result-card");

    root.querySelector(".result-time").textContent = formatTime();
    root.querySelector(".result-source").textContent = source;
    root.querySelector(".result-content").textContent = content;

    const copyBtn = root.querySelector(".copy-btn");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content);
        toast("已复制到剪贴板");
      } catch {
        // fallback
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

    resultList.prepend(root);
    resultSection.style.display = "block";
  }

  clearResultBtn.addEventListener("click", () => {
    resultList.innerHTML = "";
    previewList.innerHTML = "";
    resultSection.style.display = "none";
  });

  // ==================== 摄像头 ====================
  let html5QrCode = null;
  let currentCameraId = null;
  let cameras = [];

  async function startCamera() {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }

    try {
      cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        toast("未检测到摄像头");
        return;
      }

      // 优先后置摄像头
      const backCam = cameras.find((c) => /back|rear|environment/i.test(c.label));
      currentCameraId = (backCam || cameras[0]).id;

      await html5QrCode.start(
        currentCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // 防抖：相同内容 3 秒内只记录一次
          const now = Date.now();
          if (window._lastScan === decodedText && now - (window._lastScanTime || 0) < 3000) {
            return;
          }
          window._lastScan = decodedText;
          window._lastScanTime = now;

          showResult(decodedText, "摄像头");
          addToHistory(decodedText, "摄像头");
          toast("扫描成功！");
        },
        () => {} // 忽略持续扫描的错误
      );

      startCameraBtn.style.display = "none";
      stopCameraBtn.style.display = "inline-flex";
      if (cameras.length > 1) {
        switchCameraBtn.style.display = "inline-flex";
      }
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
    // 短暂延迟后重启
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
      const tpl = $("#resultCardTpl");
      const card = tpl.content.cloneNode(true);
      const root = card.querySelector(".result-card");

      root.querySelector(".result-time").textContent = formatTime(item.time);
      root.querySelector(".result-source").textContent = item.source;
      root.querySelector(".result-content").textContent = item.content;

      const copyBtn = root.querySelector(".copy-btn");
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.content);
          toast("已复制到剪贴板");
        } catch {
          toast("复制失败");
        }
      });

      const openBtn = root.querySelector(".open-btn");
      if (isUrl(item.content)) {
        openBtn.style.display = "inline-flex";
        openBtn.href = item.content;
      }

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
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop().catch(() => {});
    }
  });
})();
