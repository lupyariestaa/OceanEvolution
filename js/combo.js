// combo.js V3 — combo multiplier system
export class ComboSystem {
  constructor(){
    this.count     = 0;
    this.mult      = 1.0;
    this._timer    = 0;
    this._timeout  = 3.5; // seconds before combo resets
    this.maxCombo  = 0;
    this._popped   = false;
  }

  hit(){
    this.count++;
    this._timer = this._timeout;
    this._popped = true;
    // Multiplier: 1x up to 5, then 1.5x up to 10, then 2x up to 20, then 3x+
    if(this.count < 5)       this.mult = 1.0;
    else if(this.count < 10) this.mult = 1.5;
    else if(this.count < 20) this.mult = 2.0;
    else if(this.count < 35) this.mult = 3.0;
    else                     this.mult = 4.0;
    if(this.count > this.maxCombo) this.maxCombo = this.count;
    return this.mult;
  }

  miss(){
    this.count = 0;
    this.mult  = 1.0;
    this._timer = 0;
  }

  update(dt){
    if(this._timer > 0){
      this._timer -= dt;
      if(this._timer <= 0) this.miss();
    }
    this._popped = false;
  }

  isActive(){ return this.count >= 3; }
  justPopped(){ return this._popped; }
  getLabel(){ return this.count >= 3 ? `×${this.mult.toFixed(1)} COMBO x${this.count}` : ''; }
}
