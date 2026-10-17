import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
export type GuidanceActorContext = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
export type GuidanceActorMode = 'admin' | 'doctor' | 'patient';
const forbidden = () => new ForbiddenException({ code: 'FORBIDDEN', message: 'Scoped content authority is required.', details: {} });

@Injectable()
export class GuidanceAuthorityService {
  async scope(tx: Prisma.TransactionClient, mode: GuidanceActorMode, ctx: GuidanceActorContext) {
    const session = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=${ctx.actorSessionId}::uuid AND s.user_id=${ctx.actorUserId}::uuid AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u`);
    if (!session.length) throw forbidden();
    if (mode === 'patient') {
      const profile = await tx.patientProfile.findFirst({ where: { userId: ctx.actorUserId, clinic: { status: 'ACTIVE' } }, select: { clinicId: true } });
      if (!profile) throw new NotFoundException({ code: 'GUIDANCE_NOT_FOUND', message: 'Guidance content is unavailable.', details: {} });
      return profile.clinicId;
    }
    const clinics = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.status='ACTIVE' AND a.user_id=${ctx.actorUserId}::uuid FOR SHARE OF c,a`);
    if (!clinics.length) throw forbidden();
    const clinicId = clinics[0]!.id;
    if (mode === 'doctor') await this.doctor(tx, clinicId, ctx.actorUserId);
    if (mode === 'admin') {
      const roles = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT r.id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=${ctx.actorUserId}::uuid AND r.code='ADMIN' FOR SHARE OF ur,r`);
      if (!roles.length) throw forbidden();
    }
    return clinicId;
  }
  async doctor(tx: Prisma.TransactionClient, clinicId: string, userId: string, lock = false) {
    const [authority] = lock
      ? await tx.$queryRaw<{ id: string | null }[]>(Prisma.sql`SELECT guidance_lock_doctor(${userId}::uuid,${clinicId}::uuid) AS id`)
      : await tx.$queryRaw<{ id: string | null }[]>(Prisma.sql`SELECT guidance_doctor_id(${userId}::uuid,${clinicId}::uuid) AS id`);
    if (!authority?.id) throw forbidden();
    return authority.id;
  }
}
