// Local UI regression with synthetic directory data and no real payment.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.PATIENT_APP_TEST_URL || "http://localhost:3001";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local app required");
const browser = await chromium.launch();
const user = "40110000-0000-4000-8000-000000000001";
const doctorId = "40110000-0000-4000-8000-000000000002";
const extraId = "40110000-0000-4000-8000-000000000003";
const portrait = await readFile(new URL("../public/avatars/avatar-female.png", import.meta.url));
const offerings = [0, 650000].map((priceAmount, i) => ({
  id: `offering-${i}`, service: { id: `service-${i}`, name: i ? "مشاورهٔ آنلاین تغذیه" : "ارزیابی حضوری" },
  visitMode: i ? "ONLINE" : "IN_PERSON", durationMinutes: 45, bufferMinutes: 0, priceAmount, currency: "IRR",
}));
const doctor = {
  id: doctorId, displayName: "دکتر نازنین بهرامی", profileImageUrl: `/v1/directory/doctors/${doctorId}/image`,
  specialties: [{ id: "nutrition", name: "تغذیه" }], yearsExperience: 8,
  biography: "مشاور تغذیه با رویکرد آموزش عادت‌های غذایی روزمره. ".repeat(5),
  clinic: { id: "clinic", name: "کلینیک", timeZone: "Asia/Tehran" }, education: ["دکترای تغذیه"],
  certifications: [], languages: ["فارسی"], offerings,
};

try {
  for (const width of [320, 390, 720]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } });
    let rejectSlot = true;
    let writes = 0;
    let emptyNextWeek = false;
    let paymentStatus = "PENDING";
    const intent = () => ({
      id: "intent-fixture", purpose: "APPOINTMENT", doctorId, status: paymentStatus, amountRial: "650000",
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 600000).toISOString(),
      appointmentId: paymentStatus === "PAID" ? extraId : null,
      methods: [{ code: "WALLET", available: true, balanceRial: "1000000" }, { code: "GATEWAY", available: true }],
    });
    await page.route("**/v1/**", route => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const headers = { "access-control-allow-origin": request.headers().origin || "*", "access-control-allow-credentials": "true", "access-control-allow-headers": "authorization,content-type,idempotency-key", "access-control-allow-methods": "GET,POST,OPTIONS" };
      const send = (json, status = 200) => route.fulfill({ status, headers, json });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (path === "/v1/auth/refresh") return send({ accessToken: "synthetic", expiresIn: 600, user: { id: user, roles: ["PATIENT"] } });
      if (path.endsWith("/entry")) return send({ required: false });
      if (path.endsWith("/booking-eligibility")) return send({ eligible: true, reason: "ELIGIBLE" });
      if (path === "/v1/directory/doctors") {
        if (url.searchParams.get("query") === "نام ناموجود") {
          return send({ items: [], page: 1, pageSize: 1, total: 0 });
        }
        const pageNumber = Number(url.searchParams.get("page") || 1);
        return send({ items: pageNumber === 1 ? [doctor] : [{ ...doctor, id: extraId, displayName: "دکتر مهران فرهمند", profileImageUrl: `/v1/directory/doctors/${extraId}/image` }], page: pageNumber, pageSize: 1, total: 2 });
      }
      if (path.endsWith("/image")) return path.includes(extraId) ? send({}, 404) : route.fulfill({ status: 200, headers, contentType: "image/png", body: portrait });
      if (path.endsWith(doctorId)) return send(doctor);
      if (path.endsWith("/availability")) {
        if (emptyNextWeek) return send({ items: [], total: 0, page: 1, pageSize: 100, timeZone: "Asia/Tehran" });
        const date = url.searchParams.get("fromDate");
        const time = path.includes("offering-1") ? "11:30" : "10:00";
        const item = { localDate: date, localStartTime: time, startsAt: `${date}T${time}:00+03:30` };
        return send({ items: [item], total: 1, page: 1, pageSize: 100, timeZone: "Asia/Tehran" });
      }
      if (path.endsWith("/appointment-intents")) {
        writes++;
        if (rejectSlot) { rejectSlot = false; return send({ code: "APPOINTMENT_SLOT_CONFLICT" }, 409); }
        return send(request.postDataJSON()?.doctorServiceId === "offering-0" ? { status: "PAID", appointmentId: extraId } : intent());
      }
      if (path.endsWith("/billing/intents/intent-fixture")) return send(intent());
      if (path.endsWith("/billing/intents/intent-fixture/cancel")) { paymentStatus = "CANCELLED"; return send(intent()); }
      return send({ items: [] });
    });
    await page.goto(base + "/appointments/book");
    const search = page.getByRole("searchbox", { name: "جست‌وجوی نام پزشک" });
    await search.fill("نام ناموجود");
    await page.getByRole("heading", { name: "پزشکی پیدا نشد" }).waitFor();
    await search.fill("نازنین");
    await page.getByRole("link", { name: /دکتر نازنین بهرامی/ }).waitFor();
    await page.getByRole("button", { name: "آنلاین", exact: true }).click();
    await page.waitForURL("**/*mode=ONLINE");
    await page.getByRole("button", { name: "نمایش پزشکان بیشتر" }).click();
    await page.getByRole("link", { name: /دکتر مهران فرهمند/ }).waitFor();
    await page.getByRole("link", { name: /دکتر نازنین بهرامی/ }).click();
    await page.getByRole("heading", { name: "پروفایل پزشک" }).waitFor();
    await page.locator("main img").evaluate(image => image.decode());
    assert.equal(await page.getByRole("link", { name: "بازگشت به فهرست پزشکان" }).getAttribute("href"), "/appointments/book?q=" + encodeURIComponent("نازنین") + "&mode=ONLINE");
    await page.getByRole("radio", { name: /مشاورهٔ آنلاین تغذیه/ }).check();
    if (width === 320) {
      emptyNextWeek = true;
      await page.getByRole("button", { name: "هفتهٔ بعد", exact: true }).click();
      await page.getByRole("status").getByText("این هفته زمان آزادی نیست.").waitFor();
      emptyNextWeek = false;
      await page.getByRole("button", { name: "هفتهٔ قبل" }).click();
    }
    await page.getByRole("button", { name: /^تقویم شمسی،/ }).click();
    await page.getByRole("group", { name: "تقویم شمسی", exact: true }).getByRole("button", { name: "ماه بعد" }).click();
    const calendar = page.getByRole("group", { name: "تقویم شمسی", exact: true });
    assert.ok(await calendar.isVisible());
    await calendar.getByRole("button", { name: "ماه قبل" }).click();
    await calendar.locator("button[aria-pressed=true]").click();
    await page.getByRole("button", { name: "۱۱:۳۰" }).click();
    await page.getByRole("radio", { name: /ارزیابی حضوری/ }).check();
    assert.equal(await page.getByRole("button", { name: "بررسی نوبت" }).isEnabled(), false);
    await page.getByRole("button", { name: "۱۰:۰۰" }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const review = page.getByRole("button", { name: "بررسی نوبت" });
    await review.focus();
    await review.press("Enter");
    await page.getByRole("dialog").getByText("رایگان", { exact: true }).waitFor();
    await page.getByRole("button", { name: "تأیید و ثبت نوبت" }).click();
    await page.getByRole("alert").getByText(/این ساعت دیگر آزاد نیست/).waitFor();
    await page.getByRole("button", { name: "۱۰:۰۰" }).click();
    await review.click();
    await page.getByRole("button", { name: "تأیید و ثبت نوبت" }).click();
    await page.getByRole("link", { name: "مشاهدهٔ جزئیات نوبت" }).waitFor();
    assert.equal(writes, 2);
    if (width === 390) {
      await page.goto(base + "/doctors/" + doctorId);
      await page.getByRole("radio", { name: /مشاورهٔ آنلاین تغذیه/ }).check();
      await page.getByRole("button", { name: "۱۱:۳۰" }).click();
      await page.getByRole("button", { name: "بررسی نوبت" }).click();
      await page.getByRole("button", { name: "تأیید و ادامه به پرداخت" }).click();
      await page.getByText("مبلغ قابل پرداخت", { exact: true }).waitFor();
      await page.getByRole("button", { name: "لغو این پرداخت" }).click();
      await page.waitForURL("**/doctors/" + doctorId);
      paymentStatus = "EXPIRED";
      await page.goto(base + "/appointments/book/pay?intentId=intent-fixture");
      await page.getByRole("button", { name: "انتخاب زمان جدید" }).click();
      await page.waitForURL("**/doctors/" + doctorId);
      paymentStatus = "PAID";
      await page.goto(base + "/profile/wallet/payment-result?intentId=intent-fixture");
      await page.getByRole("link", { name: "مشاهدهٔ جزئیات نوبت" }).waitFor();
    }
    console.log(`Booking UI passed at ${width}px`);
    await page.close();
  }
} finally {
  await browser.close();
}
