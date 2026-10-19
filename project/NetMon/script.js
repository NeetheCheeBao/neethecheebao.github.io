/* ==========================================================================
   在线网络监测面板 — 主脚本
   模块：主题切换 → 出口 IP 探测（国内 / 国外 / CloudFlare / 墙外）
        → IP 归属地查询与缓存 → IP 详情弹窗（含地图）
        → 站点延迟实时监测 → Toast 提示
   依赖：无框架、无构建，纯浏览器 API；所有 DOM 约定与 style.css 中的类名一一对应
   ========================================================================== */

function showToast(message) {
    // 移除已存在的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 显示动画
    setTimeout(() => toast.classList.add('show'), 10);

    // 3秒后自动消失
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 图片懒加载功能
// 主题切换
const themeSwitcher = document.getElementById('theme-switcher');

// 获取系统主题偏好
function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

// 设置初始主题：优先使用本地存储，如果没有则跟随系统
const savedTheme = localStorage.getItem('theme');
const initialTheme = savedTheme || getSystemTheme();
document.documentElement.setAttribute('data-theme', initialTheme);

// 监听系统主题变化（仅当用户未手动设置时）
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // 只有在用户没有手动设置主题时才自动跟随系统
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
        }
    });
}

// 主题切换事件
themeSwitcher.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// 网络出口信息功能
// 设置状态指示器
function setStatus(id, status) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.className = 'status-indicator status-' + status;
    }
}

// ============================================================
// 网络地址（location）统一格式化
// 目标格式：`国家码 AS号 ISP名`，例如 `CN AS4134 CHINANET`
// 说明：必须由国家码（2 位字母）开头，绝不能输出中文国家名，
//       否则国旗角标取不到码、掩码也不好看。
// ============================================================

/** 国家中文名 -> ISO 3166-1 alpha-2 国家码（仅覆盖国内接口可能返回的高频值） */
const CN_COUNTRY_NAME_TO_CODE = {
    '中国': 'CN',
    '中國': 'CN',
    'china': 'CN',
    '中华人民共和国': 'CN',
    '香港': 'HK',
    'hong kong': 'HK',
    '澳门': 'MO',
    'macau': 'MO',
    '台湾': 'TW',
    'taiwan': 'TW',
    '美国': 'US',
    'united states': 'US',
    '日本': 'JP',
    'japan': 'JP',
    '韩国': 'KR',
    'south korea': 'KR',
    '新加坡': 'SG',
    'singapore': 'SG',
    '英国': 'GB',
    'united kingdom': 'GB',
    '德国': 'DE',
    'germany': 'DE',
    '法国': 'FR',
    'france': 'FR',
    '澳大利亚': 'AU',
    'australia': 'AU',
    '加拿大': 'CA',
    'canada': 'CA',
    '俄罗斯': 'RU',
    'russia': 'RU',
    '印度': 'IN',
    'india': 'IN'
};

/**
 * 将任意国家标识（2 位码 / 3 位码 / 中文名 / 英文名）归一化为 2 位大写国家码。
 * @param {string} value 原始国家标识
 * @returns {string} 2 位大写国家码，无法识别时返回空串
 */
function normalizeCountryCode(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    if (/^[a-zA-Z]{2}$/.test(raw)) return raw.toUpperCase();

    // 形如 "SG (Singapore)" / "CN-CHINA" 等：优先截取开头的 2 位字母
    const leading = raw.match(/^([a-zA-Z]{2})(?![a-zA-Z])/);
    if (leading) return leading[1].toUpperCase();

    return CN_COUNTRY_NAME_TO_CODE[raw.toLowerCase()] || '';
}

/**
 * 将纯数字 AS 号补上 `AS` 前缀（`4134` -> `AS4134`，`AS4134` 原样）。
 * @param {string|number} asn AS 号
 * @returns {string} 形如 `AS4134` 的文本，无效时返回空串
 */
function normalizeAsn(asn) {
    const raw = String(asn ?? '').trim();
    if (!raw || raw === '0' || /^as0?$/i.test(raw)) return '';
    if (/^\d+$/.test(raw)) return `AS${raw}`;
    if (/^as\d+$/i.test(raw)) return `AS${raw.replace(/^as/i, '')}`;
    return raw;
}

/**
 * 统一拼装网络地址：`国家码 AS号 ISP名`。
 * 任一段缺失即跳过，全部缺失返回 `未知`。
 * @param {{countryCode?: string, asn?: string|number, asnName?: string}} info 地址三元组
 * @returns {string} 例如 `CN AS4134 CHINANET`
 */
function formatNetworkLocation(info) {
    const source = info || {};
    const countryCode = normalizeCountryCode(
        source.countryCode || source.country || source.country_code || ''
    );
    const asnText = normalizeAsn(source.asn);
    const asnName = String(source.asnName || source.isp || source.org || '').trim();

    const parts = [];
    if (countryCode) parts.push(countryCode);
    if (asnText) parts.push(asnText);
    if (asnName) parts.push(asnName);

    return parts.join(' ').trim() || '未知';
}

/**
 * 从任意 IP 信息接口响应中提取 ASN 与 ISP 名（字段名各家不一，逐级兜底）。
 * @param {object} data 接口响应
 * @returns {{asn: string, asnName: string}} ASN 与 ISP 名
 */
function pickAsnFields(data) {
    const source = data || {};
    return {
        asn: source.asn || source.asOrganization || source.organization || source.org || source.isp || '',
        asnName: source.as_name || source.asnName || source.asn_organization
            || source.organization || source.org || source.companyName
            || source.isp || source.asn_name || ''
    };
}

// ============================================================
// IP 反查结果内存缓存（避免同一 IP 重复打外网）
//   两个反查函数各用独立命名空间（函数名前缀 + ':' + ip），互不串味：
//     - 命中即直接返回，不再发请求；
//     - 缓存的是 Promise（in-flight Promise），并发查同一 IP 时也只发 1 个请求；
//     - 失败（抛错 / 重试后仍失败）时从缓存删除该 key，下次仍可重试；
//     - 只缓存「有效结果」，不缓存空对象 {}，避免把「查不到」永久钉死。
// ============================================================

/** @type {Map<string, Promise<{countryCode?: string, asn?: string|number, asnName?: string}>>} */
const ipGeoCache = new Map();

/**
 * 生成缓存 key：函数名前缀 + ':' + 规范化 IP，保证不同接口分开缓存。
 * @param {string} namespace 函数名前缀（如 'ipLocate' / 'ipSbGeo'）
 * @param {string} ip 规范化后的 IP
 * @returns {string} 缓存 key
 */
function buildIpGeoCacheKey(namespace, ip) {
    return `${namespace}:${ip}`;
}

/**
 * 判断反查结果是否「有效」——只有拿到有效结果才写入缓存。
 * 空对象 {}（无 countryCode 且无 asn）视为查不到，不缓存。
 * @param {{countryCode?: string, asn?: string|number}} result 反查结果
 * @returns {boolean} 是否有效
 */
function isCacheableGeoResult(result) {
    if (!result || typeof result !== 'object') return false;
    const countryCode = String(result.countryCode || '').trim();
    const asn = String(result.asn || '').trim();
    return Boolean(countryCode || asn);
}

/**
 * 带缓存的 IP 反查包装器（缓存 Promise 本身，天然合并并发请求）。
 * @param {string} namespace 缓存命名空间（函数名前缀）
 * @param {string} ip 原始 IP
 * @param {() => Promise<{countryCode?: string, asn?: string|number, asnName?: string}>} loader 实际的请求逻辑
 * @param {(result: any) => boolean} [isCacheable=isCacheableGeoResult] 结果有效性判定，默认沿用三元组语义
 * @returns {Promise<{countryCode?: string, asn?: string|number, asnName?: string}>}
 */
function withIpGeoCache(namespace, ip, loader, isCacheable = isCacheableGeoResult) {
    const targetIp = String(ip || '').trim();
    // 无效 IP 直接返回空对象，不进入缓存逻辑
    if (!targetIp || targetIp === '未知' || targetIp === '加载中...') return Promise.resolve({});

    const cacheKey = buildIpGeoCacheKey(namespace, targetIp);

    // 命中缓存（含 in-flight Promise）直接返回，不再发请求
    if (ipGeoCache.has(cacheKey)) {
        return ipGeoCache.get(cacheKey);
    }

    // 缓存 Promise 本身：并发同 IP 的调用会命中同一个 in-flight Promise，只发 1 个请求
    const pending = (async () => {
        try {
            const result = await loader();
            // 只缓存有效结果；拿不到则从缓存移除，下次仍可重试
            if (!isCacheable(result)) {
                ipGeoCache.delete(cacheKey);
            }
            return result;
        } catch (error) {
            // 失败时移除缓存 key，避免把失败永久缓存住
            ipGeoCache.delete(cacheKey);
            throw error;
        }
    })();

    ipGeoCache.set(cacheKey, pending);
    return pending;
}

/**
 * 通过免费接口 iplocate.io 反查指定 IP 的 国家码 / ASN / ISP 名。
 * 说明：iplocate.io 有限流，每张卡最多尝试 2 次（首次失败后间隔 ~400ms 重试 1 次）；
 *       任何失败都返回空对象，由调用方用 trace 的 loc 兜底国家码，绝不抛错阻塞卡片；
 *       同一 IP 的重复查询命中内存缓存，不再打外网。
 * @param {string} ip 需要反查的 IP（真值）
 * @returns {Promise<{countryCode?: string, asn?: string, asnName?: string}>}
 */
async function fetchIpLocateInfo(ip) {
    const targetIp = String(ip || '').trim();
    if (!targetIp || targetIp === '未知' || targetIp === '加载中...') return {};

    return withIpGeoCache('ipLocate', targetIp, async () => {
        const requestOnce = async () => {
            const response = await fetch(`https://iplocate.io/api/lookup/${encodeURIComponent(targetIp)}`);
            if (!response.ok) throw new Error(`iplocate.io HTTP ${response.status}`);

            const data = await response.json();
            const asn = data.asn || {};
            return {
                countryCode: data.country_code || '',
                asn: asn.asn || '',
                asnName: asn.name || asn.netname || ''
            };
        };

        // 最多尝试 2 次（首次失败后间隔 ~400ms 重试 1 次），仍失败则安静兜底返回 {}
        const maxAttempts = 2;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await requestOnce();
            } catch (error) {
                if (attempt < maxAttempts) {
                    console.warn(`iplocate.io 反查失败(第 ${attempt} 次)，将重试:`, error);
                    await new Promise(resolve => setTimeout(resolve, 400));
                } else {
                    console.warn('iplocate.io 反查最终失败，改用源自带国家码兜底:', error);
                }
            }
        }
        return {};
    });
}

/**
 * 通过 iplocate.io 拉取完整原始 JSON（供详情弹窗消费，经 normalizeIpLocateData 归一化）。
 * 说明：与 fetchIpLocateInfo 共用同一套内存缓存（独立命名空间 'ipLocateRaw'），
 *       同一 IP 重复点开弹窗只发 1 个请求，避免被 iplocate.io 限流；
 *       每张卡最多尝试 2 次（首次失败后间隔 ~400ms 重试 1 次），两次都失败则抛错，
 *       交由 withIpGeoCache 的 catch 清理缓存并 rethrow（失败不会被永久钉死）。
 * @param {string} ip 需要反查的 IP（真值）
 * @returns {Promise<object>} 完整的 iplocate.io 原始 JSON 对象
 */
async function fetchIpLocateRaw(ip) {
    const targetIp = String(ip || '').trim();
    if (!targetIp || targetIp === '未知' || targetIp === '加载中...') return {};

    return withIpGeoCache('ipLocateRaw', targetIp, async () => {
        const requestOnce = async () => {
            const response = await fetch(`https://iplocate.io/api/lookup/${encodeURIComponent(targetIp)}`);
            if (!response.ok) throw new Error(`iplocate.io HTTP ${response.status}`);
            return response.json();
        };

        // 最多尝试 2 次（首次失败后间隔 ~400ms 重试 1 次），仍失败则抛错
        const maxAttempts = 2;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await requestOnce();
            } catch (error) {
                if (attempt < maxAttempts) {
                    console.warn(`iplocate.io 详情反查失败(第 ${attempt} 次)，将重试:`, error);
                    await new Promise(resolve => setTimeout(resolve, 400));
                } else {
                    console.warn('iplocate.io 详情反查最终失败:', error);
                    throw error;
                }
            }
        }
        return {};
    }, isCacheableIpLocateRaw);
}

/**
 * 判断 iplocate.io 原始 JSON 是否「有效」——只有拿到非空对象才写入缓存。
 * 与 isCacheableGeoResult 不同：raw 对象的字段是 country_code + 嵌套 asn 对象，
 * 不认顶层 countryCode/asn，故单独提供一个「非空对象即有效」的判定。
 * @param {object} result iplocate.io 原始 JSON
 * @returns {boolean} 是否有效
 */
function isCacheableIpLocateRaw(result) {
    if (!result || typeof result !== 'object') return false;
    return Object.keys(result).length > 0;
}

// ============================================================
// 统一 IP 归属地查询层（ipsb 主用 → ipinfo 兜底 + 结果两级缓存）
//   目的：把各处对自有归属地接口的查询收敛到一层：
//        同一 IP 同一会话只发一次真实请求，跨会话复用浏览器缓存 24 小时。
//
//   设计要点：
//     1. 双接口主备分摊负载：api.090227.xyz/api/ipsb 与 /api/ipinfo 同时保留，
//        固定 ipsb 主用、ipinfo 兜底（不随机）。主用的「失败」判定从宽：
//        非 2xx（ipsb 被限流时常返回 500 系而非真 429）、响应解析失败、
//        或载荷缺少归属地字段，一律视为失败并切换兜底接口重试。
//     2. 缓存「最终结果」而非接口原始响应：两个接口字段结构不同（ipsb 有
//        city/isp/asn_organization，ipinfo 只有 as_name 且 asn 带 AS 前缀），
//        各接口适配器先把响应归一化为统一的「规范结果」（七字段，见下方结构注释）
//        再入缓存。消费方拿到的永远是同一种结构，与本次实际命中哪个接口无关。
//     3. 两级缓存：
//        - 内存级：Map<ip, Promise>，并发在途去重（同 IP 并发只发 1 个请求）；
//        - 浏览器级：localStorage 持久化 24 小时（key 前缀 geoQuery:v1:），
//          刷新 / 重开页面后查同一 IP 直接命中，不再打接口。
//     4. 失败不缓存：内存失败即删 key；localStorage 只在拿到有效结果时写入。
//        下次同 IP 仍可重新走主备链路重试。
//     5. 超时 / 尝试次数参数化：opts.timeoutMs / maxAttempts / retryDelayMs 由调用方
//        决定；maxAttempts 语义为「最多尝试的接口次数」（主用 1 次 + 兜底 1 次）。
//     6. 本层【永不抛错】，一律用结构化结果表达成功 / 失败，供两个适配器分别映射。
//     7. 命名空间：iplocate.io（fetchIpLocateRaw / fetchIpLocateInfo）独立查询、
//        不走本层不并入（字段结构与免费接口均不同）。
// ============================================================

/**
 * 归属地「规范结果」结构（两级缓存统一存这个形态，七个字段全部为字符串，缺失为 ''）：
 *   countryCode  2 位国家码（大写），如 'SG'
 *   country      国家全名，如 'Singapore'（ipinfo 有，作为展示兜底）
 *   city / region 城市 / 省州（ipsb 有，ipinfo 没有 → ''）
 *   isp          ISP / 运营商名（详情弹窗中作为运营商信息的兜底）
 *   asn          纯数字字符串（统一去掉 AS 前缀），如 '136510'
 *   asnOrg       ASN 组织名（与 isp 重复时渲染层自动省略，避免信息重复）
 */

/**
 * asn 归一为纯数字字符串：兼容 "AS136510" / 136510 / "136510" / 缺失 四种形态。
 * @param {any} asn 接口返回的原始 asn 字段
 * @returns {string} 纯数字字符串；缺失 / 空 → ''
 */
function normalizeGeoAsnDigits(asn) {
    if (asn === undefined || asn === null || asn === '') return '';
    return String(asn).trim().replace(/^AS/i, '');
}

/**
 * ipsb 接口响应 → 规范结果。
 * isp 取值链：isp ‖ organization ‖ asn_organization（三者按序兜底）；
 * asn_organization 单独保留——渲染层「与 ISP 重复时省略」的判定依赖两者可比较。
 * @param {any} raw ipsb 原始 JSON
 * @returns {object} 规范结果
 */
function adaptIpSbPayload(raw) {
    const d = raw && typeof raw === 'object' ? raw : {};
    const asnOrg = d.asn_organization || d.organization || d.isp || '';
    return {
        countryCode: d.country_code || '',
        country: d.country || '',
        city: d.city || '',
        region: d.region || '',
        isp: d.isp || d.organization || asnOrg,
        asn: normalizeGeoAsnDigits(d.asn),
        asnOrg: asnOrg
    };
}

/**
 * ipinfo 接口响应 → 规范结果。
 * 组织名只有 as_name 一个来源 → isp / asnOrg 同值（ASN 列小字会被渲染层省略，符合预期）；
 * 无 city / region / timezone / 经纬度等字段，不补造，一律 ''。
 * @param {any} raw ipinfo 原始 JSON
 * @returns {object} 规范结果
 */
function adaptIpInfoPayload(raw) {
    const d = raw && typeof raw === 'object' ? raw : {};
    const asName = d.as_name || '';
    return {
        countryCode: d.country_code || '',
        country: d.country || '',
        city: d.city || '',
        region: d.region || '',
        isp: asName,
        asn: normalizeGeoAsnDigits(d.asn),
        asnOrg: asName
    };
}

/**
 * 规范结果是否「有效」——七字段全空视为没查到（走失败路径，不入任何缓存）。
 * @param {object} d 规范结果
 * @returns {boolean} 是否有效
 */
function isValidGeoCanonical(d) {
    return Boolean(d && (d.countryCode || d.country || d.city || d.region || d.isp || d.asn || d.asnOrg));
}

// —— 浏览器持久缓存（localStorage，24 小时）——

/** localStorage key 前缀（v1 为结构版本号，未来字段变更时升版即可让旧缓存自然失效） */
var GEO_STORE_PREFIX = 'geoQuery:v1:';
/** 持久缓存有效期：24 小时 */
var GEO_STORE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 生成持久缓存 key。
 * @param {string} ip 规范化（trim）后的 IP
 * @returns {string} 形如 'geoQuery:v1:1.2.3.4'
 */
function buildGeoStoreKey(ip) {
    return GEO_STORE_PREFIX + ip;
}

/**
 * 读持久缓存：命中且未过期返回规范结果；过期 / 损坏 / 版本不符顺手清除并返回 null。
 * 任何异常（隐私模式禁用 localStorage 等）一律按未命中处理。
 * @param {string} ip 规范化后的 IP
 * @returns {object|null} 规范结果或 null
 */
function readGeoStore(ip) {
    try {
        var key = buildGeoStoreKey(ip);
        var raw = localStorage.getItem(key);
        if (!raw) return null;
        var entry = null;
        try {
            entry = JSON.parse(raw);
        } catch (parseError) {
            localStorage.removeItem(key);
            return null;
        }
        if (!entry || entry.v !== 1 || !entry.t || !isValidGeoCanonical(entry.d)) {
            localStorage.removeItem(key);
            return null;
        }
        if (Date.now() - entry.t > GEO_STORE_TTL_MS) {
            localStorage.removeItem(key);
            return null;
        }
        return entry.d;
    } catch (error) {
        return null;
    }
}

/**
 * 写持久缓存：仅成功结果调用。配额满 / 异常时先清一次过期项再重试，
 * 仍失败则静默放弃持久化（内存缓存与本次查询结果不受影响）。
 * @param {string} ip 规范化后的 IP
 * @param {object} canonical 规范结果
 */
function writeGeoStore(ip, canonical) {
    var key = buildGeoStoreKey(ip);
    var doWrite = function () {
        localStorage.setItem(key, JSON.stringify({ v: 1, t: Date.now(), d: canonical }));
    };
    try {
        doWrite();
    } catch (error) {
        try {
            pruneGeoStoreExpired();
            doWrite();
        } catch (retryError) { /* 持久化失败可接受，静默降级 */ }
    }
}

/**
 * 清理持久缓存中的过期 / 损坏项（写失败时的配额自救）。
 */
function pruneGeoStoreExpired() {
    try {
        var now = Date.now();
        var staleKeys = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (!k || k.indexOf(GEO_STORE_PREFIX) !== 0) continue;
            var expired = true;
            try {
                var entry = JSON.parse(localStorage.getItem(k));
                expired = !entry || !entry.t || (now - entry.t > GEO_STORE_TTL_MS);
            } catch (parseError) { expired = true; }
            if (expired) staleKeys.push(k);
        }
        staleKeys.forEach(function (k) {
            try { localStorage.removeItem(k); } catch (e) { /* 忽略 */ }
        });
    } catch (error) { /* 忽略 */ }
}

// —— 内存级规范结果缓存（Single Source of Truth）——

/** 内存缓存：key = 'geo:' + trim(ip)，value = { promise: Promise<{ok,data}|{ok,reason}>, __cachedAt } */
const geoQueryCache = new Map();

/**
 * 生成内存缓存 key。
 * @param {string} ip 规范化（trim）后的 IP
 * @returns {string} 形如 'geo:1.2.3.4'
 */
function buildGeoQueryCacheKey(ip) {
    return 'geo:' + ip;
}

/**
 * 查询 IP 归属地（ipsb 主用 → ipinfo 兜底 + 两级缓存）。
 * 查询顺序：内存缓存 → localStorage（24h）→ 网络（固定 ipsb 主用，
 * 非 2xx / 超时 / 解析失败 / 空载荷切 ipinfo 兜底）。
 * 内部统一处理：无效 IP 短路、in-flight 去重、失败不缓存、超时参数化。
 * 已知取舍：若 A、B 同时对同一 IP 发起查询，先创建 in-flight Promise 的一方决定超时，
 * 另一方 await 同一个 Promise 并继承该结果（两模块通常不同时并发，影响可忽略）。
 * @param {string} ip 原始 IP
 * @param {{timeoutMs?: number, maxAttempts?: number, retryDelayMs?: number}} [opts]
 *        timeoutMs    单次请求超时（毫秒），默认 8000
 *        maxAttempts  最多尝试的接口次数（主用 1 次 + 兜底 1 次），默认 2
 *        retryDelayMs 切换兜底接口前的间隔（毫秒），默认 400
 * @returns {Promise<{ok: true, data: object} | {ok: false, reason: 'invalid'|'network'}>}
 *        本层永不抛错：成功 `{ok:true, data}`（data 为规范结果）；失败 `{ok:false, reason}`。
 */
function fetchGeoCanonical(ip, opts = {}) {
    const options = opts || {};
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8000;
    const maxAttempts = Number.isFinite(options.maxAttempts) ? Math.max(1, options.maxAttempts) : 2;
    const retryDelayMs = Number.isFinite(options.retryDelayMs) ? options.retryDelayMs : 400;

    const targetIp = String(ip || '').trim();
    // 无效 IP 直接短路：不发请求，也不入缓存
    if (!targetIp || targetIp === '未知' || targetIp === '加载中...') {
        return Promise.resolve({ ok: false, reason: 'invalid' });
    }

    const cacheKey = buildGeoQueryCacheKey(targetIp);

    // 1) 内存缓存（含 in-flight Promise）直接返回，不再发请求
    if (geoQueryCache.has(cacheKey)) {
        return geoQueryCache.get(cacheKey).promise;
    }

    // 2) 浏览器缓存（24h）：命中则零网络请求，直接以已决 Promise 占住内存缓存
    const stored = readGeoStore(targetIp);
    if (stored) {
        const hit = Promise.resolve({ ok: true, data: stored });
        geoQueryCache.set(cacheKey, { promise: hit, __cachedAt: Date.now() });
        console.info(`[归属地] ${targetIp} 命中 24h 浏览器缓存，跳过网络请求`);
        return hit;
    }

    // 3) 网络：固定 ipsb 主用（注册表数组顺序），失败切 ipinfo 兜底。
    //    「失败」判定从宽：非 2xx（ipsb 限流时常返回 500 系而非真 429）、
    //    JSON 解析失败、空载荷 / 缺归属地字段，全部视为失败并切换兜底。
    const pending = (async () => {
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const endpoint = GEO_QUERY_ENDPOINTS[(attempt - 1) % GEO_QUERY_ENDPOINTS.length];
            try {
                const response = await fetchWithTimeout(endpoint.buildUrl(targetIp), {}, timeoutMs);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const raw = await response.json();
                const canonical = endpoint.adapt(raw);
                if (!isValidGeoCanonical(canonical)) {
                    throw new Error('响应缺少可用归属地字段');
                }
                // 成功：写入浏览器持久缓存（内部静默降级，失败不影响本次结果）
                writeGeoStore(targetIp, canonical);
                return { ok: true, data: canonical };
            } catch (error) {
                lastError = error;
                if (attempt < maxAttempts) {
                    console.warn(`[归属地] ${endpoint.name} 查询失败(第 ${attempt} 次)，切换兜底接口重试:`, error);
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                } else {
                    console.warn('[归属地] 全部接口尝试失败:', lastError);
                }
            }
        }
        // 尝试耗尽：失败标记（不写任何缓存，下次同 IP 仍可重新走主备链路重试）
        return { ok: false, reason: 'network' };
    })();

    // 占住内存缓存：并发同 IP 的调用会命中同一个 in-flight Promise，只发 1 个请求
    geoQueryCache.set(cacheKey, { promise: pending, __cachedAt: Date.now() });

    // 失败（ok:false）不进缓存：待 Promise 落定后 delete，下次可重试
    pending.then((result) => {
        if (!result || !result.ok) {
            geoQueryCache.delete(cacheKey);
        }
    }, () => {
        // 本层理论上不抛错，这里兜底清理，避免把失败永久缓存住
        geoQueryCache.delete(cacheKey);
    });

    return pending;
}

// ============================================================
// 视图适配器 1：A 套（网络状态）契约
//   返回归一化三元组 {countryCode, asn, asnName}；失败 / 空 → {}（保持初值）。
//   函数名 / 签名 / 返回结构不变 → 调用方零改动。
// ============================================================

/**
 * 通过自有归属地接口（ipsb / ipinfo 双通道，见 fetchGeoCanonical）反查指定 IP 的
 * 国家码 / ASN / ISP 名，供「国内 / 墙外」两张卡的「地址行」地址补齐。
 * 说明：数据来自共享层的「规范结果」，与本次实际命中哪个接口无关；
 *       每次查询最多尝试 2 个接口（主用失败后间隔 ~400ms 切兜底，单次超时 8s）；
 *       任何失败都返回空对象，由调用方用源自带的国家码兜底，绝不抛错阻塞卡片；
 *       同一 IP 的重复查询命中两级缓存（内存 / 24h 浏览器缓存），不再打外网。
 * @param {string} ip 需要反查的 IP（真值）
 * @returns {Promise<{countryCode?: string, asn?: string|number, asnName?: string}>}
 */
async function fetchIpSbGeoInfo(ip) {
    const r = await fetchGeoCanonical(ip, { timeoutMs: 8000, maxAttempts: 2, retryDelayMs: 400 });
    if (!r || !r.ok) return {};
    const d = r.data || {};
    // —— 三元组派生：asnOrg ‖ isp（ipsb 双值时优先取 ASN 组织名）——
    return {
        countryCode: d.countryCode || '',
        asn: d.asn || '',
        asnName: d.asnOrg || d.isp || ''
    };
}

// ============================================================
// IP 探测源竞速工具：多源并发，取最先成功者
// ============================================================

/** 单次 IP 探测请求的超时时间（毫秒） */
const NETWORK_API_TIMEOUT_MS = 8000;

/**
 * 带超时的 fetch（支持外部 AbortSignal 联合取消）。
 * 超时到点或外部 signal 触发，任一条件成立即 abort。
 * @param {string} url 请求地址
 * @param {RequestInit} options fetch 选项（可选 signal）
 * @param {number} timeoutMs 超时时间
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = NETWORK_API_TIMEOUT_MS) {
    const { signal: externalSignal, ...fetchOptions } = options || {};
    const timeoutController = new AbortController();
    let timeoutReached = false;
    let externalAbortHandler = null;

    if (externalSignal) {
        if (externalSignal.aborted) {
            timeoutController.abort();
        } else {
            externalAbortHandler = () => timeoutController.abort();
            externalSignal.addEventListener('abort', externalAbortHandler, { once: true });
        }
    }

    const timeoutId = setTimeout(() => {
        timeoutReached = true;
        timeoutController.abort();
    }, timeoutMs);

    try {
        return await fetch(url, { ...fetchOptions, signal: timeoutController.signal });
    } catch (error) {
        if (timeoutReached) {
            throw new Error(`request timeout after ${timeoutMs}ms: ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        if (externalSignal && externalAbortHandler) {
            externalSignal.removeEventListener('abort', externalAbortHandler);
        }
    }
}

/**
 * 创建 JSONP 请求。
 * 通过注入 <script> 并挂载全局回调读取 payload，支持超时与取消。
 * @param {string} url 请求地址
 * @param {string} callbackParam 回调参数名
 * @param {number} timeoutMs 超时时间
 * @returns {{promise: Promise<any>, cancel: () => void}}
 */
function createJsonpRequest(url, callbackParam, timeoutMs = NETWORK_API_TIMEOUT_MS) {
    let settled = false;
    let timeoutId = null;
    let script = null;
    let callbackScope = null;
    let callbackKey = null;
    let rejectPromise = null;

    const cleanup = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if (script && script.parentNode) {
            script.parentNode.removeChild(script);
        }
        if (callbackScope && callbackKey) {
            try {
                delete callbackScope[callbackKey];
            } catch (err) {
                callbackScope[callbackKey] = undefined;
            }
        }
    };

    const promise = new Promise((resolve, reject) => {
        rejectPromise = reject;

        const finalize = (handler, value) => {
            if (settled) return;
            settled = true;
            cleanup();
            handler(value);
        };

        const callbackPath = `window.__CF_IP_TEST_.__${Date.now()}_${Math.floor(Math.random() * 1e16)}__`;
        const callbackChain = callbackPath.replace(/^window\./, '').split('.');

        callbackScope = window;
        for (let i = 0; i < callbackChain.length - 1; i++) {
            const key = callbackChain[i];
            if (!callbackScope[key] || typeof callbackScope[key] !== 'object') {
                callbackScope[key] = {};
            }
            callbackScope = callbackScope[key];
        }
        callbackKey = callbackChain[callbackChain.length - 1];
        callbackScope[callbackKey] = payload => finalize(resolve, payload);

        const requestUrl = new URL(url);
        requestUrl.searchParams.set(callbackParam, callbackPath);
        requestUrl.searchParams.set('_t', Date.now().toString());

        script = document.createElement('script');
        script.src = requestUrl.toString();
        script.async = true;
        script.referrerPolicy = 'no-referrer';
        script.onerror = () => finalize(reject, new Error(`JSONP load failed: ${url}`));

        timeoutId = setTimeout(() => {
            finalize(reject, new Error(`JSONP timeout: ${url}`));
        }, timeoutMs);

        document.head.appendChild(script);
    });

    return {
        promise,
        cancel: () => {
            if (!settled && rejectPromise) {
                settled = true;
                cleanup();
                rejectPromise(new Error(`JSONP cancelled: ${url}`));
            } else {
                cleanup();
            }
        }
    };
}

/**
 * 从 trace 文本（key=value 逐行）中提取指定 key 的值。
 * @param {string} text trace 响应体
 * @param {string} key 目标 key（如 `ip` / `loc`）
 * @returns {string} 对应的值，缺失时返回空串
 */
function parseTraceField(text, key) {
    const match = String(text || '').match(new RegExp(`^${key}=(.+)$`, 'm'));
    return match ? match[1].trim() : '';
}

/**
 * 为单个 trace 探测源创建请求任务（解析 Cloudflare /cdn-cgi/trace 的 ip 与 loc 字段）。
 * @param {{name: string, url: string}} sourceConfig 源配置
 * @returns {{cancel: () => void, promise: Promise<{source: string, requestIp: string, providerName: string, loc: string}>}}
 */
function createTraceProbeTask(sourceConfig) {
    const controller = new AbortController();
    return {
        cancel: () => controller.abort(),
        promise: (async () => {
            const url = `${sourceConfig.url}${sourceConfig.url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
            const response = await fetchWithTimeout(url, {
                cache: 'no-store',
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`${sourceConfig.url} HTTP ${response.status}`);
            }

            const text = await response.text();
            const requestIp = parseTraceField(text, 'ip');
            if (!requestIp) {
                throw new Error(`${sourceConfig.url} missing ip field`);
            }

            return {
                source: sourceConfig.url,
                requestIp,
                providerName: sourceConfig.name,
                loc: parseTraceField(text, 'loc')
            };
        })()
    };
}

/**
 * 并发竞速多个探测源，取最先成功者。
 * @param {Array} sourceConfigs 源配置列表
 * @param {string} label 日志标签
 * @returns {Promise<object>} 最先成功的结果
 */
async function raceIpProbeSources(sourceConfigs, label) {
    if (!sourceConfigs.length) {
        throw new Error(`${label} has no sources`);
    }

    const requestTasks = sourceConfigs.map(createTraceProbeTask);

    try {
        return await Promise.any(requestTasks.map(task => task.promise));
    } finally {
        requestTasks.forEach(task => task.cancel && task.cancel());
    }
}

// ============================================================
// 国内测试：4 个「科赋锐科技」trace 源竞速
// 源与副标题名一一对应，副标题显示的就是实际跑赢的源名：
//   科赋锐科技₁ -> https://api.cloudflare-cn.com/cdn-cgi/trace
//   科赋锐科技₂ -> https://www.cf-ns.com/cdn-cgi/trace
//   科赋锐科技₃ -> https://www.cf-ns.net/cdn-cgi/trace
//   科赋锐科技₄ -> https://www.cf-ns.tech/cdn-cgi/trace
// ============================================================
async function fetchIpipData() {
    setStatus('status-ipip', 'loading');

    // 获取副标题元素，用于写入实际跑赢的源名
    const subtitleElement = document.getElementById('ipip-subtitle')
        || document.querySelector('#status-ipip').parentElement.querySelector('.title-subtitle');

    const testSources = [
        { type: 'trace', name: '科赋锐科技₁', url: 'https://api.cloudflare-cn.com/cdn-cgi/trace' },
        { type: 'trace', name: '科赋锐科技₂', url: 'https://www.cf-ns.com/cdn-cgi/trace' },
        { type: 'trace', name: '科赋锐科技₃', url: 'https://www.cf-ns.net/cdn-cgi/trace' },
        { type: 'trace', name: '科赋锐科技₄', url: 'https://www.cf-ns.tech/cdn-cgi/trace' }
    ];

    let fastestSuccess;
    try {
        fastestSuccess = await raceIpProbeSources(testSources, '国内测试 trace');
    } catch (error) {
        setNetworkFieldError('ipip-ip', '加载失败');
        clearNetworkFieldValue('ipip-country');
        applyNetworkCardFlag('ipip-country');
        setStatus('status-ipip', 'error');
        console.error('国内测试 所有 trace 源都失败:', error);
        return;
    }

    const requestIp = String(fastestSuccess.requestIp || '未知').trim() || '未知';

    // 先写入 IP（真值），并立即把副标题更新为实际跑赢的源名
    setNetworkFieldValue('ipip-ip', requestIp, 'ip');
    if (subtitleElement) {
        subtitleElement.textContent = fastestSuccess.providerName;
    }
    console.log(`[国内测试] 胜出源=${fastestSuccess.providerName} (${fastestSuccess.source}), IP=${requestIp}, trace.loc=${fastestSuccess.loc || '—'}`);

    // 地址补齐：trace 只有 loc（2 位国家码），用自有归属地接口（ipsb/ipinfo 双通道）补 ASN / ISP 名。
    // countryCode 优先用 trace 的 loc（即反查失败也至少保留 CN），绝不显示中文国家名。
    const extra = await fetchIpSbGeoInfo(requestIp);
    const locationInfo = {
        countryCode: fastestSuccess.loc || extra.countryCode || '',
        asn: extra.asn || '',
        asnName: extra.asnName || ''
    };

    const locationText = formatNetworkLocation(locationInfo);
    setNetworkFieldValue('ipip-country', locationText, 'location');
    applyNetworkCardFlag('ipip-country');
    setStatus('status-ipip', 'success');
}

// 获取国外测试数据 (EdgeOne / 漏网之鱼)
// 直接使用 https://api.cmliussss.net/api/ipinfo 响应自带的地址信息
// （ip / asn / as_name / country_code ...），不再调 api.ip.sb 反查。
async function fetchEdgeOneData() {
    setStatus('status-overseas', 'loading');
    try {
        // 添加时间戳参数避免缓存
        const timestamp = Date.now();
        const response = await fetch(`https://api.cmliussss.net/api/ipinfo?_t=${timestamp}`);
        const data = await response.json();

        // 地址直接用接口返回字段拼装：国家码 + AS号 + ISP名
        const asnFields = pickAsnFields(data);
        const locationText = formatNetworkLocation({
            countryCode: data.country_code || data.country || '',
            asn: asnFields.asn,
            asnName: asnFields.asnName
        });

        setNetworkFieldValue('overseas-ip', data.ip || '未知', 'ip');
        setNetworkFieldValue('overseas-country', locationText, 'location');
        applyNetworkCardFlag('overseas-country');
        setStatus('status-overseas', 'success');
    } catch (error) {
        setNetworkFieldError('overseas-ip', '加载失败');
        setNetworkFieldValue('overseas-country', 'API异常', 'location');
        setStatus('status-overseas', 'error');
        console.error('国外测试接口错误:', error);
    }
}

// ============================================================
// CloudFlare ProxyIP 卡片（ipv4 / ipv6 双端点 + 支持切换）
//   端点：https://ipv4.090227.xyz / https://ipv6.090227.xyz（各自 /ip.json）
//   并发用 Promise.allSettled 容错：无 IPv6 环境时 ipv6 端点失败属正常，
//   只要 v4 成功即照常工作（副标题显示单个 ProxyIPv4，不可切换）。
//   地址：直接用端点返回的 country + org 拼接，不再调 api.ip.sb。
// ============================================================

// CloudFlare ProxyIP 卡片状态（支持双出口切换）
let cloudFlareEntries = [];
let cloudFlareActiveIndex = 0;

/** 判断字符串是否为合法 IPv4 地址 */
function isValidIpv4(ip) {
    const value = String(ip || '').trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return false;
    return value.split('.').every(part => {
        if (!/^\d+$/.test(part)) return false;
        const num = Number(part);
        return num >= 0 && num <= 255;
    });
}

/** 判断字符串是否为合法 IPv6 地址（借助 URL 解析器，兼容缩写写法） */
function isValidIpv6(ip) {
    const value = String(ip || '').trim().replace(/^\[|\]$/g, '');
    if (!value || !value.includes(':')) return false;
    try {
        // 借助 URL 解析器校验 IPv6 格式，兼容缩写写法
        new URL(`http://[${value}]/`);
        return true;
    } catch {
        return false;
    }
}

/**
 * 依据 IP 文本判定版本。
 * @param {string} ip IP 文本
 * @returns {'v4'|'v6'|''} 版本标识，无法判定返回空串
 */
function detectIpVersion(ip) {
    const value = String(ip || '').trim();
    if (!value) return '';
    if (isValidIpv4(value)) return 'v4';
    if (isValidIpv6(value)) return 'v6';
    return '';
}

/** 依据版本返回副标题配色 class（v4 绿 / v6 蓝） */
function getCloudFlareProxyClass(version) {
    if (version === 'v4') return 'cf-subtitle-v4';
    if (version === 'v6') return 'cf-subtitle-v6';
    return '';
}

/**
 * 依据版本返回副标题显示名。
 * @param {string} version 版本标识
 * @param {boolean} full 是否取全名（active 用 full 名，非 active 用短名）
 * @returns {string} 显示名
 */
function getCloudFlareProxyLabel(version, full = false) {
    if (version === 'v4') return full ? 'ProxyIPv4' : 'v4';
    if (version === 'v6') return full ? 'ProxyIPv6' : 'v6';
    return full ? 'ProxyIP' : 'IP';
}

/**
 * 直接使用端点返回的 country + org 拼地址（不再调 api.ip.sb）。
 * 样例：country:"SG", org:"AS137409 GSL Networks Pty LTD - Singapore"
 *   → "SG AS137409 GSL Networks Pty LTD - Singapore"
 * @param {{country?: string, org?: string}} data 端点返回体
 * @returns {string} 地址文本，缺失时返回「未知」
 */
function formatCloudFlareLocation(data) {
    const country = String(data?.country || '').trim();
    const org = String(data?.org || '').trim();
    return `${country} ${org}`.trim() || '未知';
}

/** 还原 CF 副标题为默认「ProxyIP」并移除富文本样式 */
function resetCloudFlareSubtitle() {
    const subtitleElement = document.getElementById('cf-subtitle');
    if (!subtitleElement) return;
    subtitleElement.classList.remove('cf-subtitle-rich');
    subtitleElement.textContent = 'ProxyIP';
}

/** 渲染 CF 副标题：单出口直接显示；双出口渲染可点击切换的 span */
function renderCloudFlareSubtitle() {
    const subtitleElement = document.getElementById('cf-subtitle');
    if (!subtitleElement) return;

    if (!cloudFlareEntries.length) {
        resetCloudFlareSubtitle();
        return;
    }

    subtitleElement.classList.add('cf-subtitle-rich');

    if (cloudFlareEntries.length === 1) {
        const entry = cloudFlareEntries[0];
        subtitleElement.innerHTML = `<span class="${getCloudFlareProxyClass(entry.version)}">${getCloudFlareProxyLabel(entry.version, true)}</span>`;
        return;
    }

    cloudFlareActiveIndex = Math.min(Math.max(cloudFlareActiveIndex, 0), cloudFlareEntries.length - 1);
    const onSwitch = event => {
        event.preventDefault();
        event.stopPropagation();
        const targetIndex = Number(event.currentTarget.dataset.cfTargetIndex);
        if (!Number.isInteger(targetIndex)) return;
        if (targetIndex < 0 || targetIndex >= cloudFlareEntries.length) return;
        if (targetIndex === cloudFlareActiveIndex) return;

        cloudFlareActiveIndex = targetIndex;
        renderCloudFlareActiveEntry();
    };

    const subtitleHtml = cloudFlareEntries.map((entry, index) => {
        const entryClass = getCloudFlareProxyClass(entry.version);
        const isActive = index === cloudFlareActiveIndex;
        const label = getCloudFlareProxyLabel(entry.version, isActive);
        if (isActive) {
            return `<span class="${entryClass}">${label}</span>`;
        }

        return `<span class="${entryClass} cf-subtitle-switch" data-cf-target-index="${index}" role="button" tabindex="0">${label}</span>`;
    }).join('<span class="cf-subtitle-sep"> / </span>');

    subtitleElement.innerHTML = subtitleHtml;

    const switchElements = subtitleElement.querySelectorAll('.cf-subtitle-switch');
    switchElements.forEach(switchElement => {
        switchElement.title = '点击切换出口IP';
        switchElement.addEventListener('click', onSwitch);
        switchElement.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            onSwitch(event);
        });
    });
}

/** 渲染当前激活的 CF 出口（同步 IP / 地址 / 副标题） */
function renderCloudFlareActiveEntry() {
    if (!cloudFlareEntries.length) return;
    cloudFlareActiveIndex = Math.min(Math.max(cloudFlareActiveIndex, 0), cloudFlareEntries.length - 1);

    const activeEntry = cloudFlareEntries[cloudFlareActiveIndex];
    setNetworkFieldValue('cf-ip', activeEntry.ip, 'ip');
    setNetworkFieldValue('cf-country', activeEntry.loc || '未知', 'location');
    applyNetworkCardFlag('cf-country');
    renderCloudFlareSubtitle();
}

// 获取 CloudFlare 数据（并发请求 ipv4/ipv6 双端点，按实际返回 IP 判定类型）
async function fetchCloudFlareData() {
    setStatus('status-cf', 'loading');
    cloudFlareEntries = [];
    cloudFlareActiveIndex = 0;
    resetCloudFlareSubtitle();

    const timestamp = Date.now();
    const endpoints = [
        { url: 'https://ipv4.090227.xyz' },
        { url: 'https://ipv6.090227.xyz' }
    ];

    try {
        const requestResults = await Promise.allSettled(
            endpoints.map(async endpoint => {
                const response = await fetchWithTimeout(`${endpoint.url}/ip.json?_t=${timestamp}`, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const ip = String(data?.ip || '').trim();
                const version = detectIpVersion(ip);
                if (!ip || !version) {
                    throw new Error(`invalid ip payload: ${ip || 'empty'}`);
                }

                return {
                    ip,
                    version,
                    loc: formatCloudFlareLocation(data)
                };
            })
        );

        const availableEntries = [];
        const seenEntryKeys = new Set();

        requestResults.forEach((result, index) => {
            const endpoint = endpoints[index];
            if (result.status !== 'fulfilled') {
                const reason = result.reason?.message || String(result.reason || 'unknown error');
                console.log(`[CloudFlare] ${endpoint.url} 失败: ${reason}`);
                return;
            }

            const entry = result.value;
            if (!entry?.ip || !entry?.version) return;
            const normalizedIp = String(entry.ip || '').trim().toLowerCase();
            const dedupeKey = `${entry.version}:${normalizedIp}`;
            if (seenEntryKeys.has(dedupeKey)) {
                return;
            }
            seenEntryKeys.add(dedupeKey);
            availableEntries.push(entry);
        });

        if (!availableEntries.length) {
            throw new Error('no valid cloudflare ip from all endpoints');
        }

        const hasV4 = availableEntries.some(entry => entry.version === 'v4');
        const hasV6 = availableEntries.some(entry => entry.version === 'v6');
        if (hasV4 && hasV6) {
            availableEntries.sort((a, b) => {
                if (a.version === b.version) return 0;
                return a.version === 'v4' ? -1 : 1;
            });
        }

        cloudFlareEntries = availableEntries;
        cloudFlareActiveIndex = 0;
        renderCloudFlareActiveEntry();
        setStatus('status-cf', 'success');

        const summary = cloudFlareEntries.map(entry => `${entry.ip}(${entry.version})`).join(', ');
        console.log(`[CloudFlare] 成功: ${summary}`);
    } catch (error) {
        setNetworkFieldError('cf-ip', '加载失败');
        clearNetworkFieldValue('cf-country');
        applyNetworkCardFlag('cf-country');
        resetCloudFlareSubtitle();
        setStatus('status-cf', 'error');
        console.error('CloudFlare 接口错误:', error);
    }
}

// ============================================================
// 墙外测试：推特(X.com) / 谷歌(Google) 双源，支持点击切换
//   推特(X.com)  -> https://help.x.com/cdn-cgi/trace (trace 文本, 取 ip= 行)
//   谷歌(Google) -> https://jsonp-ip.appspot.com/  (JSONP, callback)
// 两源并发都取（不取消慢的），两个都成功时副标题渲染为可点击切换的 span；
// 默认优先展示「推特(X.com)」的 IP，点击「切换」会同步切换 IP / 地址 / tip 文案。
// ============================================================

// 墙外测试卡片状态（支持多来源切换）
let twitterEntries = [];
let twitterActiveIndex = 0;

/** 判断墙外入口返回的 IP 是否无效（空 / 0.0.0.0） */
function isInvalidOutsideEntryIp(ip) {
    const candidate = String(ip || '').trim();
    return !candidate || candidate === '0.0.0.0';
}

/** 依据入口名返回对应的品牌配色 class */
function getTwitterBrandClass(name) {
    const text = String(name || '');
    if (text.includes('Google')) return 'tw-subtitle-google';
    if (text.includes('X.com')) return 'tw-subtitle-twitter';
    return '';
}

/** 墙外入口简称（移动端紧凑副标题用）：匹配规则与 getTwitterBrandClass 平行
    （推特(X.com) -> X、谷歌(Google) -> 谷歌），其余原样返回 */
function getTwitterCompactLabel(providerName) {
    const text = String(providerName || '');
    if (text.includes('X.com')) return 'X';
    if (text.includes('Google')) return '谷歌';
    return text;
}

async function fetchTwitterData() {
    setStatus('status-twitter', 'loading');
    const statusElement = document.querySelector('#status-twitter');
    const titleElement = statusElement ? statusElement.parentElement : null;
    const tipElement = document.getElementById('twitter-tip');

    // 重绘墙外副标题（根据当前 entries 与 activeIndex 渲染双版本 span：桌面全称 / 移动简版，
    // 与 style.css 追加段「紧凑矩阵主块」的 .subtitle-full / .subtitle-compact 显隐配合）
    const renderTwitterSubtitle = () => {
        if (!titleElement) return;
        const prevIndicator = document.getElementById('status-twitter');
        const prevStatus = prevIndicator ? (prevIndicator.className.match(/status-(?!indicator)(\w+)/) || [])[1] : '';

        if (!twitterEntries.length) {
            titleElement.innerHTML = '<span class="status-indicator" id="status-twitter"></span><div class="title-text"><div class="title-main">墙外测试</div><div class="title-subtitle"><span class="subtitle-full">翻墙失败</span><span class="subtitle-compact">翻墙失败</span></div></div>';
            if (prevStatus) setStatus('status-twitter', prevStatus);
            return;
        }

        if (twitterEntries.length === 1) {
            const brandClass = getTwitterBrandClass(twitterEntries[0].providerName);
            titleElement.innerHTML = `<span class="status-indicator" id="status-twitter"></span><div class="title-text"><div class="title-main">墙外测试</div><div class="title-subtitle"><span class="subtitle-full"><span class="${brandClass}">${twitterEntries[0].providerName}</span></span><span class="subtitle-compact"><span class="${brandClass}">${getTwitterCompactLabel(twitterEntries[0].providerName)}</span></span></div></div>`;
            if (prevStatus) setStatus('status-twitter', prevStatus);
            return;
        }

        twitterActiveIndex = Math.min(Math.max(twitterActiveIndex, 0), twitterEntries.length - 1);

        const onSwitch = event => {
            event.preventDefault();
            event.stopPropagation();
            const targetIndex = Number(event.currentTarget.dataset.twTargetIndex);
            if (!Number.isInteger(targetIndex)) return;
            if (targetIndex < 0 || targetIndex >= twitterEntries.length) return;
            if (targetIndex === twitterActiveIndex) return;
            twitterActiveIndex = targetIndex;
            renderTwitterActiveEntry();
        };

        // 双版本副标题：compact=true 时用简称（X / 谷歌）；品牌配色仍按全称求取，
        // 避免简称（不含 X.com / Google 字样）导致 brandClass 失配掉色
        const buildTwitterSubtitleHtml = compact => twitterEntries.map((entry, index) => {
            const isActive = index === twitterActiveIndex;
            const label = compact ? getTwitterCompactLabel(entry.providerName) : entry.providerName;
            const brandClass = getTwitterBrandClass(entry.providerName);
            if (isActive) {
                return `<span class="${brandClass}">${label}</span>`;
            }
            return `<span class="${brandClass} cf-subtitle-switch" data-tw-target-index="${index}" role="button" tabindex="0">${label}</span>`;
        }).join('<span class="cf-subtitle-sep"> / </span>');

        titleElement.innerHTML = `<span class="status-indicator" id="status-twitter"></span><div class="title-text"><div class="title-main">墙外测试</div><div class="title-subtitle"><span class="subtitle-full">${buildTwitterSubtitleHtml(false)}</span><span class="subtitle-compact">${buildTwitterSubtitleHtml(true)}</span></div></div>`;
        if (prevStatus) setStatus('status-twitter', prevStatus);

        titleElement.querySelectorAll('.cf-subtitle-switch').forEach(el => {
            el.title = '点击切换来源';
            el.addEventListener('click', onSwitch);
            el.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                onSwitch(event);
            });
        });
    };

    // 渲染当前选中入口的 IP / 地址 / tip
    const renderTwitterActiveEntry = () => {
        if (!twitterEntries.length) return;
        twitterActiveIndex = Math.min(Math.max(twitterActiveIndex, 0), twitterEntries.length - 1);
        const activeEntry = twitterEntries[twitterActiveIndex];
        setNetworkFieldValue('twitter-ip', activeEntry.ip, 'ip');
        setNetworkFieldValue('twitter-country', activeEntry.loc || '未知', 'location');
        applyNetworkCardFlag('twitter-country');
        if (tipElement) {
            tipElement.textContent = `· 您访问 ${activeEntry.providerName} 所使用的IP`;
        }
        renderTwitterSubtitle();
    };

    const testSources = [
        {
            name: '推特(X.com)',
            createTask: () => {
                const controller = new AbortController();
                return {
                    cancel: () => controller.abort(),
                    promise: (async () => {
                        const response = await fetchWithTimeout(`https://help.x.com/cdn-cgi/trace?_t=${Date.now()}`, {
                            cache: 'no-store',
                            signal: controller.signal
                        });
                        if (!response.ok) {
                            throw new Error(`x trace HTTP ${response.status}`);
                        }
                        const text = await response.text();
                        const requestIp = parseTraceField(text, 'ip');
                        if (isInvalidOutsideEntryIp(requestIp)) {
                            throw new Error('x trace missing/invalid ip');
                        }
                        // 复用同一份 text 解析 loc（2 位国家码），供 iplocate 失败时兜底
                        return { providerName: '推特(X.com)', requestIp, loc: parseTraceField(text, 'loc') };
                    })()
                };
            }
        },
        {
            name: '谷歌(Google)',
            createTask: () => {
                const jsonpTask = createJsonpRequest(`https://jsonp-ip.appspot.com/?_t=${Date.now()}`, 'callback');
                return {
                    cancel: jsonpTask.cancel,
                    promise: jsonpTask.promise.then(payload => {
                        const requestIp = String((payload && payload.ip) || '').trim();
                        if (isInvalidOutsideEntryIp(requestIp)) {
                            throw new Error('google jsonp missing/invalid ip');
                        }
                        return { providerName: '谷歌(Google)', requestIp };
                    })
                };
            }
        }
    ];

    twitterEntries = [];
    twitterActiveIndex = 0;

    try {
        const requestTasks = testSources.map(source => {
            const task = source.createTask();
            const taskPromise = task.promise
                .then(result => ({ source: source.name, result }))
                .catch(sourceError => {
                    console.log(`[墙外测试] ${source.name} 失败: ${sourceError.message}`);
                    return { source: source.name, error: sourceError };
                });
            return { cancel: task.cancel, promise: taskPromise };
        });

        // 等所有来源完成（不取消慢的那个，因为要支持切换）
        const results = await Promise.allSettled(requestTasks.map(t => t.promise));

        const successfulResults = [];
        for (const settled of results) {
            if (settled.status === 'fulfilled' && settled.value && settled.value.result) {
                successfulResults.push(settled.value);
            }
        }

        if (!successfulResults.length) {
            throw new Error('all outside entry sources failed');
        }

        // 为每个成功的来源查询 IP 详情（真值地址：国家码 AS号 ISP名）。
        // countryCode 优先用源自带的 loc（trace 的 loc=SG，即反查失败也至少保留 SG）。
        const detailedEntries = await Promise.all(successfulResults.map(async ({ result }) => {
            const extra = await fetchIpSbGeoInfo(result.requestIp);
            return {
                providerName: result.providerName,
                ip: String(result.requestIp || '未知').trim(),
                loc: formatNetworkLocation({
                    countryCode: result.loc || extra.countryCode || '',
                    asn: extra.asn || '',
                    asnName: extra.asnName || ''
                })
            };
        }));

        twitterEntries = detailedEntries;
        twitterActiveIndex = 0;

        renderTwitterActiveEntry();
        setStatus('status-twitter', 'success');

        const summary = twitterEntries.map(e => `${e.ip}(${e.providerName})`).join(', ');
        console.log(`[墙外测试] 成功: ${summary}`);
    } catch (error) {
        setNetworkFieldError('twitter-ip', '翻墙未开启');
        clearNetworkFieldValue('twitter-country');
        applyNetworkCardFlag('twitter-country');
        if (titleElement) {
            titleElement.innerHTML = '<span class="status-indicator" id="status-twitter"></span><div class="title-text"><div class="title-main">墙外测试</div><div class="title-subtitle">翻墙失败</div></div>';
        }
        setStatus('status-twitter', 'error');
        if (tipElement) {
            tipElement.textContent = '· 您访问墙外站点所使用的IP';
        }
        console.error('墙外测试接口错误:', error);
    }
}

// ============================================================
// 网络信息隐私掩码（点击卡片可显示/隐藏真实IP与地址）
// 说明：默认脱敏显示，仅当 networkPrivacyVisible === true 时展示真值。
//       字段真值统一存放于 dataset.rawValue，掩码绝不能被用于任何请求。
// ============================================================

// 网络信息默认脱敏显示（点击卡片可显示真实值）
let networkPrivacyVisible = false;

// 需要参与掩码渲染的字段三件套配置（ip 类 / location 类）
const NETWORK_FIELD_CONFIGS = [
    { id: 'ipip-ip', type: 'ip' },
    { id: 'overseas-ip', type: 'ip' },
    { id: 'cf-ip', type: 'ip' },
    { id: 'twitter-ip', type: 'ip' },
    { id: 'ipip-country', type: 'location' },
    { id: 'overseas-country', type: 'location' },
    { id: 'cf-country', type: 'location' },
    { id: 'twitter-country', type: 'location' }
];

/**
 * 掩码 IPv4 / IPv6 地址。
 * - IPv4 四段：保留首段，其余段按原文长度替换为 *（如 113.17.152.7 -> 113.**.***.*）
 * - IPv6：保留首个冒号前片段，其余非冒号字符替为 *，支持 %zone 与 [] 包裹
 * - 兜底：长度 <= 2 全部替 *，否则保留前 2 个字符
 * @param {string} ip 原始 IP 字符串
 * @returns {string} 掩码后的字符串
 */
function maskNetworkIpValue(ip) {
    const value = String(ip || '').trim();
    if (!value || value === '未知') return value;

    if (value.includes('.') && !value.includes(':')) {
        const parts = value.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${'*'.repeat(parts[1].length)}.${'*'.repeat(parts[2].length)}.${'*'.repeat(parts[3].length)}`;
        }
    }

    if (value.includes(':')) {
        const hasBrackets = value.startsWith('[') && value.endsWith(']');
        const pureValue = hasBrackets ? value.slice(1, -1) : value;
        const [baseIp, zoneSuffix = ''] = pureValue.split('%');
        const firstColonIndex = baseIp.indexOf(':');
        if (firstColonIndex === -1) {
            return value;
        }

        const firstSegment = baseIp.slice(0, firstColonIndex);
        const remain = baseIp.slice(firstColonIndex + 1);
        const maskedRemain = remain.replace(/[^:]/g, '*');
        const maskedBase = `${firstSegment}:${maskedRemain}`;
        const maskedWithZone = zoneSuffix ? `${maskedBase}%${zoneSuffix}` : maskedBase;
        return hasBrackets ? `[${maskedWithZone}]` : maskedWithZone;
    }

    return value.length <= 2 ? '*'.repeat(Math.max(2, value.length)) : `${value.slice(0, 2)}${'*'.repeat(value.length - 2)}`;
}

/**
 * 掩码地址字段（格式：`国家码 AS号 ISP名`）。
 * 首个 token 若为纯 2 位字母（国家码，如 CN / SG）则原样大写保留，其余 token 按长度替 *。
 * @param {string} location 原始地址字符串
 * @returns {string} 掩码后的字符串
 */
function maskNetworkLocationValue(location) {
    const value = String(location || '').trim();
    if (!value || value === '未知') return value;

    const tokens = value.split(/\s+/).filter(Boolean);
    if (!tokens.length) return value;

    return tokens.map((token, index) => {
        if (index === 0 && /^[a-zA-Z]{2}$/.test(token)) {
            return token.toUpperCase();
        }
        return '*'.repeat(Math.max(2, token.length));
    }).join(' ');
}

/**
 * 停止字段上的逐字符替换动画。
 * @param {HTMLElement} fieldElement 字段元素
 */
function stopNetworkFieldAnimation(fieldElement) {
    if (!fieldElement) return;
    if (fieldElement._privacyAnimFrame) {
        cancelAnimationFrame(fieldElement._privacyAnimFrame);
        fieldElement._privacyAnimFrame = null;
    }
}

/**
 * 对字段文本执行逐字符替换动画（隐私切换时使用）。
 * @param {HTMLElement} fieldElement 字段元素
 * @param {string} targetText 目标文本
 * @param {number} durationMs 动画时长（毫秒）
 */
function animateNetworkFieldDisplay(fieldElement, targetText, durationMs = 160) {
    if (!fieldElement) return;
    stopNetworkFieldAnimation(fieldElement);

    const fromText = String(fieldElement.textContent || '');
    const toText = String(targetText || '');
    if (fromText === toText) {
        fieldElement.textContent = toText;
        return;
    }

    const maxLen = Math.max(fromText.length, toText.length);
    const fromChars = fromText.padEnd(maxLen, ' ').split('');
    const toChars = toText.padEnd(maxLen, ' ').split('');
    const diffIndexes = [];
    for (let i = 0; i < maxLen; i++) {
        if (fromChars[i] !== toChars[i]) diffIndexes.push(i);
    }

    if (!diffIndexes.length) {
        fieldElement.textContent = toText;
        return;
    }

    const startTime = performance.now();
    const frame = now => {
        const progress = Math.min((now - startTime) / durationMs, 1);
        const changedCount = Math.floor(progress * diffIndexes.length);

        const currentChars = fromChars.slice();
        for (let i = 0; i < changedCount; i++) {
            const idx = diffIndexes[i];
            currentChars[idx] = toChars[idx];
        }

        fieldElement.textContent = currentChars.join('').trimEnd();

        if (progress < 1) {
            fieldElement._privacyAnimFrame = requestAnimationFrame(frame);
        } else {
            fieldElement._privacyAnimFrame = null;
            fieldElement.textContent = toText;
        }
    };

    fieldElement._privacyAnimFrame = requestAnimationFrame(frame);
}

/**
 * 依据当前隐私开关状态渲染字段显示值。
 * - rawValue 为空则清空；displayState !== 'ready' 时跳过
 * - 掩码模式下按 maskType（'ip' / 'location'）选择掩码函数
 * @param {HTMLElement} fieldElement 字段元素
 * @param {{animate?: boolean}} options 渲染选项
 */
function renderNetworkFieldDisplay(fieldElement, options = {}) {
    if (!fieldElement) return;
    if (fieldElement.dataset.displayState !== 'ready') return;
    const { animate = false } = options;

    const rawValue = String(fieldElement.dataset.rawValue || '').trim();
    const maskType = fieldElement.dataset.maskType || 'location';

    if (!rawValue) {
        stopNetworkFieldAnimation(fieldElement);
        fieldElement.textContent = '';
        return;
    }

    let displayValue = rawValue;
    if (!networkPrivacyVisible) {
        displayValue = maskType === 'ip'
            ? maskNetworkIpValue(rawValue)
            : maskNetworkLocationValue(rawValue);
    }

    if (animate) {
        animateNetworkFieldDisplay(fieldElement, displayValue);
    } else {
        stopNetworkFieldAnimation(fieldElement);
        fieldElement.textContent = displayValue;
    }
}

/**
 * 写入字段真值并立即渲染（真值存 dataset.rawValue，绝不被掩码污染）。
 * @param {string} fieldId 字段元素 id
 * @param {string} rawValue 真值（真实 IP 或真实地址）
 * @param {'ip'|'location'} maskType 掩码类型
 */
function setNetworkFieldValue(fieldId, rawValue, maskType) {
    const fieldElement = document.getElementById(fieldId);
    if (!fieldElement) return;

    fieldElement.dataset.rawValue = String(rawValue || '').trim();
    fieldElement.dataset.maskType = maskType;
    fieldElement.dataset.displayState = 'ready';
    renderNetworkFieldDisplay(fieldElement);

    // IP 字段加载完成后立即就绪点击查询，不等待其它卡片
    if (maskType === 'ip') {
        makeIpClickable();
    }
}

/**
 * 将字段标记为错误态并渲染错误文案。
 * @param {string} fieldId 字段元素 id
 * @param {string} errorText 错误文案
 */
function setNetworkFieldError(fieldId, errorText) {
    const fieldElement = document.getElementById(fieldId);
    if (!fieldElement) return;

    stopNetworkFieldAnimation(fieldElement);
    fieldElement.dataset.rawValue = '';
    fieldElement.dataset.displayState = 'error';
    fieldElement.classList.remove('clickable', 'is-loading');
    fieldElement.removeAttribute('title');
    fieldElement.removeAttribute('aria-busy');
    fieldElement.innerHTML = `<span class="error">${errorText}</span>`;
}

/**
 * 清空字段值（置为空态）。
 * @param {string} fieldId 字段元素 id
 */
function clearNetworkFieldValue(fieldId) {
    const fieldElement = document.getElementById(fieldId);
    if (!fieldElement) return;

    stopNetworkFieldAnimation(fieldElement);
    fieldElement.dataset.rawValue = '';
    fieldElement.dataset.displayState = 'empty';
    fieldElement.classList.remove('clickable', 'is-loading');
    fieldElement.removeAttribute('title');
    fieldElement.removeAttribute('aria-busy');
    fieldElement.textContent = '';
}

/**
 * 刷新全部网络字段显示（并同步刷新 4 张卡的国旗角标）。
 * @param {boolean} animate 是否使用逐字符动画
 */
function refreshAllNetworkFieldDisplays(animate = false) {
    NETWORK_FIELD_CONFIGS.forEach(({ id }) => {
        const fieldElement = document.getElementById(id);
        renderNetworkFieldDisplay(fieldElement, { animate });
    });

    applyNetworkCardFlag('ipip-country');
    applyNetworkCardFlag('overseas-country');
    applyNetworkCardFlag('cf-country');
    applyNetworkCardFlag('twitter-country');
}

/**
 * 切换隐私开关（显示 / 隐藏真实 IP 与地址）。
 * @param {Event} event 触发事件
 */
function toggleNetworkPrivacy(event) {
    if (event) event.stopPropagation();
    networkPrivacyVisible = !networkPrivacyVisible;
    refreshAllNetworkFieldDisplays(true);
}

/**
 * 给所有网络卡片绑定「点击卡片切换隐私」事件。
 * 注意：IP 文本自身的点击查询详情优先级更高，通过 closest('.ip-text') 排除。
 */
function bindNetworkCardPrivacyToggle() {
    const cards = document.querySelectorAll('.network-cards-container .network-card');
    cards.forEach(card => {
        if (card.dataset.privacyToggleBound === '1') return;
        card.dataset.privacyToggleBound = '1';
        card.title = '点击卡片可显示/隐藏真实IP和地址';
        card.addEventListener('click', event => {
            // 点 IP 文本 = 查详情，交给 IP 自己的 handler，不切换隐私
            if (event.target.closest('.ip-text')) return;
            // 点副标题里的切换项（谷歌 / 推特）或链接不切换隐私
            if (event.target.closest('.cf-subtitle-switch') || event.target.closest('a')) return;
            // 存在文本选区（用户正在选文字）时不切换隐私
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && String(selection).trim()) return;
            toggleNetworkPrivacy(event);
        });
    });
}

/**
 * 根据卡片内国家缩写设置右下角国旗角标。
 * 从国家文本中提取 2 位字母国家码，写入 --flag-badge-url 并加 has-flag-badge class。
 * 图源：优先 flagcdn.com（全球 CDN，实测可访问）；加载失败自动回退 ipdata.co。
 * @param {string} countryElementId 国家字段元素 id
 */
function applyNetworkCardFlag(countryElementId) {
    const countryElement = document.getElementById(countryElementId);
    if (!countryElement) return;

    const networkCard = countryElement.closest('.network-card');
    if (!networkCard) return;

    const countryText = String(countryElement.dataset.rawValue || countryElement.textContent || '').trim();
    const codeMatch = countryText.match(/\b([a-zA-Z]{2})\b/);
    const countryCode = codeMatch ? codeMatch[1].toLowerCase() : '';

    if (!countryCode) {
        networkCard.classList.remove('has-flag-badge');
        networkCard.style.removeProperty('--flag-badge-url');
        return;
    }

    const primaryUrl = `https://flagcdn.com/w80/${countryCode}.png`;
    const fallbackUrl = `https://ipdata.co/flags/${countryCode}.png`;
    networkCard.style.setProperty('--flag-badge-url', `url("${primaryUrl}")`);
    networkCard.classList.add('has-flag-badge');

    // 图源可用性兜底：主图源加载失败时切到备用图源（每张卡只探测一次）
    const probeKey = `flagProbe_${countryCode}`;
    if (networkCard.dataset[probeKey] === '1') return;
    networkCard.dataset[probeKey] = '1';

    const probe = new Image();
    probe.onerror = () => {
        networkCard.style.setProperty('--flag-badge-url', `url("${fallbackUrl}")`);
    };
    probe.src = primaryUrl;
}

/**
 * 注意：墙外测试 tip 的动态化已内聚到 fetchTwitterData 内的 renderTwitterActiveEntry 中
 * （与「点击切换来源」共用同一套状态），此处不再单独绑定，避免重复逻辑。
 */

// 页面加载时自动获取网络信息
async function loadNetworkInfo() {
    if (document.querySelector('.network-cards-container')) {
        // 先绑定「点击卡片切换隐私」（默认脱敏展示）
        bindNetworkCardPrivacyToggle();

        await Promise.all([
            fetchIpipData(),
            fetchEdgeOneData(),
            fetchCloudFlareData(),
            fetchTwitterData()
        ]);

        // 所有网络信息加载完成后,使 IP 可点击
        setTimeout(() => {
            makeIpClickable();
        }, 500);
    }
}

// 页面加载时获取网络信息
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNetworkInfo);
} else {
    // DOM已经加载完成，直接执行
    loadNetworkInfo();
}

// IP 点击查询详情功能
function makeIpClickable() {
    const ipElements = document.querySelectorAll('.ip-text');

    ipElements.forEach(element => {
        // 优先使用 dataset.rawValue 中的真值（掩码仅用于展示，绝不能用于请求）
        const rawIpText = String(element.dataset.rawValue || element.textContent || '').trim();

        // 跳过已经标记为错误、加载中、未知的元素
        if (element.querySelector('.error') ||
            element.dataset.displayState === 'error' ||
            rawIpText === '加载中...' ||
            rawIpText === '未知' ||
            !rawIpText ||
            element.classList.contains('clickable')) {
            return;
        }

        // 添加可点击样式（放大镜图标由 CSS .ip-text.clickable::after 提供）
        element.classList.add('clickable');
        element.title = '点击查询IP详细信息';

        element.addEventListener('click', async function (event) {
            // 阻止冒泡，避免触发卡片的「切换隐私」逻辑
            event.stopPropagation();

            // 仅在字段就绪时允许查询
            if (this.dataset.displayState !== 'ready') {
                return;
            }

            // 移除可能存在的加载动画
            const existingSpinner = this.querySelector('.loading-spinner');
            if (existingSpinner) {
                return; // 正在加载中,不重复请求
            }

            // 始终使用真值（dataset.rawValue）发起请求，绝不发送掩码串
            const rawIp = String(this.dataset.rawValue || '').trim();

            // 跳过显示"加载中..."或"未知"的元素
            if (!rawIp || rawIp === '加载中...' || rawIp === '未知') {
                return;
            }

            // 添加加载动画
            const spinner = document.createElement('span');
            spinner.className = 'loading-spinner';
            this.appendChild(spinner);

            try {
                // 走内存缓存（同一 IP 重复点开只打一次 iplocate.io，避免限流）
                const raw = await fetchIpLocateRaw(rawIp);

                // 归一化 iplocate.io 响应为弹窗消费的标准结构
                const data = normalizeIpLocateData(raw);

                // 移除加载动画
                spinner.remove();

                // 显示详情弹窗
                showIpDetailModal(data);

            } catch (error) {
                // 移除加载动画
                spinner.remove();

                // 显示错误提示
                showToast('❌ 查询IP详细信息失败');
                console.error('IP查询错误:', error);
            }
        });
    });
}

// 归一化 iplocate.io 响应 -> showIpDetailModal 消费的标准结构
// 说明：iplocate.io 不提供 abuser_score / is_mobile / is_crawler，
// 相关字段以 undefined 返回，由弹窗渲染为「未提供」。
function normalizeIpLocateData(raw) {
    const source = raw || {};
    const asn = source.asn || {};
    const company = source.company || {};
    const hosting = source.hosting || {};
    const privacy = source.privacy || {};

    // 归一化 ASN 编号：iplocate.io 已是 "AS15169" 形式，
    // 这里统一去掉前缀避免渲染为 ASAS15169
    const rawAsnNumber = asn.asn || '';
    const asnNumber = typeof rawAsnNumber === 'string'
        ? rawAsnNumber.replace(/^AS/i, '')
        : rawAsnNumber;

    return {
        ip: source.ip,
        rir: asn.rir,
        // 运营商信息（network 优先取 hosting.network，兜底 asn.route）
        company: {
            name: company.name,
            domain: company.domain,
            type: company.type,
            network: hosting.network || asn.route
        },
        // ASN 信息（org 使用 ASN 名称）
        asn: {
            asn: asnNumber,
            org: asn.name,
            route: asn.route,
            type: asn.type,
            country: asn.country_code
        },
        // 位置信息
        location: {
            country: source.country,
            country_code: source.country_code,
            state: source.subdivision,
            city: source.city,
            zip: source.postal_code,
            latitude: source.latitude,
            longitude: source.longitude,
            timezone: source.time_zone,
            is_eu_member: source.is_eu
        },
        // 滥用联系信息
        abuse: source.abuse,
        // 安全标志
        is_proxy: privacy.is_proxy,
        is_vpn: privacy.is_vpn,
        is_tor: privacy.is_tor,
        is_abuser: privacy.is_abuser,
        is_bogon: privacy.is_bogon,
        is_satellite: source.is_satellite,
        // is_hosting -> 数据中心
        is_datacenter: privacy.is_hosting,
        // iplocate.io 不提供以下字段，显式置为 undefined 以渲染「未提供」
        is_mobile: undefined,
        is_crawler: undefined
    };
}

// 将布尔值转换为 emoji
function boolToEmoji(value, trueEmoji = '✅', falseEmoji = '❌') {
    return value ? trueEmoji : falseEmoji;
}

// 三态布尔渲染：true / false / 未提供（undefined 或 null）
function formatBoolFlag(value, trueHTML, falseHTML) {
    if (value === undefined || value === null) {
        return '<span class="ip-type-unknown">未提供</span>';
    }
    return value ? trueHTML : falseHTML;
}

// 将 IP 类型转换为中文并添加样式
function formatIpType(type) {
    if (!type) return '<span class="ip-type-unknown">未知</span>';

    const typeMap = {
        'isp': { text: '住宅', class: 'ip-type-residential' },
        'hosting': { text: '机房', class: 'ip-type-hosting' },
        'business': { text: '商用', class: 'ip-type-business' }
    };

    // fallback 分支的 type 来自接口原始数据，必须转义后再插入 HTML；
    // typeMap 已命中的受控中文文本无需转义，保持原样
    const typeInfo = typeMap[type.toLowerCase()] || { text: escapeHtml(type), class: 'ip-type-unknown' };
    return `<span class="${typeInfo.class}">${typeInfo.text}</span>`;
}

// 获取威胁等级的样式类
function getThreatBadgeClass(score) {
    if (!score) return 'badge-info';

    const numScore = parseFloat(score);
    if (numScore < 0.001) return 'badge-success';
    if (numScore < 0.01) return 'badge-info';
    if (numScore < 0.1) return 'badge-warning';
    return 'badge-danger';
}

// 计算综合滥用评分（基于隐私标志的启发式评分）
// 说明：iplocate.io 不提供 abuser_score 字段，故不再伪造数值。
// 此处依据隐私标志的数量给出一个风险百分比：
//   每命中一个风险项（代理/VPN/Tor/滥用IP/虚假IP/爬虫/数据中心）计 15%，
//   封顶 100%。若一个风险项都未命中，则返回 0（极度纯净）。
function calculateAbuseScore(securityFlags = {}) {
    const riskFlags = [
        securityFlags.is_crawler,   // 爬虫
        securityFlags.is_proxy,     // 代理服务器
        securityFlags.is_vpn,       // VPN
        securityFlags.is_tor,       // Tor 网络
        securityFlags.is_abuser,    // 滥用 IP
        securityFlags.is_bogon,     // 虚假 IP
        securityFlags.is_datacenter // 数据中心
    ];

    // 统计为 true 的风险项数量
    const riskCount = riskFlags.filter(flag => flag === true).length;

    // 每个风险项 15%，封顶 100%
    const finalScore = Math.min(riskCount * 0.15, 1);

    return finalScore;
}

// 风险项清单（单一数据源）：驱动评分计算、安全矩阵小格、算法说明气泡三处，
// 保证「气泡里列出的项」与「矩阵里判定/计分的项」永远同源、不漂移
const IP_RISK_FLAGS = [
    { key: 'is_crawler',    label: '爬虫',      name: '爬虫 (Crawler)' },
    { key: 'is_proxy',      label: '代理',      name: '代理 (Proxy)' },
    { key: 'is_vpn',        label: 'VPN',       name: 'VPN' },
    { key: 'is_tor',        label: 'Tor 网络',  name: 'Tor 网络' },
    { key: 'is_abuser',     label: '滥用 IP',   name: '滥用 IP (Abuser)' },
    { key: 'is_bogon',      label: '虚假 IP',   name: '虚假 IP (Bogon)' },
    { key: 'is_datacenter', label: '数据中心',  name: '数据中心 (Hosting)' }
];

// 风险项总数：评分公式与安全矩阵分母共用，避免两处魔数各写各的
const IP_RISK_FLAG_COUNT = IP_RISK_FLAGS.length;

// 风险项图标：与 IP_RISK_FLAGS 的 key 一一对应，供安全矩阵小格复用
const IP_RISK_FLAG_ICONS = {
    is_crawler: '🤖',
    is_proxy: '⚠️',
    is_vpn: '🔒',
    is_tor: '🧅',
    is_abuser: '🚫',
    is_bogon: '❓',
    is_datacenter: '🏢'
};

// 由命中数量推导刻度尺档位（纯函数，1~5）
// ⚠️ 必须与 getAbuseScoreBadgeClass 使用**同一套百分比分段**：
//    评分是「命中数 × 15%」，档位边界落在 0.25 / 5 / 20 / 100 上。
//    曾尝试改用 floor(hitCount) 以求「同源」，但那会让 1 个命中（15%）的
//    刻度尺落在第 1 段、徽章却是 elevated，反而制造出不一致（实测 5/8 档错配）。
//    故仍以百分比为准绳，保证刻度尺与徽章永远同档。
function getRiskTierByHitCount(hitCount) {
    if (typeof hitCount !== 'number' || hitCount <= 0) return 1;
    return getRiskTier(Math.min(hitCount, 100 / 15) * 15);
}

// 获取滥用评分的颜色等级
function getAbuseScoreBadgeClass(percentage) {
    if (percentage === null || percentage === undefined) return 'badge-info';

    if (percentage >= 100) return 'badge-critical';      // 危险红色 >= 100%
    if (percentage >= 20) return 'badge-high';           // 橘黄色 15-99.99%
    if (percentage >= 5) return 'badge-elevated';     // 黄色 5-14.99%
    if (percentage >= 0.25) return 'badge-low';          // 淡绿色 0.25-4.99%
    return 'badge-verylow';                              // 绿色 < 0.25%
}

// 格式化滥用评分为百分比
function formatAbuseScorePercentage(score) {
    if (score === null || score === undefined) return '未知';

    const percentage = score * 100;
    return percentage.toFixed(2) + '%';
}

// 判定安全检测小格的语义态类名（纯函数，便于复用与测试）
// raw 为原始三态值：true | false | undefined | null | '未提供'
// 返回：
//   'is-hit'  命中风险（true，红）
//   'is-clean' 安全（false，绿）
//   'is-soft'  未提供（灰）
//   'is-note'  中性提示（预留，黄）
// 注意：判定必须落在原始值上 —— isMissingValue(false) === false，
// 「数据中心: 否」等 false 值正常渲染为 is-clean。
function getFlagTileClass(raw) {
    if (raw === true) return 'is-hit';
    if (raw === false) return 'is-clean';
    if (raw === '未提供' || raw === undefined || raw === null) return 'is-soft';
    // 其余非布尔真值（理论不会出现）按中性提示处理
    return 'is-note';
}

// 由风险百分比（0~100）推导刻度尺命中档位（1~5，纯函数）
// 高于当前档位的色段加 .dim（opacity:0.16），当前档位及以下维持满色
function getRiskTier(scorePercentage) {
    if (scorePercentage === null || scorePercentage === undefined) return 1;

    if (scorePercentage >= 100) return 5;
    if (scorePercentage >= 20) return 4;
    if (scorePercentage >= 5) return 3;
    if (scorePercentage >= 0.25) return 2;
    return 1;
}

// 切换评分算法说明气泡
function toggleScoreTooltip(helpIcon) {
    const tooltip = helpIcon.nextElementSibling;
    const isShowing = tooltip.classList.contains('show');

    // 隐藏所有其他气泡
    document.querySelectorAll('.score-tooltip.show').forEach(t => {
        if (t !== tooltip) t.classList.remove('show');
    });

    // 切换当前气泡
    tooltip.classList.toggle('show');

    // 如果显示气泡，添加点击事件监听器来关闭它
    if (!isShowing) {
        setTimeout(() => {
            const closeTooltip = (e) => {
                if (!tooltip.contains(e.target) && !helpIcon.contains(e.target)) {
                    tooltip.classList.remove('show');
                    document.removeEventListener('click', closeTooltip);
                }
            };
            document.addEventListener('click', closeTooltip);
        }, 100);
    }
}

// ==================== IP 详情弹窗：工具与地图模块 ====================

// 集中判断「缺失值」：null / undefined / '未提供' 一律视为缺失（用于隐藏整行）
function isMissingValue(value) {
    return value === null || value === undefined || value === '未提供';
}

// HTML 转义：弹窗内所有接口数据插值必须经过此函数，
// 防止数据中携带的 & < > " ' 破坏 HTML 结构或注入标签
function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(
        /[&<>"']/g,
        function (ch) {
            switch (ch) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                default: return '&#39;'; // 剩余分支只可能是单引号
            }
        }
    );
}

// Leaflet 版本与 CDN 地址（仅当弹窗带坐标时才懒加载注入）
const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@' + LEAFLET_VERSION + '/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@' + LEAFLET_VERSION + '/dist/leaflet.js';

// 地图瓦片源：按 IP 所在国家二选一。
//
// ⚠️ 这里修的是一个长期存在的真 Bug（表现为「地图一片空白、要手动缩放才出来」）：
//    高德栅格瓦片（webrd01-04）**只覆盖中国大陆**。境外坐标请求时，
//    高德会返回 HTTP 200 + 一张 179 字节的空白 PNG —— 状态码正常、图片也「加载成功」，
//    于是 Leaflet 把瓦片标记为 loaded，实际画出来却是一片空白。
//    实测：新加坡瓦片 179 字节（空），北京瓦片 19152 字节（有内容）。
//    也就是说，只要 IP 在境外就必然白图，与缩放级别无关。
//
// 策略：中国大陆用高德（国内访问快、中文标注），境外用海外底图。
//
// ⚠️ 境外底图的坑比想象中多，实测（同一网络下多次采样）：
//   - tile.openstreetmap.org / a.tile.…  : 直接超时不可达（国内常见）
//   - a.basemaps.cartocdn.com            : 超时不可达
//   - basemaps.cartocdn.com              : 可返回，但只有 ~2KB，内容可疑
//   - tile.openstreetmap.de              : 40KB，约 1.2s，稳定可用
//   - server.arcgisonline.com (ArcGIS)   : 41KB，约 0.35s，最快且稳定
// 因此境外**不再使用 tile.openstreetmap.org**，改为按可靠性排序的多源回退：
//   ArcGIS → OSM.de → Carto
// 任一源加载失败（tileerror）就自动切下一个，避免"某个海外 CDN 挂了就整片空白"。
//
// 另外高德的"卫星图"(webst)在境外同样是空白占位（恒为 4235 字节），
// 不能拿它当境外兜底。
//
// 注意：高德为 GCJ-02 坐标系，与 WGS-84 存在数百米偏移；IP 定位仅到城市级，
// 该偏移在弹窗场景下可忽略，不做纠偏。
const IP_DETAIL_MAP_TILE_AMAP = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

// 境外底图候选（按优先级排列；subdomains 为 '' 表示无需子域）
const IP_DETAIL_MAP_OVERSEAS_SOURCES = [
    {
        name: 'arcgis',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> · Maxar · OpenStreetMap',
        subdomains: '',
        maxZoom: 19
    },
    {
        name: 'osm-de',
        url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: '',
        maxZoom: 19
    },
    {
        name: 'carto',
        url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: '',
        maxZoom: 19
    }
];

// 兼容旧引用：默认指向高德
const IP_DETAIL_MAP_TILE_URL = IP_DETAIL_MAP_TILE_AMAP;
const IP_DETAIL_MAP_TILE_ATTRIBUTION = '&copy; <a href="https://www.amap.com/">高德地图</a>';

// 判定坐标是否落在中国大陆（含港澳台）境内，用于选择瓦片源（纯函数）
// 采用宽松包围盒即可：宁可多判给高德（境外空白会被错误兜底捕获），
// 也不要把大陆坐标误判给海外源 —— 后者在国内访问慢，体验下降更明显。
function isCoordinateInChina(latitude, longitude) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
    // 纬度 18~54、经度 73~135 覆盖中国大陆全境
    return latitude >= 18 && latitude <= 54 && longitude >= 73 && longitude <= 135;
}

// 依坐标挑选瓦片源配置（纯函数，便于单测）
// 返回带 fallbacks 数组：主源加载失败时按序切换
function pickTileSource(latitude, longitude) {
    if (isCoordinateInChina(latitude, longitude)) {
        return {
            url: IP_DETAIL_MAP_TILE_AMAP,
            attribution: IP_DETAIL_MAP_TILE_ATTRIBUTION,
            subdomains: ['1', '2', '3', '4'],
            maxZoom: 18,
            name: 'amap',
            // 高德空白图不会触发 tileerror，但近海边界可能真失败，兜底走境外首个源
            fallbacks: [IP_DETAIL_MAP_OVERSEAS_SOURCES[0]]
        };
    }
    const first = IP_DETAIL_MAP_OVERSEAS_SOURCES[0];
    return {
        url: first.url,
        attribution: first.attribution,
        subdomains: first.subdomains,
        maxZoom: first.maxZoom,
        name: first.name,
        fallbacks: IP_DETAIL_MAP_OVERSEAS_SOURCES.slice(1)
    };
}

// Leaflet 注入缓存（同一页面只注入一次；失败后清空以便下次打开重试）
let ipDetailLeafletPromise = null;

// 懒加载 Leaflet（CSS + JS），promise 化，重复调用复用同一次注入
function ensureLeafletLoaded() {
    if (window.L) {
        return Promise.resolve();
    }
    if (ipDetailLeafletPromise) {
        return ipDetailLeafletPromise;
    }

    ipDetailLeafletPromise = new Promise(function (resolve, reject) {
        // 注入 CSS
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = LEAFLET_CSS_URL;
        css.onerror = function () {
            reject(new Error('Leaflet CSS 加载失败'));
        };
        document.head.appendChild(css);

        // 注入 JS
        const script = document.createElement('script');
        script.src = LEAFLET_JS_URL;
        script.async = true;
        script.onload = function () {
            if (window.L) {
                resolve();
            } else {
                reject(new Error('Leaflet 加载异常：全局对象 L 不存在'));
            }
        };
        script.onerror = function () {
            reject(new Error('Leaflet JS 加载失败'));
        };
        document.head.appendChild(script);
    });

    // 失败时清空缓存，下次打开弹窗可重试
    ipDetailLeafletPromise.catch(function () {
        ipDetailLeafletPromise = null;
    });

    return ipDetailLeafletPromise;
}

// 弹窗内地图默认缩放级别。
// 说明：调用方是在 appendChild 的同一帧内初始化的，此时弹窗刚插入、尚未布局，
// Leaflet 会把此刻读到的容器尺寸（含未布局时的近似值）缓存下来当作 canvas 大小；
// 该缓存偏小，导致首次渲染时瓦片窗格被判定为「视口外」而不去请求图片，
// 表现为默认瓦片空白、必须点一次缩放按钮（或拖拽）才加载出来。
// 因此这里不依赖「打开后 150ms 补一次 invalidateSize」的时序赌注，
// 而是等布局真正稳定后初始化 + 显式 invalidateSize + redraw，从根上消除该问题。
const IP_DETAIL_MAP_DEFAULT_ZOOM = 4;
// 高德瓦片最小缩放级别（z=3 及以下无返回），作为兜底夹取
const IP_DETAIL_MAP_MIN_ZOOM = 3;

// 依据容器实际像素尺寸挑选初始缩放级别（纯函数，便于单测）
// 目的：让「国家/城市级」的 IP 定位在弹窗里落在合适视野 ——
// 旧值固定 10 级，在 373px 宽的小地图上视野约 57km，标注点会几乎贴着边缘、
// 看不出城市轮廓；而 IP 定位本身只有城市级精度，放太近也没有意义。
// 推导：Web Mercator 下 1 级相差 2 倍，于是
//   metersPerPixel(z) = 156543.03392 * cos(lat) / 2^z
// 令「容器宽度 × 每像素米数」约等于目标视野跨度 TARGET_SPAN_METERS，反解 z。
function pickInitialZoom(latitude, longitude, size) {
    const width = (size && size.width) || 0;
    if (!width) return IP_DETAIL_MAP_DEFAULT_ZOOM;

    // 目标视野跨度（米）：约 20km ——
    // 这一档能同时看到城市主体、海岸线与周边路网，既不至于把 IP 缩成一个点，
    // 也不会因为视野过小而看不出位置关系。IP 定位精度仅到城市级，
    // 比这更细的视图除了好看并无信息量。
    const TARGET_SPAN_METERS = 20000;
    const metersPerPixelAtZoom0 = 156543.03392 * Math.cos((latitude * Math.PI) / 180);
    const idealZoom = Math.log2((metersPerPixelAtZoom0 * width) / TARGET_SPAN_METERS);

    const clamped = Math.round(idealZoom);
    return Math.min(18, Math.max(IP_DETAIL_MAP_MIN_ZOOM, clamped));
}

// 初始化弹窗内地图：高德瓦片单一图层，暗色主题经 CSS 滤镜反色实现，返回资源清理函数
function initIpDetailMap(container, latitude, longitude, ip) {
    let map = null;
    let tileLayer = null;
    let themeObserver = null;
    let sizeObserver = null;
    let sizeFixTimer = null;
    let disposed = false;

    // 判断当前是否为暗色主题
    function isDarkTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // 暗色适配：切换容器上的 ip-detail-map-dark 类，由 CSS 对 .leaflet-tile-pane
    // 做反色滤镜（marker/popup 在其他窗格，不受滤镜影响）
    function applyThemeClass() {
        container.classList.toggle('ip-detail-map-dark', isDarkTheme());
    }

    // 同步按当前主题定类：Leaflet 异步加载完成前类已就位，避免亮色瓦片闪现
    applyThemeClass();

    // popup 内容用纯 DOM 构建（IP 来自接口数据，避免拼 HTML 字符串）
    function buildPopupContent() {
        const box = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = ip;
        box.appendChild(name);
        box.appendChild(document.createElement('br'));
        box.appendChild(document.createTextNode(latitude + ', ' + longitude));
        return box;
    }

    ensureLeafletLoaded().then(function () {
        // 弹窗在加载完成前已被关闭则直接放弃
        if (disposed || !container.isConnected) {
            return;
        }
        container.innerHTML = ''; // 移除「加载中」占位

        // 先量一次真实容器尺寸，作为初始缩放的自适应输入
        const initialSize = {
            width: container.clientWidth,
            height: container.clientHeight
        };
        const initialZoom = pickInitialZoom(latitude, longitude, initialSize);

        map = L.map(container, {
            // 弹窗自身需要滚动，禁用滚轮缩放避免滚动冲突；保留拖拽与按钮缩放
            scrollWheelZoom: false,
            zoomControl: true,
            minZoom: IP_DETAIL_MAP_MIN_ZOOM,
            maxZoom: 18,
            // 瓦片加载失败（网络/被墙）时给淡出留出余地，避免空白硬闪
            fadeAnimation: true
        }).setView([latitude, longitude], initialZoom);

        // 瓦片源按坐标所在区域选择：大陆用高德，境外用海外底图（多源回退）。
        // 高德在境外只返回 179 字节空白图（详见常量定义处的说明），必须在源头分流。
        const tileSource = pickTileSource(latitude, longitude);

        // 加载失败时按 fallbacks 顺序切换的游标
        const queue = [tileSource].concat(tileSource.fallbacks || []);
        let queueIndex = 0;

        function applyTileSource(src) {
            if (disposed || !map) return;
            if (tileLayer) map.removeLayer(tileLayer);
            const opts = {
                attribution: src.attribution,
                maxZoom: src.maxZoom
            };
            // subdomains 为空字符串时不要传给 Leaflet（会被当成单字符集）
            if (src.subdomains) opts.subdomains = src.subdomains;
            tileLayer = L.tileLayer(src.url, opts);
            tileLayer.addTo(map);

            // 失败即切下一个源；全部用尽则静默（保留底图色块，不影响其余功能）
            tileLayer.on('tileerror', function () {
                if (disposed) return;
                queueIndex += 1;
                if (queueIndex < queue.length) {
                    applyTileSource(queue[queueIndex]);
                }
            });
        }

        applyTileSource(tileSource);

        // 标记点默认不弹气泡：地图本身不高，而气泡连同顶部留白
        // 要占掉近 1/3 的画面，正好压在标注点上方 —— 这正是用户反馈的
        // 「图层太高、遮挡内容」。改为把 IP 与坐标写进悬停提示，
        // 信息不丢，默认视图也不再被挡住。
        const marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup(buildPopupContent());
        marker.bindTooltip(ip + ' · ' + latitude + ', ' + longitude, {
            direction: 'top',
            offset: [0, -12],
            opacity: 1,
            // 关键：显式关闭粘滞，纯悬停触发，鼠标移开即收起
            sticky: false,
            permanent: false
        });

        // 尺寸校正必须在图层就绪后立即执行一次：
        // 早前实测发现，弹窗的 ipSlideUp 动画（0.3s）往往在 Leaflet 懒加载完成
        // 之前就结束了，容器尺寸此后不再变化 —— 若把希望全押在 ResizeObserver 上，
        // 它会因为「没有后续变化」而一次都不触发，问题照旧。
        // 因此这里：先无条件校正一次，再用 observer 兜住后续的尺寸变化。
        applyMapSize();
        observeMapSize();

        // 主题同步：手动切换按钮与系统偏好变化最终都落在 data-theme 属性上，
        // 因此只监听 documentElement 的属性变化即可同时覆盖两条路径；
        // 回调只需 toggle 容器类，反色由 CSS 滤镜生效，无需重建图层
        themeObserver = new MutationObserver(applyThemeClass);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }).catch(function () {
        // 加载失败：容器内显示降级文案
        if (!disposed && container.isConnected) {
            container.innerHTML = '<div class="ip-detail-map-fallback">🗺️ 地图加载失败，请检查网络</div>';
        }
    });

    // 立即按当前容器尺寸校正地图布局。
    // 必须无条件执行一次 —— 见调用处的说明：动画往往早于 Leaflet 就绪结束，
    // 只靠 observer 会一步都不触发。
    function applyMapSize() {
        if (!map || disposed || !container.isConnected) return;
        map.invalidateSize(false);
    }

    // 持续观测容器尺寸：窗口 resize、内容重排等后续变化都能被兜住。
    // 相比定时器，不依赖「动画多久结束」的假设；尺寸稳定后自动静默。
    function observeMapSize() {
        if (!map || disposed) return;

        if (typeof ResizeObserver !== 'function') {
            // 降级：环境不支持时补两次定时校正，覆盖动画尾段
            [0, 320].forEach(function (delay) {
                sizeFixTimer = setTimeout(function () {
                    if (map && !disposed) map.invalidateSize();
                }, delay);
            });
            return;
        }

        let lastW = container.clientWidth;
        let lastH = container.clientHeight;
        sizeObserver = new ResizeObserver(function () {
            if (disposed || !container.isConnected) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            // 仅在尺寸真的变化时重算，避免回调自激
            if (w === lastW && h === lastH) return;
            lastW = w;
            lastH = h;
            map.invalidateSize(false);
        });
        sizeObserver.observe(container);
    }

    // 清理函数：弹窗所有关闭路径（× / 背景 / ESC）都会调用
    return function disposeIpDetailMap() {
        disposed = true;
        if (sizeObserver) {
            sizeObserver.disconnect();
            sizeObserver = null;
        }
        if (sizeFixTimer) {
            clearTimeout(sizeFixTimer);
            sizeFixTimer = null;
        }
        if (themeObserver) {
            themeObserver.disconnect();
            themeObserver = null;
        }
        if (map) {
            map.remove();
            map = null;
        }
        tileLayer = null;
    };
}

// 显示 IP 详情弹窗
function showIpDetailModal(data) {
    // 创建弹窗（无障碍：对话框语义，标题由头部眉标 #ipDetailTitle 承载）
    const modal = document.createElement('div');
    modal.className = 'ip-detail-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'ipDetailTitle');

    // 计算综合滥用评分（风控值）：iplocate.io 无 abuser_score，改由隐私标志启发式计算
    // 收集安全风险标志（键名与 IP_RISK_FLAGS 对齐，供评分/矩阵/气泡三处共用）
    const securityFlags = {};
    IP_RISK_FLAGS.forEach(function (flag) {
        securityFlags[flag.key] = data[flag.key];
    });

    const combinedScore = calculateAbuseScore(securityFlags);

    // 命中数量：评分、刻度尺档位、安全矩阵分母都由它统一推导，三处口径必然一致
    const securityHitCount = IP_RISK_FLAGS.filter(function (flag) {
        return securityFlags[flag.key] === true;
    }).length;

    // 由 combinedScore 派生的展示值（供头部风险条复用，不重复计算）
    const hasScore = !isMissingValue(combinedScore);
    const scorePercentage = hasScore ? combinedScore * 100 : 0;
    const badgeClass = hasScore ? getAbuseScoreBadgeClass(scorePercentage) : 'badge-info';
    const formattedScore = formatAbuseScorePercentage(combinedScore);

    // 刻度尺档位由「命中数量」推导：
    // 之前用 scorePercentage 走浮点边界（>=5 / >=0.25），而徽章又用另一套边界，
    // 两处口径分裂，极易出现「徽章说轻微风险、刻度尺却只亮 1 段」的错配。
    // 现在二者同源于 securityHitCount，数学上不可能不一致。
    const riskTier = getRiskTierByHitCount(securityHitCount);

    // 根据百分比确定风险等级文本
    let riskLevel = '';
    if (scorePercentage >= 100) riskLevel = '极度危险';
    else if (scorePercentage >= 20) riskLevel = '高风险';
    else if (scorePercentage >= 5) riskLevel = '轻微风险';
    else if (scorePercentage >= 0.25) riskLevel = '纯净';
    else riskLevel = '极度纯净';

    // 头部风险条：徽章 + 5 段刻度尺
    // 高于命中档位的色段加 .dim（opacity:0.16），命中档位及以下维持满色
    let riskTrackHTML = '';
    for (let i = 1; i <= 5; i++) {
        riskTrackHTML += `<i class="${i > riskTier ? 'dim' : ''}"></i>`;
    }
    const riskBarHTML = hasScore ? `
        <span class="ip-detail-badge ${badgeClass}">${formattedScore} ${riskLevel}</span>
        <div class="ip-risk-meter" aria-hidden="true">
            <div class="ip-risk-track">
                ${riskTrackHTML}
            </div>
        </div>
    ` : '';

    // 头部摘要行取值（全部来自现有字段，缺失项跳过）
    // 位置：国家 + 省份州 + 城市 拼接
    const locParts = [];
    if (!isMissingValue(data.location?.country)) locParts.push(escapeHtml(data.location.country));
    if (!isMissingValue(data.location?.state)) locParts.push(escapeHtml(data.location.state));
    if (!isMissingValue(data.location?.city)) locParts.push(escapeHtml(data.location.city));
    const locationText = locParts.join(' ');

    // ASN：AS<编号> <组织>
    const asnIdPart = !isMissingValue(data.asn?.asn) ? 'AS' + escapeHtml(String(data.asn.asn)) : '';
    const asnOrgPart = !isMissingValue(data.asn?.org) ? escapeHtml(data.asn.org) : '';
    const asnText = [asnIdPart, asnOrgPart].filter(Boolean).join(' ');

    // 注册机构
    const rirText = !isMissingValue(data.rir) ? escapeHtml(data.rir) : '';

    // 运营商 / ASN 类型（合并为一项；formatIpType 返回值本身已是 HTML，不再 escape）
    const typeSepHTML = '<span class="type-sep">/</span>';
    const typeText = formatIpType(data.company?.type) + typeSepHTML + formatIpType(data.asn?.type);

    const metaItem = (key, valHTML) => valHTML ? `
        <span class="meta-item">
            <span class="meta-key">${key}</span>
            <span class="meta-val">${valHTML}</span>
        </span>
    ` : '';

    // 数据来源：仅写入复制按钮的 title / aria-label，不在摘要行/标题行占位
    const dataSource = 'iplocate.io';
    const copyTitle = '点击复制该 IP ｜ 数据来源: ' + dataSource;
    const copyAriaLabel = '复制 IP ' + (data.ip || '') + '（数据来源 ' + dataSource + '）';

    // 头部：渐变英雄区 + 眉标 + 大号等宽 IP（复制）+ 摘要行 + 风险条
    const headHTML = `
        <div class="ip-detail-head">
            <div class="ip-head-top">
                <div style="min-width:0">
                    <span class="ip-head-eyebrow" id="ipDetailTitle">
                        <span class="live-dot" aria-hidden="true"></span>IP 详细信息
                    </span>
                    <button type="button" class="ip-detail-copy-btn" data-copy="${escapeHtml(data.ip || '')}" title="${escapeHtml(copyTitle)}" aria-label="${escapeHtml(copyAriaLabel)}">
                        ${escapeHtml(data.ip) || '未知'}
                        <span class="ip-copy-chip" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                            </svg>
                        </span>
                        <span class="ip-detail-copy-icon" aria-hidden="true">📋</span>
                    </button>
                    <div class="ip-head-meta ip-head-meta--inline">
                        ${metaItem('位置', locationText)}
                        ${metaItem('ASN', asnText)}
                        ${metaItem('注册机构', rirText)}
                        ${metaItem('运营商 / ASN 类型', typeText)}
                    </div>
                </div>
                <button type="button" class="ip-detail-close" aria-label="关闭">×</button>
            </div>
            ${hasScore ? `
            <div class="ip-risk-row">
                <span class="ip-risk-label">
                    综合滥用评分
                    <span class="score-help-icon" onclick="event.stopPropagation(); toggleScoreTooltip(this);" title="点击查看算法说明">?</span>
                    <span class="score-tooltip">
                        <div class="tooltip-header">
                            <span class="tooltip-title">📊 综合滥用评分算法</span>
                            <span class="tooltip-close-hint">点击空白处关闭</span>
                        </div>
                        <div class="tooltip-section">
                            <p class="tooltip-section-title">评分公式</p>
                            <div class="formula-item">
                                <span class="formula-name">风险项</span>
                                <span class="formula-equation"><code>命中数量 * 15%</code></span>
                            </div>
                            <div class="formula-item">
                                <span class="formula-name">上限</span>
                                <span class="formula-equation"><code>封顶 100%</code></span>
                            </div>
                        </div>
                        <div class="tooltip-section">
                            <p class="tooltip-section-title">安全风险项</p>
                            <ul class="risk-list">
                                ${IP_RISK_FLAGS.map(f => `<li>${f.name}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="tooltip-section">
                            <p class="tooltip-section-title">数据说明</p>
                            <p class="domain-note-p">iplocate.io 不提供 abuser_score，本评分由隐私标志启发式估算，仅供参考。</p>
                        </div>
                    </span>
                </span>
                ${riskBarHTML}
            </div>
            ` : ''}
        </div>
    `;

    // 双栏构建：左栏（🛡️安全检测 / 🏢运营商 / 🔢ASN）、右栏（🌍位置 / 📧滥用举报）。
    // 各 section 带 ip-sec-* 标识类：移动端单栏时按 CSS order 重排为阅读顺序（滥用举报最后）。
    // 各 section「存在才渲染」的逻辑保持不变；接口数据插值统一经 escapeHtml 转义。
    // ⚠️ 弹窗不设「基本信息」区块：6 个字段统一上移到头部（IP→标题本体；
    //    位置/ASN/注册机构/运营商·ASN 类型→摘要行；评分→风险条），避免重复展示。
    let leftColumnHTML = '';
    let rightColumnHTML = '';

    // 安全检测（左栏首位；9 格图标矩阵，命中统计分母固定为 9）
    // 三态判定落在原始值上（getFlagTileClass）：true=is-hit / false=is-clean / 缺失=is-soft。
    // 输出全部 9 格，以保证「命中 N / 9」分母恒为 9；缺失格计为 is-soft 不参与命中计数。
    //
    // 前 7 格与评分口径同源（IP_RISK_FLAGS → 参与评分），后 2 格（移动网络/卫星网络）
    // 仅作信息展示、不进评分 —— 它们决定的是接入方式而非风险，计入会虚高评分。
    // 两种口径的差异在这里显式标注，避免后来者误以为矩阵与评分脱节。
    const securityTiles = [
        ...IP_RISK_FLAGS.map(flag => ({
            name: (IP_RISK_FLAG_ICONS[flag.key] || '') + ' ' + flag.label,
            raw: data[flag.key],
            scored: true
        })),
        { name: '📱 移动网络', raw: data.is_mobile, scored: false },
        { name: '🛰️ 卫星网络', raw: data.is_satellite, scored: false }
    ];
    const securityTilesHTML = securityTiles.map(t => {
        const stateClass = getFlagTileClass(t.raw);
        let stateText = '未提供';
        if (t.raw === true) stateText = '⚠️ 是';
        else if (t.raw === false) stateText = '✓ 否';
        return `
            <div class="flag-tile ${stateClass}">
                <span class="flag-name">${t.name}</span>
                <span class="flag-state">${stateText}</span>
            </div>
        `;
    }).join('');

    leftColumnHTML += `
        <div class="ip-detail-section ip-sec-security">
            <div class="ip-detail-section-title">
                <span class="sec-icon" aria-hidden="true">🛡️</span>安全检测
                <span class="sec-count">命中 ${securityHitCount} / ${securityTiles.length}</span>
            </div>
            <div class="ip-sec-grid">
                ${securityTilesHTML}
            </div>
        </div>
    `;

    // 位置信息（右栏首位；含地图）
    if (data.location) {
        // 地图模块：仅当坐标存在时渲染容器（Leaflet 懒加载 + 主题同步见 initIpDetailMap）
        const hasLocationCoords = !!(data.location.latitude && data.location.longitude);
        const mapHTML = hasLocationCoords ? `
            <div class="ip-detail-map">
                <div class="ip-detail-map-loading">🗺️ 地图加载中...</div>
            </div>
        ` : '';

        rightColumnHTML += `
            <div class="ip-detail-section ip-sec-location">
                <div class="ip-detail-section-title">
                    <span class="sec-icon" aria-hidden="true">🌍</span>位置信息
                </div>
                ${mapHTML}
                <div class="ip-sec-grid2">
                    <div class="ip-detail-item">
                        <span class="ip-detail-label">国家</span>
                        <span class="ip-detail-value">${escapeHtml(data.location.country) || '未知'} (${escapeHtml(data.location.country_code) || '-'})</span>
                    </div>
                    ${data.location.state ? `
                    <div class="ip-detail-item">
                        <span class="ip-detail-label">省份/州</span>
                        <span class="ip-detail-value">${escapeHtml(data.location.state)}</span>
                    </div>
                    ` : ''}
                    ${data.location.city ? `
                    <div class="ip-detail-item">
                        <span class="ip-detail-label">城市</span>
                        <span class="ip-detail-value">${escapeHtml(data.location.city)}</span>
                    </div>
                    ` : ''}
                    ${data.location.zip ? `
                    <div class="ip-detail-item">
                        <span class="ip-detail-label">邮编</span>
                        <span class="ip-detail-value">${escapeHtml(data.location.zip)}</span>
                    </div>
                    ` : ''}
                    ${data.location.timezone ? `
                    <div class="ip-detail-item">
                        <span class="ip-detail-label">时区</span>
                        <span class="ip-detail-value">${escapeHtml(data.location.timezone)}</span>
                    </div>
                    ` : ''}
                    <div class="ip-detail-item">
                        <span class="ip-detail-label">欧盟成员</span>
                        <span class="ip-detail-value muted">${boolToEmoji(data.location.is_eu_member, '🇪🇺 是', '否')}</span>
                    </div>
                    ${data.location.local_time ? `
                    <div class="ip-detail-item ip-item-span2">
                        <span class="ip-detail-label">当地时间</span>
                        <span class="ip-detail-value">${escapeHtml(data.location.local_time)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // 运营商信息（左栏第二位）
    if (data.company) {
        // iplocate.io 不提供运营商级 abuser_score，缺失时整行隐藏（不再显示「未提供」）
        const hasCompanyAbuserScore = !isMissingValue(data.company.abuser_score);

        leftColumnHTML += `
            <div class="ip-detail-section ip-sec-company">
                <div class="ip-detail-section-title">
                    <span class="sec-icon" aria-hidden="true">🏢</span>运营商信息
                </div>
                <div class="ip-detail-item">
                    <span class="ip-detail-label">运营商名称</span>
                    <span class="ip-detail-value">${escapeHtml(data.company.name) || '未知'}</span>
                </div>
                ${data.company.domain ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">域名</span>
                    <span class="ip-detail-value">${escapeHtml(data.company.domain)}</span>
                </div>
                ` : ''}
                <div class="ip-detail-item">
                    <span class="ip-detail-label">类型</span>
                    <span class="ip-detail-value">${escapeHtml(data.company.type) || '未知'}</span>
                </div>
                ${data.company.network ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">网络范围</span>
                    <span class="ip-detail-value">${escapeHtml(data.company.network)}</span>
                </div>
                ` : ''}
                ${hasCompanyAbuserScore ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">滥用评分</span>
                    <span class="ip-detail-value"><span class="ip-detail-badge ${getThreatBadgeClass(data.company.abuser_score)}">${escapeHtml(data.company.abuser_score)}</span></span>
                </div>
                ` : ''}
            </div>
        `;
    }

    // ASN 信息（左栏末位）
    if (data.asn) {
        // iplocate.io 不提供 ASN 级 abuser_score，缺失时整行隐藏（不再显示「未提供」）
        const hasAsnAbuserScore = !isMissingValue(data.asn.abuser_score);

        leftColumnHTML += `
            <div class="ip-detail-section ip-sec-asn">
                <div class="ip-detail-section-title">
                    <span class="sec-icon" aria-hidden="true">🔢</span>ASN 信息
                </div>
                <div class="ip-detail-item">
                    <span class="ip-detail-label">ASN 编号</span>
                    <span class="ip-detail-value">AS${escapeHtml(data.asn.asn) || '未知'}</span>
                </div>
                ${data.asn.org ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">组织</span>
                    <span class="ip-detail-value">${escapeHtml(data.asn.org)}</span>
                </div>
                ` : ''}
                ${data.asn.route ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">路由</span>
                    <span class="ip-detail-value">${escapeHtml(data.asn.route)}</span>
                </div>
                ` : ''}
                ${data.asn.type ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">类型</span>
                    <span class="ip-detail-value">${escapeHtml(data.asn.type)}</span>
                </div>
                ` : ''}
                ${hasAsnAbuserScore ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">滥用评分</span>
                    <span class="ip-detail-value"><span class="ip-detail-badge ${getThreatBadgeClass(data.asn.abuser_score)}">${escapeHtml(data.asn.abuser_score)}</span></span>
                </div>
                ` : ''}
                ${data.asn.country ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">国家代码</span>
                    <span class="ip-detail-value">${escapeHtml(data.asn.country.toUpperCase())}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    // 滥用举报联系方式（右栏末位；存在才渲染；移动端单栏时经 order 排到最后）
    if (data.abuse) {
        rightColumnHTML += `
            <div class="ip-detail-section ip-sec-abuse">
                <div class="ip-detail-section-title">
                    <span class="sec-icon" aria-hidden="true">📧</span>滥用举报联系方式
                </div>
                ${data.abuse.name ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">联系人</span>
                    <span class="ip-detail-value">${escapeHtml(data.abuse.name)}</span>
                </div>
                ` : ''}
                ${data.abuse.email ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">邮箱</span>
                    <span class="ip-detail-value">${escapeHtml(data.abuse.email)}</span>
                </div>
                ` : ''}
                ${data.abuse.phone ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">电话</span>
                    <span class="ip-detail-value">${escapeHtml(data.abuse.phone)}</span>
                </div>
                ` : ''}
                ${data.abuse.address ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">地址</span>
                    <span class="ip-detail-value">${escapeHtml(data.abuse.address)}</span>
                </div>
                ` : ''}
                <div class="abuse-note">
                    💡 发现该 IP 存在滥用行为（扫描、爆破、垃圾信息等）时，可向上述邮箱发起举报。
                </div>
            </div>
        `;
    }

    // 组装弹窗：头部（渐变英雄区 + IP 标题 + 摘要行 + 风险条） + 双栏网格。
    // ⚠️ 结构必须保持 content > (head + columns) 两层：.ip-detail-columns 恒为
    //    .ip-detail-content 的直接子级，禁止引入 .ip-detail-body 包裹层（否则
    //    桌面双栏 1fr 1fr 会被压成一行，且移动端 display:contents 透传链断裂，
    //    section 拿不到 grid 项身份 → order 重排失效）。
    // 窄视口：栏容器 display:contents 退化为透传，各 section 按 ip-sec-* 的 CSS order
    // 重排为阅读顺序：安全 → 位置 → 运营商 → ASN → 滥用举报（最后）。
    const detailHTML = `
        <div class="ip-detail-content">
            ${headHTML}
            <div class="ip-detail-columns">
                <div class="ip-detail-column">${leftColumnHTML}</div>
                <div class="ip-detail-column">${rightColumnHTML}</div>
            </div>
        </div>
    `;

    modal.innerHTML = detailHTML;

    // ---- 关闭路径统一管理：× 按钮 / 背景点击 / ESC 都走 closeModal ----
    // 同步清理地图资源（MutationObserver / Leaflet 实例）与键盘监听，防止泄漏
    let disposeMapFn = null;
    const escHandler = function (e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    function closeModal() {
        if (typeof disposeMapFn === 'function') {
            disposeMapFn();
            disposeMapFn = null;
        }
        document.removeEventListener('keydown', escHandler);
        modal.remove();
    }

    // × 按钮（不再使用内联 onclick）
    const closeBtn = modal.querySelector('.ip-detail-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // 点击背景关闭弹窗
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // ESC 键关闭弹窗
    document.addEventListener('keydown', escHandler);

    // 点击 IP 复制到剪贴板（不拼内联 onclick，直接查询元素绑定；
    // 复制失败时走 fallbackCopyText 降级，保证非 HTTPS 环境同样可用）
    const copyBtn = modal.querySelector('.ip-detail-copy-btn');
    if (copyBtn && copyBtn.dataset.copy) {
        copyBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const text = copyBtn.dataset.copy;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    showToast('✅ 已复制 IP: ' + text);
                }).catch(function () {
                    fallbackCopyText(text);
                });
            } else {
                fallbackCopyText(text);
            }
        });
    }

    document.body.appendChild(modal);

    // 地图初始化必须在弹窗入 DOM 之后（Leaflet 需要真实容器尺寸）
    const mapContainer = modal.querySelector('.ip-detail-map');
    if (mapContainer && data.location.latitude && data.location.longitude) {
        disposeMapFn = initIpDetailMap(mapContainer, data.location.latitude, data.location.longitude, data.ip || '');
    }
}

// 网站延迟测试相关代码
// 延迟测试配置
const latencyTestConfig = {
    count: 16  // 采样和显示数量
};

// 追踪延迟显示的动画状态
const latencyUIState = {};
const latencySites = [
    {
        name: '字节跳动',
        region: '国内',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#1677FF" d="m19.9 1.5 4.1 1v19l-4.1 1zM6.5 10.9l4.1 1v9l-4 1.1zM0 2.6l4.1 1v16.8l-4.1 1zm17.5 5.6v11.1l-4.2-1v-9z"></path></svg>',
        // 用小体积 CDN 资源做探针：跨域友好、边缘节点分布广，测到的更接近真实网络
        url: 'https://lf3-zlink-tos.ugurl.cn/obj/zebra-public/resource_lmmizj_1632398893.png'
    },
    {
        name: 'Bilibili',
        region: '国内',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FB7299" d="M17.813 4.653h.854q2.266.08 3.773 1.574Q23.946 7.72 24 9.987v7.36q-.054 2.266-1.56 3.773c-1.506 1.507-2.262 1.524-3.773 1.56H5.333q-2.266-.054-3.773-1.56C.053 19.614.036 18.858 0 17.347v-7.36q.054-2.267 1.56-3.76t3.773-1.574h.774l-1.174-1.12a1.23 1.23 0 0 1-.373-.906q0-.534.373-.907l.027-.027q.4-.373.92-.373t.92.373L9.653 4.44q.107.106.187.213h4.267a.8.8 0 0 1 .16-.213l2.853-2.747q.4-.373.92-.373c.347 0 .662.151.929.4s.391.551.391.907q0 .532-.373.906zM5.333 7.24q-1.12.027-1.88.773q-.76.748-.786 1.894v7.52q.026 1.146.786 1.893t1.88.773h13.334q1.12-.026 1.88-.773t.786-1.893v-7.52q-.026-1.147-.786-1.894t-1.88-.773zM8 11.107q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q0-.56.386-.947q.387-.386.947-.386m8 0q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q.025-.586.4-.96q.373-.373.933-.373"></path></svg>',
        // 头像 CDN 资源做探针：体积小、命中缓存快，耗时更贴近纯网络往返
        url: 'https://i0.hdslb.com/bfs/face/member/noface.jpg@24w_24h_1c'
    },
    {
        name: '微信',
        region: '国内',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#09B83E" d="M8.7 2.19C3.9 2.19 0 5.48 0 9.53c0 2.21 1.17 4.2 3 5.55a.6.6 0 0 1 .21.66l-.39 1.48q-.03.11-.04.22c0 .16.13.3.29.3a.3.3 0 0 0 .16-.06l1.9-1.11a.9.9 0 0 1 .72-.1 10 10 0 0 0 2.84.4q.41-.01.81-.05a5.85 5.85 0 0 1 1.93-6.45 8.3 8.3 0 0 1 5.86-1.83c-.58-3.59-4.2-6.35-8.6-6.35m-2.9 3.8c.64 0 1.16.53 1.16 1.18a1.17 1.17 0 0 1-1.16 1.18 1.17 1.17 0 0 1-1.17-1.18c0-.65.52-1.18 1.17-1.18m5.8 0c.65 0 1.17.53 1.17 1.18a1.17 1.17 0 0 1-1.16 1.18 1.17 1.17 0 0 1-1.16-1.18c0-.65.52-1.18 1.16-1.18m5.34 2.87a8 8 0 0 0-5.28 1.78 5.5 5.5 0 0 0-1.78 6.22c.94 2.46 3.66 4.23 6.88 4.23q1.25 0 2.36-.33a.7.7 0 0 1 .6.08l1.59.93.14.04c.13 0 .24-.1.24-.24q-.01-.09-.04-.18l-.33-1.23-.02-.16a.5.5 0 0 1 .2-.4 5.8 5.8 0 0 0 2.5-4.62c0-3.21-2.93-5.84-6.66-6.09zm-2.53 3.27c.53 0 .97.44.97.98a1 1 0 0 1-.97.99 1 1 0 0 1-.97-.99c0-.54.43-.98.97-.98zm4.84 0c.54 0 .97.44.97.98a1 1 0 0 1-.97.99 1 1 0 0 1-.97-.99c0-.54.44-.98.97-.98"></path></svg>',
        // 微信静态资源域做探针
        url: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico'
    },
    {
        name: '淘宝',
        region: '国内',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#E16322" d="M21.31 9.9a3 3 0 1 1 0 1.92.96.96 0 0 1 0-1.92m2.39 3.05H13.3v-.96h4.14V9.76h-2.89v-.77h2.9v-.92h-2.52v.2H13.3v-2.9h1.64v.35l2.52-.3V4.6h1.85v.64c.93-.08 1.76-.13 2.21-.1 1.5.06 2.45.27 2.49 1.26.03 1-1.43 1.9-1.43 1.9l-.45-.43v.2h-2.8v.92h3.22v.77h-3.23v2.23h4.39zM21.53 7.3l-.02-.01s1.38-.76.35-1.27c-.87-.43-5.54.3-6.93.62v.66zM1.88 6.42a1 1 0 0 0 0-2 1 1 0 0 0-1 1 1 1 0 0 0 1 1m3.41-.86a7 7 0 0 0 .37-.72L4.2 4.42s-.6 1.93-1.65 2.83c0 0 1.02.6 1.01.58a10 10 0 0 0 .78-.88l.68-.3a9 9 0 0 1-1.14 1.69l.61.54s.42-.4.88-.9h.53v.9H3.86v.73H5.9v1.72h-.08c-.23-.01-.58-.05-.71-.27-.17-.26-.05-.75-.04-1.04h-1.4l-.06.02s-.52 2.32 1.5 2.27a5.3 5.3 0 0 0 3.46-.92l.2.76 1.17-.48-.79-1.92-.94.3.18.65a3 3 0 0 1-.82.42V9.6h2v-.72h-2v-.9h2v-.72H6.01c.26-.31.46-.6.51-.78l-.62-.17c2.67-.95 4.15-.79 4.13.77v4.12s.16 1.4-1.46 1.3l-.87-.18-.21.83s3.78 1.08 4.1-1.82-.09-4.76-.09-4.76-.34-2.68-6.2-1.02zm-5.23 6.6 1.58.98c1.1-2.38 1.03-2.06 1.3-2.92.29-.87.35-1.54-.13-2.02a10 10 0 0 0-1.6-1.36L.55 7.86l1.21.75s.82.42.43 1.2c-.36.73-2.13 2.34-2.13 2.34M20 19s-.02.53-.67.53c-.6 0-.64-.42-.64-.42q-.39.45-1.07.46c-.76 0-1.3-.51-1.3-1.3 0-.78.56-1.27 1.4-1.27.39 0 .73.15.93.4l.01-.2c0-.56-.3-.8-1-.8q-.51 0-1.02.13.16-.33.3-.45.18-.14.94-.14c1.27 0 1.74.42 1.74 1.42v1.2c0 .32.03.44.38.44m-1.33-.74c0-.48-.25-.75-.64-.75-.4 0-.66.28-.66.76 0 .47.27.76.65.76.39 0 .65-.27.65-.77m5.27-.5c0 1.15-.7 1.82-1.78 1.82-1.1 0-1.77-.67-1.77-1.82 0-1.16.68-1.83 1.77-1.83s1.78.67 1.78 1.83m-1.08 0q0-1.3-.7-1.3t-.69 1.3.7 1.3.69-1.3m-7.14-.05c0 1.17-.65 1.86-1.57 1.86q-.66-.01-1.05-.47s-.1.42-.66.42c-.69 0-.67-.52-.67-.52.4.02.38-.21.38-.43v-2.89c0-.36-.07-.48-.43-.49.02-.1.08-.53.68-.53.82 0 .76.91.76.91v.79q.34-.4 1-.4c.96 0 1.56.65 1.56 1.75m-1.09.08q-.01-1.35-.76-1.35c-.44 0-.74.4-.74 1.1v.36c0 .72.31 1.12.76 1.12q.73 0 .74-1.23m-3.24-.03c0 1.15-.7 1.82-1.78 1.82-1.1 0-1.78-.67-1.78-1.82 0-1.16.68-1.83 1.78-1.83s1.78.67 1.78 1.83m-1.09 0q0-1.3-.7-1.3-.69 0-.68 1.3t.69 1.3q.7 0 .7-1.3m-6-2.72q-.4.11-1.55.1-1.38-.02-1.85-.04c-.52 0-.73.13-.91.66q.45-.13 1.13-.11c.36 0 .42.04.42.3v2.9c0 .28.11.67.72.67.71 0 .84-.52.84-.52-.36 0-.43-.13-.43-.49v-2.56c0-.27.1-.28.47-.28h.26c.55 0 .7-.1.9-.63M7.46 19s-.02.52-.67.52c-.56 0-.64-.4-.64-.4q-.39.45-1.07.45c-.76 0-1.3-.52-1.3-1.3S4.33 17 5.17 17c.39 0 .73.14.93.4v-.2c0-.56-.3-.8-1-.8q-.5 0-1.01.13.15-.33.3-.46.17-.14.94-.14c1.26 0 1.74.43 1.74 1.43v1.2c0 .32.03.44.38.44m-1.33-.75c0-.48-.26-.74-.64-.74-.4 0-.67.28-.67.76 0 .46.28.76.66.76.39 0 .65-.28.65-.78m5.27-.5c0 1.15-.7 1.82-1.78 1.82-1.1 0-1.77-.67-1.77-1.82 0-1.16.68-1.83 1.77-1.83s1.78.67 1.78 1.83m-1.08 0q0-1.3-.7-1.3t-.69 1.3.7 1.3.69-1.3m-7.14-.05c0 1.17-.65 1.86-1.57 1.86q-.66-.01-1.05-.47s-.1.42-.66.42c-.69 0-.67-.52-.67-.52.4.02.38-.21.38-.43v-2.89c0-.36-.07-.48-.43-.49.02-.1.08-.53.68-.53.82 0 .76.91.76.91v.79q.34-.4 1-.4c.96 0 1.56.65 1.56 1.75m-1.09.08q-.01-1.35-.76-1.35c-.44 0-.74.4-.74 1.1v.36c0 .72.31 1.12.76 1.12q.73 0 .74-1.23m-3.24-.03c0 1.15-.7 1.82-1.78 1.82-1.1 0-1.78-.67-1.78-1.82 0-1.16.68-1.83 1.78-1.83s1.78.67 1.78 1.83m-1.09 0q0-1.3-.7-1.3-.69 0-.68 1.3t.69 1.3q.7 0 .7-1.3m-6-2.72q-.4.11-1.55.1-1.38-.02-1.85-.04c-.52 0-.73.13-.91.66q.45-.13 1.13-.11c.36 0 .42.04.42.3v2.9c0 .28.11.67.72.67.71 0 .84-.52.84-.52-.36 0-.43-.13-.43-.49v-2.56c0-.27.1-.28.47-.28h.26c.55 0 .7-.1.9-.63M7.46 19s-.02.52-.67.52c-.56 0-.64-.4-.64-.4q-.39.45-1.07.45c-.76 0-1.3-.52-1.3-1.3S4.33 17 5.17 17c.39 0 .73.14.93.4v-.2c0-.56-.3-.8-1-.8q-.5 0-1.01.13.15-.33.3-.46.17-.14.94-.14c1.26 0 1.74.43 1.74 1.43v1.2c0 .32.03.44.38.44m-1.33-.75c0-.48-.26-.74-.64-.74-.4 0-.67.28-.67.76 0 .46.28.76.66.76.39 0 .65-.28.65-.78"></path></svg>',
        // 阿里图片 CDN 资源做探针
        url: 'https://img.alicdn.com/imgextra/i2/O1CN01qnQCrN1VkzAWiU4Hs_!!6000000002692-2-tps-33-33.png'
    },
    {
        name: 'GitHub',
        region: '国际',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.7 4.7 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"></path></svg>',
        // GitHub Pages 域的静态资源（github.com 对 HEAD / 跨域探测不友好）
        url: 'https://github.github.io/janky/images/bg_hr.png'
    },
    {
        name: 'jsDelivr',
        region: '国际',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#F0DB4F" d="M11.85 0 .81 4.02l1.56 14.7L11.85 24l9.6-5.28 1.74-14.76zm.06 4.62a6.67 6.75 0 0 1 2.67.57 13 13 0 0 0-2.6 1.95l-.13-.04a1 1 0 0 0-.34-.06l-.21.02a9 9 0 0 1-.62-2.31 6.67 6.75 0 0 1 1.17-.13 6.67 6.75 0 0 1 .06 0m-1.99.31a10 10 0 0 0 .7 2.5 1.2 1.2 0 0 0-.34.83 1 1 0 0 0 .18.63c-.93 1.3-1.65 2.8-1.9 4.31l-.02.17q-.43.14-.66.54a5 5 0 0 1-2.61-2.02 6.67 6.75 0 0 1-.03-.52 6.67 6.75 0 0 1 4.68-6.44m5.51.71a6.67 6.75 0 0 1 2.53 2.9 8 8 0 0 1-1.9 2.73 1.2 1.2 0 0 0-.64-.18 1.2 1.2 0 0 0-.77.27 11 11 0 0 1-1.31-1.17 11 11 0 0 1-.92-1.13q.3-.32.3-.8a1 1 0 0 0-.15-.58 12 12 0 0 1 2.86-2.04M11.5 7.63a.6.6 0 0 1 .35.1.6.6 0 0 1 .3.53.6.6 0 0 1-.3.53.6.6 0 0 1-.35.11.63.63 0 0 1-.63-.64c0-.35.28-.64.63-.64m-.44 1.78a1.2 1.2 0 0 0 .68.06l.11.15a11 11 0 0 0 .92 1.11A12 12 0 0 0 14.22 12q-.05.17-.06.34a1 1 0 0 0 .07.38 10 10 0 0 1-2.12 1.05l-.26.07a8 8 0 0 1-1.87.34 1.2 1.2 0 0 0-.66-.78l.01-.07a10 10 0 0 1 1.73-3.93m7.28.19a6.67 6.75 0 0 1 .24 1.78 6.67 6.75 0 0 1-.26 1.86 10 10 0 0 1-1.66-.63 1.2 1.2 0 0 0-.07-.72 9 9 0 0 0 1.75-2.3m-2.92 2.1c.37 0 .66.29.66.65a.66.66 0 1 1-1.32 0c0-.36.3-.65.66-.65m.84 1.59a11 11 0 0 0 1.8.68 6.67 6.75 0 0 1-6.15 4.16 6.67 6.75 0 0 1-.06 0 6.67 6.75 0 0 1-.04 0l-.27-.13a5 5 0 0 1-.84-.5 3.8 3.8 0 0 1-1.3-2.03q.32-.17.49-.5a8 8 0 0 0 1.96-.3l.51-.16a11 11 0 0 0 2.34-1.13q.31.23.72.23a1.3 1.3 0 0 0 .84-.32m-10.7.11a6 6 0 0 0 2.2 1.3 1.2 1.2 0 0 0 .86.87 4.6 4.6 0 0 0 1.24 2.22 6.67 6.75 0 0 1-4.3-4.39zm3.32.47c.33 0 .6.26.6.6s-.27.59-.6.59a.6.6 0 0 1-.6-.6.6.6 0 0 1 .6-.6"></path></svg>',
        // generate_200 探针：返回 200 空响应，专为延迟测量设计，不受响应体大小干扰
        url: 'https://cdn.jsdelivr.net/npm/latency-test@1.0.0/generate_200'
    },
    {
        name: 'Cloudflare',
        region: '国际',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#F38020" d="M16.5 16.85c.16-.51.1-.98-.15-1.32Q16 15.05 15.3 15l-8.66-.11a.2.2 0 0 1-.13-.07.2.2 0 0 1-.02-.16.2.2 0 0 1 .2-.16l8.74-.1a3.1 3.1 0 0 0 2.55-1.92l.5-1.3a.3.3 0 0 0 .02-.17 5.69 5.69 0 0 0-10.94-.59 2.6 2.6 0 0 0-1.8-.5 2.56 2.56 0 0 0-2.22 3.19A3.63 3.63 0 0 0 0 16.75q0 .27.04.53a.2.2 0 0 0 .17.15h15.98a.2.2 0 0 0 .2-.16zm2.77-5.57-.24.01q-.09 0-.13.1l-.34 1.17q-.21.78.16 1.32.35.48 1.06.52l1.84.11q.08 0 .14.07a.2.2 0 0 1 .02.16.2.2 0 0 1-.2.16l-1.93.1a3.1 3.1 0 0 0-2.55 1.92l-.14.36q-.03.12.1.14h6.6a.2.2 0 0 0 .17-.12 5 5 0 0 0 .17-1.28 4.74 4.74 0 0 0-4.73-4.73"></path></svg>',
        url: 'https://www.cloudflare.com/favicon.ico'
    },
    {
        name: 'YouTube',
        region: '国际',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FF0000" d="M23.5 6.19a3 3 0 0 0-2.12-2.14c-1.87-.5-9.38-.5-9.38-.5s-7.5 0-9.38.5A3 3 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3 3 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3 3 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81M9.55 15.57V8.43L15.82 12z"></path></svg>',
        url: 'https://www.youtube.com/favicon.ico'
    }
];

// 生成延迟卡片
function generateLatencyCards() {
    const container = document.getElementById('latency-cards');
    if (!container) return;
    container.innerHTML = '';

    // 按地区排序：国内优先，然后国际
    const sortedSites = [...latencySites].sort((a, b) => {
        const aIsChina = a.region === '国内' ? 0 : 1;
        const bIsChina = b.region === '国内' ? 0 : 1;
        return aIsChina - bIsChina;
    });

    sortedSites.forEach(site => {
        const card = document.createElement('div');
        card.className = 'latency-card';
        const siteName = site.name.toLowerCase().replace(/\s+/g, '-');
        card.innerHTML = `
            <div class="latency-card-header">
                <div class="latency-card-info">
                    <div class="latency-card-icon-wrapper" data-site="${siteName}" style="color: ${site.icon.match(/fill="([^"]+)"/)?.[1] || 'var(--primary-color)'}">
                        ${site.icon}
                    </div>
                    <div class="latency-card-text">
                        <span class="latency-card-name">${site.name}</span>
                        <span class="latency-card-region latency-card-region-${site.region === '国内' ? 'domestic' : 'international'}">${site.region}</span>
                    </div>
                </div>
                <div class="latency-status" id="latency-${siteName}">...<span class="unit">ms</span></div>
            </div>
            <div class="latency-graph-container">
                <div class="graph-grid"></div>
                <svg class="latency-ecg" viewBox="0 0 400 60" preserveAspectRatio="none">
                    <path class="ecg-path-bg" d="M0,30 L400,30"></path>
                    <path class="ecg-path" id="path-${siteName}" d="M0,30 L400,30"></path>
                    <circle class="ecg-cursor" id="cursor-${siteName}" r="3" cx="0" cy="30" style="display:none"></circle>
                </svg>
            </div>
        `;
        container.appendChild(card);
    });
}

// 单次延迟测量的超时阈值（毫秒）
const LATENCY_PROBE_TIMEOUT_MS = 5000;

// 测试延迟
// 计时口径：
//  1. 只发一次 HEAD 请求，不做 GET 二次回退（回退会把超时时间算进结果，污染计时）
//  2. 计时锚点用 performance.now()，亚毫秒精度且单调递增，不受系统时钟调整影响
//  3. cache: 'no-store' 强制不吃缓存，保证每次都是真实网络往返
//  4. AbortController 超时截断，避免个别请求长时间挂起
async function testLatency(site) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LATENCY_PROBE_TIMEOUT_MS);
    const start = performance.now();
    try {
        // 附加随机查询参数绕过缓存键（与 no-store 双保险）
        const probeUrl = site.url + (site.url.includes('?') ? '&' : '?') + 't=' + Date.now() + Math.random().toString(36).slice(2, 8);
        await fetch(probeUrl, {
            method: 'HEAD',
            cache: 'no-store',
            mode: 'no-cors',
            referrerPolicy: 'no-referrer',
            signal: controller.signal
        });
        return Math.round(performance.now() - start);
    } catch (error) {
        return -1; // 请求失败或超时
    } finally {
        clearTimeout(timeoutId);
    }
}

// 获取延迟颜色
function getLatencyColor(latency) {
    if (latency === -1) return 'var(--destructive)';
    if (latency <= 49) return 'var(--latency-49)';
    if (latency <= 149) return 'var(--latency-149)';
    if (latency <= 299) return 'var(--latency-299)';
    if (latency <= 999) return 'var(--latency-999)';
    return 'var(--latency-1000)';
}

// 更新延迟显示
function updateLatencyDisplay(siteName, latencies) {
    const valueElement = document.getElementById(`latency-${siteName}`);
    const pathElement = document.getElementById(`path-${siteName}`);
    const cursorElement = document.getElementById(`cursor-${siteName}`);

    if (!valueElement || !pathElement) return;

    // 计算平均延迟
    const lastLatency = latencies[latencies.length - 1];
    const validLatencies = latencies.filter(l => l !== -1);
    let avgLatency = -1;

    if (validLatencies.length > 0) {
        avgLatency = validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length;
    }

    const targetValue = Math.round(avgLatency);

    // 更新文字显示
    if (validLatencies.length === 0) {
        if (lastLatency === -1) {
            valueElement.innerHTML = 'TIMEOUT';
            valueElement.style.color = 'var(--latency-999)';
        } else {
            valueElement.innerHTML = '...<span class="unit">ms</span>';
            valueElement.style.color = 'var(--primary-color)';
        }
    } else {
        const siteState = latencyUIState[siteName] || { current: targetValue, timer: null };
        latencyUIState[siteName] = siteState;

        // 设置颜色
        valueElement.style.color = getLatencyColor(targetValue);

        // 如果已经在该数值，直接返回
        if (siteState.current === targetValue) {
            valueElement.innerHTML = `${targetValue}<span class="unit">ms</span>`;
            return;
        }

        // 清除旧的计时器
        if (siteState.timer) clearInterval(siteState.timer);

        // 每 30ms 更新一次数字，实现“时速表”滚动的动态效果
        const step = () => {
            if (siteState.current < targetValue) {
                siteState.current += Math.ceil((targetValue - siteState.current) / 5);
            } else if (siteState.current > targetValue) {
                siteState.current -= Math.ceil((siteState.current - targetValue) / 5);
            }

            valueElement.innerHTML = `${siteState.current}<span class="unit">ms</span>`;

            if (siteState.current === targetValue) {
                clearInterval(siteState.timer);
                siteState.timer = null;
            }
        };

        siteState.timer = setInterval(step, 30);
    }

    // 更新 SVG 路径
    const width = 400;
    const height = 60;
    const padding = 10; // 减少内边距使曲线更饱满
    const step = width / (latencyTestConfig.count - 1);

    let points = [];
    latencies.forEach((l, i) => {
        const x = i * step;
        let y;
        if (l === -1) y = height - 5;
        else {
            // 映射 0-500ms 到高度
            y = height - padding - (Math.min(l, 500) / 500 * (height - 2 * padding));
        }
        points.push({ x, y });
    });

    if (points.length > 0) {
        // 生成平滑曲线路径 (Bezier)
        let d = `M${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const x_mid = (points[i].x + points[i + 1].x) / 2;
            const y_mid = (points[i].y + points[i + 1].y) / 2;
            const cp_x1 = (x_mid + points[i].x) / 2;
            const cp_x2 = (x_mid + points[i + 1].x) / 2;
            d += ` Q${points[i].x},${points[i].y} ${x_mid},${y_mid}`;
        }
        const lastPoint = points[points.length - 1];
        d += ` L${lastPoint.x},${lastPoint.y}`;

        pathElement.setAttribute('d', d);
        const avgColor = getLatencyColor(targetValue);
        pathElement.style.stroke = avgColor;

        // 更新光标位置
        if (cursorElement) {
            cursorElement.style.display = 'block';
            cursorElement.setAttribute('cx', lastPoint.x);
            cursorElement.setAttribute('cy', lastPoint.y);
            cursorElement.style.fill = avgColor;
        }
    }
}

// 开始延迟测试
async function startLatencyTest() {
    generateLatencyCards();

    // 为每个网站维护最新的N个延迟数据
    const siteLatencies = {};
    latencySites.forEach(site => {
        const siteName = site.name.toLowerCase().replace(/\s+/g, '-');
        siteLatencies[siteName] = [];
    });

    // 初始采样测试
    const initialPromises = latencySites.map(async (site) => {
        const siteName = site.name.toLowerCase().replace(/\s+/g, '-');
        for (let i = 0; i < latencyTestConfig.count; i++) {
            // 页面不可见时先等待，避免后台标签页持续发请求
            await waitForNetworkPage();
            const latency = await testLatency(site);
            siteLatencies[siteName].push(latency);
            updateLatencyDisplay(siteName, siteLatencies[siteName]);
            if (i < latencyTestConfig.count - 1) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    });

    await Promise.all(initialPromises);

    // 之后每6.18秒测试一次，更新最新的数据
    setInterval(async () => {
        // 页面不可见时跳过本轮，下一轮再检查
        if (!isNetworkPageVisible()) return;
        const updatePromises = latencySites.map(async (site) => {
            const siteName = site.name.toLowerCase().replace(/\s+/g, '-');
            const latency = await testLatency(site);
            // 添加新数据，保持只有N个
            siteLatencies[siteName].push(latency);
            if (siteLatencies[siteName].length > latencyTestConfig.count) {
                siteLatencies[siteName].shift(); // 移除最旧的
            }
            updateLatencyDisplay(siteName, siteLatencies[siteName]);
        });
        await Promise.all(updatePromises);
    }, 618 * 2);
}

// 页面是否处于可见状态（隐藏时暂停延迟测试，避免后台持续发请求）
function isNetworkPageVisible() {
    const page = document.querySelector('.page[data-page="network"]');
    return !!page && !page.hidden;
}

// 等待页面可见（已可见则立即返回；否则每 300ms 轮询检查）
function waitForNetworkPage() {
    if (isNetworkPageVisible()) return Promise.resolve();
    return new Promise(resolve => {
        const timer = setInterval(() => {
            if (isNetworkPageVisible()) {
                clearInterval(timer);
                resolve();
            }
        }, 300);
    });
}
// 自有归属地接口（主备双通道定义，按数组顺序执行）：ipsb 主用，失败切 ipinfo 兜底（不随机）
//   ipsb   字段全（city / isp / asn_organization 等），但限流敏感——被限流时不一定返回
//          真 429，常表现为 500 系错误码或错误载荷，故「失败」判定必须从宽（见共享层）
//   ipinfo 字段精简（国家 / ASN / as_name），作为兜底通道
// 说明：此处是【唯一】的接口 URL 定义处，不允许多处硬编码第二份 URL 字符串；
//       各接口响应由各自 adapt 适配器归一化为「规范结果」后入共享缓存（字段结构见文件前部）。
var GEO_QUERY_ENDPOINTS = [
    {
        name: 'ipsb',
        buildUrl: function (ip) { return 'https://api.090227.xyz/api/ipsb?ip=' + encodeURIComponent(ip); },
        adapt: adaptIpSbPayload
    },
    {
        name: 'ipinfo',
        buildUrl: function (ip) { return 'https://api.090227.xyz/api/ipinfo?ip=' + encodeURIComponent(ip); },
        adapt: adaptIpInfoPayload
    }
];
// 复制降级方案（execCommand 兜底，供 IP 详情弹窗内的复制按钮在非 HTTPS 环境使用）
function fallbackCopyText(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-999999px';
    ta.style.top = '-999999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
        document.execCommand('copy');
        showToast('✅ 已复制 IP: ' + text);
    } catch (err) {
        showToast('❌ 复制失败，请手动复制');
    }
    document.body.removeChild(ta);
}

// 页面加载时开始延迟测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLatencyTest);
} else {
    startLatencyTest();
}
