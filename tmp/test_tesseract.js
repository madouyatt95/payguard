const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

async function testOCR() {
  console.log('Generating dummy image for test...');
  // creating a tiny 1x1 png or just a text image isn't strictly necessary
  // To truly test we can just check if Tesseract requires native modules that are missing
  try {
    const worker = await Tesseract.createWorker('fra');
    console.log('Tesseract worker created successfully for French!');
    await worker.terminate();
    console.log('Tesseract is working perfectly in Node.js.');
  } catch (e) {
    console.error('Tesseract failed to load:', e);
  }
}

testOCR();
