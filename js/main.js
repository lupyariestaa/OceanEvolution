// main.js V3
import { SplashRenderer, GameOverRenderer } from './renderer.js';
import { UI }       from './ui.js';
import { Audio }    from './audio.js';
import { Storage }  from './storage.js';
import { I18n }     from './i18n.js';
import { Game }     from './game.js';
import { shareScore } from './screenshot.js';

// ── Polyfills ─────────────────────────────────────────────────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){ r=Math.min(r,w/2,h/2); this.moveTo(x+r,y); this.lineTo(x+w-r,y); this.arcTo(x+w,y,x+w,y+r,r); this.lineTo(x+w,y+h-r); this.arcTo(x+w,y+h,x+w-r,y+h,r); this.lineTo(x+r,y+h); this.arcTo(x,y+h,x,y+h-r,r); this.lineTo(x,y+r); this.arcTo(x,y,x+r,y,r); this.closePath(); return this; };
}

const $ = id => document.getElementById(id);
let _game=null, _splashRenderer=null, _goRenderer=null, _difficulty='normal';

function runLoader() {
  const bar=$('loading-bar'); let p=0;
  const steps=[{pct:15,ms:110},{pct:35,ms:160},{pct:55,ms:130},{pct:72,ms:190},{pct:88,ms:150},{pct:100,ms:90}];
  let i=0;
  function next(){ if(i>=steps.length){setTimeout(showSplash,250);return;} const s=steps[i++]; p=s.pct; if(bar) bar.style.width=p+'%'; setTimeout(next,s.ms); }
  next();
}

function showSplash() {
  I18n.setLang(Storage.getLang()); _difficulty=Storage.getDifficulty();
  const sc=$('splash-canvas');
  if(sc){ _splashRenderer=new SplashRenderer(sc); _splashRenderer.start(); }
  $('loading-screen')?.classList.add('hidden');
  $('splash-screen')?.classList.remove('hidden');
  UI.init(); UI.showSplashStats(); _applyDifficultyUI();
  const muteBtn=$('mute-btn'); if(muteBtn) muteBtn.textContent=Storage.getMute()?'🔇':'🔊';
}

function startGame() {
  $('splash-screen')?.classList.add('hidden');
  $('gameover-screen')?.classList.add('hidden');
  $('hud')?.classList.remove('hidden');
  if(_splashRenderer){_splashRenderer.stop();_splashRenderer=null;}
  if(_goRenderer){_goRenderer.stop();_goRenderer=null;}
  const canvas=$('game-canvas');
  Audio.setMuted(Storage.getMute());
  _game=new Game(canvas,_difficulty);
  window._game=_game;
  _game.start();
  UI.init();
}

function showGameOverCanvas() {
  const goc=$('go-canvas');
  if(goc){_goRenderer=new GameOverRenderer(goc);_goRenderer.start();}
}

function showGameOverExit() {
  if(_goRenderer){_goRenderer.stop();_goRenderer=null;}
  $('gameover-screen')?.classList.add('hidden');
}

function _applyDifficultyUI() {
  ['easy','normal','hard'].forEach(d=>{ const btn=$(d+'-btn'); if(btn) btn.classList.toggle('active',d===_difficulty); });
}
function setDifficulty(d){ _difficulty=d; Storage.setDifficulty(d); _applyDifficultyUI(); }

window.addEventListener('DOMContentLoaded', () => {
  runLoader();

  // Splash
  $('play-btn')     ?.addEventListener('click', startGame);
  $('easy-btn')     ?.addEventListener('click', ()=>setDifficulty('easy'));
  $('normal-btn')   ?.addEventListener('click', ()=>setDifficulty('normal'));
  $('hard-btn')     ?.addEventListener('click', ()=>setDifficulty('hard'));
  $('lang-btn')     ?.addEventListener('click', ()=>{ UI.toggleLang(); UI.showSplashStats(); });
  $('mute-btn')     ?.addEventListener('click', ()=>{ const m=Audio.toggleMute(); Storage.setMute(m); const b=$('mute-btn'); if(b) b.textContent=m?'🔇':'🔊'; });

  // Shop tabs
  $('tab-skins')    ?.addEventListener('click', ()=>_switchTab('skins'));
  $('tab-upgrades') ?.addEventListener('click', ()=>_switchTab('upgrades'));

  // Pause
  $('resume-btn')   ?.addEventListener('click', ()=>{ $('pause-screen')?.classList.add('hidden'); _game?.resume(); });
  $('menu-btn')     ?.addEventListener('click', ()=>{ $('pause-screen')?.classList.add('hidden'); $('hud')?.classList.add('hidden'); showSplash(); _game=null; });

  // Game Over
  $('restart-btn')  ?.addEventListener('click', ()=>{ showGameOverExit(); startGame(); });
  $('menu-btn2')    ?.addEventListener('click', ()=>{ showGameOverExit(); showSplash(); });
  $('share-btn')    ?.addEventListener('click', async ()=>{ if(_game) { const result=await shareScore(_game._player,_game._timeSurvived,Storage.getHighScore()); UI.showShareResult(result); } });

  // Skill button
  $('skill-btn')    ?.addEventListener('click', ()=>_game?.triggerSkill());

  // Keyboard
  document.addEventListener('keydown', e=>{
    if((e.key==='Enter'||e.key===' ')&&_game?._gameOver){ showGameOverExit(); startGame(); }
  });

  // Daily reward close
  $('daily-skip')   ?.addEventListener('click', ()=>{ $('daily-screen')?.classList.add('hidden'); });

  // Observe game-over screen
  const goScreen=$('gameover-screen');
  if(goScreen){ const obs=new MutationObserver(()=>{ if(!goScreen.classList.contains('hidden')) showGameOverCanvas(); }); obs.observe(goScreen,{attributes:true,attributeFilter:['class']}); }
});

function _switchTab(tab) {
  ['skins','upgrades'].forEach(t => {
    $('tab-'+t)?.classList.toggle('active', t===tab);
    $('shop-'+t)?.classList.toggle('hidden', t!==tab);
  });
}
