import sharp from 'sharp';
import fs from 'fs';

const output = await sharp(fs.readFileSync('./src/lib/image_manipulation/image.png'))
    .composite([
        {
            input: {
                create: {
                    width: 256,
                    height: 192,
                    channels: 4,
                    background: { r: 70, g: 85, b: 136, alpha: 0.5 }
                }
            }, tile: true, blend: 'atop'
        }
    ])
    .toBuffer();

fs.writeFileSync('./src/lib/image_manipulation/image_swat.png', output)