# Phase 08 — Chat & Online Consultation

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `C`
- پیش‌نیاز: `Phase 04 DONE` و `Phase 06 DONE`
- blocker خارجی: انتخاب provider ویدئو در صورت نیاز
- خروجی اصلی: پیام پایدار، realtime delivery و اتصال به نوبت آنلاین

## مدل‌های داده

- `Conversation`
- `ConversationParticipant`
- `Message`
- `MessageAttachment`
- `MessageReceipt`

## Taskها

- [ ] `F08-T01` — تعیین conversation policy، retention و participant rules
- [ ] `F08-T02` — migration conversation/message/receipt
- [ ] `F08-T03` — REST conversation list و cursor-paginated history
- [ ] `F08-T04` — create message با `clientMessageId` و deduplication
- [ ] `F08-T05` — WebSocket gateway و authentication
- [ ] `F08-T06` — authorization در سطح conversation
- [ ] `F08-T07` — delivery/read receipt
- [ ] `F08-T08` — attachment با Object Storage pipeline
- [ ] `F08-T09` — Redis adapter برای چند instance یا ثبت trigger اجرای آن
- [ ] `F08-T10` — اتصال conversation به appointment/encounter آنلاین
- [ ] `F08-T11` — waiting-room presence/status
- [ ] `F08-T12` — video provider adapter در صورت requirement
- [ ] `F08-T13` — API/socket client و اتصال chat در app
- [ ] `F08-T14` — اتصال messages در dashboard
- [ ] `F08-T15` — حذف mock chat
- [ ] `F08-T16` — ordering، reconnect، authorization و load tests
- [ ] `F08-T17` — evidence و review Milestone C

## معماری تحویل پیام

```text
Client message
  → validate/authenticate
  → persist in PostgreSQL
  → commit
  → publish delivery event
  → deliver via WebSocket
```

PostgreSQL منبع history است؛ Redis یا broker جایگزین persistence پیام نیست.

## قواعد

- `clientMessageId` در scope فرستنده unique است.
- ارسال مجدد بعد reconnect پیام دوم ایجاد نمی‌کند.
- history فقط با cursor pagination برگردانده می‌شود.
- user خارج conversation هیچ metadata یا message دریافت نمی‌کند.
- attachment private و audit شده است.
- typing indicator persist نمی‌شود.
- read receipt از message جدا است.
- AI conversation با doctor/patient chat اشتباه گرفته نمی‌شود.

## تست‌های اجباری

- duplicate message
- ordering per conversation
- reconnect و missed message sync
- unauthorized socket subscription
- participant removal/revocation
- attachment permission
- چند instance در صورت فعال‌بودن Redis adapter

## معیار خروج

- پیام قبل از delivery persist می‌شود.
- reconnect باعث گم‌شدن یا duplicate message نمی‌شود.
- app و dashboard یک conversation واقعی را می‌بینند.
- waiting room به appointment معتبر متصل است.
