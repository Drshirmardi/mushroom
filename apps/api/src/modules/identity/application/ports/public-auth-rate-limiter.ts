export interface PublicAuthRateLimitSubject {
  kind: string;
  value: string;
  limit: number;
}

export interface ConsumePublicAuthRateLimit {
  scope: string;
  subjects: PublicAuthRateLimitSubject[];
  windowMs: number;
  at: Date;
}

export abstract class PublicAuthRateLimiter {
  abstract consume(request: ConsumePublicAuthRateLimit): Promise<boolean>;
}
