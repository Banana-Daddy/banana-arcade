export default {
  id: 'simon',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 480;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const PADS = [
      { color: '#39FF14', dim: '#1a4a10', freq: 329.63 },
      { color: '#FF3864', dim: '#6a1828', freq: 261.63 },
      { color: '#FFE135', dim: '#6a5810', freq: 440.00 },
      { color: '#00FFFF', dim: '#106a6a', freq: 164.81 }
    ];

    let sequence, playerIdx, state, flashPad, score, started, speed;
    let mounted = true;

    function positions() {
      const mid = canvas.width / 2;
      const p = 14;
      const size = canvas.width / 2 - p * 1.5;
      return [
        [p, p, size, 0], [mid + p / 2, p, size, 1],
        [p, mid + p / 2, size, 2], [mid + p / 2, mid + p / 2, size, 3]
      ];
    }

    function reset() {
      sequence = [];
      playerIdx = 0;
      state = 'idle';
      flashPad = -1;
      score = 0;
      speed = 500;
      started = false;
      onScore(0);
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    async function showSequence() {
      state = 'show';
      await sleep(500);
      for (const i of sequence) {
        if (!mounted) return;
        flashPad = i;
        audio.tone(PADS[i].freq, speed / 1000 * 0.75, 'triangle', 0.45);
        await sleep(speed);
        if (!mounted) return;
        flashPad = -1;
        await sleep(Math.max(80, speed * 0.22));
      }
      if (!mounted) return;
      state = 'input';
      playerIdx = 0;
    }

    async function beginRound() {
      sequence.push(Math.floor(Math.random() * 4));
      await showSequence();
    }

    function playerTap(i) {
      if (state !== 'input') return;
      flashPad = i;
      audio.tone(PADS[i].freq, 0.22, 'triangle', 0.5);
      setTimeout(() => { if (flashPad === i) flashPad = -1; }, 180);
      if (sequence[playerIdx] === i) {
        playerIdx++;
        if (playerIdx >= sequence.length) {
          score++;
          onScore(score);
          speed = Math.max(220, 500 - score * 22);
          state = 'wait';
          setTimeout(() => { if (mounted) beginRound(); }, 800);
        }
      } else {
        state = 'dead';
        audio.die();
      }
    }

    function draw() {
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      positions().forEach(([x, y, size, i]) => {
        const p = PADS[i];
        const isFlash = flashPad === i;
        ctx.fillStyle = isFlash ? p.color : p.dim;
        if (isFlash) { ctx.shadowBlur = 28; ctx.shadowColor = p.color; }
        ctx.fillRect(x, y, size, size);
        ctx.shadowBlur = 0;
        ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, y, size, 10);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, size, size);
      });

      const mid = canvas.width / 2;
      ctx.fillStyle = '#0a0a14';
      ctx.beginPath();
      ctx.arc(mid, mid, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFE135';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12; ctx.shadowColor = '#FFE135';
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFE135';
      ctx.font = '30px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 10; ctx.shadowColor = '#FFE135';
      ctx.fillText(String(score), mid, mid - 8);
      const label = state === 'show' ? 'WATCH' : state === 'input' ? 'YOU' : state === 'dead' ? 'OVER' : 'READY';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = state === 'input' ? '#39FF14' : state === 'dead' ? '#FF3864' : '#FFE135';
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(label, mid, mid + 18);
      ctx.shadowBlur = 0;
      ctx.textBaseline = 'alphabetic';

      if (!started) overlay('BANANA SIMON', 'TAP TO BEGIN');
      else if (state === 'dead') overlay('GAME OVER', `SCORE ${score} · TAP TO RETRY`);
    }

    function overlay(title, sub) {
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFE135';
      ctx.textAlign = 'center';
      ctx.font = '24px "Press Start 2P", monospace';
      ctx.shadowBlur = 14; ctx.shadowColor = '#FFE135';
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#39FF14';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.shadowColor = '#39FF14';
      ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 30);
      ctx.shadowBlur = 0;
    }

    function whichPad(px, py) {
      for (const [x, y, size, i] of positions()) {
        if (px >= x && px < x + size && py >= y && py < y + size) return i;
      }
      return -1;
    }

    function onInput(px, py) {
      if (!started) { started = true; beginRound(); return; }
      if (state === 'dead') { reset(); started = true; beginRound(); return; }
      const i = whichPad(px, py);
      if (i >= 0) playerTap(i);
    }
    function onClick(e) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      onInput(x, y);
    }
    function onTouch(e) {
      e.preventDefault();
      if (!e.touches.length) return;
      const t = e.touches[0];
      onClick({ clientX: t.clientX, clientY: t.clientY });
    }
    function onKey(e) {
      const k = e.key.toLowerCase();
      if (!started && (k === ' ' || k === 'enter')) { started = true; beginRound(); e.preventDefault(); return; }
      if (state === 'dead' && k === 'r') { reset(); started = true; beginRound(); e.preventDefault(); return; }
      const map = { q: 0, w: 1, a: 2, s: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      if (map[k] !== undefined && state === 'input') { playerTap(map[k]); e.preventDefault(); }
    }

    reset();
    let raf;
    function loop() { if (!mounted) return; draw(); raf = requestAnimationFrame(loop); }

    canvas.addEventListener('mousedown', onClick);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    window.addEventListener('keydown', onKey);
    loop();

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousedown', onClick);
      canvas.removeEventListener('touchstart', onTouch);
      window.removeEventListener('keydown', onKey);
      canvas.remove();
    };
  }
};
