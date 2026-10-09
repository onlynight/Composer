/**
 * Electron Main Process — Composer 共鸣
 *
 * M0 scaffold: creates a single BrowserWindow, loads the Vite dev server
 * (dev) or the built renderer (production). The MCP Server, storage layer
 * and Audio Render Process are wired in at M2/M4/M5.
 *
 * Note on `nodeIntegration`: enabled for the scaffold so the renderer can
 * import workspace packages during development. For M1+ we will switch to
 * a proper preload bridge with `contextIsolation: true`.
 */

import { app, BrowserWindow, Menu, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dev server URL is injected by `pnpm dev` (via cross-env VITE_DEV_SERVER_URL=...).
// When absent we assume production and load the built renderer from disk.
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0f1115',
    title: 'Composer 共鸣',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true, // TODO(M1): switch to contextIsolation + IPC bridge
      contextIsolation: false, // TODO(M1): enable once preload exposes a safe API
      spellcheck: false,
      webSecurity: true,
    },
  });

  // Prevent default navigation to external URLs; open them in the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev && DEV_SERVER_URL) {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

function buildMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Composer',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => void shell.openExternal('https://github.com/composer-resonance/composer-resonance'),
        },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

app.on('second-instance', (_event, _argv, _workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    Menu.setApplicationMenu(buildMenu());
    mainWindow = createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
