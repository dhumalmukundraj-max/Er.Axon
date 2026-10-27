/**
 * Er.Axon - Screen-Aware AI Coding Assistant Client Controller
 */

// Application State
const state = {
  hasApiKey: false,
  maskedApiKey: '',
  model: 'gemini-2.5-flash',
  opacity: 0.95,
  isAlwaysOnTop: true,
  autoIntervalSeconds: 15,
  isAutoDetecting: false,
  isAnalyzing: false,
  attachedScreenshot: null, // { dataUrl, originalDataUrl, sourceName, timestamp }
  messages: [], // { sender: 'user'|'assistant', text, screenshot, timestamp }
  voiceState: 'idle', // 'idle' | 'listening' | 'unsupported'
  voiceRecognition: null,
  availableSources: [],
  cropCoords: null // { startX, startY, endX, endY, isDragging }
};

// DOM Elements
const elements = {
  // Titlebar & Status
  btnPin: document.getElementById('btn-pin'),
  btnSettingsToggle: document.getElementById('btn-settings-toggle'),
  btnMinimize: document.getElementById('btn-minimize'),
  btnClose: document.getElementById('btn-close'),
  statusIndicator: document.getElementById('status-indicator'),
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),

  // Main chat container
  mainContent: document.getElementById('main-content'),
  emptyState: document.getElementById('empty-state'),
  setupBanner: document.getElementById('setup-banner'),
  btnBannerSettings: document.getElementById('btn-banner-settings'),
  messagesContainer: document.getElementById('messages-container'),
  typingIndicator: document.getElementById('typing-indicator'),

  // Screen preview confirmation bar
  previewBar: document.getElementById('preview-bar'),
  previewThumbBox: document.getElementById('preview-thumb-box'),
  previewImg: document.getElementById('preview-img'),
  previewSourceName: document.getElementById('preview-source-name'),
  btnInspectCrop: document.getElementById('btn-inspect-crop'),
  btnQuickAnalyze: document.getElementById('btn-quick-analyze'),
  btnRemovePreview: document.getElementById('btn-remove-preview'),

  // Input & Composer
  promptInput: document.getElementById('prompt-input'),
  btnSend: document.getElementById('btn-send'),

  // Toolbar buttons
  btnCapture: document.getElementById('btn-capture'),
  btnSourcePicker: document.getElementById('btn-source-picker'),
  btnAutodetect: document.getElementById('btn-autodetect'),
  autodetectDot: document.getElementById('autodetect-dot'),
  btnVoice: document.getElementById('btn-voice'),
  btnClearChat: document.getElementById('btn-clear-chat'),
  btnToolbarSettings: document.getElementById('btn-toolbar-settings'),

  // Settings Modal
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  inputApiKey: document.getElementById('input-api-key'),
  btnToggleKeyMask: document.getElementById('btn-toggle-key-mask'),
  btnTestKey: document.getElementById('btn-test-key'),
  apiTestResult: document.getElementById('api-test-result'),
  selectModel: document.getElementById('select-model'),
  rangeOpacity: document.getElementById('range-opacity'),
  opacityVal: document.getElementById('opacity-val'),
  checkAlwaysOnTop: document.getElementById('check-always-on-top'),
  selectAutoInterval: document.getElementById('select-auto-interval'),
  checkSoundAlert: document.getElementById('check-sound-alert'),
  btnSaveSettings: document.getElementById('btn-save-settings'),

  // Sources Modal
  sourcesModal: document.getElementById('sources-modal'),
  btnCloseSources: document.getElementById('btn-close-sources'),
  tabScreens: document.getElementById('tab-screens'),
  tabWindows: document.getElementById('tab-windows'),
  sourcesList: document.getElementById('sources-list'),

  // Screen Inspection & Region Selection Modal
  inspectModal: document.getElementById('inspect-modal'),
  btnCloseInspect: document.getElementById('btn-close-inspect'),
  inspectContainer: document.getElementById('inspect-container'),
  inspectFullImg: document.getElementById('inspect-full-img'),
  inspectCropBox: document.getElementById('inspect-crop-box'),
  btnResetCrop: document.getElementById('btn-reset-crop'),
  btnConfirmCropSend: document.getElementById('btn-confirm-crop-send'),

  // Toast
  toast: document.getElementById('toast'),
  toastIcon: document.getElementById('toast-icon'),
  toastTitle: document.getElementById('toast-title'),
  toastBadge: document.getElementById('toast-badge'),
  toastMessage: document.getElementById('toast-message'),
  btnToastInspect: document.getElementById('btn-toast-inspect'),
  btnToastAction: document.getElementById('btn-toast-action'),
  btnToastPause: document.getElementById('btn-toast-pause'),
  btnToastClose: document.getElementById('btn-toast-close')
};

/* ========================================================================= */
/*                              INITIALIZATION                               */
/* ========================================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  setupWindowControls();
  setupEventListeners();
  setupCropInteraction();
  initVoiceEngine();
  await loadConfig();
  setupAutoDetectListeners();
});

/**
 * Configure frameless window controls
 */
function setupWindowControls() {
  elements.btnMinimize.addEventListener('click', () => {
    window.electronAPI.windowControls.minimize();
  });

  elements.btnClose.addEventListener('click', () => {
    window.electronAPI.windowControls.close();
  });

  elements.btnPin.addEventListener('click', async () => {
    state.isAlwaysOnTop = !state.isAlwaysOnTop;
    await window.electronAPI.windowControls.setAlwaysOnTop(state.isAlwaysOnTop);
    elements.btnPin.classList.toggle('active', state.isAlwaysOnTop);
    elements.btnPin.title = state.isAlwaysOnTop ? 'Always on Top: Active' : 'Always on Top: Inactive';
  });
}

/**
 * Load safe configuration and sync UI
 */
async function loadConfig() {
  try {
    const config = await window.electronAPI.config.get();
    state.hasApiKey = config.hasApiKey;
    state.maskedApiKey = config.maskedApiKey;
    state.model = config.model;
    state.opacity = Math.max(0.5, config.windowOpacity ?? 0.95);
    state.isAlwaysOnTop = config.alwaysOnTop;
    state.autoIntervalSeconds = config.autoIntervalSeconds;

    // Sync UI elements
    elements.btnPin.classList.toggle('active', state.isAlwaysOnTop);
    elements.rangeOpacity.value = Math.round(state.opacity * 100);
    elements.opacityVal.textContent = `${Math.round(state.opacity * 100)}%`;
    elements.checkAlwaysOnTop.checked = state.isAlwaysOnTop;
    elements.selectModel.value = state.model;
    elements.selectAutoInterval.value = String(state.autoIntervalSeconds);
    elements.checkSoundAlert.checked = config.soundNotification ?? true;

    // Setup banner visibility
    if (!state.hasApiKey) {
      elements.setupBanner.classList.remove('hidden');
      updateStatus('no-key', 'API Key Needed');
    } else {
      elements.setupBanner.classList.add('hidden');
      updateStatus('ready', 'Ready');
    }
  } catch (err) {
    console.error('Failed to load initial configuration:', err);
    updateStatus('error', 'Config Error');
  }
}

/**
 * Update the unobtrusive topbar status pill
 */
function updateStatus(type, label) {
  elements.statusIndicator.className = 'status-indicator ' + type;
  elements.statusText.textContent = label;
}

/* ========================================================================= */
/*                          SCREEN CAPTURE ENGINE                            */
/* ========================================================================= */

/**
 * Trigger real screen capture with source permission/selection
 */
async function captureScreen(sourceId = null, sourceName = 'Desktop') {
  try {
    updateStatus('capturing', 'Capturing Screen...');
    const result = await window.electronAPI.screen.capture(sourceId);

    state.attachedScreenshot = {
      dataUrl: result.dataUrl,
      originalDataUrl: result.dataUrl,
      sourceName: sourceName || result.name || 'Screen',
      timestamp: Date.now()
    };

    // Show preview confirmation bar
    elements.previewImg.src = result.dataUrl;
    elements.previewSourceName.textContent = state.attachedScreenshot.sourceName;
    elements.previewBar.classList.remove('hidden');

    updateStatus('ready', 'Screenshot Ready');
    showToast('Screen Captured', 'Review, crop, or type a question to analyze.', '📸');
    elements.promptInput.focus();
  } catch (err) {
    console.error('Screen capture error:', err);
    updateStatus('error', 'Capture Failed');
    showToast('Capture Failed', err.message || 'Could not capture screen.', '⚠️');
  }
}

/**
 * Remove attached screenshot preview
 */
function removeAttachedScreenshot() {
  state.attachedScreenshot = null;
  state.cropCoords = null;
  elements.previewBar.classList.add('hidden');
  elements.previewImg.src = '';
  updateStatus('ready', 'Ready');
}

/**
 * Open screen / window source selector modal
 */
async function openSourcePicker() {
  try {
    elements.sourcesList.innerHTML = '<div style="color:var(--text-muted);font-size:11px;grid-column:span 2;padding:10px;">Enumerating displays & windows...</div>';
    elements.sourcesModal.classList.remove('hidden');

    const sources = await window.electronAPI.screen.getSources();
    state.availableSources = sources;
    renderSourceCards(elements.tabScreens.classList.contains('active') ? 'screen' : 'window');
  } catch (err) {
    console.error('Failed to fetch capture sources:', err);
    showToast('Source Error', 'Unable to list screen sources.', '⚠️');
  }
}

function renderSourceCards(filterType) {
  const filtered = state.availableSources.filter(s => {
    return filterType === 'screen' ? s.isScreen : !s.isScreen;
  });

  if (filtered.length === 0) {
    elements.sourcesList.innerHTML = '<div style="color:var(--text-dim);font-size:11px;grid-column:span 2;padding:14px;text-align:center;">No targets found in this category.</div>';
    return;
  }

  elements.sourcesList.innerHTML = '';
  filtered.forEach(source => {
    const card = document.createElement('div');
    card.className = 'source-card';
    card.innerHTML = `
      <img class="source-card-img" src="${source.thumbnail}" alt="${escapeHtml(source.name)}" />
      <span class="source-card-title" title="${escapeHtml(source.name)}">${escapeHtml(source.name)}</span>
    `;
    card.addEventListener('click', () => {
      elements.sourcesModal.classList.add('hidden');
      captureScreen(source.id, source.name);
      if (window.electronAPI.autoDetect && window.electronAPI.autoDetect.setSource) {
        window.electronAPI.autoDetect.setSource(source.id);
      }
    });
    elements.sourcesList.appendChild(card);
  });
}

/* ========================================================================= */
/*                   REGION INSPECTION & INTERACTIVE CROP                    */
/* ========================================================================= */

function openInspectModal() {
  if (!state.attachedScreenshot) return;

  elements.inspectFullImg.src = state.attachedScreenshot.originalDataUrl;
  elements.inspectCropBox.classList.add('hidden');
  state.cropCoords = null;
  elements.inspectModal.classList.remove('hidden');
}

function closeInspectModal() {
  elements.inspectModal.classList.add('hidden');
}

function setupCropInteraction() {
  let isDown = false;
  let startX = 0;
  let startY = 0;

  elements.inspectContainer.addEventListener('mousedown', (e) => {
    if (e.target !== elements.inspectContainer && e.target !== elements.inspectFullImg) return;
    const rect = elements.inspectFullImg.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    isDown = true;
    state.cropCoords = { startX, startY, endX: startX, endY: startY };

    elements.inspectCropBox.style.left = `${startX}px`;
    elements.inspectCropBox.style.top = `${startY}px`;
    elements.inspectCropBox.style.width = '0px';
    elements.inspectCropBox.style.height = '0px';
    elements.inspectCropBox.classList.remove('hidden');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDown || !state.cropCoords) return;
    const rect = elements.inspectFullImg.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    state.cropCoords.left = left;
    state.cropCoords.top = top;
    state.cropCoords.width = width;
    state.cropCoords.height = height;

    elements.inspectCropBox.style.left = `${left}px`;
    elements.inspectCropBox.style.top = `${top}px`;
    elements.inspectCropBox.style.width = `${width}px`;
    elements.inspectCropBox.style.height = `${height}px`;
  });

  window.addEventListener('mouseup', () => {
    if (isDown) {
      isDown = false;
      if (state.cropCoords && (state.cropCoords.width < 10 || state.cropCoords.height < 10)) {
        elements.inspectCropBox.classList.add('hidden');
        state.cropCoords = null;
      }
    }
  });

  elements.btnResetCrop.addEventListener('click', () => {
    state.cropCoords = null;
    elements.inspectCropBox.classList.add('hidden');
    state.attachedScreenshot.dataUrl = state.attachedScreenshot.originalDataUrl;
    elements.previewImg.src = state.attachedScreenshot.originalDataUrl;
    showToast('Reset Crop', 'Using full screen capture.', 'ℹ️');
  });

  elements.btnConfirmCropSend.addEventListener('click', async () => {
    if (state.cropCoords && state.cropCoords.width > 10 && state.cropCoords.height > 10) {
      try {
        const croppedDataUrl = await cropImage(
          state.attachedScreenshot.originalDataUrl,
          state.cropCoords,
          elements.inspectFullImg.getBoundingClientRect()
        );
        state.attachedScreenshot.dataUrl = croppedDataUrl;
        elements.previewImg.src = croppedDataUrl;
      } catch (err) {
        console.warn('Failed to crop region, falling back to full capture:', err);
      }
    }

    closeInspectModal();
    sendMessage();
  });
}

/**
 * Crop image region using an offscreen canvas
 */
function cropImage(dataUrl, crop, displayRect) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scaleX = img.naturalWidth / displayRect.width;
      const scaleY = img.naturalHeight / displayRect.height;

      const sourceX = crop.left * scaleX;
      const sourceY = crop.top * scaleY;
      const sourceWidth = crop.width * scaleX;
      const sourceHeight = crop.height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth));
      canvas.height = Math.max(1, Math.round(sourceHeight));

      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, canvas.width, canvas.height
      );

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/* ========================================================================= */
/*                          VOICE RECOGNITION                                */
/* ========================================================================= */

function initVoiceEngine() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    state.voiceState = 'unsupported';
    elements.btnVoice.title = 'Speech Recognition is not supported in this runtime environment';
    elements.btnVoice.style.opacity = '0.4';
    return;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      state.voiceState = 'listening';
      elements.btnVoice.classList.add('voice-listening');
      elements.btnVoice.title = 'Voice: Listening... (Click to stop)';
      elements.btnVoice.setAttribute('aria-label', 'Voice listening. Click to stop.');
      updateStatus('capturing', 'Listening to Voice...');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      elements.promptInput.value = transcript;
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopVoice();
      showToast('Voice Notice', `Voice input event: ${event.error}`, '🎙️');
    };

    recognition.onend = () => {
      stopVoice();
    };

    state.voiceRecognition = recognition;
  } catch (err) {
    console.warn('Voice engine init failed:', err);
    state.voiceState = 'unsupported';
    elements.btnVoice.title = 'Speech Recognition is not supported in this runtime environment';
    elements.btnVoice.style.opacity = '0.4';
  }
}

function toggleVoice() {
  if (state.voiceState === 'unsupported' || !state.voiceRecognition) {
    showToast('Voice Unavailable', 'Speech recognition is not supported in this desktop runtime.', '🎙️');
    return;
  }

  if (state.voiceState === 'listening') {
    state.voiceRecognition.stop();
  } else {
    try {
      state.voiceRecognition.start();
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      stopVoice();
    }
  }
}

function stopVoice() {
  state.voiceState = 'idle';
  elements.btnVoice.classList.remove('voice-listening');
  elements.btnVoice.title = 'Voice Input (Speech-to-text)';
  elements.btnVoice.setAttribute('aria-label', 'Voice input');
  updateStatus('ready', 'Ready');
}

/* ========================================================================= */
/*                          AUTOMATIC DETECTION                              */
/* ========================================================================= */

function setupAutoDetectListeners() {
  window.electronAPI.autoDetect.onAlert((alertData) => {
    if (elements.checkSoundAlert.checked) {
      playAlertChime();
    }

    const title = alertData.isPossibleFalsePositive
      ? 'Potential Error (Review)'
      : 'Error Detected Locally';
    const message = `${alertData.errorType}: ${alertData.summary}${alertData.lineInfo ? ' (' + alertData.lineInfo + ')' : ''}`;
    const badgeText = alertData.isPossibleFalsePositive ? 'Review Needed' : 'Local OCR';

    showToast(title, message, '⚡', {
      badge: badgeText,
      // "Inspect": inspect context in modal before sending
      onInspect: () => {
        state.attachedScreenshot = {
          dataUrl: alertData.screenshotDataUrl,
          originalDataUrl: alertData.screenshotDataUrl,
          sourceName: 'Auto-Detected',
          timestamp: alertData.timestamp
        };
        elements.previewImg.src = alertData.screenshotDataUrl;
        elements.previewSourceName.textContent = 'Auto-Detected';
        elements.previewBar.classList.remove('hidden');
        elements.promptInput.value = `Please analyze this detected error: ${alertData.summary}`;
        openInspectModal();
      },
      // "Send to AI": confirm and send
      onAction: () => {
        state.attachedScreenshot = {
          dataUrl: alertData.screenshotDataUrl,
          originalDataUrl: alertData.screenshotDataUrl,
          sourceName: 'Auto-Detected',
          timestamp: alertData.timestamp
        };
        elements.previewImg.src = alertData.screenshotDataUrl;
        elements.previewSourceName.textContent = 'Auto-Detected';
        elements.previewBar.classList.remove('hidden');
        elements.promptInput.value = `Please analyze this detected error: ${alertData.summary}`;
        sendMessage();
      },
      // "Pause": immediate stop control
      onPause: () => {
        toggleAutoDetect();
      }
    });
  });

  window.electronAPI.autoDetect.onStatus((statusData) => {
    if (statusData.state === 'scanning') {
      updateStatus('analyzing', 'Scanning Frame...');
    } else if (statusData.isRunning) {
      updateStatus('auto-monitoring', 'Monitoring (Local OCR)');
    } else {
      updateStatus('ready', 'Ready');
    }
  });
}

async function toggleAutoDetect() {
  try {
    const res = await window.electronAPI.autoDetect.toggle();
    state.isAutoDetecting = res.isRunning;
    elements.btnAutodetect.classList.toggle('active', state.isAutoDetecting);
    elements.btnAutodetect.title = state.isAutoDetecting
      ? `Auto-Detect: Active (Local OCR scan every ${state.autoIntervalSeconds}s) [Ctrl+D]`
      : 'Auto-Detect Errors: Disabled [Ctrl+D]';
    elements.btnAutodetect.setAttribute('aria-label', state.isAutoDetecting ? 'Auto-detect active' : 'Auto-detect disabled');

    if (state.isAutoDetecting) {
      updateStatus('auto-monitoring', 'Monitoring (Local OCR)');
      showToast('Auto-Detect Active', `Scanning screen locally every ${state.autoIntervalSeconds}s (Zero API uploads).`, '🔍');
    } else {
      updateStatus('ready', 'Ready');
      showToast('Auto-Detect Paused', 'Local background screen monitoring is now off.', '⏸️');
    }
  } catch (err) {
    console.error('Failed to toggle auto detect:', err);
  }
}

/* ========================================================================= */
/*                          GEMINI ANALYSIS & CHAT                           */
/* ========================================================================= */

/**
 * Send user query + optional screenshot to Gemini
 */
async function sendMessage() {
  const promptText = elements.promptInput.value.trim();
  const hasImage = Boolean(state.attachedScreenshot);

  if (!promptText && !hasImage) return;

  if (!state.hasApiKey) {
    showToast('API Key Missing', 'Please configure your Gemini API key in Settings to analyze code errors.', '⚠️', openSettings);
    return;
  }

  if (state.isAnalyzing) return;

  const currentScreenshot = state.attachedScreenshot;

  // Add User Message to UI
  addUserMessage(promptText || 'Please diagnose the attached screen capture.', currentScreenshot);

  // Clear input and remove preview banner
  elements.promptInput.value = '';
  elements.promptInput.style.height = 'auto';
  removeAttachedScreenshot();

  // Switch to messages view if empty state was visible
  elements.emptyState.classList.add('hidden');
  elements.messagesContainer.classList.remove('hidden');

  // Show typing indicator
  state.isAnalyzing = true;
  elements.typingIndicator.classList.remove('hidden');
  elements.btnSend.disabled = true;
  updateStatus('analyzing', 'Analyzing with Gemini...');
  scrollToBottom();

  try {
    const response = await window.electronAPI.gemini.analyze({
      prompt: promptText,
      screenshotDataUrl: currentScreenshot ? currentScreenshot.dataUrl : null,
      history: state.messages
    });

    // Add assistant response
    addAssistantMessage(response.text);
    updateStatus('ready', 'Ready');
  } catch (err) {
    console.error('Analysis error:', err);
    let errorMsg = 'Failed to generate response. Please check your network connection and API key.';

    if (err.code === 'NO_API_KEY') {
      errorMsg = 'Gemini API key is not configured. Please open Settings to set your key.';
      openSettings();
    } else if (err.code === 'INVALID_API_KEY') {
      errorMsg = 'The configured Gemini API key is invalid or unrecognized. Please check your key in Settings.';
    } else if (err.code === 'RATE_LIMIT') {
      errorMsg = 'Gemini API rate limit or quota exceeded. Please wait a moment before trying again.';
    } else if (err.code === 'UNSUPPORTED_MODEL') {
      errorMsg = err.message || 'The configured AI model is not supported. Please select another model in Settings.';
    } else if (err.code === 'NETWORK_ERROR') {
      errorMsg = 'Network failure: Unable to connect to Gemini API. Please check your internet connection.';
    } else if (err.message) {
      errorMsg = err.message;
    }

    addAssistantMessage(`⚠️ **Analysis Error**\n\n${errorMsg}`);
    updateStatus('error', 'Analysis Error');
  } finally {
    state.isAnalyzing = false;
    elements.typingIndicator.classList.add('hidden');
    elements.btnSend.disabled = false;
    scrollToBottom();
  }
}

/**
 * Append user message bubble
 */
function addUserMessage(text, screenshot = null) {
  const row = document.createElement('div');
  row.className = 'message-row user';

  let thumbHtml = '';
  if (screenshot) {
    thumbHtml = `
      <div class="message-thumb-wrap" title="Click to view full capture">
        <img class="message-thumb" src="${screenshot.dataUrl}" alt="Captured screen" />
      </div>
    `;
  }

  row.innerHTML = `
    <div class="message-bubble">
      ${thumbHtml}
      <div>${escapeHtml(text)}</div>
    </div>
  `;

  // Attach lightbox preview on user image click
  if (screenshot) {
    const thumbWrap = row.querySelector('.message-thumb-wrap');
    if (thumbWrap) {
      thumbWrap.addEventListener('click', () => {
        elements.inspectFullImg.src = screenshot.dataUrl;
        elements.inspectCropBox.classList.add('hidden');
        elements.inspectModal.classList.remove('hidden');
      });
    }
  }

  elements.messagesContainer.appendChild(row);
  state.messages.push({
    sender: 'user',
    text: text,
    screenshot: screenshot ? screenshot.dataUrl : null,
    timestamp: Date.now()
  });
}

/**
 * Append assistant message bubble with structured Markdown formatting
 */
function addAssistantMessage(markdownText) {
  const row = document.createElement('div');
  row.className = 'message-row assistant';

  const formattedContent = renderMarkdown(markdownText);

  row.innerHTML = `
    <div class="message-bubble">
      ${formattedContent}
    </div>
  `;

  // Attach copy listeners to code blocks inside this message
  row.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
      });
    });
  });

  elements.messagesContainer.appendChild(row);
  state.messages.push({
    sender: 'assistant',
    text: markdownText,
    timestamp: Date.now()
  });
}

/**
 * Clear chat history and restore empty state
 */
function clearChat() {
  state.messages = [];
  elements.messagesContainer.innerHTML = '';
  elements.messagesContainer.classList.add('hidden');
  elements.emptyState.classList.remove('hidden');
  removeAttachedScreenshot();
  updateStatus('ready', 'Ready');
}

/**
 * Custom safe markdown renderer tailored for all 7 beginner troubleshooting sections
 */
function renderMarkdown(md) {
  if (!md) return '';

  let html = md;

  // Protect code blocks first
  const codeBlocks = [];
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang: lang || 'code', code: code });
    return id;
  });

  // Section 1: Error Identification
  html = html.replace(/(?:^|\n)(?:###?\s*|\*\*\s*)?(🏷️?\s*Error Identification[^*:\n]*)(?:\*\*)?:?/gi, 
    '\n<div class="analysis-section"><div class="section-badge error-id">🏷️ Error Identification</div><div class="section-body">'
  );

  // Section 2: Simple Explanation
  html = html.replace(/(?:^|\n)(?:###?\s*|\*\*\s*)?(🔍\s*Simple Explanation[^*:\n]*|🔍\s*What Happened[^*:\n]*)(?:\*\*)?:?/gi, 
    '</div></div>\n<div class="analysis-section"><div class="section-badge what-happened">🔍 Simple Explanation</div><div class="section-body">'
  );

  // Section 3: Likely Causes
  html = html.replace(/(?:^|\n)(?:###?\s*|\*\*\s*)?(⚠️\s*Likely Causes?[^*:\n]*)(?:\*\*)?:?/gi, 
    '</div></div>\n<div class="analysis-section"><div class="section-badge likely-cause">⚠️ Likely Causes</div><div class="section-body">'
  );

  // Section 4: Suggested Fix
  html = html.replace(/(?:^|\n)(?:###?\s*|\*\*\s*)?(🛠️?\s*Suggested Fix[^*:\n]*|🛠️?\s*How to Fix[^*:\n]*)(?:\*\*)?:?/gi, 
    '</div></div>\n<div class="analysis-section"><div class="section-badge how-to-fix">🛠️ Suggested Fix</div><div class="section-body">'
  );

  // Section 5: Exact Commands or Code Changes
  html = html.replace(/(?:^|\n)(?:###?\s*|\*\*\s*)?(💻\s*Exact Commands or Code Changes[^*:\n]*|💻\s*Code Changes[^*:\n]*)(?:\*\*)?:?/gi, 
    '</div></div>\n<div class="analysis-section"><div class="section-badge code-changes">💻 Exact Commands or Code Changes</div><div class="section-body">'
  );

  // Section 6: Verification Steps
  html = html.replace(/(?:^|\n)(?:###?\s*|\*\*\s*)?(✅\s*Verification Steps?[^*:\n]*|✅\s*How to Verify[^*:\n]*)(?:\*\*)?:?/gi, 
    '</div></div>\n<div class="analysis-section"><div class="section-badge verify">✅ Verification Steps</div><div class="section-body">'
  );

  // Section 7: Uncertainty & Missing Context
  html = html.replace(/(?:^|\n)(?:###?\s*|\*\*\s*)?(❓\s*Uncertainty & Missing Context[^*:\n]*|❓\s*Missing Context[^*:\n]*)(?:\*\*)?:?/gi, 
    '</div></div>\n<div class="analysis-section"><div class="section-badge uncertainty">❓ Uncertainty & Missing Context</div><div class="section-body">'
  );

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bullet points
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Line breaks
  html = html.replace(/\n\n/g, '<br/><br/>');
  html = html.replace(/\n/g, '<br/>');

  // Close unclosed sections
  if (html.includes('<div class="analysis-section">') && !html.endsWith('</div></div>')) {
    html += '</div></div>';
  }

  // Restore Code Blocks with Copy button
  codeBlocks.forEach((item, index) => {
    const rawEscaped = escapeHtml(item.code);
    const attrEscaped = item.code.replace(/"/g, '&quot;');
    const replacement = `
      <div class="code-block-wrapper">
        <div class="code-header">
          <span>${item.lang.toUpperCase()}</span>
          <button class="btn-copy-code" data-code="${attrEscaped}">Copy</button>
        </div>
        <pre><code>${rawEscaped}</code></pre>
      </div>
    `;
    html = html.replace(`__CODE_BLOCK_${index}__`, replacement);
  });

  return html;
}

function scrollToBottom() {
  elements.mainContent.scrollTop = elements.mainContent.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ========================================================================= */
/*                              SETTINGS MODAL                               */
/* ========================================================================= */

function openSettings() {
  elements.settingsModal.classList.remove('hidden');
  elements.inputApiKey.value = '';
  elements.inputApiKey.placeholder = state.hasApiKey ? `Configured (${state.maskedApiKey})` : 'Paste your Gemini API key...';
  elements.apiTestResult.classList.add('hidden');
}

function closeSettings() {
  elements.settingsModal.classList.add('hidden');
}

async function testApiKey() {
  const entered = elements.inputApiKey.value.trim();
  elements.apiTestResult.className = 'test-result-box';
  elements.apiTestResult.classList.remove('hidden');
  elements.apiTestResult.textContent = 'Testing connection with Gemini API...';

  try {
    const result = await window.electronAPI.config.testApiKey(entered);
    if (result.valid) {
      elements.apiTestResult.className = 'test-result-box success';
      elements.apiTestResult.textContent = '✓ ' + result.message;
    } else {
      elements.apiTestResult.className = 'test-result-box error';
      elements.apiTestResult.textContent = '✗ ' + result.message;
    }
  } catch (err) {
    elements.apiTestResult.className = 'test-result-box error';
    elements.apiTestResult.textContent = '✗ ' + (err.message || 'Validation request failed');
  }
}

async function saveSettings() {
  const newApiKey = elements.inputApiKey.value.trim();
  const newModel = elements.selectModel.value;
  const newOpacity = Number(elements.rangeOpacity.value) / 100;
  const newAlwaysOnTop = elements.checkAlwaysOnTop.checked;
  const newInterval = Number(elements.selectAutoInterval.value);
  const newSound = elements.checkSoundAlert.checked;

  const updates = {
    model: newModel,
    windowOpacity: newOpacity,
    alwaysOnTop: newAlwaysOnTop,
    autoIntervalSeconds: newInterval,
    soundNotification: newSound
  };

  if (newApiKey.length > 0) {
    updates.apiKey = newApiKey;
  }

  try {
    const saved = await window.electronAPI.config.save(updates);
    state.hasApiKey = saved.hasApiKey;
    state.maskedApiKey = saved.maskedApiKey;
    state.model = saved.model;
    state.opacity = saved.windowOpacity;
    state.isAlwaysOnTop = saved.alwaysOnTop;
    state.autoIntervalSeconds = saved.autoIntervalSeconds;

    if (state.hasApiKey) {
      elements.setupBanner.classList.add('hidden');
      updateStatus('ready', 'Ready');
    } else {
      elements.setupBanner.classList.remove('hidden');
      updateStatus('no-key', 'API Key Needed');
    }

    closeSettings();
    showToast('Settings Saved', 'Er.Axon preferences successfully updated.', '✓');
  } catch (err) {
    console.error('Failed to save settings:', err);
    showToast('Save Error', 'Could not save settings.', '⚠️');
  }
}

/* ========================================================================= */
/*                          NOTIFICATIONS & SOUND                            */
/* ========================================================================= */

let toastTimeout = null;
function showToast(title, message, icon = '⚡', options = null) {
  if (toastTimeout) clearTimeout(toastTimeout);

  elements.toastTitle.textContent = title;
  elements.toastMessage.textContent = message;
  elements.toastIcon.textContent = icon;

  const isOptionsObj = options && typeof options === 'object';
  const badgeText = isOptionsObj ? options.badge : null;
  const onInspectFn = isOptionsObj ? options.onInspect : null;
  const actionFn = typeof options === 'function' ? options : (isOptionsObj ? options.onAction : null);
  const onPauseFn = isOptionsObj ? options.onPause : null;

  if (badgeText) {
    elements.toastBadge.textContent = badgeText;
    elements.toastBadge.classList.remove('hidden');
  } else {
    elements.toastBadge.classList.add('hidden');
  }

  if (onInspectFn) {
    elements.btnToastInspect.classList.remove('hidden');
    elements.btnToastInspect.onclick = () => {
      elements.toast.classList.add('hidden');
      onInspectFn();
    };
  } else {
    elements.btnToastInspect.classList.add('hidden');
  }

  if (actionFn) {
    elements.btnToastAction.classList.remove('hidden');
    elements.btnToastAction.onclick = () => {
      elements.toast.classList.add('hidden');
      actionFn();
    };
  } else {
    elements.btnToastAction.classList.add('hidden');
  }

  if (onPauseFn) {
    elements.btnToastPause.classList.remove('hidden');
    elements.btnToastPause.onclick = () => {
      elements.toast.classList.add('hidden');
      onPauseFn();
    };
  } else {
    elements.btnToastPause.classList.add('hidden');
  }

  elements.toast.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 7000);
}

function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
}

/* ========================================================================= */
/*                          GLOBAL EVENT LISTENERS                           */
/* ========================================================================= */

function setupEventListeners() {
  // Input auto-expand & send on Enter
  elements.promptInput.addEventListener('input', () => {
    elements.promptInput.style.height = 'auto';
    elements.promptInput.style.height = Math.min(elements.promptInput.scrollHeight, 90) + 'px';
  });

  elements.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  elements.btnSend.addEventListener('click', sendMessage);

  // Screen Capture triggers
  elements.btnCapture.addEventListener('click', () => captureScreen(null, 'Desktop'));
  elements.btnSourcePicker.addEventListener('click', openSourcePicker);
  elements.btnRemovePreview.addEventListener('click', removeAttachedScreenshot);

  // Preview confirmation bar buttons
  elements.previewThumbBox.addEventListener('click', openInspectModal);
  elements.btnInspectCrop.addEventListener('click', openInspectModal);
  elements.btnQuickAnalyze.addEventListener('click', sendMessage);

  // Inspect & crop modal
  elements.btnCloseInspect.addEventListener('click', closeInspectModal);

  // Auto-detection toggle
  elements.btnAutodetect.addEventListener('click', toggleAutoDetect);

  // Voice toggle
  elements.btnVoice.addEventListener('click', toggleVoice);

  // Chat controls
  elements.btnClearChat.addEventListener('click', clearChat);

  // Settings modals
  elements.btnSettingsToggle.addEventListener('click', openSettings);
  elements.btnToolbarSettings.addEventListener('click', openSettings);
  elements.btnBannerSettings.addEventListener('click', openSettings);
  elements.btnCloseSettings.addEventListener('click', closeSettings);
  elements.btnSaveSettings.addEventListener('click', saveSettings);
  elements.btnTestKey.addEventListener('click', testApiKey);

  // Mask toggle in settings
  elements.btnToggleKeyMask.addEventListener('click', () => {
    const isPassword = elements.inputApiKey.type === 'password';
    elements.inputApiKey.type = isPassword ? 'text' : 'password';
    elements.btnToggleKeyMask.textContent = isPassword ? '🔒' : '👁️';
  });

  // Opacity slider live feedback (clamped to 50% minimum)
  elements.rangeOpacity.addEventListener('input', (e) => {
    const val = Math.max(50, Math.min(100, Number(e.target.value)));
    elements.opacityVal.textContent = `${val}%`;
    window.electronAPI.windowControls.setOpacity(val / 100);
  });

  // Source picker modal tabs & close
  elements.btnCloseSources.addEventListener('click', () => {
    elements.sourcesModal.classList.add('hidden');
  });

  elements.tabScreens.addEventListener('click', () => {
    elements.tabScreens.classList.add('active');
    elements.tabWindows.classList.remove('active');
    renderSourceCards('screen');
  });

  elements.tabWindows.addEventListener('click', () => {
    elements.tabWindows.classList.add('active');
    elements.tabScreens.classList.remove('active');
    renderSourceCards('window');
  });

  // Toast close
  elements.btnToastClose.addEventListener('click', () => {
    elements.toast.classList.add('hidden');
  });

  // Quick prompt chips in empty state
  document.querySelectorAll('.chip-prompt').forEach(chip => {
    chip.addEventListener('click', () => {
      const action = chip.getAttribute('data-action');
      const text = chip.getAttribute('data-text');

      if (action === 'capture') {
        captureScreen(null, 'Desktop');
      } else if (text) {
        elements.promptInput.value = text;
        sendMessage();
      }
    });
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl + S: Capture Screen
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      captureScreen(null, 'Desktop');
    }
    // Ctrl + D: Toggle Auto-Detection
    if (e.ctrlKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggleAutoDetect();
    }
    // Ctrl + ,: Toggle Settings
    if (e.ctrlKey && e.key === ',') {
      e.preventDefault();
      if (elements.settingsModal.classList.contains('hidden')) {
        openSettings();
      } else {
        closeSettings();
      }
    }
    // Escape: Close Modals
    if (e.key === 'Escape') {
      elements.settingsModal.classList.add('hidden');
      elements.sourcesModal.classList.add('hidden');
      elements.inspectModal.classList.add('hidden');
      elements.toast.classList.add('hidden');
    }
  });
}
