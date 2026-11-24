// Local desktop wrapper for the already-built React application.
const { app, BrowserWindow, protocol, session, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

const SCHEME = 'loungelink';
const APP_URL = 'loungelink://app/';
protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: true
}}]);
app.setName('LoungeLink POS');
const dataDir = path.join(app.getPath('appData'), 'LoungeLink POS');
fs.mkdirSync(dataDir, { recursive: true });
app.setPath('userData', dataDir);
app.commandLine.appendSwitch('disable-background-networking');

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};
const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'self'";
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    show: false, backgroundColor: '#09090b', autoHideMenuBar: true,
    webPreferences: {
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      webSecurity: true, spellcheck: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== APP_URL) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadURL(APP_URL).catch(error => {
    dialog.showErrorBox('LoungeLink POS', 'Unable to load bundled application: ' + error.message);
    app.quit();
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(() => {
    const root = path.resolve(__dirname, 'web');
    protocol.handle(SCHEME, async request => {
      try {
        const url = new URL(request.url);
        if (url.host !== 'app' || request.method !== 'GET') return new Response('Forbidden', { status: 403 });
        const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
        if (relative.includes('\\') || relative.includes('\0')) return new Response('Forbidden', { status: 403 });
        const target = path.resolve(root, relative);
        const within = path.relative(root, target);
        if (within.startsWith('..') || path.isAbsolute(within)) return new Response('Forbidden', { status: 403 });
        const type = mime[path.extname(target).toLowerCase()];
        if (!type) return new Response('Not found', { status: 404 });
        const body = await fsp.readFile(target);
        return new Response(body, { headers: { 'Content-Type': type, 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff' } });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    });
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
    createWindow();
  }).catch(error => {
    dialog.showErrorBox('LoungeLink POS', error.message);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
}
