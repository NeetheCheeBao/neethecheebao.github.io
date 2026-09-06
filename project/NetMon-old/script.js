const SAMPLE_COUNT = 14;
const LATENCY_INTERVAL = 1000; // 正常采样间隔：1秒
const BURST_INTERVAL = 200; // 快速采样间隔：0.2秒
const BURST_DURATION = 3000; // 快速采样持续：3秒
const BURST_EVERY = 30000; // 每30秒再进行一轮快速采样
const EXIT_INTERVAL = 8000;
const TIMEOUT_MS = 5000;

const EXITS = [
  { id: "domestic", title: "国内测试", subtitle: "speedtest.cn", tip: "您访问国内网站所使用的 IP" },
  { id: "foreign", title: "国外测试", subtitle: "漏网之鱼", tip: "您访问没有被封的国外网站所使用的 IP" },
  { id: "cloudflare", title: "CloudFlare", subtitle: "ProxyIP", tip: "您访问 CF CDN 网站所使用的落地 IP" },
  { id: "xcom", title: "墙外测试", subtitle: "X.com", tip: "您访问推特 (x.com) 等网站所使用的 IP" },
];

const ICONS = {
  bytedance: '<svg viewBox="0 0 24 24"><path fill="#1677FF" d="m19.9 1.5 4.1 1v19l-4.1 1zM6.5 10.9l4.1 1v9l-4 1.1zM0 2.6l4.1 1v16.8l-4.1 1zm17.5 5.6v11.1l-4.2-1v-9z"/></svg>',
  bilibili: '<svg viewBox="0 0 24 24"><path fill="#FB7299" d="M17.813 4.653h.854q2.266.08 3.773 1.574Q23.946 7.72 24 9.987v7.36q-.054 2.266-1.56 3.773c-1.506 1.507-2.262 1.524-3.773 1.56H5.333q-2.266-.054-3.773-1.56C.053 19.614 0 17.347v-7.36q.054-2.267 1.56-3.76t3.773-1.574h.774l-1.174-1.12a1.23 1.23 0 0 1-.373-.906q0-.534.373-.907q.4-.373.92-.373t.92.373L9.653 4.44h4.267l2.853-2.747q.4-.373.92-.373.347 0 .929.4.391.551.391.907 0 .532-.373.906zM5.333 7.24q-1.12.027-1.88.773-.76.748-.786 1.894v7.52q.026 1.146.786 1.893t1.88.773h13.334q1.12-.026 1.88-.773t.786-1.893v-7.52q-.026-1.147-.786-1.894t-1.88-.773zM8 11.107q.56 0 .933.373.375.374.4.96v1.173q-.025.586-.4.96-.373.375-.933.374-.56 0-.933-.374-.375-.373-.4-.96V12.44q0-.56.386-.947.387-.386.947-.386m8 0q.56 0 .933.373.375.374.4.96v1.173q-.025.586-.4.96-.373.375-.933.374-.56 0-.933-.374-.375-.373-.4-.96V12.44q.025-.586.4-.96.373-.373.933-.373"/></svg>',
  wechat: '<svg viewBox="0 0 24 24"><path fill="#09B83E" d="M8.7 2.19C3.9 2.19 0 5.48 0 9.53c0 2.21 1.17 4.2 3 5.55a.6.6 0 0 1 .21.66l-.39 1.48a.3.3 0 0 0 .41.46l1.9-1.11a.9.9 0 0 1 .72-.1 10 10 0 0 0 2.84.4 5.85 5.85 0 0 1 1.93-6.45 8.3 8.3 0 0 1 5.86-1.83C15.9 4.95 12.28 2.19 8.7 2.19m-2.9 3.8a1.17 1.17 0 1 1 0 2.36 1.17 1.17 0 0 1 0-2.36m5.8 0a1.17 1.17 0 1 1 0 2.36 1.17 1.17 0 0 1 0-2.36m5.34 2.87a8 8 0 0 0-5.28 1.78 5.5 5.5 0 0 0-1.78 6.22c.94 2.46 3.66 4.23 6.88 4.23q1.25 0 2.36-.33a.7.7 0 0 1 .6.08l1.59.93a.24.24 0 0 0 .34-.38l-.33-1.23a.5.5 0 0 1 .2-.4 5.8 5.8 0 0 0 2.5-4.62c0-3.21-2.93-5.84-6.66-6.09zm-2.53 3.27a.98.98 0 1 1 0 1.97.98.98 0 0 1 0-1.97zm4.84 0a.98.98 0 1 1 0 1.97.98.98 0 0 1 0-1.97"/></svg>',
  taobao: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#FF5000"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="11" font-weight="800" font-family="sans-serif">淘</text></svg>',
  github: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.7 4.7 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"/></svg>',
  jsdelivr: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#F4D03F"/><path fill="#2C3E50" d="M8.2 16.6c.9 1.5 2.1 2.2 3.8 2.2 2.4 0 3.9-1.3 3.9-3.3 0-1.6-.8-2.5-2.9-3.2l-1.1-.4c-1.2-.4-1.6-.8-1.6-1.5 0-.8.7-1.4 1.8-1.4 1.1 0 1.9.4 2.5 1.4l1.8-1.1C15.5 8 14.2 7.2 12.4 7.2c-2.2 0-3.7 1.4-3.7 3.2 0 1.5.8 2.5 2.8 3.2l1.1.4c1.3.5 1.8.9 1.8 1.7 0 .9-.8 1.6-2.1 1.6-1.4 0-2.4-.6-3.1-1.8z"/></svg>',
  cloudflare: '<svg viewBox="0 0 24 24"><path fill="#F38020" d="M16.5 16.85c.16-.51.1-.98-.15-1.32Q16 15.05 15.3 15l-8.66-.11a.2.2 0 0 1-.15-.23.2.2 0 0 1 .2-.16l8.74-.1a3.1 3.1 0 0 0 2.55-1.92l.5-1.3a.3.3 0 0 0 .02-.17 5.69 5.69 0 0 0-10.94-.59 2.6 2.6 0 0 0-1.8-.5 2.56 2.56 0 0 0-2.22 3.19A3.63 3.63 0 0 0 0 16.75q0 .27.04.53a.2.2 0 0 0 .17.15h15.98a.2.2 0 0 0 .2-.16zm2.77-5.57-.24.01q-.09 0-.13.1l-.34 1.17q-.21.78.16 1.32.35.48 1.06.52l1.84.11q.08 0 .14.07a.2.2 0 0 1-.04.32l-1.93.1a3.1 3.1 0 0 0-2.55 1.92l-.14.36q-.03.12.1.14h6.6a.2.2 0 0 0 .17-.12 5 5 0 0 0 .17-1.28 4.74 4.74 0 0 0-4.73-4.73"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M23.5 6.19a3 3 0 0 0-2.12-2.14C19.51 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3 3 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3 3 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3 3 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81M9.55 15.57V8.43L15.82 12z"/></svg>',
};

const SITES = [
  { id: "bytedance", name: "字节跳动", region: "国内", url: "https://lf3-zlink-tos.ugurl.cn/obj/zebra-public/resource_lmmizj_1632398893.png" },
  { id: "bilibili", name: "Bilibili", region: "国内", url: "https://i0.hdslb.com/bfs/face/member/noface.jpg@24w_24h_1c" },
  { id: "wechat", name: "微信", region: "国内", url: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico" },
  { id: "taobao", name: "淘宝", region: "国内", url: "https://img.alicdn.com/imgextra/i2/O1CN01qnQCrN1VkzAWiU4Hs_!!6000000002692-2-tps-33-33.png" },
  { id: "github", name: "GitHub", region: "国际", url: "https://github.github.io/janky/images/bg_hr.png" },
  { id: "jsdelivr", name: "jsDelivr", region: "国际", url: "https://cdn.jsdelivr.net/npm/latency-test@1.0.1/smallest-possible-white.gif" },
  { id: "cloudflare", name: "Cloudflare", region: "国际", url: "https://www.cloudflare.com/favicon.ico" },
  { id: "youtube", name: "YouTube", region: "国际", url: "https://www.youtube.com/favicon.ico" },
];

const state = {
  paused: false,
  elapsed: 0,
  exits: Object.fromEntries(EXITS.map((e) => [e.id, { ip: "", line: "", status: "loading", subtitle: e.subtitle }])),
  samples: Object.fromEntries(SITES.map((s) => [s.id, []])),
  changes: [],
};

function bust(url) {
  return url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
}

function maskIp(ip) {
  return String(ip).replace(/^(\d+\.\d+\.\d+)\.\d+$/, "$1.*");
}

function tone(ms) {
  if (ms < 0) return "dead";
  if (ms <= 49) return "good";
  if (ms <= 149) return "ok";
  if (ms <= 299) return "warn";
  if (ms <= 999) return "bad";
  return "dead";
}

function avg(arr) {
  const v = arr.filter((n) => n >= 0);
  if (!v.length) return -1;
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

function spark(samples) {
  const width = 400, height = 48, pad = 4;
  if (!samples.length) return `M0,${height / 2} L${width},${height / 2}`;
  const usable = Math.max(1, samples.length - 1);
  const pts = samples.map((ms, i) => {
    const x = (i / usable) * width;
    const c = ms < 0 ? 500 : Math.min(ms, 500);
    const y = height - pad - (c / 500) * (height - pad * 2);
    return { x, y };
  });
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
}

function clock() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function formatElapsed(s) {
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2400);
}

async function fetchJson(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(bust(url), { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error("http");
    return await res.json();
  } finally { clearTimeout(t); }
}

async function fetchText(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(bust(url), { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error("http");
    return await res.text();
  } finally { clearTimeout(t); }
}

async function probeDomestic() {
  const apis = [
    {
      name: "speedtest.cn",
      url: "https://api-v3.speedtest.cn/ip",
      parse: (d) => ({ ip: maskIp(d.data?.ip || "未知"), line: [d.data?.country, d.data?.city].filter(Boolean).join(" ") }),
    },
    {
      name: "ipipv.com",
      url: "https://myip.ipipv.com/",
      parse: (d) => ({ ip: maskIp(d.Ip || "未知"), line: [d.Country, d.City].filter(Boolean).join(" ") }),
    },
    {
      name: "ipip.net",
      url: "https://myip.ipip.net/json",
      parse: (d) => ({ ip: maskIp(d.data?.ip || "未知"), line: [d.data?.location?.[0], d.data?.location?.[2]].filter(Boolean).join(" ") }),
    },
  ];
  for (const api of apis) {
    try {
      const data = await fetchJson(api.url);
      return { ...api.parse(data), subtitle: api.name };
    } catch (_) { /* next */ }
  }
  throw new Error("domestic");
}

async function probeForeign() {
  const d = await fetchJson("https://api.cmliussss.net/api/ipinfo");
  const asn = d.asn ? `AS${String(d.asn).replace(/^AS/i, "")}` : "";
  return { ip: d.ip || "未知", line: [d.country_code, asn, d.as_name].filter(Boolean).join(" ") };
}

async function probeCf() {
  const d = await fetchJson("https://cf.090227.xyz/ip.json");
  return { ip: d.ip || "未知", line: [d.country, d.org].filter(Boolean).join(" ") };
}

async function probeX() {
  const text = await fetchText("https://help.x.com/cdn-cgi/trace");
  const map = {};
  text.split("\n").forEach((line) => {
    const i = line.indexOf("=");
    if (i > 0) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return { ip: map.ip || "未知", line: [map.loc, map.colo].filter(Boolean).join(" ") };
}

const PROBES = { domestic: probeDomestic, foreign: probeForeign, cloudflare: probeCf, xcom: probeX };

async function probeLatency(site) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const start = performance.now();
  try {
    await fetch(bust(site.url), {
      method: "GET",
      cache: "no-store",
      mode: "no-cors",
      referrerPolicy: "no-referrer",
      signal: ctrl.signal,
    });
    return Math.max(1, Math.round(performance.now() - start));
  } catch {
    return -1;
  } finally {
    clearTimeout(t);
  }
}

function renderExits() {
  const root = document.getElementById("exit-grid");
  root.innerHTML = EXITS.map((meta) => {
    const e = state.exits[meta.id];
    const ip = e.status === "loading" && !e.ip ? "加载中..." : (e.ip || "—");
    const clickable = e.status === "success" && e.ip;
    return `<article class="exit-card">
      <div class="exit-head">
        <span class="status ${e.status}"></span>
        ${meta.title}<small>${e.subtitle || meta.subtitle}</small>
      </div>
      <div class="ip${clickable ? " clickable" : ""}" data-ip="${clickable ? e.ip : ""}">${ip}</div>
      <div class="line">${e.line || "—"}</div>
      <div class="tip">· ${meta.tip}</div>
    </article>`;
  }).join("");
  root.querySelectorAll(".ip.clickable").forEach((el) => {
    el.addEventListener("click", () => lookupIp(el.dataset.ip));
  });
}

function renderLatency() {
  const root = document.getElementById("latency-grid");
  root.innerHTML = SITES.map((site) => {
    const samples = state.samples[site.id];
    const a = avg(samples);
    const t = samples.length && samples.every((n) => n < 0) ? "dead" : tone(a);
    const color = getComputedStyle(document.documentElement).getPropertyValue(`--${t}`).trim() || "#008236";
    const label = !samples.length
      ? `···<span class="unit">ms</span>`
      : (t === "dead" && a < 0 ? `<span style="font-size:17px;font-style:normal;letter-spacing:0">TIMEOUT</span>` : `${a}<span class="unit">ms</span>`);
    const chip = site.region === "国内" ? "domestic" : "international";
    return `<article class="latency-card">
      <svg class="spark" viewBox="0 0 400 48" preserveAspectRatio="none"><path d="${spark(samples)}" style="stroke:${color}"></path></svg>
      <div class="latency-inner">
        <div class="site-icon">${ICONS[site.id]}</div>
        <div><span class="site-name">${site.name}</span><span class="chip ${chip}">${site.region}</span></div>
        <div class="ms tone-${t}">${label}</div>
      </div>
    </article>`;
  }).join("");
}

function renderChanges() {
  const root = document.getElementById("change-log");
  if (!state.changes.length) {
    root.innerHTML = `<p class="empty">还没有变化。换一条代理节点，等几秒即可。</p>`;
    return;
  }
  root.innerHTML = state.changes.map((c) =>
    `<div class="change-row"><time>${c.at}</time><div><strong>${c.title}</strong><div class="fromto">${c.from} → ${c.to}</div></div></div>`
  ).join("");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("netmon-theme", theme);
}

async function refreshExits() {
  await Promise.all(EXITS.map(async (meta) => {
    const prev = { ...state.exits[meta.id] };
    state.exits[meta.id] = { ...state.exits[meta.id], status: "loading" };
    renderExits();
    try {
      const result = await PROBES[meta.id]();
      const next = { ...state.exits[meta.id], ...result, status: "success" };
      if (prev.status === "success" && prev.ip && next.ip && prev.ip !== next.ip) {
        state.changes.unshift({ at: clock(), title: meta.title, from: prev.ip, to: next.ip });
        state.changes = state.changes.slice(0, 24);
        renderChanges();
      }
      state.exits[meta.id] = next;
    } catch {
      state.exits[meta.id] = { ...state.exits[meta.id], status: "error", ip: state.exits[meta.id].ip || "加载失败", line: "网络异常，稍后重试" };
    }
    renderExits();
  }));
}

async function refreshLatency() {
  await Promise.all(SITES.map(async (site) => {
    const ms = await probeLatency(site);
    const next = [...state.samples[site.id], ms].slice(-SAMPLE_COUNT);
    state.samples[site.id] = next;
  }));
  renderLatency();
}

async function refreshAll() {
  const btn = document.getElementById("btn-refresh");
  btn.classList.add("spinning");
  await Promise.all([refreshExits(), refreshLatency()]);
  btn.classList.remove("spinning");
}

async function lookupIp(ip) {
  toast("正在查询 IP…");
  try {
    const clean = ip.replace(/\*/g, "0");
    const data = await fetchJson("https://api.ipapi.is/?ip=" + encodeURIComponent(clean));
    const loc = data.location || {};
    const company = data.company || {};
    const asn = data.asn || {};
    const row = (k, v) => v ? `<div class="modal-row"><span>${k}</span><span>${v}</span></div>` : "";
    const modal = document.getElementById("modal");
    modal.hidden = false;
    modal.innerHTML = `<div class="modal-card">
      <div class="modal-head"><div><h2>IP 详细信息</h2><p class="hint">数据来源 ipapi.is</p></div>
      <button class="icon-btn" id="modal-close" aria-label="关闭">×</button></div>
      ${row("IP 地址", data.ip)}
      ${row("RIR", data.rir)}
      ${row("运营商", company.name)}
      ${row("国家", [loc.country, loc.country_code].filter(Boolean).join(" "))}
      ${row("城市", loc.city)}
      ${row("ASN", asn.asn ? "AS" + asn.asn : "")}
      ${row("组织", asn.org)}
      ${row("数据中心", data.is_datacenter ? "是" : "否")}
      ${row("代理 / VPN", (data.is_proxy || data.is_vpn) ? "是" : "否")}
    </div>`;
    modal.querySelector("#modal-close").onclick = () => { modal.hidden = true; };
    modal.onclick = (e) => { if (e.target === modal) modal.hidden = true; };
  } catch {
    toast("查询 IP 详细信息失败");
  }
}

function setPaused(v) {
  state.paused = v;
  document.getElementById("live-pill").classList.toggle("paused", v);
  document.getElementById("live-label").textContent = v ? "已暂停" : "实时检测";
  document.getElementById("icon-pause").hidden = v;
  document.getElementById("icon-play").hidden = !v;
}

function init() {
  const saved = localStorage.getItem("netmon-theme");
  const theme = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(theme);

  renderExits();
  renderLatency();
  renderChanges();
  refreshAll();

  document.getElementById("btn-pause").onclick = () => setPaused(!state.paused);
  document.getElementById("btn-refresh").onclick = () => refreshAll();
  document.getElementById("btn-theme").onclick = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    renderLatency();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.getElementById("modal").hidden = true;
  });

  setInterval(() => {
    if (state.paused) return;
    state.elapsed += 1;
    document.getElementById("live-time").textContent = formatElapsed(state.elapsed);
  }, 1000);
  setInterval(() => { if (!state.paused) refreshExits(); }, EXIT_INTERVAL);

  // 延迟采样调度：
  // 1. 页面首次进入：连续3秒，每0.2秒采样一次
  // 2. 之后：每1秒正常采样
  // 3. 每30秒：插入一轮3秒快速采样
  let latencyTimer = null;
  let burstTimer = null;
  let burstRunning = false;

  const runBurst = () => {
    if (state.paused || burstRunning) return;
    burstRunning = true;

    const endAt = Date.now() + BURST_DURATION;
    refreshLatency();
    latencyTimer = setInterval(() => {
      if (!state.paused) refreshLatency();
      if (Date.now() >= endAt) {
        clearInterval(latencyTimer);
        latencyTimer = null;
        burstRunning = false;
      }
    }, BURST_INTERVAL);
  };

  const startLatencySchedule = () => {
    runBurst();
    setTimeout(() => {
      setInterval(() => {
        if (!state.paused && !burstRunning) refreshLatency();
      }, LATENCY_INTERVAL);
    }, BURST_DURATION);
    burstTimer = setInterval(runBurst, BURST_EVERY);
  };

  startLatencySchedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
