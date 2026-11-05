import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

type Request = { method: string; url: string; headers: Record<string, unknown>; auth?: { userId: string } };
const uuid = /^[a-f0-9-]{36}$/i;
@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  constructor(private readonly analytics: AnalyticsService, private readonly db: PrismaService) {}
  intercept(execution: ExecutionContext, next: CallHandler) {
    const request = execution.switchToHttp().getRequest<Request>();
    const context = this.analytics.context(request.headers['x-analytics-context']);
    if (!context || request.method !== 'POST') return next.handle();
    const path = request.url.split('?')[0];
    return next.handle().pipe(mergeMap(async (result: unknown) => {
      if (!result || typeof result !== 'object') return result;
      const row = result as Record<string, unknown>;
      await this.analytics.bestEffort(async () => {
        if (path === '/v1/patients/me/orders' && typeof row.id === 'string' && uuid.test(row.id) && request.auth?.userId) {
          await this.analytics.captureOrder(row.id, request.auth.userId, context);
        } else if (typeof row.intentId === 'string' && uuid.test(row.intentId) && request.auth?.userId && /^\/v1\/patients\/me\/billing\/intents\//.test(path)) {
          await this.analytics.captureIntent(row.intentId, request.auth.userId, context);
        } else if (typeof row.id === 'string' && uuid.test(row.id) && typeof row.purpose === 'string' && row.currency === 'IRR' && request.auth?.userId && /^\/v1\/patients\/me\//.test(path)) {
          await this.analytics.captureIntent(row.id, request.auth.userId, context);
        } else if (/^\/v1\/assessment-submissions\/[^/]+\/submit$/.test(path) && row.state === 'COMPLETE' && typeof row.id === 'string' && uuid.test(row.id) && row.completedAt) {
          await this.db.$transaction(tx => this.analytics.enqueue(tx, 'assessment_completed', row.id as string, new Date(row.completedAt as string | Date), context));
        } else if (path === '/v1/appointments' && row.status === 'CONFIRMED' && typeof row.id === 'string' && uuid.test(row.id)) {
          await this.db.$transaction(tx => this.analytics.enqueue(tx, 'booking_confirmed', row.id as string, new Date(row.createdAt as string | Date), context));
        } else if (path === '/v1/auth/register' || /^\/v1\/auth\/otp\/challenges\/[^/]+\/verify$/.test(path)) {
          const userId = path === '/v1/auth/register' ? row.id : (row.user as { id?: unknown } | undefined)?.id;
          if (typeof userId !== 'string' || !uuid.test(userId)) return;
          const user = await this.db.user.findUnique({ where: { id: userId }, select: { id: true, createdAt: true } });
          if (user) await this.db.$transaction(tx => this.analytics.enqueue(tx, 'sign_up', user.id, user.createdAt, context));
        }
      });
      return result;
    }));
  }
}
