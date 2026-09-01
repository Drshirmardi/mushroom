import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { PatientDirectoryService } from './patient-directory.service';
import { PatientDoctorDetailDto, PatientDoctorListQueryDto, PatientDoctorPageResponseDto, PatientServiceListQueryDto, PatientServicePageResponseDto } from './patient-directory.dto';

@ApiTags('Patient Directory') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.DIRECTORY_READ_SELF) @Controller('directory')
export class PatientDirectoryController {
  constructor(private readonly directory: PatientDirectoryService) {}
  @Get('doctors') @ApiOperation({ operationId: 'patientDirectoryDoctorsList', summary: 'List visible clinic doctors' }) @ApiOkResponse({ type: PatientDoctorPageResponseDto })
  listDoctors(@Query() query: PatientDoctorListQueryDto, @Req() request: AuthenticatedRequest) { return this.directory.listDoctors(request.auth.userId, query); }
  @Get('doctors/:doctorId') @ApiOperation({ operationId: 'patientDirectoryDoctorGet', summary: 'Get a visible clinic doctor' }) @ApiParam({ name: 'doctorId', format: 'uuid' }) @ApiOkResponse({ type: PatientDoctorDetailDto })
  getDoctor(@Param('doctorId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.directory.getDoctor(request.auth.userId, id); }
  @Get('services') @ApiOperation({ operationId: 'patientDirectoryServicesList', summary: 'List visible clinic services' }) @ApiOkResponse({ type: PatientServicePageResponseDto })
  listServices(@Query() query: PatientServiceListQueryDto, @Req() request: AuthenticatedRequest) { return this.directory.listServices(request.auth.userId, query); }
}
