const { desktopCapturer, screen } = require('electron');

/**
 * Screen capture service using Electron's native desktopCapturer API.
 * Provides reliable high-DPI full-desktop and window captures on Windows.
 */
class ScreenCapturer {
  /**
   * Enumerate available screens and windows for the user to choose from.
   */
  async getSources() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      });

      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
        isScreen: source.id.startsWith('screen:')
      }));
    } catch (err) {
      console.error('[ScreenCapturer] Error enumerating sources:', err);
      throw new Error(`Failed to list capture sources: ${err.message}`);
    }
  }

  /**
   * Capture a high-resolution screenshot from the selected source (or primary screen).
   * @param {string|null} sourceId - Specific source ID or null for primary display
   * @param {boolean} lowRes - If true, captures lightweight thumbnail (useful for auto-detection)
   */
  async capture(sourceId = null, lowRes = false) {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const scaleFactor = primaryDisplay.scaleFactor || 1;
      const { width, height } = primaryDisplay.size;

      const captureWidth = lowRes ? 640 : Math.round(width * scaleFactor);
      const captureHeight = lowRes ? 360 : Math.round(height * scaleFactor);

      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: captureWidth, height: captureHeight }
      });

      let target = null;
      if (sourceId) {
        target = sources.find(s => s.id === sourceId);
      }
      if (!target) {
        // Fallback to first screen source
        target = sources.find(s => s.id.startsWith('screen:')) || sources[0];
      }

      if (!target) {
        throw new Error('No desktop or window capture source found.');
      }

      return {
        id: target.id,
        name: target.name,
        dataUrl: target.thumbnail.toDataURL(),
        width: captureWidth,
        height: captureHeight,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error('[ScreenCapturer] Capture error:', err);
      throw new Error(`Screen capture failed: ${err.message}`);
    }
  }
}

module.exports = new ScreenCapturer();
