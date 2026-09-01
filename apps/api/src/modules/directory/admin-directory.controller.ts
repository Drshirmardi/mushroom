import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../common/errors/api-error-response.decorator';
import { AdminDirectoryService } from './admin-directory.service';
import { ClinicResponseDto, CreateDoctorDto, CreateDoctorServiceDto, CreateServiceDto, CreateSpecialtyDto, DirectoryListQueryDto, DirectoryPageResponseDto, DoctorListQueryDto, DoctorPageResponseDto, DoctorResponseDto, DoctorServiceListQueryDto, DoctorServicePageResponseDto, DoctorServiceResponseDto, ServiceResponseDto, SpecialtyResponseDto, UpdateClinicDto, UpdateDoctorDto, UpdateDoctorServiceDto, UpdateServiceDto, UpdateSpecialtyDto } from './admin-directory.dto';

@ApiTags('Admin Directory')
@ApiBearerAuth('bearerAuth')
@Controller('admin')
@RequirePermissions(PERMISSIONS.DIRECTORY_MANAGE)
export class AdminDirectoryController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get('clinic') @ApiOperation({ operationId: 'adminClinicGet', summary: 'Get the active clinic' }) @ApiOkResponse({ type: ClinicResponseDto }) @ApiErrorResponse(HttpStatus.NOT_FOUND, 'The active clinic was not found.')
  getClinic() { return this.directory.getClinic(); }
  @Patch('clinic') @ApiOperation({ operationId: 'adminClinicUpdate', summary: 'Update the active clinic' }) @ApiOkResponse({ type: ClinicResponseDto }) @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Clinic input is invalid.')
  updateClinic(@Body() body: UpdateClinicDto) { return this.directory.updateClinic(body); }

  @Get('doctors') @ApiOperation({ operationId: 'adminDoctorsList', summary: 'List clinic doctors' }) @ApiOkResponse({ type: DoctorPageResponseDto })
  listDoctors(@Query() query: DoctorListQueryDto) { return this.directory.listDoctors(query); }
  @Post('doctors') @ApiOperation({ operationId: 'adminDoctorsCreate', summary: 'Create a clinic doctor' }) @ApiCreatedResponse({ type: DoctorResponseDto })
  createDoctor(@Body() body: CreateDoctorDto) { return this.directory.createDoctor(body); }
  @Get('doctors/:doctorId') @ApiOperation({ operationId: 'adminDoctorsGet', summary: 'Get a clinic doctor' }) @ApiParam({ name: 'doctorId', format: 'uuid' }) @ApiOkResponse({ type: DoctorResponseDto })
  getDoctor(@Param('doctorId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.directory.getDoctor(id); }
  @Patch('doctors/:doctorId') @ApiOperation({ operationId: 'adminDoctorsUpdate', summary: 'Update a clinic doctor' }) @ApiParam({ name: 'doctorId', format: 'uuid' }) @ApiOkResponse({ type: DoctorResponseDto })
  updateDoctor(@Param('doctorId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateDoctorDto) { return this.directory.updateDoctor(id, body); }
  @Delete('doctors/:doctorId') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ operationId: 'adminDoctorsDelete', summary: 'Delete an unused clinic doctor' }) @ApiParam({ name: 'doctorId', format: 'uuid' }) @ApiNoContentResponse()
  deleteDoctor(@Param('doctorId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.directory.deleteDoctor(id); }

  @Get('specialties') @ApiOperation({ operationId: 'adminSpecialtiesList', summary: 'List clinic specialties' }) @ApiOkResponse({ type: DirectoryPageResponseDto })
  listSpecialties(@Query() query: DirectoryListQueryDto) { return this.directory.listSpecialties(query); }
  @Post('specialties') @ApiOperation({ operationId: 'adminSpecialtiesCreate', summary: 'Create a clinic specialty' }) @ApiCreatedResponse({ type: SpecialtyResponseDto })
  createSpecialty(@Body() body: CreateSpecialtyDto) { return this.directory.createSpecialty(body); }
  @Get('specialties/:specialtyId') @ApiOperation({ operationId: 'adminSpecialtiesGet', summary: 'Get a clinic specialty' }) @ApiParam({ name: 'specialtyId', format: 'uuid' }) @ApiOkResponse({ type: SpecialtyResponseDto })
  getSpecialty(@Param('specialtyId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.directory.getSpecialty(id); }
  @Patch('specialties/:specialtyId') @ApiOperation({ operationId: 'adminSpecialtiesUpdate', summary: 'Update a clinic specialty' }) @ApiParam({ name: 'specialtyId', format: 'uuid' }) @ApiOkResponse({ type: SpecialtyResponseDto })
  updateSpecialty(@Param('specialtyId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateSpecialtyDto) { return this.directory.updateSpecialty(id, body); }
  @Delete('specialties/:specialtyId') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ operationId: 'adminSpecialtiesDelete', summary: 'Delete an unused clinic specialty' }) @ApiParam({ name: 'specialtyId', format: 'uuid' }) @ApiNoContentResponse()
  deleteSpecialty(@Param('specialtyId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.directory.deleteSpecialty(id); }

  @Get('services') @ApiOperation({ operationId: 'adminServicesList', summary: 'List clinic services' }) @ApiOkResponse({ type: DirectoryPageResponseDto })
  listServices(@Query() query: DirectoryListQueryDto) { return this.directory.listServices(query); }
  @Post('services') @ApiOperation({ operationId: 'adminServicesCreate', summary: 'Create a clinic service' }) @ApiCreatedResponse({ type: ServiceResponseDto })
  createService(@Body() body: CreateServiceDto) { return this.directory.createService(body); }
  @Get('services/:serviceId') @ApiOperation({ operationId: 'adminServicesGet', summary: 'Get a clinic service' }) @ApiParam({ name: 'serviceId', format: 'uuid' }) @ApiOkResponse({ type: ServiceResponseDto })
  getService(@Param('serviceId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.directory.getService(id); }
  @Patch('services/:serviceId') @ApiOperation({ operationId: 'adminServicesUpdate', summary: 'Update a clinic service' }) @ApiParam({ name: 'serviceId', format: 'uuid' }) @ApiOkResponse({ type: ServiceResponseDto })
  updateService(@Param('serviceId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateServiceDto) { return this.directory.updateService(id, body); }
  @Delete('services/:serviceId') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ operationId: 'adminServicesDelete', summary: 'Delete an unused clinic service' }) @ApiParam({ name: 'serviceId', format: 'uuid' }) @ApiNoContentResponse()
  deleteService(@Param('serviceId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.directory.deleteService(id); }

  @Get('doctor-services') @ApiOperation({ operationId: 'adminDoctorServicesList', summary: 'List clinic doctor services' }) @ApiOkResponse({ type: DoctorServicePageResponseDto })
  listDoctorServices(@Query() query: DoctorServiceListQueryDto) { return this.directory.listDoctorServices(query); }
  @Post('doctor-services') @ApiOperation({ operationId: 'adminDoctorServicesCreate', summary: 'Create a doctor service' }) @ApiCreatedResponse({ type: DoctorServiceResponseDto })
  createDoctorService(@Body() body: CreateDoctorServiceDto) { return this.directory.createDoctorService(body); }
  @Get('doctor-services/:doctorServiceId') @ApiOperation({ operationId: 'adminDoctorServicesGet', summary: 'Get a doctor service' }) @ApiParam({ name: 'doctorServiceId', format: 'uuid' }) @ApiOkResponse({ type: DoctorServiceResponseDto })
  getDoctorService(@Param('doctorServiceId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.directory.getDoctorService(id); }
  @Patch('doctor-services/:doctorServiceId') @ApiOperation({ operationId: 'adminDoctorServicesUpdate', summary: 'Update a doctor service' }) @ApiParam({ name: 'doctorServiceId', format: 'uuid' }) @ApiOkResponse({ type: DoctorServiceResponseDto })
  updateDoctorService(@Param('doctorServiceId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateDoctorServiceDto) { return this.directory.updateDoctorService(id, body); }
  @Delete('doctor-services/:doctorServiceId') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ operationId: 'adminDoctorServicesDelete', summary: 'Delete an unused doctor service' }) @ApiParam({ name: 'doctorServiceId', format: 'uuid' }) @ApiNoContentResponse()
  deleteDoctorService(@Param('doctorServiceId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.directory.deleteDoctorService(id); }
}
