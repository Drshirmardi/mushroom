import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import type { FastifyRequest } from 'fastify';
import { invalidImage, imageTooLarge } from './product-image.errors';

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export type UploadedImage = { bytes: Buffer; filename: string; mimeType: string; altText: string };

export async function readProductImageUpload(request: FastifyRequest): Promise<UploadedImage> {
  if (!request.isMultipart()) throw invalidImage();
  let file: Omit<UploadedImage, 'altText'> | undefined; let altText = '';
  try {
    for await (const part of request.parts({ limits: { files: 1, fields: 1, parts: 2, fileSize: IMAGE_MAX_BYTES, fieldSize: 960, fieldNameSize: 30 } })) {
      if (part.type === 'file') {
        if (part.fieldname !== 'file' || file) { part.file.resume(); throw invalidImage(); }
        const bytes = await part.toBuffer();
        if (part.file.truncated) throw imageTooLarge();
        file = { bytes, filename: part.filename, mimeType: part.mimetype };
      } else {
        if (part.fieldname !== 'altText' || part.valueTruncated || typeof part.value !== 'string') throw invalidImage();
        altText = part.value.trim();
        if (altText.length > 240) throw invalidImage();
      }
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'FST_REQ_FILE_TOO_LARGE') throw imageTooLarge();
    if (code?.startsWith('FST_')) throw invalidImage();
    throw error;
  }
  if (!file) throw invalidImage();
  return { ...file, altText };
}

// libvips does not decode every animated PNG variant; reject the animation-control chunk too.
function hasAnimationChunk(bytes: Buffer, png: boolean) {
  let offset = png ? 8 : 12;
  while (offset + 8 <= bytes.length) {
    const name = bytes.toString('ascii', png ? offset + 4 : offset, png ? offset + 8 : offset + 4);
    if (name === 'acTL' || name === 'ANIM' || name === 'ANMF') return true;
    const length = png ? bytes.readUInt32BE(offset) : bytes.readUInt32LE(offset + 4);
    offset += png ? length + 12 : length + 8 + (length % 2);
  }
  return false;
}

@Injectable()
export class ProductImageProcessor {
  async process(file: UploadedImage) {
    if (file.bytes.length > IMAGE_MAX_BYTES) throw imageTooLarge();
    const b = file.bytes;
    const jpeg = b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
    const png = b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
    const format = jpeg ? 'jpeg' : png ? 'png' : webp ? 'webp' : null;
    const extension = file.filename.toLowerCase().split('.').at(-1);
    if (!format || file.mimeType !== `image/${format}` || !(format === 'jpeg' ? ['jpg', 'jpeg'] : [format]).includes(extension ?? '') || ((png || webp) && hasAnimationChunk(b, png))) throw invalidImage();
    try {
      const image = sharp(b, { failOn: 'warning', limitInputPixels: 20_000_000, animated: true });
      const metadata = await image.metadata();
      if (metadata.format !== format || !metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192 || metadata.width * metadata.height > 20_000_000 || (metadata.pages ?? 1) > 1) throw invalidImage();
      const output = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).timeout({ seconds: 10 }).toBuffer({ resolveWithObject: true });
      if (output.data.length > IMAGE_MAX_BYTES) throw imageTooLarge();
      return { bytes: output.data, width: output.info.width, height: output.info.height };
    } catch (error) {
      if (error instanceof Error && 'getStatus' in error) throw error;
      throw invalidImage();
    }
  }
}
