// food.js V2 — biome-aware food pellets

import { rand, randInt, TWO_PI, clamp } from './utilities.js';
import { WORLD_W, WORLD_H } from './world.js';
import { BIOMES, getBiomeAt } from './biomes.js';

const FOOD_COUNT = 420;

const FOOD_TYPES = [
  { color: '#80cbc4', glow: '#4db6ac', xp: 4,  r: 4,  weight: 6   },
  { color: '#aed581', glow: '#8bc34a', xp: 7,  r: 5,  weight: 4   },
  { color: '#fff176', glow: '#ffee58', xp: 12, r: 6,  weight: 2.5 },
  { color: '#ffb74d', glow: '#ffa726', xp: 18, r: 7,  weight: 1.5 },
  { color: '#f48fb1', glow: '#e91e63', xp: 30, r: 9,  weight: 0.8 },
  { color: '#ce93d8', glow: '#9c27b0', xp: 50, r: 11, weight: 0.3 },
  // Rare biome-special food
  { color: '#e040fb', glow: '#aa00ff', xp: 90, r: 13, weight: 0.12 },
];

function pickType(biomeFoodMult) {
  const types = biomeFoodMult >= 1.2 ? FOOD_TYPES : FOOD_TYPES.slice(0, 6);
  const total = types.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of types) { r -= t.weight; if (r <= 0) return t; }
  return FOOD_TYPES[0];
}

class FoodPellet {
  constructor() { this.active = false; this.spawn(); }
  spawn() {
    // Scatter across world, bias toward biome with high food mult
    let bx, by;
    if (Math.random() < 0.4) {
      const b = BIOMES[randInt(0, BIOMES.length - 1)];
      bx = rand(b.x + 10, b.x + b.w - 10);
      by = rand(b.y + 10, b.y + b.h - 10);
    } else {
      bx = rand(20, WORLD_W - 20);
      by = rand(20, WORLD_H - 20);
    }
    const biome = getBiomeAt(bx, by);
    const t = pickType(biome.foodMult);
    this.x = clamp(bx, 20, WORLD_W - 20);
    this.y = clamp(by, 20, WORLD_H - 20);
    this.r = t.r * (0.85 + biome.foodMult * 0.15);
    this.xp = Math.ceil(t.xp * biome.xpMult);
    this.color = t.color; this.glow = t.glow;
    this.phase = rand(0, Math.PI * 2);
    this.bobSpd = rand(1.8, 3.0);
    this.active = true;
  }
  update(dt) { this.phase += this.bobSpd * dt; }
  draw(ctx, cam) {
    if (!this.active) return;
    const { x, y, r } = this;
    if (x < cam.x - r - 4 || x > cam.x + cam.width  + r + 4) return;
    if (y < cam.y - r - 4 || y > cam.y + cam.height + r + 4) return;
    const bob = Math.sin(this.phase) * 1.8;
    // Glow
    ctx.save(); ctx.globalAlpha = 0.30;
    const grad = ctx.createRadialGradient(x, y + bob, 0, x, y + bob, r * 2.4);
    grad.addColorStop(0, this.glow); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y + bob, r * 2.4, 0, TWO_PI); ctx.fill();
    ctx.restore();
    // Body
    ctx.beginPath(); ctx.arc(x, y + bob, r, 0, TWO_PI); ctx.fillStyle = this.color; ctx.fill();
    // Highlight
    ctx.beginPath(); ctx.arc(x - r * 0.28, y + bob - r * 0.28, r * 0.36, 0, TWO_PI);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  }
}

export class FoodManager {
  constructor() {
    this._pool  = Array.from({ length: FOOD_COUNT }, () => new FoodPellet());
    this._timer = 0; this._active = [];
  }
  spawnInitial() { for (const p of this._pool) { p.active = true; p.spawn(); } this._sync(); }
  _sync() { this._active = this._pool.filter(p => p.active); }
  update(dt) {
    for (const p of this._pool) if (p.active) p.update(dt);
    const inactive = this._pool.filter(p => !p.active);
    if (inactive.length > 0) {
      this._timer += dt;
      const rate = 0.7 / Math.max(1, inactive.length * 0.04 + 1);
      if (this._timer >= rate) { this._timer = 0; inactive[0].spawn(); this._sync(); }
    }
  }
  draw(ctx, cam) { for (const p of this._active) p.draw(ctx, cam); }
  getActive() { return this._active; }
  remove(p) { p.active = false; this._sync(); }
}
