// audio.js V2 — procedural per-biome music + rich SFX

let _ctx = null;
let _muted = false;
let _masterGain = null;
let _musicGain  = null;
let _sfxGain    = null;
let _currentBiome = null;
let _musicNodes = [];
let _musicTimer = null;
let _started = false;

function _getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _ctx.createGain(); _masterGain.gain.value = 0.7; _masterGain.connect(_ctx.destination);
    _musicGain  = _ctx.createGain(); _musicGain.gain.value  = 0.38; _musicGain.connect(_masterGain);
    _sfxGain    = _ctx.createGain(); _sfxGain.gain.value    = 0.6;  _sfxGain.connect(_masterGain);
  }
  return _ctx;
}

function _beep(freq, type, duration, vol, dest, startTime, detune = 0) {
  const ctx = _getCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  if (detune) o.detune.value = detune;
  g.gain.setValueAtTime(vol, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  o.connect(g); g.connect(dest || _sfxGain);
  o.start(startTime); o.stop(startTime + duration + 0.02);
}

function _noise(duration, vol, dest, startTime) {
  const ctx = _getCtx();
  const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 200; f.Q.value = 0.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  s.buffer = buf; s.connect(f); f.connect(g); g.connect(dest || _sfxGain);
  s.start(startTime); s.stop(startTime + duration + 0.05);
}

// ── Biome music configs ───────────────────────────────────────────────────────
const BIOME_MUSIC = {
  reef:     { notes: [261, 329, 392, 523, 659], tempo: 0.5,  waveType: 'sine',     vol: 0.18, reverb: 0.3 },
  tropical: { notes: [293, 370, 440, 587, 740], tempo: 0.38, waveType: 'triangle', vol: 0.20, reverb: 0.2 },
  deep:     { notes: [130, 164, 196, 246, 164], tempo: 0.7,  waveType: 'sawtooth', vol: 0.14, reverb: 0.5 },
  abyssal:  { notes: [65,  82,  110, 82,  55 ], tempo: 1.0,  waveType: 'sawtooth', vol: 0.12, reverb: 0.7 },
  ice:      { notes: [523, 659, 784, 1047, 784], tempo: 0.6, waveType: 'sine',     vol: 0.16, reverb: 0.6 },
};

let _musicSeqIdx = 0;
let _musicSeqTimer = null;

function _playMusicNote(config) {
  if (_muted || !_started) return;
  const ctx = _getCtx();
  const note = config.notes[_musicSeqIdx % config.notes.length];
  _musicSeqIdx++;
  const now = ctx.currentTime;

  // Main note
  _beep(note,       config.waveType, config.tempo * 1.8, config.vol,       _musicGain, now);
  // Harmony (fifth up)
  _beep(note * 1.5, config.waveType, config.tempo * 1.8, config.vol * 0.4, _musicGain, now, 8);
  // Sub-bass pulse
  if (config.waveType === 'sawtooth') {
    _beep(note * 0.5, 'sine', config.tempo * 2.5, config.vol * 0.5, _musicGain, now);
  }

  _musicSeqTimer = setTimeout(() => _playMusicNote(config), config.tempo * 1000 * (0.85 + Math.random() * 0.45));
}

function _stopMusic() {
  if (_musicSeqTimer) clearTimeout(_musicSeqTimer);
  _musicSeqTimer = null;
}

// ── Public API ────────────────────────────────────────────────────────────────
export const Audio = {
  start() { _started = true; _getCtx(); },

  setMuted(v) {
    _muted = v;
    if (_masterGain) _masterGain.gain.value = v ? 0 : 0.7;
    if (v) _stopMusic();
    else if (_currentBiome) this.setBiome(_currentBiome);
  },
  getMuted() { return _muted; },
  toggleMute() { this.setMuted(!_muted); return _muted; },

  setBiome(biomeId) {
    if (_currentBiome === biomeId) return;
    _currentBiome = biomeId;
    _musicSeqIdx  = 0;
    _stopMusic();
    if (!_muted && _started) {
      const cfg = BIOME_MUSIC[biomeId] || BIOME_MUSIC.reef;
      setTimeout(() => _playMusicNote(cfg), 400);
    }
  },

  // SFX
  playEat() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    _beep(880, 'sine',     0.06, 0.5, null, now);
    _beep(1200,'sine',     0.04, 0.3, null, now + 0.06);
  },
  playDamage() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    _noise(0.12, 0.55, null, now);
    _beep(80,  'sawtooth', 0.18, 0.7, null, now);
  },
  playLevelUp() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => _beep(f, 'sine', 0.15, 0.4, null, now + i * 0.1));
  },
  playEvolution() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    [261, 329, 392, 523, 659, 784, 1047].forEach((f, i) => _beep(f, 'triangle', 0.22, 0.45, null, now + i * 0.08));
    setTimeout(() => { const n = ctx.currentTime; _beep(1047, 'sine', 0.5, 0.5, null, n); }, 600);
  },
  playBoost() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    _beep(300, 'sawtooth', 0.08, 0.3, null, now);
    _beep(600, 'sine',     0.10, 0.25, null, now + 0.04);
  },
  playSkill() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    _beep(440, 'triangle', 0.12, 0.5, null, now);
    _beep(880, 'sine',     0.08, 0.3, null, now + 0.06);
    _beep(220, 'sawtooth', 0.18, 0.4, null, now + 0.02);
  },
  playBossWarning() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    _beep(110, 'sawtooth', 0.35, 0.8, null, now);
    _beep(110, 'sawtooth', 0.25, 0.6, null, now + 0.4);
    _beep(146, 'sawtooth', 0.3,  0.7, null, now + 0.8);
  },
  playBossDead() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    [130, 196, 261, 329, 392, 523, 659, 784].forEach((f, i) => _beep(f, 'sine', 0.28, 0.5, null, now + i * 0.07));
    _noise(0.4, 0.5, null, now);
  },
  playGameOver() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    _stopMusic();
    [392, 349, 294, 220, 196].forEach((f, i) => _beep(f, 'sawtooth', 0.35, 0.5, null, now + i * 0.15));
  },
  playAchievement() {
    if (_muted) return;
    const ctx = _getCtx(), now = ctx.currentTime;
    [523, 784, 1047, 1319].forEach((f, i) => _beep(f, 'sine', 0.12, 0.4, null, now + i * 0.09));
  },
};
