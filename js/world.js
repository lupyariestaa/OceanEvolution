// world.js V2 — ocean world with biome-aware visuals

import { rand, randInt, TWO_PI, clamp } from './utilities.js';
import { BIOMES, getBiomeAt } from './biomes.js';
import { WORLD_W, WORLD_H } from './constants.js';
export { WORLD_W, WORLD_H };



class LightRay {
  constructor() { this.reset(); }
  reset() {
    this.x = rand(0, WORLD_W); this.y = 0;
    this.angle = rand(-0.2, 0.2);
    this.width = rand(25, 110); this.length = rand(350, 1200);
    this.alpha = rand(0.03, 0.10);
    this.drift = rand(-0.3, 0.3);
    this.life = 0; this.maxLife = rand(150, 360);
  }
  update(dt) {
    this.life += dt * 60; this.x += this.drift * dt * 60;
    if (this.x < -300) this.x += WORLD_W + 600;
    if (this.x > WORLD_W + 300) this.x -= WORLD_W + 600;
    if (this.life > this.maxLife) this.reset();
  }
  draw(ctx, cam) {
    if (this.x < cam.x - this.width - 300 || this.x > cam.x + cam.width + this.width + 300) return;
    const t = this.life / this.maxLife;
    const a = this.alpha * Math.sin(t * Math.PI);
    if (a <= 0.001) return;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    const g = ctx.createLinearGradient(0, 0, 0, this.length);
    g.addColorStop(0, `rgba(150,220,255,${a})`);
    g.addColorStop(0.6, `rgba(80,160,220,${a * 0.3})`);
    g.addColorStop(1, `rgba(20,80,160,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-this.width / 2, 0); ctx.lineTo(this.width / 2, 0);
    ctx.lineTo(this.width * 0.7, this.length); ctx.lineTo(-this.width * 0.7, this.length);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
}

class Seaweed {
  constructor(biomeId) {
    this.biomeId = biomeId;
    const b = BIOMES.find(b => b.id === biomeId) || BIOMES[0];
    this.x = rand(b.x + 10, b.x + b.w - 10);
    this.baseY = WORLD_H - rand(5, 60);
    this.height = rand(55, 200);
    this.segments = randInt(5, 10);
    this.phase = rand(0, TWO_PI);
    this.speed = rand(0.4, 1.0);
    this.color = `hsl(${randInt(110, 160)},60%,${randInt(18, 36)}%)`;
    this.width = rand(3, 7);
  }
  update(dt) { this.phase += this.speed * dt; }
  draw(ctx, cam) {
    const { x, baseY: sy } = this;
    if (x < cam.x - 60 || x > cam.x + cam.width + 60) return;
    if (sy < cam.y - this.height - 20 || sy > cam.y + cam.height + 20) return;
    ctx.strokeStyle = this.color; ctx.lineWidth = this.width;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, sy);
    const sh = this.height / this.segments;
    for (let i = 0; i < this.segments; i++) {
      const wave = Math.sin(this.phase + i * 0.9) * 14 * ((i + 1) / this.segments);
      ctx.lineTo(x + wave, sy - sh * (i + 1));
    }
    ctx.stroke();
  }
}

class Rock {
  constructor() {
    this.x = rand(0, WORLD_W); this.y = WORLD_H - rand(5, 40);
    this.r = rand(18, 80); this.pts = [];
    const n = randInt(6, 12);
    for (let i = 0; i < n; i++) {
      const a = (TWO_PI / n) * i + rand(-0.3, 0.3);
      this.pts.push({ a, r: this.r * rand(0.5, 1.0) });
    }
    this.hue = randInt(195, 235); this.sat = randInt(10, 28); this.lit = randInt(16, 32);
  }
  draw(ctx, cam) {
    if (this.x < cam.x - this.r - 20 || this.x > cam.x + cam.width + this.r) return;
    if (this.y < cam.y - this.r || this.y > cam.y + cam.height + this.r) return;
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.beginPath();
    this.pts.forEach((p, i) => {
      const x = Math.cos(p.a) * p.r, y = Math.sin(p.a) * p.r * 0.5;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lit}%)`;
    ctx.fill();
    ctx.strokeStyle = `hsl(${this.hue},${this.sat}%,${this.lit + 9}%)`;
    ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
}

class CoralCluster {
  constructor() {
    const b = BIOMES.find(b => b.id === 'reef') || BIOMES[0];
    this.x = rand(b.x + 20, b.x + b.w - 20);
    this.y = WORLD_H * rand(0.55, 0.95);
    this.branches = randInt(4, 9);
    this.h = rand(40, 120);
    this.color = `hsl(${randInt(0, 360)},80%,${randInt(45, 65)}%)`;
    this.phase = rand(0, TWO_PI);
  }
  update(dt) { this.phase += dt * 0.7; }
  draw(ctx, cam) {
    if (this.x < cam.x - 140 || this.x > cam.x + cam.width + 140) return;
    if (this.y < cam.y - this.h - 20 || this.y > cam.y + cam.height + 20) return;
    ctx.save();
    for (let i = 0; i < this.branches; i++) {
      const ang = ((i / this.branches) * Math.PI) - Math.PI / 2 + Math.sin(this.phase + i) * 0.15;
      const len = this.h * rand(0.6, 1.0);
      ctx.strokeStyle = this.color; ctx.lineWidth = rand(2, 5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(ang) * len, this.y + Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class FloatingParticle {
  constructor() { this.reset(true); }
  reset(scatter) {
    this.x = rand(0, WORLD_W); this.y = scatter ? rand(0, WORLD_H) : rand(0, WORLD_H);
    this.r = rand(1, 3.5); this.vx = rand(-0.25, 0.25); this.vy = rand(-0.12, 0.06);
    this.alpha = rand(0.10, 0.38);
    this.color = Math.random() < 0.5 ? 'rgba(150,220,255,' : 'rgba(100,200,180,';
  }
  update(dt) {
    this.x += this.vx * dt * 60; this.y += this.vy * dt * 60;
    if (this.x < 0) this.x += WORLD_W; if (this.x > WORLD_W) this.x -= WORLD_W;
    if (this.y < 0 || this.y > WORLD_H) this.reset();
  }
  draw(ctx, cam) {
    if (this.x < cam.x - 5 || this.x > cam.x + cam.width + 5 ||
        this.y < cam.y - 5 || this.y > cam.y + cam.height + 5) return;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TWO_PI);
    ctx.fillStyle = this.color + this.alpha + ')'; ctx.fill();
  }
}

class Bubble {
  constructor(scatter) { this.reset(scatter); }
  reset(scatter) {
    this.x = rand(0, WORLD_W); this.y = scatter ? rand(0, WORLD_H) : WORLD_H + rand(5, 30);
    this.r = rand(2, 7); this.vx = rand(-0.3, 0.3); this.vy = -rand(0.6, 2.2);
    this.alpha = rand(0.15, 0.55); this.wobble = rand(0, TWO_PI); this.wobbleSpd = rand(1.4, 3.8);
  }
  update(dt) {
    this.wobble += this.wobbleSpd * dt;
    this.x += (Math.sin(this.wobble) * 0.4 + this.vx) * dt * 60;
    this.y += this.vy * dt * 60;
    if (this.y < -20) this.reset(false);
    if (this.x < 0) this.x += WORLD_W; if (this.x > WORLD_W) this.x -= WORLD_W;
  }
  draw(ctx, cam) {
    if (this.x < cam.x - 15 || this.x > cam.x + cam.width + 15 ||
        this.y < cam.y - 15 || this.y > cam.y + cam.height + 15) return;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TWO_PI);
    ctx.strokeStyle = `rgba(200,240,255,${this.alpha})`; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = `rgba(200,240,255,${this.alpha * 0.12})`; ctx.fill();
  }
}

// Ice crystal for ice biome
class IceCrystal {
  constructor() {
    const b = BIOMES.find(b => b.id === 'ice') || BIOMES[0];
    this.x = rand(b.x, b.x + b.w); this.y = rand(b.y, b.y + b.h);
    this.r = rand(8, 30); this.angle = rand(0, TWO_PI);
    this.alpha = rand(0.15, 0.45);
    this.rotSpd = rand(-0.3, 0.3);
  }
  update(dt) { this.angle += this.rotSpd * dt; }
  draw(ctx, cam) {
    if (this.x < cam.x - 50 || this.x > cam.x + cam.width + 50 ||
        this.y < cam.y - 50 || this.y > cam.y + cam.height + 50) return;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = (TWO_PI / 6) * i;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * this.r, Math.sin(a) * this.r); ctx.stroke();
    }
    ctx.restore();
  }
}

export class World {
  constructor() {
    this.width = WORLD_W; this.height = WORLD_H;
    this.rays    = Array.from({ length: 18 }, () => { const r = new LightRay(); r.life = rand(0, r.maxLife); return r; });
    this.seaweeds= BIOMES.map(b => Array.from({ length: 20 }, () => new Seaweed(b.id))).flat();
    this.corals  = Array.from({ length: 60 }, () => new CoralCluster());
    this.rocks   = Array.from({ length: 70 }, () => new Rock());
    this.floaters= Array.from({ length: 280 }, () => new FloatingParticle());
    this.bubbles = Array.from({ length: 110 }, () => new Bubble(true));
    this.crystals= Array.from({ length: 40 },  () => new IceCrystal());
    this._currentBiome = BIOMES[0];
  }

  setCurrentBiome(b) { this._currentBiome = b; }

  update(dt) {
    for (const r of this.rays)     r.update(dt);
    for (const s of this.seaweeds) s.update(dt);
    for (const c of this.corals)   c.update(dt);
    for (const f of this.floaters) f.update(dt);
    for (const b of this.bubbles)  b.update(dt);
    for (const c of this.crystals) c.update(dt);
  }

  drawBackground(ctx, cam) {
  const w = cam.width, h = cam.height;

  // 4 zona kedalaman berdasarkan posisi kamera Y di dunia
  const depthRatio = cam.y / (WORLD_H - cam.height); // 0 = permukaan, 1 = dasar
  const d = Math.max(0, Math.min(1, depthRatio));

  // 4 zona warna:
  // 0.00–0.25 = Dangkal   — Biru laut cerah
  // 0.25–0.50 = Menengah  — Biru teal gelap
  // 0.50–0.75 = Dalam     — Biru navy pekat
  // 0.75–1.00 = Terdalam  — Black blue modern

  let topColor, botColor;

  if (d < 0.25) {
    // Zona 1: Dangkal — biru laut cerah
    const t = d / 0.25;
    topColor = _lerpColor('#0e6b9e', '#0a4f7a', t);
    botColor = _lerpColor('#0a4f7a', '#073d62', t);
  } else if (d < 0.50) {
    // Zona 2: Menengah — biru teal gelap
    const t = (d - 0.25) / 0.25;
    topColor = _lerpColor('#0a4f7a', '#062d52', t);
    botColor = _lerpColor('#062d52', '#041e38', t);
  } else if (d < 0.75) {
    // Zona 3: Dalam — biru navy pekat
    const t = (d - 0.50) / 0.25;
    topColor = _lerpColor('#062d52', '#030f22', t);
    botColor = _lerpColor('#041e38', '#020818', t);
  } else {
    // Zona 4: Terdalam — black blue modern
    const t = (d - 0.75) / 0.25;
    topColor = _lerpColor('#030f22', '#010510', t);
    botColor = _lerpColor('#020818', '#000308', t);
  }

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, botColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Biome fog overlay tetap ada
  const b = this._currentBiome;
  if (b && b.fogColor) {
    ctx.fillStyle = b.fogColor;
    ctx.fillRect(0, 0, w, h);
  }

  // Caustic shimmer (hanya di zona dangkal)
  if (d < 0.35 && cam.y < 600) {
    ctx.save();
    ctx.globalAlpha = (1 - d / 0.35) * 0.055;
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1;
    const t2 = Date.now() * 0.001;
    for (let i = 0; i < 10; i++) {
      const x = ((i * 137 + Math.sin(t2 * 0.3 + i) * 50) % w + w) % w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.sin(t2 + i) * 25, h * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

  drawMidground(ctx, cam) {
    for (const r of this.rays)    r.draw(ctx, cam);
    for (const f of this.floaters)f.draw(ctx, cam);
    for (const b of this.bubbles) b.draw(ctx, cam);
    for (const c of this.crystals)c.draw(ctx, cam);
  }

  drawForeground(ctx, cam) {
    for (const r of this.rocks)    r.draw(ctx, cam);
    for (const c of this.corals)   c.draw(ctx, cam);
    for (const s of this.seaweeds) s.draw(ctx, cam);

    // Sea floor
    const fy = WORLD_H;
    if (fy < cam.y + cam.height + 70 && fy > cam.y - 10) {
      const g = ctx.createLinearGradient(0, fy - 45, 0, fy + 90);
      g.addColorStop(0, 'rgba(8,20,45,0)'); g.addColorStop(0.4, 'rgba(10,24,50,0.88)'); g.addColorStop(1, 'rgba(4,10,22,1)');
      ctx.fillStyle = g; ctx.fillRect(cam.x - 10, fy - 45, cam.width + 20, 135);
    }
    // Ocean surface
    const sy = 0;
    if (sy > cam.y - 30 && sy < cam.y + cam.height + 30) {
      ctx.fillStyle = 'rgba(120,210,255,0.07)'; ctx.fillRect(cam.x - 10, sy, cam.width + 20, 10);
    }
  }
  
}

function _lerpColor(hex1, hex2, t) {
  const p = s => parseInt(s, 16);
  const r1 = p(hex1.slice(1,3)), g1 = p(hex1.slice(3,5)), b1 = p(hex1.slice(5,7));
  const r2 = p(hex2.slice(1,3)), g2 = p(hex2.slice(3,5)), b2 = p(hex2.slice(5,7));
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `rgb(${r},${g},${b})`;
}