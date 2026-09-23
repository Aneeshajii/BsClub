const Jimp = require('jimp');

async function floodFillTransparent() {
  const img = await Jimp.read('C:/Users/anees/.gemini/antigravity/brain/2336d8c0-5a62-4fbf-977f-ebf81ceb97bb/.user_uploaded/media_1790163898879.png');
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  // We will do a BFS flood fill from (0,0)
  const visited = new Uint8Array(w * h);
  const queue = [{x: 0, y: 0}];
  visited[0] = 1;

  while (queue.length > 0) {
    const {x, y} = queue.pop();
    const idx = (y * w + x) * 4;
    const r = img.bitmap.data[idx];
    const g = img.bitmap.data[idx + 1];
    const b = img.bitmap.data[idx + 2];

    // If it's close to white
    if (r > 240 && g > 240 && b > 240) {
      // Make it transparent
      img.bitmap.data[idx + 3] = 0; // alpha = 0

      // Add neighbors
      const neighbors = [
        {nx: x + 1, ny: y},
        {nx: x - 1, ny: y},
        {nx: x, ny: y + 1},
        {nx: x, ny: y - 1}
      ];

      for (const {nx, ny} of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          if (!visited[ny * w + nx]) {
            visited[ny * w + nx] = 1;
            queue.push({x: nx, y: ny});
          }
        }
      }
    }
  }

  // Also autocrop it
  img.autocrop();
  await img.writeAsync('public/form-logo-v5.png');
  console.log('Flood fill done');
}
floodFillTransparent().catch(console.error);
