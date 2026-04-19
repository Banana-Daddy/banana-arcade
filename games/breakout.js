export default {
  id: 'breakout',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = 520; canvas.height = 560;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const COLS = 9, ROWS = 5;
    const BW = 52, BH = 18;
    const OFF_X = 14, OFF_Y = 60, GAP = 4;
    const PADDLE_W = 90, PADDLE_H = 14;

    let paddle, ball, bricks, lives, score, level, dead, paused, launched, started, particles, shake;
    const keys = {};

    function resetLevel() {
      bricks = [];
      const colors = ['#FF3864', '#FF10F0', '#FFE135', '#39FF14', '#00FFFF'];
      const cols = Math.min(COLS, Math.floor((canvas.width - OFF_X * 2 + GAP) / (BW + GAP)));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < cols; c++) {
          bricks.push({
            x: OFF_X + c * (BW + GAP),
            y: OFF_Y + r * (BH + GAP),
            w: BW, h: BH,
            color: colors[r % colors.length],
            hp: r === 0 ? 2 : 1,
            maxHp: r === 0 ? 2 : 1,
            pts: (ROWS - r) * 10
          });
        }
      }
      paddle = { x: canvas.width / 2 - PADDLE_W / 2, y: canvas.height - 36 };
      ball = { x: paddle.x + PADDLE_W / 2, y: paddle.y - 8, vx: 0, vy: 0, r: 6 };
      launched = false;
    }

    function reset() {
      score = 0; lives = 3; level = 1;
      dead = false; paused = false; started = false;
      particles = []; shake = 0;
      onScore(0);
      resetLevel();
    }

    function launch() {
      if (launched || dead || !started) return;
      const speed = 5 + (level - 1) * 0.5;
      ball.vx = (Math.random() < 0.5 ? -1 : 1) * speed * 0.5;
      ball.vy = -speed;
      launched = true;
      audio.blip();
    }

    function burst(x, y, color, n = 8) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 18, color
        });
      }
    }

    function update() {
      if (!started || paused || dead) return;
      if (keys.left) paddle.x = Math.max(0, paddle.x - 8);
      if (keys.right) paddle.x = Math.min(canvas.width - PADDLE_W, paddle.x + 8);

      if (!launched) {
        ball.x = paddle.x + PADDLE_W / 2;
        ball.y = paddle.y - 8;
        return;
      }
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = -ball.vx; audio.blip(); }
      if (ball.x > canvas.width - ball.r) { ball.x = canvas.width - ball.r; ball.vx = -ball.vx; audio.blip(); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = -ball.vy; audio.blip(); }

      if (ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y + PADDLE_H &&
          ball.x > paddle.x && ball.x < paddle.x + PADDLE_W && ball.vy > 0) {
        const hit = (ball.x - paddle.x) / PADDLE_W;
        const angle = (hit - 0.5) * Math.PI * 0.6;
        const speed = Math.min(9, Math.hypot(ball.vx, ball.vy) + 0.1);
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.abs(Math.cos(angle) * speed);
        ball.y = paddle.y - ball.r;
        audio.blip();
      }

      for (const br of bricks) {
        if (br.hp <= 0) continue;
        if (ball.x + ball.r > br.x && ball.x - ball.r < br.x + br.w &&
            ball.y + ball.r > br.y && ball.y - ball.r < br.y + br.h) {
          br.hp--;
          if (br.hp <= 0) {
            score += br.pts;
            onScore(score);
            burst(br.x + br.w / 2, br.y + br.h / 2, br.color, 12);
            audio.hit();
            shake = 3;
          } else {
            audio.blip();
          }
          const dx = (ball.x - (br.x + br.w / 2)) / (br.w / 2);
          const dy = (ball.y - (br.y + br.h / 2)) / (br.h / 2);
          if (Math.abs(dx) > Math.abs(dy)) ball.vx = -ball.vx;
          else ball.vy = -ball.vy;
          break;
        }
      }

      if (ball.y > canvas.height + 30) {
        lives--;
        audio.die();
        shake = 8;
        if (lives <= 0) dead = true;
        else { launched = false; ball.vx = 0; ball.vy = 0; }
      }

      if (bricks.every(b => b.hp <= 0)) {
        level++;
        audio.powerup();
        resetLevel();
      }
    }

    function draw() {
      const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      if (shake > 0) shake -= 0.5;
      ctx.save();
      ctx.translate(sx, sy);

      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

      ctx.fillStyle = '#1a1a30';
      for (let i = 0; i < 30; i++) {
        const x = (i * 73) % canvas.width;
        const y = (i * 41) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
      }

      bricks.forEach(br => {
        if (br.hp <= 0) return;
        ctx.fillStyle = br.color;
        ctx.shadowBlur = 8; ctx.shadowColor = br.color;
        ctx.fillRect(br.x, br.y, br.w, br.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(br.x, br.y, br.w, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(br.x, br.y + br.h - 3, br.w, 3);
        if (br.hp > 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(br.x + 3, br.y + 3, br.w - 6, br.h - 6);
        }
      });

      ctx.save();
      ctx.translate(paddle.x + PADDLE_W / 2, paddle.y + PADDLE_H / 2);
      ctx.shadowBlur = 14; ctx.shadowColor = '#FFE135';
      ctx.fillStyle = '#FFE135';
      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, PADDLE_W / 2, PADDLE_H / 2, -0.05, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#3a2d0a';
      ctx.fillRect(-PADDLE_W / 2 - 3, -3, 4, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-PADDLE_W / 2 + 10, -PADDLE_H / 2 + 3, PADDLE_W - 30, 2);
      ctx.restore();

      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFE135';
      ctx.beginPath();
      ctx.arc(ball.x - 1, ball.y - 1, ball.r - 2, 0, Math.PI * 2);
      ctx.fill();

      particles.forEach(p => {
        ctx.globalAlpha = p.life / 18;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
      });

      ctx.fillStyle = '#39FF14';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.shadowBlur = 6; ctx.shadowColor = '#39FF14';
      ctx.fillText(`LV ${level}`, 10, 28);
      ctx.textAlign = 'right';
      let hearts = '';
      for (let i = 0; i < lives; i++) hearts += '♥ ';
      ctx.fillStyle = '#FF10F0';
      ctx.shadowColor = '#FF10F0';
      ctx.fillText(hearts.trim(), canvas.width - 10, 28);
      ctx.shadowBlur = 0;

      ctx.restore();

      if (!started) overlay('SMASH BUNCH', 'SPACE TO LAUNCH · ← → MOVE');
      else if (paused) overlay('PAUSED', 'P TO RESUME');
      else if (dead) overlay('GAME OVER', `SCORE ${score} · R TO RESTART`);
      else if (!launched) {
        ctx.fillStyle = '#FFE135';
        ctx.textAlign = 'center';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.shadowBlur = 8; ctx.shadowColor = '#FFE135';
        ctx.fillText('PRESS SPACE TO LAUNCH', canvas.width / 2, canvas.height - 70);
        ctx.shadowBlur = 0;
      }
    }

    function overlay(title, sub) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFE135';
      ctx.textAlign = 'center';
      ctx.font = '22px "Press Start 2P", monospace';
      ctx.shadowBlur = 14; ctx.shadowColor = '#FFE135';
      ctx.fillText(title, canvas.width/2, canvas.height/2 - 10);
      ctx.fillStyle = '#39FF14';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.shadowColor = '#39FF14';
      ctx.fillText(sub, canvas.width/2, canvas.height/2 + 30);
      ctx.shadowBlur = 0;
    }

    reset();
    let raf;
    function loop() {
      update();
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; });
      particles = particles.filter(p => p.life > 0);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { keys.left = true; if (!started) started = true; e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { keys.right = true; if (!started) started = true; e.preventDefault(); }
      else if (k === ' ') {
        if (dead) { reset(); started = true; }
        else if (!started) started = true;
        launch();
        e.preventDefault();
      }
      else if (k === 'p' && started && !dead) { paused = !paused; e.preventDefault(); }
      else if (k === 'r' && dead) { reset(); started = true; e.preventDefault(); }
    }
    function onKeyUp(e) {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keys.left = false;
      if (k === 'arrowright' || k === 'd') keys.right = false;
    }
    function onMouse(e) {
      if (!started) started = true;
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      paddle.x = Math.max(0, Math.min(canvas.width - PADDLE_W, (e.clientX - rect.left) * scale - PADDLE_W / 2));
    }
    function onClick() {
      if (dead) { reset(); started = true; }
      if (!started) started = true;
      launch();
    }

    function onTouchMove(e) {
      if (!e.touches.length) return;
      const t = e.touches[0];
      onMouse({ clientX: t.clientX, clientY: t.clientY });
    }
    function onTouchStart(e) {
      e.preventDefault();
      if (!e.touches.length) return;
      const t = e.touches[0];
      onMouse({ clientX: t.clientX, clientY: t.clientY });
      onClick();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('mousedown', onClick);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('mousedown', onClick);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.remove();
    };
  }
};
