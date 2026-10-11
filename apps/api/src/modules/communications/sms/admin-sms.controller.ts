import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequireRoles } from '../../../common/auth/authorization.decorator';
import { CreateSmsProviderRevisionDto, OtpPolicyDto, SmsAttemptsQueryDto, SmsDeliveryAttemptDto, SmsProviderConfigDto, TestSmsDto, UpdateOtpPolicyDto, UpdateSmsProviderStateDto } from './admin-sms.dto';
import { SmsProviderConfigService } from './sms-provider-config.service';

@ApiTags('Admin SMS and OTP')
@ApiBearerAuth('bearerAuth')
@RequireRoles('ADMIN')
@Controller('admin/sms')
export class AdminSmsController {
  constructor(private readonly service: SmsProviderConfigService) {}
  @Get('providers') @ApiOperation({ operationId: 'adminSmsProvidersList' }) @ApiOkResponse({ type: SmsProviderConfigDto, isArray: true }) providers() { return this.service.list(); }
  @Post('providers/:providerCode/revisions') @ApiOperation({ operationId: 'adminSmsProviderRevisionCreate' }) @ApiCreatedResponse({ type: SmsProviderConfigDto }) revision(@Param('providerCode') code: string, @Headers('idempotency-key') key: string | undefined, @Body() body: CreateSmsProviderRevisionDto, @Req() request: AuthenticatedRequest) { return this.service.createRevision(code, key, body, this.context(request)); }
  @Patch('providers/:providerCode') @ApiOperation({ operationId: 'adminSmsProviderStateUpdate' }) @ApiOkResponse({ type: SmsProviderConfigDto }) state(@Param('providerCode') code: string, @Body() body: UpdateSmsProviderStateDto, @Req() request: AuthenticatedRequest) { return this.service.updateState(code, body, this.context(request)); }
  @Post('providers/:providerCode/test-connection') @ApiOperation({ operationId: 'adminSmsProviderConnectionTest' }) connection(@Param('providerCode') code: string, @Req() request: AuthenticatedRequest) { return this.service.testConnection(code, this.context(request)); }
  @Post('providers/:providerCode/test-message') @ApiOperation({ operationId: 'adminSmsProviderMessageTest' }) message(@Param('providerCode') code: string, @Body() body: TestSmsDto, @Req() request: AuthenticatedRequest) { return this.service.sendTest(code, body.phone, this.context(request)); }
  @Get('otp-policy') @ApiOperation({ operationId: 'adminOtpPolicyGet' }) @ApiOkResponse({ type: OtpPolicyDto }) policy() { return this.service.policy(); }
  @Patch('otp-policy') @ApiOperation({ operationId: 'adminOtpPolicyUpdate' }) @ApiOkResponse({ type: OtpPolicyDto }) updatePolicy(@Body() body: UpdateOtpPolicyDto, @Req() request: AuthenticatedRequest) { return this.service.updatePolicy(body, this.context(request)); }
  @Get('delivery-attempts') @ApiOperation({ operationId: 'adminSmsDeliveryAttemptsList' }) @ApiOkResponse({ type: SmsDeliveryAttemptDto, isArray: true }) attempts(@Query() query: SmsAttemptsQueryDto) { return this.service.attempts(query.pageSize); }
  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
