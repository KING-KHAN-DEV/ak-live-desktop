// main.js - Electron entry point for the live-desktop app.
// Starts the Python helper, creates a fullscreen window, asks the helper to pin it
// behind the desktop icons, and forwards icon rectangles (physical pixels) to the page.

const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;
let helper = null;
let lastIcons = [];
let lastStatus = { attached: false, detail: 'waiting for helper...' };

function sendToPage(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function startHelper() {
  helper = spawn('python', ['-u', path.join(__dirname, 'helper.py')], {
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
  });

  helper.on('error', (err) => {
    lastStatus = { attached: false, detail: 'could not start Python: ' + err.message };
    console.error(lastStatus.detail);
    sendToPage('status', lastStatus);
  });

  const lines = readline.createInterface({ input: helper.stdout });
  lines.on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }

    if (msg.type === 'icons') {
      // Physical pixels, relative to the painted area. The page converts them
      // with its own devicePixelRatio, so no guessing about scale factors here.
      lastIcons = msg.rects;
      sendToPage('icons', lastIcons);
    } else if (msg.type === 'status') {
      lastStatus = msg;
      console.log('[helper]', msg.attached ? 'attached:' : 'NOT attached:', msg.detail,
        'fit error (px):', JSON.stringify(msg.fit));
      sendToPage('status', lastStatus);
    } else if (msg.type === 'error') {
      console.error('[helper error]', msg.message);
      sendToPage('status', { ...lastStatus, detail: 'error: ' + msg.message });
    }
  });
}

function createWindow() {
  const bounds = screen.getPrimaryDisplay().bounds;

  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    thickFrame: false,   // no invisible resize border eating into the painted area
    show: false,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    backgroundColor: '#0b1a10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  win.webContents.on('did-finish-load', () => {
    sendToPage('icons', lastIcons);
    sendToPage('status', lastStatus);
  });

  win.once('ready-to-show', () => {
    win.showInactive();
    const handle = win.getNativeWindowHandle();
    const hwnd = handle.length >= 8 ? handle.readBigUInt64LE(0) : BigInt(handle.readUInt32LE(0));
    helper.stdin.write(JSON.stringify({ cmd: 'attach', hwnd: hwnd.toString() }) + '\n');
  });
}

app.whenReady().then(() => {
  startHelper();
  createWindow();
  // The window is behind everything, so give yourself a way out.
  // The window sits behind the icons and never gets mouse events, so poll the cursor instead
  // (cheap: only sends when it moved) and let interactive themes react to it.
  let lastCx = -1, lastCy = -1;
  setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint(), b = win.getBounds();
    const x = p.x - b.x, y = p.y - b.y;
    if (x === lastCx && y === lastCy) return;
    lastCx = x; lastCy = y;
    sendToPage('cursor', { x, y });
  }, 33);
  globalShortcut.register('Control+Alt+Q', () => app.quit());
  // Debug view: shows icon boxes (red) and the cleared zones around them (yellow).
  globalShortcut.register('Control+Alt+D', () => sendToPage('toggle-debug'));
  // Switch themes: Ctrl+Alt+Right / T = next, Ctrl+Alt+Left = previous.
  globalShortcut.register('Control+Alt+Right', () => sendToPage('theme', 1));
  globalShortcut.register('Control+Alt+T', () => sendToPage('theme', 1));
  globalShortcut.register('Control+Alt+Left', () => sendToPage('theme', -1));
});

app.on('before-quit', () => {
  // Closing the pipe tells the helper to clean up and exit.
  try { helper.stdin.end(); } catch { /* already gone */ }
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
