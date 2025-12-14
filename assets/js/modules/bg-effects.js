export function initBackgroundEffects() {
  const root = document.documentElement;
  let t = 0;
  function loop(){
    t += 0.0035;
    const r1 = Math.sin(t) * 45 + 220;
    const g1 = Math.sin(t + 1.1) * 60 + 120;
    const b1 = Math.sin(t + 2.2) * 60 + 180;
    root.style.setProperty('--accent1', `rgb(${Math.floor(r1)},${Math.floor(g1)},${Math.floor(b1)})`);
    const hue = Math.floor((t * 40) % 360);
    
    document.querySelectorAll('.post').forEach((p,i)=>{
      p.style.borderImage = `linear-gradient(90deg, hsl(${(hue + i*20)%360} 90% 60%), hsl(${(hue + i*40)%360} 80% 50%)) 1`;
    });
  
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
}