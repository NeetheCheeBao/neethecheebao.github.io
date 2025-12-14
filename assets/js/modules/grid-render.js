export function initGridCanvas() {
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
}