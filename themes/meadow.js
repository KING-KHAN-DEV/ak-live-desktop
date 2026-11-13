// themes/meadow.js - Grass & Flowers. Under every icon: just fresh grass.
// Everywhere else: flowers and grass tufts, with butterflies drifting through.
(function () {
  const { rgb, mix, lerp, sprite, Flyers, nearPairs } = window.Kit;
  const W = 100, H = 150, BX = 50, BY = 140, DESIGN_H = 128;

  const GREENS = [[28, 96, 36], [46, 130, 48], [92, 176, 70], [140, 206, 96]];
  const PETALS = [
    { p: [255, 255, 255], c: [250, 200, 40], n: 9, len: 15 },   // daisy
    { p: [226, 58, 52],   c: [40, 24, 24],  n: 5, len: 14 },    // poppy
    { p: [150, 96, 214],  c: [255, 224, 90], n: 5, len: 13 },   // violet
    { p: [255, 208, 40],  c: [230, 150, 20], n: 7, len: 13 },   // buttercup
    { p: [255, 132, 178], c: [255, 232, 110], n: 8, len: 15 },  // cosmos
    { p: [255, 150, 60],  c: [120, 60, 20], n: 10, len: 14 },   // marigold
    { p: [120, 170, 255], c: [255, 255, 255], n: 5, len: 12 },  // forget-me-not
  ];

  function blade(x, bx, by, h, lean, wd, col) {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(bx - wd, by);
    x.quadraticCurveTo(bx - wd * 0.4 + lean * 0.3, by - h * 0.55, bx + lean, by - h);
    x.quadraticCurveTo(bx + wd * 0.4 + lean * 0.3, by - h * 0.55, bx + wd, by);
    x.closePath();
    x.fill();
  }

  function makeFlower(kind, rng) {
    const { c, x } = sprite(W, H, 2);
    const P = PETALS[kind % PETALS.length];
    // grass tuft at the base
    for (let i = 0; i < 7; i++) {
      blade(x, BX + (rng() - 0.5) * 22, BY, 18 + rng() * 20, (rng() - 0.5) * 22, 2.4,
        rgb(GREENS[1 + Math.floor(rng() * 3)]));
    }
    // stem
    const top = [BX + (rng() - 0.5) * 14, 48 + rng() * 22];
    x.strokeStyle = rgb(GREENS[1]);
    x.lineWidth = 3;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(BX, BY);
    x.quadraticCurveTo(BX + (rng() - 0.5) * 20, (BY + top[1]) / 2, top[0], top[1]);
    x.stroke();
    // two leaves
    x.fillStyle = rgb(GREENS[2]);
    for (const side of [-1, 1]) {
      const ly = BY - 34 - rng() * 14;
      x.beginPath();
      x.moveTo(BX, ly);
      x.quadraticCurveTo(BX + side * 18, ly - 16, BX + side * 26, ly - 6 - rng() * 6);
      x.quadraticCurveTo(BX + side * 12, ly + 2, BX, ly);
      x.fill();
    }
    // petals
    x.save();
    x.translate(top[0], top[1]);
    const rot = rng() * Math.PI;
    for (let i = 0; i < P.n; i++) {
      x.save();
      x.rotate(rot + (i / P.n) * Math.PI * 2);
      const L = P.len * (0.92 + rng() * 0.16);
      const g = x.createLinearGradient(0, 0, 0, -L);
      g.addColorStop(0, rgb(mix(P.p, [255, 255, 255], 0.0)));
      g.addColorStop(1, rgb(mix(P.p, [255, 255, 255], 0.35)));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, 0);
      x.bezierCurveTo(-L * 0.55, -L * 0.35, -L * 0.35, -L * 1.0, 0, -L);
      x.bezierCurveTo(L * 0.35, -L * 1.0, L * 0.55, -L * 0.35, 0, 0);
      x.fill();
      x.strokeStyle = rgb(mix(P.p, [0, 0, 0], 0.25), 0.35);
      x.lineWidth = 0.8;
      x.stroke();
      x.restore();
    }
    x.fillStyle = rgb(P.c);
    x.beginPath();
    x.arc(0, 0, P.len * 0.3, 0, Math.PI * 2);
    x.fill();
    x.restore();
    return c;
  }

  function makeTuft(rng) {
    const { c, x } = sprite(W, H, 2);
    const n = 13;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) - 0.5;
      const h = 34 + rng() * 40 - Math.abs(t) * 30;
      blade(x, BX + t * 36 + (rng() - 0.5) * 6, BY, h, t * 46 + (rng() - 0.5) * 16, 2.6 + rng() * 1.2,
        rgb(GREENS[Math.floor(rng() * 4)]));
    }
    return c;
  }

  function drawButterfly(ctx, f, now) {
    const s = f.size;
    const flap = Math.abs(Math.sin(now * 0.001 * f.rate + f.phase));
    const cols = [[255, 140, 60], [90, 160, 255], [255, 110, 170], [255, 220, 70], [190, 130, 255]];
    const col = cols[f.hue % cols.length];
    ctx.translate(f.x, f.y + Math.sin(now * 0.003 + f.phase) * 4);
    ctx.rotate(f.ang + Math.PI / 2);
    ctx.globalAlpha = 0.95;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * (0.25 + flap * 0.75), 1);
      ctx.fillStyle = rgb(col);
      ctx.beginPath();
      ctx.ellipse(s * 0.5, -s * 0.28, s * 0.5, s * 0.36, -0.5, 0, Math.PI * 2);   // upper wing
      ctx.fill();
      ctx.fillStyle = rgb(mix(col, [255, 255, 255], 0.35));
      ctx.beginPath();
      ctx.ellipse(s * 0.38, s * 0.28, s * 0.32, s * 0.26, 0.5, 0, Math.PI * 2);   // lower wing
      ctx.fill();
      ctx.fillStyle = 'rgba(40,20,20,0.5)';
      ctx.beginPath();
      ctx.arc(s * 0.55, -s * 0.28, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#2b1d16';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.07, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const MeadowTheme = {
    id: 'meadow',
    name: 'Grass & Flowers',
    itemName: 'flowers & tufts',
    spacing: 30,
    margin: 8,
    grow: { min: 1.2, max: 2.2, delay: 1.4 },
    shrink: 0.3,
    iconGrow: 1.4,
    animated: true,
    sprites: null,
    flock: null,

    prepare() {
      if (!this.sprites) {
        const flowers = [], tufts = [];
        for (let v = 0; v < 28; v++) flowers.push(makeFlower(v, window.mulberry32(900 + v)));
        for (let v = 0; v < 10; v++) tufts.push(makeTuft(window.mulberry32(300 + v)));
        this.sprites = { flowers, tufts };
      }
      this.flock = new Flyers({
        count: 9, size: [10, 22], speed: [24, 60], turn: 3.2, rate: [7, 11], draw: drawButterfly,
        // interaction: butterflies are curious - they flutter toward the mouse and hover around it
        steer(f, dt, now, eng) {
          const c = eng && eng.cursor;
          if (!c || !c.on) return;
          const dx = c.sx - f.x, dy = c.sy - f.y, d = Math.hypot(dx, dy);
          if (d > 420) return;
          let want = Math.atan2(dy, dx) + (d < 110 ? 1.4 : 0);   // close: circle around it
          let da = want - f.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
          f.ang += da * Math.min(1, dt * 2.2);
        },
      });
    },

    makeItem(rng) {
      const flower = rng() < 0.42;
      return {
        type: flower ? 'f' : 't',
        variant: Math.floor(rng() * (flower ? 28 : 10)),
        size: flower ? 66 + rng() * 36 : 44 + rng() * 28,
      };
    },

    footprint(it) { return { halfW: it.size * 0.2, up: it.size * 0.7, down: it.size * 0.04 }; },

    paintGround(ctx, w, h, rng) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#4f9d3f');
      g.addColorStop(1, '#2f7a33');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {                       // wide sunlit / shaded washes
        const x = rng() * w, y = rng() * h, r = 120 + rng() * 240, light = rng() < 0.55;
        const c = light ? '190,235,110' : '10,50,24';
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, 'rgba(' + c + ',' + (light ? 0.10 : 0.14) + ')');
        rg.addColorStop(1, 'rgba(' + c + ',0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      const n = Math.round((w * h) / 380);                  // dense grass blades everywhere
      ctx.lineCap = 'round';
      const cols = ['rgba(150,215,100,0.35)', 'rgba(90,170,70,0.4)', 'rgba(25,80,35,0.4)'];
      for (const col of cols) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = rng() * w, y = rng() * h, l = 6 + rng() * 11;
          const a = -Math.PI / 2 + (rng() - 0.5) * 0.9;
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l);
        }
        ctx.stroke();
      }
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    },

    // Under each icon: a lush mat of short, swaying grass - and nothing else.
    // Close icons share ONE mat (bridge mats between them). Grass rustles harder near the mouse.
    drawIcons(ctx, states, now, eng) {
      const cu = eng && eng.cursor && eng.cursor.on ? eng.cursor : null;
      for (const st of states) this.mat(ctx, st.rect, st.g, st.seed, now, cu);
      for (const [i, j] of nearPairs(states, 70)) {
        const a = states[i], b = states[j], g = Math.min(a.g, b.g);
        const ax = a.rect.x + a.rect.w / 2, ay = a.rect.y + a.rect.h / 2, bx = b.rect.x + b.rect.w / 2, by = b.rect.y + b.rect.h / 2;
        const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 40));
        for (let k = 1; k < n; k++) {
          const t = k / n, w = Math.min(a.rect.w, b.rect.w) * 0.8, h = Math.min(a.rect.h, b.rect.h) * 0.8;
          this.mat(ctx, { x: lerp(ax, bx, t) - w / 2, y: lerp(ay, by, t) - h / 2, w, h }, g, a.seed + b.seed * 7 + k, now, cu);
        }
      }
    },

    mat(ctx, r, g, seed, now, cu) {
      ctx.save();
      const rng = window.mulberry32(seed);
      const cx = r.x + r.w / 2, cy = r.y + r.h * 0.5;
      const rx = r.w * 0.85, ry = r.h * 0.7;
      let wind = 1;
      if (cu) { const d = Math.hypot(cu.sx - cx, cu.sy - cy); wind = 1 + 2.6 * Math.max(0, 1 - d / 260); }
      ctx.translate(cx, cy);
      ctx.scale(g, g);
      const mat = ctx.createRadialGradient(0, 0, 4, 0, 0, Math.max(rx, ry));
      mat.addColorStop(0, 'rgba(120,200,80,0.55)');
      mat.addColorStop(1, 'rgba(120,200,80,0)');
      ctx.fillStyle = mat;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 1.2, ry * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      const n = 150;
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
        const bx = Math.cos(a) * rx * d, by = Math.sin(a) * ry * d;
        const sway = Math.sin(now * 0.0015 * wind + i * 0.7 + seed) * 2.2 * wind;
        blade(ctx, bx, by + 8, 9 + rng() * 11, sway + (rng() - 0.5) * 6, 1.6,
          rgb(GREENS[1 + Math.floor(rng() * 3)], 0.9));
      }
      ctx.restore();
    },

    drawItem(ctx, it, g) {
      const sp = it.type === 'f' ? this.sprites.flowers[it.variant] : this.sprites.tufts[it.variant];
      const k = (it.size / DESIGN_H) * g;
      ctx.drawImage(sp, it.x - BX * k, it.y - BY * k, W * k, H * k);
    },

    drawOverlay(ctx, now, w, h, eng) { this.flock.draw(ctx, now, w, h, eng); },
  };

  window.MeadowTheme = MeadowTheme;
})();
