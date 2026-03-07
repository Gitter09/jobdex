/* starfield.js — high-quality twinkling star field */
(function () {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, stars = [];
  let shooters = [];
  let nextShooterAt = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

  function buildStars() {
    stars = [];
    const density = (W * H) / 3000;
    for (let i = 0; i < density; i++) {
      const base = Math.random() * 0.5 + 0.08;
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.15,
        base,
        amp: base * 0.6,
        spd: Math.random() * 0.008 + 0.003,
        off: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.03,
        vy: (Math.random() - 0.5) * 0.02,
        // occasional brighter "cluster" star
        bright: Math.random() > 0.93,
      });
    }
  }

  function spawnShooter() {
    // Pick a random edge to spawn from: 0=top, 1=right, 2=bottom, 3=left
    const edge = Math.floor(Math.random() * 4);
    let sx, sy;

    if (edge === 0) { // Top
      sx = Math.random() * W;
      sy = -20;
    } else if (edge === 1) { // Right
      sx = W + 20;
      sy = Math.random() * H;
    } else if (edge === 2) { // Bottom
      sx = Math.random() * W;
      sy = H + 20;
    } else { // Left
      sx = -20;
      sy = Math.random() * H;
    }

    // Aim toward a random point in the center 60% of the screen
    const tx = W * 0.2 + Math.random() * W * 0.6;
    const ty = H * 0.2 + Math.random() * H * 0.6;

    // Calculate angle and velocity
    const dx = tx - sx;
    const dy = ty - sy;
    const angleRad = Math.atan2(dy, dx);
    const speed = 350 + Math.random() * 350;       // 350–700 px/sec
    const lifespan = 0.5 + Math.random() * 1.0;    // 0.5–1.5s
    const tailLength = speed * lifespan * 0.5;

    shooters.push({
      x: sx,
      y: sy,
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      life: 0,
      lifespan,
      tailLength,
      speed,
      brightness: 0.5 + (speed / 700) * 0.5,
    });
  }

  function drawShooters(dt) {
    const now = performance.now() / 1000;

    // Spawn a new shooter on a random interval between 2s and 12s
    if (now >= nextShooterAt) {
      spawnShooter();
      nextShooterAt = now + 2 + Math.random() * 10;
    }

    shooters = shooters.filter(s => s.life < s.lifespan);

    for (const s of shooters) {
      s.life += dt;

      // Advance position
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Fade envelope: ramp up over first 15% of life, ramp down over last 25%
      const progress = s.life / s.lifespan;
      let alpha;
      if (progress < 0.15) {
        alpha = progress / 0.15;
      } else if (progress > 0.75) {
        alpha = 1 - (progress - 0.75) / 0.25;
      } else {
        alpha = 1;
      }
      alpha *= s.brightness;

      // Tail: draw from (tailEnd) to (head) along the exact travel vector
      // Travel direction unit vector
      const len = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      const ux = s.vx / len;
      const uy = s.vy / len;

      // Tail end point (behind the head along negative travel direction)
      const tailFactor = Math.min(1, progress / 0.3); // tail grows in during first 30% of life
      const tailLen = s.tailLength * tailFactor;
      const tx = s.x - ux * tailLen;
      const ty = s.y - uy * tailLen;

      // Draw tail as a linear gradient line along the travel vector
      const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
      grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      grad.addColorStop(0.6, `rgba(220, 235, 255, ${alpha * 0.18})`);
      grad.addColorStop(1, `rgba(240, 248, 255, ${alpha * 0.72})`);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Draw the hot tip: a small bright glow at the head position
      const tipGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 3.5);
      tipGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      tipGrad.addColorStop(0.4, `rgba(210, 235, 255, ${alpha * 0.5})`);
      tipGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.beginPath();
      ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = tipGrad;
      ctx.fill();

      ctx.restore();
    }
  }

  // very faint "constellation" lines between nearby stars
  function drawConnections(t) {
    if (W < 800) return; // skip on mobile
    ctx.strokeStyle = 'rgba(255,255,255,0.018)';
    ctx.lineWidth = 0.5;
    const sample = stars.slice(0, 80); // only check subset
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        const dx = sample[i].x - sample[j].x;
        const dy = sample[i].y - sample[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          const alpha = (1 - dist / 90) * 0.04;
          ctx.strokeStyle = `rgba(180,200,255,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(sample[i].x, sample[i].y);
          ctx.lineTo(sample[j].x, sample[j].y);
          ctx.stroke();
        }
      }
    }
  }

  let t = 0;
  let raf;
  let lastFrameTime = 0;

  function frame(timestamp) {
    // timestamp will be undefined on the very first call from init()
    // dt = delta time in seconds
    const dt = (!timestamp || lastFrameTime === 0) ? 0.016 : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp || performance.now();

    ctx.clearRect(0, 0, W, H);
    t += 0.012;

    drawConnections(t);

    for (const s of stars) {
      // slow drift
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = W;
      if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H;
      if (s.y > H) s.y = 0;

      const alpha = s.base + Math.sin(t * s.spd * 55 + s.off) * s.amp;

      if (s.bright) {
        // draw a subtle cross/sparkle for brighter stars
        const r2 = s.r * 1.8;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r2 * 2.5);
        grad.addColorStop(0, `rgba(230,240,255,${alpha * 1.2})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r2 * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,232,255,${alpha})`;
      ctx.fill();
    }

    drawShooters(dt);

    raf = requestAnimationFrame(frame);
  }

  function init() {
    resize();
    buildStars();
    cancelAnimationFrame(raf);
    frame();
  }

  window.addEventListener('resize', () => {
    resize();
    buildStars();
  });

  // start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
