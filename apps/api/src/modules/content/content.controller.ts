import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { ContentService } from './content.service';
import { CreateArticleDto, CreateBannerDto, CreateCategoryDto, UpdateArticleDto, UpdateBannerDto } from './content.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
@ApiTags('Content') @ApiBearerAuth('bearerAuth') @Controller()
export class ContentController { constructor(private readonly content: ContentService) {}
  @Get('patients/me/articles') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF) patientArticles() { return this.content.articles(false); }
  @Get('patients/me/articles/:slug') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF) patientArticle(@Param('slug') slug: string) { return this.content.articleBySlug(slug); }
  @Get('patients/me/banners') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF) patientBanners() { return this.content.banners(false); }
  @Get('admin/content/categories') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) categories() { return this.content.categories(); }
  @Post('admin/content/categories') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) createCategory(@Body() body: CreateCategoryDto, @Req() r: AuthenticatedRequest) { return this.content.createCategory(body, context(r)); }
  @Get('admin/content/articles') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) articles() { return this.content.articles(); }
  @Post('admin/content/articles') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) createArticle(@Body() body: CreateArticleDto, @Req() r: AuthenticatedRequest) { return this.content.createArticle(body, context(r)); }
  @Patch('admin/content/articles/:id') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) updateArticle(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateArticleDto, @Req() r: AuthenticatedRequest) { return this.content.updateArticle(id, body, context(r)); }
  @Get('admin/content/banners') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) banners() { return this.content.banners(); }
  @Post('admin/content/banners') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) createBanner(@Body() body: CreateBannerDto, @Req() r: AuthenticatedRequest) { return this.content.createBanner(body, context(r)); }
  @Patch('admin/content/banners/:id') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) updateBanner(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateBannerDto, @Req() r: AuthenticatedRequest) { return this.content.updateBanner(id, body, context(r)); }
}
