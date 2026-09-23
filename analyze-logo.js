const Jimp = require('jimp');

async function analyzeLogo() {
  const image = await Jimp.read('public/form-logo.png');
  console.log(`Image size: ${image.bitmap.width}x${image.bitmap.height}`);
}
analyzeLogo().catch(console.error);
