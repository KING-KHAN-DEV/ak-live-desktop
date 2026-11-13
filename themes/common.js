// themes/common.js - small helpers shared by all themes.
(function () {
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgb = (c, a) => (a === undefined
    ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
    : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')');
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // Pre-rendered sprite canvas (supersampled) with a ready 2d context.
  function sprite(W, H, S) {
    S = S || 2;
    const c = document.createElement('canvas');
    c.width = W * S; c.height = H * S;
    const x = c.getContext('2d');
    x.scale(S, S);
    return { c, x, W, H };
  }

  // Soft elliptical ground shadow.
  function shadow(x, cx, cy, rx, ry, a) {
    x.save();
    x.translate(cx, cy);
    x.scale(1, ry / rx);
    const g = x.createRadialGradient(0, 0, 1, 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,0,' + (a === undefined ? 0.4 : a) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(-rx, -rx, rx * 2, rx * 2);
    x.restore();
  }

  function poly(x, pts) {
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
    x.fill();
  }


  // Wobbly rounded-rectangle polygon around a rect (hand-drawn borders / clouds / patches).
  function blobPoints(r, pad, seed, g, wobble) {
    const rng = window.mulberry32(seed | 0);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const hw = (r.w / 2 + pad) * g, hh = (r.h / 2 + pad) * g;
    const n = 30, pts = [], wb = wobble === undefined ? 0.16 : wobble;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const k = Math.pow(Math.pow(Math.abs(ca), 4) + Math.pow(Math.abs(sa), 4), -0.25);
      const j = 1 + (rng() - 0.5) * wb;
      pts.push([cx + ca * hw * k * j, cy + sa * hh * k * j]);
    }
    return pts;
  }
  function smoothClosed(ctx, pts) {
    const n = pts.length;
    ctx.beginPath();
    ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }
  // Gap between two rects (0 when touching/overlapping).
  function rectGap(a, b) {
    const gx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
    const gy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
    return Math.hypot(gx, gy);
  }
  // Icons that are close together (gap < link px) are "linked": returns pairs [i, j].
  function nearPairs(states, link) {
    const out = [];
    for (let i = 0; i < states.length; i++) for (let j = i + 1; j < states.length; j++) {
      if (rectGap(states[i].rect, states[j].rect) < link) out.push([i, j]);
    }
    return out;
  }
  // Wobbly blobs for every icon PLUS bridge blobs between close neighbours. Drawn together
  // (stroke all, then fill all) they form ONE merged shape with ONE outline.
  function clusterBlobs(states, pad, link, wobble) {
    const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
    const blobs = [];
    for (const st of states) blobs.push(blobPoints(st.rect, pad, st.seed, st.g, wobble));
    for (const [i, j] of nearPairs(states, link)) {
      const a = states[i], b = states[j], g = Math.min(a.g, b.g);
      const ax = a.rect.x + a.rect.w / 2, ay = a.rect.y + a.rect.h / 2, bx = b.rect.x + b.rect.w / 2, by = b.rect.y + b.rect.h / 2;
      const d = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(d / 38));
      const sw = Math.min(a.rect.w, b.rect.w) * 0.8, sh = Math.min(a.rect.h, b.rect.h) * 0.8;
      for (let k = 1; k < n; k++) {
        const t = k / n, cx = lerp(ax, bx, t), cy = lerp(ay, by, t);
        blobs.push(blobPoints({ x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh }, pad, hash(a.seed, b.seed) + k, g, wobble));
      }
    }
    return blobs;
  }

  // Smooth value noise (for the map and for drifts).
  function makeNoise(seed) {
    const rng = window.mulberry32(seed);
    const N = 256, tab = new Float32Array(N * N);
    for (let i = 0; i < tab.length; i++) tab[i] = rng();
    const sm = (t) => t * t * (3 - 2 * t);
    const at = (i, j) => tab[((j & 255) << 8) | (i & 255)];
    function noise(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const fx = sm(x - xi), fy = sm(y - yi);
      return lerp(lerp(at(xi, yi), at(xi + 1, yi), fx), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), fx), fy);
    }
    return function fbm(x, y, oct) {
      let v = 0, a = 0.5, f = 1, n = 0;
      for (let o = 0; o < (oct || 4); o++) { v += noise(x * f, y * f) * a; n += a; a *= 0.5; f *= 2; }
      return v / n;
    };
  }

  // Creatures that cross the screen: spawn just outside an edge, fly through the
  // screen toward a random interior point, and respawn once they leave again.
  // opts: { count, size:[far,near], speed:[far,near], turn, draw(ctx, f, now) }
  class Flyers {
    constructor(opts) { this.o = opts; this.list = []; this.last = 0; }

    spawn(w, h, inside) {
      const o = this.o, depth = Math.random();
      const size = lerp(o.size[0], o.size[1], depth);
      const sp = lerp(o.speed[0], o.speed[1], depth);
      let x, y, ang;
      if (inside) {
        x = Math.random() * w; y = Math.random() * h; ang = Math.random() * Math.PI * 2;
      } else {
        const m = size * 2 + 60, e = Math.floor(Math.random() * 4);
        if (e === 0) { x = -m; y = Math.random() * h; }
        else if (e === 1) { x = w + m; y = Math.random() * h; }
        else if (e === 2) { x = Math.random() * w; y = -m; }
        else { x = Math.random() * w; y = h + m; }
        const tx = w * (0.15 + Math.random() * 0.7), ty = h * (0.15 + Math.random() * 0.7);
        ang = Math.atan2(ty - y, tx - x);
      }
      return { x, y, ang, sp, depth, size, phase: Math.random() * 100,
               turn: (Math.random() - 0.5) * (o.turn === undefined ? 0.5 : o.turn),
               rate: lerp(o.rate ? o.rate[0] : 6, o.rate ? o.rate[1] : 10, Math.random()),
               hue: Math.floor(Math.random() * 1000) };
    }

    draw(ctx, now, w, h, eng) {
      const o = this.o;
      if (!this.list.length) for (let i = 0; i < o.count; i++) this.list.push(this.spawn(w, h, true));
      const dt = this.last ? Math.min(0.06, (now - this.last) / 1000) : 0.016;
      this.last = now;
      for (let i = 0; i < this.list.length; i++) {
        const f = this.list[i];
        f.ang += f.turn * dt * Math.sin(now * 0.0004 + f.phase);
        if (o.steer) o.steer(f, dt, now, eng);            // optional interaction (cursor, icons...)
        f.vx = Math.cos(f.ang) * f.sp; f.vy = Math.sin(f.ang) * f.sp;
        f.x += f.vx * dt; f.y += f.vy * dt;
        const m = f.size * 2 + 60;
        const out = f.x < -m || f.x > w + m || f.y < -m || f.y > h + m;
        if (out && (f.x - w / 2) * f.vx + (f.y - h / 2) * f.vy > 0) this.list[i] = this.spawn(w, h, false);
      }
      this.list.sort((a, b) => a.depth - b.depth);
      for (const f of this.list) { ctx.save(); o.draw(ctx, f, now); ctx.restore(); }
    }
  }

  window.Kit = { lerp, rgb, mix, sprite, shadow, poly, makeNoise, Flyers, blobPoints, smoothClosed, rectGap, nearPairs, clusterBlobs };
})();
