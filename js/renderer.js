// renderer.js V2 — splash & game-over animated canvas

function rand(a,b){ return Math.random()*(b-a)+a; }
const TWO_PI = Math.PI*2;

class FloatBubble {
  constructor(w,h,scatter){ this.w=w;this.h=h;this.reset(scatter); }
  reset(scatter){ this.x=rand(0,this.w);this.y=scatter?rand(0,this.h):this.h+rand(10,50);this.r=rand(3,10);this.vx=rand(-0.3,0.3);this.vy=-rand(0.5,1.8);this.alpha=rand(0.12,0.45);this.wobble=rand(0,TWO_PI);this.wobbleSpd=rand(1.2,3.0); }
  update(dt){ this.wobble+=this.wobbleSpd*dt;this.x+=(Math.sin(this.wobble)*0.35+this.vx)*dt*60;this.y+=this.vy*dt*60;if(this.y<-20)this.reset(false);if(this.x<-10)this.x+=this.w+20;if(this.x>this.w+10)this.x-=this.w+20; }
  draw(ctx){ ctx.save();ctx.globalAlpha=this.alpha;ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,TWO_PI);ctx.strokeStyle='rgba(180,230,255,0.9)';ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle='rgba(180,230,255,0.08)';ctx.fill();ctx.restore(); }
}

class DecoFish {
  constructor(w,h,i){ this.w=w;this.h=h;const colors=['#4fc3f7','#26c6da','#7e57c2','#ffb300','#ef5350','#aed581','#e040fb','#00e5ff'];this.color=colors[i%colors.length];this.reset(); }
  reset(){ const d=Math.random()<0.5?1:-1;this.dir=d;this.x=d>0?-rand(20,120):this.w+rand(20,120);this.y=rand(this.h*0.08,this.h*0.92);this.spd=rand(55,140)*d;this.r=rand(8,28);this.angle=d>0?0:Math.PI;this.tail=0;this.bob=rand(0,TWO_PI);this.bobSpd=rand(0.5,1.5);this.alpha=rand(0.35,0.9); }
  update(dt){ this.x+=this.spd*dt;this.tail+=5*dt;this.bob+=this.bobSpd*dt;this.y+=Math.sin(this.bob)*0.5;if(this.dir>0&&this.x>this.w+150)this.reset();if(this.dir<0&&this.x<-150)this.reset(); }
  draw(ctx){ const{x,y,r,angle,tail,color,alpha}=this;const wag=Math.sin(tail)*0.4;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-r*0.55,0);ctx.lineTo(-r*1.7,-r*0.7+wag*r*0.5);ctx.lineTo(-r*0.85,0);ctx.lineTo(-r*1.7,r*0.7+wag*r*0.5);ctx.closePath();ctx.fill();ctx.beginPath();ctx.ellipse(0,0,r,r*0.55,0,0,TWO_PI);ctx.fill();ctx.fillStyle='#0d1b2a';ctx.beginPath();ctx.arc(r*0.45,-r*0.18,r*0.18,0,TWO_PI);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.75)';ctx.beginPath();ctx.arc(r*0.39,-r*0.24,r*0.07,0,TWO_PI);ctx.fill();ctx.restore(); }
}

export class SplashRenderer {
  constructor(canvas){ this.canvas=canvas;this.ctx=canvas.getContext('2d');this._raf=null;this._last=0;this._t=0;this._resize();const w=canvas.width,h=canvas.height;this._bubbles=Array.from({length:65},()=>new FloatBubble(w,h,true));this._fish=Array.from({length:12},(_,i)=>new DecoFish(w,h,i)); }
  _resize(){ this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight; }
  start(){ this._last=performance.now();this._raf=requestAnimationFrame(t=>this._loop(t)); }
  stop(){ if(this._raf){cancelAnimationFrame(this._raf);this._raf=null;} }
  _loop(now){ const dt=Math.min((now-this._last)/1000,0.05);this._last=now;this._t+=dt;for(const b of this._bubbles)b.update(dt);for(const f of this._fish)f.update(dt);this._draw();this._raf=requestAnimationFrame(t=>this._loop(t)); }
  _draw(){
    const{ctx,canvas}=this;const w=canvas.width,h=canvas.height;
    const grad=ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,'#0a2444');grad.addColorStop(0.45,'#081a30');grad.addColorStop(1,'#040d18');
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    // Colorful light beams
    const beamColors=['rgba(0,229,255,','rgba(224,64,251,','rgba(105,240,174,'];
    for(let i=0;i<3;i++){
      ctx.save();ctx.globalAlpha=0.05+Math.sin(this._t*0.4+i*2)*0.02;
      const bg=ctx.createLinearGradient(w*(0.3+i*0.2),0,w*(0.3+i*0.2),h*0.75);
      bg.addColorStop(0,beamColors[i]+'0.9)');bg.addColorStop(1,beamColors[i]+'0)');
      ctx.fillStyle=bg;ctx.beginPath();
      ctx.moveTo(w*(0.25+i*0.2),0);ctx.lineTo(w*(0.35+i*0.2),0);
      ctx.lineTo(w*(0.55+i*0.18),h*0.75);ctx.lineTo(w*(0.15+i*0.18),h*0.75);
      ctx.closePath();ctx.fill();ctx.restore();
    }
    for(const f of this._fish)f.draw(ctx);
    for(const b of this._bubbles)b.draw(ctx);
    const vig=ctx.createRadialGradient(w/2,h/2,h*0.25,w/2,h/2,h*0.9);
    vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,0.60)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,w,h);
  }
}

export class GameOverRenderer {
  constructor(canvas){ this.canvas=canvas;this.ctx=canvas.getContext('2d');this._raf=null;this._last=0;this._t=0;canvas.width=window.innerWidth;canvas.height=window.innerHeight;const w=canvas.width,h=canvas.height;this._bubbles=Array.from({length:30},()=>new FloatBubble(w,h,true));this._pts=Array.from({length:55},()=>({x:rand(0,w),y:rand(0,h),vx:rand(-0.3,0.3),vy:rand(-0.6,0.15),r:rand(1,3.5),alpha:rand(0.08,0.28),phase:rand(0,TWO_PI)})); }
  start(){ this._last=performance.now();this._raf=requestAnimationFrame(t=>this._loop(t)); }
  stop(){ if(this._raf){cancelAnimationFrame(this._raf);this._raf=null;} }
  _loop(now){ const dt=Math.min((now-this._last)/1000,0.05);this._last=now;this._t+=dt;const w=this.canvas.width,h=this.canvas.height;for(const b of this._bubbles)b.update(dt);for(const p of this._pts){p.phase+=dt*1.5;p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;if(p.y<-10||p.x<-10||p.x>w+10){p.x=rand(0,w);p.y=h+rand(5,30);p.vx=rand(-0.3,0.3);p.vy=-rand(0.3,0.9);}}this._draw();this._raf=requestAnimationFrame(t=>this._loop(t)); }
  _draw(){
    const{ctx,canvas}=this;const w=canvas.width,h=canvas.height;
    const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#040d18');grad.addColorStop(1,'#020509');
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalAlpha=0.12+Math.sin(this._t*1.2)*0.06;
    const rg=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,h*0.65);
    rg.addColorStop(0,'#b71c1c');rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rg;ctx.fillRect(0,0,w,h);ctx.restore();
    ctx.save();for(const p of this._pts){ctx.globalAlpha=p.alpha*(0.6+Math.sin(p.phase)*0.4);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TWO_PI);ctx.fillStyle='#3a5f80';ctx.fill();}ctx.restore();
    for(const b of this._bubbles)b.draw(ctx);
    const vig=ctx.createRadialGradient(w/2,h/2,h*0.15,w/2,h/2,h*0.9);
    vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,0.80)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,w,h);
  }
}
