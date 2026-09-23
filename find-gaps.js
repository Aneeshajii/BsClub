const Jimp = require('jimp');

async function findGaps() {
  const image = await Jimp.read('public/form-logo.png');
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  
  // We want to find black pixels. We'll sum black pixels per X coordinate.
  const blackPerX = new Array(w).fill(0);
  
  image.scan(0, 0, w, h, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];
    
    // Check if pixel is dark
    const max = Math.max(r, g, b);
    if (max < 80 && a > 100) {
      blackPerX[x]++;
    }
  });

  // Let's print the ranges where we have black pixels
  let inWord = false;
  let startX = 0;
  for (let x = 0; x < Math.min(w, 500); x++) { // only look at left side for B'S CLUB
    if (blackPerX[x] > 5 && !inWord) {
      inWord = true;
      startX = x;
    } else if (blackPerX[x] <= 5 && inWord) {
      inWord = false;
      console.log(`Black block from x=${startX} to x=${x - 1}`);
    }
  }
}
findGaps().catch(console.error);
