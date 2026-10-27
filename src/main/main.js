const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const configStore = require('./configStore');
const screenCapturer = require('./screenCapturer');
const geminiService = require('./geminiService');
const autoDetector = require('./autoDetector');

let mainWindow = null;

function createWindow() {
  configStore.init();

  const savedAlwaysOnTop = configStore.get('alwaysOnTop') ?? true;
  const savedOpacity = configStore.get('windowOpacity') ?? 0.95;

  // Set Content-Security-Policy headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self';"
        ]
      }
    });
  });

  mainWindow = new BrowserWindow({
    width: 440,
    height: 640,
    minWidth: 360,
    minHeight: 500,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: savedAlwaysOnTop,
    hasShadow: true,
    resizable: true,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  // Apply initial window opacity (clamped to 0.50 minimum for usability)
  if (savedOpacity >= 0.5 && savedOpacity <= 1.0) {
    mainWindow.setOpacity(savedOpacity);
  }

  // Load the UI
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Setup autoDetector event forwarding
  autoDetector.setEmitter((channel, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  });

  mainWindow.on('closed', () => {
    autoDetector.stop();
    mainWindow = null;
  });
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/* ========================================================================= */
/*                   VALIDATED SECURE IPC HANDLERS                           */
/* ========================================================================= */

// --- Window Controls ---
ipcMain.handle('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return mainWindow.isMaximized();
});

ipcMain.handle('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.handle('window:set-opacity', (event, opacity) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const val = parseFloat(opacity);
  if (!isNaN(val) && val >= 0.5 && val <= 1.0) {
    mainWindow.setOpacity(val);
    configStore.set('windowOpacity', val);
    return true;
  }
  return false;
});

ipcMain.handle('window:set-always-on-top', (event, flag) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const isPinned = Boolean(flag);
  mainWindow.setAlwaysOnTop(isPinned, 'screen-saver');
  configStore.set('alwaysOnTop', isPinned);
  return isPinned;
});

ipcMain.handle('window:get-state', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  return {
    isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
    opacity: configStore.get('windowOpacity') ?? 0.95,
    isMaximized: mainWindow.isMaximized()
  };
});

// --- Screen Capture ---
ipcMain.handle('screen:get-sources', async () => {
  return await screenCapturer.getSources();
});

ipcMain.handle('screen:capture', async (event, sourceId = null) => {
  const sanitizedId = typeof sourceId === 'string' && sourceId.trim().length > 0 ? sourceId.trim() : null;
  return await screenCapturer.capture(sanitizedId, false);
});

// --- Settings & Gemini Config ---
ipcMain.handle('config:get-safe', () => {
  return configStore.getSafeConfig();
});

ipcMain.handle('config:save', (event, updates) => {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Invalid configuration object.');
  }

  const allowed = {};
  if (typeof updates.apiKey === 'string') {
    allowed.apiKey = updates.apiKey.trim().slice(0, 256);
  }
  if (typeof updates.model === 'string' && /^[a-zA-Z0-9_.-]+$/.test(updates.model.trim())) {
    allowed.model = updates.model.trim().slice(0, 64);
  }
  if (typeof updates.windowOpacity === 'number') {
    allowed.windowOpacity = Math.max(0.5, Math.min(1.0, updates.windowOpacity));
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setOpacity(allowed.windowOpacity);
  }
  if (typeof updates.alwaysOnTop === 'boolean') {
    allowed.alwaysOnTop = updates.alwaysOnTop;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(updates.alwaysOnTop);
  }
  if (typeof updates.autoIntervalSeconds === 'number') {
    allowed.autoIntervalSeconds = Math.max(5, Math.min(120, updates.autoIntervalSeconds));
  }
  if (typeof updates.soundNotification === 'boolean') {
    allowed.soundNotification = updates.soundNotification;
  }

  configStore.update(allowed);
  return configStore.getSafeConfig();
});

ipcMain.handle('gemini:test-key', async (event, testKey) => {
  const sanitizedKey = typeof testKey === 'string' ? testKey.trim().slice(0, 256) : '';
  return await geminiService.testApiKey(sanitizedKey);
});

ipcMain.handle('gemini:analyze', async (event, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid analysis payload.');
  }

  // Validate prompt
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.slice(0, 10000) : '';

  // Validate screenshot data URL
  let screenshotDataUrl = null;
  if (typeof payload.screenshotDataUrl === 'string') {
    if (payload.screenshotDataUrl.startsWith('data:image/')) {
      screenshotDataUrl = payload.screenshotDataUrl;
    } else {
      throw new Error('Invalid screenshot format. Expected data:image URL.');
    }
  }

  // Validate conversation history
  const history = Array.isArray(payload.history)
    ? payload.history
        .filter(item => item && (item.sender === 'user' || item.sender === 'assistant'))
        .map(item => ({
          sender: item.sender,
          text: String(item.text || '').slice(0, 5000)
        }))
        .slice(-6)
    : [];

  return await geminiService.analyze({
    prompt,
    screenshotDataUrl,
    history
  });
});

// --- Auto Detection ---
ipcMain.handle('auto-detect:toggle', () => {
  const isRunning = autoDetector.toggle();
  return { isRunning };
});

ipcMain.handle('auto-detect:get-status', () => {
  return autoDetector.getStatus();
});

ipcMain.handle('auto-detect:set-source', (event, sourceId) => {
  const sanitizedId = typeof sourceId === 'string' && sourceId.trim().length > 0 ? sourceId.trim() : null;
  autoDetector.setSource(sanitizedId);
  return true;
});
