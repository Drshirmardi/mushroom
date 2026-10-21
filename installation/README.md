# نصب و مدیریت سرور Mushroom

نصاب مستقل برای **Ubuntu Server 24.04 LTS روی x86_64/amd64**، محیط توسعهٔ مشترک و production واقعی است. به clone ریپوی خصوصی، Node روی host یا توکن دائمی GitHub نیاز ندارد. نصب، سرور را آماده می‌کند؛ اولین اجرای پروژه از GitHub Actions انجام می‌شود. ساخت بسته را بعد از merge شدن همین تغییرات انجام دهید تا نصاب و workflowهای مخزن قرارداد یکسان داشته باشند. ARM در این نسخه پشتیبانی نمی‌شود، چون pipeline فعلی ایمیج‌ها را روی runner استاندارد amd64 می‌سازد.

## ساخت و انتقال بسته

در ریشهٔ همین repository روی سیستم خودتان:

```console
python installation/build.py
```

دو فایل در `installation/dist/` تولید می‌شود: `mushroom-installer.tar.gz` و checksum آن با پسوند `.sha256`. هر دو را با روش امن به سرور منتقل کنید. آرشیو با فهرست مجاز صریح ساخته می‌شود؛ `.env`ها، سورس خصوصی برنامه‌ها، کلیدها و فایل‌های خروجی داخل آن نیستند. checksum را از همین کانال معتبر دریافت کنید.

روی سرور:

```bash
sha256sum --check mushroom-installer.tar.gz.sha256
tar -xzf mushroom-installer.tar.gz
cd mushroom-installer
sudo bash installation/install.sh
```

در Termius و سایر کلاینت‌های SSH از encoding برابر **UTF-8** استفاده کنید. نسخهٔ فعلی ورودی ناخوانا را
بدون نمایش مقدارش رد می‌کند و همان سؤال را دوباره می‌پرسد؛ رمزها نیز همین کنترل را دارند و بایت خراب
به کاراکتر جایگزین تبدیل نمی‌شود. مقدار را دوباره تایپ کنید. در صورت قطع ورودی، اتصال SSH را باز کرده
و نصب را دوباره اجرا کنید. خطاهای غیرمنتظره فقط نوع، شماره خط و در خطاهای سیستم شمارهٔ errno را گزارش
می‌کنند؛ برای عیب‌یابی همان کد را ارسال کنید، نه سکرت یا فایل تنظیمات کامل.

برای جایگزینی بستهٔ قدیمی روی سرور، دو فایل تازهٔ آرشیو/checksum را در `/root` بارگذاری کنید و اجرا کنید:

```bash
cd /root
sha256sum --check mushroom-installer.tar.gz.sha256 &&
tar -xzf mushroom-installer.tar.gz &&
bash /root/mushroom-installer/installation/install.sh
```

فایل‌های وضعیت و سکرت‌های موجود بیرون از پوشهٔ آرشیو هستند؛ برای رفع خطای ورودی آن‌ها را حذف نکنید.

پروفایل production یک staging مستقل هم آماده می‌کند. برای production از PostgreSQL خارجی نسخهٔ ۱۶ یا بالاتر با TLS استفاده می‌شود؛ ابزار دیتابیس production را روی VPS نصب نمی‌کند. برای dev/staging دیتابیس Docker اختصاصی ساخته می‌شود. زیرساخت‌ها و دسترسی‌های production جدا هستند؛ روی یک host، اعضای گروه Docker همچنان اختیار گستردهٔ همان host دارند. برای جداسازی امنیتی کامل، سرورهای مستقل انتخاب کنید.

## سؤال‌ها و خروجی‌ها

نصاب محیط، دامنه‌ها، IP عمومی IPv4، پورت SSH فعلی، مخزن خصوصی، نام کاربری GitHub تأییدکننده، ایمیل گواهی، حالت پیامک/پرداخت، بکاپ و نسخهٔ PostgreSQL را می‌پرسد. سپس برای هر محیط مشخصات کلینیک و مدیر اولیه را می‌گیرد. production علاوه بر این به URL مخفی PostgreSQL و مسیر سند رضایت تأییدشده نیاز دارد. رمز مدیر حداقل ۱۵ و حداکثر ۱۲۸ نویسه است و در اولین استقرار با سیاست واقعی برنامه کنترل می‌شود.

پیش‌فرض دامنه‌ها برای `example.com`:

| محیط | وب | اپ | داشبورد | API |
|---|---|---|---|---|
| production | example.com | app.example.com | dashboard.example.com | api.example.com |
| staging | staging.example.com | staging-app.example.com | staging-dashboard.example.com | staging-api.example.com |
| dev | dev.example.com | dev-app.example.com | dev-dashboard.example.com | dev-api.example.com |

همه قابل تغییر هستند. این نسخه مستقیماً با A record و IPv4 کار می‌کند: رکوردها باید DNS-only باشند و AAAA ناسازگار نداشته باشند. کنترل‌پنل DNS بیرون از سرور است؛ نصاب رکوردهای لازم را اعلام می‌کند، صحت آن‌ها را بررسی می‌کند و تا آماده‌شدنشان موفقیت اعلام نمی‌کند. بعد از تنظیم DNS دوباره همان فرمان نصب را اجرا کنید. Caddy صدور/تمدید گواهی و WebSocket را مدیریت می‌کند. برای CDN، DNS API، wildcard و DNS challenge پروفایل جدا لازم است.

پورت‌های برنامه و subnetهای Docker پیش از نصب بررسی می‌شوند؛ در نصب جدید در صورت تداخل، بلوک آزاد انتخاب و
در تنظیمات همان محیط ثبت می‌شود. سرویس یا شبکهٔ پروژهٔ دیگری متوقف یا حذف نمی‌شود.

نصاب سرویس‌های موجود روی ۸۰/۴۴۳ و Caddyfile سفارشی را بازنویسی نمی‌کند. اگر Caddy از قبل دارید، import اعلام‌شده را در فایل خود وارد کنید و سپس نصب را ادامه دهید. پورت SSH تغییر نمی‌کند؛ پیش از فعال‌شدن firewall، گوش‌دادن پورت انتخاب‌شده بررسی می‌شود و قانون همان پورت اضافه می‌شود. قوانین موجود firewall حذف نمی‌شوند. محدودیت شبکهٔ پنل VPS هم باید SSH و ۸۰/۴۴۳ را اجازه دهد.

ابزار و templateهای لازم در `/opt/mushroom-installer/` نصب می‌شوند و پس از نصب می‌توان از `sudo mushroom ...` استفاده کرد. وضعیت مراحل در `/etc/mushroom/installation.json` است. اجرای مجدد سکرت، رمز مدیر یا تنظیمات موجود را جایگزین نمی‌کند؛ فایل مفقود یا نامعتبر باید بررسی شود. برای تغییر تنظیمات runtime موجود، فایل عمومی همان محیط را اصلاح کنید و workflow مربوط را اجرا کنید؛ تغییر کلید رمزنگاری از مسیر rotation مستند انجام شود.

## فایل‌های هر محیط

```text
/home/mushroom-deploy/mushroom/dev/
/home/mushroom-deploy/mushroom/staging/
/home/mushroom-prod/mushroom/production/
  runtime.env                 تنظیمات عمومی
  network.yaml                شبکهٔ اختصاصی و gateway مشخص proxy
  secrets/                    سکرت‌های محیط
  bootstrap/first-run.json    فقط تا اولین ساخت موفق مدیر
  bootstrap/complete          نشانگر موفقیت bootstrap
  consent-policy.json         فقط production، سند تأییدشدهٔ مالک
  releases/                   نسخه‌های immutable؛ پس از CD
  state/                      نسخهٔ جاری/قبلی؛ پس از CD
```

سکرت‌ها با دسترسی 0600 ساخته می‌شوند. helper انتشار برای Distroless، فقط گروه runtime لازم را با 0640 مجاز می‌کند؛ مقادیر world-readable نمی‌شوند. رمز مدیر فقط به helper یک‌باره mount می‌شود، وارد runtime عادی API، GitHub یا log نمی‌شود و پس از ساخت موفق از سرور حذف می‌شود. bootstrap کلینیک/مدیر را transactionally ایجاد می‌کند؛ retry رمز را عوض نمی‌کند و وجود کاربر قبلی یا مدیر متفاوت را رد می‌کند. دادهٔ پزشکی/فروشگاهی یا رضایت‌نامهٔ ساختگی production seed نمی‌شود. دادهٔ نمونه فقط در dev باقی می‌ماند.

سند رضایت production باید دقیقاً قرارداد `apps/api/prisma/manage-consent-policy.mjs` را داشته باشد: `schemaVersion: 1`، `policyKey: MEDICAL_INTAKE_PROCESSING`، `versionNumber` مثبت، `locale: fa-IR`، عنوان و body تأییدشده، `contentHash` برابر SHA-256 بایت‌های UTF-8 خود body و `allowedEnvironments` شامل `production`. فایل rehearsal قابل استفادهٔ production نیست. این سند را مالک پیش از نصب آماده و جداگانه منتقل می‌کند؛ نصاب متن حقوقی تولید نمی‌کند. دیگر رضایت‌ها و تنظیمات محتوایی محصول همچنان از مسیرهای مدیریتی مربوط منتشر می‌شوند.

## اتصال دستی GitHub

بعد از آماده‌شدن DNS/TLS:

```bash
sudo mushroom doctor
sudo mushroom github
```

گزارش نام و محل مقدارها در `/etc/mushroom/github/GITHUB-SETUP.txt` است. **کلید خصوصی به‌صورت خودکار چاپ نمی‌شود.** آن را از فایل محافظت‌شدهٔ اعلام‌شده با کانال امن بردارید و فقط در GitHub Secret مربوط قرار دهید. کلید عمومی با محدودیت‌های SSH در حساب استقرار نصب شده است؛ کلید `known_hosts` مستقیماً از host key همان سرور تهیه می‌شود. fingerprint را هنگام تحویل با هویت سرور تطبیق دهید.

Repository Secrets برای dev/staging:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_KNOWN_HOSTS`

Repository Secrets مستقل production:

- `PRODUCTION_VPS_HOST`
- `PRODUCTION_VPS_USER`
- `PRODUCTION_VPS_SSH_PRIVATE_KEY`
- `PRODUCTION_VPS_KNOWN_HOSTS`

Repository Variables:

- `VPS_PORT` و `PRODUCTION_VPS_PORT`: پورت SSH.
- `VPS_DEV_CD_ENABLED`: فعال‌سازی dev.
- `VPS_CD_ENABLED`: فعال‌سازی staging.
- `PRODUCTION_CD_ENABLED`: فعال‌سازی production.
- `PRODUCTION_AUTO_DEPLOY`: پیش‌فرض `false`؛ با انتخاب صریح انتشار خودکار در نصب، `true` می‌شود.
- `RELEASE_APPROVER`: username GitHub مالک انتشار.
- `GHCR_ATTESTATIONS_ENABLED=false`: پیش‌فرض؛ فقط با پشتیبانی حساب فعال شود.

پرچم‌ها را بعد از موفقیت `doctor` فعال کنید. GitHub Actions برای checkout ریپوی خصوصی و pull ایمیج‌های خصوصی از `GITHUB_TOKEN` کوتاه‌عمر با permission لازم استفاده می‌کند؛ PAT دائمی روی VPS قرار نمی‌گیرد. packageهای GHCR خصوصی و قابل دسترسی از Actions همین repository باشند. مقدارهای برنامه مانند JWT، رمز دیتابیس و کلیدهای پیامک/پرداخت روی سرور باقی می‌مانند. دسترسی نوشتن به branch/workflow و مقدار `RELEASE_APPROVER` را فقط به افراد مجاز بدهید.

پس از ثبت مقادیر:

1. dev: در Actions، `Sync shared dev VPS` را روی branch `dev` اجرا کنید؛ pushهای بعدی همان branch sync می‌شوند.
2. staging: merge/push روی `main`، سپس CI موفق و `Release and stage`؛ چهار ایمیج ساخته و بررسی می‌شوند و manifest ثبت می‌شود.
3. production: در حالت پیش‌فرض، `Deploy production` را اجرا و `release_run_id` همان اجرای موفق staging را وارد کنید. فقط `RELEASE_APPROVER` می‌تواند دستی منتشر کند. در صورت انتخاب صریح حالت automatic و تنظیم متغیر مربوط، هر staging موفق روی main خودکار همان digestها را به production می‌فرستد؛ staging ناموفق یا خارج از مخزن/branch مجاز منتشر نمی‌شود.
4. پس از استقرار: `sudo mushroom verify` سلامت بیرونی HTTPS را بررسی می‌کند. آزمون واقعی ورود، providerها و پذیرش محصول همچنان جداست.

ثبت Secret به‌تنهایی workflow را اجرا نمی‌کند. انتشار production به‌صورت پیش‌فرض تأیید دستی دارد و حالت خودکار باید هنگام نصب و در GitHub صریحاً فعال شود. rollback از workflow `Production rollback` برای production و `Application rollback` برای rehearsal انجام می‌شود؛ فقط برنامه به ایمیج قبلی برمی‌گردد و دیتابیس reset نمی‌شود. در این توپولوژی تک‌میزبان، zero-downtime تضمین نشده است.

زنجیرهٔ خودکار `CI → Release and stage → Deploy production` از رویداد رسمی
[`workflow_run`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
استفاده می‌کند؛ فایل workflow باید در branch پیش‌فرض وجود داشته باشد.

بعد از تست دسترسی Actions، کپی خصوصی تحویل را از مسیر اعلام‌شده حذف کنید؛ فایل `.pub` را نگه دارید. نصب مجدد کلید عمومی موجود را حفظ می‌کند و کلید تازه‌ای برای آن حساب نمی‌سازد. تعویض عمدی کلید SSH/رمزنگاری باید با مسیر rotation و به‌روزرسانی هماهنگ GitHub انجام شود.

## مدیریت و بکاپ

```bash
sudo mushroom status --environment dev
sudo mushroom logs --environment production
sudo mushroom restart --environment production
sudo mushroom configure --environment dev
sudo mushroom backup --environment production
sudo mushroom restore --environment production --archive /var/backups/mushroom/production/BACKUP.dump.age --target-url-file /root/restore-test-url
```

فرمان `configure` اتصال SSH، دامنه‌ها و حالت‌های runtime را تعاملی تنظیم می‌کند؛ برای اصلاح فقط اطلاعات اتصال،
آن را بدون `--environment` اجرا کنید. تنظیمات دامنه پیش از ذخیره با DNS بررسی می‌شود. در dev، تنظیم R2 و دریافت
مخفی کلیدهای آن هم در همین فرمان است. پس از تغییر runtime، workflow همان محیط را اجرا کنید تا کانتینرها تنظیم تازه را بگیرند.

در صورت انتخاب بکاپ، timer روزانهٔ systemd به وقت UTC نصب می‌شود. خروجی `pg_dump` مستقیم با age رمز می‌شود؛ dump بدون رمز روی دیسک ذخیره نمی‌شود. فایل‌ها در `/var/backups/mushroom/<environment>/` و کلید خصوصی age در `/etc/mushroom/backup-keys/` هستند. **نسخهٔ خارج سرور از آرشیو و نسخهٔ جدا از کلید لازم است.** این بکاپ منطقی جایگزین WAL/PITR، سیاست RPO/RTO یا پذیرش قابلیت provider نیست. مدت نگهداری محلی هنگام نصب دریافت می‌شود (پیش‌فرض ۱۴ روز)؛ فقط پس از بکاپ موفق، آرشیوهای قدیمی با نام تولیدشدهٔ خود ابزار پاک می‌شوند. انتقال خارج سرور و پایش فضا همچنان باید مطابق سیاست عملیاتی انجام شود.

restore فقط دیتابیس از قبل ساخته‌شده، خالی و مجزایی را می‌پذیرد که نامش به `_restore_test` ختم شود؛ مقصد اصلی و دیتابیس دارای جدول رد می‌شوند. URL مقصد داخل فایل 0600 قرار می‌گیرد؛ روی خط فرمان وارد نمی‌شود. برای production نسخهٔ client بکاپ باید با major واقعی PostgreSQL هماهنگ باشد. URLهای دارای CA خصوصی/گزینه‌های اتصال اضافی به تنظیم اختصاصی provider نیاز دارند؛ failure موفق گزارش نمی‌شود. نتیجهٔ timer و نشانگر `last-success` باید پایش شوند؛ ارسال هشدار بیرونی به اتصال سرویس هشدار نیاز دارد.

SMS و سداد به‌صورت پیش‌فرض disabled هستند. انتخاب live فقط کنترل runtime را آماده می‌کند؛ credentialهای provider و enable/default از تنظیمات امن Dashboard انجام می‌شوند. پذیرندگی سداد، ثبت callback، IP خروجی ثابت و تراکنش پذیرش خودکار جعل نمی‌شوند. تصاویر R2 در production مطابق policy فعلی برنامه غیرفعال می‌مانند.

## بررسی تنظیمات پروژه و تست نصاب

```console
python -B installation/manager.py audit-env --current
python -B -m unittest discover -s installation -p "test_*.py" -v
```

Audit فقط نام کلیدهای غایب/نامعتبر را گزارش می‌کند و فایل‌های واقعی `.env` را تغییر نمی‌دهد. نصاب به `.env`های لپ‌تاپ وابسته نیست. تطبیق با schema واقعی API و Composeها در تست کنترل می‌شود. اجرای آزمایشی روی VPS خالی، دو انتشار متوالی، بازیابی بکاپ و پذیرش providerها پیش از دادهٔ واقعی الزامی است؛ تست‌های fixture معادل پذیرش سرور واقعی نیستند.
