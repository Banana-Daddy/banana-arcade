export default {
  id: 'tile2048',
  mount({ container, audio, onScore }) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 520;
    canvas.className = 'game-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const N = 4;
    const PAD = 14;
    const CELL = (canvas.width - PAD * (N + 1)) / N;

    const LABELS = { 2:'NANA', 4:'PAIR', 8:'BUNCH', 16:'CRATE', 32:'CART', 64:'TRUCK', 128:'STORE', 256:'FARM', 512:'GROVE', 1024:'KING', 2048:'GOD', 4096:'LEGEND', 8192:'MYTH' };
    const COLORS = { 2:'#FFF8B0', 4:'#FFE135', 8:'#FFD000', 16:'#FFB000', 32:'#FF8800', 64:'#FF5500', 128:'#FF3000', 256:'#FF0066', 512:'#FF10F0', 1024:'#9D4EDD', 2048:'#39FF14', 4096:'#00FFFF', 8192:'#fff' };

    let board, score, history, dead, won, anim, spawnAnim;

    function empty() { return Array.from({ length: N }, () => Array(N).fill(0)); }

    function reset() {
      board = empty();
      score = 0;
      history = [];
      dead = false; won = false;
      anim = []; spawnAnim = [];
      spawn(); spawn();
      onScore(0);
    }

    function spawn() {
      const empties = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] === 0) empties.push([r, c]);
      if (!empties.length) return;
      const [r, c] = empties[Math.floor(Math.random() * empties.length)];
      board[r][c] = Math.random() < 0.9 ? 2 : 4;
      spawnAnim.push({ r, c, t: 12 });
    }

    function cloneBoard(b) { return b.map(r => r.slice()); }

    function slide(row) {
      const filtered = row.filter(v => v !== 0);
      let gained = 0;
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          gained += filtered[i];
          filtered.splice(i + 1, 1);
        }
      }
      while (filtered.length < N) filtered.push(0);
      return { row: filtered, gained };
    }

    function move(dir) {
      if (dead) return;
      const prev = cloneBoard(board);
      const prevScore = score;
      let gained = 0, moved = false;

      if (dir === 'left' || dir === 'right') {
        for (let r = 0; r < N; r++) {
          let row = board[r].slice();
          if (dir === 'right') row.reverse();
          const res = slide(row);
          if (dir === 'right') res.row.reverse();
          if (res.row.some((v, i) => v !== board[r][i])) moved = true;
          board[r] = res.row;
          gained += res.gained;
        }
      } else {
        for (let c = 0; c < N; c++) {
          let col = board.map(r => r[c]);
          if (dir === 'down') col.reverse();
          const res = slide(col);
          if (dir === 'down') res.row.reverse();
          if (res.row.some((v, i) => v !== board[i][c])) moved = true;
          for (let r = 0; r < N; r++) board[r][c] = res.row[r];
          gained += res.gained;
        }
      }

      if (moved) {
        score += gained;
        history.push({ board: prev, score: prevScore });
        if (history.length > 30) history.shift();
        if (gained > 0) audio.merge();
        else audio.blip();
        spawn();
        onScore(score);
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] >= 2048 && !won) { won = true; audio.powerup(); }
        if (isStuck()) { dead = true; audio.die(); }
      }
    }

    function isStuck() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (board[r][c] === 0) return false;
        if (r < N - 1 && board[r][c] === board[r + 1][c]) return false;
        if (c < N - 1 && board[r][c] === board[r][c + 1]) return false;
      }
      return true;
    }

    function undo() {
      if (!history.length) return;
      const last = history.pop();
      board = last.board;
      score = last.score;
      dead = false;
      onScore(score);
      audio.blip();
    }

    function draw() {
      ctx.fillStyle = '#14141c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e1e2a';
      ctx.fillRect(PAD / 2, PAD / 2, canvas.width - PAD, canvas.height - PAD);

      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const x = PAD + c * (CELL + PAD);
        const y = PAD + r * (CELL + PAD);
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(x, y, CELL, CELL);
        const v = board[r][c];
        if (v) {
          const sa = spawnAnim.find(s => s.r === r && s.c === c);
          const scale = sa ? 0.4 + (12 - sa.t) / 12 * 0.6 : 1;
          const color = COLORS[v] || '#fff';
          const cx = x + CELL / 2, cy = y + CELL / 2;
          const sz = CELL * scale;
          const sx = cx - sz / 2, sy = cy - sz / 2;
          ctx.fillStyle = color;
          ctx.shadowBlur = v >= 128 ? 20 : 10;
          ctx.shadowColor = color;
          ctx.fillRect(sx, sy, sz, sz);
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(sx, sy, sz, sz * 0.15);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(sx, sy + sz * 0.85, sz, sz * 0.15);
          const label = LABELS[v] || String(v);
          ctx.fillStyle = v < 16 ? '#1a1a00' : '#fff';
          const fs = label.length > 5 ? 11 : label.length > 3 ? 14 : 18;
          ctx.font = `${fs}px "Press Start 2P", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, cx, cy - 8);
          ctx.font = '10px "Press Start 2P", monospace';
          ctx.fillText(String(v), cx, cy + 14);
        }
      }

      if (won && !dead) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.fillStyle = '#39FF14';
        ctx.textAlign = 'center';
        ctx.font = '18px "Press Start 2P", monospace';
        ctx.shadowBlur = 14; ctx.shadowColor = '#39FF14';
        ctx.fillText('BANANA GOD!', canvas.width / 2, canvas.height / 2 + 6);
        ctx.shadowBlur = 0;
      }
      if (dead) overlay('GAME OVER', `SCORE ${score}  ·  R RESTART  ·  U UNDO`);
    }

    function overlay(title, sub) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
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

    reset();
    let raf;
    function loop() {
      spawnAnim.forEach(s => s.t--);
      spawnAnim = spawnAnim.filter(s => s.t > 0);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') move('up');
      else if (k === 'arrowdown' || k === 's') move('down');
      else if (k === 'arrowleft' || k === 'a') move('left');
      else if (k === 'arrowright' || k === 'd') move('right');
      else if (k === 'u') undo();
      else if (k === 'r') reset();
      else return;
      e.preventDefault();
    }

    let touchStart = null;
    function onTouchStart(e) { const t = e.touches[0]; touchStart = { x: t.clientX, y: t.clientY }; }
    function onTouchEnd(e) {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
      touchStart = null;
    }

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.remove();
    };
  }
};
