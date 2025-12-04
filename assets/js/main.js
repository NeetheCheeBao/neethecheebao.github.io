(function(){
  const root = document.documentElement;
  let t = 0;
  function loop(){
    t += 0.0035;
    const r1 = Math.sin(t) * 45 + 220;
    const g1 = Math.sin(t + 1.1) * 60 + 120;
    const b1 = Math.sin(t + 2.2) * 60 + 180;
    root.style.setProperty('--accent1', `rgb(${Math.floor(r1)},${Math.floor(g1)},${Math.floor(b1)})`);
    const hue = Math.floor((t * 40) % 360);
    // 博客卡片边框动画
    document.querySelectorAll('.post').forEach((p,i)=>{
      p.style.borderImage = `linear-gradient(90deg, hsl(${(hue + i*20)%360} 90% 60%), hsl(${(hue + i*40)%360} 80% 50%)) 1`;
    });
  
    // 新增：分页按钮边框动画（与博客卡片保持一致）
    document.querySelectorAll('.pagination-btn:not(.disabled)').forEach((btn,i)=>{
      btn.style.backgroundImage = `
        linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)),
        linear-gradient(90deg, hsl(${(hue + i*10)%360} 90% 60%), hsl(${(hue + i*30)%360} 80% 50%))
      `;
    });
    
    requestAnimationFrame(loop);
  }
  loop();
  document.querySelectorAll('.logo, .nav-btn, .btn').forEach(el=>{
    el.addEventListener('mouseenter', ()=>navigator.vibrate?.(8));
  });
})();

const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');

let DPR = Math.max(window.devicePixelRatio || 1, 1);
function resize(){
  DPR = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor(window.innerHeight * DPR);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', resize);
resize();

const config = { spacing:36, speed:0.9, amplitude:48, perspective:1.6, hueSpeed:18, lineWidth:1.4 };
let start = performance.now();

function draw(t){
  const time = (t-start)/1000 * config.speed;
  const W = canvas.width/DPR; const H = canvas.height/DPR;
  ctx.clearRect(0,0,W,H);
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgba(5,2,20,0.95)'); g.addColorStop(0.6,'rgba(6,2,12,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  const vx = W/2, vy = H*0.78;
  const spacing = Math.max(20, Math.min(config.spacing, W / 40 * 1.6));
  const cols = Math.ceil(W/spacing)+6;
  ctx.lineCap='round';

  for(let i=-3;i<=cols;i++){
    const x = i*spacing; ctx.beginPath(); const samples = 120;
    for(let s=0;s<=samples;s++){
      const tnorm = s/samples; const px = x + (vx-x)*tnorm; const py = H + (vy-H)*tnorm;
      const depth = tnorm; const freq = 1.6 + depth*2.6;
      const phase = (i*0.4) + depth*3.5 - time*freq; const wave = Math.sin(phase) * config.amplitude * Math.pow(1-depth, config.perspective);
      const drawX = px; const drawY = py + wave;
      if(s===0) ctx.moveTo(drawX,drawY); else ctx.lineTo(drawX,drawY);
    }
    const hueBase = (i*16 + time*config.hueSpeed) % 360;
    const grad = ctx.createLinearGradient(0,H,0,vy);
    grad.addColorStop(0, `hsla(${(hueBase+20)%360},90%,55%,0.12)`);
    grad.addColorStop(0.5, `hsla(${(hueBase+120)%360},85%,55%,0.22)`);
    grad.addColorStop(1, `hsla(${(hueBase+260)%360},85%,60%,0.38)`);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth = config.lineWidth*3.6; ctx.strokeStyle=grad; ctx.globalAlpha=0.08; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.lineWidth = config.lineWidth; ctx.strokeStyle = grad; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.restore();
  }

  const horizonCount = 28;
  for(let j=0;j<horizonCount;j++){
    const depth = j/(horizonCount-1); const py = H + (vy-H)*(depth);
    ctx.beginPath(); const samples = 220;
    for(let s=0;s<=samples;s++){
      const t = s/samples; const x = -spacing*2 + t*(W+spacing*4);
      const phase = t*12 + depth*4 + time*1.8; const wave = Math.sin(phase - t*2.2) * config.amplitude * Math.pow(1-depth, config.perspective) * 0.8;
      const y = py + wave; if(s===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    const hue = (time*12 + j*8) % 360; ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth = (1 + Math.pow(1-depth,2.6)*2.6);
    const grad = ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0, `hsla(${(hue+40)%360},85%,60%,0.09)`);
    grad.addColorStop(0.5, `hsla(${(hue+160)%360},85%,60%,0.14)`);
    grad.addColorStop(1, `hsla(${(hue+280)%360},85%,60%,0.09)`);
    ctx.strokeStyle = grad; ctx.globalAlpha = 0.12 + Math.pow(1-depth,2) * 0.6; ctx.stroke(); ctx.restore();
  }

  const sunRadius = Math.min(W,H) * 0.18; const sunX = vx; const sunY = vy - Math.min(H*0.06,40);
  const sg = ctx.createRadialGradient(sunX,sunY,sunRadius*0.02,sunX,sunY,sunRadius);
  sg.addColorStop(0,'rgba(255,120,200,0.28)'); sg.addColorStop(0.45,'rgba(255,80,180,0.06)'); sg.addColorStop(1,'rgba(255,80,180,0)');
  ctx.fillStyle = sg; ctx.fillRect(sunX-sunRadius,sunY-sunRadius,sunRadius*2,sunRadius*2);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);


// 全局变量存储所有博客数据和分页状态
let allPosts = []; // 存储所有博客HTML
let currentPage = 1; // 当前页码
const postsPerPage = 6; // 每页最多6个

async function loadBlogPosts() {
  const container = document.getElementById('posts-container');
  if (!container) return;

  try {
    // 1. 先加载博客索引，获取所有文件名
    const indexResponse = await fetch('posts/index.json');
    if (!indexResponse.ok) throw new Error('无法获取博客列表');
    const postFileNames = await indexResponse.json();

    // 2. 加载所有博客内容，暂存到 allPosts 数组
    allPosts = []; // 清空旧数据
    for (const fileName of postFileNames) {
      const postResponse = await fetch(`posts/${fileName}`);
      if (postResponse.ok) {
        allPosts.push(await postResponse.text());
      }
    }

    // 3. 初始化第一页内容和分页按钮
    renderPage(1);

  } catch (error) {
    console.error('加载博客失败:', error);
    container.innerHTML = '<p>加载博客时出错，请稍后再试</p>';
  }
}

// 渲染指定页码的博客内容
function renderPage(pageNum) {
  const container = document.getElementById('posts-container');
  // 计算当前页的博客范围（数组索引）
  const startIndex = (pageNum - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = allPosts.slice(startIndex, endIndex); // 截取当前页的博客

  // 清空容器并添加当前页的博客
  container.innerHTML = currentPosts.join('');

  // 更新当前页码并重新生成分页按钮
  currentPage = pageNum;
  renderPagination();
}

// 生成分页按钮（含上一页/下一页和精简显示）
function renderPagination() {
  const paginationContainer = document.getElementById('pagination');
  const totalPages = Math.ceil(allPosts.length / postsPerPage);
  if (totalPages <= 1) {
    paginationContainer.innerHTML = ''; // 只有1页时不显示分页
    return;
  }

  paginationContainer.innerHTML = ''; // 清空旧内容

  // 1. 添加“上一页”按钮（文字替换箭头）
  const prevBtn = document.createElement('span');
  prevBtn.className = `pagination-btn pagination-prev ${currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.textContent = '上一页'; // 改为文字显示
  prevBtn.disabled = currentPage === 1; // 第一页时禁用
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) renderPage(currentPage - 1);
  });
  paginationContainer.appendChild(prevBtn);

  // 2. 生成页码（只显示当前页附近的页码，避免过多）
  const visibleRange = 2; // 当前页前后显示2个页码
  for (let i = 1; i <= totalPages; i++) {
    // 始终显示第一页、最后一页，以及当前页附近的页码
    if (
      i === 1 || 
      i === totalPages || 
      (i >= currentPage - visibleRange && i <= currentPage + visibleRange)
    ) {
      // 显示正常页码
      const btn = document.createElement('span');
      btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => renderPage(i));
      paginationContainer.appendChild(btn);
    } else if (
      // 只在需要时显示省略号（避免连续省略）
      (i === currentPage - visibleRange - 1 && currentPage - visibleRange > 2) ||
      (i === currentPage + visibleRange + 1 && currentPage + visibleRange < totalPages - 1)
    ) {
      // 显示省略号（不可点击）
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      paginationContainer.appendChild(ellipsis);
    }
  }

  // 3. 添加“下一页”按钮（文字替换箭头）
  const nextBtn = document.createElement('span');
  nextBtn.className = `pagination-btn pagination-next ${currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.textContent = '下一页'; // 改为文字显示
  nextBtn.disabled = currentPage === totalPages; // 最后一页时禁用
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) renderPage(currentPage + 1);
  });
  paginationContainer.appendChild(nextBtn);
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', loadBlogPosts);