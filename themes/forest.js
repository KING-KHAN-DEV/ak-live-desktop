// themes/forest.js - the Forest theme. Visuals only; the engine does everything else.
// Trees are pre-rendered once into small sprite canvases, then just scaled while growing.
(function () {
  const SCALE = 2;                       // sprite supersampling
  const W = 200, H = 260;                // sprite design size
  const BASE_X = 100, BASE_Y = 240;      // where the trunk touches the ground
  const DESIGN_H = 230;                  // tree height (base to tip) in design units

  // [dark, mid, light] per palette
  const PALETTES = [
    [[22, 66, 36], [44, 122, 64], [110, 184, 96]],
    [[18, 56, 40], [36, 104, 60], [92, 160, 92]],
    [[38, 84, 38], [66, 138, 58], [132, 194, 92]],
    [[20, 72, 60], [40, 120, 92], [96, 176, 140]],
    [[52, 84, 40], [88, 134, 48], [158, 202, 86]],
  ];
  const VARIANTS = 10;

  const rgb = (c, a) => (a === undefined
    ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
    : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')');
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  function newSprite() {
    const c = document.createElement('canvas');
    c.width = W * SCALE;
    c.height = H * SCALE;
    const x = c.getContext('2d');
    x.scale(SCALE, SCALE);
    return { c, x };
  }

  function shadow(x) {
    x.save();
    x.translate(BASE_X + 4, BASE_Y);
    x.scale(1, 0.22);
    const g = x.createRadialGradient(0, 0, 2, 0, 0, 68);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(-72, -72, 144, 144);
    x.restore();
  }

  function trunk(x, xl, xr, yb, yt) {
    const g = x.createLinearGradient(xl, 0, xr, 0);
    g.addColorStop(0, '#6b4a2b');
    g.addColorStop(1, '#38250f');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(xl - 2, yb); x.lineTo(xl, yt); x.lineTo(xr, yt); x.lineTo(xr + 2, yb);
    x.closePath();
    x.fill();
  }

  // Leafy foliage clump: an irregular, scalloped outline filled with a flat
  // light-to-dark gradient, then covered in tiny pointed leaves.
  // (The old version used smooth radial-gradient circles plus translucent
  // highlight discs, which read as glossy bubbles.)
  function blob(x, cx, cy, r, pal, rng) {
    const n = 15, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.84 + rng() * 0.26);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.94]);
    }
    const path = () => {
      x.beginPath();
      const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
      x.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        x.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      x.closePath();
    };
    const g = x.createLinearGradient(cx - r * 0.6, cy - r * 0.8, cx + r * 0.6, cy + r * 0.9);
    g.addColorStop(0, rgb(mix(pal[1], pal[2], 0.35)));
    g.addColorStop(0.55, rgb(pal[1]));
    g.addColorStop(1, rgb(mix(pal[0], [0, 0, 0], 0.15)));
    x.fillStyle = g;
    path();
    x.fill();

    x.save();
    path();
    x.clip();
    const leaf = (lx, ly, ang, len, col) => {
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(lx, ly);
      x.quadraticCurveTo(lx + Math.cos(ang - 0.5) * len * 0.6, ly + Math.sin(ang - 0.5) * len * 0.6,
        lx + Math.cos(ang) * len, ly + Math.sin(ang) * len);
      x.quadraticCurveTo(lx + Math.cos(ang + 0.5) * len * 0.6, ly + Math.sin(ang + 0.5) * len * 0.6, lx, ly);
      x.fill();
    };
    for (let i = 0; i < 46; i++) {          // lit leaves, upper-left side
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r * 0.9;
      const lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d;
      const lit = (cx - lx) * 0.5 + (cy - ly) * 0.8;
      if (lit > -r * 0.1) leaf(lx, ly, -1 + rng() * 2.4 - 0.7, 5 + rng() * 5, rgb(pal[2], 0.55));
    }
    for (let i = 0; i < 40; i++) {          // shaded leaves, lower-right side
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r * 0.9;
      const lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d;
      const lit = (cx - lx) * 0.5 + (cy - ly) * 0.8;
      if (lit < r * 0.1) leaf(lx, ly, 0.4 + rng() * 2, 5 + rng() * 5, rgb(pal[0], 0.5));
    }
    x.restore();
  }

  function poly(x, pts) {
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
    x.fill();
  }

  function makeRound(pal, rng) {
    const { c, x } = newSprite();
    shadow(x);
    trunk(x, 93, 107, 240, 165);
    const canopy = [[100, 112, 58], [64, 138, 44], [136, 138, 44], [100, 152, 48],
                    [76, 86, 38], [124, 86, 38], [100, 60, 33]];
    for (const [cx, cy, r] of canopy) {
      blob(x, cx + (rng() - 0.5) * 10, cy + (rng() - 0.5) * 8, r * (0.92 + rng() * 0.16), pal, rng);
    }
    return c;
  }

  function makePine(pal, rng) {
    const { c, x } = newSprite();
    shadow(x);
    x.fillStyle = '#4a3220';
    x.fillRect(95, 200, 10, 40);
    const tiers = [[214, 146, 64], [174, 104, 54], [134, 64, 44], [96, 18, 32]]; // baseY, topY, halfWidth
    for (const [by, ty, hw] of tiers) {
      const j = (rng() - 0.5) * 4;
      x.fillStyle = rgb(pal[1]);
      poly(x, [[100 + j, ty], [100 - hw, by], [100, by + 7]]);
      x.fillStyle = rgb(mix(pal[0], pal[1], 0.15));
      poly(x, [[100 + j, ty], [100, by + 7], [100 + hw, by]]);
      x.strokeStyle = rgb(pal[2], 0.45);
      x.lineWidth = 1.6;
      x.beginPath();
      x.moveTo(100 + j, ty + 1);
      x.lineTo(100 - hw + 1, by);
      x.stroke();
    }
    return c;
  }

  const ForestTheme = {
    id: 'forest',
    name: 'Forest',
    itemName: 'trees',
    spacing: 44,
    margin: 14,
    grow: { min: 1.4, max: 2.0, delay: 0.9 },   // growth finishes within ~3 s
    shrink: 0.35,
    sprites: null,

    prepare() {
      if (this.sprites) return;
      const round = [], pine = [];
      for (let v = 0; v < VARIANTS; v++) {
        round.push(makeRound(PALETTES[v % PALETTES.length], window.mulberry32(100 + v)));
        pine.push(makePine(PALETTES[(v + 2) % PALETTES.length], window.mulberry32(500 + v)));
      }
      this.sprites = { round, pine };
    },

    makeItem(rng) {
      return {
        type: rng() < 0.55 ? 'round' : 'pine',
        variant: Math.floor(rng() * VARIANTS),
        size: 78 + rng() * 44,
      };
    },

    footprint(it) {
      const s = it.size;
      return { halfW: s * (it.type === 'round' ? 0.33 : 0.27), up: s * 0.94, down: s * 0.04 };
    },

    paintGround(ctx, w, h, rng) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#21452a');
      g.addColorStop(1, '#14291b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 70; i++) {           // very soft, wide light / dark washes
        const x = rng() * w, y = rng() * h, r = 140 + rng() * 260;
        const light = rng() < 0.5;
        const c = light ? '96,160,80' : '8,24,14';
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, 'rgba(' + c + ',' + (light ? 0.06 : 0.10) + ')');
        rg.addColorStop(1, 'rgba(' + c + ',0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      const n = Math.round((w * h) / 1200);     // tiny grass blades
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      for (const col of ['rgba(110,180,90,0.22)', 'rgba(60,120,60,0.25)', 'rgba(20,50,30,0.30)']) {
        ctx.strokeStyle = col;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = rng() * w, y = rng() * h, l = 4 + rng() * 8;
          const a = -Math.PI / 2 + (rng() - 0.5) * 0.9;
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        }
        ctx.stroke();
      }

      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    },

    drawItem(ctx, it, g) {
      const sprite = this.sprites[it.type][it.variant];
      const k = (it.size / DESIGN_H) * g;       // grows from the ground up
      ctx.drawImage(sprite, it.x - BASE_X * k, it.y - BASE_Y * k, W * k, H * k);
    },
  };

  window.ForestTheme = ForestTheme;
})();
