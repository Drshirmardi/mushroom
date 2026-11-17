export function balePaymentReturnLink(username: string | undefined, intentId: string, mode: 'startapp' | 'start' = 'startapp'): string | null {
  if (!username || !/^[A-Za-z0-9_]{3,64}$/u.test(username)) return null;
  const link = new URL(`https://ble.ir/${username}`);
  link.searchParams.set(mode, `payment_${intentId}`);
  return link.toString();
}

export function balePaymentReturnDocument(baleUrl: string | null, resultUrl: string, followup?: { chatUrl: string | null; intentId: string; nonce: string }): string {
  const attribute = (url: string) => url.replace(/[&"<>'`]/gu, (char) => `&#${char.charCodeAt(0)};`);
  return `<!doctype html>
<html lang="fa" dir="rtl">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>بازگشت از درگاه پرداخت</title>
<style>
  body{margin:0;padding:1rem;font:1rem/1.8 system-ui,sans-serif;color:#173c53;background:#f6fafb}
  main{max-width:28rem;margin:12vh auto;padding:1.5rem;border:1px solid #dbe6eb;border-radius:1rem;background:white;text-align:center}
  h1{font-size:1.25rem} a{display:block;margin-top:.75rem;padding:.65rem;border-radius:.5rem}
  input{box-sizing:border-box;width:100%;padding:.65rem;font:inherit}
  button{margin-top:.5rem;padding:.55rem .85rem;font:inherit}
</style>
<main>
  <h1>بازگشت از درگاه پرداخت</h1>
  <p><strong>این تب را ببندید و به همان صفحهٔ پرداخت در بله برگردید.</strong></p>
  <p>در صفحهٔ پرداخت، گزینهٔ «بررسی وضعیت پرداخت» را بزنید.</p>
  ${baleUrl ? `<a href="${attribute(baleUrl)}">باز کردن اپ بله</a>` : ''}
  ${followup ? `
  ${followup.chatUrl ? `<a href="${attribute(followup.chatUrl)}">پیگیری در چت بله</a>` : ''}
  <p>اگر لینک باز نشد، این دستور را در چت بازو بفرستید.</p>
  <input id="payment-command" aria-label="دستور پیگیری پرداخت" dir="ltr" readonly value="${attribute(`/start payment_${followup.intentId}`)}">
  <button id="copy-command" type="button">کپی دستور پیگیری</button>
  <p id="copy-feedback" role="status"></p>
  <script nonce="${attribute(followup.nonce)}">
    document.getElementById('copy-command').addEventListener('click', async () => {
      const input = document.getElementById('payment-command');
      const feedback = document.getElementById('copy-feedback');
      try {
        await navigator.clipboard.writeText(input.value);
        feedback.textContent = 'دستور کپی شد.';
      } catch {
        input.focus();
        input.select();
        feedback.textContent = 'دستور را از کادر انتخاب‌شده کپی کنید.';
      }
    });
  </script>` : ''}
  <p>برای دیدن نتیجه در وب، با همان حساب بیمار وارد شوید.</p>
  <a href="${attribute(resultUrl)}">مشاهدهٔ نتیجه در وب</a>
</main>
</html>`;
}

export function balePaymentStatusText(intent: { status: string; attempts: { status: string }[] }): string {
  if (intent.status === 'PAID') return 'پرداخت تأیید شد.';
  if (intent.status === 'COMPENSATED') return 'مبلغ پرداخت به کیف پول شما برگشت.';
  const attempts = intent.attempts;
  if (attempts.some(({ status }) => ['CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING', 'REQUIRES_RECONCILIATION'].includes(status))) {
    return 'پرداخت در حال بررسی است.';
  }
  if (intent.status === 'CANCELLED' || intent.status === 'EXPIRED') return 'این درخواست پرداخت بسته شده است.';
  return attempts[0]?.status === 'FAILED' ? 'پرداخت انجام نشد.' : 'پرداخت در حال بررسی است.';
}
