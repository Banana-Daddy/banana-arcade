export default {
  id: 'invaders',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 560;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const ROWS = 4, COLS = 8;
    const EW = 30, EH = 22;
    const keys = {};
    let player, bullets, enemies, eBullets, score, dir, moveT, level, lives, dead, started, waveT, fireT, particles, pointerX;

    function makeEnemies() {
      enemies = [];
      const off = 30;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        enemies.push({
          x: off + c * (EW + 16),
          y: 70 + r * (EH + 10),
          w: EW, h: EH,
          type: r === 0 ? 'apple' : r === 1 ? 'tomato' : r === 2 ? 'orange' : 'grape',
          pts: (ROWS - r) * 10, alive: true
        });
      }
    }

    function reset() {
      player = { x: canvas.width / 2 - 22, y: canvas.height - 52, w: 44, h: 30 };
      bullets = []; eBullets = [];
      makeEnemies();
      score = 0; dir = 1; moveT = 0; level = 1; lives = 3;
      dead = false; started = false; waveT = 0; fireT = 0;
      particles = [];
      pointerX = null;
      onScore(0);
    }

    function nextWave() {
      level++;
      makeEnemies();
      eBullets = [];
      waveT = 90;
      audio.powerup();
    }

    function fire() {
      if (bullets.length >= 2) return;
      bullets.push({ x: player.x + player.w / 2, y: player.y - 4, vy: -9 });
      audio.blip();
    }

    function enemyFire() {
      const alive = enemies.filter(e => e.alive);
      if (!alive.length) return;
      const e = alive[Math.floor(Math.random() * alive.length)];
      eBullets.push({ x: e.x + e.w / 2, y: e.y + e.h, vy: 3 + level * 0.4 });
    }

    function burst(x, y, color) {
      for (let i = 0; i < 10; i++) particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 20, color
      });
    }

    function update() {
      if (!started || dead) return;
      if (waveT > 0) { waveT--; return; }

      if (keys.left) player.x -= 6;
      if (keys.right) player.x += 6;
      if (pointerX !== null) {
        const diff = pointerX - (player.x + player.w / 2);
        if (Math.abs(diff) > 2) player.x += Math.sign(diff) * Math.min(7, Math.abs(diff));
      }
      player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));

      fireT++;
      if (fireT > 18) { fire(); fireT = 0; }

      bullets.forEach(b => b.y += b.vy);
      bullets = bullets.filter(b => b.y > -10);
      eBullets.forEach(b => b.y += b.vy);
      eBullets = eBullets.filter(b => b.y < canvas.height + 10);

      moveT++;
      const remaining = enemies.filter(e => e.alive).length;
      const interval = Math.max(4, 28 - Math.floor((ROWS * COLS - remaining) / 3) - level);
      if (moveT >= interval) {
        moveT = 0;
        let hitEdge = false;
        for (const e of enemies) if (e.alive) {
          e.x += dir * 8;
          if (e.x + e.w > canvas.width - 10 || e.x < 10) hitEdge = true;
        }
        if (hitEdge) {
          dir *= -1;
          for (const e of enemies) if (e.alive) e.y += 14;
        }
        audio.tone(120, 0.04, 'square', 0.4);
      }

      if (Math.random() < 0.015 + level * 0.004) enemyFire();

      bullets.forEach(b => {
        enemies.forEach(e => {
          if (!e.alive || b.dead) return;
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            e.alive = false; b.dead = true;
            score += e.pts;
            onScore(score);
            burst(e.x + e.w / 2, e.y + e.h / 2, '#FFE135');
            audio.hit();
          }
        });
      });
      bullets = bullets.filter(b => !b.dead);

      eBullets.forEach(b => {
        if (b.x > player.x + 4 && b.x < player.x + player.w - 4 && b.y > player.y && b.y < player.y + player.h) {
          b.dead = true;
          lives--;
          audio.die();
          burst(player.x + player.w / 2, player.y + player.h / 2, '#FF3864');
          if (lives <= 0) dead = true;
        }
      });
      eBullets = eBullets.filter(b => !b.dead);

      for (const e of enemies) {
        if (e.alive && e.y + e.h >= player.y) { dead = true; audio.die(); break; }
      }

      if (enemies.every(e => !e.alive)) nextWave();
    }

    function draw() {
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#2a2a40';
      for (let i = 0; i < 50; i++) ctx.fillRect((i * 73) % canvas.width, (i * 41) % canvas.height, 1, 1);

      enemies.forEach(e => { if (e.alive) drawEnemy(e.x, e.y, e.w, e.h, e.type); });

      ctx.save();
      ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
      ctx.fillStyle = '#FFE135';
      ctx.shadowBlur = 12; ctx.shadowColor = '#FFE135';
      ctx.beginPath();
      ctx.moveTo(0, -player.h / 2);
      ctx.lineTo(player.w / 2 - 4, player.h / 2 - 4);
      ctx.lineTo(player.w / 2, player.h / 2);
      ctx.lineTo(-player.w / 2, player.h / 2);
      ctx.lineTo(-player.w / 2 + 4, player.h / 2 - 4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#D4A017';
      ctx.fillRect(-6, -4, 12, 10);
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(-2, -10, 4, 6);
      ctx.restore();

      bullets.forEach(b => {
        ctx.fillStyle = '#FFE135';
        ctx.shadowBlur = 6; ctx.shadowColor = '#FFE135';
        ctx.fillRect(b.x - 2, b.y - 6, 4, 8);
        ctx.shadowBlur = 0;
      });
      eBullets.forEach(b => {
        ctx.fillStyle = '#FF3864';
        ctx.shadowBlur = 6; ctx.shadowColor = '#FF3864';
        ctx.fillRect(b.x - 2, b.y - 6, 4, 8);
        ctx.shadowBlur = 0;
      });

      particles.forEach(p => {
        ctx.globalAlpha = p.life / 20;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
      });

      ctx.fillStyle = '#9D4EDD';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.shadowBlur = 6; ctx.shadowColor = '#9D4EDD';
      ctx.fillText(`WAVE ${level}`, 10, 24);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FF10F0';
      ctx.shadowColor = '#FF10F0';
      let hearts = '';
      for (let i = 0; i < lives; i++) hearts += '♥ ';
      ctx.fillText(hearts.trim(), canvas.width - 10, 24);
      ctx.shadowBlur = 0;

      if (waveT > 0 && !dead && started) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.fillStyle = '#39FF14';
        ctx.textAlign = 'center';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.shadowBlur = 14; ctx.shadowColor = '#39FF14';
        ctx.fillText(`WAVE ${level}`, canvas.width / 2, canvas.height / 2 + 6);
        ctx.shadowBlur = 0;
      }

      if (!started) overlay('SPACE NANAS', 'TAP/DRAG TO MOVE  ·  AUTO-FIRE');
      else if (dead) overlay('GAME OVER', `SCORE ${score} · TAP / R TO RESTART`);
    }

    function drawEnemy(x, y, w, h, type) {
      let col;
      if (type === 'apple') col = '#FF3864';
      else if (type === 'tomato') col = '#FF6B35';
      else if (type === 'orange') col = '#FF8C00';
      else col = '#9D4EDD';
      ctx.fillStyle = col;
      ctx.shadowBlur = 8; ctx.shadowColor = col;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a5010';
      ctx.fillRect(x + w / 2 - 2, y - 2, 4, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(x + w / 2 - 6, y + h / 2 - 2, 3, 3);
      ctx.fillRect(x + w / 2 + 3, y + h / 2 - 2, 3, 3);
      ctx.fillRect(x + w / 2 - 5, y + h / 2 + 5, 10, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + w / 2 - 5, y + h / 2 - 1, 1, 1);
      ctx.fillRect(x + w / 2 + 4, y + h / 2 - 1, 1, 1);
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

    reset();
    let raf;
    function loop() {
      update();
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      particles = particles.filter(p => p.life > 0);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { keys.left = true; if (!started) started = true; e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { keys.right = true; if (!started) started = true; e.preventDefault(); }
      else if (k === ' ') { if (!started) started = true; if (dead) { reset(); started = true; } e.preventDefault(); }
      else if (k === 'r' && dead) { reset(); started = true; e.preventDefault(); }
    }
    function onKeyUp(e) {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keys.left = false;
      if (k === 'arrowright' || k === 'd') keys.right = false;
    }
    function toCanvasX(clientX) {
      const rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) * (canvas.width / rect.width);
    }
    function onMouseMove(e) { pointerX = toCanvasX(e.clientX); }
    function onMouseDown(e) {
      if (!started) started = true;
      if (dead) { reset(); started = true; }
      pointerX = toCanvasX(e.clientX);
    }
    function onMouseLeave() { pointerX = null; }
    function onTouchStart(e) {
      e.preventDefault();
      if (!e.touches.length) return;
      if (!started) started = true;
      if (dead) { reset(); started = true; }
      pointerX = toCanvasX(e.touches[0].clientX);
    }
    function onTouchMove(e) {
      if (!e.touches.length) return;
      pointerX = toCanvasX(e.touches[0].clientX);
    }
    function onTouchEnd() { pointerX = null; }

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.remove();
    };
  }
};
