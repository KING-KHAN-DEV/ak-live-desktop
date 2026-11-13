# live-desktop

Most live wallpapers are looping videos. **live-desktop** is an interactive, procedurally generated
wallpaper for Windows that reacts to your **desktop icons** and your **cursor**.

Drag an icon across the screen and the wallpaper reshapes itself around it: trees clear and regrow,
clouds gather under icons, and the inked borders on the map redraw and link themselves.

![demo](docs/demo.gif)

## Themes

Forest · Snowy Winter · Grass & Flowers · Old Parchment Map · Sky from Above · Pencil Town · Circuit Board · Crystal Cave

Every theme is generated live in code. There are no video or image files.

<!-- Add one screenshot per theme here -->

## How it works

1. An **Electron** window with a full-screen canvas is re-parented into the Windows desktop window
   hierarchy, directly *behind* the desktop icons layer.
2. A small **Python** helper (standard library only, via `ctypes`) reads the desktop `ListView` and reports
   the pixel rectangle of every icon whenever one appears, disappears or moves.
3. The engine keeps a map of free space versus icon rectangles. Items (trees, flowers, buildings...) are laid
   out with Poisson-disk sampling, grow into free space and shrink away from icons. Nearby icons can be merged
   into one effect (a shared cloud, patch or border).
4. The window sits behind the icons and gets no mouse events, so the cursor position is polled and passed to
   the themes (for example, things that follow or glow near the cursor).

## Requirements

- Windows 10 or 11 (the window trick uses Windows internals; it does not work on macOS or Linux)
- [Node.js](https://nodejs.org/) (LTS)
- [Python 3](https://www.python.org/) available on PATH as `python`. No pip packages needed.

## Run

```
npm install
npm start
```

## Hotkeys

The window sits behind everything, so there is no close button. Use the hotkeys:

| Keys | Action |
| --- | --- |
| `Ctrl+Alt+Right` / `Ctrl+Alt+T` | Next theme |
| `Ctrl+Alt+Left` | Previous theme |
| `Ctrl+Alt+D` | Toggle debug overlay (icon boxes, fit info) |
| `Ctrl+Alt+Q` | **Quit** |

If it ever gets stuck, run `taskkill /F /IM electron.exe` in a terminal.

## Add a theme

A theme is one self-contained file in `themes/`. The engine does all of the logic (placement, icon
avoidance, grow/shrink animation); a theme only supplies visuals. The full list of hooks is documented at the
top of [`engine.js`](engine.js).

1. Copy a small theme (for example `themes/forest.js`) to `themes/mytheme.js`.
2. Change its `id`, `name` and drawing code, and export it with `window.MyTheme = MyTheme;`.
3. Register it with one `<script src="themes/mytheme.js"></script>` line in `index.html` and one entry in
   the `THEMES` array in `app.js`.

Helpers shared by the themes (colors, sprites, shadows) live in `themes/common.js`.

## Known issues

- **Windows only.**
- Single monitor only. Cursor tracking and the fit assume the primary monitor.
- Tested on Windows 11 (including the 24H2 desktop layout). Other Windows versions and unusual DPI setups
  are untested, so please open an issue with what you see.
- Some themes redraw continuously, which uses more battery on laptops.

## License

[MIT](LICENSE)
