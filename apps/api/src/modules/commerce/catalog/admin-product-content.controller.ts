import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { AdminCommerceCatalogService } from './admin-commerce-catalog.service';
import { AdminProductContentDto, ApproveProductContentDto, UpdateProductContentDto } from './product-content.dto';
import { CONTENT_BODY_LIMIT } from './product-content.policy';

@ApiTags('Admin Product Content')
@ApiBearerAuth('bearerAuth')
@Controller('admin/commerce/products/:productId/content')
@RequireRoles('ADMIN')
@RequirePermissions(PERMISSIONS.COMMERCE_MANAGE)
@ApiParam({ name: 'productId', format: 'uuid' })
@ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Malformed product identifier or content request.')
@ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication required.')
@ApiErrorResponse(HttpStatus.FORBIDDEN, 'Insufficient permissions.')
@ApiErrorResponse(HttpStatus.NOT_FOUND, 'Product not found in the active clinic.')
export class AdminProductContentController {
  constructor(private readonly catalog: AdminCommerceCatalogService, adapter: HttpAdapterHost) {
    // Installed while Nest instantiates controllers, before route registration.
    // A route-local parser limit counts raw UTF-8 bytes (including JSON whitespace),
    // without changing unrelated routes or the multipart/media limit.
    const server = adapter.httpAdapter.getInstance() as FastifyInstance;
    server.addHook('onRoute', (route) => {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      if (methods.some((method) => method === 'POST' || method === 'PATCH') && /^\/v1\/admin\/commerce\/products(?:\/[^/]+(?:\/content(?:\/approve)?)?)?$/.test(route.url)) route.bodyLimit = CONTENT_BODY_LIMIT;
    });
  }
  @Get() @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'adminProductContentGet', summary: 'Read draft product content and exact revision approval metadata' })
  @ApiOkResponse({ type: AdminProductContentDto })
  get(@Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string) { return this.catalog.getContent(productId); }

  @Patch() @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'adminProductContentUpdate', summary: 'Save content with revision precondition and invalidate prior approval' })
  @ApiOkResponse({ type: AdminProductContentDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Malformed content request.')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Content revision has changed.')
  @ApiErrorResponse(HttpStatus.PAYLOAD_TOO_LARGE, 'Content request exceeds 128 KiB.')
  @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Content is invalid.')
  update(@Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string, @Body() body: UpdateProductContentDto, @Req() request: AuthenticatedRequest) { return this.catalog.updateContent(productId, body, this.context(request)); }

  @Post('approve') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'adminProductContentApprove', summary: 'Explicitly approve the exact source-supported content revision' })
  @ApiOkResponse({ type: AdminProductContentDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Malformed approval request.')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Content revision has changed.')
  @ApiErrorResponse(HttpStatus.PAYLOAD_TOO_LARGE, 'Content request exceeds 128 KiB.')
  @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Content or its source is missing.')
  approve(@Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string, @Body() body: ApproveProductContentDto, @Req() request: AuthenticatedRequest) { return this.catalog.approveContent(productId, body.expectedContentRevision, this.context(request), request.auth.roles); }

  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
