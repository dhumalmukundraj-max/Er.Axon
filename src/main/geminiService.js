const { GoogleGenAI } = require('@google/genai');
const configStore = require('./configStore');

/**
 * Formats raw Google Gemini API errors into clean, descriptive, actionable errors.
 */
function formatGeminiError(err, modelName = 'gemini-2.5-flash') {
  const rawMsg = err.message || String(err);

  let apiCode = err.status || err.statusCode || null;
  let apiReason = null;
  let apiMessage = rawMsg;

  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed.error) {
      apiCode = parsed.error.code || apiCode;
      apiMessage = parsed.error.message || apiMessage;
      if (parsed.error.details && Array.isArray(parsed.error.details)) {
        for (const d of parsed.error.details) {
          if (d.reason) apiReason = d.reason;
        }
      }
    }
  } catch {}

  if (
    apiReason === 'API_KEY_INVALID' ||
    apiMessage.includes('API key not valid') ||
    apiMessage.includes('API_KEY_INVALID') ||
    rawMsg.includes('API_KEY_INVALID')
  ) {
    const error = new Error('The configured Gemini API key is invalid or unrecognized. Please verify your key in Settings or obtain a free key at Google AI Studio.');
    error.code = 'INVALID_API_KEY';
    return error;
  }

  if (
    apiCode === 429 ||
    apiReason === 'RESOURCE_EXHAUSTED' ||
    apiMessage.includes('quota') ||
    apiMessage.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('429')
  ) {
    const error = new Error('Gemini API rate limit or quota exceeded. Please wait a moment before sending another request.');
    error.code = 'RATE_LIMIT';
    return error;
  }

  if (
    apiCode === 404 ||
    apiMessage.includes('not found') ||
    apiMessage.includes('models/') ||
    rawMsg.includes('404')
  ) {
    const error = new Error(`The model "${modelName}" is currently unavailable or unsupported. Please choose a supported model (such as gemini-2.5-flash or gemini-1.5-flash) in Settings.`);
    error.code = 'UNSUPPORTED_MODEL';
    return error;
  }

  if (
    apiCode === 403 ||
    apiMessage.includes('PERMISSION_DENIED') ||
    rawMsg.includes('PERMISSION_DENIED')
  ) {
    const error = new Error('Permission denied for this Gemini API key. Please check your project permissions in Google AI Studio.');
    error.code = 'PERMISSION_DENIED';
    return error;
  }

  if (
    rawMsg.includes('ENOTFOUND') ||
    rawMsg.includes('ECONNREFUSED') ||
    rawMsg.includes('ETIMEDOUT') ||
    rawMsg.includes('fetch failed')
  ) {
    const error = new Error('Network failure: Unable to connect to Google Gemini API servers. Please check your internet connection.');
    error.code = 'NETWORK_ERROR';
    return error;
  }

  const generic = new Error(apiMessage || 'An unexpected error occurred during Gemini AI analysis.');
  generic.code = 'ANALYSIS_ERROR';
  return generic;
}

/**
 * GeminiService handles AI error analysis, code guidance, and multimodal screen inspection.
 * Specifically prompt-engineered for beginner programmers with structured troubleshooting.
 */
class GeminiService {
  constructor() {
    this.systemInstruction = `You are Er.Axon, a screen-aware AI coding mentor and assistant designed specifically for beginner and junior programmers.
Your mission is to make cryptic code errors crystal clear, eliminate frustration, and teach developers how to fix and verify bugs with confidence.

CRITICAL INSTRUCTIONS:
1. Ground your analysis strictly in visible evidence from the provided screenshot or user prompt.
2. DO NOT fabricate, guess, or invent code errors, file paths, line numbers, or stack traces that are not clearly visible or described.
3. If the screenshot is unclear, blurry, cropped, zoomed out, or lacks the crucial error message/context, YOU MUST EXPLICITLY STATE THIS in the "Uncertainty & Missing Context" section and ask the user to provide the missing details (e.g., full terminal output, code file, or clearer zoom) rather than inventing a diagnosis.
4. Always structure troubleshooting results using the following 7 distinct markdown sections:

### 🏷️ Error Identification
State the name or type of the error clearly (e.g. \`TypeError: Cannot read properties of undefined (reading 'map')\`, \`SyntaxError: Unexpected token <\`, or \`Port 3000 already in use\`). If no error is visible on screen, state "No explicit error detected on screen".

### 🔍 Simple Explanation
Explain what happened in friendly, plain English. Avoid intimidating jargon; use relatable analogies for a beginner programmer.

### ⚠️ Likely Causes
List 2 to 3 most probable root causes (e.g., uninitialized state variable, missing \`npm install\`, wrong directory, missing environment variable).

### 🛠️ Suggested Fix
Provide clear, step-by-step guidance on how to resolve the problem.

### 💻 Exact Commands or Code Changes
Provide clean, commented before/after code blocks or terminal commands. Always wrap code in triple backticks with the language identifier (e.g. \`\`\`javascript or \`\`\`bash).
Note: These are recommendations for the user to review and copy; Er.Axon does not automatically execute commands or modify files.

### ✅ Verification Steps
Provide concrete steps, commands, or checks (e.g., "Run \`node index.js\` and verify that 'Server started' appears") to confirm the fix succeeded.

### ❓ Uncertainty & Missing Context
List any ambiguities, parts of the screen that were cut off or unreadable, or additional information/files needed from the user to be 100% certain.`;
  }

  /**
   * Helper to retrieve an initialized GoogleGenAI instance.
   */
  getClient(overrideKey = null) {
    const key = overrideKey !== null ? overrideKey : configStore.get('apiKey');
    if (!key || key.trim().length === 0 || key === 'your_gemini_api_key_here') {
      const err = new Error('GEMINI_API_KEY_NOT_CONFIGURED');
      err.code = 'NO_API_KEY';
      throw err;
    }
    return new GoogleGenAI({ apiKey: key.trim() });
  }

  /**
   * Validate an API key by making a minimal test call.
   */
  async testApiKey(testKey) {
    if (!testKey || testKey.trim().length === 0) {
      return { valid: false, message: 'Please enter a Gemini API key.' };
    }

    try {
      const client = this.getClient(testKey);
      const model = configStore.get('model') || 'gemini-2.5-flash';

      const response = await client.models.generateContent({
        model: model,
        contents: 'Respond with the single word "OK" if this connection test is successful.'
      });

      const text = response?.text || '';
      if (text.includes('OK') || text.length > 0) {
        return { valid: true, message: 'API key validated successfully with Gemini!' };
      }
      return { valid: false, message: 'Unexpected response from Gemini API.' };
    } catch (err) {
      console.error('[GeminiService] API test failed:', err);
      const formatted = formatGeminiError(err);
      return { valid: false, message: formatted.message };
    }
  }

  /**
   * Main analysis method. Accepts user message, optional conversation history, and optional screenshot dataUrl.
   */
  async analyze({ prompt, screenshotDataUrl = null, history = [] }) {
    const apiKey = configStore.get('apiKey');
    if (!apiKey || apiKey.trim().length === 0 || apiKey === 'your_gemini_api_key_here') {
      const err = new Error('Gemini API key is not configured. Please open Settings or configure .env to set your key.');
      err.code = 'NO_API_KEY';
      throw err;
    }

    const modelName = configStore.get('model') || 'gemini-2.5-flash';
    const client = this.getClient();

    const contents = [];
    const parts = [];

    // If a screenshot was attached, parse raw base64 data
    if (screenshotDataUrl && screenshotDataUrl.startsWith('data:image/')) {
      const commaIndex = screenshotDataUrl.indexOf(',');
      const meta = screenshotDataUrl.substring(5, commaIndex);
      const mimeType = meta.split(';')[0] || 'image/png';
      const base64Data = screenshotDataUrl.substring(commaIndex + 1);

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    // Prepare user prompt text
    let userText = prompt && prompt.trim().length > 0
      ? prompt.trim()
      : (screenshotDataUrl
          ? 'Please examine this screen capture. Identify any errors, compiler warnings, red squigglies, or stack traces. Explain what happened, likely causes, how to fix it, and how to verify the fix.'
          : 'Please help me troubleshoot my coding issue.');

    parts.push({ text: userText });

    // Include recent conversation history context if available
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-4);
      for (const item of recentHistory) {
        if (item && item.sender === 'user' && item.text) {
          contents.push({
            role: 'user',
            parts: [{ text: item.text }]
          });
        } else if (item && item.sender === 'assistant' && item.text) {
          contents.push({
            role: 'model',
            parts: [{ text: item.text }]
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: parts
    });

    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: this.systemInstruction,
          temperature: 0.25
        }
      });

      const responseText = response?.text || '';
      if (!responseText || responseText.trim().length === 0) {
        const emptyErr = new Error('Gemini API returned an empty response. Please try rephrasing or capturing a different region.');
        emptyErr.code = 'EMPTY_RESPONSE';
        throw emptyErr;
      }

      return {
        text: responseText,
        model: modelName,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error('[GeminiService] Error in analyze:', err);
      throw formatGeminiError(err, modelName);
    }
  }

  /**
   * Lightweight automatic check on a captured thumbnail to inspect if an error or crash is present.
   */
  async checkScreenForErrors(screenshotDataUrl) {
    const apiKey = configStore.get('apiKey');
    if (!apiKey || apiKey.trim().length === 0 || apiKey === 'your_gemini_api_key_here') {
      return { hasError: false, summary: null };
    }

    const commaIndex = screenshotDataUrl.indexOf(',');
    const base64Data = screenshotDataUrl.substring(commaIndex + 1);
    const mimeType = screenshotDataUrl.substring(5, commaIndex).split(';')[0] || 'image/png';

    const client = this.getClient();
    const modelName = configStore.get('model') || 'gemini-2.5-flash';

    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Look at this screen capture. Determine if there is an active programming error, crash dialog, red stack trace, compiler syntax error, or terminal exception visible.
Respond ONLY in valid JSON matching this schema:
{"hasError": boolean, "errorType": "syntax|runtime|build|none", "summary": "brief 1-sentence description or empty"}`
          }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });

      const text = response?.text?.trim() || '{}';
      try {
        const parsed = JSON.parse(text);
        return {
          hasError: Boolean(parsed.hasError),
          errorType: parsed.errorType || 'none',
          summary: parsed.summary || ''
        };
      } catch {
        return { hasError: false, summary: null };
      }
    } catch (err) {
      console.warn('[GeminiService] Auto-detect check skipped:', err.message);
      return { hasError: false, summary: null };
    }
  }
}

module.exports = new GeminiService();
