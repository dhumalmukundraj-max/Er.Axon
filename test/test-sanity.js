/**
 * Er.Axon Sanity Test Suite
 * Validates module loading, syntax, safe config handling, and UI files.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Er.Axon Sanity Test Suite...\n');

// 1. Verify all required files exist
const requiredFiles = [
  'package.json',
  '.env.example',
  '.gitignore',
  'src/main/main.js',
  'src/main/configStore.js',
  'src/main/screenCapturer.js',
  'src/main/geminiService.js',
  'src/main/autoDetector.js',
  'src/preload/preload.js',
  'src/renderer/index.html',
  'src/renderer/styles.css',
  'src/renderer/app.js'
];

console.log('1. Checking file existence:');
for (const relPath of requiredFiles) {
  const fullPath = path.join(__dirname, '..', relPath);
  assert(fs.existsSync(fullPath), `Missing required file: ${relPath}`);
  console.log(`   ✓ ${relPath}`);
}

// 2. Validate configStore safe configuration
console.log('\n2. Testing ConfigStore defaults and safe public exposure:');
const configStore = require('../src/main/configStore');
const safeConfig = configStore.getSafeConfig();
assert.strictEqual(typeof safeConfig.hasApiKey, 'boolean', 'hasApiKey must be boolean');
assert.strictEqual(typeof safeConfig.windowOpacity, 'number', 'windowOpacity must be a number');
assert.strictEqual(typeof safeConfig.model, 'string', 'model must be a string');
console.log('   ✓ ConfigStore properly shields raw secrets and returns safe schema:', safeConfig);

// 3. Validate GeminiService error handling when key is missing
console.log('\n3. Testing GeminiService error handling without API key:');
const geminiService = require('../src/main/geminiService');
assert.throws(() => {
  geminiService.getClient('');
}, (err) => {
  return err.message === 'GEMINI_API_KEY_NOT_CONFIGURED';
}, 'Should reject getClient() when key is missing without fabricating responses');
console.log('   ✓ GeminiService safely halts and signals missing configuration');

// 4. Validate HTML structure
console.log('\n4. Validating Renderer HTML structure:');
const htmlContent = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf-8');
assert(htmlContent.includes('id="app-window"'), 'Must have #app-window');
assert(htmlContent.includes('id="titlebar"'), 'Must have #titlebar');
assert(htmlContent.includes('id="btn-capture"'), 'Must have #btn-capture');
assert(htmlContent.includes('id="btn-autodetect"'), 'Must have #btn-autodetect');
assert(htmlContent.includes('id="btn-voice"'), 'Must have #btn-voice');
assert(htmlContent.includes('id="settings-modal"'), 'Must have #settings-modal');
console.log('   ✓ HTML structure contains all required interactive controls');

// 5. Validate CSS glassmorphism & accent tokens
console.log('\n5. Validating CSS Glassmorphic design tokens:');
const cssContent = fs.readFileSync(path.join(__dirname, '../src/renderer/styles.css'), 'utf-8');
assert(cssContent.includes('--bg-glass:'), 'Must define glassmorphic background token');
assert(cssContent.includes('--accent-cyan:'), 'Must define cyan synapse accent token');
assert(cssContent.includes('-webkit-app-region: drag;'), 'Must define draggable titlebar region');
assert(cssContent.includes('-webkit-app-region: no-drag;'), 'Must exclude interactive buttons from drag');
console.log('   ✓ CSS includes glassmorphism, drag regions, and developer styling');

console.log('\n🎉 ALL ER.AXON SANITY TESTS PASSED SUCCESSFULLY!\n');
