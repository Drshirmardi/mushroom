import { describe, expect, it } from 'vitest';
import { instanceToPlain } from 'class-transformer';
import { Prisma } from '../src/generated/prisma/client';
import { intakeSnapshot } from '../src/modules/patients/intake/intake-snapshot';

describe('intake weight HTTP serialization', () => {
  it('roundtrips database Decimal through the actual global serializer as a number', () => {
    const weight = new Prisma.Decimal('65.50');
    expect(typeof instanceToPlain({ weightKg: weight }).weightKg).toBe('object');
    const response = JSON.parse(JSON.stringify(instanceToPlain({ snapshot: intakeSnapshot({ weightKg: weight }) })));
    expect(response.snapshot.weightKg).toBe(65.5);
    expect(response.snapshot.heightCm).toBeNull();
  });
  it('preserves omitted optional weight and valid numeric input', () => {
    expect(intakeSnapshot({}).weightKg).toBeNull();
    expect(intakeSnapshot({ weightKg: 72.25 }).weightKg).toBe(72.25);
  });
});
