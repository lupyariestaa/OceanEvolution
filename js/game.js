// game.js V3 — full game loop with all V3 systems
import { Camera }           from './camera.js';
import { Input }            from './input.js';
import { VirtualJoystick }  from './joystick.js';
import { Player }           from './player.js';
import { World, WORLD_W, WORLD_H } from './world.js';
import { FoodManager }      from './food.js';
import { EnemyManager }     from './enemy.js';
import { BossManager }      from './boss.js';
import { ParticleSystem }   from './particles.js';
import { Minimap }          from './minimap.js';
import { EventManager }     from './events.js';
import { ComboSystem }      from './combo.js';
import { UI }               from './ui.js';
import { Audio }            from './audio.js';
import { Storage }          from './storage.js';
import { getBiomeAt }       from './biomes.js';
import { checkFoodCollision, checkEnemyCollision, checkBossCollision } from './collision.js';
import { checkAchievements } from './achievements.js';
import { rollMutations }    from './mutations.js';
import { applyShopUpgrades } from './shop.js';
import { getSkin }           from './skins.js';
import { clamp, dist }       from './utilities.js';

const TRAIL_INTERVAL = 0.055;
const COIN_DRAIN_RATE = 0; // coins are permanent in V3

export class Game {
  constructor(canvas, difficulty='normal') {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._diff  = difficulty;

    this._camera    = new Camera();
    this._input     = new Input(canvas);
    this._joystick  = new VirtualJoystick(canvas);
    this._world     = new World();
    this._food      = new FoodManager();
    this._enemies   = new EnemyManager();
    this._boss      = new BossManager();
    this._particles = new ParticleSystem();
    this._minimap   = new Minimap();
    this._events    = new EventManager();
    this._combo     = new ComboSystem();

    this._enemies.setDifficulty(difficulty);
    this._boss.setDifficulty(difficulty);

    const cx = WORLD_W/2, cy = WORLD_H/2;
    this._player = new Player(cx, cy);

    // Apply skin & shop upgrades
    const skin = Storage.getEquippedSkin();
    this._player.setSkin(skin);
    applyShopUpgrades(this._player);

    this._food.spawnInitial();
    this._enemies.spawnInitial(0);

    this._paused       = false;
    this._gameOver     = false;
    this._timeSurvived = 0;
    this._trailTimer   = 0;
    this._currentBiome = getBiomeAt(cx, cy);
    this._pendingPath  = false;
    this._pendingMut   = false;
    this._bossWarnFired= false;
    this._lastEventKey = null;
    this._stormSurvived= false;

    this._raf  = null;
    this._last = 0;

    Audio.start();
    Audio.setBiome(this._currentBiome.id);
    this._resize();

    window.addEventListener('resize', () => this._resize());
    document.addEventListener('keydown', e => {
      if (e.key==='p'||e.key==='P'||e.key==='Escape') this.togglePause();
      if (e.key==='m'||e.key==='M') { const m=Audio.toggleMute(); Storage.setMute(m); }
    });
  }

  start() { this._last=performance.now(); this._raf=requestAnimationFrame(t=>this._loop(t)); }
  pause()  { this._paused=true; }
  resume() { this._paused=false; this._last=performance.now(); if(!this._gameOver) this._raf=requestAnimationFrame(t=>this._loop(t)); }

  togglePause() {
    if (this._gameOver) return;
    if (this._paused) { document.getElementById('pause-screen')?.classList.add('hidden'); this.resume(); }
    else { this._paused=true; document.getElementById('pause-screen')?.classList.remove('hidden'); cancelAnimationFrame(this._raf); }
  }

  resize() { this._resize(); }
  _resize() { this.canvas.width=window.innerWidth; this.canvas.height=window.innerHeight; this._camera.resize(this.canvas.width,this.canvas.height); }

  triggerSkill() {
    const p=this._player;
    if (p.triggerSkill()) {
      Audio.playSkill();
      this._particles.spawnSkill(p.x,p.y,p.skillEffect,this._currentBiome.accent);
      this._enemies.applySkillEffect(p.x,p.y,p.radius*4,p.skillEffect);
    }
  }

  _loop(now) {
    const dt = clamp((now-this._last)/1000,0,0.05);
    this._last = now;
    this._update(dt);
    this._draw();
    if (!this._paused && !this._gameOver) this._raf=requestAnimationFrame(t=>this._loop(t));
  }

  _update(dt) {
    const p = this._player;
    if (p.isDead) { this._handleDeath(); return; }

    this._timeSurvived += dt;

    // Events
    this._events.update(dt);
    const evKey = this._events.getEventKey();
    if (evKey && evKey !== this._lastEventKey) {
      this._lastEventKey = evKey;
      UI.showEvent(evKey);
      Audio.playBossWarning();
      if (evKey==='eventBadai') this._stormActive = true;
    }
    if (!evKey) { this._lastEventKey=null; if(this._stormActive){ this._stormActive=false; Storage.addStats({stormssurvived:1}); } }

    // Input — joystick overrides mouse on mobile
    this._input.updateWorld(this._camera.x,this._camera.y);
    let targetX=this._input.x, targetY=this._input.y;
    if (this._joystick.isActive) {
      const jt = this._joystick.getTarget(p.x,p.y,this._camera.x,this._camera.y,p.speed);
      if (jt) { targetX=jt.x; targetY=jt.y; }
    }
    if (this._input.consumeBoost()) { if(p.triggerBoost()) Audio.playBoost(); }
    if (this._input.consumeSkill()) this.triggerSkill();

    // Player
    p.update(dt,targetX,targetY,WORLD_W,WORLD_H,this._events.windX,this._events.windY);

    // Combo update
    this._combo.update(dt);

    // Magnet — pull food toward player
    const magR = p.magnetRadius;
    if (magR>0) {
      for (const food of this._food.getActive()) {
        const d = dist(p.x,p.y,food.x,food.y);
        if (d<magR && d>1) {
          const speed = (1-d/magR)*4.5;
          food.x += (p.x-food.x)/d*speed*dt*60;
          food.y += (p.y-food.y)/d*speed*dt*60;
        }
      }
    }

    // Path choice
    if (!this._pendingPath && p.needsPathChoice()) {
      this._pendingPath=true; this._paused=true;
      cancelAnimationFrame(this._raf);
      UI.showPathChoice(path => {
        p.choosePath(path);
        this._pendingPath=false; this._paused=false;
        Storage.addStats({ chosePredator:path==='predator', choseToxin:path==='toxin' });
        this._last=performance.now();
        this._raf=requestAnimationFrame(t=>this._loop(t));
        this._particles.spawnEvolution(p.x,p.y,p.evoName);
        Audio.playEvolution();
      });
      return;
    }

    // Mutation choice on evolve
    if (!this._pendingMut && p.tryEvolve()) {
      UI.showEvolution(p.evoName);
      this._particles.spawnEvolution(p.x,p.y,p.evoName);
      Audio.playEvolution();
      this._pendingMut=true; this._paused=true;
      cancelAnimationFrame(this._raf);
      const muts = rollMutations(3);
      UI.showMutationChoice(muts, chosen => {
        p.applyMutation(chosen);
        Storage.addStats({mutationsChosen:1});
        this._pendingMut=false; this._paused=false;
        this._last=performance.now();
        this._raf=requestAnimationFrame(t=>this._loop(t));
      });
    }

    // Biome
    const biome = getBiomeAt(p.x,p.y);
    if (biome.id!==this._currentBiome.id) {
      this._currentBiome=biome;
      this._world.setCurrentBiome(biome);
      Audio.setBiome(biome.id);
      UI.showBiomeEnter(biome.nameKey);
    }

    // Trail
    this._trailTimer+=dt;
    if (this._trailTimer>=TRAIL_INTERVAL) {
      this._trailTimer=0;
      this._particles.spawnTrail(p.x,p.y,p._boosting?'#00e5ff':this._currentBiome.accent);
    }

    // World
    this._world.update(dt);
    this._food.update(dt);
    this._enemies.update(dt,p.x,p.y,p.radius,p.evoIndex);

    // Boss
    const prevBoss = this._boss.getBoss();
    const bossResult = this._boss.update(dt,p.x,p.y,p.radius);
    if (bossResult==='dead'&&prevBoss) {
      this._particles.spawnBoss(p.x,p.y);
      Audio.playBossDead();
      p.bossKilled++;
      p.gainXP(prevBoss.xp||500);
      p.score+=prevBoss.score||800;
      p.coins+=Math.ceil((prevBoss.score||800)*0.12);
    }
    if (this._boss.warning&&!this._bossWarnFired) { this._bossWarnFired=true; UI.showBossWarning(); Audio.playBossWarning(); }
    if (!this._boss.warning) this._bossWarnFired=false;

    this._particles.update(dt);

    // Collisions — food
    const foodEaten = checkFoodCollision(p,this._food,this._particles,Audio);
    for (const food of foodEaten) {
      const leveled=p.gainXP(food.xp);
      this._combo.hit();
      if (leveled) { UI.showLevelUp(p.level); this._particles.spawnLevelUp(p.x,p.y,p.level); Audio.playLevelUp(); }
      p.fishEaten++;
    }
    if (foodEaten.length===0 && this._combo.count>0) {
      // Don't reset on non-eating frames; combo resets on timer
    }

    // Collisions — enemies
    const enemyHits = checkEnemyCollision(p,this._enemies,this._particles,Audio);
    for (const hit of enemyHits) {
      if (hit.type==='eat') {
        p.fishEaten++;
        this._combo.hit();
        const leveled=p.gainXP(hit.enemy.xp);
        p.score+=Math.ceil(hit.enemy.score*(p._mutScoreMult||1)*this._combo.mult);
        if (leveled) { UI.showLevelUp(p.level); this._particles.spawnLevelUp(p.x,p.y,p.level); Audio.playLevelUp(); }
      } else {
        this._combo.miss();
      }
    }

    // Collisions — boss
    const bossHit = checkBossCollision(p,this._boss,this._particles,Audio);
    if (bossHit==='killed') {
      this._particles.spawnBoss(p.x,p.y);
      Audio.playBossDead();
    }

    // Max combo tracking
    if (this._combo.maxCombo>(p._maxCombo||0)) p._maxCombo=this._combo.maxCombo;

    // Camera
    this._camera.follow(p.x,p.y,WORLD_W,WORLD_H,dt);

    // HUD
    UI.update(p,this._timeSurvived,this._currentBiome.nameKey,this._combo,this._events.getEventKey());

    // Achievements
    const newAchs = checkAchievements({ fishEaten:p.fishEaten,bossKilled:p.bossKilled,maxLevel:p.level,timeSurvived:this._timeSurvived,highScore:p.score,distTraveled:p.distTraveled,maxCombo:this._combo.maxCombo,chosePredator:p.path==='predator',choseToxin:p.path==='toxin',stormssurvived:this._stormActive?1:0,itemsBought:Storage.getStats().itemsBought,mutationsChosen:Storage.getStats().mutationsChosen });
    for (const id of newAchs) { UI.showAchievement(id); Audio.playAchievement(); }
  }

  _handleDeath() {
    if (this._gameOver) return;
    this._gameOver=true;
    Audio.playGameOver();
    const p=this._player;
    // Add session coins to permanent storage
    Storage.addCoins(p.coins);
    const hs=Storage.getHighScore();
    const newBest=p.score>hs;
    if (newBest) Storage.setHighScore(p.score);
    Storage.setLastEvo(p.evoName);
    Storage.addLeaderboard({score:p.score,level:p.level,evo:p.evoName,path:p.path||'none',date:new Date().toLocaleDateString()});
    Storage.addStats({fishEaten:p.fishEaten,bossKilled:p.bossKilled,timeSurvived:Math.floor(this._timeSurvived),distTraveled:Math.floor(p.distTraveled),maxCombo:this._combo.maxCombo,totalCoins:p.coins,chosePredator:p.path==='predator',choseToxin:p.path==='toxin'});
    Storage.setStatMax('maxLevel',p.level);
    checkAchievements({fishEaten:p.fishEaten,bossKilled:p.bossKilled,maxLevel:p.level,timeSurvived:this._timeSurvived,highScore:p.score,distTraveled:p.distTraveled,maxCombo:this._combo.maxCombo,itemsBought:Storage.getStats().itemsBought,mutationsChosen:Storage.getStats().mutationsChosen,stormssurvived:Storage.getStats().stormssurvived});
    UI.refreshAchievements();
    UI.showGameOver(p,this._timeSurvived,newBest);
    setTimeout(() => { document.getElementById('gameover-screen')?.classList.remove('hidden'); cancelAnimationFrame(this._raf); },1200);
  }

  _draw() {
    const{ctx,canvas,_camera:cam}=this;
    const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);
    this._world.drawBackground(ctx,cam);

    // Night overlay
    const night=this._events.getDayOverlay();
    if (night) { ctx.fillStyle=night.color; ctx.fillRect(0,0,w,h); }

    cam.apply(ctx);
    this._world.drawMidground(ctx,cam);
    this._food.draw(ctx,cam);
    this._enemies.draw(ctx,cam);
    this._boss.draw(ctx,cam);
    this._particles.draw(ctx,cam);
    this._player.draw(ctx);
    this._world.drawForeground(ctx,cam);
    cam.restore(ctx);

    // Storm overlay
    const storm=this._events.getStormOverlay();
    if (storm) { ctx.save(); ctx.globalAlpha=storm.alpha; ctx.fillStyle='#607d8b'; ctx.fillRect(0,0,w,h); ctx.restore(); }

    // Boss warning pulse
    if (this._boss.warning) { ctx.save(); ctx.globalAlpha=0.06+Math.sin(Date.now()*0.008)*0.04; ctx.fillStyle='#ef5350'; ctx.fillRect(0,0,w,h); ctx.restore(); }

    // Night vignette
    if (!this._events.dayTime) { ctx.save(); ctx.globalAlpha=0.18; const vg=ctx.createRadialGradient(w/2,h/2,h*0.2,w/2,h/2,h*0.85); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,60,0.6)'); ctx.fillStyle=vg; ctx.fillRect(0,0,w,h); ctx.restore(); }

    this._drawDepth(ctx,w,h);
    this._minimap.draw(ctx,cam,this._player,this._enemies.getActive(),this._boss.getBoss());
    this._joystick.draw(ctx);
  }

  _drawDepth(ctx,w,h) {
    const depth=Math.floor((this._player.y/WORLD_H)*3000);
    ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle=this._currentBiome.accent||'#b2dfdb';
    ctx.font='bold 11px system-ui,sans-serif'; ctx.textAlign='right';
    ctx.fillText(`▼ ${depth}m`,w-14,h-28); ctx.restore();
  }
}
