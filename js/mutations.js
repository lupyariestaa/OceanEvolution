// mutations.js V3 — mutation pick-3 system on evolution
import { rand, randInt } from './utilities.js';

export const MUTATION_POOL = [
  { id:'speed_up',    icon:'⚡', name:'Swift',        nameId:'Cepat',       desc:'+20% speed',               descId:'+20% kecepatan',        apply: p => { p._mutSpeedMult = (p._mutSpeedMult||1)*1.20; } },
  { id:'hp_up',       icon:'❤️', name:'Tough',         nameId:'Kuat',        desc:'+25% max HP',              descId:'+25% HP maksimal',      apply: p => { p.maxHP = Math.ceil(p.maxHP*1.25); p.hp=Math.min(p.hp+80,p.maxHP); } },
  { id:'dmg_reduce',  icon:'🛡', name:'Armored',       nameId:'Berlapis',    desc:'-20% damage taken',        descId:'-20% damage diterima',  apply: p => { p._mutDmgReduce = (p._mutDmgReduce||0)+0.20; } },
  { id:'magnet',      icon:'🧲', name:'Magnet',        nameId:'Magnet',      desc:'Auto-attract nearby food', descId:'Tarik food otomatis',   apply: p => { p._mutMagnet = (p._mutMagnet||0)+80; } },
  { id:'xp_boost',    icon:'✨', name:'Genius',        nameId:'Jenius',      desc:'+30% XP gain',             descId:'+30% XP didapat',       apply: p => { p._mutXpMult = (p._mutXpMult||1)*1.30; } },
  { id:'regen',       icon:'💚', name:'Regen',         nameId:'Regenerasi',  desc:'Slow HP regen',            descId:'HP pulih perlahan',     apply: p => { p._mutRegen = (p._mutRegen||0)+2.5; } },
  { id:'coin_boost',  icon:'💰', name:'Wealthy',       nameId:'Kaya',        desc:'+40% coins earned',        descId:'+40% koin didapat',     apply: p => { p._mutCoinMult = (p._mutCoinMult||1)*1.40; } },
  { id:'boost_cd',    icon:'🌀', name:'Turbo',         nameId:'Turbo',       desc:'-25% boost cooldown',      descId:'-25% cooldown boost',   apply: p => { p._mutBoostCdMult = (p._mutBoostCdMult||1)*0.75; } },
  { id:'score_mult',  icon:'🏆', name:'Champion',      nameId:'Juara',       desc:'+25% score',               descId:'+25% skor',             apply: p => { p._mutScoreMult = (p._mutScoreMult||1)*1.25; } },
  { id:'size_down',   icon:'🤏', name:'Tiny Terror',   nameId:'Mungil',      desc:'-15% size, +15% speed',   descId:'-15% ukuran, +15% speed',apply: p => { p.radius=Math.max(6,p.radius*0.85); p._mutSpeedMult=(p._mutSpeedMult||1)*1.15; } },
  { id:'thorns',      icon:'🌵', name:'Thorns',        nameId:'Duri',        desc:'Reflect 15% damage',       descId:'Pantulkan 15% damage',  apply: p => { p._mutThorns = (p._mutThorns||0)+0.15; } },
  { id:'skill_cd',    icon:'⚙️', name:'Focused',       nameId:'Fokus',       desc:'-30% skill cooldown',      descId:'-30% cooldown skill',   apply: p => { p._mutSkillCdMult = (p._mutSkillCdMult||1)*0.70; } },
];

/** Pick 3 unique random mutations */
export function rollMutations(count=3){
  const pool = [...MUTATION_POOL];
  const picks = [];
  while(picks.length < count && pool.length > 0){
    const i = randInt(0, pool.length-1);
    picks.push(pool.splice(i,1)[0]);
  }
  return picks;
}
