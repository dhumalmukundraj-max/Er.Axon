/**
 * Test Suite: Local Error Detector & Pattern Matching Engine
 * 100% Offline & Privacy-Conscious
 */

const assert = require('assert');
const localErrorDetector = require('../src/main/localErrorDetector');

console.log('🧪 Starting Local Error Pattern Detection Tests...\n');

// 1. Python Traceback & Exception Tests
console.log('1. Testing Python Traceback and Exceptions:');
const pythonSample = `
Traceback (most recent call last):
  File "app.py", line 42, in calculate_metrics
    result = count / total
ZeroDivisionError: division by zero
`;
const pyRes = localErrorDetector.detect(pythonSample);
assert.strictEqual(pyRes.hasError, true, 'Must detect Python error');
assert.strictEqual(pyRes.errorType, 'Python Exception', 'Must classify as Python Exception');
assert(pyRes.summary.includes('ZeroDivisionError'), 'Must extract ZeroDivisionError');
assert.strictEqual(pyRes.lineInfo, 'app.py:42', 'Must extract app.py:42 line info');
assert.strictEqual(pyRes.confidence, 'high', 'Must be high confidence');
console.log('   ✓ Python ZeroDivisionError traceback detected with lineInfo');

const pySyntaxSample = `SyntaxError: invalid syntax (<string>, line 1)`;
const pySyntaxRes = localErrorDetector.detect(pySyntaxSample);
assert.strictEqual(pySyntaxRes.hasError, true);
assert(pySyntaxRes.summary.includes('SyntaxError'));
console.log('   ✓ Python SyntaxError line detected');

// 2. JavaScript / Node.js Exception Tests
console.log('\n2. Testing JavaScript / Node.js Exceptions:');
const jsSample = `
TypeError: Cannot read properties of undefined (reading 'map')
    at renderItems (C:\\Users\\dev\\project\\src\\app.js:25:18)
    at Object.<anonymous> (C:\\Users\\dev\\project\\src\\index.js:10:5)
`;
const jsRes = localErrorDetector.detect(jsSample);
assert.strictEqual(jsRes.hasError, true);
assert.strictEqual(jsRes.errorType, 'JavaScript Exception');
assert(jsRes.summary.includes('Cannot read properties of undefined'));
console.log('   ✓ JavaScript TypeError with stack trace detected');

const npmSample = `npm ERR! code ENOENT\nnpm ERR! syscall open\nnpm ERR! path C:\\project\\package.json`;
const npmRes = localErrorDetector.detect(npmSample);
assert.strictEqual(npmRes.hasError, true);
assert.strictEqual(npmRes.errorType, 'Package Manager Error');
assert(npmRes.summary.includes('npm ERR!'));
console.log('   ✓ npm build / package error detected');

// 3. Compiler Diagnostics (C/C++, Rust, Go)
console.log('\n3. Testing Compiler Diagnostics (C/C++, Rust, Go):');
const gccSample = `main.c:14:5: error: expected ';' before 'return'`;
const gccRes = localErrorDetector.detect(gccSample);
assert.strictEqual(gccRes.hasError, true);
assert.strictEqual(gccRes.errorType, 'C/C++ Compiler Error');
assert(gccRes.summary.includes("expected ';'"));
console.log('   ✓ GCC/Clang compiler diagnostic detected');

const rustSample = `error[E0425]: cannot find value \`total\` in this scope\n --> src/main.rs:18:9`;
const rustRes = localErrorDetector.detect(rustSample);
assert.strictEqual(rustRes.hasError, true);
assert.strictEqual(rustRes.errorType, 'Rust Compiler Error');
assert(rustRes.summary.includes('E0425'));
console.log('   ✓ Rustc compiler error E0425 detected');

const goSample = `panic: runtime error: index out of range [5] with length 3`;
const goRes = localErrorDetector.detect(goSample);
assert.strictEqual(goRes.hasError, true);
assert.strictEqual(goRes.errorType, 'Go Panic');
assert(goRes.summary.includes('index out of range'));
console.log('   ✓ Go panic runtime error detected');

// 4. Network and Port Allocation Errors
console.log('\n4. Testing Network & Port Errors:');
const portSample = `Error: listen EADDRINUSE: address already in use :::3000`;
const portRes = localErrorDetector.detect(portSample);
assert.strictEqual(portRes.hasError, true);
assert.strictEqual(portRes.errorType, 'Network / Port Error');
assert(portRes.summary.includes('EADDRINUSE'));
console.log('   ✓ EADDRINUSE port collision detected');

// 5. Clean Code & False Positive Avoidance
console.log('\n5. Testing Clean Code & False Positive Handling:');
const cleanSample = `
const greeting = "Hello World";
console.log(greeting);
function add(a, b) {
  return a + b;
}
`;
const cleanRes = localErrorDetector.detect(cleanSample);
assert.strictEqual(cleanRes.hasError, false, 'Clean code must not trigger an error alert');
console.log('   ✓ Clean code correctly produces hasError: false');

const vagueSample = `build failed during compile step`;
const vagueRes = localErrorDetector.detect(vagueSample);
assert.strictEqual(vagueRes.hasError, true);
assert.strictEqual(vagueRes.isPossibleFalsePositive, true, 'Vague keyword should be flagged for user review');
console.log('   ✓ Ambiguous keyword correctly flagged as isPossibleFalsePositive: true');

console.log('\n🎉 ALL LOCAL ERROR PATTERN DETECTION TESTS PASSED!\n');
