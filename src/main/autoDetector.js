const crypto = require('crypto');
const Tesseract = require('tesseract.js');
const screenCapturer = require('./screenCapturer');
const localErrorDetector = require('./localErrorDetector');
const configStore = require('./configStore');

/**
 * AutoDetector: Privacy-Conscious Local Background Error Monitor
 * - Disabled by default.
 * - Performs 100% local OCR and error-pattern detection.
 * - ZERO continuous API uploads or remote calls.
 * - Deduplicates alerts and pauses on unchanged frames.
 */
class AutoDetector {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.isChecking = false;
    this.eventEmitter = null;

    // Deduplication tracking
    this.lastScreenHash = null;
    this.lastAlertedHash = null;
    this.lastAlertTime = 0;
    this.lastCheckTime = null;

    // Source selection (screen / window)
    this.selectedSourceId = null;

    // Tesseract worker cache
    this.ocrWorker = null;
  }

  setSource(sourceId) {
    this.selectedSourceId = sourceId || null;
    this.lastScreenHash = null; // Reset frame hash to immediately scan new source
    console.log(`[AutoDetector] Target capture source set to: ${this.selectedSourceId || 'Primary Display'}`);
  }

  setEmitter(emitter) {
    this.eventEmitter = emitter;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalSeconds: configStore.get('autoIntervalSeconds') || 15,
      lastCheck: this.lastCheckTime || null,
      isChecking: this.isChecking
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const intervalMs = (configStore.get('autoIntervalSeconds') || 15) * 1000;

    console.log(`[AutoDetector] Privacy-conscious local error monitoring enabled (Interval: ${intervalMs / 1000}s)`);
    this.notifyStatus('active');

    // Run first local scan after 1.5 seconds
    setTimeout(() => {
      if (this.isRunning) this.runDetectionCycle();
    }, 1500);

    // Periodic local scanning loop
    this.timer = setInterval(() => {
      this.runDetectionCycle();
    }, intervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[AutoDetector] Background error monitoring paused');
    this.notifyStatus('idle');
  }

  toggle() {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  /**
   * Run a single local OCR and error-detection cycle.
   * Absolutely NO network calls or Gemini uploads are performed.
   */
  async runDetectionCycle() {
    if (!this.isRunning || this.isChecking) return;

    this.isChecking = true;
    this.lastCheckTime = Date.now();
    this.notifyStatus('scanning');

    try {
      // 1. Capture lightweight snapshot from selected screen/window locally
      const captureResult = await screenCapturer.capture(this.selectedSourceId, true);
      if (!captureResult || !captureResult.dataUrl) return;

      // 2. Frame Deduplication: compute image hash to detect unchanged frames
      const commaIndex = captureResult.dataUrl.indexOf(',');
      const base64Data = captureResult.dataUrl.substring(commaIndex + 1);
      const imgBuffer = Buffer.from(base64Data, 'base64');
      const screenHash = crypto.createHash('md5').update(imgBuffer).digest('hex');

      if (screenHash === this.lastScreenHash) {
        // Frame is identical to previous check; skip CPU-heavy OCR
        return;
      }
      this.lastScreenHash = screenHash;

      // 3. Local OCR Extraction via Tesseract
      const ocrResult = await Tesseract.recognize(imgBuffer, 'eng');
      const extractedText = ocrResult?.data?.text || '';

      if (!extractedText || extractedText.trim().length === 0) {
        return;
      }

      // 4. Pattern Recognition via Local Regex & Heuristic Engine
      const detection = localErrorDetector.detect(extractedText);

      if (detection && detection.hasError && detection.summary) {
        // Compute error fingerprint for alert deduplication
        const errorFingerprint = crypto
          .createHash('md5')
          .update(`${detection.errorType}:${detection.summary}`)
          .digest('hex');

        const now = Date.now();
        const cooldownMs = 45000; // 45 seconds cooldown for identical error alerts

        if (errorFingerprint === this.lastAlertedHash && (now - this.lastAlertTime) < cooldownMs) {
          // Skip redundant alert for identical unchanged error
          return;
        }

        this.lastAlertedHash = errorFingerprint;
        this.lastAlertTime = now;

        // 5. Notify Renderer UI with detection details for user review
        if (this.eventEmitter) {
          this.eventEmitter('auto-detect:alert', {
            summary: detection.summary,
            errorType: detection.errorType,
            lineInfo: detection.lineInfo,
            confidence: detection.confidence,
            isPossibleFalsePositive: detection.isPossibleFalsePositive || false,
            reasoning: detection.reasoning,
            matchedSnippet: detection.matchedSnippet,
            screenshotDataUrl: captureResult.dataUrl,
            timestamp: now
          });
        }
      }
    } catch (err) {
      console.warn('[AutoDetector] Local detection cycle notice:', err.message);
    } finally {
      this.isChecking = false;
      if (this.isRunning) {
        this.notifyStatus('active');
      }
    }
  }

  notifyStatus(state) {
    if (this.eventEmitter) {
      this.eventEmitter('auto-detect:status', {
        state, // 'idle', 'active', 'scanning'
        isRunning: this.isRunning
      });
    }
  }
}

module.exports = new AutoDetector();
