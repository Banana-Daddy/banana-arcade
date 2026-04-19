export default {
  id: 'flappy',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = 440; canvas.height = 560;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const GRAV = 0.45;
    const JUMP = -7;
    const PIPE_W = 54;
    const GROUND_H = 50;

    let banana, pipes, score, dead, started, paused, tick, flash, scrollX;

    function reset() {
      banana = { x: 120, y: 280, vy: 0, rot: 0, flapT: 0 };
      pipes = [];
      score = 0;
      dead = false; started = false; paused = false;
      tick = 0; flash = 0; scrollX = 0;
      onScore(0);
    }

    function spawnPipe() {
      const gap = Math.max(115, 150 - Math.floor(score / 8) * 3);
      const minTop = 60;
      const maxTop = canvas.height - GROUND_H - gap - 60;
      const top = minTop + Math.random() * (maxTop - minTop);
      pipes.push({ x: canvas.width + 30, topH: top, gap, passed: false });
    }

    function update() {
      tick++;
      scrollX += 2;
      if (!started || dead || paused) return;
      banana.vy += GRAV;
      banana.y += banana.vy;
      banana.rot = Math.max(-0.6, Math.min(1.3, banana.vy * 0.08));
      if (banana.flapT > 0) banana.flapT--;

      if (tick % 85 === 0) spawnPipe();
      pipes.forEach(p => { p.x -= 2.7; });
      pipes = pipes.filter(p => p.x > -PIPE_W - 10);

      if (banana.y > canvas.height - GROUND_H - 10 || banana.y < 0) return die();
      for (const p of pipes) {
        if (banana.x + 16 > p.x && banana.x - 16 < p.x + PIPE_W) {
          if (banana.y - 10 < p.topH || banana.y + 10 > p.topH + p.gap) return die();
        }
        if (!p.passed && p.x + PIPE_W < banana.x) {
          p.passed = true;
          score++;
          onScore(score);
          audio.coin();
          flash = 8;
        }
      }
    }

    function die() {
      if (dead) return;
      dead = true;
      flash = 20;
      audio.die();
    }

    function flap() {
      if (dead) return;
      if (!started) started = true;
      banana.vy = JUMP;
      banana.flapT = 6;
      audio.flap();
    }

    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, '#2a1b4d');
      g.addColorStop(0.55, '#6b2e6b');
      g.addColorStop(0.85, '#FF6B35');
      g.addColorStop(1, '#3a1e30');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#FFE135';
      ctx.beginPath();
      ctx.arc(canvas.width - 80, 80, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,225,53,0.2)';
      ctx.beginPath();
      ctx.arc(canvas.width - 80, 80, 52, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a1a3a';
      for (let i = 0; i < 50; i++) {
        const x = (i * 73) % canvas.width;
        const y = (i * 41) % (canvas.height - GROUND_H - 100);
        if (Math.sin((tick + i * 10) / 40) > 0) ctx.fillRect(x, y, 2, 2);
        else ctx.fillRect(x, y, 1, 1);
      }

      ctx.fillStyle = 'rgba(20,15,40,0.8)';
      for (let i = 0; i < 8; i++) {
        const x = (i * 90 - (scrollX * 0.15) % 90) - 30;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - GROUND_H);
        ctx.lineTo(x + 60, canvas.height - GROUND_H - 130);
        ctx.lineTo(x + 120, canvas.height - GROUND_H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(10,8,24,0.9)';
      for (let i = 0; i < 6; i++) {
        const x = (i * 140 - (scrollX * 0.4) % 140) - 40;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - GROUND_H);
        ctx.lineTo(x + 80, canvas.height - GROUND_H - 80);
        ctx.lineTo(x + 160, canvas.height - GROUND_H);
        ctx.closePath();
        ctx.fill();
      }

      pipes.forEach(p => {
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(p.x, 0, PIPE_W, p.topH);
        ctx.fillRect(p.x, p.topH + p.gap, PIPE_W, canvas.height - p.topH - p.gap - GROUND_H);
        ctx.fillStyle = '#3a2410';
        for (let yy = 6; yy < p.topH - 10; yy += 18) ctx.fillRect(p.x + 10, yy, 4, 10);
        for (let yy = p.topH + p.gap + 6; yy < canvas.height - GROUND_H - 10; yy += 18) ctx.fillRect(p.x + 10, yy, 4, 10);
        ctx.fillStyle = '#39FF14';
        ctx.fillRect(p.x - 8, p.topH - 14, PIPE_W + 16, 14);
        ctx.fillRect(p.x - 8, p.topH + p.gap, PIPE_W + 16, 14);
        ctx.fillStyle = '#2d7a2d';
        for (let i = 0; i < 7; i++) {
          ctx.fillRect(p.x - 6 + i * 11, p.topH - 10, 5, 6);
          ctx.fillRect(p.x - 6 + i * 11, p.topH + p.gap + 4, 5, 6);
        }
        ctx.fillStyle = '#1f5511';
        ctx.fillRect(p.x - 8, p.topH - 4, PIPE_W + 16, 4);
        ctx.fillRect(p.x - 8, p.topH + p.gap + 10, PIPE_W + 16, 4);
      });

      ctx.fillStyle = '#3a2818';
      ctx.fillRect(0, canvas.height - GROUND_H, canvas.width, GROUND_H);
      ctx.fillStyle = '#4a3820';
      for (let x = 0; x < canvas.width + 20; x += 10) {
        const gx = (x - scrollX % 10);
        ctx.fillRect(gx, canvas.height - GROUND_H + 4, 5, 5);
      }
      ctx.fillStyle = '#2a1808';
      for (let x = 0; x < canvas.width + 20; x += 8) {
        const gx = (x - (scrollX * 1.2) % 8);
        ctx.fillRect(gx, canvas.height - GROUND_H + 14, 4, 4);
      }

      ctx.save();
      ctx.translate(banana.x, banana.y);
      ctx.rotate(banana.rot);
      ctx.fillStyle = '#FFE135';
      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12; ctx.shadowColor = '#FFE135';
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.fillStyle = '#3a2d0a';
      ctx.fillRect(-17, -8, 4, 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(5, -4, 5, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(7, -3, 3, 3);
      const flapOff = banana.flapT > 0 ? -8 : 0;
      ctx.fillStyle = '#FFE135';
      ctx.strokeStyle = '#D4A017';
      ctx.beginPath();
      ctx.ellipse(-4, 3 + flapOff, 8, 4, 0.3, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      if (started && !dead) {
        ctx.fillStyle = '#FFE135';
        ctx.font = '34px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 12; ctx.shadowColor = '#FFE135';
        ctx.fillText(String(score), canvas.width / 2, 70);
        ctx.shadowBlur = 0;
      }

      if (flash > 0) {
        ctx.fillStyle = `rgba(255,225,53,${flash / 30})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flash--;
      }

      if (!started) overlay('FLAPPY NANA', 'SPACE / CLICK TO FLAP');
      else if (paused) overlay('PAUSED', 'P TO RESUME');
      else if (dead) overlay('GAME OVER', `${score} BANANAS  ·  R TO RESTART`);
    }

    function overlay(title, sub) {
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFE135';
      ctx.textAlign = 'center';
      ctx.font = '22px "Press Start 2P", monospace';
      ctx.shadowBlur = 14; ctx.shadowColor = '#FFE135';
      ctx.fillText(title, canvas.width/2, canvas.height/2 - 10);
      ctx.fillStyle = '#39FF14';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.shadowColor = '#39FF14';
      ctx.fillText(sub, canvas.width/2, canvas.height/2 + 30);
      ctx.shadowBlur = 0;
    }

    reset();
    let raf;
    function loop() { update(); draw(); raf = requestAnimationFrame(loop); }

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'arrowup' || k === 'w') {
        if (dead) { reset(); started = true; flap(); }
        else flap();
        e.preventDefault();
      } else if (k === 'p' && started && !dead) { paused = !paused; e.preventDefault(); }
      else if (k === 'r' && dead) { reset(); started = true; flap(); e.preventDefault(); }
    }
    function onClick() {
      if (dead) { reset(); started = true; }
      flap();
    }

    function onTouch(e) { e.preventDefault(); onClick(); }
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('mousedown', onClick);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('mousedown', onClick);
      canvas.removeEventListener('touchstart', onTouch);
      canvas.remove();
    };
  }
};
