// screenshot.js V3 — generate share card and export/copy
import { I18n } from './i18n.js';
import { formatNum } from './utilities.js';

export function generateShareCard(player, timeSurvived, highScore) {
  const W = 520, H = 280;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#050d18');
  bg.addColorStop(0.5, '#071524');
  bg.addColorStop(1, '#050d18');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative border
  ctx.strokeStyle = 'rgba(0,229,255,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Inner glow corners
  const corners = [[12, 12], [W - 12, 12], [12, H - 12], [W - 12, H - 12]];
  corners.forEach(([cx, cy]) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
    g.addColorStop(0, 'rgba(0,229,255,0.15)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 40, cy - 40, 80, 80);
  });

  // Title
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌊 Ocean Evolution V3', W / 2, 44);

  // Fish emoji large
  ctx.font = '52px system-ui';
  ctx.fillText(player.path === 'toxin' ? '🐡' : '🦈', 72, 130);

  // Evo name & path
  ctx.fillStyle = '#e0f7fa';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(player.evoName, 120, 95);

  ctx.fillStyle = player.path === 'toxin' ? '#76ff03' : '#ef5350';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(player.path === 'toxin' ? '☠ Toxin Path' : '🦈 Predator Path', 120, 115);

  // Stats grid
  const stats = [
    { label: 'SCORE',    value: formatNum(player.score),      color: '#00e5ff' },
    { label: 'LEVEL',    value: String(player.level),         color: '#fff176' },
    { label: 'BEST',     value: formatNum(highScore),         color: '#ffd740' },
    { label: 'TIME',     value: _fmtTime(timeSurvived),       color: '#69f0ae' },
    { label: 'FISH',     value: String(player.fishEaten),     color: '#80cbc4' },
    { label: 'BOSSES',   value: String(player.bossKilled),    color: '#ef5350' },
  ];

  const colW = (W - 30) / 3;
  stats.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 20 + col * colW;
    const y = 150 + row * 58;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    _roundRect(ctx, x, y, colW - 8, 48, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(176,224,240,0.55)';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(s.label, x + 8, y + 14);

    ctx.fillStyle = s.color;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(s.value, x + 8, y + 36);
  });

  // Watermark
  ctx.fillStyle = 'rgba(176,224,240,0.25)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Made with Ocean Evolution V3', W - 14, H - 12);

  return canvas;
}

export async function shareScore(player, timeSurvived, highScore) {
  const card = generateShareCard(player, timeSurvived, highScore);

  // Try Web Share API with file
  if (navigator.canShare) {
    try {
      const blob = await new Promise(res => card.toBlob(res, 'image/png'));
      const file = new File([blob], 'ocean-evolution-score.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Ocean Evolution V3 Score', text: `I scored ${formatNum(player.score)} as ${player.evoName}!` });
        return 'shared';
      }
    } catch(e) {}
  }

  // Fallback: download image
  const link = document.createElement('a');
  link.download = 'ocean-evolution-score.png';
  link.href = card.toDataURL('image/png');
  link.click();
  return 'downloaded';
}

function _fmtTime(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
