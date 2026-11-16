import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { ProgramDefinitionRateGuard } from '../definitions/program-definition.controller';
import { ProgramDefinitionResponseDto } from '../definitions/program-definition.dto';
import { ProgramCatalogService } from './program-catalog.service';
import { ProgramServicesService } from './program-services.service';
import { ProgramDraftPublicationService } from './program-draft-publication.service';
import { DraftPublicationApplyDto, DraftPublicationPreviewDto, DraftPublicationPreviewRequestDto, DraftPublicationResultsDto } from './program-draft-publication.dto';
import { CatalogApplyRequestDto, CatalogApplyResponseDto, CatalogListDto, CatalogPreviewRequestDto, CatalogPreviewResponseDto, ProgramCategoryCreateDto, ProgramCategoryListDto, ProgramCategoryResponseDto, ProgramCategorySaveDto, ProgramDraftSaveDto, ProgramRevisionDto, ProgramServiceCreateDto, ProgramServicePageDto, ProgramServiceQueryDto, ProgramServiceResponseDto } from './program-services.dto';

const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Program draft publication') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @UseGuards(ProgramDefinitionRateGuard)
@Controller('admin/program-service-publications')
export class ProgramDraftPublicationController {
  constructor(private readonly publications:ProgramDraftPublicationService){}
  @Post('preview') @Header('Cache-Control','private, no-store') @ApiOperation({operationId:'adminProgramDraftPublicationPreview'}) @ApiOkResponse({type:DraftPublicationPreviewDto})
  preview(@Body() body:DraftPublicationPreviewRequestDto,@Req() r:AuthenticatedRequest){return this.publications.preview(body,context(r));}
  @Post(':id/apply') @Header('Cache-Control','private, no-store') @ApiOperation({operationId:'adminProgramDraftPublicationApply'}) @ApiCreatedResponse({type:DraftPublicationResultsDto})
  apply(@Param('id',uuid()) id:string,@Body() body:DraftPublicationApplyDto,@Req() r:AuthenticatedRequest){return this.publications.apply(id,body,context(r));}
}

@ApiTags('Program services') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active session required.') @ApiErrorResponse(403, 'Same-clinic content administrator required.') @ApiErrorResponse(404, 'Service unavailable.') @ApiErrorResponse(409, 'Service revision changed.')
@Controller('admin/program-services')
export class AdminProgramServicesController {
  constructor(private readonly services: ProgramServicesService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramServiceList' }) @ApiOkResponse({ type: ProgramServicePageDto })
  list(@Query() query: ProgramServiceQueryDto, @Req() r: AuthenticatedRequest) { return this.services.list(query, context(r)); }
  @Post() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramServiceCreate' }) @ApiCreatedResponse({ type: ProgramServiceResponseDto })
  create(@Body() body: ProgramServiceCreateDto, @Req() r: AuthenticatedRequest) { return this.services.create(body, context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramServiceGet' }) @ApiOkResponse({ type: ProgramServiceResponseDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.services.get(id, context(r)); }
  @Post(':id/draft') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramServiceSaveDraft' }) @ApiCreatedResponse({ type: ProgramServiceResponseDto })
  save(@Param('id', uuid()) id: string, @Body() body: ProgramDraftSaveDto, @Req() r: AuthenticatedRequest) { return this.services.save(id, body, context(r)); }
  @Post(':id/submit') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramServiceSubmit', summary: 'Capture the complete working draft for physician review; never auto-approve or publish' }) @ApiCreatedResponse({ type: ProgramDefinitionResponseDto }) @ApiErrorResponse(422, 'Working draft lacks required content or safety.')
  submit(@Param('id', uuid()) id: string, @Body() body: ProgramRevisionDto, @Req() r: AuthenticatedRequest) { return this.services.submit(id, body.expectedRevision, context(r)); }
  @Post(':id/archive') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramServiceArchive' }) @ApiCreatedResponse({ type: ProgramServiceResponseDto })
  archive(@Param('id', uuid()) id: string, @Body() body: ProgramRevisionDto, @Req() r: AuthenticatedRequest) { return this.services.archive(id, body.expectedRevision, true, context(r)); }
  @Post(':id/restore') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramServiceRestore' }) @ApiCreatedResponse({ type: ProgramServiceResponseDto })
  restore(@Param('id', uuid()) id: string, @Body() body: ProgramRevisionDto, @Req() r: AuthenticatedRequest) { return this.services.archive(id, body.expectedRevision, false, context(r)); }
}

@ApiTags('Program categories') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(403, 'Same-clinic content administrator required.') @ApiErrorResponse(409, 'Category changed or needs reassignment.')
@Controller('admin/program-categories')
export class AdminProgramCategoriesController {
  constructor(private readonly services: ProgramServicesService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramCategoryList' }) @ApiOkResponse({ type: ProgramCategoryListDto })
  list(@Req() r: AuthenticatedRequest) { return this.services.categories(context(r)); }
  @Post() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramCategoryCreate' }) @ApiCreatedResponse({ type: ProgramCategoryResponseDto })
  create(@Body() body: ProgramCategoryCreateDto, @Req() r: AuthenticatedRequest) { return this.services.createCategory(body, context(r)); }
  @Post(':id') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramCategorySave' }) @ApiCreatedResponse({ type: ProgramCategoryResponseDto })
  save(@Param('id', uuid()) id: string, @Body() body: ProgramCategorySaveDto, @Req() r: AuthenticatedRequest) { return this.services.saveCategory(id, body, context(r)); }
}

@ApiTags('Program catalog import') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(403, 'Same-clinic content administrator required.') @ApiErrorResponse(404, 'Owned preview unavailable.') @ApiErrorResponse(503, 'Private catalog bundle unavailable.')
@Controller('admin/program-catalog')
export class AdminProgramCatalogController {
  constructor(private readonly catalog: ProgramCatalogService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramCatalogList' }) @ApiOkResponse({ type: CatalogListDto })
  list(@Req() r: AuthenticatedRequest) { return this.catalog.list(context(r)); }
  @Post('preview') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramCatalogPreview' }) @ApiCreatedResponse({ type: CatalogPreviewResponseDto })
  preview(@Body() body: CatalogPreviewRequestDto, @Req() r: AuthenticatedRequest) { return this.catalog.preview(body, context(r)); }
  @Post(':id/apply') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramCatalogApply' }) @ApiCreatedResponse({ type: CatalogApplyResponseDto })
  apply(@Param('id', uuid()) id: string, @Body() body: CatalogApplyRequestDto, @Req() r: AuthenticatedRequest) { return this.catalog.apply(id, body, context(r)); }
}
