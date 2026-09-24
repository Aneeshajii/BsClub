const Jimp = require('jimp');

async function splitLogos() {
  const img = await Jimp.read('public/form-logo-v6.png');
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  // Clone to make two separate images
  const bsClubImg = img.clone();
  const hndrdImg = img.clone();

  // B's Club is on the left. Let's crop it.
  // x: 0, y: 0, w: w/2, h: h
  bsClubImg.crop(0, 0, w / 2, h);
  bsClubImg.autocrop();

  // HNDRD is on the right.
  hndrdImg.crop(w / 2, 0, w / 2, h);
  hndrdImg.autocrop();

  await bsClubImg.writeAsync('public/bs-club-only.png');
  await hndrdImg.writeAsync('public/hndrd-only.png');
  console.log('Successfully split logos!');
}
splitLogos().catch(console.error);
