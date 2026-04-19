export default {
  id: 'snake',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 480;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const G = 20;
    const CELL = canvas.width / G;

    let snake, dir, next, food, score, tick, speed, dead, paused, started, particles;

    function reset() {
      snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
      dir = {x:1,y:0}; next = dir;
      food = spawn();
      score = 0; tick = 0; speed = 8;
      dead = false; paused = false; started = false;
      particles = [];
      onScore(0);
    }

    function spawn() {
      while (true) {
        const f = { x: Math.floor(Math.random()*G), y: Math.floor(Math.random()*G) };
        if (!snake.some(s => s.x===f.x && s.y===f.y)) return f;
      }
    }

    function step() {
      dir = next;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= G || head.y < 0 || head.y >= G) return die();
      if (snake.some(s => s.x === head.x && s.y === head.y)) return die();
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        onScore(score);
        burst(food.x * CELL + CELL/2, food.y * CELL + CELL/2, '#FFE135');
        food = spawn();
        if (score % 50 === 0) speed = Math.min(22, speed + 1);
        audio.blip();
      } else snake.pop();
    }

    function burst(x, y, color) {
      for (let i = 0; i < 10; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 20, color
        });
      }
    }

    function die() {
      if (dead) return;
      dead = true;
      audio.die();
      burst(snake[0].x * CELL + CELL/2, snake[0].y * CELL + CELL/2, '#FF3864');
    }

    function draw() {
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#14141c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= G; i++) {
        ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height);
        ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL);
      }
      ctx.stroke();

      drawBanana(food.x * CELL + CELL/2, food.y * CELL + CELL/2);

      snake.forEach((s, i) => {
        const isHead = i === 0;
        if (isHead) {
          ctx.fillStyle = '#39FF14';
          ctx.shadowBlur = 14; ctx.shadowColor = '#39FF14';
          ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000';
          const ox = dir.x * 3, oy = dir.y * 3;
          ctx.fillRect(s.x * CELL + CELL/2 - 6 + ox, s.y * CELL + CELL/2 - 4 + oy, 3, 3);
          ctx.fillRect(s.x * CELL + CELL/2 + 3 + ox, s.y * CELL + CELL/2 - 4 + oy, 3, 3);
        } else {
          ctx.fillStyle = i % 2 === 0 ? '#2ACC10' : '#22AA08';
          ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
          ctx.fillStyle = '#38E018';
          ctx.fillRect(s.x * CELL + 4, s.y * CELL + 4, 4, 2);
        }
      });

      particles.forEach(p => {
        ctx.globalAlpha = p.life / 20;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
      });

      if (!started) overlay('BANANA SNAKE', 'SPACE TO BEGIN');
      else if (paused) overlay('PAUSED', 'P TO RESUME');
      else if (dead) overlay('GAME OVER', 'R TO RESTART  ·  ESC TO EXIT');
    }

    function drawBanana(cx, cy) {
      const pulse = 1 + Math.sin(tick / 8) * 0.08;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.5);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#FFE135';
      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 12; ctx.shadowColor = '#FFE135';
      ctx.beginPath();
      ctx.ellipse(0, 0, CELL * 0.4, CELL * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.fillStyle = '#2d1e08';
      ctx.fillRect(-CELL * 0.42, -2, 3, 3);
      ctx.restore();
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
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.shadowColor = '#39FF14';
      ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 30);
      ctx.shadowBlur = 0;
    }

    reset();
    let raf;
    function loop() {
      tick++;
      if (started && !paused && !dead) {
        if (tick % Math.max(3, Math.floor(60 / speed)) === 0) step();
      }
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      particles = particles.filter(p => p.life > 0);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (!started && (k === ' ' || k === 'enter')) { started = true; e.preventDefault(); return; }
      if (dead && k === 'r') { reset(); started = true; e.preventDefault(); return; }
      if (k === 'p' && !dead) { paused = !paused; e.preventDefault(); return; }
      if (paused || dead || !started) return;
      if ((k === 'arrowup' || k === 'w') && dir.y === 0) next = { x: 0, y: -1 };
      else if ((k === 'arrowdown' || k === 's') && dir.y === 0) next = { x: 0, y: 1 };
      else if ((k === 'arrowleft' || k === 'a') && dir.x === 0) next = { x: -1, y: 0 };
      else if ((k === 'arrowright' || k === 'd') && dir.x === 0) next = { x: 1, y: 0 };
      else return;
      e.preventDefault();
    }

    window.addEventListener('keydown', onKey);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.remove();
    };
  }
};
