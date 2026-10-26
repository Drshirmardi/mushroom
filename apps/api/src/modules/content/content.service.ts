import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ContentPublicationStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { bannerEtag, bannerRevisionConflict, ownBannerMedia, projectBanner, safeBannerDestination } from './banner-media.policy';

type Context = { actorUserId: string; actorSessionId: string; requestId?: string; ipAddress?: string };
const invalid = (message = 'Content input is invalid.') => new UnprocessableEntityException({ code: 'CONTENT_INVALID', message, details: {} });
const missing = (type: string) => new NotFoundException({ code: `${type}_NOT_FOUND`, message: `${type} was not found.`, details: {} });
const conflict = () => new ConflictException({ code: 'CONTENT_CONFLICT', message: 'A content record with that slug already exists.', details: {} });
const status = (value?: string) => value as ContentPublicationStatus | undefined;

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}
  private async clinic() { const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, select: { id: true } }); if (!clinic) throw missing('CLINIC'); return clinic; }
  private text(value: string | undefined, field: string, max: number) { if (value === undefined) return undefined; const result = value.trim(); if (!result || result.length > max) throw invalid(); return result; }
  private slug(value: string | undefined) { const result = this.text(value, 'slug', 180); if (result !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw invalid(); return result; }
  private media(value: { objectKey: string; contentType: string; sizeBytes: number } | undefined): { objectKey: string; contentType: string; sizeBytes: number } | undefined { if (!value) return undefined; if (!/^content\/[0-9a-f-]{36}\/[a-z0-9][a-z0-9._-]{0,200}$/i.test(value.objectKey) || !/^image\/(jpeg|png|webp|avif)$/i.test(value.contentType) || !Number.isInteger(value.sizeBytes) || value.sizeBytes < 1 || value.sizeBytes > 5_000_000) throw invalid('Media must use a validated opaque content object key and supported image metadata.'); return value; }
  private publication(value: ContentPublicationStatus | undefined) { return value === undefined ? {} : { publicationStatus: value, publishedAt: value === ContentPublicationStatus.PUBLISHED ? new Date() : null }; }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, context: Context, metadata: object) { await tx.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'CONTENT', subjectId, requestId: context.requestId, ipAddress: context.ipAddress, metadata: metadata as Prisma.InputJsonValue } }); }
  async categories() { const clinic = await this.clinic(); return { items: await this.prisma.articleCategory.findMany({ where: { clinicId: clinic.id }, orderBy: { name: 'asc' } }) }; }
  async createCategory(body: { name: string; slug: string }, context: Context) { const clinic = await this.clinic(); try { return await this.prisma.$transaction(async tx => { const item = await tx.articleCategory.create({ data: { clinicId: clinic.id, name: this.text(body.name, 'name', 120)!, slug: this.slug(body.slug)! } }); await this.audit(tx, 'CONTENT_CATEGORY_CREATED', item.id, context, {}); return item; }); } catch (error) { if ((error as { code?: string }).code === 'P2002') throw conflict(); throw error; } }
  async articles(admin = true) { const clinic = await this.clinic(); return { items: await this.prisma.article.findMany({ where: { clinicId: clinic.id, ...(admin ? {} : { publicationStatus: ContentPublicationStatus.PUBLISHED, publishedAt: { not: null } }) }, include: { category: true }, orderBy: { updatedAt: 'desc' } }).then(items => items.map(item => this.article(item))) }; }
  async articleBySlug(slug: string, admin = false) { const clinic = await this.clinic(); const item = await this.prisma.article.findFirst({ where: { clinicId: clinic.id, slug, ...(admin ? {} : { publicationStatus: ContentPublicationStatus.PUBLISHED, publishedAt: { not: null } }) }, include: { category: true } }); if (!item) throw missing('ARTICLE'); return this.article(item); }
  async createArticle(body: any, context: Context) { const clinic = await this.clinic(); const cover = this.media(body.cover); try { return await this.prisma.$transaction(async tx => { await this.category(tx, clinic.id, body.categoryId); const item = await tx.article.create({ data: { clinicId: clinic.id, categoryId: body.categoryId, slug: this.slug(body.slug)!, title: this.text(body.title, 'title', 240)!, summary: this.text(body.summary, 'summary', 500) ?? null, body: this.text(body.body, 'body', 100000)!, ...this.publication(status(body.publicationStatus)), ...(cover ? { coverObjectKey: cover.objectKey, coverContentType: cover.contentType, coverSizeBytes: cover.sizeBytes } : {}) }, include: { category: true } }); await this.audit(tx, 'CONTENT_ARTICLE_CREATED', item.id, context, { publicationStatus: item.publicationStatus }); return this.article(item); }); } catch (error) { if ((error as { code?: string }).code === 'P2002') throw conflict(); throw error; } }
  async updateArticle(id: string, body: any, context: Context) { const clinic = await this.clinic(); const cover = body.cover === undefined ? undefined : this.media(body.cover); return this.prisma.$transaction(async tx => { const current = await tx.article.findFirst({ where: { id, clinicId: clinic.id } }); if (!current) throw missing('ARTICLE'); if (body.categoryId !== undefined) await this.category(tx, clinic.id, body.categoryId); const item = await tx.article.update({ where: { id }, data: { ...(body.slug !== undefined ? { slug: this.slug(body.slug) } : {}), ...(body.title !== undefined ? { title: this.text(body.title, 'title', 240) } : {}), ...(body.summary !== undefined ? { summary: this.text(body.summary, 'summary', 500) ?? null } : {}), ...(body.body !== undefined ? { body: this.text(body.body, 'body', 100000) } : {}), ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}), ...this.publication(status(body.publicationStatus)), ...(cover ? { coverObjectKey: cover.objectKey, coverContentType: cover.contentType, coverSizeBytes: cover.sizeBytes } : {}) }, include: { category: true } }); await this.audit(tx, 'CONTENT_ARTICLE_UPDATED', id, context, { publicationStatus: item.publicationStatus }); return this.article(item); }); }
  async banners(admin = true, mediaOnly = false) {
    const clinic = await this.clinic();
    const items = await this.prisma.banner.findMany({ where: { clinicId: clinic.id, ...(admin ? {} : { publicationStatus: ContentPublicationStatus.PUBLISHED, publishedAt: { not: null } }), ...(mediaOnly ? { mediaObjectKey: { not: null } } : {}) }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 100 });
    return { items: items.map(projectBanner) };
  }
  async publicBanners() { const { items } = await this.banners(false, true); return { items: items.filter(ownBannerMedia).map(({ id, title, destinationUrl, contentPath }) => ({ id, title, destinationUrl: destinationUrl && safeBannerDestination(destinationUrl) ? destinationUrl : null, contentPath })) }; }
  private destination(value: unknown): string | null | undefined {
    if (value === undefined || value === null) return value;
    if (!safeBannerDestination(value)) throw invalid('Use an internal root path or an absolute HTTP(S) link.');
    return value as string;
  }
  async createBanner(body: any, context: Context) {
    const clinic = await this.clinic(); if (body.media !== undefined) throw invalid('Upload banner media through its image endpoint.');
    return this.prisma.$transaction(async tx => {
      const item = await tx.banner.create({ data: { clinicId: clinic.id, title: this.text(body.title, 'title', 240)!, destinationUrl: this.destination(body.destinationUrl) ?? null, ...this.publication(status(body.publicationStatus)) } });
      await this.audit(tx, 'CONTENT_BANNER_CREATED', item.id, context, { publicationStatus: item.publicationStatus }); return projectBanner(item);
    });
  }
  async updateBanner(id: string, body: any, context: Context, expectedEtag?: string) {
    const clinic = await this.clinic(); if (body.media !== undefined) throw invalid('Upload banner media through its image endpoint.');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM banners WHERE id=${id}::uuid AND clinic_id=${clinic.id}::uuid FOR UPDATE`);
      const current = await tx.banner.findFirst({ where: { id, clinicId: clinic.id } }); if (!current) throw missing('BANNER');
      if (expectedEtag !== undefined && expectedEtag !== bannerEtag(current)) throw bannerRevisionConflict();
      const item = await tx.banner.update({ where: { id }, data: { ...(body.title !== undefined ? { title: this.text(body.title, 'title', 240) } : {}), ...(body.destinationUrl !== undefined ? { destinationUrl: this.destination(body.destinationUrl) } : {}), ...this.publication(status(body.publicationStatus)) } });
      await this.audit(tx, 'CONTENT_BANNER_UPDATED', id, context, { publicationStatus: item.publicationStatus }); return projectBanner(item);
    });
  }
  private async category(tx: Prisma.TransactionClient, clinicId: string, categoryId: string) { if (!await tx.articleCategory.findFirst({ where: { id: categoryId, clinicId } })) throw missing('ARTICLE_CATEGORY'); }
  private article(item: any) { return { ...item, cover: item.coverObjectKey ? { objectKey: item.coverObjectKey, contentType: item.coverContentType, sizeBytes: item.coverSizeBytes } : null }; }
}
