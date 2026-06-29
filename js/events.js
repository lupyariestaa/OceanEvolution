// events.js V3 — special world events: storm, current, food rain, day/night cycle
import { rand, randInt, clamp } from './utilities.js';

const EVENT_TYPES = [
  { id:'storm',    duration:25, interval:[60,120], weight:2 },
  { id:'current',  duration:18, interval:[45,90],  weight:3 },
  { id:'foodrain', duration:12, interval:[50,100], weight:2 },
  { id:'night',    duration:40, interval:[90,150], weight:1 },
];

export class EventManager {
  constructor(){
    this.active     = null;  // current event
    this._timer     = 0;
    this._nextIn    = rand(30,70); // seconds until first event
    this._notified  = false;
    this.dayTime    = true;  // true=day false=night
    this._dayTimer  = 0;
    this._dayCycle  = 120;   // seconds per full day/night cycle
    // Current effect values
    this.windX      = 0;
    this.windY      = 0;
    this.foodMult   = 1.0;
    this.visibilityMult = 1.0;
    this.enemySpeedMult = 1.0;
  }

  update(dt){
    // Day/night cycle
    this._dayTimer += dt;
    if(this._dayTimer >= this._dayCycle){
      this._dayTimer = 0;
      this.dayTime = !this.dayTime;
    }
    const dayRatio = this._dayTimer / this._dayCycle;
    this.visibilityMult = this.dayTime
      ? clamp(1 - Math.sin(dayRatio*Math.PI)*0.15, 0.85, 1.0)
      : clamp(0.5 + Math.sin(dayRatio*Math.PI)*0.2, 0.35, 0.70);
    this.enemySpeedMult = this.dayTime ? 1.0 : 1.22;

    if(this.active){
      this._timer -= dt;
      this._applyEffect(dt);
      if(this._timer <= 0){ this._endEvent(); }
      return;
    }

    this._nextIn -= dt;
    this._notified = false;
    this.windX = 0; this.windY = 0; this.foodMult = 1.0;
    if(this._nextIn <= 0) this._startEvent();
  }

  _startEvent(){
    const total = EVENT_TYPES.reduce((s,e)=>s+e.weight,0);
    let r = Math.random()*total;
    let type = EVENT_TYPES[0];
    for(const e of EVENT_TYPES){ r-=e.weight; if(r<=0){ type=e; break; } }
    this.active = { ...type };
    this._timer = type.duration;
    this._notified = true;

    if(type.id==='storm'){
      const ang = rand(0,Math.PI*2);
      this.windX = Math.cos(ang)*3.5;
      this.windY = Math.sin(ang)*3.5;
    } else if(type.id==='current'){
      this.windX = rand(-2.5,2.5);
      this.windY = rand(-1.5,1.5);
    } else if(type.id==='foodrain'){
      this.foodMult = 3.5;
    }
  }

  _applyEffect(dt){
    if(!this.active) return;
    if(this.active.id==='storm'){
      // Wind varies slightly
      this.windX += rand(-0.05,0.05);
      this.windY += rand(-0.05,0.05);
    }
  }

  _endEvent(){
    this.active = null;
    this.windX = 0; this.windY = 0; this.foodMult = 1.0;
    const t = EVENT_TYPES[0];
    this._nextIn = rand(t.interval[0], t.interval[1]);
  }

  isNewEvent(){ return this._notified; }
  consumeNotify(){ this._notified = false; }

  getEventKey(){
    if(!this.active) return null;
    return { storm:'eventBadai', current:'eventArus', foodrain:'eventHujan', night:'eventNight' }[this.active.id] || null;
  }

  getDayOverlay(){
    if(this.dayTime) return null;
    const t = this._dayTimer / this._dayCycle;
    const alpha = 0.30 + Math.sin(t*Math.PI)*0.15;
    return { color:'rgba(5,10,30,'+alpha+')', alpha };
  }

  getStormOverlay(){
    if(!this.active || this.active.id!=='storm') return null;
    const frac = 1-(this._timer/this.active.duration);
    return { alpha: Math.min(0.18, frac*0.18) };
  }
}
