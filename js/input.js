// input.js V2 — mouse + touch + skill key (Q / HUD button)

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.rawX = canvas.width / 2;
    this.rawY = canvas.height / 2;
    this.x = this.rawX;
    this.y = this.rawY;
    this._boost = false;
    this._skill = false;

    this._onMove   = e => { this.rawX = e.clientX; this.rawY = e.clientY; };
    this._onTouch  = e => { if (e.touches[0]) { this.rawX = e.touches[0].clientX; this.rawY = e.touches[0].clientY; } };
    this._onClick  = e => { if (e.button === 0) this._boost = true; };
    this._onKey    = e => { if (e.key === 'q' || e.key === 'Q') this._skill = true; };
    this._onTap2   = e => { if (e.touches.length >= 2) this._boost = true; };

    canvas.addEventListener('mousemove',  this._onMove);
    canvas.addEventListener('touchmove',  this._onTouch, { passive: true });
    canvas.addEventListener('touchstart', this._onTouch, { passive: true });
    canvas.addEventListener('touchstart', this._onTap2,  { passive: true });
    canvas.addEventListener('mousedown',  this._onClick);
    document.addEventListener('keydown',  this._onKey);
  }

  updateWorld(camX, camY) { this.x = this.rawX + camX; this.y = this.rawY + camY; }
  consumeBoost() { if (this._boost) { this._boost = false; return true; } return false; }
  consumeSkill() { if (this._skill) { this._skill = false; return true; } return false; }
  triggerSkill() { this._skill = true; }

  destroy() {
    this.canvas.removeEventListener('mousemove',  this._onMove);
    this.canvas.removeEventListener('touchmove',  this._onTouch);
    this.canvas.removeEventListener('touchstart', this._onTouch);
    this.canvas.removeEventListener('touchstart', this._onTap2);
    this.canvas.removeEventListener('mousedown',  this._onClick);
    document.removeEventListener('keydown',       this._onKey);
  }
}
