const Jimp = require('jimp');

async function mergeAlpha() {
  const oldImg = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790046924757.png'); // Transparent background
  const newImg = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790163898879.png'); // White background but correct colors

  const w = oldImg.bitmap.width;
  const h = oldImg.bitmap.height;

  // We will modify newImg by applying the alpha channel from oldImg
  newImg.scan(0, 0, w, h, function(x, y, idx) {
    const oldAlpha = oldImg.bitmap.data[idx + 3];
    
    // Set the alpha of the new image to match the old transparent image
    this.bitmap.data[idx + 3] = oldAlpha;
    
    // One edge case: due to anti-aliasing against a white background in newImg,
    // semi-transparent pixels might have a white halo. 
    // If oldAlpha is very low (e.g. 0), it's fully transparent so halo doesn't matter.
    // We can just leave it as is, or we can use the old RGB for semi-transparent edges 
    // to completely avoid a white outline on the dark background.
    // For now, let's just use the old alpha and see if it looks clean.
  });

  // Now we autocrop it to remove the transparent borders just like before
  newImg.autocrop();

  await newImg.writeAsync('public/form-logo-v3.png');
  console.log('Successfully merged alpha and saved!');
}

mergeAlpha().catch(console.error);
