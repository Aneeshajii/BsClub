const Jimp = require('jimp');

async function processLogo() {
  const image = await Jimp.read('public/form-logo.png');
  
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    // Only apply the color inversion to the left part (x < 180), which contains "the B'S"
    if (x < 180) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      const a = this.bitmap.data[idx + 3];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      
      // If it's a dark color and relatively grayscale
      if (max < 80 && (max - min) < 30 && a > 0) {
        const lightness = 255 - max;
        this.bitmap.data[idx + 0] = lightness;
        this.bitmap.data[idx + 1] = lightness;
        this.bitmap.data[idx + 2] = lightness;
      }
    }
  });

  await image.writeAsync('public/form-logo-white.png');
  console.log('Done processing selective logo!');
}

processLogo().catch(console.error);
