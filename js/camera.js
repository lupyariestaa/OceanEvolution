// camera.js V2
import { clamp, lerp } from './utilities.js';

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this._lerpSpeed = 5.0;
  }
  resize(w, h) { this.width = w; this.height = h; }
  follow(tx, ty, wW, wH, dt) {
    const dx = tx - this.width / 2;
    const dy = ty - this.height / 2;
    const t = clamp(this._lerpSpeed * dt, 0, 1);
    this.x = lerp(this.x, dx, t);
    this.y = lerp(this.y, dy, t);
    this.x = clamp(this.x, 0, Math.max(0, wW - this.width));
    this.y = clamp(this.y, 0, Math.max(0, wH - this.height));
  }
  apply(ctx)   { ctx.save(); ctx.translate(-Math.round(this.x), -Math.round(this.y)); }
  restore(ctx) { ctx.restore(); }
  toWorld(sx, sy) { return { x: sx + this.x, y: sy + this.y }; }
}
