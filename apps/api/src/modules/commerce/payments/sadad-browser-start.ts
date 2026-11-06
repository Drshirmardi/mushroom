import { normalizeSadadCallbackUrl } from '../../../config/sadad-callback-url';
import { buildSadadRedirect, type SadadRedirectProfile } from './sadad-payment-provider.adapter';

export const SADAD_START_PATH = '/v1/payments/providers/sadad/start';

export function buildSadadStartUrl(returnUrl: string, token: string): string {
  const url = new URL(SADAD_START_PATH, normalizeSadadCallbackUrl(returnUrl));
  // Fragments never enter proxy/API access logs or the outgoing Referer.
  url.hash = encodeURIComponent(token);
  return url.toString();
}

export function sadadStartDocument(profile: SadadRedirectProfile, nonce: string): string {
  const target = buildSadadRedirect(profile, 'SADAD_BROWSER_TOKEN');
  const safeTarget = JSON.stringify(target).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="origin">
  <meta name="theme-color" content="#F6FAFC">
  <title>انتقال به درگاه پرداخت</title>

  <style nonce="${nonce}">
    :root {
      color-scheme: light;
      font-family: Vazirmatn, Tahoma, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    * { box-sizing: border-box; }

    [hidden] { display: none !important; }

    body {
      margin: 0;
      min-height: 100svh;
      color: #173C53;
      background:
        radial-gradient(
          ellipse at 50% 18%,
          rgba(8,127,133,.09),
          transparent 58%
        ),
        #F6FAFC;
    }

    .page {
      min-height: 100svh;
      padding: 24px;
      display: grid;
      place-items: center;
    }

    .container {
      width: 100%;
      max-width: 440px;
      text-align: center;
    }

    .card {
      background: #fff;
      border: 1px solid #E7EFF3;
      border-radius: 28px;
      padding: 48px 32px 34px;
      box-shadow: 0 18px 60px rgba(23,60,83,.055);
    }

    .visual {
      width: 88px;
      height: 88px;
      position: relative;
      margin: 0 auto 30px;
      display: grid;
      place-items: center;
    }

    .visual::before {
      content: "";
      position: absolute;
      inset: 0;
      border: 2.5px solid #E6F4F4;
      border-top-color: #087F85;
      border-right-color: #087F85;
      border-radius: 50%;
      animation: rotate 1.1s linear infinite;
    }

    .visual-inner {
      width: 66px;
      height: 66px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: linear-gradient(145deg, #E9F7F7, #F5FBFB);
      color: #087F85;
    }

    .visual svg {
      width: 29px;
      height: 29px;
    }

    .eyebrow {
      display: inline-block;
      margin-bottom: 14px;
      font-size: 12px;
      font-weight: 600;
      color: #087F85;
      letter-spacing: .1px;
    }

    h1 {
      margin: 0 0 12px;
      font-size: clamp(21px, 5vw, 25px);
      font-weight: 750;
      line-height: 1.6;
      letter-spacing: -.5px;
    }

    .description {
      margin: 0;
      color: #748898;
      font-size: 13.5px;
      line-height: 2;
    }

    .progress {
      margin: 32px auto 23px;
      max-width: 260px;
      height: 4px;
      border-radius: 99px;
      overflow: hidden;
      background: #EAF1F3;
    }

    .progress::after {
      content: "";
      display: block;
      height: 100%;
      width: 40%;
      border-radius: inherit;
      background: linear-gradient(90deg, #176B9A, #087F85);
      animation: move 1.6s ease-in-out infinite alternate;
    }

    .divider {
      height: 1px;
      background: #EEF2F5;
      margin: 0 0 21px;
    }

    .note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #8999A5;
      font-size: 12px;
      line-height: 1.8;
    }

    .note svg {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }

    .actions {
      margin-top: 22px;
    }

    .action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 46px;
      padding: 10px 16px;
      border: 1px solid #D6E9EA;
      border-radius: 13px;
      background: #F1F9F9;
      color: #087F85;
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      text-decoration: none;
      cursor: pointer;
      transition: background .2s ease;
    }

    .action:hover {
      background: #E1F2F2;
    }

    .footer {
      margin-top: 24px;
      color: #97A8B4;
      font-size: 11px;
      line-height: 1.8;
    }

    .is-error .visual::before {
      animation: none;
      border-color: #F7D7D7;
    }

    .is-error .visual-inner {
      background: #FFF1F1;
      color: #C04444;
    }

    .is-error .progress {
      display: none;
    }

    .is-error .eyebrow {
      color: #C04444;
    }

    .is-error .divider {
      margin-top: 30px;
    }

    @keyframes rotate {
      to { transform: rotate(360deg); }
    }

    @keyframes move {
      from { transform: translateX(0); }
      to { transform: translateX(-150%); }
    }

    @media (max-width: 480px) {
      .page { padding: 18px; }
      .card {
        padding: 40px 22px 28px;
        border-radius: 23px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
      }
    }
  </style>
</head>

<body>
  <main class="page">
    <div class="container">
      <section class="card" aria-labelledby="heading">
        <div class="visual" aria-hidden="true">
          <div class="visual-inner">
            <svg viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3"/>
              <path d="M3 10h18"/>
              <path d="M7 15h4"/>
            </svg>
          </div>
        </div>

        <span class="eyebrow" id="eyebrow">
          اتصال به درگاه پرداخت
        </span>

        <h1 id="heading">در حال انتقال به درگاه سداد</h1>

        <p class="description" id="status" role="status" aria-live="polite">
          در حال آماده‌سازی صفحه پرداخت هستیم.
          <br>
          لطفاً چند لحظه صبر کنید.
        </p>

        <div class="progress" aria-hidden="true"></div>
        <div class="divider"></div>

        <div class="note">
          <svg viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <rect x="5" y="10" width="14" height="11" rx="2"/>
            <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          </svg>
          اتصال به صفحه پرداخت بانکی
        </div>

        // <div class="actions">
        //   <a id="continue" class="action" hidden
        //      rel="noreferrer">
        //     ورود دستی به درگاه پرداخت
        //   </a>
        //   <button id="back" class="action" type="button" hidden>
        //     بازگشت به صفحه قبل
        //   </button>
        // </div>

        <noscript>
          <p class="description">
            برای انتقال خودکار، جاوااسکریپت مرورگر
            باید فعال باشد.
          </p>
        </noscript>
      </section>

      <p class="footer">
        پس از پرداخت، نتیجه تراکنش در برنامه بررسی می‌شود.
      </p>
    </div>
  </main>

  <script nonce="${nonce}">
    (() => {
      const status = document.getElementById('status');
      const heading = document.getElementById('heading');
      const eyebrow = document.getElementById('eyebrow');
      const link = document.getElementById('continue');
      const back = document.getElementById('back');

      back.addEventListener('click', () => history.back());

      try {
        const token = decodeURIComponent(location.hash.slice(1));

        history.replaceState(null, '', location.pathname);

        const invalid =
          !token ||
          token.length > 512 ||
          token.split('').some(ch => {
            const code = ch.charCodeAt(0);
            return code <= 32 || code === 127;
          });

        if (invalid) throw new Error('Invalid token');

        const destination = ${safeTarget}.replace(
          'SADAD_BROWSER_TOKEN',
          encodeURIComponent(token)
        );

        link.href = destination;
        link.hidden = false;

        location.replace(destination);
      } catch {
        document.documentElement.classList.add('is-error');
        eyebrow.textContent = 'خطا در انتقال';
        heading.textContent = 'امکان اتصال وجود ندارد';
        status.textContent =
          'پیوند پرداخت معتبر نیست. لطفاً به برنامه برگردید و دوباره پرداخت را آغاز کنید.';

        link.hidden = true;
        back.hidden = false;
      }
    })();
  </script>
</body>
</html>`;
}
