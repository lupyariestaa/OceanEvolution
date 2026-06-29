// biomes.js V2 — 5 biome definitions scattered across the world

import { WORLD_W, WORLD_H } from './constants.js';

// Each biome occupies a rectangular zone in world space
export const BIOMES = [
  {
    id: 'reef',
    nameKey: 'biomeReef',
    // Top-left quadrant
    x: 0, y: 0, w: WORLD_W * 0.45, h: WORLD_H * 0.45,
    bgTop:    '#0d4f6e', bgBot: '#083d55',
    accent:   '#00bcd4',
    foodMult: 1.3,  enemyMult: 0.8,  xpMult: 1.0,
    particleColor: '#00e5ff',
    musicKey: 'reef',
    fogColor: 'rgba(0,188,212,0.04)',
  },
  {
    id: 'tropical',
    nameKey: 'biomeTropical',
    // Top-right quadrant
    x: WORLD_W * 0.55, y: 0, w: WORLD_W * 0.45, h: WORLD_H * 0.45,
    bgTop:    '#1a6b3c', bgBot: '#0d4726',
    accent:   '#69f0ae',
    foodMult: 1.1,  enemyMult: 1.0,  xpMult: 1.1,
    particleColor: '#b9f6ca',
    musicKey: 'tropical',
    fogColor: 'rgba(105,240,174,0.04)',
  },
  {
    id: 'deep',
    nameKey: 'biomeDeep',
    // Center
    x: WORLD_W * 0.25, y: WORLD_H * 0.25, w: WORLD_W * 0.5, h: WORLD_H * 0.5,
    bgTop:    '#0a1628', bgBot: '#050b14',
    accent:   '#7c4dff',
    foodMult: 0.9,  enemyMult: 1.3,  xpMult: 1.4,
    particleColor: '#b388ff',
    musicKey: 'deep',
    fogColor: 'rgba(124,77,255,0.05)',
  },
  {
    id: 'abyssal',
    nameKey: 'biomeAbyssal',
    // Bottom-center
    x: WORLD_W * 0.2, y: WORLD_H * 0.65, w: WORLD_W * 0.6, h: WORLD_H * 0.35,
    bgTop:    '#060a0f', bgBot: '#020406',
    accent:   '#e040fb',
    foodMult: 0.7,  enemyMult: 1.8,  xpMult: 1.9,
    particleColor: '#ea80fc',
    musicKey: 'abyssal',
    fogColor: 'rgba(224,64,251,0.06)',
  },
  {
    id: 'ice',
    nameKey: 'biomeIce',
    // Bottom-left and bottom-right corners
    x: 0, y: WORLD_H * 0.6, w: WORLD_W * 0.18, h: WORLD_H * 0.4,
    bgTop:    '#b3e5fc', bgBot: '#81d4fa',
    accent:   '#e1f5fe',
    foodMult: 1.0,  enemyMult: 1.2,  xpMult: 1.3,
    particleColor: '#e1f5fe',
    musicKey: 'ice',
    fogColor: 'rgba(179,229,252,0.08)',
  },
];

// Given world coords, return the current biome (defaults to deep ocean)
export function getBiomeAt(x, y) {
  // Priority: smallest/most specific biome first (abyssal, ice, then others)
  const order = ['abyssal', 'ice', 'reef', 'tropical', 'deep'];
  for (const id of order) {
    const b = BIOMES.find(b => b.id === id);
    if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return BIOMES.find(b => b.id === 'deep');
}
