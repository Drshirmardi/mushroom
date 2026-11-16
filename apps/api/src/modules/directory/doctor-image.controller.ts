import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Put, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { DoctorImageService } from './doctor-image.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });
const respond = (reply: FastifyReply, bytes: Buffer) => reply.type('image/webp').header('cache-control', 'private, no-store').header('x-content-type-options', 'nosniff').send(bytes);

@ApiTags('Admin Directory')
@ApiBearerAuth('bearerAuth')
@Controller('admin/doctors/:doctorId/image')
@RequirePermissions(PERMISSIONS.DIRECTORY_MANAGE)
export class AdminDoctorImageController {
  constructor(private readonly images: DoctorImageService) {}

  @Put() @HttpCode(204) @ApiNoContentResponse()
  @ApiOperation({ operationId: 'adminDoctorImageUpload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  upload(@Param('doctorId', uuid()) id: string, @Req() request: AuthenticatedRequest) {
    return this.images.upload(id, request);
  }

  @Delete() @HttpCode(204) @ApiNoContentResponse()
  @ApiOperation({ operationId: 'adminDoctorImageRemove' })
  remove(@Param('doctorId', uuid()) id: string, @Req() request: AuthenticatedRequest) {
    return this.images.remove(id, request);
  }

  @Get() @ApiProduces('image/webp') @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiOperation({ operationId: 'adminDoctorImagePreview' })
  async preview(@Param('doctorId', uuid()) id: string, @Res() reply: FastifyReply) {
    return respond(reply, await this.images.preview(id));
  }
}

@ApiTags('Patient Directory')
@ApiBearerAuth('bearerAuth')
@Controller('directory/doctors/:doctorId/image')
@RequireRoles('PATIENT')
@RequirePermissions(PERMISSIONS.DIRECTORY_READ_SELF)
export class PatientDoctorImageController {
  constructor(private readonly images: DoctorImageService) {}

  @Get() @ApiProduces('image/webp') @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiOperation({ operationId: 'patientDoctorImageGet' })
  async get(@Param('doctorId', uuid()) id: string, @Req() request: AuthenticatedRequest, @Res() reply: FastifyReply) {
    return respond(reply, await this.images.patientImage(id, request.auth.userId));
  }
}
