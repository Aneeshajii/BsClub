const Jimp = require('jimp');

async function crop() {
  const image = await Jimp.read('public/form-logo.png');
  image.autocrop();
  await image.writeAsync('public/form-logo.png');
  console.log('Done cropping logo!');
}

crop().catch(console.error);
