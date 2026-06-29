// minimap.js V2 — colorful biome minimap

import { WORLD_W, WORLD_H } from './world.js';
import { BIOMES } from './biomes.js';

const MAP_W = 160, MAP_H = 120, PAD = 14;

export class Minimap {
  constructor() {
    this._canvas = document.createElement('canvas');
    this._canvas.width = MAP_W; this._canvas.height = MAP_H;
    this._ctx = this._canvas.getContext('2d');
    this._drawn = false;
    this._bgCache = null;
  }

  _drawBg() {
    const c = this._ctx;
    // Background
    c.fillStyle = '#060e1e'; c.fillRect(0, 0, MAP_W, MAP_H);
    // Biome zones
    for (const b of BIOMES) {
      const mx = (b.x / WORLD_W) * MAP_W;
      const my = (b.y / WORLD_H) * MAP_H;
      const mw = (b.w / WORLD_W) * MAP_W;
      const mh = (b.h / WORLD_H) * MAP_H;
      c.fillStyle = b.accent + '33';
      c.fillRect(mx, my, mw, mh);
      c.strokeStyle = b.accent + '66'; c.lineWidth = 1;
      c.strokeRect(mx, my, mw, mh);
    }
    this._bgCache = this._ctx.getImageData(0, 0, MAP_W, MAP_H);
  }

  draw(ctx, cam, player, enemies, boss) {
    if (!this._bgCache) this._drawBg();

    const c = this._ctx;
    c.putImageData(this._bgCache, 0, 0);

    // Enemies
    for (const e of enemies) {
      const ex = (e.x / WORLD_W) * MAP_W;
      const ey = (e.y / WORLD_H) * MAP_H;
      c.fillStyle = e.tier === 2 ? '#ef5350' : e.tier === 0 ? '#4dd0e1' : '#aed581';
      c.fillRect(ex - 1, ey - 1, 2.5, 2.5);
    }

    // Boss
    if (boss) {
      const bx = (boss.x / WORLD_W) * MAP_W;
      const by = (boss.y / WORLD_H) * MAP_H;
      c.fillStyle = '#ff6d00';
      c.beginPath(); c.arc(bx, by, 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffd740'; c.lineWidth = 1; c.stroke();
    }

    // Player
    const px = (player.x / WORLD_W) * MAP_W;
    const py = (player.y / WORLD_H) * MAP_H;
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(px, py, 3.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#00e5ff'; c.lineWidth = 1.5; c.stroke();

    // Camera viewport rect
    const vx = (cam.x / WORLD_W) * MAP_W;
    const vy = (cam.y / WORLD_H) * MAP_H;
    const vw = (cam.width  / WORLD_W) * MAP_W;
    const vh = (cam.height / WORLD_H) * MAP_H;
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1;
    c.strokeRect(vx, vy, vw, vh);

    // Draw onto main canvas
    const sx = cam.width  - MAP_W - PAD;
    const sy = cam.height - MAP_H - PAD;

    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = 'rgba(4,14,32,0.78)';
    ctx.beginPath();
    ctx.roundRect?.(sx - 3, sy - 3, MAP_W + 6, MAP_H + 6, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(79,195,247,0.35)'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.drawImage(this._canvas, sx, sy);
    ctx.restore();
  }
}
