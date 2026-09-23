const Jimp = require('jimp');

async function fixHoles() {
  const img = await Jimp.read('public/form-logo-v5.png');
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  img.scan(0, 0, w, h, function(x, y, idx) {
    // HNDRD is on the right side of the image (x > w / 2)
    // The "B's" that needs to stay white is on the left side.
    // So for the right half, if a pixel is white, we just make it transparent.
    if (x > w / 2) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If it's close to white
      if (r > 240 && g > 240 && b > 240) {
        this.bitmap.data[idx + 3] = 0; // make transparent
      }
    }
  });

  await img.writeAsync('public/form-logo-v6.png');
  console.log('Fixed holes in R and D');
}
fixHoles().catch(console.error);
