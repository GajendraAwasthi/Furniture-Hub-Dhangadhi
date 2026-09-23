import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const srcImg = path.resolve('public/images/hero-living-room.png');
const outDir = path.resolve('public/images');

async function run() {
  const origStats = fs.statSync(srcImg);
  console.log(`Original PNG size: ${(origStats.size / 1024).toFixed(2)} kB`);

  // 1. High-quality WebP (1200w max)
  const webpPath = path.join(outDir, 'hero-living-room.webp');
  await sharp(srcImg)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(webpPath);
  const webpStats = fs.statSync(webpPath);
  console.log(`Optimized WebP (1200w) size: ${(webpStats.size / 1024).toFixed(2)} kB`);

  // 2. Mobile WebP (600w)
  const webp600Path = path.join(outDir, 'hero-living-room-600.webp');
  await sharp(srcImg)
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(webp600Path);
  const webp600Stats = fs.statSync(webp600Path);
  console.log(`Mobile WebP (600w) size: ${(webp600Stats.size / 1024).toFixed(2)} kB`);

  // 3. AVIF (1200w max)
  const avifPath = path.join(outDir, 'hero-living-room.avif');
  await sharp(srcImg)
    .resize({ width: 1200, withoutEnlargement: true })
    .avif({ quality: 75, effort: 6 })
    .toFile(avifPath);
  const avifStats = fs.statSync(avifPath);
  console.log(`Optimized AVIF (1200w) size: ${(avifStats.size / 1024).toFixed(2)} kB`);

  const reduction = ((1 - webpStats.size / origStats.size) * 100).toFixed(1);
  console.log(`Bandwidth reduction: ${reduction}% saved!`);
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
