const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const dotenv = require('dotenv');

// Load environment variables from .env if present in root
dotenv.config();

class ConfigStore {
  constructor() {
    this.configPath = null;
    this.data = {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      windowOpacity: 0.95,
      alwaysOnTop: true,
      autoIntervalSeconds: 15,
      soundNotification: true
    };
  }

  init() {
    try {
      if (!app || typeof app.getPath !== 'function') {
        return;
      }
      const userDataPath = app.getPath('userData');
      this.configPath = path.join(userDataPath, 'er-axon-config.json');

      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          ...this.data,
          ...parsed
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('[ConfigStore] Failed to load config from disk, using defaults:', err.message);
    }
  }

  get(key) {
    return this.data[key];
  }

  getAll() {
    return { ...this.data };
  }

  /**
   * Return safe public config for renderer (does NOT expose full API key string if we want to protect it,
   * but returns masked key indicator and other preferences)
   */
  getSafeConfig() {
    const key = this.data.apiKey || '';
    const maskedKey = key.length > 8 
      ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` 
      : (key ? '••••••••' : '');

    return {
      hasApiKey: Boolean(key && key.trim().length > 0 && key !== 'your_gemini_api_key_here'),
      maskedApiKey: maskedKey,
      model: this.data.model || 'gemini-2.5-flash',
      windowOpacity: this.data.windowOpacity ?? 0.95,
      alwaysOnTop: this.data.alwaysOnTop ?? true,
      autoIntervalSeconds: this.data.autoIntervalSeconds ?? 15,
      soundNotification: this.data.soundNotification ?? true
    };
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  update(partial) {
    this.data = {
      ...this.data,
      ...partial
    };
    this.save();
  }

  save() {
    if (!this.configPath) return;
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ConfigStore] Failed to save config to disk:', err.message);
    }
  }
}

const configStore = new ConfigStore();
module.exports = configStore;
