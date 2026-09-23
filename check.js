const Jimp = require('jimp');

async function check() {
  const img = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790046924757.png');
  console.log(`Original uncropped: ${img.bitmap.width}x${img.bitmap.height}`);
}
check().catch(console.error);
