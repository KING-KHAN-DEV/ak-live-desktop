// app.js - wires the engine to the Electron bridge (see preload.js) and handles theme switching.
const THEMES = [ForestTheme, WinterTheme, MeadowTheme, MapTheme, SkyTheme, CityTheme, CircuitTheme, CaveTheme];

let themeIndex = 0;
try {
  const saved = localStorage.getItem('live-desktop-theme');
  const i = THEMES.findIndex((t) => t.id === saved);
  if (i >= 0) themeIndex = i;
} catch { /* storage unavailable: start with the first theme */ }

const engine = new Engine(document.getElementById('c'), THEMES[themeIndex]);

function switchTheme(step) {
  themeIndex = (themeIndex + step + THEMES.length) % THEMES.length;
  try { localStorage.setItem('live-desktop-theme', THEMES[themeIndex].id); } catch { /* ignore */ }
  engine.setTheme(THEMES[themeIndex], true);   // true = show the theme name for a moment
}

window.desktop.onIcons((rects) => engine.setIcons(rects));
window.desktop.onStatus((status) => engine.setStatus(status));
window.desktop.onToggleDebug(() => engine.toggleDebug());
window.desktop.onCursor((p) => engine.setCursor(p.x, p.y));
window.desktop.onTheme((step) => switchTheme(step));

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => engine.layout(), 200);
});
