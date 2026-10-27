const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure Preload Script:
 * Context isolation is enabled, node integration is disabled.
 * Only explicitly approved functions with parameter sanitation are bridged.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Window control operations
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    setOpacity: (val) => {
      const num = Number(val);
      if (isNaN(num)) return Promise.reject(new Error('Invalid opacity number'));
      return ipcRenderer.invoke('window:set-opacity', num);
    },
    setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:set-always-on-top', Boolean(flag)),
    getState: () => ipcRenderer.invoke('window:get-state')
  },

  // Native screen capture operations
  screen: {
    getSources: () => ipcRenderer.invoke('screen:get-sources'),
    capture: (sourceId = null) => ipcRenderer.invoke('screen:capture', sourceId ? String(sourceId) : null)
  },

  // Safe configuration management
  config: {
    get: () => ipcRenderer.invoke('config:get-safe'),
    save: (updates) => {
      if (!updates || typeof updates !== 'object') {
        return Promise.reject(new Error('Updates must be an object'));
      }
      return ipcRenderer.invoke('config:save', updates);
    },
    testApiKey: (key) => {
      return ipcRenderer.invoke('gemini:test-key', String(key || ''));
    }
  },

  // Gemini AI Analysis
  gemini: {
    analyze: (payload) => {
      if (!payload || typeof payload !== 'object') {
        return Promise.reject(new Error('Payload must be an object'));
      }
      return ipcRenderer.invoke('gemini:analyze', {
        prompt: payload.prompt ? String(payload.prompt) : '',
        screenshotDataUrl: payload.screenshotDataUrl || null,
        history: Array.isArray(payload.history) ? payload.history : []
      });
    }
  },

  // Auto-detection background monitoring
  autoDetect: {
    toggle: () => ipcRenderer.invoke('auto-detect:toggle'),
    getStatus: () => ipcRenderer.invoke('auto-detect:get-status'),
    setSource: (sourceId) => ipcRenderer.invoke('auto-detect:set-source', sourceId ? String(sourceId) : null),
    onAlert: (callback) => {
      if (typeof callback !== 'function') return;
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('auto-detect:alert', subscription);
      return () => ipcRenderer.removeListener('auto-detect:alert', subscription);
    },
    onStatus: (callback) => {
      if (typeof callback !== 'function') return;
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('auto-detect:status', subscription);
      return () => ipcRenderer.removeListener('auto-detect:status', subscription);
    },
    onNoKey: (callback) => {
      if (typeof callback !== 'function') return;
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('auto-detect:no-key', subscription);
      return () => ipcRenderer.removeListener('auto-detect:no-key', subscription);
    }
  }
});
