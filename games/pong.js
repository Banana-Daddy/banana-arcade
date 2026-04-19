export default {
  id: 'pong',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = 560; canvas.height = 380;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const PW = 12, PH = 70;
    const keys = {};
    let p1, p2, ball, score1, score2, started, dead, winner, serveDir, tick, particles;

    function reset() {
      p1 = { y: (canvas.height - PH) / 2 };
      p2 = { y: (canvas.height - PH) / 2, aiTargetOffset: 0 };
      ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0, speed: 5 };
      score1 = 0; score2 = 0;
      started = false; dead = false; winner = null;
      serveDir = Math.random() < 0.5 ? 1 : -1;
      tick = 0; particles = [];
      onScore(0);
    }

    function launch(dir) {
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.speed = 5;
      const angle = (Math.random() - 0.5) * (Math.PI / 3);
      ball.vx = dir * Math.cos(angle) * ball.speed;
      ball.vy = Math.sin(angle) * ball.speed;
    }

    function serve() {
      if (dead) { reset(); }
      if (!started) started = true;
      launch(serveDir);
    }

    function burst(x, y, color, n = 8) {
      for (let i = 0; i < n; i++) particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 20, color
      });
    }

    function update() {
      tick++;
      if (!started || dead || (ball.vx === 0 && ball.vy === 0)) return;
      if (keys.up) p1.y -= 7;
      if (keys.down) p1.y += 7;
      p1.y = Math.max(0, Math.min(canvas.height - PH, p1.y));

      if (tick % 30 === 0) p2.aiTargetOffset = (Math.random() - 0.5) * 30;
      const aiTarget = ball.y + p2.aiTargetOffset - PH / 2;
      const aiSpeed = 4.3;
      if (p2.y + 5 < aiTarget) p2.y += aiSpeed;
      else if (p2.y - 5 > aiTarget) p2.y -= aiSpeed;
      p2.y = Math.max(0, Math.min(canvas.height - PH, p2.y));

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.y < 6) { ball.y = 6; ball.vy = -ball.vy; audio.blip(); }
      if (ball.y > canvas.height - 6) { ball.y = canvas.height - 6; ball.vy = -ball.vy; audio.blip(); }

      if (ball.vx < 0 && ball.x - 6 < 20 + PW && ball.x > 10 && ball.y > p1.y && ball.y < p1.y + PH) {
        const rel = (ball.y - (p1.y + PH / 2)) / (PH / 2);
        const angle = rel * (Math.PI / 3.4);
        ball.speed = Math.min(12, ball.speed + 0.3);
        ball.vx = Math.abs(Math.cos(angle) * ball.speed);
        ball.vy = Math.sin(angle) * ball.speed;
        ball.x = 20 + PW + 6;
        audio.hit();
        burst(ball.x, ball.y, '#FFE135', 6);
      }
      if (ball.vx > 0 && ball.x + 6 > canvas.width - 20 - PW && ball.x < canvas.width - 10 && ball.y > p2.y && ball.y < p2.y + PH) {
        const rel = (ball.y - (p2.y + PH / 2)) / (PH / 2);
        const angle = rel * (Math.PI / 3.4);
        ball.speed = Math.min(12, ball.speed + 0.3);
        ball.vx = -Math.abs(Math.cos(angle) * ball.speed);
        ball.vy = Math.sin(angle) * ball.speed;
        ball.x = canvas.width - 20 - PW - 6;
        audio.hit();
        burst(ball.x, ball.y, '#00FFFF', 6);
      }

      if (ball.x < -10) {
        score2++; serveDir = 1;
        audio.die();
        if (score2 >= 10) { winner = 'CPU'; dead = true; audio.die(); }
        else launch(1);
      }
      if (ball.x > canvas.width + 10) {
        score1++; serveDir = -1;
        onScore(score1);
        audio.coin();
        if (score1 >= 10) { winner = 'YOU'; dead = true; audio.powerup(); }
        else launch(-1);
      }
    }

    function draw() {
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e1e3a';
      for (let y = 10; y < canvas.height - 10; y += 22) ctx.fillRect(canvas.width / 2 - 2, y, 4, 12);

      ctx.fillStyle = '#FF10F0';
      ctx.font = '48px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 14; ctx.shadowColor = '#FF10F0';
      ctx.fillText(score1, canvas.width / 2 - 90, 70);
      ctx.fillStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.fillText(score2, canvas.width / 2 + 90, 70);
      ctx.shadowBlur = 0;

      drawPaddle(20, p1.y, '#FF10F0');
      drawPaddle(canvas.width - 20 - PW, p2.y, '#00FFFF');

      ctx.fillStyle = '#FFE135';
      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10; ctx.shadowColor = '#FFE135';
      ctx.beginPath();
      ctx.ellipse(ball.x, ball.y, 9, 5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();

      particles.forEach(p => {
        ctx.globalAlpha = p.life / 20;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
      });

      ctx.fillStyle = '#555';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', canvas.width / 4, canvas.height - 14);
      ctx.fillText('CPU', 3 * canvas.width / 4, canvas.height - 14);

      if (!started) overlay('BANANA PONG', 'TAP / SPACE TO SERVE  ·  FIRST TO 10');
      else if (dead) overlay(winner === 'YOU' ? 'YOU WIN!' : 'CPU WINS', 'TAP / R TO REMATCH');
    }

    function drawPaddle(x, y, color) {
      ctx.save();
      ctx.translate(x + PW / 2, y + PH / 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = 14; ctx.shadowColor = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, PW / 2 + 2, PH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, PW / 2 + 2, PH / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-PW / 4, -PH / 2 + 6, PW / 2, 3);
      ctx.restore();
    }

    function overlay(title, sub) {
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFE135';
      ctx.textAlign = 'center';
      ctx.font = '24px "Press Start 2P", monospace';
      ctx.shadowBlur = 14; ctx.shadowColor = '#FFE135';
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#39FF14';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.shadowColor = '#39FF14';
      ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 28);
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
      if (k === 'arrowup' || k === 'w') { keys.up = true; e.preventDefault(); }
      else if (k === 'arrowdown' || k === 's') { keys.down = true; e.preventDefault(); }
      else if (k === ' ' || k === 'enter') { serve(); e.preventDefault(); }
      else if (k === 'r' && dead) { reset(); started = true; serve(); e.preventDefault(); }
    }
    function onKeyUp(e) {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') keys.up = false;
      if (k === 'arrowdown' || k === 's') keys.down = false;
    }
    function onMouse(e) {
      const rect = canvas.getBoundingClientRect();
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      p1.y = Math.max(0, Math.min(canvas.height - PH, y - PH / 2));
    }
    function onMouseDown() { serve(); }
    function onTouchStart(e) {
      e.preventDefault();
      if (!e.touches.length) return;
      const t = e.touches[0];
      onMouse({ clientX: t.clientX, clientY: t.clientY });
      serve();
    }
    function onTouchMove(e) {
      if (!e.touches.length) return;
      const t = e.touches[0];
      onMouse({ clientX: t.clientX, clientY: t.clientY });
    }

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.remove();
    };
  }
};
