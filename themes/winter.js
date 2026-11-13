// themes/winter.js - Snowy night-before-Christmas field. Snowy pines, bare trees and
// snowmen grow in free space; each icon gets a warm lantern glow on the snow.
// Soft snowflakes fall all the time.
(function () {
  const { rgb, mix, lerp, sprite, shadow, poly } = window.Kit;
  const W = 200, H = 260, BX = 100, BY = 240, DESIGN_H = 230;

  function makePine(rng) {
    const { c, x } = sprite(W, H, 2);
    shadow(x, BX + 4, BY, 62, 14, 0.25);
    x.fillStyle = '#4a3322'; x.fillRect(BX - 5, 205, 10, 36);
    const tiers = [[214, 148, 66], [174, 106, 55], [134, 66, 45], [98, 20, 33]];
    const tint = rng() * 0.3;
    for (const [by, ty, hw] of tiers) {
      const j = (rng() - 0.5) * 4;
      x.fillStyle = rgb(mix([30, 86, 66], [60, 120, 90], tint));
      poly(x, [[BX + j, ty], [BX - hw, by], [BX, by + 7]]);
      x.fillStyle = rgb(mix([18, 62, 50], [40, 92, 70], tint));
      poly(x, [[BX + j, ty], [BX, by + 7], [BX + hw, by]]);
      // snow cap with scalloped hem
      x.fillStyle = '#f6fbff';
      x.beginPath();
      const capH = (by - ty) * 0.52, cw = hw * (capH / (by - ty));
      x.moveTo(BX + j, ty);
      x.lineTo(BX + j - cw, ty + capH);
      for (let k = 0; k <= 4; k++) x.quadraticCurveTo(BX + j - cw + (k + 0.5) * (cw * 2 / 5), ty + capH + 9, BX + j - cw + (k + 1) * (cw * 2 / 5), ty + capH - 1);
      x.closePath(); x.fill();
      x.fillStyle = 'rgba(160,190,225,0.5)';
      poly(x, [[BX + j, ty], [BX + j + cw, ty + capH], [BX + j + 2, ty + capH * 0.6]]);
    }
    return c;
  }
  function makeBare(rng) {
    const { c, x } = sprite(W, H, 2);
    shadow(x, BX + 4, BY, 44, 10, 0.25);
    x.lineCap = 'round';
    const branch = (px, py, ang, len, wd, d) => {
      const nx = px + Math.cos(ang) * len, ny = py + Math.sin(ang) * len;
      x.strokeStyle = '#4a3d38'; x.lineWidth = wd;
      x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      x.strokeStyle = 'rgba(250,252,255,0.9)'; x.lineWidth = Math.max(1, wd * 0.35);   // snow on top
      x.beginPath(); x.moveTo(px, py - wd * 0.3); x.lineTo(nx, ny - wd * 0.3); x.stroke();
      if (d > 0) {
        branch(nx, ny, ang - 0.4 - rng() * 0.35, len * 0.74, wd * 0.7, d - 1);
        branch(nx, ny, ang + 0.4 + rng() * 0.35, len * 0.74, wd * 0.7, d - 1);
      }
    };
    branch(BX, BY, -Math.PI / 2, 62, 11, 4);
    return c;
  }
  function makeSnowman(rng) {
    const { c, x } = sprite(W, H, 2);
    shadow(x, BX + 6, BY, 50, 11, 0.28);
    const ball = (cy, r) => {
      const g = x.createLinearGradient(BX - r, cy - r, BX + r, cy + r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bcd0e6');
      x.fillStyle = g; x.beginPath(); x.arc(BX, cy, r, 0, 6.28); x.fill();
    };
    ball(BY - 36, 38); ball(BY - 92, 28); ball(BY - 132, 20);
    x.fillStyle = '#2a2a33';
    x.beginPath(); x.arc(BX - 7, BY - 135, 2.6, 0, 6.28); x.arc(BX + 7, BY - 135, 2.6, 0, 6.28); x.fill();
    for (const yy of [BY - 98, BY - 86, BY - 74]) { x.beginPath(); x.arc(BX, yy, 2.8, 0, 6.28); x.fill(); }
    x.fillStyle = '#f08a24';
    poly(x, [[BX, BY - 130], [BX + 20, BY - 126], [BX, BY - 124]]);
    const sc = ['#d03a3a', '#2f7bd8', '#3aa860'][Math.floor(rng() * 3)];
    x.fillStyle = sc; x.fillRect(BX - 22, BY - 113, 44, 8);
    x.fillRect(BX + 8, BY - 108, 9, 24);
    x.fillStyle = '#2a2a33';                                  // top hat
    x.fillRect(BX - 20, BY - 150, 40, 5); x.fillRect(BX - 12, BY - 172, 24, 24);
    x.strokeStyle = '#5a3d22'; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(BX - 28, BY - 90); x.lineTo(BX - 56, BY - 110); x.moveTo(BX + 28, BY - 90); x.lineTo(BX + 56, BY - 108); x.stroke();
    return c;
  }
  function makeRock(rng) {
    const { c, x } = sprite(W, H, 2);
    shadow(x, BX, BY, 40, 8, 0.3);
    x.fillStyle = '#7b8594';
    x.beginPath(); x.moveTo(BX - 30, BY); x.quadraticCurveTo(BX - 34, BY - 26, BX - 6, BY - 32); x.quadraticCurveTo(BX + 30, BY - 30, BX + 32, BY); x.fill();
    x.fillStyle = '#f6fbff';
    x.beginPath(); x.moveTo(BX - 28, BY - 12); x.quadraticCurveTo(BX - 24, BY - 30, BX - 6, BY - 33); x.quadraticCurveTo(BX + 26, BY - 32, BX + 30, BY - 12);
    for (let k = 0; k < 5; k++) x.quadraticCurveTo(BX + 24 - k * 12, BY - 6, BX + 18 - k * 12, BY - 13);
    x.fill();
    return c;
  }

  const WinterTheme = {
    id: 'winter',
    name: 'Snowy Winter',
    itemName: 'trees & snowmen',
    spacing: 52,
    margin: 14,
    grow: { min: 1.3, max: 2.2, delay: 1.1 },
    shrink: 0.35,
    iconGrow: 1.4,
    animated: true,
    sprites: null,
    flakes: null,

    prepare() {
      if (!this.sprites) {
        const mk = (fn, n, base) => Array.from({ length: n }, (_, v) => fn(window.mulberry32(base + v)));
        this.sprites = { p: mk(makePine, 8, 1), b: mk(makeBare, 4, 30), s: mk(makeSnowman, 3, 60), r: mk(makeRock, 3, 90) };
      }
    },

    makeItem(rng) {
      const r = rng();
      const type = r < 0.62 ? 'p' : r < 0.74 ? 'b' : r < 0.82 ? 's' : 'r';
      return { type, variant: Math.floor(rng() * 8), size: type === 'r' ? 40 + rng() * 30 : type === 's' ? 70 + rng() * 26 : 76 + rng() * 48 };
    },
    footprint(it) { return { halfW: it.size * (it.type === 'p' ? 0.28 : 0.24), up: it.size * 0.9, down: it.size * 0.04 }; },

    paintGround(ctx, w, h, rng) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#b6cde6'); g.addColorStop(1, '#e9f2fb');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {                          // wind-blown drifts: long shaded ellipses
        const x = rng() * w, y = rng() * h, rx = 160 + rng() * 280, ry = 24 + rng() * 40;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(-0.08 + rng() * 0.16); ctx.scale(1, ry / rx);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        const hi = rng() < 0.5;
        rg.addColorStop(0, hi ? 'rgba(255,255,255,0.55)' : 'rgba(120,150,190,0.22)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
      }
      for (let i = 0; i < Math.round((w * h) / 4000); i++) {  // glittering sparkles
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + rng() * 0.5) + ')';
        ctx.fillRect(rng() * w, rng() * h, 1.5, 1.5);
      }
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,70,120,0.28)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    },

    // Warm lantern light pooled on the snow under each icon.
    drawIcon(ctx, r, g, seed, now) {
      const cx = r.x + r.w / 2, cy = r.y + r.h * 0.6, R = Math.max(r.w, r.h) * 1.05;
      ctx.translate(cx, cy); ctx.scale(g, g);
      const flick = 0.9 + 0.1 * Math.sin(now * 0.006 + seed) * Math.sin(now * 0.0023 + seed);
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, R * 1.3);
      glow.addColorStop(0, 'rgba(255,214,130,' + 0.85 * flick + ')');
      glow.addColorStop(0.45, 'rgba(255,190,100,' + 0.38 * flick + ')');
      glow.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.ellipse(0, 0, R * 1.3, R * 0.95, 0, 0, Math.PI * 2); ctx.fill();
    },

    drawItem(ctx, it, g) {
      const sp = this.sprites[it.type][it.variant % this.sprites[it.type].length];
      const k = (it.size / DESIGN_H) * g;
      ctx.drawImage(sp, it.x - BX * k, it.y - BY * k, W * k, H * k);
    },

    drawOverlay(ctx, now, w, h) {
      if (!this.flakes || this.flakes.w !== w) {
        const n = Math.round((w * h) / 9000);
        this.flakes = { w, last: now, list: Array.from({ length: n }, () => ({
          x: Math.random() * w, y: Math.random() * h, d: Math.random(), p: Math.random() * 100 })) };
      }
      const dt = Math.min(0.06, (now - this.flakes.last) / 1000); this.flakes.last = now;
      for (const f of this.flakes.list) {
        f.y += (22 + f.d * 70) * dt;
        f.x += Math.sin(now * 0.0008 + f.p) * 18 * dt + 8 * dt;
        if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
        if (f.x > w + 10) f.x = -10;
        const s = 1 + f.d * 2.6;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + f.d * 0.4) + ')';
        if (f.d < 0.7) ctx.fillRect(f.x, f.y, s, s);
        else {                                                // big flakes: tiny six-armed stars
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let a = 0; a < 3; a++) {
            const an = a * Math.PI / 3 + now * 0.0004 + f.p;
            ctx.moveTo(f.x - Math.cos(an) * s * 1.6, f.y - Math.sin(an) * s * 1.6);
            ctx.lineTo(f.x + Math.cos(an) * s * 1.6, f.y + Math.sin(an) * s * 1.6);
          }
          ctx.stroke();
        }
      }
    },
  };

  window.WinterTheme = WinterTheme;
})();
