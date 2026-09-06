function copyDomain(domain) {
    // 移除通配符前缀
    const cleanDomain = domain.replace(/^\*\./, '');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanDomain).then(function () {
            showToast('✅ 已复制: ' + cleanDomain);
        }).catch(function (err) {
            fallbackCopy(cleanDomain);
        });
    } else {
        fallbackCopy(cleanDomain);
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showToast('✅ 已复制: ' + text);
    } catch (err) {
        showToast('❌ 复制失败，请手动复制');
    }

    document.body.removeChild(textArea);
}

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

//代理变化检测
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

// 图片懒加载功能
function initLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-image');

    // 创建 Intersection Observer
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');

                if (src) {
                    // 创建新的图片对象来预加载
                    const tempImg = new Image();

                    // 图片加载完成后替换并添加过渡效果
                    tempImg.onload = () => {
                        img.src = src;
                        img.removeAttribute('data-src');
                        // 延迟添加loaded类以触发过渡动画
                        setTimeout(() => {
                            img.classList.add('loaded');
                        }, 50);
                    };

                    // 加载失败时也移除模糊效果
                    tempImg.onerror = () => {
                        img.classList.add('loaded');
                    };

                    // 开始加载图片
                    tempImg.src = src;
                }

                // 停止观察已经加载的图片
                observer.unobserve(img);
            }
        });
    }, {
        // 图片距离视口200px时开始加载
        rootMargin: '200px',
        threshold: 0.01
    });

    // 观察所有懒加载图片
    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
}

// DOM加载完成后初始化懒加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoading);
} else {
    initLazyLoading();
}

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

// 获取国内测试数据 (遍历多个 API: speedtest.cn > ipipv.com > ipip.net)
async function fetchIpipData() {
    setStatus('status-ipip', 'loading');

    // 获取标题元素,用于动态更新 API 来源
    const titleElement = document.querySelector('#status-ipip').parentElement;

    // 定义 API 配置列表,按优先级排序
    const apiConfigs = [
        {
            name: 'speedtest.cn',
            url: 'https://api-v3.speedtest.cn/ip',
            parser: (data) => {
                if (data.code === 0 && data.data) {
                    return {
                        ip: data.data.ip || '未知',
                        country: data.data.country || '未知',
                        city: data.data.city || '未知'
                    };
                }
                throw new Error('数据格式错误');
            }
        },
        {
            name: 'ipipv.com',
            url: 'https://myip.ipipv.com/',
            parser: (data) => {
                return {
                    ip: data.Ip || '未知',
                    country: data.Country || '未知',
                    city: data.City || '未知'
                };
            }
        },
        {
            name: 'ipip.net',
            url: 'https://myip.ipip.net/json',
            parser: (data) => {
                if (data.ret === 'ok' && data.data) {
                    return {
                        ip: data.data.ip || '未知',
                        country: data.data.location[0] || '未知',
                        city: data.data.location[2] || '未知'
                    };
                }
                throw new Error('数据格式错误');
            }
        }
    ];

    // 遍历 API 配置列表
    for (const config of apiConfigs) {
        try {
            // 添加时间戳参数避免缓存
            const timestamp = Date.now();
            const url = config.url + (config.url.includes('?') ? '&' : '?') + `t=${timestamp}`;
            const response = await fetch(url);
            const data = await response.json();

            // 使用对应的解析器解析数据
            const result = config.parser(data);

            // 更新页面显示
            document.getElementById('ipip-ip').textContent = result.ip;
            document.getElementById('ipip-country').textContent = result.country;
            document.getElementById('ipip-city').textContent = result.city;
            setStatus('status-ipip', 'success');

            // 更新标题显示当前使用的 API
            if (titleElement) {
                titleElement.innerHTML = `<span class="status-indicator" id="status-ipip"></span><span>国内测试<span class="network-card-subtitle">${config.name}</span></span>`;
                setStatus('status-ipip', 'success'); // 重新设置状态,因为 innerHTML 会清除
            }

            console.log(`使用 ${config.name} API 成功`);
            return; // 成功则返回,不再尝试其他 API

        } catch (error) {
            console.warn(`${config.name} 接口失败:`, error);
            // 继续尝试下一个 API
        }
    }

    // 所有 API 都失败
    document.getElementById('ipip-ip').innerHTML = '<span class="error">加载失败</span>';
    document.getElementById('ipip-country').textContent = 'API异常';
    document.getElementById('ipip-city').textContent = '稍后重试';
    setStatus('status-ipip', 'error');
    console.error('所有国内测试 API 都失败');
}

// 获取 EdgeOne 数据
async function fetchEdgeOneData() {
    setStatus('status-edgeone', 'loading');
    try {
        // 添加时间戳参数避免缓存
        const timestamp = Date.now();
        const response = await fetch(`https://api.cmliussss.net/api/ipinfo?_t=${timestamp}`);
        const data = await response.json();

        document.getElementById('edgeone-ip').textContent = data.ip || '未知';
        document.getElementById('edgeone-country').textContent = data.country_code || '未知';
        document.getElementById('edgeone-city').textContent = `${data.asn} ${data.as_name}` || '未知';
        setStatus('status-edgeone', 'success');
    } catch (error) {
        document.getElementById('edgeone-ip').innerHTML = '<span class="error">加载失败</span>';
        document.getElementById('edgeone-country').textContent = 'API异常';
        document.getElementById('edgeone-city').textContent = '稍后重试';
        setStatus('status-edgeone', 'error');
        console.error('EdgeOne 接口错误:', error);
    }
}

// 获取 CloudFlare 数据
async function fetchCloudFlareData() {
    setStatus('status-cf', 'loading');
    try {
        // 添加时间戳参数避免缓存
        const timestamp = Date.now();
        const response = await fetch(`https://cf.090227.xyz/ip.json?t=${timestamp}`);
        const data = await response.json();

        document.getElementById('cf-ip').textContent = data.ip || '未知';
        document.getElementById('cf-country').textContent = data.country || '未知';
        document.getElementById('cf-city').textContent = data.org || '未知';
        setStatus('status-cf', 'success');
    } catch (error) {
        document.getElementById('cf-ip').innerHTML = '<span class="error">加载失败</span>';
        document.getElementById('cf-country').textContent = 'API异常';
        document.getElementById('cf-city').textContent = '稍后重试';
        setStatus('status-cf', 'error');
        console.error('CloudFlare 接口错误:', error);
    }
}

// 获取推特入口数据
async function fetchTwitterData() {
    setStatus('status-twitter', 'loading');
    try {
        // 添加时间戳参数避免缓存
        const timestamp = Date.now();
        const response = await fetch(`https://help.x.com/cdn-cgi/trace?t=${timestamp}`);
        const text = await response.text();

        // 解析文本格式的响应 (key=value 格式,每行一个)
        const data = {};
        text.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                data[key.trim()] = value.trim();
            }
        });

        document.getElementById('twitter-ip').textContent = data.ip || '未知';
        document.getElementById('twitter-country').textContent = data.loc || '未知';
        document.getElementById('twitter-city').textContent = data.colo || '';
        setStatus('status-twitter', 'success');
    } catch (error) {
        document.getElementById('twitter-ip').innerHTML = '<span class="error">翻墙失败</span>';
        document.getElementById('twitter-country').textContent = '网络异常';
        document.getElementById('twitter-city').textContent = '检查代理';
        setStatus('status-twitter', 'error');
        console.error('推特入口接口错误:', error);
    }
}

// 页面加载时自动获取网络信息
async function loadNetworkInfo() {
    if (document.querySelector('.network-cards-container')) {
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
        const ipText = element.textContent.trim();

        // 跳过已经标记为错误、加载中、未知的元素
        if (element.querySelector('.error') ||
            ipText === '加载中...' ||
            ipText === '未知' ||
            element.classList.contains('clickable')) {
            return;
        }

        // 添加可点击样式
        element.classList.add('clickable');

        element.addEventListener('click', async function () {
            let ipText = this.textContent.trim();

            // 移除可能存在的加载动画
            const existingSpinner = this.querySelector('.loading-spinner');
            if (existingSpinner) {
                return; // 正在加载中,不重复请求
            }

            // 跳过显示"加载中..."或"未知"的元素
            if (ipText === '加载中...' || ipText === '未知') {
                return;
            }

            // 将 * 替换为 0
            const cleanIp = ipText.replace(/\*/g, '0');

            // 添加加载动画
            const spinner = document.createElement('span');
            spinner.className = 'loading-spinner';
            this.appendChild(spinner);

            try {
                const response = await fetch(`https://api.ipapi.is/?ip=${cleanIp}`);

                if (!response.ok) {
                    throw new Error('查询失败');
                }

                const data = await response.json();

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

// 将布尔值转换为 emoji
function boolToEmoji(value, trueEmoji = '✅', falseEmoji = '❌') {
    return value ? trueEmoji : falseEmoji;
}

// 将 IP 类型转换为中文并添加样式
function formatIpType(type) {
    if (!type) return '<span class="ip-type-unknown">未知</span>';

    const typeMap = {
        'isp': { text: '住宅', class: 'ip-type-residential' },
        'hosting': { text: '机房', class: 'ip-type-hosting' },
        'business': { text: '商用', class: 'ip-type-business' }
    };

    const typeInfo = typeMap[type.toLowerCase()] || { text: type, class: 'ip-type-unknown' };
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

// 计算综合滥用评分
function calculateAbuseScore(companyScore, asnScore, securityFlags = {}) {
    // 如果两个分数都无效，返回null
    if (!companyScore || companyScore === '未知') companyScore = 0;
    if (!asnScore || asnScore === '未知') asnScore = 0;

    const company = parseFloat(companyScore) || 0;
    const asn = parseFloat(asnScore) || 0;

    // 计算基础评分：(company + asn) / 2 * 5
    let baseScore = ((company + asn) / 2) * 5;

    // 计算安全风险附加分：每个安全风险项增加 20%
    let riskAddition = 0;
    const riskFlags = [
        securityFlags.is_crawler,   // 爬虫
        securityFlags.is_proxy,     // 代理服务器
        securityFlags.is_vpn,       // VPN
        securityFlags.is_tor,       // Tor 网络
        securityFlags.is_abuser,    // 滥用 IP
        securityFlags.is_bogon      // 虚假 IP
    ];

    // 统计为 true 的风险项数量
    const riskCount = riskFlags.filter(flag => flag === true).length;
    riskAddition = riskCount * 0.15; // 每个风险项增加 15%

    // 最终评分 = 基础评分 + 风险附加分
    const finalScore = baseScore + riskAddition;

    // 如果基础评分和风险附加分都是0，返回null
    if (baseScore === 0 && riskAddition === 0) return null;

    return finalScore;
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

// 显示 IP 详情弹窗
function showIpDetailModal(data) {
    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'ip-detail-modal';

    // 计算综合滥用评分（风控值）
    const companyScore = data.company?.abuser_score;
    const asnScore = data.asn?.abuser_score;

    // 收集安全风险标志
    const securityFlags = {
        is_crawler: data.is_crawler,
        is_proxy: data.is_proxy,
        is_vpn: data.is_vpn,
        is_tor: data.is_tor,
        is_abuser: data.is_abuser,
        is_bogon: data.is_bogon
    };

    const combinedScore = calculateAbuseScore(companyScore, asnScore, securityFlags);

    let riskControlHTML = '';
    if (combinedScore !== null) {
        const scorePercentage = combinedScore * 100;
        const badgeClass = getAbuseScoreBadgeClass(scorePercentage);
        const formattedScore = formatAbuseScorePercentage(combinedScore);

        // 根据百分比确定风险等级文本
        let riskLevel = '';
        if (scorePercentage >= 100) riskLevel = '极度危险';
        else if (scorePercentage >= 20) riskLevel = '高风险';
        else if (scorePercentage >= 5) riskLevel = '轻微风险';
        else if (scorePercentage >= 0.25) riskLevel = '纯净';
        else riskLevel = '极度纯净';

        riskControlHTML = `
            <span class="ip-detail-badge ${badgeClass}">${formattedScore} ${riskLevel}</span>
        `;
    } else {
        riskControlHTML = '未知';
    }

    // 构建详情内容
    let detailHTML = `
        <div class="ip-detail-content">
            <button class="ip-detail-close" onclick="this.closest('.ip-detail-modal').remove()">×</button>
            <div class="ip-detail-title">
                🔍 IP 详细信息
                <span class="ip-detail-source">数据来源: ipapi.is</span>
            </div>
    `;

    // 基本信息
    detailHTML += `
        <div class="ip-detail-section">
            <div class="ip-detail-section-title">📍 基本信息</div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">IP 地址</span>
                <span class="ip-detail-value">${data.ip || '未知'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">区域互联网注册机构</span>
                <span class="ip-detail-value">${data.rir || '未知'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">运营商 / ASN 类型</span>
                <span class="ip-detail-value">${formatIpType(data.company?.type)} / ${formatIpType(data.asn?.type)}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">
                    综合滥用评分
                    <span class="score-help-icon" onclick="event.stopPropagation(); toggleScoreTooltip(this);" title="点击查看算法说明">?</span>
                    <span class="score-tooltip">
                        <div class="tooltip-header">
                            <span class="tooltip-title">📊 综合滥用评分算法</span>
                        </div>
                        <div class="tooltip-section">
                            <p class="tooltip-section-title">评分公式</p>
                            <div class="formula-item">
                                <span class="formula-name">基础分</span>
                                <span class="formula-equation"><code>(运营商分 + ASN分) / 2 * 5</code></span>
                            </div>
                            <div class="formula-item">
                                <span class="formula-name">风险附加</span>
                                <span class="formula-equation"><code>风险项数量 * 15%</code></span>
                            </div>
                        </div>
                        <div class="tooltip-section">
                            <p class="tooltip-section-title">安全风险项</p>
                            <ul class="risk-list">
                                <li>爬虫 (Crawler)</li>
                                <li>代理 (Proxy)</li>
                                <li>VPN</li>
                                <li>Tor 网络</li>
                                <li>滥用IP (Abuser)</li>
                                <li>虚假IP (Bogon)</li>
                            </ul>
                        </div>
                    </span>
                </span>
                <span class="ip-detail-value">${riskControlHTML}</span>
            </div>
        </div>
    `;

    // 安全检测
    detailHTML += `
        <div class="ip-detail-section">
            <div class="ip-detail-section-title">🛡️ 安全检测</div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">移动网络</span>
                <span class="ip-detail-value">${data.is_mobile ? '<span class="success-text">📱 是</span>' : '否'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">数据中心</span>
                <span class="ip-detail-value">${data.is_datacenter ? '<span class="warning-text">🏢 是</span>' : '否'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">卫星网络</span>
                <span class="ip-detail-value">${data.is_satellite ? '<span class="success-text">🛰️ 是</span>' : '否'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">爬虫</span>
                <span class="ip-detail-value">${data.is_crawler ? '<span class="danger-text">🤖 是</span>' : '✅ 否'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">代理服务器</span>
                <span class="ip-detail-value">${data.is_proxy ? '<span class="danger-text">⚠️ 是</span>' : '✅ 否'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">VPN</span>
                <span class="ip-detail-value">${data.is_vpn ? '<span class="danger-text">⚠️ 是</span>' : '✅ 否'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">Tor 网络</span>
                <span class="ip-detail-value">${data.is_tor ? '<span class="danger-text">⚠️ 是</span>' : '✅ 否'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">滥用 IP</span>
                <span class="ip-detail-value">${data.is_abuser ? '<span class="danger-text">⚠️ 是</span>' : '✅ 否'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">虚假 IP</span>
                <span class="ip-detail-value">${data.is_bogon ? '<span class="danger-text">⚠️ 是</span>' : '✅ 否'}</span>
            </div>
        </div>
    `;

    // 位置信息
    if (data.location) {
        detailHTML += `
            <div class="ip-detail-section">
                <div class="ip-detail-section-title">🌍 位置信息</div>
                <div class="ip-detail-item">
                    <span class="ip-detail-label">国家</span>
                    <span class="ip-detail-value">${data.location.country || '未知'} (${data.location.country_code || '-'})</span>
                </div>
                ${data.location.state ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">省份/州</span>
                    <span class="ip-detail-value">${data.location.state}</span>
                </div>
                ` : ''}
                ${data.location.city ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">城市</span>
                    <span class="ip-detail-value">${data.location.city}</span>
                </div>
                ` : ''}
                ${data.location.zip ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">邮编</span>
                    <span class="ip-detail-value">${data.location.zip}</span>
                </div>
                ` : ''}
                ${data.location.latitude && data.location.longitude ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">坐标</span>
                    <span class="ip-detail-value">${data.location.latitude}, ${data.location.longitude}</span>
                </div>
                ` : ''}
                ${data.location.timezone ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">时区</span>
                    <span class="ip-detail-value">${data.location.timezone}</span>
                </div>
                ` : ''}
                ${data.location.local_time ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">当地时间</span>
                    <span class="ip-detail-value">${data.location.local_time}</span>
                </div>
                ` : ''}
                <div class="ip-detail-item">
                    <span class="ip-detail-label">欧盟成员</span>
                    <span class="ip-detail-value">${boolToEmoji(data.location.is_eu_member, '🇪🇺 是', '否')}</span>
                </div>
            </div>
        `;
    }

    // 运营商信息
    if (data.company) {
        const abuserScore = data.company.abuser_score || '未知';
        const badgeClass = getThreatBadgeClass(abuserScore);

        detailHTML += `
            <div class="ip-detail-section">
                <div class="ip-detail-section-title">🏢 运营商信息</div>
                <div class="ip-detail-item">
                    <span class="ip-detail-label">运营商名称</span>
                    <span class="ip-detail-value">${data.company.name || '未知'}</span>
                </div>
                ${data.company.domain ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">域名</span>
                    <span class="ip-detail-value">${data.company.domain}</span>
                </div>
                ` : ''}
                <div class="ip-detail-item">
                    <span class="ip-detail-label">类型</span>
                    <span class="ip-detail-value">${data.company.type || '未知'}</span>
                </div>
                ${data.company.network ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">网络范围</span>
                    <span class="ip-detail-value">${data.company.network}</span>
                </div>
                ` : ''}
                <div class="ip-detail-item">
                    <span class="ip-detail-label">滥用评分</span>
                    <span class="ip-detail-value"><span class="ip-detail-badge ${badgeClass}">${abuserScore}</span></span>
                </div>
            </div>
        `;
    }

    // ASN 信息
    if (data.asn) {
        const asnAbuserScore = data.asn.abuser_score || '未知';
        const asnBadgeClass = getThreatBadgeClass(asnAbuserScore);

        detailHTML += `
            <div class="ip-detail-section">
                <div class="ip-detail-section-title">🔢 ASN 信息</div>
                <div class="ip-detail-item">
                    <span class="ip-detail-label">ASN 编号</span>
                    <span class="ip-detail-value">AS${data.asn.asn || '未知'}</span>
                </div>
                ${data.asn.org ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">组织</span>
                    <span class="ip-detail-value">${data.asn.org}</span>
                </div>
                ` : ''}
                ${data.asn.route ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">路由</span>
                    <span class="ip-detail-value">${data.asn.route}</span>
                </div>
                ` : ''}
                ${data.asn.type ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">类型</span>
                    <span class="ip-detail-value">${data.asn.type}</span>
                </div>
                ` : ''}
                <div class="ip-detail-item">
                    <span class="ip-detail-label">滥用评分</span>
                    <span class="ip-detail-value"><span class="ip-detail-badge ${asnBadgeClass}">${asnAbuserScore}</span></span>
                </div>
                ${data.asn.country ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">国家代码</span>
                    <span class="ip-detail-value">${data.asn.country.toUpperCase()}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    // 滥用联系信息
    if (data.abuse) {
        detailHTML += `
            <div class="ip-detail-section">
                <div class="ip-detail-section-title">📧 滥用举报联系方式</div>
                ${data.abuse.name ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">联系人</span>
                    <span class="ip-detail-value">${data.abuse.name}</span>
                </div>
                ` : ''}
                ${data.abuse.email ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">邮箱</span>
                    <span class="ip-detail-value">${data.abuse.email}</span>
                </div>
                ` : ''}
                ${data.abuse.phone ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">电话</span>
                    <span class="ip-detail-value">${data.abuse.phone}</span>
                </div>
                ` : ''}
                ${data.abuse.address ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">地址</span>
                    <span class="ip-detail-value">${data.abuse.address}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    detailHTML += `</div>`;

    modal.innerHTML = detailHTML;

    // 点击背景关闭弹窗
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // ESC 键关闭弹窗和气泡
    const closeHandler = function (e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeHandler);
        }
    };
    document.addEventListener('keydown', closeHandler);

    document.body.appendChild(modal);
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
        url: 'https://lf3-zlink-tos.ugurl.cn/obj/zebra-public/resource_lmmizj_1632398893.png'
    },
    {
        name: 'Bilibili',
        region: '国内',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FB7299" d="M17.813 4.653h.854q2.266.08 3.773 1.574Q23.946 7.72 24 9.987v7.36q-.054 2.266-1.56 3.773c-1.506 1.507-2.262 1.524-3.773 1.56H5.333q-2.266-.054-3.773-1.56C.053 19.614.036 18.858 0 17.347v-7.36q.054-2.267 1.56-3.76t3.773-1.574h.774l-1.174-1.12a1.23 1.23 0 0 1-.373-.906q0-.534.373-.907l.027-.027q.4-.373.92-.373t.92.373L9.653 4.44q.107.106.187.213h4.267a.8.8 0 0 1 .16-.213l2.853-2.747q.4-.373.92-.373c.347 0 .662.151.929.4s.391.551.391.907q0 .532-.373.906zM5.333 7.24q-1.12.027-1.88.773q-.76.748-.786 1.894v7.52q.026 1.146.786 1.893t1.88.773h13.334q1.12-.026 1.88-.773t.786-1.893v-7.52q-.026-1.147-.786-1.894t-1.88-.773zM8 11.107q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q0-.56.386-.947q.387-.386.947-.386m8 0q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q.025-.586.4-.96q.373-.373.933-.373"></path></svg>',
        url: 'https://i0.hdslb.com/bfs/face/member/noface.jpg@24w_24h_1c'
    },
    {
        name: '微信',
        region: '国内',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#09B83E" d="M8.7 2.19C3.9 2.19 0 5.48 0 9.53c0 2.21 1.17 4.2 3 5.55a.6.6 0 0 1 .21.66l-.39 1.48q-.03.11-.04.22c0 .16.13.3.29.3a.3.3 0 0 0 .16-.06l1.9-1.11a.9.9 0 0 1 .72-.1 10 10 0 0 0 2.84.4q.41-.01.81-.05a5.85 5.85 0 0 1 1.93-6.45 8.3 8.3 0 0 1 5.86-1.83c-.58-3.59-4.2-6.35-8.6-6.35m-2.9 3.8c.64 0 1.16.53 1.16 1.18a1.17 1.17 0 0 1-1.16 1.18 1.17 1.17 0 0 1-1.17-1.18c0-.65.52-1.18 1.17-1.18m5.8 0c.65 0 1.17.53 1.17 1.18a1.17 1.17 0 0 1-1.16 1.18 1.17 1.17 0 0 1-1.16-1.18c0-.65.52-1.18 1.16-1.18m5.34 2.87a8 8 0 0 0-5.28 1.78 5.5 5.5 0 0 0-1.78 6.22c.94 2.46 3.66 4.23 6.88 4.23q1.25 0 2.36-.33a.7.7 0 0 1 .6.08l1.59.93.14.04c.13 0 .24-.1.24-.24q-.01-.09-.04-.18l-.33-1.23-.02-.16a.5.5 0 0 1 .2-.4 5.8 5.8 0 0 0 2.5-4.62c0-3.21-2.93-5.84-6.66-6.09zm-2.53 3.27c.53 0 .97.44.97.98a1 1 0 0 1-.97.99 1 1 0 0 1-.97-.99c0-.54.43-.98.97-.98zm4.84 0c.54 0 .97.44.97.98a1 1 0 0 1-.97.99 1 1 0 0 1-.97-.99c0-.54.44-.98.97-.98"></path></svg>',
        url: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico'
    },
    {
        name: '淘宝',
        region: '国内',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#E16322" d="M21.31 9.9a3 3 0 1 1 0 1.92.96.96 0 0 1 0-1.92m2.39 3.05H13.3v-.96h4.14V9.76h-2.89v-.77h2.9v-.92h-2.52v.2H13.3v-2.9h1.64v.35l2.52-.3V4.6h1.85v.64c.93-.08 1.76-.13 2.21-.1 1.5.06 2.45.27 2.49 1.26.03 1-1.43 1.9-1.43 1.9l-.45-.43v.2h-2.8v.92h3.22v.77h-3.23v2.23h4.39zM21.53 7.3l-.02-.01s1.38-.76.35-1.27c-.87-.43-5.54.3-6.93.62v.66zM1.88 6.42a1 1 0 0 0 0-2 1 1 0 0 0-1 1 1 1 0 0 0 1 1m3.41-.86a7 7 0 0 0 .37-.72L4.2 4.42s-.6 1.93-1.65 2.83c0 0 1.02.6 1.01.58a10 10 0 0 0 .78-.88l.68-.3a9 9 0 0 1-1.14 1.69l.61.54s.42-.4.88-.9h.53v.9H3.86v.73H5.9v1.72h-.08c-.23-.01-.58-.05-.71-.27-.17-.26-.05-.75-.04-1.04h-1.4l-.06.02s-.52 2.32 1.5 2.27a5.3 5.3 0 0 0 3.46-.92l.2.76 1.17-.48-.79-1.92-.94.3.18.65a3 3 0 0 1-.82.42V9.6h2v-.72h-2v-.9h2v-.72H6.01c.26-.31.46-.6.51-.78l-.62-.17c2.67-.95 4.15-.79 4.13.77v4.12s.16 1.4-1.46 1.3l-.87-.18-.21.83s3.78 1.08 4.1-1.82-.09-4.76-.09-4.76-.34-2.68-6.2-1.02zm-5.23 6.6 1.58.98c1.1-2.38 1.03-2.06 1.3-2.92.29-.87.35-1.54-.13-2.02a10 10 0 0 0-1.6-1.36L.55 7.86l1.21.75s.82.42.43 1.2c-.36.73-2.13 2.34-2.13 2.34M20 19s-.02.53-.67.53c-.6 0-.64-.42-.64-.42q-.39.45-1.07.46c-.76 0-1.3-.51-1.3-1.3 0-.78.56-1.27 1.4-1.27.39 0 .73.15.93.4l.01-.2c0-.56-.3-.8-1-.8q-.51 0-1.02.13.16-.33.3-.45.18-.14.94-.14c1.27 0 1.74.42 1.74 1.42v1.2c0 .32.03.44.38.44m-1.33-.74c0-.48-.25-.75-.64-.75-.4 0-.66.28-.66.76 0 .47.27.76.65.76.39 0 .65-.27.65-.77m5.27-.5c0 1.15-.7 1.82-1.78 1.82-1.1 0-1.77-.67-1.77-1.82 0-1.16.68-1.83 1.77-1.83s1.78.67 1.78 1.83m-1.08 0q0-1.3-.7-1.3t-.69 1.3.7 1.3.69-1.3m-7.14-.05c0 1.17-.65 1.86-1.57 1.86q-.66-.01-1.05-.47s-.1.42-.66.42c-.69 0-.67-.52-.67-.52.4.02.38-.21.38-.43v-2.89c0-.36-.07-.48-.43-.49.02-.1.08-.53.68-.53.82 0 .76.91.76.91v.79q.34-.4 1-.4c.96 0 1.56.65 1.56 1.75m-1.09.08q-.01-1.35-.76-1.35c-.44 0-.74.4-.74 1.1v.36c0 .72.31 1.12.76 1.12q.73 0 .74-1.23m-3.24-.03c0 1.15-.7 1.82-1.78 1.82-1.1 0-1.78-.67-1.78-1.82 0-1.16.68-1.83 1.78-1.83s1.78.67 1.78 1.83m-1.09 0q0-1.3-.7-1.3-.69 0-.68 1.3t.69 1.3q.7 0 .7-1.3m-6-2.72q-.4.11-1.55.1-1.38-.02-1.85-.04c-.52 0-.73.13-.91.66q.45-.13 1.13-.11c.36 0 .42.04.42.3v2.9c0 .28.11.67.72.67.71 0 .84-.52.84-.52-.36 0-.43-.13-.43-.49v-2.56c0-.27.1-.28.47-.28h.26c.55 0 .7-.1.9-.63M7.46 19s-.02.52-.67.52c-.56 0-.64-.4-.64-.4q-.39.45-1.07.45c-.76 0-1.3-.52-1.3-1.3S4.33 17 5.17 17c.39 0 .73.14.93.4v-.2c0-.56-.3-.8-1-.8q-.5 0-1.01.13.15-.33.3-.46.17-.14.94-.14c1.26 0 1.74.43 1.74 1.43v1.2c0 .32.03.44.38.44m-1.33-.75c0-.48-.26-.74-.64-.74-.4 0-.67.28-.67.76 0 .46.28.76.66.76.39 0 .65-.28.65-.78m5.27-.5c0 1.15-.7 1.82-1.78 1.82-1.1 0-1.77-.67-1.77-1.82 0-1.16.68-1.83 1.77-1.83s1.78.67 1.78 1.83m-1.08 0q0-1.3-.7-1.3t-.69 1.3.7 1.3.69-1.3m-7.14-.05c0 1.17-.65 1.86-1.57 1.86q-.66-.01-1.05-.47s-.1.42-.66.42c-.69 0-.67-.52-.67-.52.4.02.38-.21.38-.43v-2.89c0-.36-.07-.48-.43-.49.02-.1.08-.53.68-.53.82 0 .76.91.76.91v.79q.34-.4 1-.4c.96 0 1.56.65 1.56 1.75m-1.09.08q-.01-1.35-.76-1.35c-.44 0-.74.4-.74 1.1v.36c0 .72.31 1.12.76 1.12q.73 0 .74-1.23m-3.24-.03c0 1.15-.7 1.82-1.78 1.82-1.1 0-1.78-.67-1.78-1.82 0-1.16.68-1.83 1.78-1.83s1.78.67 1.78 1.83m-1.09 0q0-1.3-.7-1.3-.69 0-.68 1.3t.69 1.3q.7 0 .7-1.3m-6-2.72q-.4.11-1.55.1-1.38-.02-1.85-.04c-.52 0-.73.13-.91.66q.45-.13 1.13-.11c.36 0 .42.04.42.3v2.9c0 .28.11.67.72.67.71 0 .84-.52.84-.52-.36 0-.43-.13-.43-.49v-2.56c0-.27.1-.28.47-.28h.26c.55 0 .7-.1.9-.63M7.46 19s-.02.52-.67.52c-.56 0-.64-.4-.64-.4q-.39.45-1.07.45c-.76 0-1.3-.52-1.3-1.3S4.33 17 5.17 17c.39 0 .73.14.93.4v-.2c0-.56-.3-.8-1-.8q-.5 0-1.01.13.15-.33.3-.46.17-.14.94-.14c1.26 0 1.74.43 1.74 1.43v1.2c0 .32.03.44.38.44m-1.33-.75c0-.48-.26-.74-.64-.74-.4 0-.67.28-.67.76 0 .46.28.76.66.76.39 0 .65-.28.65-.78"></path></svg>',
        url: 'https://img.alicdn.com/imgextra/i2/O1CN01qnQCrN1VkzAWiU4Hs_!!6000000002692-2-tps-33-33.png'
    },
    {
        name: 'GitHub',
        region: '国际',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.7 4.7 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"></path></svg>',
        url: 'https://github.github.io/janky/images/bg_hr.png'
    },
    {
        name: 'jsDelivr',
        region: '国际',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#F0DB4F" d="M11.85 0 .81 4.02l1.56 14.7L11.85 24l9.6-5.28 1.74-14.76zm.06 4.62a6.67 6.75 0 0 1 2.67.57 13 13 0 0 0-2.6 1.95l-.13-.04a1 1 0 0 0-.34-.06l-.21.02a9 9 0 0 1-.62-2.31 6.67 6.75 0 0 1 1.17-.13 6.67 6.75 0 0 1 .06 0m-1.99.31a10 10 0 0 0 .7 2.5 1.2 1.2 0 0 0-.34.83 1 1 0 0 0 .18.63c-.93 1.3-1.65 2.8-1.9 4.31l-.02.17q-.43.14-.66.54a5 5 0 0 1-2.61-2.02 6.67 6.75 0 0 1-.03-.52 6.67 6.75 0 0 1 4.68-6.44m5.51.71a6.67 6.75 0 0 1 2.53 2.9 8 8 0 0 1-1.9 2.73 1.2 1.2 0 0 0-.64-.18 1.2 1.2 0 0 0-.77.27 11 11 0 0 1-1.31-1.17 11 11 0 0 1-.92-1.13q.3-.32.3-.8a1 1 0 0 0-.15-.58 12 12 0 0 1 2.86-2.04M11.5 7.63a.6.6 0 0 1 .35.1.6.6 0 0 1 .3.53.6.6 0 0 1-.3.53.6.6 0 0 1-.35.11.63.63 0 0 1-.63-.64c0-.35.28-.64.63-.64m-.44 1.78a1.2 1.2 0 0 0 .68.06l.11.15a11 11 0 0 0 .92 1.11A12 12 0 0 0 14.22 12q-.05.17-.06.34a1 1 0 0 0 .07.38 10 10 0 0 1-2.12 1.05l-.26.07a8 8 0 0 1-1.87.34 1.2 1.2 0 0 0-.66-.78l.01-.07a10 10 0 0 1 1.73-3.93m7.28.19a6.67 6.75 0 0 1 .24 1.78 6.67 6.75 0 0 1-.26 1.86 10 10 0 0 1-1.66-.63 1.2 1.2 0 0 0-.07-.72 9 9 0 0 0 1.75-2.3m-2.92 2.1c.37 0 .66.29.66.65a.66.66 0 1 1-1.32 0c0-.36.3-.65.66-.65m.84 1.59a11 11 0 0 0 1.8.68 6.67 6.75 0 0 1-6.15 4.16 6.67 6.75 0 0 1-.06 0 6.67 6.75 0 0 1-.04 0l-.27-.13a5 5 0 0 1-.84-.5 3.8 3.8 0 0 1-1.3-2.03q.32-.17.49-.5a8 8 0 0 0 1.96-.3l.51-.16a11 11 0 0 0 2.34-1.13q.31.23.72.23a1.3 1.3 0 0 0 .84-.32m-10.7.11a6 6 0 0 0 2.2 1.3 1.2 1.2 0 0 0 .86.87 4.6 4.6 0 0 0 1.24 2.22 6.67 6.75 0 0 1-4.3-4.39zm3.32.47c.33 0 .6.26.6.6s-.27.59-.6.59a.6.6 0 0 1-.6-.6.6.6 0 0 1 .6-.6"></path></svg>',
        url: 'https://cdn.jsdelivr.net/npm/latency-test@1.0.1/smallest-possible-white.gif'
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

// 测试延迟
async function testLatency(site) {
    const start = Date.now();
    try {
        const response = await fetch(site.url + '?t=' + Date.now(), {
            method: 'HEAD',
            cache: 'no-cache',
            mode: 'no-cors',
            referrerPolicy: 'no-referrer'
        });
        const latency = Date.now() - start;
        return latency;
    } catch (error) {
        // HEAD 请求失败，尝试 GET 请求
        try {
            const start2 = Date.now();
            const response = await fetch(site.url + '?t=' + Date.now(), {
                method: 'GET',
                cache: 'no-cache',
                mode: 'no-cors',
                referrerPolicy: 'no-referrer'
            });
            const latency = Date.now() - start2;
            return latency;
        } catch (error2) {
            return -1; // 连接失败
        }
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

// 页面加载时开始延迟测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLatencyTest);
} else {
    startLatencyTest();
}