const Jimp = require('jimp');

async function crop() {
  const image = await Jimp.read('public/pdf-logo.png');
  image.autocrop();
  await image.writeAsync('public/pdf-logo.png');
  console.log('Done cropping!');
}

crop().catch(console.error);
