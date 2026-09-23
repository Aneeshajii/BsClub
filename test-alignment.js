const Jimp = require('jimp');

async function testAlignment() {
  const oldImg = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790046924757.png');
  const newImg = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790163898879.png');

  function getBounds(img, isTransparent) {
    let minX = img.bitmap.width, maxX = 0, minY = img.bitmap.height, maxY = 0;
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
      if (isTransparent) {
        if (this.bitmap.data[idx + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      } else {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        // if not pure white
        if (r < 250 || g < 250 || b < 250) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    });
    return { minX, maxX, minY, maxY };
  }

  console.log("Old Bounds:", getBounds(oldImg, true));
  console.log("New Bounds:", getBounds(newImg, false));
}
testAlignment().catch(console.error);
