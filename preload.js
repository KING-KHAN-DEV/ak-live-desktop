const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  onIcons: (callback) => ipcRenderer.on('icons', (_event, rects) => callback(rects)),
  onStatus: (callback) => ipcRenderer.on('status', (_event, status) => callback(status)),
  onToggleDebug: (callback) => ipcRenderer.on('toggle-debug', () => callback()),
  onCursor: (callback) => ipcRenderer.on('cursor', (_event, p) => callback(p)),
  onTheme: (callback) => ipcRenderer.on('theme', (_event, step) => callback(step)),
});
