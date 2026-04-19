export default {
  id: 'whack',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = 520; canvas.height = 560;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const N = 3;
    const CELL = 140;
    const GRID_X = (canvas.width - N * CELL) / 2;
    const GRID_Y = 120;
    const GAME_TIME = 60;

    let holes, score, time, started, ended, lastSpawn, effects, mouseX, mouseY, smashT;

    function reset() {
      holes = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        holes.push({ r, c, state: 'empty', type: null, t: 0, life: 0, whacked: false });
      }
      score = 0;
      time = GAME_TIME;
      started = false; ended = false;
      lastSpawn = 0;
      effects = [];
      smashT = 0;
      onScore(0);
    }

    function spawn() {
      const empties = holes.filter(h => h.state === 'empty');
      if (!empties.length) return;
      const h = empties[Math.floor(Math.random() * empties.length)];
      const r = Math.random();
      if (r < 0.12) h.type = 'golden';
      else if (r < 0.28) h.type = 'bomb';
      else h.type = 'monkey';
      h.state = 'up';
      h.t = 0;
      h.life = h.type === 'bomb' ? 100 : h.type === 'golden' ? 65 : 80;
      h.whacked = false;
    }

    function whack(h) {
      if (h.state !== 'up' || h.whacked) return;
      h.whacked = true;
      h.state = 'down';
      h.t = 0;
      smashT = 8;
      const pos = holeCenter(h);
      if (h.type === 'monkey') {
        score += 10;
        audio.whack();
        effects.push({ x: pos.x, y: pos.y - 20, txt: '+10', color: '#39FF14', life: 32 });
      } else if (h.type === 'golden') {
        score += 50;
        audio.powerup();
        effects.push({ x: pos.x, y: pos.y - 20, txt: '+50!', color: '#FFE135', life: 44 });
        for (let i = 0; i < 20; i++) effects.push({
          x: pos.x, y: pos.y - 20,
          vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 - 2,
          life: 24, sparkle: true
        });
      } else if (h.type === 'bomb') {
        score = Math.max(0, score - 20);
        audio.die();
        effects.push({ x: pos.x, y: pos.y - 20, txt: '-20!', color: '#FF3864', life: 44 });
      }
      onScore(score);
    }

    function update(dt) {
      if (smashT > 0) smashT--;
      if (!started || ended) return;
      time -= dt;
      if (time <= 0) {
        time = 0;
        ended = true;
        audio.die();
      }
      lastSpawn += dt;
      const up = holes.filter(h => h.state === 'up').length;
      const spawnRate = Math.max(0.35, 0.7 - (GAME_TIME - time) / GAME_TIME * 0.4);
      if (lastSpawn > spawnRate && up < 4) {
        spawn();
        lastSpawn = 0;
      }
      holes.forEach(h => {
        if (h.state !== 'empty') {
          h.t++;
          if (h.state === 'up' && h.t > h.life) { h.state = 'down'; h.t = 0; }
          if (h.state === 'down' && h.t > 15) { h.state = 'empty'; h.type = null; }
        }
      });
      effects.forEach(e => {
        e.life--;
        if (e.sparkle) { e.x += e.vx; e.y += e.vy; e.vy += 0.3; }
      });
      effects = effects.filter(e => e.life > 0);
    }

    function holeCenter(h) {
      return { x: GRID_X + h.c * CELL + CELL / 2, y: GRID_Y + h.r * CELL + CELL / 2 };
    }

    function popupY(h) {
      if (h.state === 'up') return Math.max(-50, 30 - Math.min(54, h.t * 5));
      if (h.state === 'down') return 30 - Math.max(0, 54 - h.t * 5);
      return 30;
    }

    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, '#4a2a6a');
      g.addColorStop(0.5, '#c94a3a');
      g.addColorStop(0.85, '#e8823a');
      g.addColorStop(1, '#3a1810');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#FFE135';
      ctx.shadowBlur = 30; ctx.shadowColor = '#FFE135';
      ctx.beginPath();
      ctx.arc(canvas.width - 80, 90, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(26,10,5,0.7)';
      for (let i = 0; i < 4; i++) {
        const x = i * 140 - 40;
        ctx.beginPath();
        ctx.moveTo(x, 80);
        ctx.lineTo(x + 70, 30);
        ctx.lineTo(x + 140, 80);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#5a3518';
      ctx.fillRect(0, 80, canvas.width, canvas.height - 80);
      ctx.fillStyle = '#4a2808';
      for (let x = 0; x < canvas.width; x += 10) {
        ctx.fillRect(x, 80 + (x * 3) % 6, 5, 3);
      }
      ctx.fillStyle = '#3a2410';
      for (let i = 0; i < 30; i++) {
        const x = (i * 53) % canvas.width;
        const y = 90 + (i * 37) % (canvas.height - 90);
        ctx.fillRect(x, y, 2, 2);
      }

      holes.forEach(h => {
        const { x, y } = holeCenter(h);
        ctx.fillStyle = '#1a0a02';
        ctx.beginPath();
        ctx.ellipse(x, y + 46, 48, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a2008';
        ctx.beginPath();
        ctx.ellipse(x, y + 52, 52, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      holes.forEach(h => {
        if (h.state === 'empty') return;
        const { x, y } = holeCenter(h);
        const py = popupY(h);
        drawCreature(x, y + py, h.type);
      });

      ctx.fillStyle = 'rgba(10,10,20,0.92)';
      ctx.fillRect(0, 0, canvas.width, 60);
      ctx.fillStyle = '#FFE135';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.shadowBlur = 8; ctx.shadowColor = '#FFE135';
      ctx.fillText(`SCORE ${String(score).padStart(4, '0')}`, 14, 36);
      ctx.textAlign = 'right';
      const timeColor = time < 10 ? '#FF3864' : time < 30 ? '#FFE135' : '#39FF14';
      ctx.fillStyle = timeColor;
      ctx.shadowColor = timeColor;
      const timeDisp = Math.max(0, Math.ceil(time));
      ctx.fillText(`TIME ${String(timeDisp).padStart(2, '0')}`, canvas.width - 14, 36);
      ctx.shadowBlur = 0;

      effects.forEach(e => {
        if (e.sparkle) {
          ctx.globalAlpha = e.life / 24;
          ctx.fillStyle = '#FFE135';
          ctx.fillRect(e.x, e.y, 3, 3);
          ctx.globalAlpha = 1;
        } else {
          const a = Math.min(1, e.life / 32);
          ctx.globalAlpha = a;
          ctx.fillStyle = e.color;
          ctx.font = '14px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 8; ctx.shadowColor = e.color;
          ctx.fillText(e.txt, e.x, e.y - (44 - e.life));
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      });

      if (started && !ended && mouseX !== undefined) {
        drawMallet(mouseX, mouseY, smashT);
      }

      if (!started) overlay('WHACK-A-MONKEY', 'CLICK ANYWHERE TO START');
      else if (ended) overlay('TIMES UP', `FINAL ${score}  ·  R TO PLAY AGAIN`);
    }

    function drawCreature(x, y, type) {
      if (type === 'bomb') {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x, y + 4, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.arc(x - 8, y - 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#888';
        ctx.fillRect(x - 4, y - 26, 8, 10);
        ctx.fillStyle = '#FF3864';
        ctx.shadowBlur = 10; ctx.shadowColor = '#FF3864';
        ctx.beginPath();
        ctx.arc(x, y - 30, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FF3864';
        ctx.fillRect(x - 12, y - 2, 5, 5);
        ctx.fillRect(x + 7, y - 2, 5, 5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 11, y - 1, 2, 2);
        ctx.fillRect(x + 8, y - 1, 2, 2);
        return;
      }
      const fur = type === 'golden' ? '#FFE135' : '#8B4513';
      const furLight = type === 'golden' ? '#FFF58C' : '#A0522D';
      const furDark = type === 'golden' ? '#D4A017' : '#5A2F0A';

      ctx.fillStyle = fur;
      ctx.beginPath();
      ctx.ellipse(x - 26, y, 10, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 26, y, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFC7A0';
      ctx.beginPath();
      ctx.ellipse(x - 26, y, 5, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 26, y, 5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = fur;
      ctx.fillRect(x - 24, y - 18, 48, 36);
      ctx.fillStyle = furLight;
      ctx.fillRect(x - 24, y - 18, 48, 6);
      ctx.fillStyle = furDark;
      ctx.fillRect(x - 24, y + 12, 48, 6);

      ctx.fillStyle = '#FFE4B5';
      ctx.fillRect(x - 16, y - 6, 32, 22);

      ctx.fillStyle = '#000';
      ctx.fillRect(x - 11, y, 5, 5);
      ctx.fillRect(x + 6, y, 5, 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 10, y + 1, 2, 2);
      ctx.fillRect(x + 7, y + 1, 2, 2);

      ctx.fillStyle = '#5A2F0A';
      ctx.fillRect(x - 5, y + 10, 10, 3);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x - 2, y + 10, 4, 3);

      if (type === 'golden') {
        ctx.fillStyle = '#FFD000';
        ctx.shadowBlur = 10; ctx.shadowColor = '#FFD000';
        ctx.fillRect(x - 14, y - 24, 28, 6);
        ctx.fillRect(x - 12, y - 30, 4, 6);
        ctx.fillRect(x - 2, y - 32, 4, 8);
        ctx.fillRect(x + 8, y - 30, 4, 6);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FF10F0';
        ctx.fillRect(x - 1, y - 29, 2, 2);
      }
    }

    function drawMallet(x, y, t) {
      ctx.save();
      ctx.translate(x, y);
      const hit = t / 8;
      ctx.rotate(-0.4 + hit * 0.8);
      ctx.fillStyle = '#FFE135';
      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10; ctx.shadowColor = '#FFE135';
      ctx.beginPath();
      ctx.ellipse(0, -22, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.fillStyle = '#3a2d0a';
      ctx.fillRect(-3, -8, 6, 36);
      ctx.fillStyle = '#D4A017';
      ctx.fillRect(-18, -28, 4, 4);
      ctx.restore();
    }

    function overlay(title, sub) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFE135';
      ctx.textAlign = 'center';
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.shadowBlur = 14; ctx.shadowColor = '#FFE135';
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#39FF14';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.shadowColor = '#39FF14';
      ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 30);
      ctx.shadowBlur = 0;
    }

    reset();
    let raf, lastT = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function toCanvas(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function onMove(e) { const p = toCanvas(e); mouseX = p.x; mouseY = p.y; }
    function onClick(e) {
      if (!started) { started = true; return; }
      if (ended) return;
      const p = toCanvas(e);
      smashT = 8;
      for (const h of holes) {
        if (h.state !== 'up') continue;
        const c = holeCenter(h);
        const py = popupY(h);
        const cx = c.x, cy = c.y + py;
        if (Math.abs(p.x - cx) < 32 && Math.abs(p.y - cy) < 32) {
          whack(h);
          return;
        }
      }
    }
    function onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'r' && ended) { reset(); started = true; e.preventDefault(); }
    }

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    canvas.style.cursor = 'none';
    loop(performance.now());

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
      canvas.style.cursor = '';
      canvas.remove();
    };
  }
};
