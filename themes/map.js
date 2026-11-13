// themes/map.js - Old parchment map (think pirate / Mediterranean chart).
// * Aged brown paper with burnt edges, ink coastlines with water-lines, hand-inked trees,
//   mountains, villages, galleons, sea monsters, compass roses, labels.
// * Under desktop icons the map is EMPTY paper. One icon or a merged group of close icons is
//   framed by ONE irregular hand-inked border (the cleared patch covers anything near it).
// * Interaction: dashed treasure routes link the cleared patches; galleons sail on the sea and
//   chase the mouse; every compass rose needle points at the mouse.
(function () {
  const { lerp, mix, rgb, sprite, makeNoise, nearPairs, clusterBlobs, blobPoints } = window.Kit;
  const SEA = 0.5;
  const LEVELS = [0.38, 0.43, 0.47, SEA, 0.66, 0.76];
  const INK = [66, 38, 14];
  const inkc = (a) => 'rgba(66,38,14,' + a + ')';
  const PAPER = 'rgba(238,217,164,0.93)';

  // ---------------------------------------------------------------- sprites
  function mk(W, H, bx, by, fn, seed) {
    const sp = sprite(W, H, 3), rng = window.mulberry32(seed);
    sp.x.lineCap = 'round'; sp.x.lineJoin = 'round';
    fn(sp.x, rng, bx, by);
    return { c: sp.c, W, H, bx, by };
  }
  const pen = (x, w, a) => { x.strokeStyle = inkc(a === undefined ? 0.9 : a); x.lineWidth = w || 1.3; };
  const J = (rng, a) => (rng() - 0.5) * a;

  function mountain(x, rng, BX, BY) {
    const peaks = 2 + (rng() < 0.5 ? 1 : 0);
    const list = [];
    for (let i = 0; i < peaks; i++) list.push({ px: BX + (i - (peaks - 1) / 2) * 17 + J(rng, 6), h: 22 + rng() * 18, w: 12 + rng() * 6, by: BY - 2 + i % 2 * 3 - (i === 1 ? 3 : 0) });
    list.sort((a, b) => a.by - b.by);
    for (const p of list) {
      const pts = [[p.px - p.w, p.by]];
      for (let k = 1; k < 4; k++) pts.push([lerp(p.px - p.w, p.px, k / 4) + J(rng, 2.5), lerp(p.by, p.by - p.h, k / 4) + J(rng, 2)]);
      pts.push([p.px, p.by - p.h]);
      for (let k = 1; k < 4; k++) pts.push([lerp(p.px, p.px + p.w, k / 4) + J(rng, 2.5), lerp(p.by - p.h, p.by, k / 4) + J(rng, 2)]);
      pts.push([p.px + p.w, p.by]);
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const q of pts) x.lineTo(q[0], q[1]);
      x.fillStyle = PAPER; x.fill(); pen(x, 1.3); x.stroke();
      pen(x, 0.9, 0.75); x.beginPath();                      // shading strokes on the right flank
      for (let k = 0; k < 9; k++) {
        const t = 0.1 + k * 0.1, sx = lerp(p.px, p.px + p.w, t) - 1, sy = lerp(p.by - p.h, p.by, t);
        x.moveTo(sx, sy); x.lineTo(sx - 3 - rng() * 4, sy + 3 + rng() * 7);
      }
      x.stroke();
    }
  }
  function tree(x, rng, BX, BY, ox, oy, r) {
    ox = ox || 0; oy = oy || 0; r = r || 9 + rng() * 3;
    const cy = BY + oy - 15 - r * 0.3;
    pen(x, 1.3); x.beginPath(); x.moveTo(BX + ox, BY + oy); x.lineTo(BX + ox + J(rng, 1.5), cy + r - 1); x.stroke();
    x.beginPath();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const a0 = (i / n) * 6.283, a1 = ((i + 1) / n) * 6.283, am = (a0 + a1) / 2;
      const px = BX + ox + Math.cos(a0) * r, py = cy + Math.sin(a0) * r * 0.92;
      const qx = BX + ox + Math.cos(am) * r * 1.28, qy = cy + Math.sin(am) * r * 1.2;
      const ex = BX + ox + Math.cos(a1) * r, ey = cy + Math.sin(a1) * r * 0.92;
      if (i === 0) x.moveTo(px, py);
      x.quadraticCurveTo(qx, qy, ex, ey);
    }
    x.fillStyle = PAPER; x.fill(); pen(x, 1.2); x.stroke();
    pen(x, 0.8, 0.6); x.beginPath();
    for (let k = 0; k < 5; k++) { const a = 0.2 + k * 0.3, rr = r * (0.35 + rng() * 0.4); x.moveTo(BX + ox + Math.cos(a) * rr, cy + Math.sin(a) * rr); x.lineTo(BX + ox + Math.cos(a) * rr + 2, cy + Math.sin(a) * rr + 3); }
    x.stroke();
  }
  function pine(x, rng, BX, BY, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    pen(x, 1.2); x.beginPath(); x.moveTo(BX + ox, BY + oy); x.lineTo(BX + ox, BY + oy - 8); x.stroke();
    for (let i = 0; i < 3; i++) {
      const y0 = BY + oy - 7 - i * 8, w = 9 - i * 1.8;
      x.beginPath(); x.moveTo(BX + ox - w, y0); x.lineTo(BX + ox, y0 - 12); x.lineTo(BX + ox + w, y0); x.closePath();
      x.fillStyle = PAPER; x.fill(); pen(x, 1.15); x.stroke();
    }
  }
  function grove(x, rng, BX, BY) {
    const pts = [[-14, -2], [12, -3], [0, 5], [-6, -7], [7, 3]];
    pts.sort((a, b) => a[1] - b[1]);
    const conifer = rng() < 0.4;
    for (const p of pts) (conifer ? pine : tree)(x, rng, BX, BY, p[0], p[1], 7 + rng() * 2);
  }
  function house(x, rng, BX, BY, ox, oy, s) {
    ox = ox || 0; oy = oy || 0; s = s || 1;
    const w = 10 * s, h = 9 * s;
    x.beginPath(); x.rect(BX + ox - w, BY + oy - h, w * 2, h); x.fillStyle = PAPER; x.fill(); pen(x, 1.2); x.stroke();
    x.beginPath(); x.moveTo(BX + ox - w - 2, BY + oy - h); x.lineTo(BX + ox, BY + oy - h - 9 * s); x.lineTo(BX + ox + w + 2, BY + oy - h); x.closePath();
    x.fillStyle = 'rgba(150,80,40,0.35)'; x.fill(); pen(x, 1.2); x.stroke();
    x.beginPath(); x.rect(BX + ox - 2, BY + oy - 5 * s, 4, 5 * s); pen(x, 1); x.stroke();
    pen(x, 0.8, 0.6); x.beginPath(); for (let k = 0; k < 4; k++) { x.moveTo(BX + ox + w - 2 - k * 2.2, BY + oy - h + 1); x.lineTo(BX + ox + w - 4 - k * 2.2, BY + oy - 1); } x.stroke();
  }
  function village(x, rng, BX, BY) { house(x, rng, BX, BY, -13, 3, 0.8); house(x, rng, BX, BY, 12, 4, 0.75); house(x, rng, BX, BY, 0, -1, 1.05); }
  function castle(x, rng, BX, BY) {
    const tw = (cx, h) => {
      x.beginPath(); x.rect(cx - 6, BY - h, 12, h); x.fillStyle = PAPER; x.fill(); pen(x, 1.3); x.stroke();
      x.beginPath(); for (let k = 0; k < 3; k++) x.rect(cx - 6 + k * 4.5, BY - h - 4, 3, 4); x.fill(); pen(x, 1.1); x.stroke();
      x.beginPath(); x.moveTo(cx, BY - h - 4); x.lineTo(cx, BY - h - 15); x.lineTo(cx + 7, BY - h - 12); x.lineTo(cx, BY - h - 10); x.stroke();
      x.beginPath(); x.rect(cx - 1.5, BY - 7, 3, 7); x.stroke();
    };
    x.beginPath(); x.rect(BX - 12, BY - 12, 24, 12); x.fillStyle = PAPER; x.fill(); pen(x, 1.2); x.stroke();
    tw(BX - 14, 28); tw(BX + 14, 24);
    pen(x, 0.8, 0.6); x.beginPath(); for (let k = 0; k < 5; k++) { x.moveTo(BX - 3 + k * 2.5, BY - 11); x.lineTo(BX - 5 + k * 2.5, BY - 2); } x.stroke();
  }
  function ship(x, rng, BX, BY) {
    const mast = [[-12, 42], [0, 52], [12, 40]];
    pen(x, 1.4); x.beginPath();
    x.moveTo(-22 + BX, BY - 14); x.quadraticCurveTo(BX, BY - 10, BX + 22, BY - 16); x.lineTo(BX + 14, BY - 3); x.quadraticCurveTo(BX, BY + 1, BX - 15, BY - 3); x.closePath();
    x.fillStyle = 'rgba(120,70,30,0.35)'; x.fill(); x.stroke();
    for (const [mx, mh] of mast) {
      pen(x, 1.3); x.beginPath(); x.moveTo(BX + mx, BY - 14); x.lineTo(BX + mx, BY - 14 - mh * 0.62); x.stroke();
      for (let s = 0; s < 2; s++) {
        const top = BY - 14 - mh * 0.62 + s * mh * 0.28, bot = top + mh * 0.25, hw = (7 - s) * (mx === 0 ? 1.15 : 1);
        x.beginPath(); x.moveTo(BX + mx - hw, top); x.quadraticCurveTo(BX + mx, top + 3, BX + mx + hw, top);
        x.quadraticCurveTo(BX + mx + hw + 2, (top + bot) / 2, BX + mx + hw - 1, bot); x.quadraticCurveTo(BX + mx, bot - 3, BX + mx - hw + 1, bot);
        x.quadraticCurveTo(BX + mx - hw - 2, (top + bot) / 2, BX + mx - hw, top);
        x.fillStyle = PAPER; x.fill(); pen(x, 1.1); x.stroke();
      }
      x.beginPath(); x.moveTo(BX + mx, BY - 14 - mh * 0.62); x.lineTo(BX + mx + 6, BY - 14 - mh * 0.62 - 2); x.lineTo(BX + mx, BY - 14 - mh * 0.62 - 4); x.fillStyle = inkc(0.7); x.fill();
    }
    pen(x, 1, 0.7); x.beginPath();
    for (let k = 0; k < 3; k++) { const wx = BX - 24 + k * 18; x.moveTo(wx, BY + 3); x.quadraticCurveTo(wx + 4, BY - 1, wx + 8, BY + 3); x.quadraticCurveTo(wx + 12, BY + 6, wx + 16, BY + 2); }
    x.stroke();
  }
  function monster(x, rng, BX, BY) {
    pen(x, 1.4);
    for (let i = 0; i < 3; i++) {                       // humps
      const hx = BX - 22 + i * 17, r = 7 - i;
      x.beginPath(); x.arc(hx, BY - 2, r, Math.PI, 0); x.fillStyle = PAPER; x.fill(); x.stroke();
      pen(x, 0.8, 0.6); x.beginPath(); for (let k = 0; k < 3; k++) { x.moveTo(hx - r + 3 + k * 3, BY - 3); x.lineTo(hx - r + 4 + k * 3, BY - 3 - r * 0.7); } x.stroke(); pen(x, 1.4);
    }
    x.beginPath(); x.moveTo(BX + 18, BY - 2); x.bezierCurveTo(BX + 28, BY - 4, BX + 22, BY - 26, BX + 30, BY - 28);   // neck
    x.lineTo(BX + 37, BY - 26); x.lineTo(BX + 31, BY - 22); x.bezierCurveTo(BX + 29, BY - 14, BX + 36, BY - 6, BX + 30, BY - 1);
    x.fillStyle = PAPER; x.fill(); x.stroke();
    x.beginPath(); x.arc(BX + 31, BY - 26, 1, 0, 6.3); x.fillStyle = inkc(0.95); x.fill();
    pen(x, 1, 0.7); x.beginPath(); for (let k = 0; k < 4; k++) { const wx = BX - 28 + k * 16; x.moveTo(wx, BY + 4); x.quadraticCurveTo(wx + 4, BY, wx + 8, BY + 4); } x.stroke();
  }
  function waves(x, rng, BX, BY) {
    pen(x, 1.1, 0.7); x.beginPath();
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
      const wx = BX - 20 + k * 14 + r * 5, wy = BY - 8 + r * 7;
      x.moveTo(wx, wy); x.quadraticCurveTo(wx + 3.5, wy - 4, wx + 7, wy); x.quadraticCurveTo(wx + 10.5, wy + 4, wx + 14, wy);
    }
    x.stroke();
  }
  function fish(x, rng, BX, BY) {
    pen(x, 1.2); x.beginPath(); x.moveTo(BX - 12, BY - 10); x.quadraticCurveTo(BX, BY - 20, BX + 12, BY - 10); x.quadraticCurveTo(BX, BY, BX - 12, BY - 10);
    x.lineTo(BX - 19, BY - 16); x.lineTo(BX - 19, BY - 4); x.lineTo(BX - 12, BY - 10); x.fillStyle = PAPER; x.fill(); x.stroke();
    x.beginPath(); x.arc(BX + 7, BY - 12, 0.9, 0, 6.3); x.fillStyle = inkc(0.9); x.fill();
    pen(x, 0.8, 0.6); x.beginPath(); for (let k = 0; k < 3; k++) { x.moveTo(BX - 4 + k * 3, BY - 16); x.lineTo(BX - 4 + k * 3, BY - 6); } x.stroke();
  }
  function whirl(x, rng, BX, BY) {
    pen(x, 1.2, 0.85); x.beginPath();
    for (let a = 0; a < 15; a += 0.2) { const r = 1.5 + a * 1.4; const px = BX + Math.cos(a) * r, py = BY - 12 + Math.sin(a) * r * 0.6; if (a === 0) x.moveTo(px, py); else x.lineTo(px, py); }
    x.stroke();
  }
  function anchor(x, rng, BX, BY) {
    pen(x, 1.6); x.beginPath(); x.moveTo(BX, BY - 26); x.lineTo(BX, BY - 4); x.moveTo(BX - 6, BY - 20); x.lineTo(BX + 6, BY - 20);
    x.moveTo(BX - 11, BY - 11); x.quadraticCurveTo(BX - 8, BY - 3, BX, BY - 3); x.quadraticCurveTo(BX + 8, BY - 3, BX + 11, BY - 11); x.stroke();
    x.beginPath(); x.arc(BX, BY - 29, 3, 0, 6.3); x.stroke();
  }
  function skull(x, rng, BX, BY) {
    pen(x, 1.8); x.beginPath(); x.moveTo(BX - 12, BY - 2); x.lineTo(BX + 12, BY - 24); x.moveTo(BX + 12, BY - 2); x.lineTo(BX - 12, BY - 24); x.stroke();
    x.beginPath(); x.arc(BX, BY - 16, 6.5, 0, 6.3); x.fillStyle = PAPER; x.fill(); pen(x, 1.3); x.stroke();
    x.fillStyle = inkc(0.9); x.beginPath(); x.arc(BX - 2.5, BY - 17, 1.5, 0, 6.3); x.arc(BX + 2.5, BY - 17, 1.5, 0, 6.3); x.fill();
  }
  function cross(x, rng, BX, BY) {
    pen(x, 2.4, 0.85); x.beginPath(); x.moveTo(BX - 8, BY - 22); x.lineTo(BX + 8, BY - 6); x.moveTo(BX + 8, BY - 22); x.lineTo(BX - 8, BY - 6); x.stroke();
    pen(x, 1, 0.6); x.setLineDash([2, 3]); x.beginPath(); x.arc(BX, BY - 14, 14, 0, 6.3); x.stroke(); x.setLineDash([]);
  }
  function compass(x, rng, BX, BY) {
    const cy = BY - 40, R = 38;
    pen(x, 1.4); x.beginPath(); x.arc(BX, cy, R, 0, 6.3); x.stroke(); x.beginPath(); x.arc(BX, cy, R * 0.82, 0, 6.3); pen(x, 0.9, 0.7); x.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.283 - 1.5708, long = i % 4 === 0 ? 1 : i % 2 === 0 ? 0.7 : 0.45, rr = R * 0.8 * long, w = 0.11;
      x.beginPath(); x.moveTo(BX + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      x.lineTo(BX + Math.cos(a + w) * R * 0.14, cy + Math.sin(a + w) * R * 0.14); x.lineTo(BX, cy); x.lineTo(BX + Math.cos(a - w) * R * 0.14, cy + Math.sin(a - w) * R * 0.14); x.closePath();
      x.fillStyle = i % 2 ? PAPER : inkc(0.5); x.fill(); pen(x, 0.9, 0.85); x.stroke();
    }
    x.font = 'bold 11px serif'; x.textAlign = 'center'; x.fillStyle = inkc(0.9); x.fillText('N', BX, cy - R - 3);
  }
  const NAMES = ['MARE NOSTRUM', 'TERRA INCOGNITA', 'HESPERIA', 'ARCADIA', 'AEGEUM', 'NUMIDIA', 'LUSITANIA', 'THULE', 'ATLANTIS', 'CATHAY', 'OPHIR', 'CARTHAGO'];
  function label(i) {
    const t = NAMES[i % NAMES.length], sea = i % 2 === 1;
    return (x) => {
      x.font = (sea ? 'italic ' : '') + '600 ' + (sea ? 13 : 11) + 'px Georgia, serif'; x.fillStyle = inkc(0.8); x.textAlign = 'center';
      const sp = sea ? 3 : 2; let w = 0; for (const ch of t) w += x.measureText(ch).width + sp; let px = 110 - w / 2;
      for (const ch of t) { x.textAlign = 'left'; x.fillText(ch, px, 20); px += x.measureText(ch).width + sp; }
    };
  }

  // ---------------------------------------------------------------- theme
  const MapTheme = {
    id: 'map',
    name: 'Old Parchment Map',
    itemName: 'map marks',
    spacing: 46,
    margin: 30,
    grow: { min: 0.9, max: 1.8, delay: 1.2 },
    shrink: 0.3,
    iconGrow: 1.1,
    iconsOnTop: true,
    animated: true,
    sprites: null,
    paper: null,
    ships: null,
    compasses: 0,

    prepare() {
      if (this.sprites) return;
      const S = {};
      const set = (name, n, W, H, bx, by, fn) => { S[name] = []; for (let i = 0; i < n; i++) S[name].push(mk(W, H, bx, by, (x, r, a, b) => fn(x, r, a, b, i), 100 + i * 31 + name.length * 7)); };
      set('mount', 6, 84, 64, 42, 58, mountain);
      set('tree', 5, 56, 60, 28, 54, (x, r, a, b) => tree(x, r, a, b));
      set('pine', 3, 56, 60, 28, 54, (x, r, a, b) => pine(x, r, a, b));
      set('grove', 5, 64, 60, 32, 52, grove);
      set('house', 3, 56, 50, 28, 46, (x, r, a, b) => house(x, r, a, b));
      set('village', 3, 64, 50, 32, 44, village);
      set('castle', 2, 64, 70, 32, 62, castle);
      set('ship', 3, 84, 80, 42, 62, ship);
      set('monster', 2, 90, 50, 44, 44, monster);
      set('waves', 3, 60, 30, 30, 22, waves);
      set('fish', 2, 50, 30, 25, 26, fish);
      set('whirl', 1, 60, 36, 30, 28, whirl);
      set('anchor', 1, 40, 44, 20, 40, anchor);
      set('skull', 1, 44, 36, 22, 32, skull);
      set('cross', 1, 44, 36, 22, 32, cross);
      set('compass', 1, 92, 92, 46, 86, compass);
      S.label = [];
      for (let i = 0; i < NAMES.length; i++) S.label.push(mk(220, 30, 110, 20, label(i), 5 + i));
      this.sprites = S;
    },

    // -------- terrain
    elev(x, y) {
      const w = this.w, h = this.h, u = x / w - 0.5, v = y / h - 0.5;
      const d = Math.min(1.4, Math.hypot(u * 1.25, v * 1.5));
      const n = this.noise(x / (w / 3.4) + 3.1, y / (w / 3.4) + 1.7, 5);
      return n * 0.9 + 0.30 * Math.pow(d, 1.4) - 0.12;
    },

    accept(x, y) { return x > 60 && x < this.w - 60 && y > 80 && y < this.h - 40; },   // keep marks inside the border

    makeItem(rng, x, y) {
      const S = this.sprites, e = this.elev(x, y), r = rng(), pick = (k) => ({ kind: k, v: Math.floor(rng() * S[k].length) });
      let it;
      if (e > SEA + 0.015) {
        const hi = e > 0.66;
        if (hi && r < 0.62) it = pick('mount');
        else if (r < 0.28) it = pick('mount');
        else if (r < 0.50) it = pick('tree');
        else if (r < 0.58) it = pick('pine');
        else if (r < 0.74) it = pick('grove');
        else if (r < 0.86) it = pick('village');
        else if (r < 0.91) it = pick('house');
        else if (r < 0.945) it = pick('castle');
        else it = { kind: 'label', v: Math.floor(rng() * NAMES.length / 2) * 2 };
      } else if (e < SEA - 0.015) {
        const deep = e < SEA - 0.09;
        if (r < 0.16) it = pick('ship');
        else if (r < 0.24) it = pick('monster');
        else if (r < 0.28 && deep && this.compasses < 3) { this.compasses++; it = pick('compass'); }
        else if (r < 0.44) it = pick('waves');
        else if (r < 0.52) it = pick('fish');
        else if (r < 0.57) it = pick('whirl');
        else if (r < 0.62) it = pick('anchor');
        else if (r < 0.67) it = pick('skull');
        else if (r < 0.72) it = pick('cross');
        else if (r < 0.78) it = { kind: 'label', v: Math.floor(rng() * NAMES.length / 2) * 2 + 1 };
        else it = pick('waves');
      } else it = pick('waves');
      const big = it.kind === 'compass' ? 1.1 : it.kind === 'mount' ? 1.0 + rng() * 0.3 : it.kind === 'label' ? 1 : 0.9 + rng() * 0.3;
      it.scale = big; it.flip = rng() < 0.5;
      return it;
    },

    footprint(it) {
      const sp = this.sprites[it.kind][it.v], k = it.scale;
      return { halfW: sp.W * 0.42 * k, up: sp.by * k * 0.95, down: (sp.H - sp.by) * k * 0.6 + 4 };
    },

    drawItem(ctx, it, g) {
      const sp = this.sprites[it.kind][it.v], k = it.scale * g;
      if (it.flip && it.kind !== 'label' && it.kind !== 'compass') {
        ctx.save(); ctx.translate(it.x, it.y); ctx.scale(-1, 1);
        ctx.drawImage(sp.c, -sp.bx * k, -sp.by * k, sp.W * k, sp.H * k); ctx.restore();
      } else ctx.drawImage(sp.c, it.x - sp.bx * k, it.y - sp.by * k, sp.W * k, sp.H * k);
      if (it.kind === 'compass') this.needle(ctx, it.x, it.y - 40 * k, 30 * k, performance.now());
    },

    // red needle of a compass rose: points at the mouse (idle: slow drift)
    needle(ctx, cx, cy, R, now) {
      const e = this.engine, c = e && e.cursor;
      const a = c && c.on ? Math.atan2(c.sy - cy, c.sx - cx) : Math.sin(now * 0.0004 + cx) * 0.6 - 1.57;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = 'rgba(160,36,24,0.95)'; ctx.beginPath(); ctx.moveTo(R, 0); ctx.lineTo(-R * 0.1, R * 0.12); ctx.lineTo(-R * 0.1, -R * 0.12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(66,38,14,0.9)'; ctx.beginPath(); ctx.moveTo(-R * 0.7, 0); ctx.lineTo(-R * 0.1, R * 0.1); ctx.lineTo(-R * 0.1, -R * 0.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.09, 0, 6.3); ctx.fillStyle = '#e8d3a0'; ctx.fill(); ctx.restore();
    },

    // -------- ground: paper + terrain tint + ink contours + border
    paintGround(ctx, w, h, rng) {
      this.w = w; this.h = h; this.compasses = 0; this.ships = null;
      this.noise = makeNoise(4242);
      const noiseP = makeNoise(77), noiseE = makeNoise(9);
      const dpr = ctx.getTransform ? ctx.getTransform().a : 1;
      // 1. parchment (half resolution, upscaled)
      const pw = Math.ceil(w / 2), ph = Math.ceil(h / 2);
      const pc = document.createElement('canvas'); pc.width = pw; pc.height = ph;
      const px = pc.getContext('2d'), img = px.createImageData(pw, ph), d = img.data;
      const L = [232, 202, 140], D = [186, 142, 78], B = [88, 48, 16];
      const edgeW = Math.min(w, h) * 0.13;
      for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
        const X = i * 2, Y = j * 2, v = noiseP(X / 260, Y / 260, 5), v2 = noiseE(X / 40, Y / 40, 3);
        let c = mix(L, D, Math.min(1, Math.max(0, (v - 0.32) * 2.4)));
        const edge = Math.min(X, Y, w - X, h - Y) / edgeW;
        const burn = Math.pow(Math.max(0, 1 - edge * (0.7 + v2 * 0.9)), 2) * 0.95;
        c = mix(c, B, burn);
        const k = (j * pw + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
      px.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(pc, 0, 0, w, h);
      for (let i = 0; i < 260; i++) {                              // paper fibres
        ctx.strokeStyle = 'rgba(110,70,30,' + (0.04 + rng() * 0.06) + ')'; ctx.lineWidth = 0.7;
        const x0 = rng() * w, y0 = rng() * h, a = rng() * 6.283, l = 4 + rng() * 14;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + Math.cos(a) * l * 0.5 + 2, y0 + Math.sin(a) * l * 0.5, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); ctx.stroke();
      }
      for (let i = 0; i < 9; i++) {                                // water stains
        const x0 = rng() * w, y0 = rng() * h, r = 40 + rng() * 120;
        const g = ctx.createRadialGradient(x0, y0, r * 0.6, x0, y0, r);
        g.addColorStop(0, 'rgba(120,70,20,0)'); g.addColorStop(0.85, 'rgba(120,70,20,0.07)'); g.addColorStop(1, 'rgba(120,70,20,0)');
        ctx.fillStyle = g; ctx.fillRect(x0 - r, y0 - r, r * 2, r * 2);
      }
      ctx.strokeStyle = 'rgba(80,45,15,0.12)'; ctx.lineWidth = 1.5;   // fold creases
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2 + 3, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2 - 2); ctx.stroke();
      // the plain paper is kept: icon patches show it through a hole
      this.paper = document.createElement('canvas'); this.paper.width = ctx.canvas.width; this.paper.height = ctx.canvas.height;
      this.paper.getContext('2d').drawImage(ctx.canvas, 0, 0);

      // 2. terrain tint + contours from a half-res elevation grid, bilinear at full res
      const gw = Math.ceil(w / 2) + 2, gh = Math.ceil(h / 2) + 2, grid = new Float32Array(gw * gh);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) grid[j * gw + i] = this.elev(i * 2, j * 2);
      const W = Math.ceil(w), H = Math.ceil(h), idx = new Uint8Array(W * H), ev = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        const gy = y / 2, j = Math.floor(gy), fy = gy - j;
        for (let xx = 0; xx < W; xx++) {
          const gx = xx / 2, i = Math.floor(gx), fx = gx - i, o = j * gw + i;
          const e = lerp(lerp(grid[o], grid[o + 1], fx), lerp(grid[o + gw], grid[o + gw + 1], fx), fy);
          ev[y * W + xx] = e;
          let n = 0; while (n < LEVELS.length && e > LEVELS[n]) n++;
          idx[y * W + xx] = n;
        }
      }
      const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
      const tx = tc.getContext('2d'), ti = tx.createImageData(W, H), td = ti.data;
      const put = (k, r, g, b, a) => { td[k] = r; td[k + 1] = g; td[k + 2] = b; td[k + 3] = a; };
      let landPx = 0;
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
        const p = y * W + xx, e = ev[p], k = p * 4;
        if (e >= SEA) {
          landPx++;
          const hl = Math.max(0, (e - 0.62) / 0.3);
          put(k, 244 - hl * 90, 222 - hl * 100, 156 - hl * 90, 70 + hl * 55);
        } else {
          const dep = SEA - e;
          put(k, 130, 80, 34, Math.min(120, 36 + 95 * Math.exp(-dep * 22)));
        }
        const a = idx[p], b = xx + 1 < W ? idx[p + 1] : a, c = y + 1 < H ? idx[p + W] : a;
        const lo = Math.min(a, b, c), hi = Math.max(a, b, c);
        if (lo !== hi) {
          const coast = lo <= 3 && hi >= 4;
          if (coast) { put(k, 62, 34, 12, 235); if (xx > 0) put(k - 4, 62, 34, 12, 150); }
          else put(k, 80, 46, 16, hi <= 3 ? 70 : 60);
        }
      }
      tx.putImageData(ti, 0, 0);
      ctx.drawImage(tc, 0, 0, w, h);
      this.landFrac = landPx / (W * H);

      // 3. rhumb lines + border
      ctx.strokeStyle = 'rgba(70,40,14,0.13)'; ctx.lineWidth = 0.8;
      for (const [cx, cy] of [[w * 0.28, h * 0.62], [w * 0.74, h * 0.34]]) {
        ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * w * 1.2, cy + Math.sin(a) * w * 1.2); } ctx.stroke();
      }
      ctx.strokeStyle = inkc(0.85); ctx.lineWidth = 3; ctx.strokeRect(18, 18, w - 36, h - 36);
      ctx.lineWidth = 1; ctx.strokeRect(26, 26, w - 52, h - 52);
      ctx.fillStyle = inkc(0.85);
      for (const [cx, cy] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]]) { ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 6.3); ctx.fill(); }
    },

    // -------- icons: cleared paper patches with ONE irregular inked border per merged group,
    // plus dashed treasure routes between the patches.
    drawIcons(ctx, states, now, eng) {
      const pad = 18, blobs = clusterBlobs(states, pad, 70, 0.24);
      // clusters (union-find) -> centres for the routes
      const par = states.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
      for (const [i, j] of nearPairs(states, 70)) par[find(i)] = find(j);
      const cl = {};
      states.forEach((st, i) => { const r = find(i), c = cl[r] || (cl[r] = { x: 0, y: 0, n: 0, g: 1 }); c.x += st.rect.x + st.rect.w / 2; c.y += st.rect.y + st.rect.h / 2; c.n++; c.g = Math.min(c.g, st.g); });
      const cs = Object.values(cl).map((c) => ({ x: c.x / c.n, y: c.y / c.n, g: c.g }));
      ctx.save();
      if (cs.length > 1) {
        ctx.setLineDash([9, 7]); ctx.lineDashOffset = -now * 0.012; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(150,32,22,0.7)'; ctx.lineWidth = 2.2;
        const seen = new Set();
        cs.forEach((a, i) => {
          let best = -1, bd = 1e9;
          cs.forEach((b, j) => { if (i !== j) { const dd = Math.hypot(a.x - b.x, a.y - b.y); if (dd < bd) { bd = dd; best = j; } } });
          const key = Math.min(i, best) + '-' + Math.max(i, best);
          if (best < 0 || seen.has(key) || bd > 700) return;
          seen.add(key);
          const b = cs[best], g = Math.min(a.g, b.g);
          const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
          ctx.beginPath(); ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(lerp(a.x, mx, g), lerp(a.y, my, g), lerp(a.x, b.x, g), lerp(a.y, b.y, g)); ctx.stroke();
        });
        ctx.setLineDash([]);
      }
      const path = () => { ctx.beginPath(); for (const pts of blobs) { const n = pts.length; ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ctx.closePath(); } };
      path(); ctx.strokeStyle = 'rgba(90,50,20,0.16)'; ctx.lineWidth = 12; ctx.stroke();   // ink bleed
      ctx.strokeStyle = 'rgba(90,50,20,0.28)'; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = inkc(0.95); ctx.lineWidth = 2.6; ctx.stroke();
      ctx.save(); path(); ctx.clip();                                                      // inside = plain empty paper
      if (this.paper) ctx.drawImage(this.paper, 0, 0, eng ? eng.w : this.w, eng ? eng.h : this.h);
      ctx.restore();
      ctx.restore();
    },

    // -------- galleons that sail on the sea and chase the mouse
    drawOverlay(ctx, now, w, h, eng) {
      if (!this.sprites) return;
      if (!this.ships) {
        this.ships = [];
        for (let i = 0; i < 40 && this.ships.length < 3; i++) {
          const x = 60 + Math.random() * (w - 120), y = 60 + Math.random() * (h - 120);
          if (this.elev(x, y) < SEA - 0.06) this.ships.push({ x, y, tx: x, ty: y, v: this.ships.length % 3, trail: [], dir: 1, ph: Math.random() * 9 });
        }
        this.last = now;
      }
      const dt = Math.min(0.06, (now - this.last) / 1000); this.last = now;
      const cu = eng && eng.cursor && eng.cursor.on ? eng.cursor : null;
      const sea = (x, y) => {
        if (x < 50 || y < 50 || x > w - 50 || y > h - 50 || this.elev(x, y) > SEA - 0.035) return false;
        for (const r of eng.icons) if (x > r.x - 50 && x < r.x + r.w + 50 && y > r.y - 50 && y < r.y + r.h + 50) return false;
        return true;
      };
      for (const s of this.ships) {
        if (cu && Math.hypot(cu.sx - s.x, cu.sy - s.y) < 900 && sea(cu.sx, cu.sy)) { s.tx = cu.sx; s.ty = cu.sy; }
        else if (Math.hypot(s.tx - s.x, s.ty - s.y) < 12 || Math.random() < 0.002) {
          for (let k = 0; k < 20; k++) { const a = Math.random() * 6.283, d = 80 + Math.random() * 240; if (sea(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d)) { s.tx = s.x + Math.cos(a) * d; s.ty = s.y + Math.sin(a) * d; break; } }
        }
        const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
        if (d > 24) {
          const sp = cu ? 46 : 22, nx = s.x + dx / d * sp * dt, ny = s.y + dy / d * sp * dt;
          if (sea(nx, ny)) { s.x = nx; s.y = ny; if (Math.abs(dx) > 6) s.dir = dx > 0 ? 1 : -1; }
          else if (sea(s.x + dx / d * sp * dt, s.y)) s.x += dx / d * sp * dt;
          else if (sea(s.x, s.y + dy / d * sp * dt)) s.y += dy / d * sp * dt;
          else { s.tx = s.x; s.ty = s.y; }
        }
        if (!s.trail.length || Math.hypot(s.trail[s.trail.length - 1][0] - s.x, s.trail[s.trail.length - 1][1] - s.y) > 7) { s.trail.push([s.x, s.y + 4]); if (s.trail.length > 14) s.trail.shift(); }
        ctx.lineCap = 'round';
        s.trail.forEach((p, i) => { ctx.strokeStyle = inkc(0.45 * (i / s.trail.length)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p[0] - 4, p[1]); ctx.quadraticCurveTo(p[0], p[1] - 2, p[0] + 4, p[1]); ctx.stroke(); });
        const sp = this.sprites.ship[s.v], bob = Math.sin(now * 0.002 + s.ph) * 1.6, k = 1.05;
        ctx.save(); ctx.translate(s.x, s.y + bob); ctx.rotate(Math.sin(now * 0.0015 + s.ph) * 0.03); ctx.scale(s.dir, 1);
        ctx.drawImage(sp.c, -sp.bx * k, -sp.by * k, sp.W * k, sp.H * k); ctx.restore();
      }
    },
  };

  window.MapTheme = MapTheme;
})();
