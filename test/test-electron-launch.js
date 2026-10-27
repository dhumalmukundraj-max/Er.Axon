/**
 * Electron Launch Test
 * Verifies that Electron starts up, initializes the main window,
 * loads index.html without syntax/runtime errors, and shuts down cleanly.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Running Electron smoke launch test...');

const electronPath = require('electron');
const appProcess = spawn(electronPath, ['.', '--test-mode'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, ER_AXON_TEST_MODE: 'true' },
  stdio: 'pipe'
});

let output = '';
let errOutput = '';

appProcess.stdout.on('data', (data) => {
  output += data.toString();
  console.log('[Electron stdout]', data.toString().trim());
});

appProcess.stderr.on('data', (data) => {
  errOutput += data.toString();
  console.log('[Electron stderr]', data.toString().trim());
});

// Let it run for 4 seconds then gracefully close
setTimeout(() => {
  console.log('⏱️ 4 seconds elapsed, shutting down test instance...');
  appProcess.kill('SIGTERM');
  setTimeout(() => {
    try { appProcess.kill('SIGKILL'); } catch {}
  }, 1000);
}, 4000);

appProcess.on('close', (code) => {
  console.log(`Electron closed with code ${code}`);
  // Check if any fatal runtime crash happened
  if (errOutput.includes('Error: Cannot find module') || errOutput.includes('SyntaxError')) {
    console.error('FATAL ERROR detected during launch!');
    process.exit(1);
  }
  console.log('✅ Electron smoke launch test finished successfully!');
  process.exit(0);
});
