const Jimp = require('jimp');

async function compare() {
  const img1 = await Jimp.read('public/form-logo.png'); // original transparent
  const img2 = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790163898879.png');
  console.log(`Original: ${img1.bitmap.width}x${img1.bitmap.height}`);
  console.log(`New: ${img2.bitmap.width}x${img2.bitmap.height}`);
}
compare().catch(console.error);
