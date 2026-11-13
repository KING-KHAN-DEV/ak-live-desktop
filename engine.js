// engine.js - theme-agnostic "grow into the free space" engine.
//
// The engine owns ALL the logic: where items could grow (a stable Poisson-disk
// layout), which of them are blocked by desktop icons, and the grow / shrink
// animations. A theme only supplies visuals (see themes/forest.js):
//
//   theme = {
//     id, name,
//     spacing,                     // Poisson-disk minimum distance between items (px)
//     margin,                      // clear space kept around every icon (px)
//     grow:   { min, max, delay }, // seconds: growth duration range + max random start delay
//     shrink,                      // seconds: how fast items vanish under a newly placed icon
//     prepare(),                   // build sprites etc. (called once)
//     paintGround(ctx, w, h, rng), // draw the static background (called per resize)
//     makeItem(rng, x, y) -> item, // may use the position (e.g. sea vs land)       // random per-item data (size, variant, ...)
//     footprint(item) -> {halfW, up, down}, // area the item occupies, relative to its base point
//     drawItem(ctx, item, g),      // draw one item; g = growth 0..1 (can overshoot a bit)
//
//     // ---- optional hooks (new) ----
//     itemName,                    // word for the debug line ("trees", "flowers", ...)
//     accept(x, y) -> bool,        // veto candidate positions (e.g. map: land only)
//     drawIcon(ctx, rect, g, seed, now), // effect UNDER each desktop icon (clouds, grass patch...)
//     iconGrow,                    // seconds for that effect to grow in
//     animated,                    // true = redraw ~30fps (birds, snow, ...)
//     drawIcons(ctx, states, now, engine), // like drawIcon but ONE call for all icons (neighbours can merge)
//     iconsOnTop,                  // true = icon effects are drawn above the items instead of below
//     drawOverlay(ctx, now, w, h, engine), // always-on animation drawn above everything
//     (engine.cursor = {x, y, sx, sy (smoothed), on}: mouse position for interactions)
//   }
(function () {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Bridson's Poisson-disk sampling: evenly spread, natural-looking points.
  function poisson(x0, y0, x1, y1, r, rng) {
    const k = 24;
    const cell = r / Math.SQRT2;
    const cols = Math.ceil((x1 - x0) / cell);
    const rows = Math.ceil((y1 - y0) / cell);
    const grid = new Int32Array(cols * rows).fill(-1);
    const pts = [];
    const active = [];

    function add(x, y) {
      pts.push({ x, y });
      grid[Math.floor((y - y0) / cell) * cols + Math.floor((x - x0) / cell)] = pts.length - 1;
      active.push(pts.length - 1);
    }
    function fits(x, y) {
      if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
      const cx = Math.floor((x - x0) / cell);
      const cy = Math.floor((y - y0) / cell);
      for (let j = Math.max(0, cy - 2); j <= Math.min(rows - 1, cy + 2); j++) {
        for (let i = Math.max(0, cx - 2); i <= Math.min(cols - 1, cx + 2); i++) {
          const n = grid[j * cols + i];
          if (n >= 0) {
            const dx = pts[n].x - x, dy = pts[n].y - y;
            if (dx * dx + dy * dy < r * r) return false;
          }
        }
      }
      return true;
    }

    add(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
    while (active.length) {
      const ai = Math.floor(rng() * active.length);
      const p = pts[active[ai]];
      let found = false;
      for (let n = 0; n < k; n++) {
        const ang = rng() * Math.PI * 2;
        const rad = r * (1 + rng());
        const x = p.x + Math.cos(ang) * rad;
        const y = p.y + Math.sin(ang) * rad;
        if (fits(x, y)) { add(x, y); found = true; break; }
      }
      if (!found) active.splice(ai, 1);
    }
    return pts;
  }

  // Growing pops out slightly past full size, then settles. Shrinking accelerates.
  function easeOutBack(p) {
    const c1 = 1.1, c3 = c1 + 1, q = p - 1;
    return 1 + c3 * q * q * q + c1 * q * q;
  }
  function easeInCubic(p) { return p * p * p; }

  class Engine {
    constructor(canvas, theme) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ground = document.createElement('canvas');
      this.items = [];
      this.rawIcons = [];   // physical px, relative to the painted area (from the helper)
      this.icons = [];      // CSS px
      this.blocked = [];    // CSS px, icons inflated by the theme margin
      this.debug = false;
      this.status = { attached: true, detail: '' };
      this.dirty = true;
      this.iconStates = []; // per-icon effect state (theme.drawIcon)
      this.toast = ''; this.toastUntil = 0;
      this.cursor = { x: -9999, y: -9999, sx: -9999, sy: -9999, seen: -1e9, on: false };  // CSS px, for interactive themes
      this._last = 0;
      this.w = 0; this.h = 0; this.dpr = 1;
      this._frame = this._frame.bind(this);
      this.setTheme(theme);
      requestAnimationFrame(this._frame);
    }

    setTheme(theme, announce) {
      this.theme = theme;
      theme.engine = this;                 // themes may read engine.cursor / engine.icons anywhere
      this.iconStates = [];
      if (theme.prepare) theme.prepare();
      this.layout();
      if (announce) { this.toast = theme.name; this.toastUntil = performance.now() + 2200; }
    }

    // (Re)build the canvas, the ground and the full set of candidate items.
    layout() {
      const theme = this.theme;
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth, h = window.innerHeight;
      this.dpr = dpr; this.w = w; this.h = h;

      for (const c of [this.canvas, this.ground]) {
        c.width = Math.max(1, Math.round(w * dpr));
        c.height = Math.max(1, Math.round(h * dpr));
      }
      const gctx = this.ground.getContext('2d');
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      theme.paintGround(gctx, w, h, mulberry32(7));

      // Same seed every time -> the forest looks the same on every launch.
      const rng = mulberry32(1337);
      let pts = theme.spacing ? poisson(-30, -10, w + 30, h + 60, theme.spacing, rng) : [];
      if (theme.accept) pts = pts.filter((p) => theme.accept(p.x, p.y));
      const lerp = (a, b, t) => a + (b - a) * t;
      this.items = pts.map((p) => {
        const it = theme.makeItem(rng, p.x, p.y);
        it.x = p.x;
        it.y = p.y;
        it.g = 0;
        it.blocked = null;                                   // unknown yet -> first recompute animates
        it.delay = rng() * theme.grow.delay;                 // staggered start = organic look
        it.growDur = lerp(theme.grow.min, theme.grow.max, rng());
        it.shrinkDelay = rng() * 0.1;
        it.anim = { from: 0, to: 0, start: 0, dur: 1 };
        it.box = theme.footprint(it);
        return it;
      });
      this.items.sort((a, b) => a.y - b.y);                  // draw back-to-front

      this._rebuildBlocked();
      this._recompute(performance.now());
      this._syncIconStates(performance.now());
      this.dirty = true;
    }

    // rects: [{x, y, w, h}] in physical pixels, relative to the painted area.
    setIcons(rects) {
      this.rawIcons = rects || [];
      this._rebuildBlocked();
      this._recompute(performance.now());
      this._syncIconStates(performance.now());
      this.dirty = true;
    }

    // One small state object per icon so theme.drawIcon effects can grow in / out.
    _syncIconStates(now) {
      const theme = this.theme;
      if (!theme.drawIcon && !theme.drawIcons) { this.iconStates = []; return; }
      const dur = (theme.iconGrow || 1.2) * 1000;
      const seen = new Set();
      for (const r of this.icons) {
        const key = Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.w) + ',' + Math.round(r.h);
        seen.add(key);
        let st = this.iconStates.find((s) => s.key === key);
        if (!st) {
          st = { key, rect: r, g: 0, gone: false, born: now, seed: Math.abs((r.x * 73856093) ^ (r.y * 19349663)) % 100000,
                 anim: { from: 0, to: 1, start: now + Math.random() * 250, dur } };
          this.iconStates.push(st);
        } else if (st.gone) {
          st.gone = false;
          st.anim = { from: st.g, to: 1, start: now, dur };
        }
      }
      for (const st of this.iconStates) {
        if (!seen.has(st.key) && !st.gone) {
          st.gone = true;
          st.anim = { from: st.g, to: 0, start: now, dur: 450 };
        }
      }
    }

    // Mouse position in CSS px relative to the painted area (polled by main.js; the window itself
    // never receives mouse events because it sits behind the icons).
    setCursor(x, y) {
      const c = this.cursor, now = performance.now();
      if (!c.on) { c.sx = x; c.sy = y; }
      c.x = x; c.y = y; c.on = true; c.seen = now;
    }

    setStatus(status) { this.status = status; this.dirty = true; }
    toggleDebug() { this.debug = !this.debug; this.dirty = true; }

    _rebuildBlocked() {
      const dpr = this.dpr, m = this.theme.margin;
      this.icons = this.rawIcons.map((r) => ({ x: r.x / dpr, y: r.y / dpr, w: r.w / dpr, h: r.h / dpr }));
      this.blocked = this.icons.map((r) => ({
        x0: r.x - m, y0: r.y - m, x1: r.x + r.w + m, y1: r.y + r.h + m,
      }));
    }

    _isBlocked(it) {
      const x0 = it.x - it.box.halfW, x1 = it.x + it.box.halfW;
      const y0 = it.y - it.box.up, y1 = it.y + it.box.down;
      for (const r of this.blocked) {
        if (x0 < r.x1 && x1 > r.x0 && y0 < r.y1 && y1 > r.y0) return true;
      }
      return false;
    }

    // Decide which items should be visible; start animations only for those that changed.
    _recompute(now) {
      const theme = this.theme;
      for (const it of this.items) {
        const b = this._isBlocked(it);
        if (b === it.blocked) continue;
        it.blocked = b;
        const a = it.anim;
        a.from = it.g;
        a.to = b ? 0 : 1;
        if (b) { a.start = now + it.shrinkDelay * 1000; a.dur = theme.shrink * 1000; }
        else   { a.start = now + it.delay * 1000;       a.dur = it.growDur * 1000; }
      }
    }

    _update(now) {
      let animating = false;
      for (const it of this.items) {
        const a = it.anim;
        if (a.from === a.to) { it.g = a.to; continue; }
        const p = (now - a.start) / a.dur;
        if (p <= 0) { it.g = a.from; animating = true; continue; }
        if (p >= 1) { it.g = a.to; a.from = a.to; continue; }
        const e = a.to > a.from ? easeOutBack(p) : easeInCubic(p);
        it.g = a.from + (a.to - a.from) * e;
        animating = true;
      }
      for (const st of this.iconStates) {
        const a = st.anim;
        if (a.from === a.to) { st.g = a.to; continue; }
        const p = (now - a.start) / a.dur;
        if (p <= 0) { st.g = a.from; animating = true; continue; }
        if (p >= 1) { st.g = a.to; a.from = a.to; continue; }
        const e = a.to > a.from ? easeOutBack(p) : easeInCubic(p);
        st.g = a.from + (a.to - a.from) * e;
        animating = true;
      }
      this.iconStates = this.iconStates.filter((st) => !(st.gone && st.g <= 0 && st.anim.from === st.anim.to));
      return animating;
    }

    _frame(now) {
      const c = this.cursor;
      if (c.on) { c.sx += (c.x - c.sx) * 0.2; c.sy += (c.y - c.sy) * 0.2; }
      const animating = this._update(now);
      const ambient = this.theme.animated && now - this._last >= 33;   // ~30 fps for birds, snow...
      if (animating || this.dirty || ambient || now < this.toastUntil) {  // idle + static theme = no drawing
        this._render(now);
        this._last = now;
        this.dirty = false;
      }
      requestAnimationFrame(this._frame);
    }

    _render(now) {
      const ctx = this.ctx, dpr = this.dpr, theme = this.theme;
      now = now || performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(this.ground, 0, 0, this.w, this.h);
      const under = () => {
        if (theme.drawIcons) {                  // ONE call for ALL icons -> themes can merge neighbours
          const live = this.iconStates.filter((st) => st.g > 0.004);
          if (live.length) { ctx.save(); theme.drawIcons(ctx, live, now, this); ctx.restore(); }
        } else if (theme.drawIcon) {
          for (const st of this.iconStates) {
            if (st.g > 0.004) { ctx.save(); theme.drawIcon(ctx, st.rect, st.g, st.seed, now); ctx.restore(); }
          }
        }
      };
      if (!theme.iconsOnTop) under();
      for (const it of this.items) {
        if (it.g > 0.004) theme.drawItem(ctx, it, it.g);
      }
      if (theme.iconsOnTop) under();                 // e.g. a cleared patch that covers anything near the icons
      if (theme.drawOverlay) { ctx.save(); theme.drawOverlay(ctx, now, this.w, this.h, this); ctx.restore(); }
      if (this.debug) this._drawDebug(ctx);
      this._drawStatus(ctx);
      this._drawToast(ctx, now);
    }

    _drawToast(ctx, now) {
      if (now >= this.toastUntil || !this.toast) return;
      const a = Math.min(1, (this.toastUntil - now) / 600);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '600 22px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(this.toast).width + 44;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(this.w / 2 - tw / 2, this.h - 120, tw, 44, 22);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(this.toast, this.w / 2, this.h - 91);
      ctx.restore();
    }

    _drawDebug(ctx) {
      const lw = 2 / this.dpr;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = lw;
      ctx.strokeStyle = 'rgba(255, 220, 80, 0.9)';
      for (const r of this.blocked) ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ff4d4d';
      ctx.fillStyle = 'rgba(255, 60, 60, 0.18)';
      for (const r of this.icons) {
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x + lw / 2, r.y + lw / 2, r.w - lw, r.h - lw);
      }
      ctx.restore();
    }

    _drawStatus(ctx) {
      const s = this.status;
      if (!this.debug && s.attached) return;   // normal mode: stay invisible
      const fit = s.fit;
      const perfect = fit && fit.every((v) => v === 0);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '15px Segoe UI, sans-serif';
      ctx.fillStyle = s.attached ? '#7dff9b' : '#ffb04d';
      ctx.fillText((s.attached ? 'Attached behind icons: ' : 'NOT attached: ') + s.detail,
        this.w / 2, this.h - 74);
      ctx.fillStyle = perfect ? '#7dff9b' : '#ffd24d';
      ctx.fillText(perfect ? 'Fit: pixel-perfect fullscreen'
        : 'Fit error (l, t, r, b px): ' + (fit ? fit.join(', ') : 'n/a'), this.w / 2, this.h - 52);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const shown = this.items.filter((i) => i.g > 0.5).length;
      ctx.fillText(this.icons.length + ' icons | ' + shown + '/' + this.items.length +
        (' ' + (this.theme.itemName || 'items') + ' grown | Ctrl+Alt+←/→ theme | Ctrl+Alt+D debug | Ctrl+Alt+Q quit'), this.w / 2, this.h - 30);
      ctx.restore();
    }
  }

  window.Engine = Engine;
  window.mulberry32 = mulberry32;
})();
