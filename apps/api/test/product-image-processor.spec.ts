import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ProductImageProcessor, IMAGE_MAX_BYTES } from '../src/modules/commerce/media/product-image-processor';

const processor = new ProductImageProcessor();
const source = (width = 40, height = 20) => sharp({ create: { width, height, channels: 3, background: 'red' } });

describe('product image validation and sanitization', () => {
  it.each(['jpeg', 'png', 'webp'] as const)('decodes %s and returns bounded WebP without original metadata', async format => {
    const bytes = await source(2000, 1000).toFormat(format).withMetadata().toBuffer();
    const output = await processor.process({ bytes, filename: `test.${format}`, mimeType: `image/${format}`, altText: '' });
    const metadata = await sharp(output.bytes).metadata();
    expect(metadata.format).toBe('webp'); expect(metadata.width).toBe(1600); expect(metadata.height).toBe(800);
    expect(metadata.exif).toBeUndefined(); expect(metadata.icc).toBeUndefined();
  });
  it('rejects oversized data before decoding', async () => {
    await expect(processor.process({ bytes: Buffer.alloc(IMAGE_MAX_BYTES + 1), filename: 'test.png', mimeType: 'image/png', altText: '' })).rejects.toMatchObject({ response: { code: 'COMMERCE_IMAGE_TOO_LARGE' } });
  });
  it('rejects SVG, signatures inconsistent with MIME/extensions and malformed files', async () => {
    const png = await source().png().toBuffer();
    for (const file of [
      { bytes: Buffer.from('<svg/>'), filename: 'test.svg', mimeType: 'image/svg+xml' },
      { bytes: png, filename: 'test.jpg', mimeType: 'image/jpeg' },
      { bytes: png, filename: 'test.exe', mimeType: 'image/png' },
      { bytes: png.subarray(0, 12), filename: 'test.png', mimeType: 'image/png' },
    ]) await expect(processor.process({ ...file, altText: '' })).rejects.toMatchObject({ response: { code: 'COMMERCE_IMAGE_INVALID' } });
  });
  it('rejects over-limit input sides and pixel counts', async () => {
    for (const [width, height] of [[8193, 1], [5000, 4001]]) {
      const bytes = await source(width, height).png().toBuffer();
      await expect(processor.process({ bytes, filename: 'test.png', mimeType: 'image/png', altText: '' })).rejects.toMatchObject({ response: { code: 'COMMERCE_IMAGE_INVALID' } });
    }
  });
  it('rejects APNG animation-control chunks before publication', async () => {
    const png = await source().png().toBuffer();
    const chunk = Buffer.alloc(20); chunk.writeUInt32BE(8); chunk.write('acTL', 4); chunk.writeUInt32BE(2, 8);
    await expect(processor.process({ bytes: Buffer.concat([png.subarray(0, 8), chunk, png.subarray(8)]), filename: 'test.png', mimeType: 'image/png', altText: '' })).rejects.toMatchObject({ response: { code: 'COMMERCE_IMAGE_INVALID' } });
  });
});
