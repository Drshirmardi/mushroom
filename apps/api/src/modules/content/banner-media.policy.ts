import { createHash } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import type { Banner } from '../../generated/prisma/client';

export const BANNER_MEDIA_CLEANUP = 'CONTENT_BANNER_MEDIA_CLEANUP';
export const bannerRevisionConflict = () => new HttpException({ code: 'CONTENT_REVISION_CONFLICT', message: 'The banner changed. Reload it before editing.', details: {} }, 412);
export const bannerMissing = () => new HttpException({ code: 'BANNER_NOT_FOUND', message: 'Banner was not found.', details: {} }, 404);
export function bannerEtag(banner: Banner) {
  return `"${createHash('sha256').update(JSON.stringify([banner.id, banner.updatedAt, banner.title, banner.destinationUrl, banner.publicationStatus, banner.publishedAt, banner.mediaObjectKey, banner.mediaContentType, banner.mediaSizeBytes])).digest('hex')}"`;
}
export function ownBannerMedia(banner: Pick<Banner, 'id' | 'clinicId' | 'mediaObjectKey' | 'mediaContentType'>) {
  const key = banner.mediaObjectKey;
  return !!key && (key === `content/${banner.id}/banner.webp` || new RegExp(`^content/${banner.clinicId}/${banner.id}/[a-f0-9-]{36}\\.webp$`, 'u').test(key)) && banner.mediaContentType === 'image/webp';
}
export function projectBanner(banner: Banner) { return { ...banner, etag: bannerEtag(banner), contentPath: ownBannerMedia(banner) ? `/v1/content/banners/${banner.id}/image` : null }; }
export function safeBannerDestination(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\s\u0000-\u001f\u007f]/u.test(value)) return false;
  try {
    const base = 'https://banner.invalid'; const parsed = new URL(value, base);
    return value.startsWith('/') ? !value.startsWith('//') && parsed.origin === base : /^https?:\/\//iu.test(value) && ['http:', 'https:'].includes(parsed.protocol) && !!parsed.hostname && !parsed.username && !parsed.password;
  } catch { return false; }
}
