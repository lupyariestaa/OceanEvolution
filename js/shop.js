// shop.js V3 — persistent shop: skins + upgrades
import { Storage } from './storage.js';
import { SKINS } from './skins.js';
import { I18n } from './i18n.js';

export const UPGRADES = [
  { id:'speed',     icon:'⚡', maxLevel:5, baseCost:100, costMult:1.6, name:'Speed',      nameId:'Kecepatan',  desc:'+8% base speed per level',    descId:'+8% kecepatan per level'   },
  { id:'hp',        icon:'❤️', maxLevel:5, baseCost:120, costMult:1.6, name:'HP',         nameId:'HP',         desc:'+15% max HP per level',        descId:'+15% HP maks per level'    },
  { id:'xp',        icon:'✨', maxLevel:4, baseCost:150, costMult:1.7, name:'XP Boost',   nameId:'Bonus XP',   desc:'+12% XP per level',            descId:'+12% XP per level'         },
  { id:'magnet',    icon:'🧲', maxLevel:3, baseCost:200, costMult:2.0, name:'Magnet',     nameId:'Magnet',     desc:'Attract food radius per level', descId:'Radius tarik food per level'},
  { id:'boost_cd',  icon:'🌀', maxLevel:3, baseCost:180, costMult:1.8, name:'Boost CD',   nameId:'Boost CD',   desc:'-12% boost cooldown per level', descId:'-12% cooldown boost/level' },
  { id:'coin_rate', icon:'💰', maxLevel:5, baseCost:130, costMult:1.5, name:'Coin Rate',  nameId:'Koin Rate',  desc:'+15% coins per level',          descId:'+15% koin per level'       },
];

export function getUpgradeCost(upg){
  const level = Storage.getUpgradeLevel(upg.id);
  return Math.ceil(upg.baseCost * Math.pow(upg.costMult, level));
}

export function applyShopUpgrades(player){
  for(const upg of UPGRADES){
    const level = Storage.getUpgradeLevel(upg.id);
    if(level === 0) continue;
    switch(upg.id){
      case 'speed':    player._shopSpeedMult   = 1 + level*0.08; break;
      case 'hp':       player.maxHP = Math.ceil(player.maxHP*(1+level*0.15)); player.hp=Math.min(player.hp,player.maxHP); break;
      case 'xp':       player._shopXpMult      = 1 + level*0.12; break;
      case 'magnet':   player._shopMagnet      = level*60; break;
      case 'boost_cd': player._shopBoostCdMult = 1 - level*0.12; break;
      case 'coin_rate':player._shopCoinMult    = 1 + level*0.15; break;
    }
  }
}
