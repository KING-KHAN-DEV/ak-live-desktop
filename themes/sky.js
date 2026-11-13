// themes/sky.js - Sky seen FROM ABOVE (like out of a plane window).
// Empty blue sky; every icon sits on a fluffy cloud top. Clouds are irregular lumpy masses.
// Icons that are close together share ONE bigger cloud. Birds are seen from above too, with
// their shadows on the haze below.
// Interaction: the mouse is a gust of wind - cloud puffs near it are pushed away and birds
// veer off. A cloud that just appeared (new / moved icon) puffs up with a ring of mist.
(function () {
  const { lerp, Flyers, nearPairs } = window.Kit;
  const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

  function puffsFor(r, seed) {
    const rng = window.mulberry32(seed);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const ax = r.w * 0.72 + 20, ay = r.h * 0.66 + 20;
    const list = [];
    list.push({ x: cx, y: cy, r: Math.max(r.w, r.h) * 0.62, ph: rng() * 6 });
    for (let i = 0; i < 9; i++) {
      const a = rng() * 6.283, d = Math.sqrt(rng()) * 0.7;
      list.push({ x: cx + Math.cos(a) * ax * d, y: cy + Math.sin(a) * ay * d, r: 24 + rng() * 22, ph: rng() * 6 });
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.283 + (rng() - 0.5) * 0.35, d = 0.82 + rng() * 0.32;
      list.push({ x: cx + Math.cos(a) * ax * d, y: cy + Math.sin(a) * ay * d, r: 12 + rng() * 20, ph: rng() * 6 });
    }
    return list;
  }

  function bridge(a, b, seed) {
    const rng = window.mulberry32(seed);
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
    const dist = Math.hypot(bx - ax, by - ay) || 1, n = Math.max(3, Math.round(dist / 20));
    const nx = -(by - ay) / dist, ny = (bx - ax) / dist, out = [];
    for (let i = 1; i < n; i++) {
      const t = i / n, off = (rng() - 0.5) * 30;
      out.push({ x: lerp(ax, bx, t) + nx * off, y: lerp(ay, by, t) + ny * off, r: 26 + rng() * 18, ph: rng() * 6 });
    }
    return out;
  }

  function drawBird(ctx, f, now, shadow) {
    const s = f.size, ph = now * 0.001 * f.rate + f.phase;
    const glide = Math.sin(now * 0.00025 + f.phase * 3) > 0.5;
    const open = glide ? 0.95 : 0.55 + 0.45 * Math.cos(ph);
    const sweep = glide ? 0.1 : 0.32 * (1 - Math.cos(ph)) / 2;
    ctx.save();
    ctx.translate(f.x + (shadow ? 10 + f.depth * 26 : 0), f.y + (shadow ? 16 + f.depth * 36 : 0));
    ctx.rotate(f.ang);
    if (shadow) ctx.globalAlpha = 0.17;
    ctx.fillStyle = shadow ? '#0d2a55' : '#1d2a40';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.18, side * s * 0.05);
      ctx.quadraticCurveTo(s * 0.12, side * s * 0.45 * open, s * (0.0 - sweep), side * s * 0.62 * open);
      ctx.quadraticCurveTo(-s * 0.18, side * s * 0.34 * open, -s * 0.34, side * s * 0.12);
      ctx.lineTo(-s * 0.08, side * s * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, 0, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.26, -s * 0.04); ctx.lineTo(-s * 0.52, -s * 0.12); ctx.lineTo(-s * 0.52, s * 0.12); ctx.lineTo(-s * 0.26, s * 0.04);
    ctx.closePath(); ctx.fill();
    if (!shadow) {
      ctx.strokeStyle = 'rgba(120,150,190,0.55)'; ctx.lineWidth = Math.max(0.6, s * 0.02);
      ctx.beginPath();
      for (const side of [-1, 1]) for (let k = 1; k <= 3; k++) {
        ctx.moveTo(s * 0.08 - k * s * 0.02, side * s * 0.1);
        ctx.lineTo(-s * 0.04 - k * s * 0.07 - sweep * s * 0.3, side * s * (0.28 + k * 0.1) * open);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  const SkyTheme = {
    id: 'sky',
    name: 'Sky from Above',
    itemName: 'clouds',
    spacing: 0,
    margin: 0,
    grow: { min: 1, max: 1, delay: 0 },
    shrink: 0.3,
    iconGrow: 1.7,
    animated: true,
    flock: null,

    prepare() {
      this.flock = new Flyers({ count: 14, size: [14, 46], speed: [30, 130], turn: 0.5, rate: [5, 9], draw() {} });
      this.flock.draw = function (ctx, now, w, h, eng) {
        if (!this.list.length) for (let i = 0; i < this.o.count; i++) this.list.push(this.spawn(w, h, true));
        const dt = this.last ? Math.min(0.06, (now - this.last) / 1000) : 0.016;
        this.last = now;
        const cu = eng && eng.cursor && eng.cursor.on ? eng.cursor : null;
        for (let i = 0; i < this.list.length; i++) {
          const f = this.list[i];
          f.ang += f.turn * dt * Math.sin(now * 0.0004 + f.phase);
          if (cu) {                                         // veer away from the mouse "wind"
            const dx = f.x - cu.sx, dy = f.y - cu.sy, d = Math.hypot(dx, dy);
            if (d < 220) {
              let da = Math.atan2(dy, dx) - f.ang;
              da = Math.atan2(Math.sin(da), Math.cos(da));
              f.ang += da * Math.min(1, dt * 3.5 * (1 - d / 220));
              f.boost = 1.9;
            }
          }
          f.boost = lerp(f.boost || 1, 1, Math.min(1, dt * 1.2));
          f.vx = Math.cos(f.ang) * f.sp * f.boost; f.vy = Math.sin(f.ang) * f.sp * f.boost;
          f.x += f.vx * dt; f.y += f.vy * dt;
          const m = f.size * 2 + 80;
          const out = f.x < -m || f.x > w + m || f.y < -m || f.y > h + m;
          if (out && (f.x - w / 2) * f.vx + (f.y - h / 2) * f.vy > 0) this.list[i] = this.spawn(w, h, false);
        }
        this.list.sort((a, b) => a.depth - b.depth);
        for (const f of this.list) drawBird(ctx, f, now, true);   // all shadows first
        for (const f of this.list) drawBird(ctx, f, now, false);
      };
    },
    makeItem() { return {}; },
    footprint() { return { halfW: 0, up: 0, down: 0 }; },
    drawItem() {},

    paintGround(ctx, w, h, rng) {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.1, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      g.addColorStop(0, '#5db4ee'); g.addColorStop(0.6, '#3a8fe0'); g.addColorStop(1, '#2468c0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const x = rng() * w, y = rng() * h, rx = 120 + rng() * 300, ry = 8 + rng() * 22;
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4 + rng() * 0.3); ctx.scale(1, ry / rx);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        rg.addColorStop(0, 'rgba(255,255,255,' + (0.05 + rng() * 0.08) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
      }
    },

    drawIcons(ctx, states, now, eng) {
      const cu = eng && eng.cursor && eng.cursor.on ? eng.cursor : null;
      const puffs = [];
      for (const st of states) {
        const r = st.rect, g = st.g, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const swell = 1 + 0.22 * Math.max(0, 1 - (now - st.born) / 1600) * Math.min(1, g);   // "puff up" when new
        for (const p of puffsFor(r, st.seed)) {
          puffs.push({ x: cx + (p.x - cx) * g, y: cy + (p.y - cy) * g, r: p.r * g * swell, ph: p.ph, g });
        }
      }
      for (const [i, j] of nearPairs(states, 70)) {            // merge close neighbours into one bigger cloud
        const a = states[i].rect, b = states[j].rect, gg = Math.min(states[i].g, states[j].g);
        const mx = (a.x + a.w / 2 + b.x + b.w / 2) / 2, my = (a.y + a.h / 2 + b.y + b.h / 2) / 2;
        for (const p of bridge(a, b, hash(states[i].seed, states[j].seed))) {
          puffs.push({ x: mx + (p.x - mx) * gg, y: my + (p.y - my) * gg, r: p.r * gg * 1.1, ph: p.ph, g: gg });
        }
      }
      const t = now * 0.001;
      const live = puffs.map((p) => {
        let x = p.x + Math.sin(t * 0.6 + p.ph) * 2.2, y = p.y + Math.cos(t * 0.5 + p.ph * 1.3) * 2.2;
        if (cu) {                                               // mouse wind pushes puffs sideways (soft)
          const dx = x - cu.sx, dy = y - cu.sy, d = Math.hypot(dx, dy) || 1, R = 170;
          if (d < R) { const k = Math.pow(1 - d / R, 2) * 26; x += (dx / d) * k; y += (dy / d) * k; }
        }
        return { x, y, r: p.r * (1 + 0.035 * Math.sin(t * 0.9 + p.ph * 2)) };
      });
      for (const p of live) {
        const g = ctx.createRadialGradient(p.x + 20, p.y + 30, p.r * 0.2, p.x + 20, p.y + 30, p.r * 1.3);
        g.addColorStop(0, 'rgba(20,60,130,0.26)'); g.addColorStop(1, 'rgba(20,60,130,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x + 20, p.y + 30, p.r * 1.3, 0, 6.283); ctx.fill();
      }
      for (const p of live) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.12);
        g.addColorStop(0, 'rgba(206,222,242,1)'); g.addColorStop(0.7, 'rgba(210,226,244,0.96)'); g.addColorStop(1, 'rgba(214,228,246,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.12, 0, 6.283); ctx.fill();
      }
      for (const p of live) {
        const lx = p.x - p.r * 0.2, ly = p.y - p.r * 0.26, lr = p.r * 0.78;
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.65, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 6.283); ctx.fill();
      }
    },

    drawOverlay(ctx, now, w, h, eng) { this.flock.draw(ctx, now, w, h, eng); },
  };

  window.SkyTheme = SkyTheme;
})();
