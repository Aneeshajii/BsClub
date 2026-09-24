const Jimp = require('jimp');

async function processLoadingImage() {
  const img = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790270957721.png');
  console.log(`Original Size: ${img.bitmap.width}x${img.bitmap.height}`);
}
processLoadingImage().catch(console.error);
