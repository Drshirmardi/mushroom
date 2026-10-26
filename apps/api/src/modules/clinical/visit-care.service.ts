import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PatientAccessAction, Prisma } from '../../generated/prisma/client';
import type { RoleCode } from '../../common/auth/authorization.policy';
import { ClinicalPermissionService } from '../../common/auth/clinical-permission.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from './clinical-access-audit.service';

type Actor = ClinicalAuditContext & { roles: RoleCode[] };
type Tx = Prisma.TransactionClient;
const deny = () => new ForbiddenException({ code: 'FORBIDDEN', message: 'Assigned physician or authorized clinic administrator required.', details: {} });

@Injectable()
export class VisitCareService {
  constructor(private readonly prisma: PrismaService, private readonly permissions: ClinicalPermissionService, private readonly audit: ClinicalAccessAuditService) {}

  async authorize(appointmentId: string, actor: Actor, db?: Tx) {
    if (!actor.roles.includes('ADMIN') && !actor.roles.includes('DOCTOR')) throw deny();
    if (!db && !await this.permissions.allows(actor.roles, ['clinical:record:edit'])) throw deny();
    const visit = await (db ?? this.prisma).appointment.findFirst({ where: {
      id: appointmentId, clinic: { clinicalClinicAccesses: { some: { userId: actor.actorUserId } } },
      ...(actor.roles.includes('ADMIN') ? {} : { doctor: { userId: actor.actorUserId, isActive: true } }),
    }, select: { id: true, clinicId: true, patientId: true, status: true } });
    if (!visit || ['PENDING', 'CANCELLED', 'NO_SHOW'].includes(visit.status)) throw deny();
    return visit;
  }

  async products(appointmentId: string, actor: Actor, query: string, page: number) {
    const visit = await this.authorize(appointmentId, actor);
    const where: Prisma.CommerceSkuWhereInput = {
      clinicId: visit.clinicId, isActive: true, product: { status: 'ACTIVE', category: { isActive: true } },
      ...(query ? { OR: [{ code: { contains: query, mode: 'insensitive' } }, { title: { contains: query, mode: 'insensitive' } }, { product: { title: { contains: query, mode: 'insensitive' } } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.commerceSku.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 12, take: 12, select: { id: true, code: true, title: true, currentPriceToman: true, product: { select: { title: true } } } }),
      this.prisma.commerceSku.count({ where }),
    ]);
    return { items: rows.map(row => ({ skuId: row.id, code: row.code, title: row.product.title, variant: row.title, priceToman: row.currentPriceToman.toString() })), page, pageSize: 12, total };
  }

  async addToCart(appointmentId: string, actor: Actor, input: { commandId: string; skuId: string; quantity: number }) {
    await this.authorize(appointmentId, actor);
    return this.prisma.$transaction(async tx => {
      const visit = await this.authorize(appointmentId, actor, tx);
      // The command audit and cart increment commit together; retries cannot add twice.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`visit-cart-command:${input.commandId}`}, 0))::text`;
      const prior = await tx.auditEvent.findUnique({ where: { id: input.commandId } });
      if (prior) {
        const data = prior.metadata as Record<string, unknown>;
        if (prior.action !== 'VISIT_CART_ADD' || prior.actorUserId !== actor.actorUserId || prior.subjectId !== visit.patientId || data.appointmentId !== appointmentId || data.skuId !== input.skuId || data.addedQuantity !== input.quantity) throw new ConflictException({ code: 'CONFLICT', message: 'Command already used for different input.', details: {} });
        return { skuId: input.skuId, addedQuantity: input.quantity, quantity: Number(data.quantity) };
      }
      const sku = await tx.commerceSku.findFirst({ where: { id: input.skuId, clinicId: visit.clinicId, isActive: true, product: { status: 'ACTIVE', category: { isActive: true } } }, select: { id: true } });
      if (!sku) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Product is unavailable.', details: {} });
      const cart = await tx.commerceCart.upsert({ where: { patientId: visit.patientId }, create: { clinicId: visit.clinicId, patientId: visit.patientId }, update: {} });
      await tx.$queryRaw`SELECT id FROM commerce_carts WHERE id=${cart.id}::uuid FOR UPDATE`;
      const item = await tx.commerceCartItem.upsert({ where: { cartId_skuId: { cartId: cart.id, skuId: sku.id } }, create: { cartId: cart.id, skuId: sku.id, quantity: input.quantity }, update: { quantity: { increment: input.quantity } } });
      const quantity = item.quantity;
      if (quantity > 100) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Cart quantity must not exceed 100.', details: {} });
      await tx.auditEvent.create({ data: { id: input.commandId, action: 'VISIT_CART_ADD', actorUserId: actor.actorUserId, actorSessionId: actor.actorSessionId, subjectType: 'PATIENT', subjectId: visit.patientId, requestId: actor.requestId, ipAddress: actor.ipAddress, metadata: { appointmentId, skuId: sku.id, addedQuantity: input.quantity, quantity } } });
      await this.audit.record({ clinicId: visit.clinicId, patientId: visit.patientId, action: PatientAccessAction.UPDATE, resourceType: 'VISIT_CART', resourceId: cart.id, metadata: { appointmentId, skuId: sku.id, addedQuantity: input.quantity } }, actor, tx);
      return { skuId: sku.id, addedQuantity: input.quantity, quantity };
    });
  }
}
