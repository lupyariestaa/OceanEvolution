// boss.js V2 — random boss fish with 8 types, random spawn timing

import { rand, randInt, TWO_PI, lerp, lerpAngle, clamp, dist } from './utilities.js';
import { WORLD_W, WORLD_H } from './world.js';

const BOSS_TYPES = [
  { name: 'Kraken',       color: '#7b1fa2', fin: '#4a148c', radius: 90,  speed: 1.8, hp: 1200, dmg: 45, xp: 500,  score: 800,  special: 'ink'      },
  { name: 'Leviathan',    color: '#1a237e', fin: '#0d47a1', radius: 110, speed: 1.5, hp: 1800, dmg: 55, xp: 750,  score: 1200, special: 'waves'    },
  { name: 'Megashark',    color: '#37474f', fin: '#263238', radius: 80,  speed: 2.8, hp: 900,  dmg: 60, xp: 600,  score: 1000, special: 'charge'   },
  { name: 'Anglerfish',   color: '#1b5e20', fin: '#004d40', radius: 75,  speed: 1.4, hp: 1000, dmg: 40, xp: 450,  score: 700,  special: 'lure'     },
  { name: 'Electric Eel', color: '#f9a825', fin: '#f57f17', radius: 65,  speed: 2.4, hp: 800,  dmg: 35, xp: 400,  score: 650,  special: 'shock'    },
  { name: 'Ghost Whale',  color: '#e0e0e0', fin: '#9e9e9e', radius: 130, speed: 1.2, hp: 2200, dmg: 50, xp: 900,  score: 1400, special: 'phase'    },
  { name: 'Venom Drake',  color: '#33691e', fin: '#1b5e20', radius: 85,  speed: 2.0, hp: 1100, dmg: 38, xp: 550,  score: 850,  special: 'venom'    },
  { name: 'Ice Titan',    color: '#b3e5fc', fin: '#81d4fa', radius: 100, speed: 1.6, hp: 1500, dmg: 48, xp: 700,  score: 1100, special: 'freeze'   },
];

const DIFFICULTY_MODS = {
  easy:   { hpMult: 0.65, dmgMult: 0.60, speedMult: 0.80 },
  normal: { hpMult: 1.00, dmgMult: 1.00, speedMult: 1.00 },
  hard:   { hpMult: 1.45, dmgMult: 1.50, speedMult: 1.20 },
};

const MIN_BOSS_INTERVAL = 35;  // seconds minimum between bosses
const MAX_BOSS_INTERVAL = 90;  // seconds maximum

export class BossManager {
  constructor() {
    this.boss      = null;
    this._timer    = rand(MIN_BOSS_INTERVAL, MAX_BOSS_INTERVAL);
    this._difficulty = 'normal';
    this._warningTimer = 0;
    this.warning   = false;
  }

  setDifficulty(d) { this._difficulty = d; }

  update(dt, px, py, pr) {
    // Countdown to next boss
    if (!this.boss) {
      this._timer -= dt;
      if (this._warningTimer > 0) {
        this._warningTimer -= dt;
        this.warning = this._warningTimer > 0;
      }
      if (this._timer <= 5 && !this.warning) {
        this.warning = true;
        this._warningTimer = 5;
      }
      if (this._timer <= 0) {
        this.warning = false;
        this._spawnBoss(px, py);
      }
      return null;
    }

    const b = this.boss;
    if (!b.active) { this.boss = null; this._timer = rand(MIN_BOSS_INTERVAL, MAX_BOSS_INTERVAL); return 'dead'; }

    b.update(dt, px, py);
    return null;
  }

  _spawnBoss(px, py) {
    const type = BOSS_TYPES[randInt(0, BOSS_TYPES.length - 1)];
    const diff = DIFFICULTY_MODS[this._difficulty] || DIFFICULTY_MODS.normal;

    // Spawn at edge of screen, away from player
    const angle = rand(0, TWO_PI);
    const spawnDist = 700 + rand(0, 300);
    const sx = clamp(px + Math.cos(angle) * spawnDist, type.radius + 20, WORLD_W - type.radius - 20);
    const sy = clamp(py + Math.sin(angle) * spawnDist, type.radius + 20, WORLD_H - type.radius - 20);

    this.boss = new BossFish(sx, sy, type, diff);
  }

  draw(ctx, cam) { if (this.boss?.active) this.boss.draw(ctx, cam); }
  getBoss() { return this.boss?.active ? this.boss : null; }
}

class BossFish {
  constructor(x, y, type, diffMod) {
    this.x = x; this.y = y;
    this.name    = type.name;
    this.color   = type.color;
    this.fin     = type.fin;
    this.radius  = type.radius;
    this.speed   = type.speed * diffMod.speedMult;
    this.maxHP   = Math.ceil(type.hp  * diffMod.hpMult);
    this.hp      = this.maxHP;
    this.dmg     = Math.ceil(type.dmg * diffMod.dmgMult);
    this.xp      = type.xp;
    this.score   = type.score;
    this.special = type.special;

    this.angle     = 0; this.vx = 0; this.vy = 0;
    this.tailPhase = rand(0, TWO_PI); this.glowPhase = rand(0, TWO_PI);
    this.active    = true;
    this._dmgCooldown = 0;
    this._chargeTimer = 0; this._charging = false;
    this._lureAngle   = 0;
    this._shockTimer  = 0; this._shocked = false;
    this._phaseAlpha  = 1; this._phasing = false;
    this._entry       = 1.5; // entry grace period
  }

  get hpRatio() { return this.hp / this.maxHP; }

  update(dt, px, py) {
    this.glowPhase += dt * 1.8;
    if (this._entry > 0) { this._entry -= dt; return; }
    if (this._dmgCooldown > 0) this._dmgCooldown -= dt;

    // Special behavior
    if (this.special === 'charge') {
      this._chargeTimer -= dt;
      if (this._chargeTimer <= 0) {
        this._charging = !this._charging;
        this._chargeTimer = this._charging ? 0.6 : rand(2.5, 5.0);
      }
    }
    if (this.special === 'phase') {
      this._shockTimer -= dt;
      if (this._shockTimer <= 0) {
        this._phasing = !this._phasing;
        this._shockTimer = this._phasing ? 1.8 : rand(3.0, 7.0);
        this._phaseAlpha = this._phasing ? 0.3 : 1.0;
      }
    }

    // Move toward player
    const dx = px - this.x, dy = py - this.y;
    const targetAngle = Math.atan2(dy, dx);
    this.angle = lerpAngle(this.angle, targetAngle, 0.05);
    const spd = this.speed * (this._charging ? 4.5 : 1.0);
    this.vx = lerp(this.vx, Math.cos(this.angle) * spd, 0.04);
    this.vy = lerp(this.vy, Math.sin(this.angle) * spd, 0.04);
    this.x = clamp(this.x + this.vx * dt * 60, this.radius, WORLD_W - this.radius);
    this.y = clamp(this.y + this.vy * dt * 60, this.radius, WORLD_H - this.radius);
    this.tailPhase += (2.5 + Math.abs(spd) * 0.4) * dt;
    this._lureAngle += dt * 3.5;
  }

  tryDamagePlayer(px, py, pr) {
    if (this._dmgCooldown > 0) return 0;
    if (this._phasing) return 0;
    const d = dist(this.x, this.y, px, py);
    if (d < this.radius + pr - 5) {
      this._dmgCooldown = 1.2;
      return this.dmg;
    }
    return 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) { this.active = false; return true; }
    return false;
  }

  draw(ctx, cam) {
    if (!this.active) return;
    const { x, y } = this;
    if (x < cam.x - this.radius - 60 || x > cam.x + cam.width  + this.radius + 60) return;
    if (y < cam.y - this.radius - 60 || y > cam.y + cam.height + this.radius + 60) return;

    const r = this.radius;
    const wag = Math.sin(this.tailPhase) * 0.35;
    const glowAlpha = 0.18 + Math.sin(this.glowPhase) * 0.08;
    const alpha = this._phaseAlpha ?? 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(this.angle);

    // Outer glow
    ctx.save(); ctx.globalAlpha = glowAlpha * alpha;
    const og = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.2);
    og.addColorStop(0, this.color); og.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TWO_PI); ctx.fill();
    ctx.restore();

    // Tail
    ctx.fillStyle = this.fin; ctx.beginPath();
    ctx.moveTo(-r * 0.55, 0);
    ctx.lineTo(-r * 2.0, -r * 0.9 + wag * r * 0.7);
    ctx.lineTo(-r * 0.85, 0);
    ctx.lineTo(-r * 2.0,  r * 0.9 + wag * r * 0.7);
    ctx.closePath(); ctx.fill();

    // Body
    const bg = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.05, 0, 0, r);
    bg.addColorStop(0, _lighten(this.color, 40));
    bg.addColorStop(0.6, this.color);
    bg.addColorStop(1, _lighten(this.color, -50));
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.58, 0, 0, TWO_PI);
    ctx.fillStyle = bg; ctx.fill();

    // Dorsal fin
    ctx.fillStyle = this.fin; ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.58);
    ctx.lineTo(r * 0.25, -r * 1.1);
    ctx.lineTo(-r * 0.4, -r * 0.58);
    ctx.closePath(); ctx.fill();

    // Anglerfish lure
    if (this.special === 'lure') {
      const lx = Math.cos(this._lureAngle) * r * 0.5 + r * 0.2;
      const ly = Math.sin(this._lureAngle) * r * 0.4 - r * 1.1;
      ctx.strokeStyle = this.fin; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.6); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(this._lureAngle * 3) * 0.35;
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 16);
      lg.addColorStop(0, '#ffee58'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, 16, 0, TWO_PI); ctx.fill(); ctx.restore();
    }

    // Electric shock effect
    if (this.special === 'shock') {
      ctx.save(); ctx.globalAlpha = 0.22 + Math.sin(this.glowPhase * 4) * 0.12;
      ctx.strokeStyle = '#ffee58'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        const a = (TWO_PI / 6) * i + this.glowPhase;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.55);
        ctx.lineTo(Math.cos(a) * r * 1.7, Math.sin(a) * r * 0.9); ctx.stroke();
      }
      ctx.restore();
    }

    // Eye
    ctx.fillStyle = '#100000'; ctx.beginPath(); ctx.arc(r * 0.44, -r * 0.22, r * 0.20, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.arc(r * 0.44, -r * 0.22, r * 0.12, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(r * 0.37, -r * 0.29, r * 0.06, 0, TWO_PI); ctx.fill();

    ctx.restore(); // undo translation/rotation

    // HP bar
    const bw = r * 3.5, bh = 9;
    const bx = x - bw / 2, by = y - r - 26;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath();
    ctx.roundRect?.(bx - 3, by - 2, bw + 6, bh + 4, 4); ctx.fill();
    const hpColor = this.hpRatio > 0.55 ? '#ef5350' : this.hpRatio > 0.28 ? '#ff6d00' : '#b71c1c';
    ctx.fillStyle = hpColor;
    ctx.beginPath(); ctx.roundRect?.(bx, by, bw * this.hpRatio, bh, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.name.toUpperCase(), x, by - 12);
    ctx.restore();

    // Charge warning
    if (this._charging) {
      ctx.save(); ctx.globalAlpha = 0.30 + Math.sin(Date.now() * 0.02) * 0.15;
      ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TWO_PI); ctx.stroke(); ctx.restore();
    }
  }
}

function _lighten(hex, delta) {
  try {
    const n = parseInt(hex.replace('#',''), 16);
    const r = clamp(((n >> 16) & 0xff) + delta, 0, 255);
    const g = clamp(((n >>  8) & 0xff) + delta, 0, 255);
    const b = clamp(( n        & 0xff) + delta, 0, 255);
    return `rgb(${r},${g},${b})`;
  } catch { return hex; }
}
