# Er.Axon 🧠⚡
> **Screen-Aware AI Coding Assistant for Beginner Programmers**  
> *Diagnose cryptic errors, understand root causes in plain English, resolve bugs step-by-step, and verify fixes with confidence.*

---

## 🌟 Overview

**Er.Axon** is a compact, floating Windows desktop developer companion engineered specifically to break the frustration barrier for novice and intermediate programmers. Powered by the official **Google Gemini API**, Er.Axon seamlessly captures code errors directly from your desktop screen (IDEs like VS Code, PyCharm, terminal outputs, or browser DevTools), explains what happened in plain English, identifies the likely root causes, provides exact corrected code, and explains how to verify the fix.

Designed with a **dark glassmorphic aesthetic**, Er.Axon features a compact, semi-transparent footprint with subtle cyan synapse accents, custom window controls, real-time opacity controls, interactive region cropping, local offline OCR error detection, and voice input.

---

## 💎 Features

### 1. 📸 Screen Capture & Interactive Region Crop
- **Multi-Source Support**: Enumerate and capture full desktop monitors or specific application windows (VS Code, Windows Terminal, Chrome) via Electron's native `desktopCapturer`.
- **Preview Confirmation Bar**: Inspect captured thumbnails before analysis, with instant options to inspect, crop, send, or discard.
- **Interactive Region Crop**: Drag directly on the high-resolution capture in the inspection modal to crop and focus strictly on an error dialog, compiler log, or terminal traceback.

### 2. ⚡ Structured 7-Section Troubleshooting Results
Every AI diagnostic response follows a strict beginner-friendly 7-section structure:
1. 🏷️ **Error Identification**: Classifies and names the exact error (e.g. `TypeError`, `SyntaxError`, `EADDRINUSE Port Conflict`).
2. 🔍 **Simple Explanation**: Plain-English explanation without intimidating technical jargon.
3. ⚠️ **Likely Causes**: 2 to 3 most probable root causes ranked by likelihood.
4. 🛠️ **Suggested Fix**: Step-by-step instructional guidance to resolve the bug.
5. 💻 **Exact Commands or Code Changes**: Clean, commented before/after code blocks and shell commands with one-click copy buttons (Er.Axon never auto-executes code or modifies files).
6. ✅ **Verification Steps**: Concrete test commands or actions to verify the fix works.
7. ❓ **Uncertainty & Missing Context**: If a screenshot is blurry, cropped, or lacks necessary logs, Er.Axon explicitly requests additional context instead of hallucinating.

### 3. 🔍 Automatic Programming-Error Detection (Local & Privacy-Conscious)
- **Disabled by Default**: Monitoring starts strictly disabled until explicitly enabled by the user.
- **100% Offline Local Analysis**: Uses local WebAssembly OCR (`tesseract.js`) and regex pattern recognition. **Zero** screenshots or frames are continuously uploaded or streamed to external cloud APIs.
- **Broad Pattern Detection**: Recognizes Python tracebacks, JavaScript/TypeScript exceptions, compiler diagnostics (GCC, Clang, Rustc, Go panics), package manager errors (`npm ERR!`, `yarn error`), and port collisions (`EADDRINUSE`).
- **Frame Hashing & Alert Deduplication**: Computes MD5 checksums of desktop frames to skip heavy OCR when the screen is unchanged. Employs a 45-second cooldown on identical error fingerprints to prevent repetitive alerts.
- **Inspect Context Before Sending**: When an error is detected, an unobtrusive toast appears with an **Inspect** button to review the captured frame, a **Send to AI** button to analyze with Gemini, and a **Pause** button to immediately halt monitoring.
- **False-Positive Warnings**: Highlights when an alert may be a false positive (such as code comments or documentation mentioning error names) and requests confirmation before sending.

### 4. 🎛️ Refined Compact UI & Bottom Toolbar
- **Dominant Chat Area**: The conversation stream and diagnostics dominate the window; preferences remain in a compact secondary modal.
- **Compact Icon Toolbar**: Screen Capture (`Snap`), Source Picker, Auto-Detect (`Auto`), Voice, Clear Chat, and Settings are arranged as small, aligned icon controls (28×28px) with consistent 14×14px icons.
- **Dynamic Tooltips & Active States**: Controls feature keyboard shortcuts (`Ctrl+S`, `Ctrl+D`, `Ctrl+,`), active glowing rings, and glowing indicator dots (`autodetect-dot`).
- **Usable Opacity Range**: Window opacity is clamped to a minimum of 50% (0.50–1.00) so text, code blocks, and controls remain crisp and usable against any desktop background.
- **Accessible & Keyboard Polish**: Complete `:focus-visible` outline rings, full `aria-label` tags, and global shortcuts.

### 5. 🛡️ Security & Zero Silent Fallbacks
- **Electron Context Isolation**: `contextIsolation: true`, `nodeIntegration: false`, and strict IPC whitelisting in `src/preload/preload.js`.
- **Content Security Policy (CSP)**: Strict CSP configured in both Electron session web request headers and renderer HTML `<meta>`.
- **Zero Hallucination / No Mock Data**: Er.Axon never generates fake responses or pretends an unconfigured key is working. If credentials are missing, it halts and directs the user to configure their key.

---

## 🏗️ Architecture

```
Er.Axon/
├── .env.example                 # Environment configuration template
├── .gitignore                   # Git exclusions (node_modules, .env secrets, dist)
├── package.json                 # Project scripts, dependencies & build config
├── README.md                    # Project documentation
├── dist/                        # Packaged Windows executables & installers
├── test/
│   ├── test-sanity.js           # Module existence, schema & token validation
│   ├── test-troubleshooting-logic.js # 7 sections, error formatting & real API test
│   ├── test-local-detector.js   # Unit tests for local regex pattern recognition
│   └── test-electron-launch.js  # Electron smoke test
└── src/
    ├── main/
    │   ├── main.js              # Electron lifecycle, CSP headers & secure IPC
    │   ├── configStore.js       # Persistent configuration & credential shielding
    │   ├── screenCapturer.js    # Native desktopCapturer service
    │   ├── geminiService.js     # @google/genai SDK integration & prompts
    │   ├── autoDetector.js      # Local background monitoring & deduplication
    │   └── localErrorDetector.js # Offline regex error pattern detector
    ├── preload/
    │   └── preload.js           # Secure contextBridge API with sanitized IPC
    └── renderer/
        ├── index.html           # Glassmorphic layout, region crop modal, toolbar
        ├── styles.css           # Vanilla CSS design system & accessibility
        └── app.js               # UI controller, crop canvas, markdown & speech
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended; tested on Node v24)
- **npm**: v9.0.0 or later
- **Operating System**: Windows 10 or 11 (64-bit)
- **Google Gemini API Key**: Free key obtainable from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation

1. **Clone or navigate to the repository directory**:
   ```bash
   cd "C:\Users\MUKUNDRAJ\Desktop\Er.Axon"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API Key** *(Optional - can also be configured inside the in-app Settings modal)*:
   Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
   Open `.env` and set your key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

---

## 🎮 Running & Testing

### Launch Development Server
```bash
npm start
```
Or with detailed Electron terminal logging:
```bash
npm run dev
```

### Run Automated Tests
```bash
npm test
```
*Executes all 3 test suites: `test-sanity.js`, `test-troubleshooting-logic.js`, and `test-local-detector.js`.*

### Run Electron Window Smoke Test
```bash
node test/test-electron-launch.js
```

---

## 📦 Windows Packaging & Build Commands

Er.Axon includes production-grade Windows packaging configurations via `electron-builder`:

### Build Unpacked Directory
Generates an unpacked Windows x64 binary in `dist/win-unpacked/Er.Axon.exe`:
```bash
npm run package:dir
```

### Build Windows NSIS Installer & Portable Binary
Packages standalone distribution binaries into `dist/`:
```bash
npm run package:win
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Ctrl + S` | **Snap Screen** | Capture the active primary desktop display |
| `Ctrl + D` | **Toggle Detection** | Enable or pause automatic local error monitoring |
| `Ctrl + ,` | **Toggle Settings** | Open or close the preferences panel |
| `Enter` | **Send Prompt** | Send the query and attached screenshot to Gemini |
| `Shift + Enter` | **Newline** | Insert a newline into the prompt composer |
| `Escape` | **Dismiss** | Close active modals, region crop tool, or notification toasts |

---

## 🔒 Privacy & Detection Architecture

| Property | Implementation |
| :--- | :--- |
| **Initial State** | Monitoring is strictly **disabled** on launch. |
| **OCR Processing** | 100% offline via `tesseract.js` WebAssembly engine. |
| **Cloud Transmissions** | **Zero** during background monitoring. Screenshots are never uploaded without user confirmation. |
| **Frame Deduplication** | MD5 hash comparison ignores identical desktop frames to minimize CPU usage. |
| **Alert Deduplication** | 45-second fingerprint cooldown avoids re-alerting on the same unchanged error. |
| **Inspection Step** | Notifications offer an "Inspect" option to review and crop the frame before sending to Gemini. |
| **Immediate Stop** | An explicit "Pause" button in both the toolbar and alert toast immediately halts monitoring. |

---

## ⚠️ Known Detection Limitations

1. **OCR Resolution & Font Rendering**: Tiny console fonts (under 10px), low-contrast color themes (e.g., dark gray on black), or heavily anti-aliased font rendering can occasionally result in OCR misreads.
2. **Ambiguous Keywords (False Positives)**: Mentioning error keywords in code comments (e.g. `// Fixes TypeError here`) or browsing documentation can trigger a detection event. When this occurs, Er.Axon tags the alert with **Review Needed / Potential Error** and asks the user to inspect the capture.
3. **Non-Visual Logic Bugs**: Logical bugs that execute without printing an exception, stack trace, or compiler diagnostic cannot be detected by visual OCR monitoring.
4. **Speech Recognition Runtime**: Speech-to-text relies on the Chromium Web Speech API. If the operating system or environment lacks voice synthesis services, voice input gracefully reports "Unsupported" rather than failing silently.

---

## 📋 Implementation & Delivery Status Report

| Feature Area | Status | Verification & Testing |
| :--- | :--- | :--- |
| **Gemini AI Integration** | ✅ Implemented & Tested | Validated via `@google/genai` (v2.31.0); live API connectivity tested against Gemini 2.5 Flash; strict 7-section prompt engineering enforced. |
| **Screen Capture & Region Crop** | ✅ Implemented & Tested | Validated via Electron `desktopCapturer`; interactive canvas crop tested; multi-screen and window chooser verified. |
| **Local Automatic Detection** | ✅ Implemented & Tested | Validated offline with `tesseract.js` and `localErrorDetector`; unit tests pass across Python, JS, C++, Rust, Go, and port errors. |
| **Alert Deduplication & Cooldown** | ✅ Implemented & Tested | Validated with MD5 frame hashing and error fingerprinting with 45s cooldown window. |
| **Compact Bottom Toolbar** | ✅ Implemented & Tested | Aligned 28×28px icon controls (`Snap`, `Source`, `Auto`, `Voice`, `Clear`, `Settings`) with tooltips, badge dots, and active states. |
| **Opacity Clamping** | ✅ Implemented & Tested | Clamped to a minimum of 50% (`0.50–1.00`) across `main.js`, `index.html`, and `app.js` to ensure text and controls remain usable. |
| **Electron Security Settings** | ✅ Implemented & Tested | `contextIsolation: true`, `nodeIntegration: false`, strict session CSP headers, preload whitelisting. |
| **Windows Packaging** | ✅ Implemented & Tested | `electron-builder` (v26.18.0) verified; `npm run package:dir` successfully builds `dist/win-unpacked/Er.Axon.exe`. |
| **API Configuration** | ⚙️ Requires Configuration | Users must provide their own Gemini API key (via `.env` or in-app Settings modal). Safe handling verified. |
| **Voice Speech-to-Text** | ⚠️ Environment-Dependent | Built using Web Speech API; operational where system speech engine is available, disabled gracefully with tooltip notice where unsupported. |

---

## 📄 License
MIT © 2026 Er.Axon Team
