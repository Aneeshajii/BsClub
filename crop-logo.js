const Jimp = require('jimp');

async function extractLogo() {
  const image = await Jimp.read('public/mockup.png');
  
  // The mockup is a phone screenshot. The logo is in the middle.
  // We can scan for the logo bounds (non-black pixels in the center area)
  // Let's just use autocrop to remove black borders
  image.autocrop(0, false); // 0 tolerance, crop black (assuming corners are black)
  
  // After cropping black, there's a yellow bar at the bottom. 
  // Let's crop it from the bottom.
  // We can just find the bounding box of non-black pixels excluding the yellow line.
  
  // Actually, let's just save it after autocrop and inspect its size.
  await image.writeAsync('public/form-logo.png');
  console.log('Saved to form-logo.png, size:', image.bitmap.width, 'x', image.bitmap.height);
}

extractLogo().catch(console.error);
