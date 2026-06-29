// utilities.js — shared math helpers V2

export const TWO_PI = Math.PI * 2;

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}
export function lerp(a, b, t) { return a + (b - a) * t; }
export function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff >  Math.PI) diff -= TWO_PI;
  while (diff < -Math.PI) diff += TWO_PI;
  return a + diff * t;
}
export function rand(min, max) { return Math.random() * (max - min) + min; }
export function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
export function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
export function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(Math.floor(n));
}
