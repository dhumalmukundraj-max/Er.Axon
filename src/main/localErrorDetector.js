/**
 * Er.Axon Local Error Pattern Recognizer
 * 100% Offline & Privacy-Conscious.
 * Analyzes local OCR text to identify programming errors, stack traces, and compiler warnings.
 */

class LocalErrorDetector {
  constructor() {
    // Curated high-precision pattern definitions
    this.patterns = [
      // 1. Python Traceback & Exceptions
      {
        type: 'Python Traceback',
        regex: /(Traceback\s*\((?:most\s*recent\s*call\s*last|innermost\s*last)\):[\s\S]*?)(?:([a-zA-Z0-9_.]+(?:Error|Exception|Exit|Interrupt)):[ \t]*(.*))/i,
        handler: (match, text) => {
          const excName = match[2] || 'Python Exception';
          const excDetail = (match[3] || '').trim();
          const fileMatch = text.match(/File\s*["']([^"']+)["'],\s*line\s*(\d+)(?:,\s*in\s*([a-zA-Z0-9_<>]+))?/i);
          const lineInfo = fileMatch ? `${fileMatch[1]}:${fileMatch[2]}` : null;
          return {
            hasError: true,
            errorType: 'Python Exception',
            summary: `${excName}${excDetail ? ': ' + excDetail : ''}`,
            lineInfo,
            confidence: 'high',
            reasoning: 'Python stack traceback with exception type detected.'
          };
        }
      },
      // Python Unique Exceptions
      {
        type: 'Python Unique Exception',
        regex: /\b(IndentationError|TabError|NameError|ZeroDivisionError|ModuleNotFoundError|ImportError|FileNotFoundError|UnboundLocalError|RecursionError|StopIteration)\b:[ \t]+([^\n\r]+)/,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'Python Error',
            summary: `${match[1]}: ${match[2].trim()}`,
            lineInfo: null,
            confidence: 'high',
            reasoning: 'Python-specific exception type identified.'
          };
        }
      },

      // JavaScript / TypeScript / Node.js Exceptions & Shared Types
      {
        type: 'JavaScript / Node Exception',
        regex: /\b(TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AssertionError)\b:[ \t]+([^\n\r]+)/,
        handler: (match, text) => {
          const stackMatch = text.match(/\s+at\s+(?:.*?\()?(.*?:\d+:\d+)\)?/);
          const hasPythonTraceback = /Traceback\s*\(|File\s*["'].*?["'],\s*line\s*\d+/i.test(text);

          if (hasPythonTraceback) {
            return {
              hasError: true,
              errorType: 'Python Error',
              summary: `${match[1]}: ${match[2].trim()}`,
              lineInfo: null,
              confidence: 'high',
              reasoning: 'Python exception line within traceback context.'
            };
          }

          return {
            hasError: true,
            errorType: 'JavaScript Exception',
            summary: `${match[1]}: ${match[2].trim()}`,
            lineInfo: stackMatch ? stackMatch[1] : null,
            confidence: 'high',
            reasoning: stackMatch ? 'JavaScript runtime exception with call stack.' : 'JavaScript/TypeScript runtime exception identified.'
          };
        }
      },
      // Common JS Runtime Phrases
      {
        type: 'JavaScript Error',
        regex: /(Cannot read propert(?:y|ies) of (?:undefined|null)[^\n\r]*|[a-zA-Z0-9_.$]+ is not a function|[a-zA-Z0-9_.$]+ is not defined)/i,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'JavaScript Error',
            summary: match[1].trim(),
            lineInfo: null,
            confidence: 'high',
            reasoning: 'Frequent JavaScript runtime null/undefined error pattern.'
          };
        }
      },
      // Unhandled Promise Rejections
      {
        type: 'Node.js Unhandled Rejection',
        regex: /UnhandledPromiseRejection(?:Warning)?:[ \t]+([^\n\r]+)/i,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'Node.js Unhandled Rejection',
            summary: `Unhandled Rejection: ${match[1].trim()}`,
            lineInfo: null,
            confidence: 'high',
            reasoning: 'Asynchronous Node.js unhandled promise rejection.'
          };
        }
      },
      // Package Manager Errors
      {
        type: 'Package Manager Error',
        regex: /(npm ERR!|yarn error|pnpm ERR!)[ \t]+([^\n\r]+)/i,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'Package Manager Error',
            summary: `${match[1]} ${match[2].trim()}`,
            lineInfo: null,
            confidence: 'high',
            reasoning: 'Node package installation/build error.'
          };
        }
      },
      // TypeScript Compiler Errors
      {
        type: 'TypeScript Compiler Error',
        regex: /error\s+(TS\d{4}):[ \t]+([^\n\r]+)/i,
        handler: (match, text) => {
          const locMatch = text.match(/(.*?\.tsx?)\((\d+,\d+)\):/i);
          return {
            hasError: true,
            errorType: 'TypeScript Compiler Error',
            summary: `${match[1]}: ${match[2].trim()}`,
            lineInfo: locMatch ? `${locMatch[1]}:${locMatch[2]}` : null,
            confidence: 'high',
            reasoning: 'TypeScript compiler diagnostic code.'
          };
        }
      },

      // 3. Compiler & Build Tool Diagnostics (C/C++, Rust, Go, Java, C#)
      // C / C++ / Clang / GCC
      {
        type: 'C/C++ Compiler Error',
        regex: /(?:^|\n)(.*?):(\d+):(\d+):\s*(?:fatal\s+)?error:\s*([^\n\r]+)/i,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'C/C++ Compiler Error',
            summary: match[4].trim(),
            lineInfo: `${match[1]}:${match[2]}:${match[3]}`,
            confidence: 'high',
            reasoning: 'GCC/Clang standard compiler diagnostic line.'
          };
        }
      },
      // Rust / Cargo
      {
        type: 'Rust Compiler Error',
        regex: /error\[E(\d{4})\]:\s*([^\n\r]+)/i,
        handler: (match, text) => {
          const locMatch = text.match(/-->\s*(.*?:\d+:\d+)/);
          return {
            hasError: true,
            errorType: 'Rust Compiler Error',
            summary: `E${match[1]}: ${match[2].trim()}`,
            lineInfo: locMatch ? locMatch[1] : null,
            confidence: 'high',
            reasoning: 'Rust rustc compiler error code.'
          };
        }
      },
      // Go Panics & Errors
      {
        type: 'Go Runtime Panic',
        regex: /panic:\s*([^\n\r]+)/i,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'Go Panic',
            summary: `panic: ${match[1].trim()}`,
            lineInfo: null,
            confidence: 'high',
            reasoning: 'Go runtime panic exception.'
          };
        }
      },
      // Java / Kotlin Exception
      {
        type: 'Java Exception',
        regex: /(?:Exception in thread "[^"]*"\s+|Caused by:\s*)([a-zA-Z0-9_.]+(?:Exception|Error)):[ \t]*([^\n\r]*)/i,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'Java Exception',
            summary: `${match[1]}${match[2] ? ': ' + match[2].trim() : ''}`,
            lineInfo: null,
            confidence: 'high',
            reasoning: 'Java Virtual Machine thread exception.'
          };
        }
      },

      // 4. Web Server & Network Diagnostics
      {
        type: 'Network / Port Conflict',
        regex: /\b(EADDRINUSE|ECONNREFUSED|ENOTFOUND|ETIMEDOUT)\b:?[ \t]*([^\n\r]*)/i,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'Network / Port Error',
            summary: `${match[1]}${match[2] ? ' ' + match[2].trim() : ''}`,
            lineInfo: null,
            confidence: 'high',
            reasoning: 'Socket or port allocation system error.'
          };
        }
      },
      {
        type: 'Browser Console Network Error',
        regex: /Failed to load resource:\s*(net::ERR_[a-zA-Z0-9_]+|the server responded with a status of (?:404|500|502|503))/i,
        handler: (match) => {
          return {
            hasError: true,
            errorType: 'Browser Console Error',
            summary: match[0].trim(),
            lineInfo: null,
            confidence: 'medium',
            reasoning: 'DevTools browser console network failure.'
          };
        }
      }
    ];

    // Generic fallback patterns with potential false-positive warnings
    this.fallbackPatterns = [
      {
        type: 'Generic Compiler Error',
        regex: /\b(?:failed to compile|build failed|fatal error|compilation error)\b:?[ \t]*([^\n\r]*)/i,
        handler: (match) => ({
          hasError: true,
          errorType: 'Build Failure',
          summary: match[0].trim().slice(0, 120),
          lineInfo: null,
          confidence: 'medium',
          isPossibleFalsePositive: true,
          reasoning: 'Generic build failure keyword found without complete stack trace.'
        })
      }
    ];
  }

  /**
   * Scan text extracted from local OCR and match against programming error patterns.
   * @param {string} rawText - Text recognized by local OCR
   * @returns {object} Analysis result
   */
  detect(rawText) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return { hasError: false, summary: null };
    }

    const cleanText = rawText.replace(/\r\n/g, '\n');

    // 1. Check high-confidence error patterns
    for (const pattern of this.patterns) {
      const match = cleanText.match(pattern.regex);
      if (match) {
        const result = pattern.handler(match, cleanText);
        result.matchedSnippet = match[0].slice(0, 200).trim();
        result.isPossibleFalsePositive = false;
        return result;
      }
    }

    // 2. Check fallback patterns (flagged as potential false positives)
    for (const pattern of this.fallbackPatterns) {
      const match = cleanText.match(pattern.regex);
      if (match) {
        const result = pattern.handler(match, cleanText);
        result.matchedSnippet = match[0].slice(0, 200).trim();
        return result;
      }
    }

    return { hasError: false, summary: null };
  }
}

module.exports = new LocalErrorDetector();
