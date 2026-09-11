import { Injectable } from '@nestjs/common';

@Injectable()
export class CommerceClock {
  now(): Date {
    return new Date();
  }
}
