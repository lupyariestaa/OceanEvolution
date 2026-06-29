// storage.js V3
const KEY = 'oceanEvolution_v3';
function load(){ try{ const r=localStorage.getItem(KEY); return r?JSON.parse(r):{}; }catch(e){ return {}; } }
function save(d){ try{ localStorage.setItem(KEY,JSON.stringify(d)); }catch(e){} }
let _d = load();

const DEFAULT_STATS = { fishEaten:0, distTraveled:0, timeSurvived:0, bossKilled:0, maxLevel:1, maxCombo:0, totalCoins:0, itemsBought:0, mutationsChosen:0, stormssurvived:0 };

export const Storage = {
  reload(){ _d=load(); },
  // Scores
  getHighScore(){ return _d.highScore||0; },
  setHighScore(v){ _d.highScore=v; save(_d); },
  getLastEvo(){ return _d.lastEvo||'Tiny Fish'; },
  setLastEvo(v){ _d.lastEvo=v; save(_d); },
  // Leaderboard
  getLeaderboard(){ return _d.leaderboard||[]; },
  addLeaderboard(entry){
    let lb=_d.leaderboard||[];
    lb.push(entry); lb.sort((a,b)=>b.score-a.score);
    _d.leaderboard=lb.slice(0,5); save(_d);
  },
  // Stats
  getStats(){ return Object.assign({},DEFAULT_STATS,_d.stats||{}); },
  addStats(delta){
    const s=this.getStats();
    for(const k in delta){ const v=delta[k]; if(typeof v==='boolean') s[k]=s[k]||v; else s[k]=(s[k]||0)+v; }
    _d.stats=s; save(_d);
  },
  setStatMax(key,val){ const s=this.getStats(); if(val>(s[key]||0)){ s[key]=val; _d.stats=s; save(_d); } },
  // Achievements
  getAchievements(){ return _d.achievements||[]; },
  unlockAchievement(id){ const l=_d.achievements||[]; if(!l.includes(id)){ l.push(id); _d.achievements=l; save(_d); return true; } return false; },
  hasAchievement(id){ return (_d.achievements||[]).includes(id); },
  // Settings
  getMute(){ return _d.mute===true; },
  setMute(v){ _d.mute=v; save(_d); },
  getDifficulty(){ return _d.difficulty||'normal'; },
  setDifficulty(v){ _d.difficulty=v; save(_d); },
  getLang(){ return _d.lang||'en'; },
  setLang(v){ _d.lang=v; save(_d); },
  // Coins (persistent across sessions)
  getCoins(){ return _d.coins||0; },
  addCoins(v){ _d.coins=Math.max(0,(_d.coins||0)+v); save(_d); },
  spendCoins(v){ if((_d.coins||0)<v) return false; _d.coins-=v; save(_d); return true; },
  // Skins
  getOwnedSkins(){ return _d.ownedSkins||['default']; },
  ownSkin(id){ const s=_d.ownedSkins||['default']; if(!s.includes(id)){ s.push(id); _d.ownedSkins=s; save(_d); } },
  hasSkin(id){ return (_d.ownedSkins||['default']).includes(id); },
  getEquippedSkin(){ return _d.equippedSkin||'default'; },
  equipSkin(id){ _d.equippedSkin=id; save(_d); },
  // Upgrades (persistent shop upgrades)
  getUpgrades(){ return _d.upgrades||{}; },
  getUpgradeLevel(id){ return (_d.upgrades||{})[id]||0; },
  upgradeLevel(id){ const u=_d.upgrades||{}; u[id]=(u[id]||0)+1; _d.upgrades=u; save(_d); },
  // Daily reward
  getLastDaily(){ return _d.lastDaily||null; },
  claimDaily(){ _d.lastDaily=new Date().toDateString(); save(_d); },
  canClaimDaily(){ return _d.lastDaily!==new Date().toDateString(); },
};
