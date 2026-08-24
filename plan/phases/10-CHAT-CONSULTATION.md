# Phase 10 — Chat & Online Consultation

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `D — تجارت و ارتباط`
- پیش‌نیاز: `Phase 05 DONE`، `Phase 06 DONE` و job infrastructure
- blocker: policy retention/abuse و provider ویدئو در صورت نیاز
- خروجی اصلی: پیام پایدار و waiting room متصل به appointment واقعی است.

## محدوده UI

- app: `/chat` و `/appointments/waiting-room`
- dashboard: `/messages` و conversation در patient workspace

## Taskها

- [ ] `F10-T01` — retention، participant، edit/delete، report/block و attachment policy
- [ ] `F10-T02` — migration conversation/message/receipt
- [ ] `F10-T03` — REST list/history و create message deduplicated
- [ ] `F10-T04` — WebSocket authentication/authorization و reconnect sync
- [ ] `F10-T05` — delivery/read receipt و notification
- [ ] `F10-T06` — private attachment و malware/validation pipeline در صورت نیاز
- [ ] `F10-T07` — appointment waiting room و presence
- [ ] `F10-T08` — app/dashboard integration و حذف mock
- [ ] `F10-T09` — ordering، reconnect، abuse، authorization و load tests
- [ ] `F10-T10` — video adapter فقط با requirement تأییدشده
- [ ] `F10-T11` — evidence Milestone D

## معیار خروج

- پیام قبل از delivery persist می‌شود.
- reconnect پیام را گم یا duplicate نمی‌کند.
- participant خارج conversation metadata دریافت نمی‌کند.
- waiting room فقط برای appointment آنلاین معتبر فعال است.
