const Jimp = require('jimp');
async function test() {
  const newImg = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790163898879.png');
  await newImg.writeAsync('public/form-logo-v4.png');
}
test();
