(() => {
  "use strict";

  const SAMPLE_COUNT = 16;
  const LATENCY_INTERVAL_MS = 1236;
  const IP_INTERVAL_MS = 8000;
  const FETCH_MS = 8000;
  const PING_MS = 5000;

  const IP_SOURCES = [
    {
      id: "domestic",
      title: "国内测试",
      subtitle: "speedtest.cn",
      tip: "访问国内网站所使用的出口 IP",
      fetch: fetchDomestic,
    },
    {
      id: "foreign",
      title: "国外测试",
      subtitle: "漏网之鱼",
      tip: "访问未被封锁的国外网站所使用的 IP",
      fetch: fetchForeign,
    },
    {
      id: "cloudflare",
      title: "Cloudflare",
      subtitle: "ProxyIP",
      tip: "访问 CF CDN 站点所使用的落地 IP",
      fetch: fetchCloudflare,
    },
    {
      id: "x",
      title: "墙外测试",
      subtitle: "X.com",
      tip: "访问 X / Twitter 等站点所使用的 IP",
      fetch: fetchX,
    },
  ];

  const LATENCY_SITES = [
    {
      id: "bytedance",
      name: "字节跳动",
      region: "国内",
      url: "https://lf3-zlink-tos.ugurl.cn/obj/zebra-public/resource_lmmizj_1632398893.png",
      icon: `<svg viewBox="0 0 24 24"><path fill="#1677FF" d="m19.9 1.5 4.1 1v19l-4.1 1zM6.5 10.9l4.1 1v9l-4 1.1zM0 2.6l4.1 1v16.8l-4.1 1zm17.5 5.6v11.1l-4.2-1v-9z"/></svg>`,
    },
    {
      id: "bilibili",
      name: "Bilibili",
      region: "国内",
      url: "https://i0.hdslb.com/bfs/face/member/noface.jpg@24w_24h_1c",
      icon: `<svg viewBox="0 0 24 24"><path fill="#FB7299" d="M17.813 4.653h.854q2.266.08 3.773 1.574Q23.946 7.72 24 9.987v7.36q-.054 2.266-1.56 3.773c-1.506 1.507-2.262 1.524-3.773 1.56H5.333q-2.266-.054-3.773-1.56C.053 19.614.036 18.858 0 17.347v-7.36q.054-2.267 1.56-3.76t3.773-1.574h.774l-1.174-1.12a1.23 1.23 0 0 1-.373-.906q0-.534.373-.907l.027-.027q.4-.373.92-.373t.92.373L9.653 4.44q.107.106.187.213h4.267a.8.8 0 0 1 .16-.213l2.853-2.747q.4-.373.92-.373c.347 0 .662.151.929.4s.391.551.391.907q0 .532-.373.906zM5.333 7.24q-1.12.027-1.88.773q-.76.748-.786 1.894v7.52q.026 1.146.786 1.893t1.88.773h13.334q1.12-.026 1.88-.773t.786-1.893v-7.52q-.026-1.147-.786-1.894t-1.88-.773z"/></svg>`,
    },
    {
      id: "wechat",
      name: "微信",
      region: "国内",
      url: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
      icon: `<svg viewBox="0 0 24 24"><path fill="#09B83E" d="M8.7 2.19C3.9 2.19 0 5.48 0 9.53c0 2.21 1.17 4.2 3 5.55a.6.6 0 0 1 .21.66l-.39 1.48q-.03.11-.04.22c0 .16.13.3.29.3a.3.3 0 0 0 .16-.06l1.9-1.11a.9.9 0 0 1 .72-.1 10 10 0 0 0 2.84.4q.41-.01.81-.05a5.85 5.85 0 0 1 1.93-6.45 8.3 8.3 0 0 1 5.86-1.83c-.58-3.59-4.2-6.35-8.6-6.35m-2.9 3.8c.64 0 1.16.53 1.16 1.18a1.17 1.17 0 0 1-1.16 1.18 1.17 1.17 0 0 1-1.17-1.18c0-.65.52-1.18 1.17-1.18m5.8 0c.65 0 1.17.53 1.17 1.18a1.17 1.17 0 0 1-1.16 1.18 1.17 1.17 0 0 1-1.16-1.18c0-.65.52-1.18 1.16-1.18"/></svg>`,
    },
    {
      id: "taobao",
      name: "淘宝",
      region: "国内",
      url: "https://img.alicdn.com/imgextra/i2/O1CN01qnQCrN1VkzAWiU4Hs_!!6000000002692-2-tps-33-33.png",
      icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#E16322"/><text x="12" y="16" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="sans-serif">淘</text></svg>`,
    },
    {
      id: "github",
      name: "GitHub",
      region: "国际",
      url: "https://github.github.io/janky/images/bg_hr.png",
      icon: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.7 4.7 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"/></svg>`,
    },
    {
      id: "jsdelivr",
      name: "jsDelivr",
      region: "国际",
      url: "https://cdn.jsdelivr.net/npm/latency-test@1.0.1/smallest-possible-white.gif",
      icon: `<svg viewBox="0 0 24 24"><path fill="#F0DB4F" d="M12 2 2 7l10 5 10-5-10-5zm0 9.5L4.5 7.8v4.4L12 16.5l7.5-4.3V7.8L12 11.5zM4.5 14.2 12 18.5l7.5-4.3V17L12 21.5 4.5 17v-2.8z"/></svg>`,
    },
    {
      id: "cloudflare",
      name: "Cloudflare",
      region: "国际",
      url: "https://www.cloudflare.com/favicon.ico",
      icon: `<svg viewBox="0 0 24 24"><path fill="#F38020" d="M16.5 16.85c.16-.51.1-.98-.15-1.32Q16 15.05 15.3 15l-8.66-.11a.2.2 0 0 1-.13-.07.2.2 0 0 1-.02-.16.2.2 0 0 1 .2-.16l8.74-.1a3.1 3.1 0 0 0 2.55-1.92l.5-1.3a.3.3 0 0 0 .02-.17 5.69 5.69 0 0 0-10.94-.59 2.6 2.6 0 0 0-1.8-.5 2.56 2.56 0 0 0-2.22 3.19A3.63 3.63 0 0 0 0 16.75q0 .27.04.53a.2.2 0 0 0 .17.15h15.98a.2.2 0 0 0 .2-.16z"/></svg>`,
    },
    {
      id: "youtube",
      name: "YouTube",
      region: "国际",
      url: "https://www.youtube.com/favicon.ico",
      icon: `<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M23.5 6.19a3 3 0 0 0-2.12-2.14c-1.87-.5-9.38-.5-9.38-.5s-7.5 0-9.38.5A3 3 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3 3 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3 3 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81M9.55 15.57V8.43L15.82 12z"/></svg>`,
    },
  ];

  const state = {
    paused: false,
    ips: Object.fromEntries(
      IP_SOURCES.map((s) => [s.id, { status: "loading", data: null, error: null }]),
    ),
    samples: Object.fromEntries(LATENCY_SITES.map((s) => [s.id, []])),
    log: [],
    logId: 0,
    updatedAt: null,
  };

  const el = {
    ipGrid: document.getElementById("ip-grid"),
    latencyGrid: document.getElementById("latency-grid"),
    changeLog: document.getElementById("change-log"),
    statusLabel: document.getElementById("status-label"),
    liveDot: document.getElementById("live-dot"),
    updatedAt: document.getElementById("updated-at"),
    panelMeta: document.getElementById("panel-meta"),
    btnPause: document.getElementById("btn-pause"),
    btnRefresh: document.getElementById("btn-refresh"),
    btnTheme: document.getElementById("btn-theme"),
    toast: document.getElementById("toast"),
    modal: document.getElementById("modal"),
    modalIp: document.getElementById("modal-ip"),
    modalBody: document.getElementById("modal-body"),
    legend: document.getElementById("legend"),
  };

  function bust(url) {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}_t=${Date.now()}`;
  }

  function withTimeout(ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, cancel: () => clearTimeout(timer) };
  }

  async function fetchText(url) {
    const { signal, cancel } = withTimeout(FETCH_MS);
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal,
        referrerPolicy: "no-referrer",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      cancel();
    }
  }

  async function fetchJson(url) {
    return JSON.parse(await fetchText(url));
  }

  function parseTrace(text) {
    const data = {};
    for (const line of text.split("\n")) {
      const i = line.indexOf("=");
      if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return data;
  }

  async function firstOk(tasks) {
    let last;
    for (const task of tasks) {
      try {
        return await task();
      } catch (err) {
        last = err;
      }
    }
    throw last instanceof Error ? last : new Error("all failed");
  }

  async function fetchDomestic() {
    return firstOk([
      async () => {
        const data = await fetchJson(bust("https://api-v3.speedtest.cn/ip"));
        if (data.code !== 0 || !data.data?.ip) throw new Error("bad speedtest");
        return {
          ip: data.data.ip,
          country: data.data.country || "未知",
          detail: [data.data.city, data.data.isp].filter(Boolean).join(" · "),
          source: "speedtest.cn",
        };
      },
      async () => {
        const data = await fetchJson(bust("https://myip.ipip.net/json"));
        if (data.ret !== "ok" || !data.data?.ip) throw new Error("bad ipip");
        const loc = data.data.location || [];
        return {
          ip: data.data.ip,
          country: loc[0] || "未知",
          detail: [loc[1], loc[2], loc[4]].filter(Boolean).join(" "),
          source: "ipip.net",
        };
      },
      async () => {
        const data = await fetchJson(bust("https://get.geojs.io/v1/ip/geo.json"));
        if (!data.ip) throw new Error("bad geojs");
        return {
          ip: data.ip,
          country: data.country_code || data.country || "未知",
          detail: [data.city, data.organization].filter(Boolean).join(" · "),
          source: "geojs",
        };
      },
    ]);
  }

  async function fetchForeign() {
    return firstOk([
      async () => {
        const data = await fetchJson(bust("https://api.cmliussss.net/api/ipinfo"));
        if (!data.ip) throw new Error("bad cmli");
        return {
          ip: data.ip,
          country: data.country_code || "未知",
          detail: [data.asn, data.as_name].filter(Boolean).join(" "),
          source: "漏网之鱼",
        };
      },
      async () => {
        const data = await fetchJson(bust("https://ipwho.is/"));
        if (!data.ip) throw new Error("bad ipwho");
        return {
          ip: data.ip,
          country: data.country_code || "未知",
          detail: [
            data.connection?.asn ? `AS${data.connection.asn}` : "",
            data.connection?.org,
          ]
            .filter(Boolean)
            .join(" "),
          source: "ipwho.is",
        };
      },
    ]);
  }

  async function fetchCloudflare() {
    return firstOk([
      async () => {
        const data = await fetchJson(bust("https://cf.090227.xyz/ip.json"));
        if (!data.ip) throw new Error("bad cf json");
        return {
          ip: data.ip,
          country: data.country || "未知",
          detail: data.org || [data.city, data.colo].filter(Boolean).join(" "),
          source: "CF CDN",
        };
      },
      async () => {
        const trace = parseTrace(
          await fetchText(bust("https://cloudflare-dns.com/cdn-cgi/trace")),
        );
        if (!trace.ip) throw new Error("bad cf trace");
        return {
          ip: trace.ip,
          country: trace.loc || "未知",
          detail: trace.colo || "",
          source: "cdn-cgi/trace",
        };
      },
    ]);
  }

  async function fetchX() {
    return firstOk([
      async () => {
        const trace = parseTrace(
          await fetchText(bust("https://help.x.com/cdn-cgi/trace")),
        );
        if (!trace.ip) throw new Error("bad x trace");
        return {
          ip: trace.ip,
          country: trace.loc || "未知",
          detail: trace.colo || "",
          source: "X.com",
        };
      },
      async () => {
        const trace = parseTrace(
          await fetchText(bust("https://cf.090227.xyz/cdn-cgi/trace")),
        );
        if (!trace.ip) throw new Error("bad fallback");
        return {
          ip: trace.ip,
          country: trace.loc || "未知",
          detail: trace.colo || "",
          source: "CF trace",
        };
      },
    ]);
  }

  async function pingUrl(url) {
    const run = async (method) => {
      const { signal, cancel } = withTimeout(PING_MS);
      const start = performance.now();
      try {
        await fetch(bust(url), {
          method,
          cache: "no-store",
          mode: "no-cors",
          referrerPolicy: "no-referrer",
          signal,
        });
        return Math.round(performance.now() - start);
      } finally {
        cancel();
      }
    };
    try {
      return await run("GET");
    } catch {
      try {
        return await run("HEAD");
      } catch {
        return pingImage(url);
      }
    }
  }

  function pingImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      const start = performance.now();
      const timer = setTimeout(() => {
        img.src = "";
        resolve(-1);
      }, PING_MS);
      const done = () => {
        clearTimeout(timer);
        resolve(Math.round(performance.now() - start));
      };
      img.onload = done;
      img.onerror = done;
      img.src = bust(url);
    });
  }

  function latencyTone(ms) {
    if (ms < 0) return "dead";
    if (ms <= 49) return "good";
    if (ms <= 149) return "ok";
    if (ms <= 299) return "warn";
    if (ms <= 999) return "bad";
    return "dead";
  }

  function latencyColor(ms) {
    return `var(--latency-${latencyTone(ms)})`;
  }

  function buildEcgPath(samples, width = 400, height = 60) {
    if (!samples.length) return `M0,${height / 2} L${width},${height / 2}`;
    const pad = 8;
    const step = samples.length === 1 ? 0 : width / (SAMPLE_COUNT - 1);
    const points = samples.map((l, i) => {
      const x = i * step;
      const y =
        l < 0
          ? height - 6
          : height - pad - (Math.min(l, 500) / 500) * (height - pad * 2);
      return { x, y };
    });
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      d += ` Q${points[i].x},${points[i].y} ${midX},${midY}`;
    }
    const last = points[points.length - 1];
    d += ` L${last.x},${last.y}`;
    return d;
  }

  function lastPoint(samples, width = 400, height = 60) {
    if (!samples.length) return { x: 0, y: height / 2 };
    const pad = 8;
    const step = samples.length === 1 ? 0 : width / (SAMPLE_COUNT - 1);
    const i = samples.length - 1;
    const l = samples[i];
    return {
      x: i * step,
      y:
        l < 0
          ? height - 6
          : height - pad - (Math.min(l, 500) / 500) * (height - pad * 2),
    };
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function toast(msg) {
    el.toast.hidden = false;
    el.toast.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.toast.hidden = true;
    }, 2200);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }

  function renderLegend() {
    const items = [
      ["good", "≤ 49 ms"],
      ["ok", "50–149 ms"],
      ["warn", "150–299 ms"],
      ["bad", "300–999 ms"],
      ["dead", "TIMEOUT"],
    ];
    el.legend.innerHTML = items
      .map(
        ([tone, label]) =>
          `<span><i style="background:var(--latency-${tone})"></i>${label}</span>`,
      )
      .join("");
  }

  function renderIps() {
    el.ipGrid.innerHTML = IP_SOURCES.map((source) => {
      const s = state.ips[source.id];
      const data = s.data;
      const statusClass =
        s.status === "ok" ? "ok" : s.status === "error" ? "error" : "loading";
      const flash = s.flash ? " flash" : "";
      let body;
      if (s.status === "error") {
        body = `<p class="ip-error">${s.error || "加载失败"}</p>`;
      } else if (data?.ip) {
        body = `
          <button type="button" class="ip-value" data-copy="${data.ip}" title="点击复制">
            <span>${data.ip}</span>
          </button>
          <p class="ip-loc">${data.country || ""}${data.detail ? " " + data.detail : ""}</p>
          <div class="ip-foot">
            <p class="ip-tip">${source.tip}</p>
            <button type="button" class="ip-detail-btn" data-detail="${data.ip}">详情</button>
          </div>`;
      } else {
        body = `<p class="ip-error" style="color:var(--subtle)">加载中…</p>
          <div class="ip-foot"><p class="ip-tip">${source.tip}</p></div>`;
      }
      return `
        <article class="ip-card${flash}" data-id="${source.id}">
          <div class="ip-card-title">
            <span class="dot ${statusClass}"></span>
            ${source.title}
            <span class="source">${data?.source || source.subtitle}</span>
          </div>
          <div class="ip-body">${body}</div>
        </article>`;
    }).join("");

    const live = Object.values(state.ips).filter((s) => s.status === "ok").length;
    el.panelMeta.textContent = `${live}/4 条出口在线 · 延迟每 ${(LATENCY_INTERVAL_MS / 1000).toFixed(1)}s 采样`;
  }

  function renderLatency() {
    el.latencyGrid.innerHTML = LATENCY_SITES.map((site) => {
      const samples = state.samples[site.id] || [];
      const valid = samples.filter((n) => n >= 0);
      const last = samples[samples.length - 1];
      const avg =
        valid.length === 0
          ? null
          : Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
      const timedOut = valid.length === 0 && last === -1;
      const color = timedOut
        ? latencyColor(-1)
        : avg == null
          ? "var(--primary)"
          : latencyColor(avg);
      const path = buildEcgPath(samples);
      const cursor = lastPoint(samples);
      const regionClass = site.region === "国内" ? "cn" : "intl";
      const valueHtml = timedOut
        ? `<div class="latency-value timeout" style="color:${color}">TIMEOUT</div>`
        : avg == null
          ? `<div class="latency-value" style="color:${color}">…</div>`
          : `<div class="latency-value" style="color:${color}">${avg}<span class="unit">ms</span></div>`;
      return `
        <article class="latency-card">
          <div class="latency-bg">
            <div class="grid"></div>
            <svg viewBox="0 0 400 60" preserveAspectRatio="none">
              <path d="M0,30 L400,30" fill="none" stroke="var(--border)" stroke-width="1" opacity="0.5"/>
              <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              ${samples.length ? `<circle cx="${cursor.x}" cy="${cursor.y}" r="3" fill="${color}"/>` : ""}
            </svg>
          </div>
          <div class="latency-main">
            <span class="site-icon">${site.icon}</span>
            <div>
              <span class="site-name">${site.name}</span>
              <span class="site-region ${regionClass}">${site.region}</span>
            </div>
          </div>
          ${valueHtml}
        </article>`;
    }).join("");
  }

  function renderLog() {
    if (!state.log.length) {
      el.changeLog.innerHTML =
        '<li class="empty">还没有变化。换一条代理节点，等几秒即可。</li>';
      return;
    }
    el.changeLog.innerHTML = state.log
      .map(
        (item) => `
        <li>
          <div class="row"><strong>${item.title}</strong><span class="mono">${formatTime(item.at)}</span></div>
          <p class="ips"><span class="subtle">${item.from}</span><span class="arrow">→</span><span>${item.to}</span></p>
        </li>`,
      )
      .join("");
  }

  function renderStatus() {
    el.statusLabel.textContent = state.paused ? "已暂停" : "实时检测";
    el.liveDot.classList.toggle("pulse", !state.paused);
    el.liveDot.classList.toggle("paused", state.paused);
    el.btnPause.textContent = state.paused ? "▶" : "⏸";
    el.btnPause.setAttribute("aria-label", state.paused ? "继续" : "暂停");
    el.updatedAt.textContent = state.updatedAt ? formatTime(state.updatedAt) : "";
  }

  async function refreshIps() {
    await Promise.all(
      IP_SOURCES.map(async (source) => {
        state.ips[source.id] = {
          ...state.ips[source.id],
          status: "loading",
        };
        renderIps();
        try {
          const data = await source.fetch();
          const prev = state.ips[source.id]?.data;
          if (prev?.ip && prev.ip !== data.ip) {
            state.logId += 1;
            state.log = [
              {
                id: state.logId,
                at: Date.now(),
                title: source.title,
                from: prev.ip,
                to: data.ip,
              },
              ...state.log,
            ].slice(0, 12);
            renderLog();
          }
          state.ips[source.id] = {
            status: "ok",
            data: { ...data, source: data.source || source.subtitle },
            error: null,
            flash: prev?.ip && prev.ip !== data.ip,
          };
        } catch {
          state.ips[source.id] = {
            status: "error",
            data: null,
            error: source.id === "x" ? "翻墙失败" : "加载失败",
            flash: false,
          };
        }
      }),
    );
    state.updatedAt = Date.now();
    renderIps();
    renderStatus();
    setTimeout(() => {
      for (const id of Object.keys(state.ips)) state.ips[id].flash = false;
      renderIps();
    }, 800);
  }

  async function pingOnce() {
    const results = await Promise.all(
      LATENCY_SITES.map(async (site) => ({
        id: site.id,
        ms: await pingUrl(site.url),
      })),
    );
    for (const { id, ms } of results) {
      const list = [...(state.samples[id] || []), ms];
      if (list.length > SAMPLE_COUNT) list.shift();
      state.samples[id] = list;
    }
    renderLatency();
  }

  async function lookupIp(ip) {
    const data = await fetchJson(
      `https://api.ipapi.is/?ip=${encodeURIComponent(ip)}`,
    );
    return {
      ip: data.ip || ip,
      country: data.cc,
      asn: data.asn_num ? `AS${data.asn_num}` : undefined,
      org: data.company_name || data.asn_org,
      isDatacenter: data.is_datacenter,
      isProxy: data.is_proxy,
      isVpn: data.is_vpn,
      isTor: data.is_tor,
    };
  }

  function openModal(detail) {
    el.modalIp.textContent = detail.ip;
    const rows = [
      ["国家", detail.country ?? "—"],
      ["ASN", detail.asn ?? "—"],
      ["组织", detail.org ?? "—"],
      ["数据中心", detail.isDatacenter ? "是" : "否"],
      ["代理", detail.isProxy ? "是" : "否"],
      ["VPN", detail.isVpn ? "是" : "否"],
    ];
    el.modalBody.innerHTML = rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join("");
    el.modal.hidden = false;
  }

  function closeModal() {
    el.modal.hidden = true;
  }

  function initTheme() {
    const saved = localStorage.getItem("netpulse-theme");
    const theme =
      saved ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("netpulse-theme", next);
  }

  el.ipGrid.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const ip = copyBtn.getAttribute("data-copy");
      const ok = await copyText(ip);
      toast(ok ? `已复制 ${ip}` : "复制失败，请手动选择");
      return;
    }
    const detailBtn = e.target.closest("[data-detail]");
    if (detailBtn) {
      const ip = detailBtn.getAttribute("data-detail");
      el.modalIp.textContent = "查询中…";
      el.modalBody.innerHTML = "";
      el.modal.hidden = false;
      try {
        openModal(await lookupIp(ip));
      } catch {
        closeModal();
        toast("查询 IP 详情失败");
      }
    }
  });

  el.modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  el.btnPause.addEventListener("click", () => {
    state.paused = !state.paused;
    renderStatus();
  });
  el.btnRefresh.addEventListener("click", () => {
    void refreshIps();
    void pingOnce();
  });
  el.btnTheme.addEventListener("click", toggleTheme);

  initTheme();
  renderLegend();
  renderIps();
  renderLatency();
  renderLog();
  renderStatus();

  void refreshIps();
  void pingOnce();

  setInterval(() => {
    if (state.paused || document.visibilityState !== "visible") return;
    void refreshIps();
  }, IP_INTERVAL_MS);

  setInterval(() => {
    if (state.paused || document.visibilityState !== "visible") return;
    void pingOnce();
  }, LATENCY_INTERVAL_MS);
})();
