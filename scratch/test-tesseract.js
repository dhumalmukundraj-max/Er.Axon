const Tesseract = require('tesseract.js');
const path = require('path');

async function testTesseract() {
  console.log('Testing local Tesseract OCR on scratch/test-traceback.png...');
  const imgPath = path.join(__dirname, 'test-traceback.png');
  try {
    const res = await Tesseract.recognize(imgPath, 'eng', {
      logger: m => console.log('[Tesseract status]', m.status, Math.round((m.progress || 0) * 100) + '%')
    });
    console.log('\n--- OCR Extracted Text ---');
    console.log(res.data.text.trim());
    console.log('--------------------------');
  } catch (err) {
    console.error('Tesseract error:', err);
  }
}

testTesseract();
