"""
helper.py - Windows helper for the live-desktop app.

Talks to Electron over stdin/stdout using one JSON object per line.

  Electron -> helper:  {"cmd": "attach", "hwnd": "123456"}
  helper -> Electron:  {"type": "icons", "rects": [{"x":..,"y":..,"w":..,"h":..}, ...]}
                       {"type": "status", "attached": true, "detail": "...",
                        "fit": [dl, dt, dr, db], "screen": [W, H]}
                       {"type": "error", "message": "..."}

All coordinates are PHYSICAL pixels, relative to the area Chromium actually paints.

Jobs:
  1. Pin the Electron window BEHIND the desktop icons (Progman / WorkerW trick,
     with support for the Windows 11 24H2+ window layout).
  2. Fit the painted area to the screen EXACTLY (measure -> correct -> repeat),
     and keep re-checking it.
  3. Watch the desktop icons and report their pixel rectangles when they change.

When Electron exits, stdin closes, and this helper cleans up and exits too.
"""
import ctypes
import ctypes.wintypes as wt
import json
import queue
import sys
import threading
import time

# Report real pixel coordinates regardless of Windows display scaling.
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

user32 = ctypes.WinDLL("user32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

WNDENUMPROC = ctypes.WINFUNCTYPE(wt.BOOL, wt.HWND, wt.LPARAM)

# 64-bit safe signatures
user32.FindWindowW.restype = wt.HWND
user32.FindWindowW.argtypes = [wt.LPCWSTR, wt.LPCWSTR]
user32.FindWindowExW.restype = wt.HWND
user32.FindWindowExW.argtypes = [wt.HWND, wt.HWND, wt.LPCWSTR, wt.LPCWSTR]
user32.SendMessageW.restype = ctypes.c_ssize_t
user32.SendMessageW.argtypes = [wt.HWND, wt.UINT, ctypes.c_size_t, ctypes.c_void_p]
user32.SendMessageTimeoutW.restype = ctypes.c_ssize_t
user32.SendMessageTimeoutW.argtypes = [wt.HWND, wt.UINT, ctypes.c_size_t, ctypes.c_ssize_t,
                                       wt.UINT, wt.UINT, ctypes.POINTER(ctypes.c_size_t)]
user32.GetWindowThreadProcessId.argtypes = [wt.HWND, ctypes.POINTER(wt.DWORD)]
user32.ClientToScreen.argtypes = [wt.HWND, ctypes.POINTER(wt.POINT)]
user32.ScreenToClient.argtypes = [wt.HWND, ctypes.POINTER(wt.POINT)]
user32.SetParent.restype = wt.HWND
user32.SetParent.argtypes = [wt.HWND, wt.HWND]
user32.GetParent.restype = wt.HWND
user32.GetParent.argtypes = [wt.HWND]
user32.GetWindowLongPtrW.restype = ctypes.c_ssize_t
user32.GetWindowLongPtrW.argtypes = [wt.HWND, ctypes.c_int]
user32.SetWindowLongPtrW.restype = ctypes.c_ssize_t
user32.SetWindowLongPtrW.argtypes = [wt.HWND, ctypes.c_int, ctypes.c_ssize_t]
user32.SetWindowPos.restype = wt.BOOL
user32.SetWindowPos.argtypes = [wt.HWND, wt.HWND, ctypes.c_int, ctypes.c_int,
                                ctypes.c_int, ctypes.c_int, wt.UINT]
user32.GetSystemMetrics.argtypes = [ctypes.c_int]
user32.IsWindow.argtypes = [wt.HWND]
user32.EnumWindows.argtypes = [WNDENUMPROC, wt.LPARAM]
user32.EnumChildWindows.argtypes = [wt.HWND, WNDENUMPROC, wt.LPARAM]
user32.GetClassNameW.argtypes = [wt.HWND, wt.LPWSTR, ctypes.c_int]
user32.GetWindowRect.argtypes = [wt.HWND, ctypes.POINTER(wt.RECT)]
user32.GetClientRect.argtypes = [wt.HWND, ctypes.POINTER(wt.RECT)]
user32.SystemParametersInfoW.argtypes = [wt.UINT, wt.UINT, ctypes.c_void_p, wt.UINT]

kernel32.OpenProcess.restype = wt.HANDLE
kernel32.OpenProcess.argtypes = [wt.DWORD, wt.BOOL, wt.DWORD]
kernel32.VirtualAllocEx.restype = ctypes.c_void_p
kernel32.VirtualAllocEx.argtypes = [wt.HANDLE, ctypes.c_void_p, ctypes.c_size_t, wt.DWORD, wt.DWORD]
kernel32.VirtualFreeEx.argtypes = [wt.HANDLE, ctypes.c_void_p, ctypes.c_size_t, wt.DWORD]
kernel32.WriteProcessMemory.argtypes = [wt.HANDLE, ctypes.c_void_p, ctypes.c_void_p,
                                        ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
kernel32.ReadProcessMemory.argtypes = [wt.HANDLE, ctypes.c_void_p, ctypes.c_void_p,
                                       ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
kernel32.CloseHandle.argtypes = [wt.HANDLE]

LVM_GETITEMCOUNT = 0x1004
LVM_GETITEMRECT = 0x100E
LVIR_BOUNDS = 0  # icon + label

PROCESS_ACCESS = 0x0008 | 0x0010 | 0x0020 | 0x0400
MEM_COMMIT_RESERVE = 0x3000
MEM_RELEASE = 0x8000
PAGE_READWRITE = 0x04

GWL_STYLE = -16
WS_CHILD = 0x40000000
WS_POPUP = 0x80000000
WS_VISIBLE = 0x10000000
WS_CAPTION = 0x00C00000
WS_THICKFRAME = 0x00040000
SWP_NOACTIVATE = 0x0010
SWP_FRAMECHANGED = 0x0020
SWP_SHOWWINDOW = 0x0040


def send(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


# --------------------------------------------------------------------------
# Part 1: measure where Chromium really paints, and fit it to the screen
# --------------------------------------------------------------------------
def content_rect(hwnd):
    """Screen rectangle (l, t, r, b) of the area Chromium actually paints into."""
    found = []

    def on_child(child, _):
        buf = ctypes.create_unicode_buffer(64)
        user32.GetClassNameW(child, buf, 64)
        if buf.value == "Chrome_RenderWidgetHostHWND":
            found.append(child)
            return False
        return True

    proc = WNDENUMPROC(on_child)
    user32.EnumChildWindows(hwnd, proc, 0)

    r = wt.RECT()
    if found:
        user32.GetWindowRect(found[0], ctypes.byref(r))
        if (r.right - r.left) > 100 and (r.bottom - r.top) > 100:
            return r.left, r.top, r.right, r.bottom

    # Fallback: the window's own client area.
    user32.GetClientRect(hwnd, ctypes.byref(r))
    origin = wt.POINT(0, 0)
    user32.ClientToScreen(hwnd, ctypes.byref(origin))
    return origin.x, origin.y, origin.x + r.right, origin.y + r.bottom


def fit_to_screen(state):
    """Move/resize the window until the painted area equals the screen exactly."""
    hwnd, parent, insert_after = state["hwnd"], state["parent"], state["insert_after"]
    W = user32.GetSystemMetrics(0)  # SM_CXSCREEN (physical pixels)
    H = user32.GetSystemMetrics(1)  # SM_CYSCREEN

    # Where the screen's top-left corner is, in the parent window's coordinates.
    origin = wt.POINT(0, 0)
    user32.ScreenToClient(parent, ctypes.byref(origin))
    x, y, w, h = origin.x, origin.y, W, H

    err = (0, 0, 0, 0)
    for _ in range(8):
        user32.SetWindowPos(hwnd, insert_after, x, y, w, h,
                            SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_FRAMECHANGED)
        time.sleep(0.15)
        l, t, r, b = content_rect(hwnd)
        err = (l, t, r - W, b - H)  # >0 left/top = painted too far in; >0 right/bottom = too wide
        state["origin"] = (l, t)
        if err == (0, 0, 0, 0):
            break
        if max(abs(v) for v in err) > 300:
            break  # measurement looks wrong; do not make things worse
        x -= err[0]
        y -= err[1]
        w += err[0] - err[2]
        h += err[1] - err[3]

    state["screen"] = (W, H)
    state["err"] = err
    return err


def attach_behind_icons(hwnd):
    """Re-parent `hwnd` so it sits above the wallpaper but below the icons.
    Returns (ok, detail, state_or_None)."""
    progman = user32.FindWindowW("Progman", None)
    if not progman:
        return False, "could not find the Progman window", None

    # Ask Explorer to create the WorkerW wallpaper layer.
    result = ctypes.c_size_t()
    user32.SendMessageTimeoutW(progman, 0x052C, 0xD, 1, 0, 1000, ctypes.byref(result))
    time.sleep(0.2)

    defview_in_progman = user32.FindWindowExW(progman, None, "SHELLDLL_DefView", None)
    worker_in_progman = user32.FindWindowExW(progman, None, "WorkerW", None)

    if defview_in_progman and worker_in_progman:
        # Windows 11 24H2+: everything lives inside Progman. Slot our window
        # directly below the icon layer (SHELLDLL_DefView).
        mode = "Win11 24H2+ layout (child of Progman)"
        parent = progman
        insert_after = defview_in_progman
    else:
        # Classic layout: the WorkerW right after the one hosting the icons.
        host = [None]

        def on_window(top, _):
            if user32.FindWindowExW(top, None, "SHELLDLL_DefView", None):
                host[0] = top
                return False
            return True

        proc = WNDENUMPROC(on_window)
        user32.EnumWindows(proc, 0)
        parent = user32.FindWindowExW(None, host[0], "WorkerW", None) if host[0] else None
        if not parent:
            return False, "could not find a WorkerW window to attach to", None
        mode = "classic layout (child of WorkerW)"
        insert_after = None  # HWND_TOP inside that WorkerW

    user32.SetParent(hwnd, parent)

    style = user32.GetWindowLongPtrW(hwnd, GWL_STYLE) & 0xFFFFFFFF
    style = (style & ~(WS_POPUP | WS_CAPTION | WS_THICKFRAME)) | WS_CHILD | WS_VISIBLE
    user32.SetWindowLongPtrW(hwnd, GWL_STYLE, style)

    if user32.GetParent(hwnd) != parent:
        return False, "re-parenting did not stick (" + mode + ")", None

    state = {"hwnd": hwnd, "parent": parent, "insert_after": insert_after,
             "origin": (0, 0), "screen": (0, 0), "err": (0, 0, 0, 0), "detail": mode}
    fit_to_screen(state)
    return True, mode, state


# --------------------------------------------------------------------------
# Part 2: read desktop icon rectangles
# --------------------------------------------------------------------------
def find_desktop_listview():
    progman = user32.FindWindowW("Progman", None)
    defview = user32.FindWindowExW(progman, None, "SHELLDLL_DefView", None) if progman else None
    if not defview:
        worker = None
        while True:
            worker = user32.FindWindowExW(None, worker, "WorkerW", None)
            if not worker:
                break
            defview = user32.FindWindowExW(worker, None, "SHELLDLL_DefView", None)
            if defview:
                break
    if not defview:
        return None
    return user32.FindWindowExW(defview, None, "SysListView32", None)


class IconReader:
    def __init__(self):
        self.lv = find_desktop_listview()
        if not self.lv:
            raise RuntimeError("could not find the desktop icon list (is Explorer running?)")
        pid = wt.DWORD()
        user32.GetWindowThreadProcessId(self.lv, ctypes.byref(pid))
        self.proc = kernel32.OpenProcess(PROCESS_ACCESS, False, pid.value)
        if not self.proc:
            raise RuntimeError("could not open the Explorer process (error %d)" % ctypes.get_last_error())
        self.remote = kernel32.VirtualAllocEx(self.proc, None, ctypes.sizeof(wt.RECT),
                                              MEM_COMMIT_RESERVE, PAGE_READWRITE)
        if not self.remote:
            kernel32.CloseHandle(self.proc)
            raise RuntimeError("could not allocate memory in Explorer")

    def read(self):
        """Icon rectangles in SCREEN pixels."""
        if not user32.IsWindow(self.lv):
            raise RuntimeError("desktop icon list went away (Explorer restarted?)")
        # Re-measure the list's origin every read, so it can never go stale.
        origin = wt.POINT(0, 0)
        user32.ClientToScreen(self.lv, ctypes.byref(origin))
        count = user32.SendMessageW(self.lv, LVM_GETITEMCOUNT, 0, None)
        rects = []
        for i in range(count):
            r = wt.RECT(LVIR_BOUNDS, 0, 0, 0)
            kernel32.WriteProcessMemory(self.proc, self.remote, ctypes.byref(r), ctypes.sizeof(r), None)
            if not user32.SendMessageW(self.lv, LVM_GETITEMRECT, i, self.remote):
                continue
            kernel32.ReadProcessMemory(self.proc, self.remote, ctypes.byref(r), ctypes.sizeof(r), None)
            rects.append({
                "x": r.left + origin.x,
                "y": r.top + origin.y,
                "w": r.right - r.left,
                "h": r.bottom - r.top,
            })
        return rects

    def close(self):
        try:
            kernel32.VirtualFreeEx(self.proc, self.remote, 0, MEM_RELEASE)
            kernel32.CloseHandle(self.proc)
        except Exception:
            pass


def refresh_wallpaper():
    """Make Windows repaint the normal wallpaper after we detach."""
    try:
        buf = ctypes.create_unicode_buffer(520)
        user32.SystemParametersInfoW(0x0073, 520, buf, 0)       # SPI_GETDESKWALLPAPER
        user32.SystemParametersInfoW(0x0014, 0, buf, 0x03)      # SPI_SETDESKWALLPAPER
    except Exception:
        pass


def status_message(ok, detail, state):
    return {
        "type": "status",
        "attached": ok,
        "detail": detail,
        "fit": list(state["err"]) if state else None,
        "screen": list(state["screen"]) if state else None,
    }


# --------------------------------------------------------------------------
# Main loop
# --------------------------------------------------------------------------
def main():
    stop = threading.Event()
    commands = queue.Queue()

    def read_stdin():
        for line in sys.stdin:
            try:
                commands.put(json.loads(line))
            except ValueError:
                pass
        stop.set()  # Electron closed the pipe -> time to exit

    threading.Thread(target=read_stdin, daemon=True).start()

    reader = None
    state = None
    last_key = None
    last_error = None
    tick = 0

    while not stop.is_set():
        tick += 1

        while not commands.empty():
            cmd = commands.get()
            if cmd.get("cmd") == "attach":
                try:
                    ok, detail, state = attach_behind_icons(int(cmd["hwnd"]))
                except Exception as exc:
                    ok, detail, state = False, "attach failed: %s" % exc, None
                send(status_message(ok, detail, state))
                last_key = None  # force icons to be re-sent with the new origin

        # Every ~2 seconds, make sure the fit still holds (Chromium can re-layout).
        if state and tick % 20 == 0:
            try:
                if not user32.IsWindow(state["hwnd"]):
                    state = None
                else:
                    W, H = state["screen"]
                    l, t, r, b = content_rect(state["hwnd"])
                    if (l, t, r - W, b - H) != (0, 0, 0, 0):
                        fit_to_screen(state)
                        send(status_message(True, state["detail"], state))
                        last_key = None
            except Exception:
                pass

        try:
            if reader is None:
                reader = IconReader()
            rects = reader.read()
            last_error = None
        except Exception as exc:
            if reader:
                reader.close()
                reader = None
            if str(exc) != last_error:
                send({"type": "error", "message": str(exc)})
                last_error = str(exc)
            time.sleep(1.0)
            continue

        # Convert screen pixels -> pixels relative to the painted area.
        ox, oy = state["origin"] if state else (0, 0)
        rel = [{"x": r["x"] - ox, "y": r["y"] - oy, "w": r["w"], "h": r["h"]} for r in rects]

        key = json.dumps(sorted(rel, key=lambda r: (r["x"], r["y"], r["w"], r["h"])))
        if key != last_key:
            send({"type": "icons", "rects": rel})
            last_key = key
        time.sleep(0.1)

    if reader:
        reader.close()
    refresh_wallpaper()


if __name__ == "__main__":
    if sys.platform != "win32":
        sys.exit("This helper only works on Windows.")
    main()
