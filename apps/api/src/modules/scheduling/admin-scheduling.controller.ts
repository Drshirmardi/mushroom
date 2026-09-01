import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { AdminSchedulingService } from './admin-scheduling.service';
import { AvailabilityRuleListQueryDto, AvailabilityRulePageResponseDto, AvailabilityRuleResponseDto, ClinicClosureListQueryDto, ClinicClosurePageResponseDto, ClinicClosureResponseDto, CreateAvailabilityRuleDto, CreateClinicClosureDto, CreateDoctorAvailabilityExceptionDto, DoctorAvailabilityExceptionListQueryDto, DoctorAvailabilityExceptionPageResponseDto, DoctorAvailabilityExceptionResponseDto, UpdateAvailabilityRuleDto, UpdateClinicClosureDto, UpdateDoctorAvailabilityExceptionDto } from './admin-scheduling.dto';

@ApiTags('Admin Scheduling')
@ApiBearerAuth('bearerAuth')
@Controller('admin')
@RequirePermissions(PERMISSIONS.SCHEDULING_MANAGE)
export class AdminSchedulingController {
  constructor(private readonly scheduling: AdminSchedulingService) {}
  @Get('availability-rules') @ApiOperation({ operationId: 'adminAvailabilityRulesList' }) @ApiOkResponse({ type: AvailabilityRulePageResponseDto }) listRules(@Query() query: AvailabilityRuleListQueryDto) { return this.scheduling.listRules(query); }
  @Post('availability-rules') @ApiOperation({ operationId: 'adminAvailabilityRulesCreate' }) @ApiCreatedResponse({ type: AvailabilityRuleResponseDto }) createRule(@Body() body: CreateAvailabilityRuleDto) { return this.scheduling.createRule(body); }
  @Get('availability-rules/:ruleId') @ApiOperation({ operationId: 'adminAvailabilityRulesGet' }) @ApiParam({ name: 'ruleId', format: 'uuid' }) @ApiOkResponse({ type: AvailabilityRuleResponseDto }) getRule(@Param('ruleId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.scheduling.getRule(id); }
  @Patch('availability-rules/:ruleId') @ApiOperation({ operationId: 'adminAvailabilityRulesUpdate' }) @ApiParam({ name: 'ruleId', format: 'uuid' }) @ApiOkResponse({ type: AvailabilityRuleResponseDto }) updateRule(@Param('ruleId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateAvailabilityRuleDto) { return this.scheduling.updateRule(id, body); }
  @Delete('availability-rules/:ruleId') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ operationId: 'adminAvailabilityRulesDelete' }) @ApiParam({ name: 'ruleId', format: 'uuid' }) @ApiNoContentResponse() deleteRule(@Param('ruleId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.scheduling.deleteRule(id); }

  @Get('clinic-closures') @ApiOperation({ operationId: 'adminClinicClosuresList' }) @ApiOkResponse({ type: ClinicClosurePageResponseDto }) listClosures(@Query() query: ClinicClosureListQueryDto) { return this.scheduling.listClosures(query); }
  @Post('clinic-closures') @ApiOperation({ operationId: 'adminClinicClosuresCreate' }) @ApiCreatedResponse({ type: ClinicClosureResponseDto }) createClosure(@Body() body: CreateClinicClosureDto) { return this.scheduling.createClosure(body); }
  @Get('clinic-closures/:closureId') @ApiOperation({ operationId: 'adminClinicClosuresGet' }) @ApiParam({ name: 'closureId', format: 'uuid' }) @ApiOkResponse({ type: ClinicClosureResponseDto }) getClosure(@Param('closureId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.scheduling.getClosure(id); }
  @Patch('clinic-closures/:closureId') @ApiOperation({ operationId: 'adminClinicClosuresUpdate' }) @ApiParam({ name: 'closureId', format: 'uuid' }) @ApiOkResponse({ type: ClinicClosureResponseDto }) updateClosure(@Param('closureId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateClinicClosureDto) { return this.scheduling.updateClosure(id, body); }
  @Delete('clinic-closures/:closureId') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ operationId: 'adminClinicClosuresDelete' }) @ApiParam({ name: 'closureId', format: 'uuid' }) @ApiNoContentResponse() deleteClosure(@Param('closureId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.scheduling.deleteClosure(id); }

  @Get('doctor-availability-exceptions') @ApiOperation({ operationId: 'adminDoctorAvailabilityExceptionsList' }) @ApiOkResponse({ type: DoctorAvailabilityExceptionPageResponseDto }) listExceptions(@Query() query: DoctorAvailabilityExceptionListQueryDto) { return this.scheduling.listExceptions(query); }
  @Post('doctor-availability-exceptions') @ApiOperation({ operationId: 'adminDoctorAvailabilityExceptionsCreate' }) @ApiCreatedResponse({ type: DoctorAvailabilityExceptionResponseDto }) createException(@Body() body: CreateDoctorAvailabilityExceptionDto) { return this.scheduling.createException(body); }
  @Get('doctor-availability-exceptions/:exceptionId') @ApiOperation({ operationId: 'adminDoctorAvailabilityExceptionsGet' }) @ApiParam({ name: 'exceptionId', format: 'uuid' }) @ApiOkResponse({ type: DoctorAvailabilityExceptionResponseDto }) getException(@Param('exceptionId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.scheduling.getException(id); }
  @Patch('doctor-availability-exceptions/:exceptionId') @ApiOperation({ operationId: 'adminDoctorAvailabilityExceptionsUpdate' }) @ApiParam({ name: 'exceptionId', format: 'uuid' }) @ApiOkResponse({ type: DoctorAvailabilityExceptionResponseDto }) updateException(@Param('exceptionId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateDoctorAvailabilityExceptionDto) { return this.scheduling.updateException(id, body); }
  @Delete('doctor-availability-exceptions/:exceptionId') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ operationId: 'adminDoctorAvailabilityExceptionsDelete' }) @ApiParam({ name: 'exceptionId', format: 'uuid' }) @ApiNoContentResponse() deleteException(@Param('exceptionId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.scheduling.deleteException(id); }
}
