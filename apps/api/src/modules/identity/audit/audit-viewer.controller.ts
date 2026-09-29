import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequireRoles } from '../../../common/auth/authorization.decorator';
import { AuditViewerPageDto, AuditViewerQueryDto } from './audit-viewer.dto';
import { AuditViewerSessionGuard } from './audit-viewer-session.guard';
import { AuditViewerService } from './audit-viewer.service';

@ApiTags('Admin audit events')
@ApiBearerAuth('bearerAuth')
@RequireRoles('ADMIN')
@UseGuards(AuditViewerSessionGuard)
@Controller('admin/audit-events')
export class AuditViewerController {
  constructor(private readonly auditViewer: AuditViewerService) {}

  @Get()
  @ApiOperation({ operationId: 'adminAuditEventsList', summary: 'List clinic-scoped clinical audit events using a redacted, cursor-paginated representation' })
  @ApiOkResponse({ type: AuditViewerPageDto })
  list(@Query() query: AuditViewerQueryDto, @Req() request: AuthenticatedRequest) {
    return this.auditViewer.list(query, { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip });
  }
}
