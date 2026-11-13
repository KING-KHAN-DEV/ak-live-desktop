// themes/city.js - A child's pencil drawing of a town: wobbly houses, lollipop trees, suns, cars.
// Everything is drawn with graphite lines (double strokes, overshooting corners) and coloured
// pencil scribble fills on plain paper. Under icons the paper is EMPTY (erased), framed by one
// sketchy pencil loop - close icons share ONE loop.
// Interaction: the mouse is a pencil - it leaves a graphite scribble that slowly fades away.
(function () {
  const { lerp, sprite, makeNoise, clusterBlobs, Flyers } = window.Kit;
  const PAPER = '#f7f2e4';
  const J = (rng, a) => (rng() - 0.5) * a;
  const WALLS = [[250, 222, 130], [244, 186, 168], [182, 212, 240], [196, 232, 196], [238, 204, 228], [255, 238, 190], [230, 200, 150]];
  const ROOFS = [[206, 66, 52], [196, 108, 48], [64, 108, 172], [122, 78, 142], [58, 130, 88], [150, 70, 60]];
  const GREENS = [[70, 160, 70], [100, 180, 70], [50, 140, 90]];
  const pick = (rng, a) => a[Math.floor(rng() * a.length)];

  // ---- pencil primitives -------------------------------------------------
  function hl(x, ax, ay, bx, by, rng, w) {            // hand-drawn straight line: 2 passes, overshoots
    const L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / L, uy = (by - ay) / L;
    for (let p = 0; p < 2; p++) {
      const sx = ax - ux * rng() * 2, sy = ay - uy * rng() * 2, ex = bx + ux * rng() * 2.6, ey = by + uy * rng() * 2.6;
      const n = Math.max(2, Math.round(L / 11));
      x.strokeStyle = p ? 'rgba(48,48,58,0.85)' : 'rgba(48,48,58,0.45)'; x.lineWidth = (w || 1.25) * (p ? 1 : 1.4);
      x.beginPath(); x.moveTo(sx + J(rng, 1.2), sy + J(rng, 1.2));
      for (let i = 1; i <= n; i++) { const t = i / n; x.lineTo(lerp(sx, ex, t) + J(rng, 1.3), lerp(sy, ey, t) + J(rng, 1.3)); }
      x.stroke();
    }
  }
  function poly(x, pts, rng, close) {
    for (let i = 0; i < pts.length - (close === false ? 1 : 0); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; hl(x, a[0], a[1], b[0], b[1], rng); }
  }
  function pathOf(pts) { return (x) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts) x.lineTo(p[0], p[1]); x.closePath(); }; }
  // opaque paper fill (hides items behind) + coloured pencil zigzag scribble
  function fillShape(x, rng, path, bb, col, alpha, ang, gap) {
    x.save(); path(x); x.fillStyle = PAPER; x.fill();
    if (col) {
      x.clip(); x.translate((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2); x.rotate(ang === undefined ? 0.9 : ang);
      const R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 4, g = gap || 2.6;
      x.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (alpha || 0.55) + ')'; x.lineWidth = g * 0.85; x.lineCap = 'round';
      x.beginPath(); let up = true;
      for (let t = -R; t <= R; t += g) { x.lineTo(t + J(rng, g * 0.6), up ? -R : R); x.lineTo(t + g * 0.5 + J(rng, g * 0.6), up ? R : -R); up = !up; }
      x.stroke();
    }
    x.restore();
  }
  function scribbleCircle(x, rng, cx, cy, r, col, alpha) {      // loopy scribble blob (tree crowns, bushes)
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.fillStyle = PAPER; x.fill(); x.clip();
    x.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (alpha || 0.6) + ')'; x.lineWidth = 2.2; x.lineCap = 'round';
    x.beginPath(); let a = 0, rr = 0;
    while (rr < r + 4) { rr += 0.55; a += 0.55; x.lineTo(cx + Math.cos(a) * rr + J(rng, 1.4), cy + Math.sin(a) * rr + J(rng, 1.4)); }
    x.stroke(); x.restore();
    x.strokeStyle = 'rgba(48,48,58,0.8)'; x.lineWidth = 1.25;
    for (let p = 0; p < 2; p++) {
      x.beginPath(); const s = rng() * 6.283, n = 14;
      for (let i = 0; i <= n + 1; i++) { const t = s + (i / n) * 6.283, rr2 = r * (1 + J(rng, 0.14)); const px = cx + Math.cos(t) * rr2, py = cy + Math.sin(t) * rr2; if (i === 0) x.moveTo(px, py); else x.lineTo(px, py); }
      x.stroke(); x.strokeStyle = 'rgba(48,48,58,0.4)';
    }
  }
  function grass(x, rng, BX, BY, w) {                          // short green strokes along the ground
    x.strokeStyle = 'rgba(70,150,60,0.7)'; x.lineWidth = 1.4; x.lineCap = 'round'; x.beginPath();
    for (let i = 0; i < 9; i++) { const gx = BX + J(rng, w), gy = BY + J(rng, 3); x.moveTo(gx, gy); x.lineTo(gx - 1.5, gy - 5 - rng() * 3); x.moveTo(gx, gy); x.lineTo(gx + 2, gy - 4 - rng() * 3); }
    x.stroke();
    x.strokeStyle = 'rgba(48,48,58,0.45)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(BX - w * 0.6, BY + 1); x.quadraticCurveTo(BX, BY + 3, BX + w * 0.6, BY); x.stroke();
  }
  function windowAt(x, rng, cx, cy, s, round) {
    const r = [[cx - s, cy - s], [cx + s, cy - s], [cx + s, cy + s], [cx - s, cy + s]];
    if (round) { fillShape(x, rng, (c) => { c.beginPath(); c.arc(cx, cy, s, 0, 6.283); }, [cx - s, cy - s, cx + s, cy + s], [150, 195, 235], 0.7, 0.5, 2); x.strokeStyle = 'rgba(48,48,58,0.85)'; x.lineWidth = 1.3; x.beginPath(); x.arc(cx + J(rng, 0.8), cy + J(rng, 0.8), s, 0, 6.283); x.stroke(); }
    else { fillShape(x, rng, pathOf(r), [cx - s, cy - s, cx + s, cy + s], [150, 195, 235], 0.7, 0.5, 2); poly(x, r, rng); }
    hl(x, cx - s, cy, cx + s, cy, rng, 1); hl(x, cx, cy - s, cx, cy + s, rng, 1);
  }
  function smoke(x, rng, cx, cy) {
    x.strokeStyle = 'rgba(90,90,100,0.6)'; x.lineWidth = 1.2; x.beginPath();
    let px = cx, py = cy;
    for (let i = 0; i < 3; i++) { x.moveTo(px, py); x.bezierCurveTo(px - 7, py - 3, px - 6, py - 11, px + 1, py - 9); x.bezierCurveTo(px + 6, py - 8, px + 4, py - 2, px - 1, py - 4); px += 5; py -= 10; }
    x.stroke();
  }

  // ---- houses --------------------------------------------------------------
  const BXH = 70, BYH = 136, WH = 140, HH = 150;
  function simpleHouse(x, rng, tall) {
    const w = 44 + rng() * 22, h = (tall ? 52 : 32) + rng() * 14, x0 = BXH - w / 2, y0 = BYH - h, roofH = 18 + rng() * 14;
    const wall = pick(rng, WALLS), roof = pick(rng, ROOFS);
    grass(x, rng, BXH, BYH, w * 0.8);
    const chimX = BXH + w * (0.12 + rng() * 0.18);
    const chim = [[chimX, y0 - roofH * 0.45], [chimX + 9, y0 - roofH * 0.45], [chimX + 9, y0 - roofH - 9], [chimX, y0 - roofH - 9]];
    fillShape(x, rng, pathOf(chim), [chimX, y0 - roofH - 9, chimX + 9, y0 - roofH * 0.45], pick(rng, ROOFS), 0.5, 0.2, 2.2); poly(x, chim, rng);
    smoke(x, rng, chimX + 4, y0 - roofH - 11);
    const body = [[x0, y0], [x0 + w, y0], [x0 + w, BYH], [x0, BYH]];
    fillShape(x, rng, pathOf(body), [x0, y0, x0 + w, BYH], wall, 0.5, 0.8 + J(rng, 0.3), 2.8); poly(x, body, rng);
    const rf = [[x0 - 6, y0 + 1], [BXH + J(rng, 6), y0 - roofH], [x0 + w + 6, y0 + 1]];
    fillShape(x, rng, pathOf(rf), [x0 - 6, y0 - roofH, x0 + w + 6, y0 + 1], roof, 0.75, 0.7, 2.2); poly(x, rf, rng);
    const dw = 9 + rng() * 4, dh = 17 + rng() * 5, dx = BXH + (tall ? 0 : J(rng, w * 0.3)) - dw / 2;
    const door = [[dx, BYH], [dx, BYH - dh], [dx + dw, BYH - dh], [dx + dw, BYH]];
    fillShape(x, rng, pathOf(door), [dx, BYH - dh, dx + dw, BYH], [150, 95, 55], 0.8, 0.4, 2); poly(x, door, rng);
    x.fillStyle = 'rgba(48,48,58,0.9)'; x.beginPath(); x.arc(dx + dw - 2.2, BYH - dh * 0.45, 1.1, 0, 6.3); x.fill();
    const rows = tall ? 2 : 1, ws = 5 + rng() * 2;
    for (let r = 0; r < rows; r++) for (const sx of [x0 + w * 0.22, x0 + w * 0.78]) {
      if (Math.abs(sx - (dx + dw / 2)) < 12 && r === 0) continue;
      windowAt(x, rng, sx, y0 + 12 + r * (h / 2 - 2), ws, rng() < 0.2);
    }
    if (rng() < 0.45) windowAt(x, rng, BXH, y0 - roofH * 0.4, 4.5, true);   // attic window
    if (rng() < 0.4) {                                                       // little garden fence
      for (let i = 0; i < 5; i++) { const fx = x0 + w + 4 + i * 5; hl(x, fx, BYH, fx, BYH - 8, rng, 1); }
      hl(x, x0 + w + 2, BYH - 5, x0 + w + 26, BYH - 5, rng, 1);
    }
  }
  function blockHouse(x, rng) {                                  // flat-roofed apartment block with window grid
    const cols = 3 + Math.floor(rng() * 2), rows = 4 + Math.floor(rng() * 2), cw = 13, rh = 15;
    const w = cols * cw + 6, h = rows * rh + 8, x0 = BXH - w / 2, y0 = BYH - h, wall = pick(rng, WALLS);
    grass(x, rng, BXH, BYH, w * 0.7);
    const body = [[x0, y0], [x0 + w, y0], [x0 + w, BYH], [x0, BYH]];
    fillShape(x, rng, pathOf(body), [x0, y0, x0 + w, BYH], wall, 0.5, 1.2, 2.8); poly(x, body, rng);
    hl(x, x0 - 3, y0, x0 + w + 3, y0, rng, 1.5);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (r === rows - 1 && c === Math.floor(cols / 2)) continue;
      const wx = x0 + 3 + c * cw + 2, wy = y0 + 5 + r * rh, ww = 8, wh = 9;
      const sq = [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]];
      fillShape(x, rng, pathOf(sq), [wx, wy, wx + ww, wy + wh], rng() < 0.3 ? [255, 225, 120] : [150, 195, 235], 0.7, 0.5, 1.8); poly(x, sq, rng);
    }
    const dx = x0 + 3 + Math.floor(cols / 2) * cw + 2, door = [[dx, BYH], [dx, BYH - 13], [dx + 8, BYH - 13], [dx + 8, BYH]];
    fillShape(x, rng, pathOf(door), [dx, BYH - 13, dx + 8, BYH], [150, 95, 55], 0.8, 0.4, 2); poly(x, door, rng);
    hl(x, BXH, y0, BXH, y0 - 14, rng, 1.2); x.fillStyle = 'rgba(200,50,40,0.8)'; x.beginPath(); x.moveTo(BXH, y0 - 14); x.lineTo(BXH + 9, y0 - 11); x.lineTo(BXH, y0 - 8); x.fill();
  }
  function tower(x, rng) {                                       // castle with two towers
    const roof = pick(rng, ROOFS), wall = [215, 205, 190];
    grass(x, rng, BXH, BYH, 50);
    const wallp = [[BXH - 28, BYH - 30], [BXH + 28, BYH - 30], [BXH + 28, BYH], [BXH - 28, BYH]];
    fillShape(x, rng, pathOf(wallp), [BXH - 28, BYH - 30, BXH + 28, BYH], wall, 0.5, 0.6, 2.8); poly(x, wallp, rng);
    for (let i = 0; i < 5; i++) { const cx = BXH - 24 + i * 11, m = [[cx, BYH - 30], [cx, BYH - 36], [cx + 6, BYH - 36], [cx + 6, BYH - 30]]; fillShape(x, rng, pathOf(m), null); poly(x, m, rng, false); }
    for (const sx of [-34, 34]) {
      const tw = [[BXH + sx - 11, BYH], [BXH + sx - 11, BYH - 58], [BXH + sx + 11, BYH - 58], [BXH + sx + 11, BYH]];
      fillShape(x, rng, pathOf(tw), [BXH + sx - 11, BYH - 58, BXH + sx + 11, BYH], wall, 0.5, 1.1, 2.8); poly(x, tw, rng);
      const cone = [[BXH + sx - 14, BYH - 58], [BXH + sx, BYH - 86], [BXH + sx + 14, BYH - 58]];
      fillShape(x, rng, pathOf(cone), [BXH + sx - 14, BYH - 86, BXH + sx + 14, BYH - 58], roof, 0.75, 0.7, 2.2); poly(x, cone, rng);
      hl(x, BXH + sx, BYH - 86, BXH + sx, BYH - 98, rng, 1.1);
      x.fillStyle = 'rgba(200,50,40,0.85)'; x.beginPath(); x.moveTo(BXH + sx, BYH - 98); x.lineTo(BXH + sx + 10, BYH - 94); x.lineTo(BXH + sx, BYH - 90); x.fill();
      windowAt(x, rng, BXH + sx, BYH - 40, 4, false);
    }
    const g = [[BXH - 7, BYH], [BXH - 7, BYH - 14]]; x.beginPath(); x.moveTo(BXH - 7, BYH); x.lineTo(BXH - 7, BYH - 12); x.arc(BXH, BYH - 12, 7, Math.PI, 0); x.lineTo(BXH + 7, BYH);
    x.fillStyle = 'rgba(120,80,50,0.7)'; x.fill(); x.strokeStyle = 'rgba(48,48,58,0.85)'; x.lineWidth = 1.3; x.stroke();
  }
  function cottage(x, rng) {                                     // low wide house with a round window and a path
    const w = 70, h = 30, x0 = BXH - w / 2, y0 = BYH - h, wall = pick(rng, WALLS), roof = pick(rng, ROOFS);
    grass(x, rng, BXH, BYH, 50);
    const body = [[x0, y0], [x0 + w, y0], [x0 + w, BYH], [x0, BYH]];
    fillShape(x, rng, pathOf(body), [x0, y0, x0 + w, BYH], wall, 0.5, 0.5, 2.8); poly(x, body, rng);
    const rf = [[x0 - 8, y0 + 1], [x0 + 12, y0 - 26], [x0 + w - 12, y0 - 26], [x0 + w + 8, y0 + 1]];
    fillShape(x, rng, pathOf(rf), [x0 - 8, y0 - 26, x0 + w + 8, y0 + 1], roof, 0.75, 0.9, 2.2); poly(x, rf, rng);
    windowAt(x, rng, x0 + 16, y0 + 14, 6, true); windowAt(x, rng, x0 + w - 16, y0 + 14, 6, false);
    const dx = BXH - 5, door = [[dx, BYH], [dx, BYH - 18], [dx + 10, BYH - 18], [dx + 10, BYH]];
    fillShape(x, rng, pathOf(door), [dx, BYH - 18, dx + 10, BYH], [150, 95, 55], 0.8, 0.4, 2); poly(x, door, rng);
    x.strokeStyle = 'rgba(48,48,58,0.5)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(BXH - 4, BYH + 1); x.quadraticCurveTo(BXH - 16, BYH + 8, BXH - 8, BYH + 14); x.moveTo(BXH + 6, BYH + 1); x.quadraticCurveTo(BXH - 4, BYH + 8, BXH + 4, BYH + 14); x.stroke();
  }

  // ---- other doodles ---------------------------------------------------------
  function treeA(x, rng) {
    const r = 17 + rng() * 6;
    hl(x, BXH - 4, BYH, BXH - 4, BYH - 32, rng); hl(x, BXH + 4, BYH, BXH + 4, BYH - 32, rng);
    x.fillStyle = 'rgba(150,100,55,0.45)'; x.fillRect(BXH - 4, BYH - 32, 8, 32);
    scribbleCircle(x, rng, BXH, BYH - 32 - r * 0.8, r, pick(rng, GREENS), 0.65);
    if (rng() < 0.5) { x.fillStyle = 'rgba(210,50,50,0.9)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(BXH + J(rng, r), BYH - 32 - r * 0.8 + J(rng, r), 2.2, 0, 6.3); x.fill(); } }   // apples
    grass(x, rng, BXH, BYH, 18);
  }
  function fir(x, rng) {
    hl(x, BXH, BYH, BXH, BYH - 10, rng);
    for (let i = 0; i < 3; i++) {
      const y1 = BYH - 8 - i * 17, w = 22 - i * 4, t = [[BXH - w, y1], [BXH, y1 - 26], [BXH + w, y1]];
      fillShape(x, rng, pathOf(t), [BXH - w, y1 - 26, BXH + w, y1], [50, 130, 80], 0.7, 0.8, 2.2); poly(x, t, rng);
    }
    grass(x, rng, BXH, BYH, 16);
  }
  function bush(x, rng) { scribbleCircle(x, rng, BXH - 8, BYH - 10, 10, pick(rng, GREENS), 0.65); scribbleCircle(x, rng, BXH + 8, BYH - 9, 11, pick(rng, GREENS), 0.65); grass(x, rng, BXH, BYH, 20); }
  function flower(x, rng) {
    const col = pick(rng, [[230, 70, 90], [250, 190, 40], [150, 90, 200], [240, 120, 40]]);
    x.strokeStyle = 'rgba(60,140,60,0.85)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(BXH, BYH); x.quadraticCurveTo(BXH + 4, BYH - 14, BXH, BYH - 28); x.stroke();
    x.beginPath(); x.moveTo(BXH + 1, BYH - 12); x.quadraticCurveTo(BXH + 10, BYH - 18, BXH + 12, BYH - 12); x.quadraticCurveTo(BXH + 6, BYH - 8, BXH + 1, BYH - 12); x.stroke();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; x.beginPath(); x.ellipse(BXH + Math.cos(a) * 6, BYH - 33 + Math.sin(a) * 6, 4, 3, a, 0, 6.3); x.fillStyle = PAPER; x.fill(); x.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.7)'; x.fill(); x.strokeStyle = 'rgba(48,48,58,0.8)'; x.lineWidth = 1; x.stroke(); }
    x.beginPath(); x.arc(BXH, BYH - 33, 3, 0, 6.3); x.fillStyle = 'rgba(250,200,40,0.95)'; x.fill(); x.stroke();
  }
  function sun(x, rng) {
    const cx = BXH, cy = 60, r = 16;
    x.strokeStyle = 'rgba(240,180,30,0.85)'; x.lineWidth = 2; x.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; x.beginPath(); x.moveTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5)); x.lineTo(cx + Math.cos(a) * (r + 12 + (i % 2) * 5), cy + Math.sin(a) * (r + 12 + (i % 2) * 5)); x.stroke(); }
    scribbleCircle(x, rng, cx, cy, r, [250, 205, 50], 0.8);
    x.fillStyle = 'rgba(48,48,58,0.85)'; x.beginPath(); x.arc(cx - 5, cy - 3, 1.5, 0, 6.3); x.arc(cx + 5, cy - 3, 1.5, 0, 6.3); x.fill();
    x.strokeStyle = 'rgba(48,48,58,0.85)'; x.lineWidth = 1.3; x.beginPath(); x.arc(cx, cy + 1, 7, 0.25, Math.PI - 0.25); x.stroke();
  }
  function cloud(x, rng) {
    const cx = BXH, cy = 62, path = (c) => { c.beginPath(); c.moveTo(cx - 34, cy + 10); c.arc(cx - 24, cy + 2, 12, Math.PI * 0.75, Math.PI * 1.6); c.arc(cx - 6, cy - 8, 14, Math.PI * 1.1, Math.PI * 1.9); c.arc(cx + 18, cy - 2, 12, Math.PI * 1.3, Math.PI * 0.2); c.lineTo(cx + 30, cy + 10); c.closePath(); };
    fillShape(x, rng, path, [cx - 40, cy - 25, cx + 40, cy + 12], [170, 205, 240], 0.6, 0.4, 2.4);
    x.strokeStyle = 'rgba(48,48,58,0.85)'; x.lineWidth = 1.3; path(x); x.stroke(); x.strokeStyle = 'rgba(48,48,58,0.35)'; x.translate(1, 1); path(x); x.stroke();
  }
  function car(x, rng) {
    const col = pick(rng, ROOFS), y = BYH - 8;
    const body = [[BXH - 24, y], [BXH - 24, y - 9], [BXH - 14, y - 11], [BXH - 8, y - 20], [BXH + 10, y - 20], [BXH + 17, y - 11], [BXH + 25, y - 9], [BXH + 25, y]];
    fillShape(x, rng, pathOf(body), [BXH - 24, y - 20, BXH + 25, y], col, 0.75, 0.5, 2.2); poly(x, body, rng);
    windowAt(x, rng, BXH - 1, y - 13, 4, false);
    for (const wx of [-13, 14]) { x.beginPath(); x.arc(BXH + wx, y + 1, 6, 0, 6.3); x.fillStyle = PAPER; x.fill(); x.fillStyle = 'rgba(60,60,70,0.7)'; x.fill(); x.strokeStyle = 'rgba(48,48,58,0.9)'; x.lineWidth = 1.3; x.stroke(); }
    x.strokeStyle = 'rgba(48,48,58,0.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(BXH - 40, y + 8); x.lineTo(BXH + 40, y + 8); x.stroke();
  }
  function person(x, rng) {
    const col = pick(rng, ROOFS);
    x.strokeStyle = 'rgba(48,48,58,0.9)'; x.lineWidth = 1.5; x.lineCap = 'round';
    x.beginPath(); x.arc(BXH, BYH - 38, 6, 0, 6.3); x.fillStyle = PAPER; x.fill(); x.stroke();
    x.beginPath(); x.moveTo(BXH, BYH - 32); x.lineTo(BXH, BYH - 14); x.moveTo(BXH, BYH - 28); x.lineTo(BXH - 9, BYH - 20 + J(rng, 6)); x.moveTo(BXH, BYH - 28); x.lineTo(BXH + 9, BYH - 20 + J(rng, 6));
    x.moveTo(BXH, BYH - 14); x.lineTo(BXH - 6, BYH); x.moveTo(BXH, BYH - 14); x.lineTo(BXH + 6, BYH); x.stroke();
    x.beginPath(); x.moveTo(BXH - 7, BYH - 14); x.lineTo(BXH, BYH - 31); x.lineTo(BXH + 7, BYH - 14); x.closePath(); x.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.7)'; x.fill(); x.stroke();
    x.fillStyle = 'rgba(48,48,58,0.9)'; x.beginPath(); x.arc(BXH - 2, BYH - 39, 0.9, 0, 6.3); x.arc(BXH + 2, BYH - 39, 0.9, 0, 6.3); x.fill();
  }
  function lamp(x, rng) {
    hl(x, BXH, BYH, BXH, BYH - 48, rng, 1.6); hl(x, BXH, BYH - 48, BXH + 10, BYH - 48, rng, 1.4);
    x.beginPath(); x.arc(BXH + 10, BYH - 44, 4, 0, 6.3); x.fillStyle = 'rgba(255,225,100,0.9)'; x.fill(); x.strokeStyle = 'rgba(48,48,58,0.85)'; x.lineWidth = 1.2; x.stroke();
  }

  // ---- theme -----------------------------------------------------------------
  function mk(n, fn, seed0) { const out = []; for (let i = 0; i < n; i++) { const sp = sprite(WH, HH, 2); sp.x.lineCap = 'round'; sp.x.lineJoin = 'round'; fn(sp.x, window.mulberry32(seed0 + i * 977)); out.push(sp.c); } return out; }

  // pencil bird (a flapping "v"), drawn per frame
  function drawBird(ctx, f, now) {
    const s = f.size, fl = Math.sin(now * 0.001 * f.rate + f.phase) * 0.5;
    ctx.translate(f.x, f.y); ctx.rotate(f.ang); ctx.strokeStyle = 'rgba(48,48,58,0.8)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-s * 0.2, side * s * (0.4 + fl * 0.5), -s * 0.55, side * s * (0.55 + fl)); ctx.stroke(); }
  }

  const CityTheme = {
    id: 'city',
    name: 'Pencil Town',
    itemName: 'doodles',
    spacing: 76,
    margin: 30,
    grow: { min: 0.9, max: 1.7, delay: 1.3 },
    shrink: 0.3,
    iconGrow: 0.9,
    iconsOnTop: true,
    animated: true,
    sprites: null, paper: null, flock: null, trail: [], suns: 0,

    prepare() {
      if (!this.sprites) {
        this.sprites = {
          house: mk(7, (x, r) => simpleHouse(x, r, false), 11), tall: mk(5, (x, r) => simpleHouse(x, r, true), 211),
          block: mk(4, blockHouse, 311), tower: mk(2, tower, 411), cottage: mk(3, cottage, 511),
          tree: mk(5, treeA, 611), fir: mk(3, fir, 711), bush: mk(3, bush, 811), flower: mk(3, flower, 911),
          sun: mk(1, sun, 1011), cloud: mk(2, cloud, 1111), car: mk(3, car, 1211), person: mk(3, person, 1311), lamp: mk(1, lamp, 1411),
        };
      }
      this.flock = new Flyers({ count: 6, size: [12, 22], speed: [30, 60], turn: 1.4, rate: [6, 9], draw: drawBird });
      this.trail = [];
    },

    makeItem(rng) {
      const r = rng(), S = this.sprites;
      let kind;
      if (r < 0.26) kind = 'house'; else if (r < 0.38) kind = 'tall'; else if (r < 0.48) kind = 'block'; else if (r < 0.54) kind = 'tower';
      else if (r < 0.64) kind = 'cottage'; else if (r < 0.77) kind = 'tree'; else if (r < 0.82) kind = 'fir'; else if (r < 0.85) kind = 'bush';
      else if (r < 0.89) kind = 'flower'; else if (r < 0.915 && this.suns < 2) { kind = 'sun'; this.suns++; } else if (r < 0.94) kind = 'cloud';
      else if (r < 0.97) kind = 'car'; else if (r < 0.99) kind = 'person'; else kind = 'lamp';
      return { kind, v: Math.floor(rng() * S[kind].length), scale: 0.85 + rng() * 0.3, flip: rng() < 0.5 };
    },
    footprint(it) {
      const w = { house: 40, tall: 36, block: 38, tower: 52, cottage: 46, tree: 28, fir: 28, bush: 28, flower: 14, sun: 30, cloud: 38, car: 34, person: 12, lamp: 14 }[it.kind];
      const up = { house: 64, tall: 90, block: 100, tower: 100, cottage: 56, tree: 80, fir: 70, bush: 24, flower: 44, sun: 80, cloud: 80, car: 24, person: 46, lamp: 54 }[it.kind];
      return { halfW: w * it.scale, up: up * it.scale, down: 14 * it.scale };
    },
    drawItem(ctx, it, g) {
      const c = this.sprites[it.kind][it.v], k = it.scale * g;
      if (it.flip) { ctx.save(); ctx.translate(it.x, it.y); ctx.scale(-1, 1); ctx.drawImage(c, -BXH * k, -BYH * k, WH * k, HH * k); ctx.restore(); }
      else ctx.drawImage(c, it.x - BXH * k, it.y - BYH * k, WH * k, HH * k);
    },

    paintGround(ctx, w, h, rng) {
      this.suns = 0;
      const n = makeNoise(31), pw = Math.ceil(w / 2), ph = Math.ceil(h / 2);
      const pc = document.createElement('canvas'); pc.width = pw; pc.height = ph;
      const px = pc.getContext('2d'), img = px.createImageData(pw, ph), d = img.data;
      for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
        const v = n(i * 2 / 90, j * 2 / 90, 4), k = (j * pw + i) * 4, s = 246 - (v - 0.5) * 16;
        d[k] = s; d[k + 1] = s - 4; d[k + 2] = s - 18; d[k + 3] = 255;
      }
      px.putImageData(img, 0, 0); ctx.drawImage(pc, 0, 0, w, h);
      for (let i = 0; i < 700; i++) {                              // paper grain
        ctx.fillStyle = 'rgba(90,80,60,' + (0.03 + rng() * 0.05) + ')'; ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 1.5, 1);
      }
      for (let i = 0; i < 14; i++) {                               // pencil smudges
        const x0 = rng() * w, y0 = rng() * h, r = 20 + rng() * 60, g = ctx.createRadialGradient(x0, y0, 0, x0, y0, r);
        g.addColorStop(0, 'rgba(110,110,120,0.05)'); g.addColorStop(1, 'rgba(110,110,120,0)'); ctx.fillStyle = g; ctx.fillRect(x0 - r, y0 - r, r * 2, r * 2);
      }
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78);
      v.addColorStop(0, 'rgba(120,100,60,0)'); v.addColorStop(1, 'rgba(120,100,60,0.22)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
      this.paper = document.createElement('canvas'); this.paper.width = ctx.canvas.width; this.paper.height = ctx.canvas.height;
      this.paper.getContext('2d').drawImage(ctx.canvas, 0, 0);
    },

    // erased paper patch framed by ONE sketchy pencil loop (merged for close icons)
    drawIcons(ctx, states, now, eng) {
      const blobs = clusterBlobs(states, 20, 70, 0.3);
      const path = () => { ctx.beginPath(); for (const pts of blobs) { const n = pts.length; ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ctx.closePath(); } };
      ctx.save();
      path(); ctx.strokeStyle = 'rgba(120,120,130,0.10)'; ctx.lineWidth = 16; ctx.stroke();       // eraser smudge
      ctx.lineCap = 'round';
      // sketchy loop first (thick, so its OUTER half shows), then the clean paper covers the inner half
      // and every inner overlap -> only ONE outline remains around the merged shape
      for (let p = 0; p < 3; p++) {
        ctx.save(); ctx.translate(Math.sin(p * 2.1) * 1.8, Math.cos(p * 1.7) * 1.8); path();
        ctx.strokeStyle = p === 1 ? 'rgba(48,48,58,0.85)' : 'rgba(48,48,58,0.4)'; ctx.lineWidth = p === 1 ? 3.2 : 2.4; ctx.stroke(); ctx.restore();
      }
      ctx.save(); path(); ctx.clip(); if (this.paper) ctx.drawImage(this.paper, 0, 0, eng.w, eng.h); ctx.restore();
      ctx.restore();
    },

    // pencil scribble trail behind the mouse + doodle birds
    drawOverlay(ctx, now, w, h, eng) {
      const c = eng.cursor;
      if (c && c.on) {
        const last = this.trail[this.trail.length - 1];
        if (!last || Math.hypot(last.x - c.sx, last.y - c.sy) > 5) this.trail.push({ x: c.sx, y: c.sy, t: now, j: Math.random() * 2 - 1 });
      }
      while (this.trail.length && now - this.trail[0].t > 2200) this.trail.shift();
      if (this.trail.length > 1) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < this.trail.length; i++) {
          const a = this.trail[i - 1], b = this.trail[i], age = 1 - (now - b.t) / 2200;
          ctx.strokeStyle = 'rgba(48,48,58,' + (0.7 * age).toFixed(3) + ')'; ctx.lineWidth = 1.5 + age;
          ctx.beginPath(); ctx.moveTo(a.x + a.j * 1.5, a.y - a.j); ctx.lineTo(b.x + b.j * 1.5, b.y - b.j); ctx.stroke();
        }
      }
      this.flock.draw(ctx, now, w, h, eng);
    },
  };

  window.CityTheme = CityTheme;
})();
