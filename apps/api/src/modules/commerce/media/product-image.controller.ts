import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Put, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiExtraModels, ApiHeader, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { Public } from '../../../common/auth/public.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ProductImageService } from './product-image.service';
import { imageEtag, ProductImageDto } from './product-image.dto';

const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
const content = (reply: FastifyReply, bytes: Buffer) => reply.header('cache-control', 'no-store').header('x-content-type-options', 'nosniff').type('image/webp').send(bytes);

@ApiExtraModels(ProductImageDto) @ApiTags('Admin Commerce Images') @ApiBearerAuth('bearerAuth') @RequirePermissions(PERMISSIONS.COMMERCE_MANAGE) @Controller('admin/commerce/products/:productId/image')
@ApiErrorResponse(401, 'Authentication required.') @ApiErrorResponse(403, 'COMMERCE_MANAGE required.') @ApiErrorResponse(404, 'Product/image is not owned or available.') @ApiErrorResponse(429, 'Image request rate exceeded.') @ApiErrorResponse(503, 'Storage disabled, unavailable or processing busy.')
export class AdminProductImageController {
  constructor(private readonly images: ProductImageService) {}
  @Get() @ApiOperation({ operationId: 'adminCommerceProductImageGet' }) @ApiOkResponse({ schema: { nullable: true, allOf: [{ $ref: getSchemaPath(ProductImageDto) }] }, description: 'Current metadata or null. ETag is the quoted image UUID or "none".' })
  async get(@Param('productId', uuid()) productId: string, @Res({ passthrough: true }) reply: FastifyReply) { const image = await this.images.metadata(productId); reply.header('etag', imageEtag(image)).header('cache-control', 'no-store'); return image; }
  @Put() @ApiConsumes('multipart/form-data') @ApiHeader({ name: 'If-Match', required: true }) @ApiHeader({ name: 'idempotency-key', required: true })
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, altText: { type: 'string', maxLength: 240 } } } })
  @ApiOperation({ operationId: 'adminCommerceProductImageUpload' }) @ApiOkResponse({ type: ProductImageDto })
  @ApiErrorResponse(409, 'Idempotency conflict, pending or expired operation.') @ApiErrorResponse(412, 'Image revision changed.') @ApiErrorResponse(428, 'If-Match required.') @ApiErrorResponse(413, 'Image exceeds 5 MiB.') @ApiErrorResponse(422, 'Invalid upload or operation key.')
  async upload(@Param('productId', uuid()) productId: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply) { const image = await this.images.upload(productId, request, context(request)); reply.header('etag', imageEtag(image)).header('cache-control', 'no-store'); return image; }
  @Delete() @HttpCode(204) @ApiHeader({ name: 'If-Match', required: true }) @ApiHeader({ name: 'idempotency-key', required: true }) @ApiOperation({ operationId: 'adminCommerceProductImageRemove' }) @ApiNoContentResponse()
  @ApiErrorResponse(409, 'Idempotency conflict.') @ApiErrorResponse(412, 'Image revision changed.') @ApiErrorResponse(428, 'If-Match required.') @ApiErrorResponse(422, 'Invalid operation key.')
  async remove(@Param('productId', uuid()) productId: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply) { await this.images.remove(productId, request, context(request)); reply.header('etag', '"none"').header('cache-control', 'no-store'); }
  @Get('content') @ApiProduces('image/webp') @ApiOperation({ operationId: 'adminCommerceProductImagePreview' }) @ApiOkResponse({ schema: { type: 'string', format: 'binary' }, description: 'Private preview of the current ready image.' })
  async preview(@Param('productId', uuid()) productId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) { reply.header('cache-control', 'no-store'); return content(reply, await this.images.content(productId, null, request, true)); }
}

@ApiTags('Commerce Images') @Public() @Controller('commerce/products/:productId/images')
@ApiErrorResponse(404, 'Current published image not found.') @ApiErrorResponse(429, 'Image request rate exceeded.') @ApiErrorResponse(503, 'Storage unavailable.')
export class PublicProductImageController {
  constructor(private readonly images: ProductImageService) {}
  @Get(':imageId') @ApiProduces('image/webp') @ApiOperation({ operationId: 'commerceProductImageContent' }) @ApiOkResponse({ schema: { type: 'string', format: 'binary' }, description: 'No-store current WebP image of a published catalog product.' })
  async get(@Param('productId', uuid()) productId: string, @Param('imageId', uuid()) imageId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) { reply.header('cache-control', 'no-store'); return content(reply, await this.images.content(productId, imageId, request)); }
}
