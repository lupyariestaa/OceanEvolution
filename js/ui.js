// ui.js V3 — complete HUD
import { I18n }    from './i18n.js';
import { Storage } from './storage.js';
import { EVO_PREDATOR, EVO_TOXIN, EVO_SHARED } from './player.js';
import { formatNum } from './utilities.js';
import { ALL_ACHIEVEMENT_IDS, getAchievementLabel } from './achievements.js';
import { SKINS } from './skins.js';
import { UPGRADES, getUpgradeCost } from './shop.js';

const $ = id => document.getElementById(id);
const _toastTimers = new WeakMap();

function _showToast(el, ms) {
  if (!el) return;
  el.classList.remove('hidden'); el.classList.add('show');
  const prev = _toastTimers.get(el); if (prev) clearTimeout(prev);
  const id = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.classList.add('hidden'), 350); }, ms);
  _toastTimers.set(el, id);
}

export const UI = {
  init() {
    this._applyLang();
    this._buildEvoStages();
    this._buildLeaderboard();
    this._buildAchievements();
    this._buildShop();
    this._resetHUD();
    this._checkDailyReward();
  },

  _applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = I18n.t(el.dataset.i18n); });
    const btn = $('lang-btn'); if (btn) btn.textContent = I18n.getLang() === 'en' ? '🇮🇩 ID' : '🇺🇸 EN';
  },

  toggleLang() { const l = I18n.toggle(); Storage.setLang(l); this._applyLang(); this._buildLeaderboard(); this._buildAchievements(); this._buildShop(); },

  // ── HUD ─────────────────────────────────────────────────────────────────
  update(player, timeSurvived, biomeNameKey, combo, eventKey) {
    if (!player) return;
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('score-val',  formatNum(player.score));
    set('level-val',  player.level);
    set('coins-val',  formatNum(player.coins));
    set('time-val',   _fmtTime(timeSurvived));
    set('biome-val',  I18n.t(biomeNameKey || 'biomeReef'));

    // HP bar
    const hpPct = Math.max(0, Math.min(1, player.hp / player.maxHP));
    const hb = $('health-bar');
    if (hb) { hb.style.width = (hpPct*100).toFixed(1)+'%'; hb.style.background = hpPct>.55?'#4fc3f7':hpPct>.28?'#ffb74d':'#ef5350'; }

    // XP bar
    const xb = $('xp-bar'); if (xb) xb.style.width = (Math.min(1, player.xp/player.xpToNext)*100).toFixed(1)+'%';

    // Evo bar
    const ef = $('evo-fill'); if (ef) ef.style.width = (player.evoProgress*100).toFixed(1)+'%';
    const arr = player._inShared ? EVO_SHARED : (player.path==='toxin' ? EVO_TOXIN : EVO_PREDATOR);
    const nextEvo = arr[player.evoIndex+1];
    set('evo-label', player.evoName);
    set('evo-next', nextEvo ? nextEvo.name+' →' : I18n.t('maxEvo'));

    // Skill btn
    const sb = $('skill-btn');
    if (sb) {
      sb.textContent = player.skillName || '—';
      sb.style.opacity = player.skillCooldownRatio>=1 ? '1' : '0.42';
      sb.style.boxShadow = player.skillCooldownRatio>=1 ? '0 0 12px #00e5ff' : 'none';
    }

    // Boost ring
    const br = $('boost-ring');
    if (br) { const c=2*Math.PI*18; br.style.strokeDashoffset = (c*(1-player.boostCooldownRatio)).toFixed(2); }

    // Combo display
    const cd = $('combo-display');
    if (cd) {
      if (combo && combo.isActive()) {
        cd.textContent = combo.getLabel();
        cd.classList.remove('hidden');
        cd.style.color = combo.count>=20 ? '#ff1744' : combo.count>=10 ? '#ff6d00' : '#fff176';
      } else {
        cd.classList.add('hidden');
      }
    }

    // Event banner
    const eb = $('event-banner');
    if (eb) {
      if (eventKey) { eb.textContent = I18n.t(eventKey); eb.classList.remove('hidden'); }
      else eb.classList.add('hidden');
    }

    // Mutations list
    const ml = $('mut-list');
    if (ml && player._mutations) {
      ml.innerHTML = player._mutations.slice(-4).map(id => `<span class="mut-chip">${_mutIcon(id)}</span>`).join('');
    }
  },

  // ── Splash ────────────────────────────────────────────────────────────────
  showSplashStats() {
    const el = $('splash-stats'); if (!el) return;
    const hs = Storage.getHighScore(), le = Storage.getLastEvo(), coins = Storage.getCoins();
    el.innerHTML = hs>0
      ? `<div class="splash-stat"><span class="splash-stat-label">${I18n.t('best')}</span><span class="splash-stat-val accent">${formatNum(hs)}</span></div>
         <div class="splash-stat"><span class="splash-stat-label">${I18n.t('evolution')}</span><span class="splash-stat-val">${le}</span></div>
         <div class="splash-stat"><span class="splash-stat-label">${I18n.t('coins')}</span><span class="splash-stat-val" style="color:#ffd740">💰${formatNum(coins)}</span></div>`
      : `<div class="splash-stat"><span class="splash-stat-label">${I18n.t('coins')}</span><span class="splash-stat-val" style="color:#ffd740">💰${formatNum(coins)}</span></div>`;
  },

  // ── Path choice ───────────────────────────────────────────────────────────
  showPathChoice(onChoose) {
    const el = $('path-screen'); if (!el) return;
    el.classList.remove('hidden');
    const p = $('choose-predator'), t = $('choose-toxin');
    if (p) p.onclick = () => { el.classList.add('hidden'); onChoose('predator'); };
    if (t) t.onclick = () => { el.classList.add('hidden'); onChoose('toxin');    };
  },

  // ── Mutation choice ───────────────────────────────────────────────────────
  showMutationChoice(mutations, onChoose) {
    const el = $('mutation-screen'); if (!el) return;
    const list = $('mutation-list'); if (!list) return;
    const lang = I18n.getLang();
    list.innerHTML = mutations.map((m, i) =>
      `<button class="mutation-btn" data-idx="${i}">
        <span class="mut-big-icon">${m.icon}</span>
        <span class="mut-name">${lang==='id'?m.nameId:m.name}</span>
        <span class="mut-desc">${lang==='id'?m.descId:m.desc}</span>
      </button>`
    ).join('');
    el.classList.remove('hidden');
    list.querySelectorAll('.mutation-btn').forEach(btn => {
      btn.onclick = () => { el.classList.add('hidden'); onChoose(mutations[+btn.dataset.idx]); };
    });
  },

  // ── Game Over ─────────────────────────────────────────────────────────────
  showGameOver(player, timeSurvived, newBest) {
    const set = (id, v) => { const e=$(id); if(e) e.textContent=v; };
    set('go-score',  formatNum(player.score));
    set('go-best',   formatNum(Storage.getHighScore()));
    set('go-level',  player.level);
    set('go-evo',    player.evoName);
    set('go-time',   _fmtTime(timeSurvived));
    set('go-fish',   player.fishEaten);
    set('go-boss',   player.bossKilled);
    set('go-dist',   Math.floor(player.distTraveled/100)+'m');
    set('go-combo',  player._maxCombo||0);
    set('go-coins',  formatNum(player.coins));
    if (newBest) { const nb=$('go-newbest'); if(nb) nb.classList.remove('hidden'); }
  },

  // ── Shop ─────────────────────────────────────────────────────────────────
  _buildShop() {
    this._buildShopSkins();
    this._buildShopUpgrades();
  },

  _buildShopSkins() {
    const el = $('shop-skins'); if (!el) return;
    const owned = Storage.getOwnedSkins();
    const equipped = Storage.getEquippedSkin();
    el.innerHTML = SKINS.map(sk => {
      const isOwned    = owned.includes(sk.id);
      const isEquipped = equipped === sk.id;
      return `<div class="shop-item ${isEquipped?'equipped':''}" data-skin="${sk.id}">
        <div class="shop-item-color" style="background:${sk.color};box-shadow:${sk.glow?'0 0 12px '+sk.glow:'none'}"></div>
        <div class="shop-item-name">${sk.name}</div>
        <div class="shop-item-desc">${sk.description}</div>
        <button class="shop-btn ${isEquipped?'btn-equipped':isOwned?'btn-equip':'btn-buy'}" data-skin="${sk.id}" data-price="${sk.price}">
          ${isEquipped ? I18n.t('equipped') : isOwned ? I18n.t('equipped').replace('Equipped','Equip') : '💰'+sk.price}
        </button>
      </div>`;
    }).join('');

    el.querySelectorAll('.shop-btn').forEach(btn => {
      btn.onclick = () => {
        const id    = btn.dataset.skin;
        const price = +btn.dataset.price;
        if (Storage.hasSkin(id)) {
          Storage.equipSkin(id);
          this._buildShopSkins();
        } else {
          if (Storage.spendCoins(price)) {
            Storage.ownSkin(id);
            Storage.equipSkin(id);
            Storage.addStats({ itemsBought: 1 });
            this._buildShopSkins();
          } else {
            _showToast($('shop-toast'), 1800);
            const st = $('shop-toast-text'); if(st) st.textContent = I18n.t('notEnoughCoins');
          }
        }
        this.showSplashStats();
      };
    });
  },

  _buildShopUpgrades() {
    const el = $('shop-upgrades'); if (!el) return;
    el.innerHTML = UPGRADES.map(upg => {
      const level   = Storage.getUpgradeLevel(upg.id);
      const maxed   = level >= upg.maxLevel;
      const cost    = getUpgradeCost(upg);
      const lang    = I18n.getLang();
      const stars   = '★'.repeat(level) + '☆'.repeat(upg.maxLevel - level);
      return `<div class="shop-item upg-item">
        <div class="upg-icon">${upg.icon}</div>
        <div class="upg-info">
          <div class="shop-item-name">${lang==='id'?upg.nameId:upg.name} <span class="upg-stars">${stars}</span></div>
          <div class="shop-item-desc">${lang==='id'?upg.descId:upg.desc}</div>
        </div>
        <button class="shop-btn ${maxed?'btn-maxed':'btn-buy'}" data-upg="${upg.id}" data-cost="${cost}" ${maxed?'disabled':''}>
          ${maxed ? 'MAX' : '💰'+cost}
        </button>
      </div>`;
    }).join('');

    el.querySelectorAll('.shop-btn[data-upg]').forEach(btn => {
      btn.onclick = () => {
        const id   = btn.dataset.upg;
        const cost = +btn.dataset.cost;
        if (Storage.spendCoins(cost)) {
          Storage.upgradeLevel(id);
          Storage.addStats({ itemsBought: 1 });
          this._buildShopUpgrades();
        } else {
          const st = $('shop-toast-text'); if(st) st.textContent = I18n.t('notEnoughCoins');
          _showToast($('shop-toast'), 1800);
        }
        this.showSplashStats();
      };
    });
  },

  refreshShop() { this._buildShop(); },

  // ── Daily Reward ─────────────────────────────────────────────────────────
  _checkDailyReward() {
    if (!Storage.canClaimDaily()) return;
    const el = $('daily-screen'); if (!el) return;
    el.classList.remove('hidden');
    const btn = $('daily-claim');
    if (btn) btn.onclick = () => {
      const reward = 150 + Math.floor(Math.random() * 100);
      Storage.addCoins(reward);
      Storage.claimDaily();
      el.classList.add('hidden');
      this.showSplashStats();
      this.refreshShop();
      const rt = $('daily-reward-text'); if(rt) rt.textContent = `+${reward} 💰`;
      _showToast($('daily-toast'), 2500);
    };
  },

  // ── Leaderboard ──────────────────────────────────────────────────────────
  _buildLeaderboard() {
    const el = $('leaderboard-list'); if (!el) return;
    const lb = Storage.getLeaderboard();
    if (!lb.length) { el.innerHTML=`<div class="lb-empty">${I18n.t('score')} —</div>`; return; }
    el.innerHTML = lb.map((e,i) =>
      `<div class="lb-row">
        <span class="lb-rank">#${i+1}</span>
        <span class="lb-name">${e.evo} <span class="lb-path">${e.path||''}</span></span>
        <span class="lb-score accent">${formatNum(e.score)}</span>
      </div>`
    ).join('');
  },

  // ── Achievements ─────────────────────────────────────────────────────────
  _buildAchievements() {
    const el = $('ach-list'); if (!el) return;
    const unlocked = Storage.getAchievements();
    el.innerHTML = ALL_ACHIEVEMENT_IDS.map(id => {
      const done = unlocked.includes(id);
      return `<div class="ach-item ${done?'ach-done':'ach-locked'}">
        <span class="ach-icon">${done?'✅':'🔒'}</span>
        <span class="ach-label">${getAchievementLabel(id)}</span>
      </div>`;
    }).join('');
  },

  refreshAchievements() { this._buildAchievements(); this._buildLeaderboard(); },

  // ── Toasts ───────────────────────────────────────────────────────────────
  showLevelUp(level)     { const t=$('levelup-toast'),tx=$('levelup-text'); if(tx) tx.textContent=`${I18n.t('levelUp')} ${level}`; _showToast(t,1800); },
  showEvolution(name)    { const t=$('evo-toast'),tx=$('evo-text'); if(tx) tx.textContent=`✨ ${name}!`; _showToast(t,2400); },
  showBossWarning()      { _showToast($('boss-toast'),4000); },
  showAchievement(id)    { const t=$('ach-toast'),tx=$('ach-text'); if(tx) tx.textContent=`🏆 ${getAchievementLabel(id)}`; _showToast(t,3000); },
  showEvent(key)         { const t=$('event-toast'),tx=$('event-text'); if(tx) tx.textContent=I18n.t(key); _showToast(t,3500); },
  showBiomeEnter(key)    { const t=$('biome-toast'),tx=$('biome-text'); if(tx) tx.textContent=`🗺 ${I18n.t(key)}`; _showToast(t,2000); },
  showShareResult(result){ const t=$('share-toast'),tx=$('share-text'); if(tx) tx.textContent=result==='shared'?'✅ Shared!':result==='downloaded'?'📥 Downloaded!':I18n.t('copied'); _showToast(t,2500); },

  // ── Evo stages ────────────────────────────────────────────────────────────
  _buildEvoStages() {
    const el = $('evo-stages'); if (!el) return; el.innerHTML='';
    const all = [...EVO_SHARED,...EVO_PREDATOR];
    for(let i=1;i<all.length;i++){
      const m=document.createElement('div'); m.className='evo-stage-marker'; m.style.left=((i/all.length)*100)+'%'; m.title=all[i].name; el.appendChild(m);
    }
  },

  _resetHUD() {
    const set=(id,v)=>{const e=$(id);if(e) e.textContent=v;};
    set('score-val','0'); set('level-val','1'); set('time-val','0:00'); set('coins-val','0');
    const hb=$('health-bar'); if(hb){hb.style.width='100%';hb.style.background='#4fc3f7';}
    const xb=$('xp-bar'); if(xb) xb.style.width='0%';
    const ef=$('evo-fill'); if(ef) ef.style.width='0%';
    set('evo-label','Tiny Fish'); set('evo-next','Small Fish →');
    const nb=$('go-newbest'); if(nb) nb.classList.add('hidden');
  },
};

const MUT_ICONS = { speed_up:'⚡',hp_up:'❤️',dmg_reduce:'🛡',magnet:'🧲',xp_boost:'✨',regen:'💚',coin_boost:'💰',boost_cd:'🌀',score_mult:'🏆',size_down:'🤏',thorns:'🌵',skill_cd:'⚙️' };
function _mutIcon(id){ return MUT_ICONS[id]||'🔮'; }
function _fmtTime(s){ const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m}:${sec.toString().padStart(2,'0')}`; }
