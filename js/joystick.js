// joystick.js V3 — virtual joystick for mobile
import { clamp, dist } from './utilities.js';

const JOYSTICK_R   = 55;  // outer ring radius
const KNOB_R       = 24;  // inner knob radius
const DEAD_ZONE    = 0.12;
const ALPHA_IDLE   = 0.28;
const ALPHA_ACTIVE = 0.65;

export class VirtualJoystick {
  constructor(canvas) {
    this.canvas   = canvas;
    this._active  = false;
    this._touchId = null;
    this._baseX   = 0;
    this._baseY   = 0;
    this._knobX   = 0;
    this._knobY   = 0;
    this.dx       = 0;  // -1..1
    this.dy       = 0;
    this._alpha   = ALPHA_IDLE;
    this._visible = false;
    this._isMobile= ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    this._onStart  = this._onStart.bind(this);
    this._onMove   = this._onMove.bind(this);
    this._onEnd    = this._onEnd.bind(this);

    if (this._isMobile) {
      canvas.addEventListener('touchstart', this._onStart, { passive: false });
      canvas.addEventListener('touchmove',  this._onMove,  { passive: false });
      canvas.addEventListener('touchend',   this._onEnd,   { passive: true  });
      canvas.addEventListener('touchcancel',this._onEnd,   { passive: true  });
    }
  }

  _onStart(e) {
    // Use left-half of screen for joystick
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth * 0.55 && this._touchId === null) {
        e.preventDefault();
        this._touchId = t.identifier;
        this._baseX   = t.clientX;
        this._baseY   = t.clientY;
        this._knobX   = t.clientX;
        this._knobY   = t.clientY;
        this._active  = true;
        this._visible = true;
        this._alpha   = ALPHA_ACTIVE;
      }
    }
  }

  _onMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== this._touchId) continue;
      e.preventDefault();
      const dx = t.clientX - this._baseX;
      const dy = t.clientY - this._baseY;
      const d  = Math.sqrt(dx*dx + dy*dy);
      const clamped = Math.min(d, JOYSTICK_R);
      const angle   = Math.atan2(dy, dx);
      this._knobX = this._baseX + Math.cos(angle) * clamped;
      this._knobY = this._baseY + Math.sin(angle) * clamped;
      const norm  = clamped / JOYSTICK_R;
      if (norm > DEAD_ZONE) {
        this.dx = Math.cos(angle) * norm;
        this.dy = Math.sin(angle) * norm;
      } else {
        this.dx = 0; this.dy = 0;
      }
    }
  }

  _onEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this._touchId) {
        this._touchId = null;
        this._active  = false;
        this.dx = 0; this.dy = 0;
        this._alpha = ALPHA_IDLE;
        // Fade out after 1.2s idle
        setTimeout(() => { if (!this._active) this._visible = false; }, 1200);
      }
    }
  }

  // Returns world-space target position given player position
  getTarget(playerX, playerY, camX, camY, speed) {
    if (!this._active || (this.dx === 0 && this.dy === 0)) return null;
    const dist = speed * 80;
    return {
      x: playerX + this.dx * dist,
      y: playerY + this.dy * dist,
    };
  }

  get isMobile() { return this._isMobile; }
  get isActive()  { return this._active && (this.dx !== 0 || this.dy !== 0); }

  draw(ctx) {
    if (!this._isMobile || !this._visible) return;
    ctx.save();
    ctx.globalAlpha = this._alpha;

    // Outer ring
    ctx.beginPath();
    ctx.arc(this._baseX, this._baseY, JOYSTICK_R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(79,195,247,0.9)';
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    ctx.fillStyle   = 'rgba(4,14,32,0.35)';
    ctx.fill();

    // Direction indicator lines
    ctx.globalAlpha = this._alpha * 0.4;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(this._baseX + Math.cos(a) * (JOYSTICK_R * 0.45), this._baseY + Math.sin(a) * (JOYSTICK_R * 0.45));
      ctx.lineTo(this._baseX + Math.cos(a) * (JOYSTICK_R * 0.82), this._baseY + Math.sin(a) * (JOYSTICK_R * 0.82));
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Inner knob
    ctx.globalAlpha = this._alpha * 1.1;
    const kg = ctx.createRadialGradient(this._knobX - 4, this._knobY - 4, 0, this._knobX, this._knobY, KNOB_R);
    kg.addColorStop(0, '#80deea');
    kg.addColorStop(0.6, '#00acc1');
    kg.addColorStop(1, '#006064');
    ctx.beginPath();
    ctx.arc(this._knobX, this._knobY, KNOB_R, 0, Math.PI * 2);
    ctx.fillStyle = kg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(79,195,247,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  destroy() {
    if (!this._isMobile) return;
    this.canvas.removeEventListener('touchstart',  this._onStart);
    this.canvas.removeEventListener('touchmove',   this._onMove);
    this.canvas.removeEventListener('touchend',    this._onEnd);
    this.canvas.removeEventListener('touchcancel', this._onEnd);
  }
}
