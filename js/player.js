// player.js V3 — full player with skins, mutations, shop upgrades, combo, magnet, regen
import { lerp, lerpAngle, clamp, TWO_PI, rand } from './utilities.js';
import { getSkin } from './skins.js';

export const EVO_SHARED = [
  { name:'Tiny Fish',  minLevel:1,  radius:10, speed:3.1, color:'#4fc3f7', fin:'#29b6f6', eye:3.0, tailSz:0.9, maxHP:80  },
  { name:'Small Fish', minLevel:3,  radius:14, speed:3.0, color:'#26c6da', fin:'#00acc1', eye:3.5, tailSz:1.0, maxHP:110 },
  { name:'River Fish', minLevel:6,  radius:19, speed:2.9, color:'#29b6f6', fin:'#0288d1', eye:4.0, tailSz:1.1, maxHP:145 },
];
export const EVO_PREDATOR = [
  { name:'Barracuda',   minLevel:10, radius:26, speed:3.6, color:'#7e57c2', fin:'#5e35b1', eye:4.5, tailSz:1.3, maxHP:185, skillName:'Frenzy',    skillDesc:'Speed x2 for 3s',       skillCooldown:12 },
  { name:'Tiger Shark', minLevel:15, radius:34, speed:3.4, color:'#ef5350', fin:'#c62828', eye:5.0, tailSz:1.5, maxHP:260, skillName:'Rampage',   skillDesc:'Damage aura 4s',        skillCooldown:14 },
  { name:'Hammerhead',  minLevel:21, radius:43, speed:3.2, color:'#546e7a', fin:'#37474f', eye:5.5, tailSz:1.7, maxHP:340, skillName:'Sonar',     skillDesc:'Reveal & stun nearby',  skillCooldown:16 },
  { name:'Great White', minLevel:28, radius:54, speed:3.3, color:'#78909c', fin:'#546e7a', eye:6.0, tailSz:1.9, maxHP:460, skillName:'Death Roll',skillDesc:'Massive burst damage',  skillCooldown:18 },
  { name:'Megalodon',   minLevel:36, radius:72, speed:2.9, color:'#1a237e', fin:'#0d47a1', eye:8.0, tailSz:2.3, maxHP:640, skillName:'Apex Roar', skillDesc:'Fear all enemies 5s',   skillCooldown:22 },
];
export const EVO_TOXIN = [
  { name:'Puffer Fish', minLevel:10, radius:24, speed:2.8, color:'#ffb300', fin:'#ff8f00', eye:5.0, tailSz:1.1, maxHP:200, skillName:'Inflate',      skillDesc:'Repel & poison near',  skillCooldown:10 },
  { name:'Lionfish',    minLevel:15, radius:30, speed:2.7, color:'#e91e63', fin:'#880e4f', eye:4.5, tailSz:1.3, maxHP:280, skillName:'Venom Cloud',  skillDesc:'Poison area 4s',       skillCooldown:12 },
  { name:'Stonefish',   minLevel:21, radius:38, speed:2.5, color:'#8d6e63', fin:'#5d4037', eye:4.0, tailSz:1.2, maxHP:380, skillName:'Camouflage',  skillDesc:'Invisible 3s',         skillCooldown:14 },
  { name:'Mantaray',    minLevel:28, radius:50, speed:3.0, color:'#26a69a', fin:'#00796b', eye:5.5, tailSz:1.8, maxHP:500, skillName:'Shockwave',   skillDesc:'Electric burst stun',  skillCooldown:16 },
  { name:'Leviathan',   minLevel:36, radius:68, speed:2.7, color:'#4a148c', fin:'#6a1b9a', eye:8.0, tailSz:2.2, maxHP:680, skillName:'Ancient Curse',skillDesc:'Drain life nearby',   skillCooldown:20 },
];
export const PATHS = { predator:EVO_PREDATOR, toxin:EVO_TOXIN };
export const PATH_BRANCH_LEVEL = 10;

const XP_PER_LEVEL = lvl => Math.floor(55+lvl*40);
const BASE_BOOST_SPD=1.85, BASE_BOOST_DUR=0.32, BASE_BOOST_CD=1.4, INV_TIME=1.8;

export class Player {
  constructor(x,y,path='predator'){
    this.x=x; this.y=y; this.vx=0; this.vy=0;
    this.level=1; this.xp=0; this.xpToNext=XP_PER_LEVEL(1);
    this.score=0; this.coins=0;
    this.path=path; this.evoIndex=0; this._inShared=true;
    // Mutation multipliers
    this._mutSpeedMult=1; this._mutDmgReduce=0; this._mutMagnet=0;
    this._mutXpMult=1; this._mutRegen=0; this._mutCoinMult=1;
    this._mutBoostCdMult=1; this._mutScoreMult=1; this._mutThorns=0;
    this._mutSkillCdMult=1;
    // Shop upgrades
    this._shopSpeedMult=1; this._shopXpMult=1; this._shopMagnet=0;
    this._shopBoostCdMult=1; this._shopCoinMult=1;
    // Skin
    this._skinId='default';
    this._applyEvo();
    this.hp=this.maxHP;
    this.angle=0; this.tailPhase=0; this.bobPhase=rand(0,TWO_PI);
    this._boosting=false; this._boostTimer=0; this._boostCD=0;
    this._skillCD=0; this._skillActive=false; this._skillTimer=0; this._skillEffect=null;
    this._invTimer=0; this._flashTimer=0; this._deathTimer=0;
    this.isDead=false; this._pop=0; this._scale=1;
    this.distTraveled=0; this._prevX=x; this._prevY=y;
    this.fishEaten=0; this.bossKilled=0;
    this._mutations=[];
    this._rainbowPhase=0;
    this._regenTimer=0;
  }

  setSkin(id){ this._skinId=id; const sk=getSkin(id); this._skinColor=sk.color; this._skinFin=sk.fin; this._skinGlow=sk.glow; }

  _getEvoArray(){ return this._inShared ? EVO_SHARED : (PATHS[this.path]||EVO_PREDATOR); }

  _applyEvo(){
    const arr=this._getEvoArray(); const e=arr[this.evoIndex]||arr[arr.length-1];
    this.radius=e.radius; this.speed=e.speed;
    this.color=this._skinColor||e.color; this.fin=this._skinFin||e.fin;
    this.eyeR=e.eye; this.tailSz=e.tailSz; this.maxHP=e.maxHP; this.evoName=e.name;
    this.skillName=e.skillName||null; this.skillDesc=e.skillDesc||''; this.skillCooldown=e.skillCooldown||15;
  }

  get evoProgress(){
    const arr=this._getEvoArray();
    if(this.evoIndex>=arr.length-1) return 1;
    const cur=arr[this.evoIndex],next=arr[this.evoIndex+1];
    return clamp((this.level-cur.minLevel)/(next.minLevel-cur.minLevel),0,1);
  }
  get isMaxEvo(){ if(this._inShared) return false; return this.evoIndex>=(PATHS[this.path]||EVO_PREDATOR).length-1; }
  needsPathChoice(){ return this._inShared&&this.evoIndex>=EVO_SHARED.length-1&&this.level>=PATH_BRANCH_LEVEL; }

  choosePath(path){ this.path=path; this._inShared=false; this.evoIndex=0; this._applyEvo(); this.hp=Math.min(this.hp+Math.floor(this.maxHP*0.3),this.maxHP); }

  applyMutation(mut){ this._mutations.push(mut.id); mut.apply(this); }

  gainXP(amount){
    const total=Math.ceil(amount*this._mutXpMult*this._shopXpMult);
    const coins=Math.ceil(amount*0.15*this._mutCoinMult*this._shopCoinMult);
    this.xp+=total; this.score+=Math.ceil(total*2*this._mutScoreMult); this.coins+=coins;
    let leveled=false;
    while(this.xp>=this.xpToNext){ this.xp-=this.xpToNext; this.level++; this.xpToNext=XP_PER_LEVEL(this.level); this.hp=Math.min(this.hp+Math.floor(this.maxHP*0.22),this.maxHP); leveled=true; this._pop=0.35; }
    return leveled;
  }

  tryEvolve(){
    if(this.needsPathChoice()) return false;
    const arr=this._getEvoArray(); const next=arr[this.evoIndex+1];
    if(!next||this.level<next.minLevel) return false;
    this.evoIndex++; this._applyEvo(); this.hp=Math.min(this.hp+Math.floor(this.maxHP*0.45),this.maxHP); this._pop=0.55; return true;
  }

  takeDamage(amount){
    if(this._invTimer>0) return false;
    const reduced=Math.ceil(amount*(1-clamp(this._mutDmgReduce,0,0.75)));
    this.hp=Math.max(0,this.hp-reduced); this._invTimer=INV_TIME; this._flashTimer=INV_TIME;
    if(this.hp<=0){ this.isDead=true; this._deathTimer=1.2; }
    return true;
  }

  triggerBoost(){
    if(this._boostCD>0) return false;
    this._boosting=true; this._boostTimer=BASE_BOOST_DUR; this._boostCD=BASE_BOOST_CD*(this._mutBoostCdMult||1)*(this._shopBoostCdMult||1); return true;
  }

  triggerSkill(){
    if(!this.skillName||this._skillCD>0) return false;
    this._skillActive=true; this._skillCD=this.skillCooldown*(this._mutSkillCdMult||1);
    this._skillTimer=3.5; this._skillEffect=this.path==='predator'?'frenzy':'venom'; return true;
  }

  get boostReady(){ return this._boostCD<=0; }
  get boostCooldownRatio(){ return this._boostCD<=0?1:Math.max(0,1-this._boostCD/BASE_BOOST_CD); }
  get skillCooldownRatio(){ return this._skillCD<=0?1:Math.max(0,1-this._skillCD/this.skillCooldown); }
  get isFlashing(){ return this._flashTimer>0&&Math.floor(this._flashTimer/0.09)%2===0; }
  get skillActive(){ return this._skillActive; }
  get skillEffect(){ return this._skillEffect; }
  get magnetRadius(){ return (this._mutMagnet||0)+(this._shopMagnet||0); }

  update(dt,targetX,targetY,worldW,worldH,windX=0,windY=0){
    if(this.isDead){ this._deathTimer=Math.max(0,this._deathTimer-dt); this._scale=lerp(this._scale,1.6,0.08); return; }
    if(this._invTimer>0) this._invTimer-=dt;
    if(this._flashTimer>0) this._flashTimer-=dt;
    if(this._boostCD>0) this._boostCD-=dt;
    if(this._boostTimer>0){ this._boostTimer-=dt; if(this._boostTimer<=0) this._boosting=false; }
    if(this._skillCD>0) this._skillCD-=dt;
    if(this._skillTimer>0){ this._skillTimer-=dt; if(this._skillTimer<=0){ this._skillActive=false; this._skillEffect=null; } }
    if(this._pop>0) this._pop-=dt*1.8;

    // HP regen (mutation)
    if(this._mutRegen>0){ this._regenTimer+=dt; if(this._regenTimer>=1){ this._regenTimer=0; this.hp=Math.min(this.maxHP,this.hp+this._mutRegen); } }

    // Rainbow skin phase
    if(this._skinId==='rainbow') this._rainbowPhase+=dt*2.5;

    const skillSpd=(this._skillActive&&this._skillEffect==='frenzy')?2.0:1.0;
    const totalSpd=this.speed*(this._mutSpeedMult||1)*(this._shopSpeedMult||1)*(this._boosting?BASE_BOOST_SPD:1)*skillSpd;

    const dx=targetX-this.x, dy=targetY-this.y, d=Math.sqrt(dx*dx+dy*dy);
    if(d>1.5){
      const ta=Math.atan2(dy,dx);
      this.angle=lerpAngle(this.angle,ta,0.11);
      const acc=Math.min(d*0.09,totalSpd);
      const lp=Math.min(1,0.15*dt*60);
      this.vx=lerp(this.vx,Math.cos(this.angle)*acc+windX*0.18,lp);
      this.vy=lerp(this.vy,Math.sin(this.angle)*acc+windY*0.18,lp);
    } else { this.vx*=Math.pow(0.82,dt*60); this.vy*=Math.pow(0.82,dt*60); }

    const nx=clamp(this.x+this.vx*dt*60,this.radius,worldW-this.radius);
    const ny=clamp(this.y+this.vy*dt*60,this.radius,worldH-this.radius);
    const moved=Math.sqrt((nx-this._prevX)**2+(ny-this._prevY)**2);
    this.distTraveled+=moved; this._prevX=nx; this._prevY=ny; this.x=nx; this.y=ny;
    this.tailPhase+=(3.5+Math.sqrt(this.vx*this.vx+this.vy*this.vy)*0.7)*dt;
    this.bobPhase+=dt*1.3;
    this._scale=lerp(this._scale,1+Math.max(0,this._pop)*0.18,0.3);
  }

  _getDrawColor(){
    if(this._skinId==='rainbow'){
      const h=((this._rainbowPhase*60)%360);
      return { body:`hsl(${h},90%,55%)`, fin:`hsl(${(h+40)%360},80%,45%)`, glow:`hsl(${h},100%,60%)` };
    }
    const sk=getSkin(this._skinId);
    return { body:sk.color, fin:sk.fin, glow:sk.glow };
  }

  draw(ctx){
    if(this.isDead){ const t=this._deathTimer/1.2; if(t<=0) return; ctx.globalAlpha=t*0.6; ctx.save(); ctx.translate(this.x,this.y); ctx.scale(this._scale,this._scale); this._drawFish(ctx); ctx.restore(); ctx.globalAlpha=1; return; }
    if(this.isFlashing) ctx.globalAlpha=0.42;
    // Glow for special skins
    const dc=this._getDrawColor();
    if(dc.glow){ ctx.save(); ctx.globalAlpha=0.15; const gg=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.radius*2.2); gg.addColorStop(0,dc.glow); gg.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius*2.2,0,TWO_PI); ctx.fill(); ctx.restore(); }
    // Venom aura
    if(this._skillActive&&this._skillEffect==='venom'){ ctx.save(); ctx.globalAlpha=0.18; const ag=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.radius*2.5); ag.addColorStop(0,'#76ff03'); ag.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius*2.5,0,TWO_PI); ctx.fill(); ctx.restore(); }
    // Magnet radius indicator
    if(this.magnetRadius>0){ ctx.save(); ctx.globalAlpha=0.07; ctx.strokeStyle='#4fc3f7'; ctx.lineWidth=1.5; ctx.setLineDash([4,6]); ctx.beginPath(); ctx.arc(this.x,this.y,this.magnetRadius,0,TWO_PI); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
    ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.angle); ctx.scale(this._scale,this._scale);
    this._drawFish(ctx); ctx.restore();
    if(this.isFlashing) ctx.globalAlpha=1;
  }

  _drawFish(ctx){
    const r=this.radius, dc=this._getDrawColor();
    const col=dc.body, finCol=dc.fin;
    const wag=Math.sin(this.tailPhase)*0.42*this.tailSz;
    // Shadow
    ctx.save(); ctx.translate(4,5); ctx.globalAlpha=0.18; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(0,0,r,r*0.52,0,0,TWO_PI); ctx.fill(); ctx.restore();
    // Tail
    ctx.fillStyle=finCol; ctx.beginPath();
    ctx.moveTo(-r*0.52,0); ctx.lineTo(-r*1.7,-r*0.75*this.tailSz+wag*r*0.55); ctx.lineTo(-r*0.82,0); ctx.lineTo(-r*1.7,r*0.75*this.tailSz+wag*r*0.55);
    ctx.closePath(); ctx.fill();
    // Body
    const bg=ctx.createRadialGradient(-r*0.2,-r*0.26,r*0.08,0,0,r*1.12);
    bg.addColorStop(0,_adj(col,55)); bg.addColorStop(0.6,col); bg.addColorStop(1,_adj(col,-45));
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,0,r,r*0.56,0,0,TWO_PI); ctx.fill();
    // Fin
    ctx.fillStyle=finCol; ctx.beginPath(); ctx.moveTo(-r*0.05,-r*0.55); ctx.lineTo(r*0.28,-r*0.55-r*0.38); ctx.lineTo(-r*0.32,-r*0.55); ctx.closePath(); ctx.fill();
    // Pectoral fin
    ctx.fillStyle=finCol+'cc'; ctx.beginPath(); ctx.ellipse(r*0.06,r*0.33,r*0.34,r*0.17,Math.PI*0.28,0,TWO_PI); ctx.fill();
    // Thorns mutation indicator
    if(this._mutThorns>0){ ctx.strokeStyle='#ff1744'; ctx.lineWidth=1.3; for(let i=0;i<5;i++){ const a=(TWO_PI/5)*i; ctx.beginPath(); ctx.moveTo(Math.cos(a)*r*0.85,Math.sin(a)*r*0.55); ctx.lineTo(Math.cos(a)*r*1.35,Math.sin(a)*r*0.85); ctx.stroke(); } }
    // Regen glow
    if(this._mutRegen>0){ ctx.save(); ctx.globalAlpha=0.12+Math.sin(this.bobPhase*2)*0.06; ctx.fillStyle='#69f0ae'; ctx.beginPath(); ctx.arc(0,0,r*1.3,0,TWO_PI); ctx.fill(); ctx.restore(); }
    // Frenzy aura
    if(this._skillActive&&this._skillEffect==='frenzy'){ ctx.save(); ctx.globalAlpha=0.22; const fa=ctx.createRadialGradient(0,0,0,0,0,r*1.8); fa.addColorStop(0,'#ff1744'); fa.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=fa; ctx.beginPath(); ctx.arc(0,0,r*1.8,0,TWO_PI); ctx.fill(); ctx.restore(); }
    // Boost glow
    if(this._boosting){ ctx.save(); ctx.globalAlpha=0.28; const bg2=ctx.createRadialGradient(0,0,0,0,0,r*1.7); bg2.addColorStop(0,'#00e5ff'); bg2.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=bg2; ctx.beginPath(); ctx.arc(0,0,r*1.7,0,TWO_PI); ctx.fill(); ctx.restore(); }
    // Eye
    const ex=r*0.46, ey=-r*0.22;
    ctx.fillStyle='#0d1b2a'; ctx.beginPath(); ctx.arc(ex,ey,this.eyeR,0,TWO_PI); ctx.fill();
    ctx.fillStyle='#1565c0'; ctx.beginPath(); ctx.arc(ex,ey,this.eyeR*0.6,0,TWO_PI); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(ex-this.eyeR*0.28,ey-this.eyeR*0.28,this.eyeR*0.35,0,TWO_PI); ctx.fill();
  }
}

function _adj(hex,delta){
  try{ const n=parseInt(hex.replace('#',''),16); const r=clamp(((n>>16)&0xff)+delta,0,255); const g=clamp(((n>>8)&0xff)+delta,0,255); const b=clamp((n&0xff)+delta,0,255); return `rgb(${r},${g},${b})`; }catch{ return hex; }
}
