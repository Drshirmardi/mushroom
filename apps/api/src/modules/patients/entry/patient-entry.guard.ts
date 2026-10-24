import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { PatientEntryService } from './patient-entry.service';

export function entryRequestAllowed(method: string, path: string, submissionId: string | null) {
  if (path.startsWith('/v1/auth/')) return true;
  if (['GET', 'PATCH'].includes(method) && path === '/v1/me') return true;
  if (method === 'POST' && path === '/v1/me/change-password') return true;
  if (method === 'GET' && path === '/v1/patients/me/entry') return true;
  if (method === 'POST' && ['profile', 'start', 'complete'].some(action => path === `/v1/patients/me/entry/${action}`)) return true;
  if (!submissionId) return false;
  const root = `/v1/assessment-submissions/${submissionId.toLowerCase()}`;
  const normalized = path.toLowerCase();
  return method === 'GET' && [root, `${root}/questionnaire`, `${root}/result`, `${root}/provenance`].includes(normalized)
    || method === 'PUT' && normalized === root
    || method === 'POST' && normalized === `${root}/submit`;
}
@Injectable()
export class PatientEntryGuard implements CanActivate {
  constructor(private readonly entry: PatientEntryService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Partial<AuthenticatedRequest>>();
    const auth = request.auth;
    if (!auth?.roles.includes('PATIENT') || auth.roles.some(role => ['ADMIN', 'DOCTOR', 'STAFF'].includes(role))) return true;
    const path = new URL(request.url ?? '/', 'http://internal').pathname; const method = request.method ?? 'GET';
    if (entryRequestAllowed(method, path, null)) return true;
    const status = await this.entry.status(auth.userId);
    if (!status.required || entryRequestAllowed(method, path, status.submissionId)) return true;
    throw new ForbiddenException({ code: 'PATIENT_ENTRY_REQUIRED', message: 'Complete initial entry before continuing.', details: {} });
  }
}
