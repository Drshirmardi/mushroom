import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiHeader, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { Public } from '../../common/auth/public.decorator';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { ContentService } from './content.service';
import { AdminBannerDto, AdminBannerListDto, PublicBannerListDto, CreateArticleDto, CreateBannerDto, CreateCategoryDto, UpdateArticleDto, UpdateBannerDto } from './content.dto';
import { BannerMediaService } from './banner-media.service';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
@ApiTags('Content') @ApiBearerAuth('bearerAuth') @Controller()
export class ContentController { constructor(private readonly content: ContentService, private readonly media: BannerMediaService) {}
  @Get('patients/me/articles') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF) patientArticles() { return this.content.articles(false); }
  @Get('patients/me/articles/:slug') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF) patientArticle(@Param('slug') slug: string) { return this.content.articleBySlug(slug); }
  @Get('patients/me/banners') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF) patientBanners() { return this.content.banners(false); }
  @Get('admin/content/categories') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) categories() { return this.content.categories(); }
  @Post('admin/content/categories') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) createCategory(@Body() body: CreateCategoryDto, @Req() r: AuthenticatedRequest) { return this.content.createCategory(body, context(r)); }
  @Get('admin/content/articles') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) articles() { return this.content.articles(); }
  @Post('admin/content/articles') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) createArticle(@Body() body: CreateArticleDto, @Req() r: AuthenticatedRequest) { return this.content.createArticle(body, context(r)); }
  @Patch('admin/content/articles/:id') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) updateArticle(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateArticleDto, @Req() r: AuthenticatedRequest) { return this.content.updateArticle(id, body, context(r)); }
  @Get('admin/content/banners') @Header('Cache-Control', 'no-store') @ApiOkResponse({ type: AdminBannerListDto }) @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) banners() { return this.content.banners(); }
  @Post('admin/content/banners') @ApiCreatedResponse({ type: AdminBannerDto }) @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) createBanner(@Body() body: CreateBannerDto, @Req() r: AuthenticatedRequest) { return this.content.createBanner(body, context(r)); }
  @Patch('admin/content/banners/:id') @ApiOkResponse({ type: AdminBannerDto }) @ApiHeader({ name: 'If-Match', required: false }) @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) updateBanner(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateBannerDto, @Req() r: AuthenticatedRequest) { const expected = r.headers['if-match']; return this.content.updateBanner(id, body, context(r), typeof expected === 'string' ? expected : undefined); }
  @Put('admin/content/banners/:bannerId/image') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @ApiConsumes('multipart/form-data') @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } }) @ApiOkResponse({ type: AdminBannerDto }) @ApiHeader({ name: 'If-Match', required: true }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'adminContentBannerImageUpload', summary: 'Upload banner media' })
  async uploadBannerImage(@Param('bannerId', new ParseUUIDPipe({ version: '4' })) bannerId: string, @Req() request: AuthenticatedRequest) { return this.media.upload(bannerId, request, context(request)); }
  @Get('admin/content/banners/:bannerId/image/content') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @ApiProduces('image/*') @ApiOperation({ operationId: 'adminContentBannerImagePreview', summary: 'Serve banner media for admin preview' })
  async bannerImagePreview(@Param('bannerId', new ParseUUIDPipe({ version: '4' })) bannerId: string, @Req() request: AuthenticatedRequest, @Res() reply: FastifyReply) { const { bytes, contentType } = await this.media.content(bannerId, request, true); return reply.header('cache-control', 'no-store').header('x-content-type-options', 'nosniff').type(contentType).send(bytes); }
  @Delete('admin/content/banners/:bannerId/image') @HttpCode(204) @ApiNoContentResponse() @ApiHeader({ name: 'If-Match', required: true }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @ApiOperation({ operationId: 'adminContentBannerImageRemove', summary: 'Remove banner media' })
  async removeBannerImage(@Param('bannerId', new ParseUUIDPipe({ version: '4' })) bannerId: string, @Req() request: AuthenticatedRequest) { await this.media.remove(bannerId, request, context(request)); }
}

@ApiTags('Content') @Public() @Controller('content')
export class PublicContentBannerController {
  constructor(private readonly content: ContentService, private readonly media: BannerMediaService) {}
  @Get('banners') @Header('Cache-Control', 'no-store') @ApiOkResponse({ type: PublicBannerListDto }) @ApiOperation({ operationId: 'publicContentBanners', summary: 'List published store banners' }) publicBanners() { return this.content.publicBanners(); }
  @Get('banners/:bannerId/image') @ApiProduces('image/*') @ApiOperation({ operationId: 'publicContentBannerImage', summary: 'Serve published banner media' })
  async bannerImage(@Param('bannerId', new ParseUUIDPipe({ version: '4' })) bannerId: string, @Req() request: AuthenticatedRequest, @Res() reply: FastifyReply) { const { bytes, contentType } = await this.media.content(bannerId, request); return reply.header('cache-control', 'no-store').header('x-content-type-options', 'nosniff').type(contentType).send(bytes); }
}
