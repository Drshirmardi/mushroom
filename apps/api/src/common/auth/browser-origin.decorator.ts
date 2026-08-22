import { ApiHeader } from '@nestjs/swagger';

export const ApiBrowserOrigin = (): MethodDecorator =>
  ApiHeader({
    name: 'Origin',
    required: false,
    description:
      'Browser-managed origin. When present, it must match the configured allowlist.',
  });
