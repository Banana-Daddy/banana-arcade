const GAMES = [
  { id: 'snake',    name: 'BANANA SNAKE',   tag: 'EAT · GROW',         color: '#39FF14', controls: '← ↑ ↓ → / SWIPE MOVE  ·  P PAUSE  ·  R RESTART' },
  { id: 'flappy',   name: 'FLAPPY NANA',    tag: 'DODGE THE JUNGLE',   color: '#FFE135', controls: 'SPACE / TAP FLAP  ·  P PAUSE  ·  R RESTART' },
  { id: 'breakout', name: 'SMASH BUNCH',    tag: 'BREAK THE FRUIT',    color: '#00FFFF', controls: '← → / DRAG MOVE  ·  SPACE / TAP LAUNCH' },
  { id: 'pong',     name: 'BANANA PONG',    tag: 'FIRST TO 10',        color: '#FF10F0', controls: '↑ ↓ / DRAG MOVE  ·  SPACE / TAP SERVE' },
  { id: 'whack',    name: 'WHACK-A-MONKEY', tag: 'PROTECT THE GROVE',  color: '#FF3864', controls: 'CLICK / TAP WHACK  ·  60 SECONDS' },
  { id: 'invaders', name: 'SPACE NANAS',    tag: 'DEFEND THE GALAXY',  color: '#9D4EDD', controls: '← → / DRAG MOVE  ·  AUTO-FIRE' },
  { id: 'simon',    name: 'BANANA SIMON',   tag: 'REPEAT THE TUNE',    color: '#FF8C00', controls: 'TAP / Q W A S PADS  ·  R RESTART' },
  { id: 'missile',  name: 'MISSILE CMD',    tag: 'SAVE THE FARMS',     color: '#FFD700', controls: 'TAP / CLICK SKY TO FIRE' }
];

class Audio8bit {
  constructor() { this.ctx = null; this.muted = false; this.master = null; }
  _ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.25;
    this.master.connect(this.ctx.destination);
  }
  resume() { this._ensure(); if (this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.25; }
  tone(freq, dur = 0.08, type = 'square', vol = 1, slide = 0) {
    if (this.muted) return;
    this._ensure();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur = 0.1, vol = 0.4) {
    if (this.muted) return;
    this._ensure();
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(g).connect(this.master);
    src.start(t);
  }
  blip()    { this.tone(880, 0.06, 'square', 0.6, 220); }
  coin()    { this.tone(988, 0.06, 'square', 0.6); setTimeout(() => this.tone(1318, 0.1, 'square', 0.6), 60); }
  hit()     { this.tone(220, 0.1, 'square', 0.7, -80); }
  die()     { this.tone(440, 0.15, 'sawtooth', 0.7, -380); setTimeout(() => this.tone(110, 0.3, 'sawtooth', 0.6, -80), 140); }
  powerup() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.08, 'square', 0.5), i * 55)); }
  select()  { this.tone(440, 0.04, 'square', 0.4); }
  start()   { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.1, 'triangle', 0.5), i * 80)); }
  flap()    { this.tone(600, 0.05, 'square', 0.4, -200); }
  whack()   { this.noise(0.08, 0.5); this.tone(180, 0.08, 'square', 0.5, -60); }
  merge()   { this.tone(660, 0.06, 'triangle', 0.5); setTimeout(() => this.tone(990, 0.08, 'triangle', 0.5), 40); }
}

const audio = new Audio8bit();

const storage = {
  key: id => `bananaArcade.high.${id}`,
  getHigh: id => { try { return parseInt(localStorage.getItem(storage.key(id)) || '0', 10); } catch { return 0; } },
  setHigh: (id, v) => { try { localStorage.setItem(storage.key(id), String(v)); } catch {} },
  muteKey: 'bananaArcade.muted',
  getMuted: () => { try { return localStorage.getItem(storage.muteKey) === '1'; } catch { return false; } },
  setMuted: v => { try { localStorage.setItem(storage.muteKey, v ? '1' : '0'); } catch {} }
};

let selectedIdx = 0;
let currentUnmount = null;
let mode = 'hub';
const cabinetsEl = document.getElementById('cabinets');
const gameTitleEl = document.getElementById('gameTitle');
const gameControlsEl = document.getElementById('gameControls');
const gameScoreEl = document.getElementById('gameScore');
const gameHighEl = document.getElementById('gameHigh');
const hubView = document.getElementById('hub');
const gameView = document.getElementById('game');
const soundEl = document.getElementById('soundToggle');
const previews = [];

function renderCabinets() {
  cabinetsEl.innerHTML = '';
  previews.forEach(p => p.stop());
  previews.length = 0;
  GAMES.forEach((g, i) => {
    const el = document.createElement('div');
    el.className = 'cabinet' + (i === selectedIdx ? ' selected' : '');
    el.style.setProperty('--accent', g.color);
    el.innerHTML = `
      <div class="cabinet-top">${g.name}</div>
      <div class="cabinet-screen"><canvas width="80" height="80"></canvas></div>
      <div class="cabinet-title">${g.name}</div>
      <div class="cabinet-tag">${g.tag}</div>
      <div class="cabinet-high">HI · <span class="val">${String(storage.getHigh(g.id)).padStart(6, '0')}</span></div>
      <div class="cabinet-coin"></div>
    `;
    el.addEventListener('click', () => { selectedIdx = i; audio.coin(); startGame(g.id); });
    el.addEventListener('mouseenter', () => { if (selectedIdx !== i) { selectedIdx = i; audio.select(); updateSelection(); } });
    cabinetsEl.appendChild(el);
    const canvas = el.querySelector('canvas');
    previews.push(startPreview(canvas, g));
  });
}

function updateSelection() {
  [...cabinetsEl.children].forEach((el, i) => el.classList.toggle('selected', i === selectedIdx));
}

function startPreview(canvas, game) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width, H = canvas.height;
  let t = 0, rafId = 0, alive = true;
  const draw = () => {
    if (!alive) return;
    t++;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (game.id === 'snake') {
      const segs = 6;
      for (let i = 0; i < segs; i++) {
        const x = ((t/2 + i*8) % (W + 20)) - 10;
        const y = H/2 + Math.sin((t + i*20)/18) * 14;
        ctx.fillStyle = i === 0 ? '#39FF14' : '#2ACC10';
        ctx.fillRect(x, y, 7, 7);
      }
      ctx.fillStyle = '#FFE135';
      ctx.fillRect(W - 20, H/2 - 3, 7, 7);
    } else if (game.id === 'flappy') {
      const y = H/2 + Math.sin(t/10) * 14;
      ctx.fillStyle = '#FFE135';
      ctx.beginPath();
      ctx.ellipse(W/2 - 10, y, 10, 5, -0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#2d7a2d';
      for (let i = 0; i < 3; i++) {
        const px = ((t*1.2 + i*40) % (W + 20)) - 20;
        ctx.fillRect(px, 0, 10, 22);
        ctx.fillRect(px, 56, 10, 24);
      }
    } else if (game.id === 'breakout') {
      const rows = ['#FF3864','#FFE135','#39FF14'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
        ctx.fillStyle = rows[r];
        ctx.fillRect(3 + c*11, 10 + r*7, 9, 4);
      }
      const bx = W/2 + Math.sin(t/8) * 20;
      ctx.fillStyle = '#FFE135';
      ctx.fillRect(bx - 10, H - 10, 20, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(W/2 + Math.sin(t/5) * 25, H/2 + Math.cos(t/7) * 15, 4, 4);
    } else if (game.id === 'pong') {
      ctx.fillStyle = '#1e1e3a';
      for (let y = 4; y < H; y += 8) ctx.fillRect(W/2 - 1, y, 2, 4);
      const py = Math.sin(t/15) * 18;
      ctx.fillStyle = '#FF10F0';
      ctx.fillRect(5, H/2 - 10 + py, 4, 20);
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(W - 9, H/2 - 10 - py * 0.8, 4, 20);
      ctx.fillStyle = '#FFE135';
      ctx.fillRect(W/2 + Math.sin(t/6) * 22, H/2 + Math.cos(t/8) * 16, 4, 4);
    } else if (game.id === 'invaders') {
      const dx = Math.sin(t/22) * 5;
      const rowColors = ['#FF3864','#9D4EDD','#FF8C00'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        ctx.fillStyle = rowColors[r];
        ctx.fillRect(8 + c*17 + dx, 8 + r*12, 10, 8);
      }
      ctx.fillStyle = '#FFE135';
      const px = W/2 + Math.sin(t/10) * 22 - 6;
      ctx.fillRect(px, H - 14, 12, 6);
      ctx.fillRect(px + 4, H - 18, 4, 4);
      if ((t % 20) < 10) { ctx.fillStyle = '#FFE135'; ctx.fillRect(px + 5, H - 28, 2, 6); }
    } else if (game.id === 'simon') {
      const active = Math.floor(t/20) % 4;
      const pads = ['#39FF14', '#FF3864', '#FFE135', '#00FFFF'];
      const dim = ['#1a4a10', '#6a1828', '#6a5810', '#106a6a'];
      const positions = [[0,0],[1,0],[0,1],[1,1]];
      for (let i = 0; i < 4; i++) {
        const [px, py] = positions[i];
        ctx.fillStyle = i === active ? pads[i] : dim[i];
        ctx.fillRect(6 + px*35, 6 + py*35, 33, 33);
      }
      ctx.fillStyle = '#0a0a14';
      ctx.beginPath();
      ctx.arc(W/2, H/2, 10, 0, Math.PI*2);
      ctx.fill();
    } else if (game.id === 'missile') {
      ctx.fillStyle = '#3a2208';
      ctx.fillRect(0, H - 12, W, 12);
      for (let i = 0; i < 3; i++) {
        const fx = 15 + i * 22;
        ctx.fillStyle = '#2d7a2d';
        ctx.fillRect(fx - 5, H - 20, 10, 4);
        ctx.fillStyle = '#FFE135';
        ctx.fillRect(fx - 3, H - 28, 2, 8);
        ctx.fillRect(fx, H - 28, 2, 8);
      }
      for (let i = 0; i < 4; i++) {
        const ex = 10 + i * 18;
        const ey = ((t + i * 40) * 0.7) % (H - 20);
        ctx.strokeStyle = 'rgba(255,56,100,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ex, 0);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.fillStyle = '#FF3864';
        ctx.fillRect(ex - 1, ey, 3, 3);
      }
    } else if (game.id === 'whack') {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = 10 + c*22, y = 10 + r*22;
        ctx.fillStyle = '#3a2818';
        ctx.fillRect(x, y, 16, 16);
        const up = (Math.floor(t/15) + r*3 + c) % 5 === 0;
        if (up) {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(x+3, y+2, 10, 10);
          ctx.fillStyle = '#000';
          ctx.fillRect(x+5, y+5, 2, 2);
          ctx.fillRect(x+9, y+5, 2, 2);
        }
      }
    }
    rafId = requestAnimationFrame(draw);
  };
  rafId = requestAnimationFrame(draw);
  return { stop: () => { alive = false; cancelAnimationFrame(rafId); } };
}

function showView(v) {
  mode = v;
  hubView.classList.toggle('active', v === 'hub');
  gameView.classList.toggle('active', v === 'game');
}

async function startGame(id) {
  if (currentUnmount) { currentUnmount(); currentUnmount = null; }
  previews.forEach(p => p.stop());
  previews.length = 0;
  const meta = GAMES.find(g => g.id === id);
  const mod = await import(`./games/${id}.js`);
  const game = mod.default;
  showView('game');
  gameTitleEl.textContent = meta.name;
  gameTitleEl.style.color = meta.color;
  gameTitleEl.style.textShadow = `0 0 6px ${meta.color}, 0 0 14px ${meta.color}`;
  gameControlsEl.textContent = meta.controls;
  gameScoreEl.textContent = '000000';
  gameHighEl.textContent = String(storage.getHigh(id)).padStart(6, '0');
  const container = document.getElementById('gameContainer');
  container.innerHTML = '';
  document.body.classList.add('in-game');
  audio.resume();
  audio.start();
  currentUnmount = game.mount({
    container,
    audio,
    onScore(s) {
      gameScoreEl.textContent = String(s).padStart(6, '0');
      const h = storage.getHigh(id);
      if (s > h) {
        storage.setHigh(id, s);
        gameHighEl.textContent = String(s).padStart(6, '0');
      }
    }
  });
}

function exitGame() {
  if (currentUnmount) { currentUnmount(); currentUnmount = null; }
  document.body.classList.remove('in-game');
  showView('hub');
  renderCabinets();
}

document.getElementById('backBtn').addEventListener('click', () => { audio.select(); exitGame(); });
soundEl.addEventListener('click', () => toggleMute());

window.addEventListener('keydown', e => {
  if (document.getElementById('boot')) return;
  if (mode === 'hub') {
    if (e.key === 'ArrowLeft') { selectedIdx = (selectedIdx - 1 + GAMES.length) % GAMES.length; audio.select(); updateSelection(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { selectedIdx = (selectedIdx + 1) % GAMES.length; audio.select(); updateSelection(); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { audio.coin(); startGame(GAMES[selectedIdx].id); e.preventDefault(); }
    else if (e.key.toLowerCase() === 'm') { toggleMute(); }
  } else if (mode === 'game') {
    if (e.key === 'Escape') { audio.select(); exitGame(); }
    else if (e.key.toLowerCase() === 'm' && !['snake','flappy','breakout','tile2048','whack'].includes('m')) { toggleMute(); }
  }
});

function toggleMute() {
  const now = !audio.muted;
  audio.setMuted(now);
  storage.setMuted(now);
  soundEl.innerHTML = 'SOUND: <span class="neon-green">' + (now ? 'OFF' : 'ON') + '</span>';
}

async function boot() {
  const lines = [
    { t: 'MEMORY CHECK  ........ 8192K  OK',     delay: 220 },
    { t: 'MONKEY SUBSYSTEM  .... ONLINE',        delay: 180 },
    { t: 'BANANA CORE  ......... READY',         delay: 180 },
    { t: 'CRT CALIBRATION  ..... OK',            delay: 180 },
    { t: 'COIN MECHANISM  ...... OK',            delay: 180 },
    { t: 'LOADING CABINETS  .... 5/5',           delay: 220 },
    { t: '', delay: 160 },
    { t: '> ALL SYSTEMS NOMINAL',                delay: 240 }
  ];
  const log = document.getElementById('bootLog');
  for (const l of lines) {
    log.textContent += (log.textContent ? '\n' : '') + l.t;
    await new Promise(r => setTimeout(r, l.delay));
  }
  const bootEl = document.getElementById('boot');
  const dismiss = () => {
    bootEl.classList.add('gone');
    audio.resume();
    audio.coin();
    window.removeEventListener('keydown', dismiss);
    window.removeEventListener('click', dismiss);
    setTimeout(() => bootEl.remove(), 500);
  };
  window.addEventListener('keydown', dismiss, { once: true });
  window.addEventListener('click', dismiss, { once: true });
}

audio.setMuted(storage.getMuted());
if (storage.getMuted()) soundEl.innerHTML = 'SOUND: <span class="neon-green">OFF</span>';
renderCabinets();
boot();
