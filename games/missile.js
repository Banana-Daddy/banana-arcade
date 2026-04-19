export default {
  id: 'missile',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = 560; canvas.height = 480;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    let farms, missiles, enemies, explosions, score, wave, waveDone, started, dead, spawnT, waveRemaining, waveBreakT;

    function reset() {
      const y = canvas.height - 40;
      farms = [
        { x: 70, y, alive: true },
        { x: canvas.width / 2, y, alive: true },
        { x: canvas.width - 70, y, alive: true }
      ];
      missiles = []; enemies = []; explosions = [];
      score = 0; wave = 1; waveDone = false; waveBreakT = 0;
      dead = false; started = false;
      spawnT = 0; waveRemaining = 5;
      onScore(0);
    }

    function spawnEnemy() {
      const x = 30 + Math.random() * (canvas.width - 60);
      const aliveFarms = farms.filter(f => f.alive);
      if (!aliveFarms.length) return;
      const target = aliveFarms[Math.floor(Math.random() * aliveFarms.length)];
      const speed = 0.7 + wave * 0.22;
      enemies.push({ x, y: 0, tx: target.x, ty: target.y - 10, speed, targetFarm: target });
    }

    function fireMissile(tx, ty) {
      const aliveFarms = farms.filter(f => f.alive);
      if (!aliveFarms.length) return;
      const closest = aliveFarms.reduce((a, b) => Math.abs(a.x - tx) < Math.abs(b.x - tx) ? a : b);
      missiles.push({ sx: closest.x, sy: closest.y - 8, tx, ty, t: 0, dur: 0.6 });
      audio.blip();
    }

    function update() {
      if (!started || dead) return;
      if (waveBreakT > 0) {
        waveBreakT--;
        if (waveBreakT === 0) {
          wave++;
          waveRemaining = 5 + wave * 2;
          waveDone = false;
          spawnT = 9999;
        }
      }
      if (waveBreakT === 0 && !waveDone) {
        spawnT++;
        const interval = Math.max(25, 95 - wave * 6);
        if (spawnT > interval && enemies.length < 5 && waveRemaining > 0) {
          spawnEnemy();
          waveRemaining--;
          spawnT = 0;
        }
      }

      enemies.forEach(e => {
        const dx = e.tx - e.x, dy = e.ty - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * e.speed;
        e.y += (dy / d) * e.speed;
      });

      missiles.forEach(m => {
        m.t += 0.024;
        const k = Math.min(1, m.t / m.dur);
        m.cx = m.sx + (m.tx - m.sx) * k;
        m.cy = m.sy + (m.ty - m.sy) * k;
        if (k >= 1) {
          explosions.push({ x: m.tx, y: m.ty, r: 0, maxR: 55, life: 35, maxLife: 35 });
          audio.tone(160, 0.2, 'sawtooth', 0.5, -100);
          m.done = true;
        }
      });
      missiles = missiles.filter(m => !m.done);

      explosions.forEach(ex => {
        const p = 1 - ex.life / ex.maxLife;
        ex.r = Math.sin(p * Math.PI) * ex.maxR;
        ex.life--;
      });
      explosions = explosions.filter(ex => ex.life > 0);

      enemies.forEach(e => {
        explosions.forEach(ex => {
          if (Math.hypot(e.x - ex.x, e.y - ex.y) < ex.r) {
            e.dead = true;
            score += 10 * wave;
          }
        });
      });
      enemies.forEach(e => {
        if (!e.dead && e.y >= e.ty) {
          if (e.targetFarm.alive) {
            e.targetFarm.alive = false;
            explosions.push({ x: e.tx, y: e.ty, r: 0, maxR: 45, life: 30, maxLife: 30 });
            audio.die();
          }
          e.dead = true;
        }
      });
      enemies = enemies.filter(e => !e.dead);
      onScore(score);

      if (farms.every(f => !f.alive)) { dead = true; audio.die(); return; }

      if (!waveDone && waveRemaining <= 0 && enemies.length === 0 && waveBreakT === 0) {
        waveDone = true;
        audio.powerup();
        waveBreakT = 80;
      }
    }

    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, '#0a0a20');
      g.addColorStop(0.8, '#2a1840');
      g.addColorStop(1, '#3a2818');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1a1a3a';
      for (let i = 0; i < 60; i++) ctx.fillRect((i * 73) % canvas.width, (i * 41) % (canvas.height - 50), 1, 1);

      ctx.fillStyle = '#3a2208';
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      ctx.fillStyle = '#2a1808';
      for (let x = 0; x < canvas.width; x += 8) ctx.fillRect(x, canvas.height - 26, 4, 4);

      farms.forEach(f => {
        if (!f.alive) {
          ctx.fillStyle = '#222';
          ctx.fillRect(f.x - 22, f.y - 2, 44, 14);
          ctx.fillStyle = '#0a0a14';
          for (let i = 0; i < 5; i++) ctx.fillRect(f.x - 20 + i * 9, f.y + 2, 4, 4);
          return;
        }
        ctx.fillStyle = '#2d7a2d';
        ctx.fillRect(f.x - 24, f.y - 4, 48, 8);
        ctx.fillStyle = '#1a5020';
        ctx.fillRect(f.x - 24, f.y + 4, 48, 4);
        for (let i = 0; i < 4; i++) {
          const bx = f.x - 18 + i * 12;
          ctx.fillStyle = '#FFE135';
          ctx.shadowBlur = 4; ctx.shadowColor = '#FFE135';
          ctx.beginPath();
          ctx.ellipse(bx, f.y - 12, 4, 9, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#D4A017';
          ctx.fillRect(bx - 1, f.y - 20, 2, 3);
        }
      });

      enemies.forEach(e => {
        ctx.strokeStyle = 'rgba(255,56,100,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(e.x, 0);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
        ctx.fillStyle = '#FF3864';
        ctx.shadowBlur = 10; ctx.shadowColor = '#FF3864';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#5a2a08';
        ctx.fillRect(e.x - 1, e.y - 8, 2, 3);
      });

      missiles.forEach(m => {
        const grad = ctx.createLinearGradient(m.sx, m.sy, m.cx, m.cy);
        grad.addColorStop(0, 'rgba(255,225,53,0)');
        grad.addColorStop(1, 'rgba(255,225,53,0.9)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8; ctx.shadowColor = '#FFE135';
        ctx.beginPath();
        ctx.moveTo(m.sx, m.sy);
        ctx.lineTo(m.cx, m.cy);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.fillRect(m.cx - 2, m.cy - 2, 4, 4);
      });

      explosions.forEach(ex => {
        const k = ex.life / ex.maxLife;
        ctx.fillStyle = `rgba(255, 225, 53, ${k * 0.35})`;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 56, 100, ${k})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.fillStyle = '#FFE135';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.shadowBlur = 6; ctx.shadowColor = '#FFE135';
      ctx.fillText(`WAVE ${wave}`, 12, 26);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#39FF14';
      ctx.shadowColor = '#39FF14';
      let hearts = '';
      for (let i = 0; i < farms.filter(f => f.alive).length; i++) hearts += '◆ ';
      ctx.fillText(hearts.trim() || '—', canvas.width - 12, 26);
      ctx.shadowBlur = 0;

      if (waveBreakT > 0 && !dead) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.fillStyle = '#39FF14';
        ctx.textAlign = 'center';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.shadowBlur = 14; ctx.shadowColor = '#39FF14';
        ctx.fillText(`WAVE ${wave + 1}`, canvas.width / 2, canvas.height / 2 + 6);
        ctx.shadowBlur = 0;
      }

      if (!started) overlay('MISSILE COMMAND', 'TAP / CLICK SKY TO FIRE');
      else if (dead) overlay('GROVE DESTROYED', `SCORE ${score} · TAP / R RESTART`);
    }

    function overlay(title, sub) {
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFE135';
      ctx.textAlign = 'center';
      ctx.font = '22px "Press Start 2P", monospace';
      ctx.shadowBlur = 14; ctx.shadowColor = '#FFE135';
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#39FF14';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.shadowColor = '#39FF14';
      ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 30);
      ctx.shadowBlur = 0;
    }

    function toCanvas(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function onInput(x, y) {
      if (!started) { started = true; return; }
      if (dead) { reset(); started = true; return; }
      if (y < canvas.height - 45) fireMissile(x, y);
    }
    function onMouse(e) { const p = toCanvas(e.clientX, e.clientY); onInput(p.x, p.y); }
    function onTouch(e) {
      e.preventDefault();
      if (!e.touches.length) return;
      const t = e.touches[0];
      const p = toCanvas(t.clientX, t.clientY);
      onInput(p.x, p.y);
    }
    function onKey(e) {
      if (e.key.toLowerCase() === 'r' && dead) { reset(); started = true; e.preventDefault(); }
      else if (e.key === ' ' && !started) { started = true; e.preventDefault(); }
    }

    reset();
    let raf;
    function loop() { update(); draw(); raf = requestAnimationFrame(loop); }

    canvas.addEventListener('mousedown', onMouse);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    window.addEventListener('keydown', onKey);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousedown', onMouse);
      canvas.removeEventListener('touchstart', onTouch);
      window.removeEventListener('keydown', onKey);
      canvas.remove();
    };
  }
};
