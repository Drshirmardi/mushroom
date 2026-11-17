export function balePaymentReturnLink(username: string | undefined, intentId: string): string | null {
  if (!username || !/^[A-Za-z0-9_]{3,64}$/u.test(username)) return null;
  const link = new URL(`https://ble.ir/${username}`);
  link.searchParams.set('startapp', `payment_${intentId}`);
  return link.toString();
}

export function balePaymentReturnDocument(baleUrl: string | null, resultUrl: string): string {
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
</style>
<main>
  <h1>بازگشت از درگاه پرداخت</h1>
  <p><strong>این تب را ببندید و به همان صفحهٔ پرداخت در بله برگردید.</strong></p>
  <p>در صفحهٔ پرداخت، گزینهٔ «بررسی وضعیت پرداخت» را بزنید.</p>
  ${baleUrl ? `<a href="${attribute(baleUrl)}">باز کردن اپ بله</a>` : ''}
  <p>برای دیدن نتیجه در وب، با همان حساب بیمار وارد شوید.</p>
  <a href="${attribute(resultUrl)}">مشاهدهٔ نتیجه در وب</a>
</main>
</html>`;
}
