// enemy.js V2 — biome-aware enemies with difficulty scaling

import { rand, randInt, TWO_PI, lerp, lerpAngle, clamp, dist } from './utilities.js';
import { WORLD_W, WORLD_H } from './world.js';
import { getBiomeAt } from './biomes.js';
import { EVO_SHARED, EVO_PREDATOR, EVO_TOXIN } from './player.js';

const MAX_ENEMIES   = 80;
const SPAWN_MARGIN  = 280;

const DIFFICULTY_MODS = {
  easy:   { speedMult: 0.75, dmgMult: 0.65, hpMult: 0.75, spawnRate: 3.2 },
  normal: { speedMult: 1.00, dmgMult: 1.00, hpMult: 1.00, spawnRate: 2.2 },
  hard:   { speedMult: 1.25, dmgMult: 1.40, hpMult: 1.30, spawnRate: 1.5 },
};

const ALL_EVOS = [...EVO_SHARED, ...EVO_PREDATOR];

const TIER_DEFS = [
  { tierName: 'prey',    color: '#4dd0e1', finColor: '#00acc1', sizeMult: 0.55, speedMult: 0.70, xpMult: 1.0, scoreMult: 1.0, dmgMult: 0   },
  { tierName: 'neutral', color: '#aed581', finColor: '#8bc34a', sizeMult: 0.85, speedMult: 0.95, xpMult: 1.3, scoreMult: 1.4, dmgMult: 0.7 },
  { tierName: 'threat',  color: '#ef5350', finColor: '#c62828', sizeMult: 1.22, speedMult: 1.12, xpMult: 2.2, scoreMult: 2.0, dmgMult: 1.0 },
];

// Biome-specific visual overrides for enemies
const BIOME_ENEMY_TINTS = {
  reef:     { prey: '#26c6da', neutral: '#81c784', threat: '#e53935' },
  tropical: { prey: '#69f0ae', neutral: '#c6ff00', threat: '#ff6d00' },
  deep:     { prey: '#7986cb', neutral: '#9575cd', threat: '#b71c1c' },
  abyssal:  { prey: '#ce93d8', neutral: '#7c4dff', threat: '#880e4f' },
  ice:      { prey: '#b3e5fc', neutral: '#80deea', threat: '#4fc3f7' },
};

class EnemyFish {
  constructor() { this.active = false; this.angle = 0; this.vx = 0; this.vy = 0; this.tailPhase = rand(0, TWO_PI); this.wanderAngle = rand(0, TWO_PI); this.wanderTimer = 0; this._aggro = false; this._fear = false; this._poisoned = false; this._poisonTimer = 0; this.spawn(0, 'normal'); }

  spawn(playerEvoIndex, difficulty) {
    const diff = DIFFICULTY_MODS[difficulty] || DIFFICULTY_MODS.normal;
    const evoMin = Math.max(0, playerEvoIndex - 1);
    const evoMax = Math.min(ALL_EVOS.length - 1, playerEvoIndex + 2);
    this.evoIndex = randInt(evoMin, evoMax);
    const evo = ALL_EVOS[this.evoIndex];
    const evoDiff = this.evoIndex - playerEvoIndex;
    let tierIdx = evoDiff < -1 ? 0 : evoDiff > 1 ? 2 : 1;
    const tier = TIER_DEFS[tierIdx];
    this.tier = tierIdx; this.tierDef = tier;

    this.radius = evo.radius * tier.sizeMult;
    this.speed  = evo.speed  * tier.speedMult * diff.speedMult;
    const biome = getBiomeAt(rand(0, WORLD_W), rand(0, WORLD_H));
    const tints = BIOME_ENEMY_TINTS[biome.id] || BIOME_ENEMY_TINTS.reef;
    this.color    = tints[tier.tierName];
    this.finColor = tier.finColor;
    this.xp       = Math.ceil(12 * tier.xpMult   * (1 + this.evoIndex * 0.18) * (biome.xpMult || 1));
    this.score    = Math.ceil(8  * tier.scoreMult * (1 + this.evoIndex * 0.18));
    this.dmg      = Math.ceil(20 * tier.dmgMult   * diff.dmgMult);
    this.maxHP    = Math.ceil(evo.maxHP * tier.sizeMult * 0.62 * diff.hpMult);
    this.hp = this.maxHP; this.tailSz = evo.tailSz || 1.0;

    const side = randInt(0, 3);
    if (side === 0)      { this.x = rand(0, WORLD_W);  this.y = -SPAWN_MARGIN; }
    else if (side === 1) { this.x = WORLD_W + SPAWN_MARGIN; this.y = rand(0, WORLD_H); }
    else if (side === 2) { this.x = rand(0, WORLD_W);  this.y = WORLD_H + SPAWN_MARGIN; }
    else                 { this.x = -SPAWN_MARGIN;      this.y = rand(0, WORLD_H); }

    this.active = true; this._aggro = false; this._fear = false; this._poisoned = false; this._poisonTimer = 0;
  }

  applyPoison() { this._poisoned = true; this._poisonTimer = 4.0; }
  applyFear(duration) { this._fear = true; setTimeout(() => { this._fear = false; }, duration * 1000); }

  update(dt, px, py, pr, playerEvoIndex, difficulty) {
    if (!this.active) return;
    if (this.x < -700 || this.x > WORLD_W + 700 || this.y < -700 || this.y > WORLD_H + 700) { this.active = false; return; }
    if (this._poisoned) {
      this._poisonTimer -= dt;
      this.hp -= 5 * dt;
      if (this._poisonTimer <= 0 || this.hp <= 0) { this.active = false; return; }
    }

    const d = dist(this.x, this.y, px, py);
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) { this.wanderAngle += rand(-0.9, 0.9); this.wanderTimer = rand(1.0, 2.8); }

    let targetAngle = this.wanderAngle;
    if (this._fear) {
      targetAngle = Math.atan2(this.y - py, this.x - px);
    } else if (this.tier === 2 && d < 550) {
      targetAngle = Math.atan2(py - this.y, px - this.x);
      this._aggro = true;
    } else if (this.tier === 0 && d < 400) {
      targetAngle = Math.atan2(this.y - py, this.x - px);
      this._aggro = false;
    } else { this._aggro = false; }

    this.angle = lerpAngle(this.angle, targetAngle, 0.09);
    const spd = this._aggro ? this.speed * 1.28 : this.speed;
    this.vx = lerp(this.vx, Math.cos(this.angle) * spd, 0.065);
    this.vy = lerp(this.vy, Math.sin(this.angle) * spd, 0.065);
    this.x = clamp(this.x + this.vx * dt * 60, -SPAWN_MARGIN, WORLD_W + SPAWN_MARGIN);
    this.y = clamp(this.y + this.vy * dt * 60, -SPAWN_MARGIN, WORLD_H + SPAWN_MARGIN);
    this.tailPhase += (3.2 + Math.abs(this.speed) * 0.6) * dt;
  }

  takeDamage(amount) { this.hp -= amount; if (this.hp <= 0) { this.active = false; return true; } return false; }

  draw(ctx, cam) {
    if (!this.active) return;
    const { x, y } = this;
    if (x < cam.x - this.radius - 20 || x > cam.x + cam.width  + this.radius + 20) return;
    if (y < cam.y - this.radius - 20 || y > cam.y + cam.height + this.radius + 20) return;
    const r = this.radius;
    const wag = Math.sin(this.tailPhase) * 0.38 * this.tailSz;
    ctx.save(); ctx.translate(x, y); ctx.rotate(this.angle);
    if (this._poisoned) { ctx.shadowColor = '#76ff03'; ctx.shadowBlur = 8; }
    // Tail
    ctx.fillStyle = this.finColor; ctx.beginPath();
    ctx.moveTo(-r * 0.55, 0);
    ctx.lineTo(-r * 1.7, -r * 0.7 * this.tailSz + wag * r * 0.5);
    ctx.lineTo(-r * 0.85, 0);
    ctx.lineTo(-r * 1.7,  r * 0.7 * this.tailSz + wag * r * 0.5);
    ctx.closePath(); ctx.fill();
    // Body
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, TWO_PI);
    ctx.fillStyle = this.color; ctx.fill();
    // Fin
    ctx.fillStyle = this.finColor; ctx.beginPath();
    ctx.moveTo(-r * 0.05, -r * 0.52); ctx.lineTo(r * 0.3, -r * 0.9); ctx.lineTo(-r * 0.35, -r * 0.52);
    ctx.closePath(); ctx.fill();
    // Eye
    ctx.fillStyle = '#0d1b2a'; ctx.beginPath(); ctx.arc(r * 0.44, -r * 0.20, Math.max(2, r * 0.18), 0, TWO_PI); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(r * 0.38, -r * 0.26, Math.max(1, r * 0.07), 0, TWO_PI); ctx.fill();
    // Aggro aura
    if (this._aggro) {
      ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#ef5350';
      ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, TWO_PI); ctx.fill(); ctx.restore();
    }
    // HP bar
    if (this.tier > 0 && this.hp < this.maxHP) {
      const bw = r * 2.2, bh = 3, bx = -bw / 2, by = -r * 1.45;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = this.tier === 2 ? '#ef5350' : '#aed581';
      ctx.fillRect(bx, by, bw * (this.hp / this.maxHP), bh);
    }
    ctx.restore();
  }
}

export class EnemyManager {
  constructor() {
    this._pool = Array.from({ length: MAX_ENEMIES }, () => new EnemyFish());
    this._spawnTimer = 0; this._difficulty = 'normal';
  }

  setDifficulty(d) { this._difficulty = d; }

  spawnInitial(playerEvoIndex) {
    let spawned = 0;
    for (const e of this._pool) {
      if (!e.active && spawned < 22) {
        e.spawn(playerEvoIndex, this._difficulty);
        e.x = rand(100, WORLD_W - 100); e.y = rand(100, WORLD_H - 100);
        spawned++;
      }
    }
  }

  update(dt, px, py, pr, playerEvoIndex) {
    for (const e of this._pool) if (e.active) e.update(dt, px, py, pr, playerEvoIndex, this._difficulty);
    this._spawnTimer += dt;
    const diff = DIFFICULTY_MODS[this._difficulty] || DIFFICULTY_MODS.normal;
    const active = this._pool.filter(e => e.active).length;
    if (this._spawnTimer >= diff.spawnRate && active < MAX_ENEMIES) {
      this._spawnTimer = 0;
      const idle = this._pool.find(e => !e.active);
      if (idle) idle.spawn(playerEvoIndex, this._difficulty);
    }
  }

  applySkillEffect(px, py, radius, effect) {
    for (const e of this._pool) {
      if (!e.active) continue;
      const d = dist(px, py, e.x, e.y);
      if (d > radius) continue;
      if (effect === 'venom')  e.applyPoison();
      if (effect === 'frenzy') e.takeDamage(15);
      if (effect === 'sonar')  e.applyFear(3.0);
    }
  }

  draw(ctx, cam) { for (const e of this._pool) if (e.active) e.draw(ctx, cam); }
  getActive() { return this._pool.filter(e => e.active); }
  remove(e) { e.active = false; }
}
