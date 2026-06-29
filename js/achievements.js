// achievements.js V3
import { Storage } from './storage.js';
import { I18n } from './i18n.js';

const ACHIEVEMENTS = [
  { id:'ach_first_evo',     check: s => s.maxLevel >= 3              },
  { id:'ach_100_fish',      check: s => s.fishEaten >= 100           },
  { id:'ach_boss_kill',     check: s => s.bossKilled >= 1            },
  { id:'ach_5_boss',        check: s => s.bossKilled >= 5            },
  { id:'ach_max_evo',       check: s => s.maxLevel >= 36             },
  { id:'ach_5min',          check: s => s.timeSurvived >= 300        },
  { id:'ach_10min',         check: s => s.timeSurvived >= 600        },
  { id:'ach_1k_score',      check: s => (s.highScore||0) >= 1000     },
  { id:'ach_10k_score',     check: s => (s.highScore||0) >= 10000    },
  { id:'ach_deep_diver',    check: s => s.distTraveled >= 50000      },
  { id:'ach_predator_path', check: s => s.chosePredator === true     },
  { id:'ach_toxin_path',    check: s => s.choseToxin === true        },
  { id:'ach_combo_10',      check: s => (s.maxCombo||0) >= 10        },
  { id:'ach_combo_25',      check: s => (s.maxCombo||0) >= 25        },
  { id:'ach_survive_storm', check: s => s.stormssurvived >= 1        },
  { id:'ach_shopaholic',    check: s => (s.itemsBought||0) >= 3      },
  { id:'ach_mutation_3',    check: s => (s.mutationsChosen||0) >= 3  },
];

export function checkAchievements(sessionData){
  const stats = Storage.getStats();
  const combined = { ...stats, ...sessionData };
  const newlyUnlocked = [];
  for(const ach of ACHIEVEMENTS){
    if(!Storage.hasAchievement(ach.id) && ach.check(combined)){
      Storage.unlockAchievement(ach.id);
      newlyUnlocked.push(ach.id);
    }
  }
  return newlyUnlocked;
}
export function getAchievementLabel(id){ return I18n.t(id); }
export const ALL_ACHIEVEMENT_IDS = ACHIEVEMENTS.map(a=>a.id);
