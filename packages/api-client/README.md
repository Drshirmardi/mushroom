# API client

این package قرارداد TypeScript و client مبتنی بر `fetch` را مستقیماً از OpenAPI بک‌اند
فراهم می‌کند. فایل‌های `openapi.json` و `src/schema.generated.ts` خروجی تولیدشده هستند و
نباید دستی ویرایش شوند.

## به‌روزرسانی قرارداد

از ریشه repository اجرا شود:

```text
corepack pnpm generate:api-client
```

فرمان ابتدا سند runtime را از NestJS استخراج و سپس typeهای client را تولید می‌کند. scriptهای
`build`، `test` و `typecheck` stale بودن فایل تولیدشده را بررسی می‌کنند.

## مصرف

```ts
import { createApiClient } from '@sabz-zendegi/api-client';

const api = createApiClient({ baseUrl: 'http://localhost:3003' });
const { data, error } = await api.POST('/v1/auth/login', {
  body: {
    phone: '09123456789',
    password: 'correct horse battery staple',
    remember: false,
  },
});
```

همه درخواست‌ها با `credentials: 'include'` ارسال می‌شوند تا refresh cookie مرورگر کار کند.
access token باید فقط در حافظه frontend نگه‌داری و برای endpointهای محافظت‌شده از طریق header
`Authorization: Bearer ...` به همان call داده شود.
