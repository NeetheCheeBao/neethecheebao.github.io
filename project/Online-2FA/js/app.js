(function () {
  const I18N = {
    zh: {
      brand: "本机验证器",
      tagline: "密钥只在浏览器里计算，不会上传",
      tabQuick: "即时生成",
      tabVault: "令牌库",
      secret: "密钥",
      secretPh: "粘贴 Base32 密钥，或 otpauth:// 链接",
      issuer: "发行方",
      account: "账号",
      advanced: "高级选项",
      type: "类型",
      encoding: "密钥格式",
      algorithm: "算法",
      digits: "位数",
      period: "周期（秒）",
      counter: "计数器",
      copy: "复制",
      copied: "已复制",
      showQr: "生成二维码",
      saveVault: "存入令牌库",
      fillDemo: "填入测试密钥",
      waiting: "输入密钥后将在此显示验证码",
      add: "添加令牌",
      settings: "设置",
      empty: "令牌库是空的",
      emptyHint: "把常用密钥存下来，刷新页面也还在。全部数据只留在这台设备的浏览器里。",
      noMatch: "没有匹配的令牌",
      search: "搜索发行方或账号",
      language: "语言",
      theme: "外观",
      themeSystem: "跟随系统",
      themeDark: "深色",
      themeLight: "浅色",
      offset: "时钟校准（秒）",
      offsetHint: "若验证码总是被拒绝，多半是设备时间不准。可微调 −30 到 +30 秒。",
      lock: "密码锁",
      setPw: "设置解锁密码",
      changePw: "更改密码",
      removePw: "移除密码",
      password: "密码",
      password2: "确认密码",
      unlockTitle: "令牌库已锁定",
      unlockHint: "输入密码解密本机数据。密码不会上传。",
      unlock: "解锁",
      wrong: "密码不正确",
      mismatch: "两次密码不一致",
      short: "请至少输入 4 位",
      exportJson: "导出 JSON 备份",
      exportUri: "导出 otpauth 列表",
      importFile: "导入备份",
      wipe: "清空本机数据",
      wipeConfirm: "确定删除本机全部令牌？此操作不可恢复。",
      about: "关于",
      aboutBody: "这是一个完全在浏览器运行的 TOTP / HOTP 生成器，兼容 Google Authenticator 等使用的 RFC 6238。",
      security: "安全说明",
      securityBody: "请只在自己控制的设备上使用。浏览器本地存储可被同一台电脑上的其它用户或恶意扩展读取——建议开启密码锁。",
      qrTitle: "验证二维码",
      qrHint: "用 Google Authenticator 等 App 扫描，核对生成的数字是否一致。",
      insecure: "当前页面不是安全上下文，Web Crypto 不可用。请通过 HTTPS（例如 GitHub Pages）访问。",
      footer: "RFC 6238 · 纯前端 · 可离线",
      saved: "已保存",
      imported: "导入完成",
      importError: "无法解析该文件",
      invalid: "密钥无效，请检查是否为 Base32（A–Z 与 2–7）",
      emptySecret: "请先输入密钥",
      nameRequired: "请填写发行方或账号",
      confirmDelete: "删除这个令牌？",
      edit: "编辑",
      del: "删除",
      more: "更多",
      cancel: "取消",
      confirmAdd: "添加",
      save: "保存",
      uri: "otpauth 链接",
      scanHint: "将二维码对准取景框。扫描只在本地完成。",
      startCam: "打开摄像头",
      stopCam: "关闭摄像头",
      camErr: "无法打开摄像头。也可以改用上传图片。",
      noQr: "没有识别到二维码",
      manual: "手动",
      pasteUri: "链接",
      scan: "扫描",
      image: "图片",
      next: "下一组",
    },
    en: {
      brand: "Local Authenticator",
      tagline: "Codes are computed on this device. Secrets never upload.",
      tabQuick: "Generate",
      tabVault: "Vault",
      secret: "Secret",
      secretPh: "Paste a Base32 secret or an otpauth:// URI",
      issuer: "Issuer",
      account: "Account",
      advanced: "Advanced",
      type: "Type",
      encoding: "Secret format",
      algorithm: "Algorithm",
      digits: "Digits",
      period: "Period (seconds)",
      counter: "Counter",
      copy: "Copy",
      copied: "Copied",
      showQr: "Show QR",
      saveVault: "Save to vault",
      fillDemo: "Use test secret",
      waiting: "Your code will appear here",
      add: "Add account",
      settings: "Settings",
      empty: "Vault is empty",
      emptyHint: "Save the accounts you use often. They stay in this browser only.",
      noMatch: "No matching accounts",
      search: "Search issuer or account",
      language: "Language",
      theme: "Appearance",
      themeSystem: "System",
      themeDark: "Dark",
      themeLight: "Light",
      offset: "Clock offset (seconds)",
      offsetHint: "If codes are rejected, the device clock may be wrong. Nudge −30 to +30s.",
      lock: "Password lock",
      setPw: "Set unlock password",
      changePw: "Change password",
      removePw: "Remove password",
      password: "Password",
      password2: "Confirm password",
      unlockTitle: "Vault is locked",
      unlockHint: "Enter your password to decrypt local data. It is never uploaded.",
      unlock: "Unlock",
      wrong: "Incorrect password",
      mismatch: "Passwords do not match",
      short: "Use at least 4 characters",
      exportJson: "Export JSON backup",
      exportUri: "Export otpauth list",
      importFile: "Import backup",
      wipe: "Erase local data",
      wipeConfirm: "Delete every local token? This cannot be undone.",
      about: "About",
      aboutBody: "A browser-only TOTP / HOTP generator compatible with RFC 6238. ",
      security: "Security",
      securityBody: "Use only on a device you control.",
      qrTitle: "Verify with QR",
      qrHint: "Scan with Google Authenticator (or similar) and compare the digits.",
      insecure: "This page is not a secure context. Open it over HTTPS (GitHub Pages).",
      footer: "RFC 6238 · client-side · works offline",
      saved: "Saved",
      imported: "Import complete",
      importError: "Could not parse that file",
      invalid: "Invalid secret. Use Base32 (A–Z and 2–7).",
      emptySecret: "Enter a secret first",
      nameRequired: "Add an issuer or account name",
      confirmDelete: "Delete this account?",
      edit: "Edit",
      del: "Delete",
      more: "More",
      cancel: "Cancel",
      confirmAdd: "Add",
      save: "Save",
      uri: "otpauth URI",
      scanHint: "Point the camera at a QR code. Scanning stays on-device.",
      startCam: "Start camera",
      stopCam: "Stop camera",
      camErr: "Could not open the camera. Try uploading an image instead.",
      noQr: "No QR code found",
      manual: "Manual",
      pasteUri: "URI",
      scan: "Scan",
      image: "Image",
      next: "Next code",
    },
  };

  const KEY = "local-authenticator.v1";
  const $ = (id) => document.getElementById(id);
  const state = {
    locale: (navigator.language || "zh").toLowerCase().startsWith("zh") ? "zh" : "en",
    theme: "system",
    offsetSec: 0,
    accounts: [],
    password: null,
    tab: "quick",
    query: "",
    editing: null,
    addMethod: "manual",
    stream: null,
    raf: 0,
    lastCode: "",
  };

  function t() { return I18N[state.locale]; }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1400);
  }

  function applyTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = state.theme === "dark" || (state.theme === "system" && prefersDark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#0b0c0e" : "#f3f1ec");
  }

  function b64(bytes) {
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s);
  }
  function unb64(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveKey(password, salt) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function persist() {
    const payload = { accounts: state.accounts, settings: { locale: state.locale, theme: state.theme, offsetSec: state.offsetSec } };
    if (state.password) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(state.password, salt);
      const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
      localStorage.setItem(KEY, JSON.stringify({ v: 1, kind: "encrypted", salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(data)) }));
    } else {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, kind: "plain", ...payload }));
    }
  }

  async function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "ready";
    try {
      const blob = JSON.parse(raw);
      if (blob.kind === "encrypted") return "locked";
      state.accounts = blob.accounts || [];
      const s = blob.settings || {};
      state.locale = s.locale || state.locale;
      state.theme = s.theme || "system";
      state.offsetSec = s.offsetSec || 0;
      return "ready";
    } catch {
      return "ready";
    }
  }

  async function unlock(password) {
    const blob = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!blob || blob.kind !== "encrypted") throw new Error("wrong");
    const key = await deriveKey(password, unb64(blob.salt));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.data));
    const parsed = JSON.parse(new TextDecoder().decode(plain));
    state.accounts = parsed.accounts || [];
    const s = parsed.settings || {};
    state.locale = s.locale || state.locale;
    state.theme = s.theme || "system";
    state.offsetSec = s.offsetSec || 0;
    state.password = password;
  }

  function applyI18n() {
    const i = t();
    document.title = i.brand;
    document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
    $("brand").textContent = i.brand;
    $("tagline").textContent = i.tagline;
    $("tab-quick").firstChild.textContent = i.tabQuick;
    $("tab-vault").childNodes[0].textContent = i.tabVault;
    $("lbl-secret").textContent = i.secret;
    $("secret").placeholder = i.secretPh;
    $("lbl-issuer").textContent = i.issuer;
    $("lbl-account").textContent = i.account;
    $("toggle-adv").textContent = i.advanced;
    $("lbl-type").textContent = i.type;
    $("lbl-encoding").textContent = i.encoding;
    $("lbl-alg").textContent = i.algorithm;
    $("lbl-digits").textContent = i.digits;
    $("lbl-period").textContent = i.period;
    $("lbl-counter").textContent = i.counter;
    $("btn-copy").textContent = i.copy;
    $("btn-qr").textContent = i.showQr;
    $("btn-save").textContent = i.saveVault;
    $("btn-demo").textContent = i.fillDemo;
    $("waiting").textContent = i.waiting;
    $("search").placeholder = i.search;
    $("empty-title").textContent = i.empty;
    $("empty-hint").textContent = i.emptyHint;
    $("empty-add").textContent = i.add;
    $("no-match").textContent = i.noMatch;
    $("footer").textContent = i.footer;
    $("insecure").textContent = i.insecure;
    $("add-title").textContent = state.editing ? i.edit : i.add;
    $("add-desc").textContent = i.tagline;
    $("set-title").textContent = i.settings;
    $("lbl-lang").textContent = i.language;
    $("lbl-theme").textContent = i.theme;
    $("set-theme").options[0].text = i.themeSystem;
    $("set-theme").options[1].text = i.themeDark;
    $("set-theme").options[2].text = i.themeLight;
    $("lbl-offset").textContent = i.offset + ": " + state.offsetSec;
    $("offset-hint").textContent = i.offsetHint;
    $("lock-label").textContent = i.lock + " · " + (state.password ? (state.locale === "zh" ? "已启用" : "On") : (state.locale === "zh" ? "未启用" : "Off"));
    $("lbl-pw").textContent = i.password;
    $("lbl-pw2").textContent = i.password2;
    $("btn-set-pw").textContent = state.password ? i.changePw : i.setPw;
    $("btn-clear-pw").textContent = i.removePw;
    $("btn-export-json").textContent = i.exportJson;
    $("btn-export-uri").textContent = i.exportUri;
    $("btn-import").textContent = i.importFile;
    $("btn-wipe").textContent = i.wipe;
    $("about-title").textContent = i.about;
    $("about-body").textContent = i.aboutBody;
    $("sec-title").textContent = i.security;
    $("sec-body").textContent = i.securityBody;
    $("qr-title").textContent = i.qrTitle;
    $("qr-hint").textContent = i.qrHint;
    $("unlock-title").textContent = i.unlockTitle;
    $("unlock-hint").textContent = i.unlockHint;
    $("unlock-btn").textContent = i.unlock;
    $("btn-add-confirm").textContent = state.editing ? i.save : i.confirmAdd;
    $("lbl-uri").textContent = i.uri;
    $("scan-hint").textContent = i.scanHint;
    document.querySelectorAll(".scan-hint-dup").forEach((el) => (el.textContent = i.scanHint));
    $("btn-cam").textContent = state.stream ? i.stopCam : i.startCam;
    const methods = $("add-methods").querySelectorAll("button");
    methods[0].textContent = i.manual;
    methods[1].textContent = i.pasteUri;
    methods[2].textContent = i.scan;
    methods[3].textContent = i.image;
    document.querySelectorAll(".lbl-issuer").forEach((el) => (el.textContent = i.issuer));
    document.querySelectorAll(".lbl-account").forEach((el) => (el.textContent = i.account));
    document.querySelectorAll(".lbl-secret").forEach((el) => (el.textContent = i.secret));
    $("btn-add").setAttribute("aria-label", i.add);
    $("btn-settings").setAttribute("aria-label", i.settings);
  }

  function readSecretFromLocation() {
    const params = new URLSearchParams(location.search);
    const q = params.get("secret") || params.get("s") || params.get("key");
    if (q) return q.trim();
    const m = location.pathname.match(/\/s\/([^/]+)$/);
    if (m) {
      try { return decodeURIComponent(m[1]).trim(); } catch { return m[1]; }
    }
    const hash = location.hash.replace(/^#/, "").trim();
    if (!hash) return null;
    if (hash.includes("=")) {
      const hp = new URLSearchParams(hash);
      return (hp.get("s") || hp.get("secret") || hp.get("key") || "").trim() || null;
    }
    if (TOTP.isPlausibleBase32(hash) || TOTP.looksLikeOtpauth(hash)) return hash;
    return null;
  }

  function quickInput() {
    const raw = $("secret").value.trim();
    if (!raw) return null;
    if (TOTP.looksLikeOtpauth(raw)) {
      try {
        const p = TOTP.parseOtpauth(raw);
        return p;
      } catch {
        return null;
      }
    }
    return {
      secret: raw,
      encoding: $("encoding").value,
      algorithm: $("algorithm").value,
      digits: Number($("digits").value),
      period: Number($("period").value),
      type: $("type").value,
      counter: Number($("counter").value) || 0,
    };
  }

  function setRing(remaining, period, urgent) {
    const c = 2 * Math.PI * 15;
    const ratio = Math.max(0, Math.min(1, remaining / period));
    const arc = $("ring-arc");
    arc.setAttribute("stroke-dasharray", String(c));
    arc.setAttribute("stroke-dashoffset", String(c * (1 - ratio)));
    arc.setAttribute("stroke", urgent ? "var(--danger)" : remaining <= 10 ? "var(--warn)" : "var(--accent)");
    $("ring-num").textContent = String(remaining);
    $("ring-num").style.color = urgent ? "var(--danger)" : remaining <= 10 ? "var(--warn)" : "var(--muted)";
  }

  async function tickQuick() {
    const input = quickInput();
    const live = $("code-live");
    const waiting = $("waiting");
    if (!input) {
      live.classList.add("hidden");
      waiting.classList.remove("hidden");
      return;
    }
    try {
      const code = await TOTP.generateOtp({ ...input, offsetMs: state.offsetSec * 1000 });
      state.lastCode = code;
      live.classList.remove("hidden");
      waiting.classList.add("hidden");
      const remaining = TOTP.remainingSeconds(input.period || 30, Date.now(), state.offsetSec * 1000);
      $("code").textContent = TOTP.groupCode(code);
      $("code").classList.toggle("urgent", remaining <= 5 && input.type !== "hotp");
      if (input.type === "hotp") $("ring").classList.add("hidden");
      else {
        $("ring").classList.remove("hidden");
        setRing(remaining, input.period || 30, remaining <= 5);
      }
    } catch {
      live.classList.add("hidden");
      waiting.classList.remove("hidden");
      waiting.textContent = t().invalid;
    }
  }

  function accountNode(account) {
    const el = document.createElement("article");
    el.className = "vault-card";
    el.dataset.id = account.id;
    const letter = ((account.issuer || account.label || "?").trim()[0] || "?").toUpperCase();
    el.innerHTML =
      '<div class="acct">' +
      '<div class="avatar"></div>' +
      '<div class="grow"><div class="top"><div><h3></h3><p class="sub"></p></div>' +
      '<div class="menu"><button type="button" class="icon-btn more" aria-label="more">⋯</button>' +
      '<div class="menu-list"><button type="button" class="edit"></button><button type="button" class="qr"></button><button type="button" class="danger del"></button></div></div></div>' +
      '<button type="button" class="code code-btn"></button></div></div>';
    el.querySelector(".avatar").textContent = letter;
    el.querySelector("h3").textContent = account.issuer || account.label || t().account;
    el.querySelector(".sub").textContent = account.issuer && account.label ? account.label : String(account.type).toUpperCase();
    el.querySelector(".edit").textContent = t().edit;
    el.querySelector(".qr").textContent = t().showQr;
    el.querySelector(".del").textContent = t().del;
    return el;
  }

  async function tickVault() {
    const q = state.query.trim().toLowerCase();
    const list = q
      ? state.accounts.filter((a) => (a.issuer + " " + a.label).toLowerCase().includes(q))
      : state.accounts;
    $("vault-count").textContent = state.accounts.length ? String(state.accounts.length) : "";
    $("vault-empty").classList.toggle("hidden", state.accounts.length !== 0);
    $("no-match").classList.toggle("hidden", !(state.accounts.length && list.length === 0));
    const root = $("vault-list");
    const existing = new Map([...root.children].map((n) => [n.dataset.id, n]));
    const keep = new Set();
    for (const account of list) {
      keep.add(account.id);
      let node = existing.get(account.id);
      if (!node) {
        node = accountNode(account);
        root.appendChild(node);
      }
      try {
        const code = await TOTP.generateOtp({ ...account, offsetMs: state.offsetSec * 1000 });
        const remaining = TOTP.remainingSeconds(account.period || 30, Date.now(), state.offsetSec * 1000);
        const btn = node.querySelector(".code-btn");
        btn.textContent = TOTP.groupCode(code);
        btn.classList.toggle("urgent", remaining <= 5 && account.type !== "hotp");
        btn.dataset.code = code;
      } catch {
        node.querySelector(".code-btn").textContent = "------";
      }
    }
    for (const [id, node] of existing) {
      if (!keep.has(id)) node.remove();
    }
  }

  function setTab(tab) {
    state.tab = tab;
    $("tab-quick").classList.toggle("active", tab === "quick");
    $("tab-vault").classList.toggle("active", tab === "vault");
    $("panel-quick").classList.toggle("hidden", tab !== "quick");
    $("panel-vault").classList.toggle("hidden", tab !== "vault");
  }

  function openModal(id) { $(id).classList.add("open"); }
  function closeModal(id) {
    $(id).classList.remove("open");
    if (id === "modal-add") stopCam();
  }

  function currentAccountFromQuick() {
    const raw = $("secret").value.trim();
    if (!raw) return null;
    const parsed = TOTP.looksLikeOtpauth(raw) ? TOTP.parseOtpauth(raw) : null;
    return {
      id: uid(),
      type: parsed ? parsed.type : $("type").value,
      issuer: (parsed && parsed.issuer) || $("issuer").value.trim() || "OTP",
      label: (parsed && parsed.label) || $("label").value.trim() || $("issuer").value.trim() || t().account,
      secret: parsed ? parsed.secret : raw,
      encoding: parsed ? parsed.encoding : $("encoding").value,
      algorithm: parsed ? parsed.algorithm : $("algorithm").value,
      digits: parsed ? parsed.digits : Number($("digits").value),
      period: parsed ? parsed.period : Number($("period").value),
      counter: parsed ? parsed.counter : Number($("counter").value) || 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  async function showQr(account) {
    const uri = TOTP.toOtpauth(account);
    $("qr-uri").textContent = uri;
    const url = await QRCode.toDataURL(uri, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: "M",
      color: { dark: "#0b0c0e", light: "#f4f3f0" },
    });
    $("qr-img").src = url;
    openModal("modal-qr");
  }

  function stopCam() {
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.stream) state.stream.getTracks().forEach((tr) => tr.stop());
    state.stream = null;
    $("btn-cam").textContent = t().startCam;
  }

  function applyScanned(raw) {
    stopCam();
    if (TOTP.looksLikeOtpauth(raw)) {
      try {
        const p = TOTP.parseOtpauth(raw);
        $("add-issuer").value = p.issuer;
        $("add-label").value = p.label;
        $("add-secret").value = p.secret;
        $("add-uri-input").value = raw;
        setAddMethod("manual");
        toast(t().saved);
        return;
      } catch {
        $("add-err").textContent = t().noQr;
        $("add-err").classList.remove("hidden");
        return;
      }
    }
    $("add-secret").value = raw;
    setAddMethod("manual");
  }

  async function startCam() {
    $("add-err").classList.add("hidden");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      state.stream = stream;
      const video = $("scan-video");
      video.srcObject = stream;
      await video.play();
      $("btn-cam").textContent = t().stopCam;
      const Detector = window.BarcodeDetector;
      let detector = null;
      try { if (Detector) detector = new Detector({ formats: ["qr_code"] }); } catch (_) {}
      const loop = async () => {
        if (!state.stream) return;
        try {
          if (detector) {
            const codes = await detector.detect(video);
            if (codes[0] && codes[0].rawValue) return applyScanned(codes[0].rawValue);
          } else if (video.readyState >= 2) {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
            if (result && result.data) return applyScanned(result.data);
          }
        } catch (_) {}
        state.raf = requestAnimationFrame(loop);
      };
      state.raf = requestAnimationFrame(loop);
    } catch {
      $("add-err").textContent = t().camErr;
      $("add-err").classList.remove("hidden");
    }
  }

  function setAddMethod(method) {
    state.addMethod = method;
    $("add-methods").querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.method === method));
    $("add-manual").classList.toggle("hidden", method !== "manual");
    $("add-uri").classList.toggle("hidden", method !== "uri");
    $("add-scan").classList.toggle("hidden", method !== "scan");
    $("add-image").classList.toggle("hidden", method !== "image");
    $("add-actions").classList.toggle("hidden", method === "scan" || method === "image");
    if (method !== "scan") stopCam();
  }

  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime || "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function bind() {
    $("tab-quick").onclick = () => setTab("quick");
    $("tab-vault").onclick = () => setTab("vault");
    $("toggle-adv").onclick = () => $("adv").classList.toggle("open");
    $("type").onchange = () => {
      const hotp = $("type").value === "hotp";
      $("field-counter").classList.toggle("hidden", !hotp);
      $("field-period").classList.toggle("hidden", hotp);
    };
    $("btn-copy").onclick = async () => {
      if (!state.lastCode) return toast(t().emptySecret);
      await navigator.clipboard.writeText(state.lastCode);
      toast(t().copied);
    };
    $("code").onclick = () => $("btn-copy").click();
    $("btn-demo").onclick = () => {
      $("secret").value = TOTP.RFC_BASE32;
      $("issuer").value = "RFC 6238";
      $("label").value = "test";
    };
    $("btn-save").onclick = async () => {
      try {
        const acc = currentAccountFromQuick();
        if (!acc) return toast(t().emptySecret);
        state.accounts.unshift(acc);
        await persist();
        setTab("vault");
        toast(t().saved);
      } catch {
        toast(t().invalid);
      }
    };
    $("btn-qr").onclick = async () => {
      try {
        const acc = currentAccountFromQuick();
        if (!acc) return toast(t().emptySecret);
        await showQr(acc);
      } catch {
        toast(t().invalid);
      }
    };
    $("secret").addEventListener("input", () => {
      const v = $("secret").value;
      if (TOTP.looksLikeOtpauth(v)) {
        try {
          const p = TOTP.parseOtpauth(v);
          $("issuer").value = p.issuer;
          $("label").value = p.label;
          $("type").value = p.type;
          $("algorithm").value = p.algorithm;
          $("digits").value = String(p.digits);
          $("period").value = String(p.period);
          $("encoding").value = p.encoding;
          $("counter").value = String(p.counter);
        } catch (_) {}
      }
    });
    $("search").oninput = (e) => { state.query = e.target.value; };
    $("btn-add").onclick = $("empty-add").onclick = () => {
      state.editing = null;
      $("add-issuer").value = $("add-label").value = $("add-secret").value = $("add-uri-input").value = "";
      setAddMethod("manual");
      applyI18n();
      openModal("modal-add");
    };
    $("btn-settings").onclick = () => {
      $("set-lang").value = state.locale;
      $("set-theme").value = state.theme;
      $("set-offset").value = String(state.offsetSec);
      $("btn-clear-pw").classList.toggle("hidden", !state.password);
      applyI18n();
      openModal("modal-settings");
    };
    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.onclick = () => closeModal(btn.getAttribute("data-close"));
    });
    document.querySelectorAll(".overlay").forEach((ov) => {
      ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(ov.id); });
    });
    $("add-methods").onclick = (e) => {
      const b = e.target.closest("button");
      if (b) setAddMethod(b.dataset.method);
    };
    $("btn-cam").onclick = () => (state.stream ? stopCam() : startCam());
    $("add-file").onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
        URL.revokeObjectURL(url);
        if (!result) {
          $("add-err").textContent = t().noQr;
          $("add-err").classList.remove("hidden");
        } else applyScanned(result.data);
      };
      img.src = url;
    };
    $("btn-add-confirm").onclick = async () => {
      $("add-err").classList.add("hidden");
      try {
        let acc;
        if (state.addMethod === "uri") {
          const p = TOTP.parseOtpauth($("add-uri-input").value);
          acc = { id: state.editing ? state.editing.id : uid(), ...p, createdAt: Date.now(), updatedAt: Date.now() };
        } else {
          if (!$("add-secret").value.trim()) throw new Error("empty");
          if (!$("add-issuer").value.trim() && !$("add-label").value.trim()) throw new Error("name");
          acc = {
            id: state.editing ? state.editing.id : uid(),
            type: "totp",
            issuer: $("add-issuer").value.trim(),
            label: $("add-label").value.trim() || $("add-issuer").value.trim(),
            secret: $("add-secret").value.trim(),
            encoding: "base32",
            algorithm: "SHA-1",
            digits: 6,
            period: 30,
            counter: 0,
            createdAt: state.editing ? state.editing.createdAt : Date.now(),
            updatedAt: Date.now(),
          };
        }
        if (state.editing) {
          state.accounts = state.accounts.map((a) => (a.id === acc.id ? acc : a));
        } else state.accounts.unshift(acc);
        await persist();
        closeModal("modal-add");
        setTab("vault");
        toast(t().saved);
      } catch (err) {
        $("add-err").textContent = err.message === "name" ? t().nameRequired : t().invalid;
        $("add-err").classList.remove("hidden");
      }
    };
    $("vault-list").onclick = async (e) => {
      const card = e.target.closest(".vault-card");
      if (!card) return;
      const acc = state.accounts.find((a) => a.id === card.dataset.id);
      if (!acc) return;
      if (e.target.closest(".more")) {
        card.querySelector(".menu").classList.toggle("open");
        return;
      }
      if (e.target.closest(".edit")) {
        state.editing = acc;
        $("add-issuer").value = acc.issuer;
        $("add-label").value = acc.label;
        $("add-secret").value = acc.secret;
        setAddMethod("manual");
        applyI18n();
        openModal("modal-add");
        return;
      }
      if (e.target.closest(".qr")) {
        await showQr(acc);
        return;
      }
      if (e.target.closest(".del")) {
        if (confirm(t().confirmDelete)) {
          state.accounts = state.accounts.filter((a) => a.id !== acc.id);
          await persist();
        }
        return;
      }
      if (e.target.closest(".code-btn")) {
        const code = e.target.closest(".code-btn").dataset.code;
        if (code) {
          await navigator.clipboard.writeText(code);
          toast(t().copied);
        }
      }
    };
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".menu")) document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open"));
    });
    $("set-lang").onchange = async (e) => { state.locale = e.target.value; applyI18n(); await persist(); };
    $("set-theme").onchange = async (e) => { state.theme = e.target.value; applyTheme(); await persist(); };
    $("set-offset").oninput = async (e) => {
      state.offsetSec = Number(e.target.value);
      $("lbl-offset").textContent = t().offset + ": " + state.offsetSec;
      await persist();
    };
    $("btn-set-pw").onclick = async () => {
      const a = $("set-pw1").value;
      const b = $("set-pw2").value;
      if (a.length < 4) return toast(t().short);
      if (a !== b) return toast(t().mismatch);
      state.password = a;
      await persist();
      $("set-pw1").value = $("set-pw2").value = "";
      $("btn-clear-pw").classList.remove("hidden");
      applyI18n();
      toast(t().saved);
    };
    $("btn-clear-pw").onclick = async () => {
      state.password = null;
      await persist();
      $("btn-clear-pw").classList.add("hidden");
      applyI18n();
      toast(t().saved);
    };
    $("btn-export-json").onclick = () => {
      download("local-authenticator.json", JSON.stringify({ v: 1, kind: "plain", accounts: state.accounts }, null, 2));
    };
    $("btn-export-uri").onclick = () => {
      download("local-authenticator.txt", state.accounts.map((a) => TOTP.toOtpauth(a)).join("\n"), "text/plain");
    };
    $("btn-import").onclick = () => $("import-file").click();
    $("import-file").onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const next = [];
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          const parsed = JSON.parse(text);
          next.push(...(Array.isArray(parsed) ? parsed : parsed.accounts || []));
        } else {
          for (const line of text.split(/\r?\n/)) {
            if (!line.trim()) continue;
            const p = TOTP.parseOtpauth(line.trim());
            next.push({ id: uid(), ...p, createdAt: Date.now(), updatedAt: Date.now() });
          }
        }
        for (const a of next) {
          if (!a.id) a.id = uid();
          const i = state.accounts.findIndex((x) => x.id === a.id);
          if (i >= 0) state.accounts[i] = a;
          else state.accounts.unshift(a);
        }
        await persist();
        toast(t().imported);
      } catch {
        toast(t().importError);
      }
      e.target.value = "";
    };
    $("btn-wipe").onclick = async () => {
      if (!confirm(t().wipeConfirm)) return;
      state.accounts = [];
      state.password = null;
      localStorage.removeItem(KEY);
      toast(t().saved);
    };
    $("unlock-form").onsubmit = async (e) => {
      e.preventDefault();
      $("unlock-err").classList.add("hidden");
      try {
        await unlock($("unlock-pw").value);
        $("lock-screen").classList.add("hidden");
        $("app").classList.remove("hidden");
        applyTheme();
        applyI18n();
      } catch {
        $("unlock-err").textContent = t().wrong;
        $("unlock-err").classList.remove("hidden");
      }
    };
  }

  async function boot() {
    if (!window.crypto || !crypto.subtle) $("insecure").classList.remove("hidden");
    bind();
    const status = await load();
    applyTheme();
    applyI18n();
    const seeded = readSecretFromLocation();
    if (seeded) {
      $("secret").value = seeded;
      if (TOTP.looksLikeOtpauth(seeded)) {
        try {
          const p = TOTP.parseOtpauth(seeded);
          $("issuer").value = p.issuer;
          $("label").value = p.label;
        } catch (_) {}
      }
      setTab("quick");
    }
    if (status === "locked") {
      $("app").classList.add("hidden");
      $("lock-screen").classList.remove("hidden");
    }
    setInterval(() => {
      if (state.tab === "quick") tickQuick();
      else tickVault();
    }, 250);
    tickQuick();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  boot();
})();
