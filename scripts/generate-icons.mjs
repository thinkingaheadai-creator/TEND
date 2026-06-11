import sharp from "sharp";
import fs from "node:fs/promises";

const sizes = [
  { name: "icon-192.png", size: 192, scale: 0.6 },
  { name: "icon-256.png", size: 256, scale: 0.6 },
  { name: "icon-384.png", size: 384, scale: 0.6 },
  { name: "icon-512.png", size: 512, scale: 0.6 },
  { name: "icon-maskable-512.png", size: 512, scale: 0.4 },
  { name: "apple-icon-152.png", size: 152, scale: 0.6 },
  { name: "apple-icon-167.png", size: 167, scale: 0.6 },
  { name: "apple-icon-180.png", size: 180, scale: 0.6 },
  { name: "favicon-32.png", size: 32, scale: 0.6 },
  { name: "favicon-16.png", size: 16, scale: 0.6 },
];

const svgFor = (size, scale) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#0d0b09"/>
    <text x="50%" y="50%" font-family="Georgia, 'Times New Roman', serif" font-size="${size * scale}" font-weight="400" fill="#f3ede0" text-anchor="middle" dominant-baseline="central">T</text>
  </svg>
`;

await fs.mkdir("public/icons", { recursive: true });
for (const { name, size, scale } of sizes) {
  await sharp(Buffer.from(svgFor(size, scale)))
    .png()
    .toFile(`public/icons/${name}`);
  console.log(`✓ ${name}`);
}
