// collision.js V2

import { dist } from './utilities.js';

export function checkFoodCollision(player, foodManager, particles, audio) {
  if (player.isDead) return [];
  const eaten = [];
  for (const food of foodManager.getActive()) {
    if (dist(player.x, player.y, food.x, food.y) < player.radius + food.r - 2) {
      eaten.push(food); foodManager.remove(food);
      particles.spawnEat(food.x, food.y); audio.playEat();
    }
  }
  return eaten;
}

export function checkEnemyCollision(player, enemyManager, particles, audio) {
  if (player.isDead) return [];
  const results = [];
  for (const enemy of enemyManager.getActive()) {
    if (dist(player.x, player.y, enemy.x, enemy.y) >= player.radius + enemy.radius - 4) continue;
    if (enemy.tier === 0) {
      enemyManager.remove(enemy); particles.spawnEat(enemy.x, enemy.y); audio.playEat();
      results.push({ type: 'eat', enemy });
    } else if (enemy.tier === 2) {
      if (player.radius > enemy.radius * 1.2) {
        enemyManager.remove(enemy); particles.spawnEat(enemy.x, enemy.y); audio.playEat();
        results.push({ type: 'eat', enemy });
      } else {
        if (player.takeDamage(enemy.dmg)) { particles.spawnHit(player.x, player.y); audio.playDamage(); }
        results.push({ type: 'hit', enemy });
      }
    } else {
      if (player.radius > enemy.radius * 1.15) {
        enemyManager.remove(enemy); particles.spawnEat(enemy.x, enemy.y); audio.playEat();
        results.push({ type: 'eat', enemy });
      } else {
        if (player.takeDamage(enemy.dmg)) { particles.spawnHit(player.x, player.y); audio.playDamage(); }
        results.push({ type: 'hit', enemy });
      }
    }
  }
  return results;
}

export function checkBossCollision(player, bossManager, particles, audio) {
  const boss = bossManager.getBoss();
  if (!boss || player.isDead) return false;
  const dmg = boss.tryDamagePlayer(player.x, player.y, player.radius);
  if (dmg > 0) {
    if (player.takeDamage(dmg)) { particles.spawnHit(player.x, player.y); audio.playDamage(); }
    return true;
  }
  return false;
}
