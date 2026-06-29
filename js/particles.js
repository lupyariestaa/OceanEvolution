// particles.js V2 — rich visual effects

import { rand, TWO_PI } from './utilities.js';

class Particle {
  constructor() { this.active = false; }

  initBubble(x, y) {
    this.type = 'bubble'; this.x = x; this.y = y;
    this.r = rand(2, 5); this.vx = rand(-0.5, 0.5); this.vy = -rand(0.6, 1.8);
    this.life = 1; this.alpha = rand(0.3, 0.6);
    this.wobble = rand(0, TWO_PI); this.wobbleSpd = rand(2, 4); this.active = true;
  }
  initSpark(x, y, color) {
    this.type = 'spark'; this.x = x; this.y = y;
    this.vx = rand(-3.5, 3.5); this.vy = rand(-3.5, 3.5);
    this.r = rand(2, 5); this.color = color || '#fff';
    this.life = 1; this.active = true;
  }
  initOrb(x, y, color) {
    const angle = rand(0, TWO_PI), spd = rand(1.5, 6);
    this.type = 'orb'; this.x = x; this.y = y;
    this.vx = Math.cos(angle) * spd; this.vy = Math.sin(angle) * spd;
    this.r = rand(3, 9); this.color = color || '#4fc3f7';
    this.life = 1; this.active = true;
  }
  initText(x, y, text, color) {
    this.type = 'text'; this.x = x; this.y = y;
    this.vy = -rand(1.2, 2.2); this.text = text;
    this.color = color || '#fff176'; this.life = 1;
    this.fontSize = rand(14, 20); this.active = true;
  }
  initRing(x, y, color) {
    this.type = 'ring'; this.x = x; this.y = y;
    this.r = 5; this.maxR = rand(55, 110);
    this.color = color || '#4fc3f7'; this.life = 1; this.active = true;
  }
  initPoison(x, y) {
    const angle = rand(0, TWO_PI), spd = rand(0.8, 2.8);
    this.type = 'poison'; this.x = x; this.y = y;
    this.vx = Math.cos(angle) * spd; this.vy = Math.sin(angle) * spd;
    this.r = rand(3, 8); this.life = 1; this.active = true;
  }
  initTrail(x, y, color) {
    this.type = 'trail'; this.x = x; this.y = y;
    this.r = rand(3, 7); this.color = color || '#00e5ff';
    this.life = 1; this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    switch (this.type) {
      case 'bubble':
        this.wobble += this.wobbleSpd * dt;
        this.x += (Math.sin(this.wobble) * 0.3 + this.vx) * dt * 60;
        this.y += this.vy * dt * 60; this.life -= dt * 0.85; break;
      case 'spark':
        this.vx *= Math.pow(0.87, dt * 60); this.vy *= Math.pow(0.87, dt * 60);
        this.x  += this.vx * dt * 60; this.y += this.vy * dt * 60;
        this.life -= dt * 2.4; break;
      case 'orb':
        this.vx *= Math.pow(0.90, dt * 60); this.vy *= Math.pow(0.90, dt * 60);
        this.x  += this.vx * dt * 60; this.y += this.vy * dt * 60;
        this.life -= dt * 1.1; break;
      case 'text':
        this.y += this.vy * dt * 60; this.life -= dt * 0.9; break;
      case 'ring':
        this.r = 5 + (this.maxR - 5) * (1 - this.life);
        this.life -= dt * 1.6; break;
      case 'poison':
        this.vx *= Math.pow(0.92, dt * 60); this.vy *= Math.pow(0.92, dt * 60);
        this.x  += this.vx * dt * 60; this.y += this.vy * dt * 60;
        this.life -= dt * 0.9; break;
      case 'trail':
        this.life -= dt * 4.5; break;
    }
    if (this.life <= 0) this.active = false;
  }

  draw(ctx, cam) {
    if (!this.active) return;
    const { x, y } = this;
    if (x < cam.x - 60 || x > cam.x + cam.width  + 60) return;
    if (y < cam.y - 60 || y > cam.y + cam.height + 60) return;
    ctx.save(); ctx.globalAlpha = Math.max(0, this.life) * (this.alpha || 1);
    switch (this.type) {
      case 'bubble':
        ctx.beginPath(); ctx.arc(x, y, this.r, 0, TWO_PI);
        ctx.strokeStyle = 'rgba(200,240,255,0.7)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(200,240,255,0.1)'; ctx.fill(); break;
      case 'spark':
        ctx.beginPath(); ctx.arc(x, y, this.r * this.life, 0, TWO_PI);
        ctx.fillStyle = this.color; ctx.fill(); break;
      case 'orb': {
        const g = ctx.createRadialGradient(x, y, 0, x, y, this.r);
        g.addColorStop(0, this.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(x, y, this.r, 0, TWO_PI); ctx.fillStyle = g; ctx.fill(); break;
      }
      case 'text':
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.fontSize}px system-ui,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.text, x, y); break;
      case 'ring':
        ctx.beginPath(); ctx.arc(x, y, this.r, 0, TWO_PI);
        ctx.strokeStyle = this.color; ctx.lineWidth = 2.5 * this.life; ctx.stroke(); break;
      case 'poison': {
        const pg = ctx.createRadialGradient(x, y, 0, x, y, this.r);
        pg.addColorStop(0, 'rgba(118,255,3,0.8)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(x, y, this.r, 0, TWO_PI); ctx.fillStyle = pg; ctx.fill(); break;
      }
      case 'trail': {
        const tg = ctx.createRadialGradient(x, y, 0, x, y, this.r);
        tg.addColorStop(0, this.color); tg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(x, y, this.r, 0, TWO_PI); ctx.fillStyle = tg; ctx.fill(); break;
      }
    }
    ctx.restore();
  }
}

const POOL = 600;

export class ParticleSystem {
  constructor() { this._pool = Array.from({ length: POOL }, () => new Particle()); }
  _get() {
    for (const p of this._pool) if (!p.active) return p;
    const p = this._pool[0]; p.active = false; return p;
  }
  spawnBubble(x, y) { this._get().initBubble(x, y); }
  spawnEat(x, y)    {
    for (let i = 0; i < 6; i++) this._get().initSpark(x, y, '#80cbc4');
    for (let i = 0; i < 2; i++) this._get().initBubble(x, y);
    this._get().initRing(x, y, '#80cbc4');
  }
  spawnHit(x, y)    {
    for (let i = 0; i < 10; i++) this._get().initSpark(x, y, '#ef5350');
    this._get().initRing(x, y, '#ef5350');
  }
  spawnLevelUp(x, y, level) {
    for (let i = 0; i < 20; i++) this._get().initOrb(x, y, '#fff176');
    for (let i = 0; i < 8;  i++) this._get().initSpark(x, y, '#ffd54f');
    this._get().initText(x, y - 30, `LVL ${level}!`, '#fff176');
    this._get().initRing(x, y, '#fff176');
    this._get().initRing(x, y, '#ffd54f');
  }
  spawnEvolution(x, y, evoName) {
    for (let i = 0; i < 35; i++) this._get().initOrb(x, y, '#ce93d8');
    for (let i = 0; i < 20; i++) this._get().initSpark(x, y, '#e040fb');
    for (let i = 0; i < 14; i++) this._get().initBubble(x, y);
    for (let i = 0; i < 4;  i++) this._get().initRing(x, y, '#e040fb');
    this._get().initText(x, y - 45, evoName, '#e040fb');
  }
  spawnSkill(x, y, effect, biomeColor) {
    const color = effect === 'venom' ? '#76ff03' : (biomeColor || '#ff1744');
    for (let i = 0; i < 22; i++) {
      if (effect === 'venom') this._get().initPoison(x, y);
      else this._get().initOrb(x, y, color);
    }
    this._get().initRing(x, y, color);
  }
  spawnBoss(x, y)   {
    for (let i = 0; i < 45; i++) this._get().initOrb(x, y, '#ff6d00');
    for (let i = 0; i < 20; i++) this._get().initSpark(x, y, '#ffd740');
    for (let i = 0; i < 6;  i++) this._get().initRing(x, y, '#ff6d00');
    this._get().initText(x, y - 50, 'BOSS DOWN!', '#ffd740');
  }
  spawnTrail(x, y, color) { this._get().initTrail(x, y, color); }
  update(dt) { for (const p of this._pool) if (p.active) p.update(dt); }
  draw(ctx, cam) { for (const p of this._pool) if (p.active) p.draw(ctx, cam); }
}
