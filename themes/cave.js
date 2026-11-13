// themes/cave.js - Crystal cave in the dark.
// * Free space: glowing crystal clusters, bioluminescent mushrooms, stalagmites and rocks.
// * Under icons: a warm lantern glow with a rune ring. Glows of close icons melt into ONE light.
// * Interaction: the mouse is your headlamp - the cave is dark except where you shine. Crystals
//   resonate (glow brighter) when the lamp is near, bats flee from the light, fireflies drift.
(function () {
  const { lerp, sprite, makeNoise, nearPairs, Flyers } = window.Kit;
  const BX = 45, BY = 90, W = 90, H = 100;
  const HUES = [[70, 220, 255], [190, 110, 255], [90, 255, 160], [255, 190, 80], [255, 110, 190]];
  const J = (rng, a) => (rng() - 0.5) * a;
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const shade = (c, k) => [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];

  function crystals(x, rng, hue) {
    const n = 3 + Math.floor(rng() * 3), list = [];
    for (let i = 0; i < n; i++) list.push({ dx: (i - (n - 1) / 2) * 12 + J(rng, 6), h: 28 + rng() * 42, w: 7 + rng() * 5, tilt: J(rng, 0.5) });
    list.sort((a, b) => a.h - b.h);
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.ellipse(BX, BY + 1, 28, 6, 0, 0, 6.3); x.fill();
    for (const p of list.reverse()) {
      x.save(); x.translate(BX + p.dx, BY); x.rotate(p.tilt);
      const w = p.w, h = p.h, tip = h + w * 1.3;
      x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w, -h); x.lineTo(0, -tip); x.lineTo(0, 0); x.closePath(); x.fillStyle = rgba(shade(hue, 0.95), 0.95); x.fill();
      x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -tip); x.lineTo(w, -h); x.lineTo(w, 0); x.closePath(); x.fillStyle = rgba(shade(hue, 0.5), 0.95); x.fill();
      x.beginPath(); x.moveTo(-w, -h); x.lineTo(0, -tip); x.lineTo(w, -h); x.lineTo(0, -h - w * 0.45); x.closePath(); x.fillStyle = rgba([255, 255, 255], 0.55); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-w + 2, -4); x.lineTo(-w + 2, -h + 2); x.stroke();
      x.restore();
    }
  }
  function mushroom(x, rng, hue) {
    for (let i = 0; i < 3; i++) {
      const cx = BX + (i - 1) * 16 + J(rng, 4), h = 14 + rng() * 16, r = 8 + rng() * 6;
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(cx, BY + 1, r, 3, 0, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(200,210,215,0.9)'; x.fillRect(cx - 2.2, BY - h, 4.4, h);
      const g = x.createRadialGradient(cx - r * 0.3, BY - h - r * 0.3, 1, cx, BY - h, r * 1.2); g.addColorStop(0, rgba(shade(hue, 1.1), 1)); g.addColorStop(1, rgba(shade(hue, 0.45), 1));
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, BY - h, r, r * 0.7, 0, Math.PI, 0); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(cx + J(rng, r), BY - h - rng() * r * 0.5, 1.2, 0, 6.3); x.fill(); }
    }
  }
  function stalag(x, rng) {
    for (let i = 0; i < 2; i++) {
      const cx = BX + (i ? 12 : -8) + J(rng, 4), h = (i ? 26 : 44) + rng() * 14, w = 11 + rng() * 4;
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(cx, BY + 1, w + 2, 4, 0, 0, 6.3); x.fill();
      x.beginPath(); x.moveTo(cx - w, BY); x.quadraticCurveTo(cx - w * 0.5, BY - h * 0.6, cx + J(rng, 3), BY - h); x.quadraticCurveTo(cx + w * 0.5, BY - h * 0.6, cx + w, BY); x.closePath();
      const g = x.createLinearGradient(cx - w, 0, cx + w, 0); g.addColorStop(0, '#6d6678'); g.addColorStop(1, '#2c2833'); x.fillStyle = g; x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - w * 0.4, BY - 4); x.lineTo(cx - 1, BY - h + 4); x.stroke();
    }
  }
  function rock(x, rng) {
    for (let i = 0; i < 3; i++) {
      const cx = BX + (i - 1) * 15 + J(rng, 6), r = 6 + rng() * 7;
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(cx + 1, BY + 1, r + 2, 3, 0, 0, 6.3); x.fill();
      x.beginPath(); for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.283, rr = r * (0.8 + rng() * 0.3); x.lineTo(cx + Math.cos(a) * rr, BY - r * 0.6 + Math.sin(a) * rr * 0.65); } x.closePath();
      const g = x.createLinearGradient(cx - r, BY - r, cx + r, BY); g.addColorStop(0, '#7a7384'); g.addColorStop(1, '#2e2a35'); x.fillStyle = g; x.fill();
    }
  }
  function mk(n, fn, seed, hueIdx) { const out = []; for (let i = 0; i < n; i++) { const sp = sprite(W, H, 2); fn(sp.x, window.mulberry32(seed + i * 71), HUES[(hueIdx === undefined ? i : hueIdx) % HUES.length]); out.push(sp.c); } return out; }

  function drawBat(ctx, f, now) {
    const s = f.size, fl = Math.sin(now * 0.001 * f.rate + f.phase), wing = 0.5 + 0.5 * fl;
    ctx.translate(f.x, f.y); ctx.rotate(f.ang); ctx.fillStyle = '#05060a';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, side * s * 0.05);
      ctx.quadraticCurveTo(s * 0.25, side * s * (0.3 + wing * 0.35), s * 0.05, side * s * (0.6 + wing * 0.2));
      ctx.quadraticCurveTo(-s * 0.05, side * s * 0.38, -s * 0.18, side * s * 0.55); ctx.quadraticCurveTo(-s * 0.28, side * s * 0.3, -s * 0.3, side * s * 0.08); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.22, s * 0.09, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.24, 0, s * 0.07, 0, 6.3); ctx.fill();
  }

  const CaveTheme = {
    id: 'cave',
    name: 'Crystal Cave',
    itemName: 'crystals & stones',
    spacing: 62,
    margin: 24,
    grow: { min: 1.2, max: 2.2, delay: 1.4 },
    shrink: 0.3,
    iconGrow: 1.3,
    animated: true,
    sprites: null, dark: null, flies: null, bats: null,

    prepare() {
      if (!this.sprites) this.sprites = { crystal: mk(10, crystals, 11), mush: mk(5, mushroom, 61), stalag: mk(4, stalag, 121), rock: mk(3, rock, 171) };
      this.bats = new Flyers({
        count: 5, size: [16, 34], speed: [60, 140], turn: 3, rate: [14, 20], draw: drawBat,
        steer(f, dt, now, eng) {                                   // bats hate the light
          const c = eng && eng.cursor; if (!c || !c.on) return;
          const dx = f.x - c.sx, dy = f.y - c.sy, d = Math.hypot(dx, dy);
          if (d < 280) { let da = Math.atan2(dy, dx) - f.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); f.ang += da * Math.min(1, dt * 4 * (1 - d / 280)); }
        },
      });
      this.flies = null;
    },
    makeItem(rng) {
      const r = rng(), S = this.sprites, kind = r < 0.4 ? 'crystal' : r < 0.58 ? 'mush' : r < 0.82 ? 'stalag' : 'rock';
      const v = Math.floor(rng() * S[kind].length);
      return { kind, v, scale: 0.85 + rng() * 0.4, hue: kind === 'crystal' ? HUES[v % HUES.length] : kind === 'mush' ? HUES[(v + 1) % HUES.length] : null };
    },
    footprint(it) { const o = { crystal: [26, 78], mush: [28, 40], stalag: [24, 58], rock: [24, 22] }[it.kind]; return { halfW: o[0] * it.scale, up: o[1] * it.scale, down: 8 * it.scale }; },
    drawItem(ctx, it, g) { const k = it.scale * g; ctx.drawImage(this.sprites[it.kind][it.v], it.x - BX * k, it.y - BY * k, W * k, H * k); },

    paintGround(ctx, w, h, rng) {
      const n = makeNoise(61), n2 = makeNoise(62), pw = Math.ceil(w / 2), ph = Math.ceil(h / 2);
      const pc = document.createElement('canvas'); pc.width = pw; pc.height = ph;
      const px = pc.getContext('2d'), img = px.createImageData(pw, ph), d = img.data;
      for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
        const X = i * 2, Y = j * 2, v = n(X / 120, Y / 120, 5), v2 = n2(X / 30, Y / 30, 3), k = (j * pw + i) * 4, s = 0.55 + v * 0.8 + (v2 - 0.5) * 0.3;
        d[k] = 44 * s; d[k + 1] = 40 * s; d[k + 2] = 56 * s; d[k + 3] = 255;
      }
      px.putImageData(img, 0, 0); ctx.drawImage(pc, 0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';          // cracks
      for (let i = 0; i < 40; i++) { let x = rng() * w, y = rng() * h; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += J(rng, 50); y += rng() * 26; ctx.lineTo(x, y); } ctx.stroke(); }
      for (let i = 0; i < 260; i++) { const x = rng() * w, y = rng() * h, r = 1 + rng() * 3; ctx.fillStyle = 'rgba(' + (70 + rng() * 40) + ',' + (64 + rng() * 40) + ',' + (84 + rng() * 40) + ',0.55)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, 6.3); ctx.fill(); }
    },

    // lantern light + rune ring per icon; additive glows overlap, so close icons make ONE light
    drawIcons(ctx, states, now, eng) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fl = 0.9 + 0.1 * Math.sin(now * 0.007) + 0.05 * Math.sin(now * 0.017);
      const spots = [];
      for (const st of states) { const r = st.rect; spots.push([r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.5 + 70, st.g]); }
      for (const [i, j] of nearPairs(states, 70)) {
        const a = states[i].rect, b = states[j].rect, ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2, n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 40));
        for (let k = 1; k < n; k++) spots.push([lerp(ax, bx, k / n), lerp(ay, by, k / n), 80, Math.min(states[i].g, states[j].g)]);
      }
      for (const [x, y, r, g] of spots) {
        const R = r * g * (0.97 + 0.03 * fl), gr = ctx.createRadialGradient(x, y, 0, x, y, R);
        gr.addColorStop(0, 'rgba(255,190,100,' + (0.22 * fl) + ')'); gr.addColorStop(0.5, 'rgba(255,140,60,0.12)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      }
      for (const st of states) {                                    // slowly turning rune ring
        const r = st.rect, cx = r.x + r.w / 2, cy = r.y + r.h / 2, rx = (r.w / 2 + 16) * st.g, ry = (r.h / 2 + 16) * st.g;
        ctx.strokeStyle = 'rgba(255,205,130,' + (0.45 * st.g) + ')'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 9]); ctx.lineDashOffset = -now * 0.01;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.3); ctx.stroke();
        ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,205,130,' + (0.2 * st.g) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy, rx + 6, ry + 6, 0, 0, 6.3); ctx.stroke();
      }
      ctx.restore();
    },

    drawOverlay(ctx, now, w, h, eng) {
      const c = eng.cursor, lamp = c && c.on;
      this.bats.draw(ctx, now, w, h, eng);                          // bats are drawn first: only the lit ones can be seen
      // darkness with light holes
      if (!this.dark || this.dark.width !== Math.round(w) || this.dark.height !== Math.round(h)) { this.dark = document.createElement('canvas'); this.dark.width = Math.round(w); this.dark.height = Math.round(h); }
      const dc = this.dark.getContext('2d');
      dc.globalCompositeOperation = 'source-over'; dc.clearRect(0, 0, w, h); dc.fillStyle = 'rgba(3,4,9,0.86)'; dc.fillRect(0, 0, w, h);
      dc.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => { const g = dc.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.6 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); dc.fillStyle = g; dc.fillRect(x - r, y - r, r * 2, r * 2); };
      if (lamp) hole(c.sx, c.sy, 250 + Math.sin(now * 0.004) * 6, 1);
      for (const st of eng.iconStates) { const r = st.rect; hole(r.x + r.w / 2, r.y + r.h / 2, (Math.max(r.w, r.h) * 0.5 + 120) * st.g, 0.95); }
      for (const it of eng.items) if (it.g > 0.3 && it.hue) hole(it.x, it.y - 20 * it.scale, 90 * it.scale * it.g, it.kind === 'crystal' ? 0.85 : 0.65);
      ctx.drawImage(this.dark, 0, 0, w, h);
      // coloured glows on top: crystals resonate near the lamp
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const it of eng.items) {
        if (it.g < 0.3 || !it.hue) continue;
        const prox = lamp ? Math.max(0, 1 - Math.hypot(c.sx - it.x, c.sy - it.y) / 300) : 0;
        const a = (0.16 + 0.32 * prox + 0.05 * Math.sin(now * 0.002 + it.x)) * Math.min(1, it.g), R = (60 + 40 * prox) * it.scale;
        const gr = ctx.createRadialGradient(it.x, it.y - 24 * it.scale, 0, it.x, it.y - 24 * it.scale, R);
        gr.addColorStop(0, rgba(it.hue, a)); gr.addColorStop(1, rgba(it.hue, 0));
        ctx.fillStyle = gr; ctx.fillRect(it.x - R, it.y - 24 * it.scale - R, R * 2, R * 2);
      }
      if (lamp) { const g = ctx.createRadialGradient(c.sx, c.sy, 0, c.sx, c.sy, 240); g.addColorStop(0, 'rgba(255,230,180,0.14)'); g.addColorStop(1, 'rgba(255,230,180,0)'); ctx.fillStyle = g; ctx.fillRect(c.sx - 240, c.sy - 240, 480, 480); }
      if (!this.flies) { this.flies = []; for (let i = 0; i < 26; i++) this.flies.push({ x: Math.random() * w, y: Math.random() * h, a: Math.random() * 6.28, ph: Math.random() * 9 }); }
      for (const f of this.flies) {                                  // fireflies
        f.a += (Math.sin(now * 0.0007 + f.ph) * 0.8) * 0.03; f.x += Math.cos(f.a) * 0.35; f.y += Math.sin(f.a) * 0.35;
        if (f.x < -10) f.x = w + 10; if (f.x > w + 10) f.x = -10; if (f.y < -10) f.y = h + 10; if (f.y > h + 10) f.y = -10;
        const b = Math.max(0, Math.sin(now * 0.0016 + f.ph * 3)); if (b < 0.05) continue;
        const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9); gr.addColorStop(0, 'rgba(210,255,150,' + (0.9 * b) + ')'); gr.addColorStop(1, 'rgba(210,255,150,0)');
        ctx.fillStyle = gr; ctx.fillRect(f.x - 9, f.y - 9, 18, 18);
      }
      ctx.restore();
    },
  };

  window.CaveTheme = CaveTheme;
})();
