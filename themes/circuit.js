// themes/circuit.js - A glowing circuit board seen from above.
// * Free space: chips, capacitors, resistors, LEDs, crystals, headers grow out of a green PCB.
// * Icons are SOCKETS: a bare board patch with a gold rim. Close icons share ONE socket.
// * Interaction: copper traces link the sockets and data pulses race along them (faster near the
//   mouse); the mouse is also a soft light that makes the board glow, and LEDs blink.
(function () {
  const { lerp, sprite, makeNoise, nearPairs } = window.Kit;
  const C = 80, MID = 40;
  const GOLD = 'rgba(232,190,90,';
  const J = (rng, a) => (rng() - 0.5) * a;
  const rrect = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };

  function chip(x, rng, n, pins) {                              // QFP / SOIC top view
    const w = n === 2 ? 28 + rng() * 10 : 40 + rng() * 14, h = n === 2 ? 40 + rng() * 12 : w, x0 = MID - w / 2, y0 = MID - h / 2;
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(x0 + 3, y0 + 3, w, h);
    x.fillStyle = '#c9ccd2';
    const pc = Math.floor(h / 5.2);
    for (let i = 0; i < pc; i++) { const py = y0 + 3 + i * ((h - 6) / pc); x.fillRect(x0 - 5, py, 6, 2.4); x.fillRect(x0 + w - 1, py, 6, 2.4); }
    if (n === 4) { const qc = Math.floor(w / 5.2); for (let i = 0; i < qc; i++) { const px = x0 + 3 + i * ((w - 6) / qc); x.fillRect(px, y0 - 5, 2.4, 6); x.fillRect(px, y0 + h - 1, 2.4, 6); } }
    const g = x.createLinearGradient(x0, y0, x0 + w, y0 + h); g.addColorStop(0, '#2a2f38'); g.addColorStop(1, '#101318');
    rrect(x, x0, y0, w, h, 2.5); x.fillStyle = g; x.fill(); x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 0.8; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.arc(x0 + 5, y0 + 5, 1.8, 0, 6.3); x.fill();
    x.fillStyle = 'rgba(210,215,225,0.55)'; for (let i = 0; i < 3; i++) x.fillRect(x0 + 8, y0 + h * 0.4 + i * 4.5, w * (0.3 + rng() * 0.4), 1.4);
  }
  function cap(x, rng) {                                       // electrolytic capacitor, top view
    const r = 11 + rng() * 6, c = rng() < 0.5 ? ['#2f5fa8', '#1d3b6d'] : ['#2b2b30', '#111114'];
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.arc(MID + 3, MID + 3, r, 0, 6.3); x.fill();
    const g = x.createRadialGradient(MID - r * 0.3, MID - r * 0.3, 1, MID, MID, r); g.addColorStop(0, '#d6d9de'); g.addColorStop(0.5, '#9ea4ad'); g.addColorStop(1, '#5d636c');
    x.fillStyle = g; x.beginPath(); x.arc(MID, MID, r, 0, 6.3); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(MID - r * 0.5, MID); x.lineTo(MID + r * 0.5, MID); x.moveTo(MID, MID - r * 0.5); x.lineTo(MID, MID + r * 0.5); x.stroke();
    x.beginPath(); x.arc(MID, MID, r - 0.5, -0.5, 0.9); x.lineWidth = 3; x.strokeStyle = c[0]; x.stroke();
  }
  function resistor(x, rng) {
    const w = 30 + rng() * 6, h = 10;
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(MID - w / 2 + 2, MID - h / 2 + 2, w, h);
    x.fillStyle = '#b9bcc4'; x.fillRect(MID - w / 2 - 5, MID - 1.6, 6, 3.2); x.fillRect(MID + w / 2 - 1, MID - 1.6, 6, 3.2);
    rrect(x, MID - w / 2, MID - h / 2, w, h, 4); x.fillStyle = rng() < 0.5 ? '#d9c49a' : '#6fa7c9'; x.fill();
    const cols = ['#7a3b12', '#c0392b', '#e0a020', '#2d8a4b', '#2b5fb5', '#6b2fa0'];
    for (let i = 0; i < 3; i++) { x.fillStyle = cols[Math.floor(rng() * cols.length)]; x.fillRect(MID - w / 2 + 7 + i * 5, MID - h / 2, 2.4, h); }
    x.fillStyle = '#c8a24a'; x.fillRect(MID + w / 2 - 6, MID - h / 2, 2.4, h);
  }
  function led(x, rng, col) {
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(MID - 8, MID - 5, 18, 12);
    rrect(x, MID - 9, MID - 6, 18, 12, 3); x.fillStyle = col; x.fill();
    x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(MID - 5, MID - 4, 6, 2);
  }
  function crystal(x, rng) {
    rrect(x, MID - 14, MID - 6, 28, 12, 6); const g = x.createLinearGradient(0, MID - 6, 0, MID + 6); g.addColorStop(0, '#e6e8ec'); g.addColorStop(1, '#8c929c'); x.fillStyle = g; x.fill(); x.strokeStyle = 'rgba(0,0,0,0.4)'; x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.font = '6px monospace'; x.textAlign = 'center'; x.fillText((8 + Math.floor(rng() * 40)) + '.000', MID, MID + 2);
  }
  function header(x, rng) {
    const n = 4 + Math.floor(rng() * 3), w = n * 7 + 6;
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(MID - w / 2 + 2, MID - 8 + 2, w, 16);
    x.fillStyle = '#17191e'; x.fillRect(MID - w / 2, MID - 8, w, 16);
    for (let i = 0; i < n; i++) for (const dy of [-3.5, 3.5]) { x.fillStyle = GOLD + '1)'; x.fillRect(MID - w / 2 + 5 + i * 7 - 1.7, MID + dy - 1.7, 3.4, 3.4); }
  }
  function inductor(x, rng) {
    const r = 12;
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.arc(MID + 3, MID + 3, r, 0, 6.3); x.fill();
    x.fillStyle = '#2a2d35'; x.beginPath(); x.arc(MID, MID, r, 0, 6.3); x.fill();
    x.strokeStyle = 'rgba(214,152,70,0.95)'; x.lineWidth = 1.6; for (let k = r - 2; k > 2; k -= 2.6) { x.beginPath(); x.arc(MID, MID, k, 0, 6.3); x.stroke(); }
  }
  function vias(x, rng) {
    for (let i = 0; i < 5; i++) { const px = MID + J(rng, 30), py = MID + J(rng, 22); x.fillStyle = GOLD + '0.95)'; x.beginPath(); x.arc(px, py, 4, 0, 6.3); x.fill(); x.fillStyle = '#0a1f18'; x.beginPath(); x.arc(px, py, 1.6, 0, 6.3); x.fill(); }
  }
  function mk(n, fn, seed) { const out = []; for (let i = 0; i < n; i++) { const sp = sprite(C, C, 2); sp.x.lineCap = 'round'; fn(sp.x, window.mulberry32(seed + i * 131), i); out.push(sp.c); } return out; }

  const CircuitTheme = {
    id: 'circuit',
    name: 'Circuit Board',
    itemName: 'components',
    spacing: 58,
    margin: 22,
    grow: { min: 0.8, max: 1.5, delay: 1.2 },
    shrink: 0.25,
    iconGrow: 0.9,
    animated: true,
    iconsOnTop: true,
    sprites: null, clean: null, route: [], pulses: [],

    prepare() {
      if (this.sprites) return;
      this.sprites = {
        qfp: mk(5, (x, r) => chip(x, r, 4), 11), soic: mk(4, (x, r) => chip(x, r, 2), 21), cap: mk(4, cap, 31), res: mk(5, resistor, 41),
        led: mk(3, (x, r, i) => led(x, r, ['#ff4d4d', '#4dff88', '#ffd24d'][i]), 51), xtal: mk(2, crystal, 61), head: mk(3, header, 71), ind: mk(2, inductor, 81), via: mk(3, vias, 91),
      };
    },
    makeItem(rng) {
      const r = rng(), S = this.sprites;
      const kind = r < 0.2 ? 'qfp' : r < 0.34 ? 'soic' : r < 0.46 ? 'cap' : r < 0.62 ? 'res' : r < 0.7 ? 'led' : r < 0.76 ? 'xtal' : r < 0.84 ? 'head' : r < 0.9 ? 'ind' : 'via';
      const turn = [0, 1, 2, 3][Math.floor(rng() * 4)];
      return { kind, v: Math.floor(rng() * S[kind].length), turn: kind === 'qfp' || kind === 'cap' || kind === 'ind' || kind === 'via' ? 0 : turn, scale: 0.95 + rng() * 0.35 };
    },
    footprint(it) { const r = { qfp: 34, soic: 30, cap: 20, res: 22, led: 14, xtal: 18, head: 24, ind: 18, via: 28 }[it.kind]; return { halfW: r * it.scale, up: r * it.scale, down: r * it.scale }; },
    drawItem(ctx, it, g) {
      const c = this.sprites[it.kind][it.v], k = it.scale * g;
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.turn * Math.PI / 2);
      ctx.drawImage(c, -MID * k, -MID * k, C * k, C * k); ctx.restore();
      if (it.kind === 'led') {                                  // blinking glow
        const t = performance.now() * 0.001, b = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.7 + it.x * 0.13));
        const col = ['255,80,80', '80,255,140', '255,215,80'][it.v];
        const gr = ctx.createRadialGradient(it.x, it.y, 1, it.x, it.y, 26 * k);
        gr.addColorStop(0, 'rgba(' + col + ',' + (0.55 * b * g) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = gr; ctx.fillRect(it.x - 30 * k, it.y - 30 * k, 60 * k, 60 * k);
      }
    },

    paintGround(ctx, w, h, rng) {
      const n = makeNoise(5), pw = Math.ceil(w / 2), ph = Math.ceil(h / 2);
      const pc = document.createElement('canvas'); pc.width = pw; pc.height = ph;
      const px = pc.getContext('2d'), img = px.createImageData(pw, ph), d = img.data;
      for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
        const v = n(i * 2 / 160, j * 2 / 160, 3), k = (j * pw + i) * 4;
        d[k] = 8 + v * 10; d[k + 1] = 52 + v * 26; d[k + 2] = 40 + v * 18; d[k + 3] = 255;
      }
      px.putImageData(img, 0, 0); ctx.drawImage(pc, 0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.025)'; for (let y = 0; y < h; y += 20) ctx.fillRect(0, y, w, 1);   // faint fab grid
      for (let x = 0; x < w; x += 20) ctx.fillRect(x, 0, 1, h);
      this.clean = document.createElement('canvas'); this.clean.width = ctx.canvas.width; this.clean.height = ctx.canvas.height;
      this.clean.getContext('2d').drawImage(ctx.canvas, 0, 0);
      // copper traces: buses of parallel lines with 45-degree bends
      const bus = (x0, y0, steps, nLines) => {
        for (let l = 0; l < nLines; l++) {
          let x = x0 + l * 7, y = y0 + l * 7, dx = 1, dy = 0;
          ctx.beginPath(); ctx.moveTo(x, y);
          const rr = window.mulberry32(Math.floor(x0 * 3 + y0 + 1));
          for (let s = 0; s < steps; s++) {
            const len = 60 + rr() * 120; x += dx * len; y += dy * len; ctx.lineTo(x, y);
            const t = Math.floor(rr() * 3); if (t === 0) { dx = 1; dy = 0; } else if (t === 1) { dx = 0.7071; dy = 0.7071; } else { dx = 0.7071; dy = -0.7071; }
          }
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 5.5; ctx.lineJoin = 'round'; ctx.stroke();
          ctx.strokeStyle = 'rgba(214,160,76,0.72)'; ctx.lineWidth = 3; ctx.stroke();
          ctx.strokeStyle = 'rgba(255,225,160,0.35)'; ctx.lineWidth = 0.9; ctx.stroke();
          ctx.fillStyle = GOLD + '0.9)'; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 6.3); ctx.fill(); ctx.fillStyle = '#0a1f18'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.3); ctx.fill();
        }
      };
      for (let i = 0; i < 18; i++) bus(rng() * w * 0.9 - 40, rng() * h, 4 + Math.floor(rng() * 3), 2 + Math.floor(rng() * 4));
      for (const [cx, cy] of [[30, 30], [w - 30, 30], [30, h - 30], [w - 30, h - 30]]) {      // mounting holes
        ctx.fillStyle = GOLD + '0.9)'; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 6.3); ctx.fill(); ctx.fillStyle = '#06140f'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 6.3); ctx.fill();
      }
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.8);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    },

    // sockets (one per icon / merged group) + traces with data pulses between them
    drawIcons(ctx, states, now, eng) {
      const pad = 14, rects = [];
      for (const st of states) {
        const r = st.rect, g = st.g, cx = r.x + r.w / 2, cy = r.y + r.h / 2, hw = (r.w / 2 + pad) * g, hh = (r.h / 2 + pad) * g;
        rects.push([cx - hw, cy - hh, hw * 2, hh * 2]);
      }
      for (const [i, j] of nearPairs(states, 70)) {            // bridge between close icons (axis-aligned, so the union is clean)
        const a = states[i], b = states[j], g = Math.min(a.g, b.g), ar = a.rect, br = b.rect;
        const ox0 = Math.max(ar.x, br.x), ox1 = Math.min(ar.x + ar.w, br.x + br.w), oy0 = Math.max(ar.y, br.y), oy1 = Math.min(ar.y + ar.h, br.y + br.h);
        if (ox1 > ox0) { const y0 = Math.min(ar.y + ar.h, br.y + br.h), y1 = Math.max(ar.y, br.y); const top = Math.min(y0, y1), bot = Math.max(y0, y1); rects.push([ox0 - pad * g, top - pad * g, (ox1 - ox0) + pad * 2 * g, bot - top + pad * 2 * g]); }
        else if (oy1 > oy0) { const x0 = Math.min(ar.x + ar.w, br.x + br.w), x1 = Math.max(ar.x, br.x); const l = Math.min(x0, x1), rr = Math.max(x0, x1); rects.push([l - pad * g, oy0 - pad * g, rr - l + pad * 2 * g, (oy1 - oy0) + pad * 2 * g]); }
      }
      // clusters -> trace routes
      const par = states.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
      for (const [i, j] of nearPairs(states, 70)) par[find(i)] = find(j);
      const cl = {};
      states.forEach((st, i) => { const r = find(i), c = cl[r] || (cl[r] = { x: 0, y: 0, n: 0, g: 1 }); c.x += st.rect.x + st.rect.w / 2; c.y += st.rect.y + st.rect.h / 2; c.n++; c.g = Math.min(c.g, st.g); });
      const cs = Object.values(cl).map((c) => ({ x: c.x / c.n, y: c.y / c.n, g: c.g }));
      const cu = eng && eng.cursor && eng.cursor.on ? eng.cursor : null, seen = new Set(), routes = [];
      cs.forEach((a, i) => {
        let best = -1, bd = 1e9; cs.forEach((b, j) => { if (i !== j) { const dd = Math.hypot(a.x - b.x, a.y - b.y); if (dd < bd) { bd = dd; best = j; } } });
        const key = Math.min(i, best) + '-' + Math.max(i, best); if (best < 0 || seen.has(key) || bd > 800) return; seen.add(key);
        const b = cs[best], dx = b.x - a.x, dy = b.y - a.y, sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1, ax = Math.abs(dx), ay = Math.abs(dy);
        let pts;
        if (ax >= ay) { const p1 = [a.x + sx * (ax - ay) / 2, a.y], p2 = [p1[0] + sx * ay, b.y]; pts = [[a.x, a.y], p1, p2, [b.x, b.y]]; }
        else { const p1 = [a.x, a.y + sy * (ay - ax) / 2], p2 = [b.x, p1[1] + sy * ax]; pts = [[a.x, a.y], p1, p2, [b.x, b.y]]; }
        routes.push({ pts, g: Math.min(a.g, b.g), key: i * 31 + best });
      });
      const at = (pts, t) => {                                   // point at fraction t along a polyline
        const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
        let d = t * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const u = seg[i] ? d / seg[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)]; } d -= seg[i]; }
        return pts[0];
      };
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const rt of routes) {
        const pts = rt.pts.map((p) => [lerp(rt.pts[0][0], p[0], rt.g), lerp(rt.pts[0][1], p[1], rt.g)]);
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = 'rgba(214,160,76,0.9)'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = 'rgba(255,230,170,0.45)'; ctx.lineWidth = 1; ctx.stroke();
        const mid = at(pts, 0.5), boost = cu && Math.hypot(cu.sx - mid[0], cu.sy - mid[1]) < 260 ? 2.6 : 1;
        for (let k = 0; k < 3; k++) {                            // data pulses
          const t = ((now * 0.00018 * boost + k / 3 + rt.key * 0.37) % 1), p = at(pts, t);
          const gr = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 16); gr.addColorStop(0, 'rgba(120,255,240,0.95)'); gr.addColorStop(0.3, 'rgba(60,220,255,0.5)'); gr.addColorStop(1, 'rgba(60,220,255,0)');
          ctx.fillStyle = gr; ctx.fillRect(p[0] - 16, p[1] - 16, 32, 32);
        }
      }
      // sockets: gold rim (dilated silhouette) then clean bare board inside
      ctx.fillStyle = GOLD + '1)'; ctx.strokeStyle = GOLD + '1)'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,200,80,0.5)'; ctx.shadowBlur = 14;
      ctx.beginPath(); for (const r of rects) ctx.rect(r[0], r[1], r[2], r[3]); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.save(); ctx.beginPath(); for (const r of rects) ctx.rect(r[0], r[1], r[2], r[3]); ctx.clip();
      if (this.clean) ctx.drawImage(this.clean, 0, 0, eng.w, eng.h);
      ctx.strokeStyle = 'rgba(232,190,90,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
      for (const r of rects) ctx.strokeRect(r[0] + 6, r[1] + 6, r[2] - 12, r[3] - 12);
      ctx.restore(); ctx.restore();
    },

    // the mouse is a soft light on the board
    drawOverlay(ctx, now, w, h, eng) {
      const c = eng.cursor; if (!c || !c.on) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(c.sx, c.sy, 0, c.sx, c.sy, 190);
      g.addColorStop(0, 'rgba(90,255,200,0.16)'); g.addColorStop(0.5, 'rgba(60,200,170,0.07)'); g.addColorStop(1, 'rgba(60,200,170,0)');
      ctx.fillStyle = g; ctx.fillRect(c.sx - 190, c.sy - 190, 380, 380);
      const rr = (now * 0.06) % 60 + 10; ctx.strokeStyle = 'rgba(120,255,220,' + (0.22 * (1 - rr / 70)).toFixed(3) + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(c.sx, c.sy, rr, 0, 6.3); ctx.stroke(); ctx.restore();
    },
  };

  window.CircuitTheme = CircuitTheme;
})();
