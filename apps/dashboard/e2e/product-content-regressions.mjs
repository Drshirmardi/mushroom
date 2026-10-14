import { expect } from "@playwright/test";

// Every API request is intercepted; these tests never mutate local development data.
async function fixture(page) {
  const origin = "http://localhost:3002";
  const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
  const category = { id: "00000000-0000-4000-8000-000000000009", name: "دسته آزمون", slug: "test", isActive: true, productCount: 2 };
  const contents = ids.map((_, i) => ({
    brand: `برند ${i + 1}`, manufacturer: null, shortDescription: null,
    description: `توضیح ${i + 1}`, ingredients: null, usageInstructions: null,
    warnings: null, contraindications: null, contentRevision: 2,
    status: "PENDING_APPROVAL", provenance: { sourceKind: "PACKAGING", sourceReference: "منبع آزمون" },
    approvedContentRevision: null, contentApprovedAt: null, contentApprovedByUserId: null,
  }));
  const control = { conflict: false, failPatch: false, failLoad: false, userId: "admin-a", roles: ["ADMIN"], loads: 0, refreshes: 0, patches: [], approvals: [], contents };
  await page.context().route((url) => url.pathname.startsWith("/v1/"), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "content-type": "application/json" };
    const json = (body, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...headers, "access-control-allow-methods": "GET,PATCH,POST,OPTIONS", "access-control-allow-headers": "authorization,content-type" } });
    if (path === "/v1/auth/refresh") {
      control.refreshes++;
      return json({ accessToken: `mock-token-${control.refreshes}`, tokenType: "Bearer", expiresIn: 600, user: { id: control.userId, phone: "+989100000000", roles: control.roles } });
    }
    if (path.endsWith("/commerce/categories")) return json([]);
    if (path.endsWith("/shipping-rates/courier")) return json({ amountToman: "0", isActive: false });
    if (path.endsWith("/commerce/products")) return json({ items: ids.map((id, i) => ({ id, title: `محصول ${i + 1}`, slug: `product-${i + 1}`, status: "ACTIVE", description: contents[i].description, content: contents[i], category, image: null, skus: [] })), page: 1, pageSize: 100, total: 2 });
    const match = path.match(/^\/v1\/admin\/commerce\/products\/([^/]+)\/content(\/approve)?$/);
    if (!match || !ids.includes(match[1])) return json({ code: "UNCONFIGURED_MOCK" }, 501);
    const current = contents[ids.indexOf(match[1])];
    if (request.method() === "GET") {
      control.loads++;
      if (control.failLoad) return json({ code: "UNAVAILABLE" }, 503);
      return json(current);
    }
    const body = request.postDataJSON();
    const approve = Boolean(match[2]);
    (approve ? control.approvals : control.patches).push({ id: match[1], body, token: request.headers().authorization });
    if (control.failPatch && !approve) {
      control.failPatch = false;
      // Let the refreshed session render before the save failure settles.
      await new Promise((resolve) => setTimeout(resolve, 250));
      return json({ code: "UNAVAILABLE" }, 503);
    }
    if (control.conflict) {
      control.conflict = false;
      current.manufacturer = "ویرایش مدیر دیگر";
      current.contentRevision++;
    }
    if (body.expectedContentRevision !== current.contentRevision) return json({ code: "COMMERCE_CONTENT_REVISION_CONFLICT" }, 409);
    if (approve) {
      current.status = "APPROVED";
      current.approvedContentRevision = current.contentRevision;
      current.contentApprovedAt = "2026-10-14T00:00:00.000Z";
      current.contentApprovedByUserId = control.userId;
    } else {
      const changed = Object.entries(body.fields).some(([key, value]) => current[key] !== value) || JSON.stringify(body.provenance) !== JSON.stringify(current.provenance);
      Object.assign(current, body.fields, { provenance: body.provenance });
      if (changed) Object.assign(current, { contentRevision: current.contentRevision + 1, status: "PENDING_APPROVAL", approvedContentRevision: null, contentApprovedAt: null, contentApprovedByUserId: null });
    }
    return json(current);
  });
  await page.goto(`${origin}/store`, { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog");
  const open = async (i) => {
    await page.getByRole("button", { name: `ویرایش محتوای محصول ${i}` }).click();
    await expect(dialog.getByLabel("برند")).toHaveValue(contents[i - 1].brand);
  };
  await open(1);
  return { control, dialog, open, ids };
}

export async function verifyConflictRegression(page) {
  const { control, dialog } = await fixture(page);
  const save = dialog.getByRole("button", { name: "ذخیره محتوا", exact: true });
  const approve = dialog.getByRole("button", { name: "تأیید نگارش ذخیره‌شده", exact: true });
  await dialog.getByLabel("برند").fill("پیش‌نویس من");
  control.conflict = true;
  await save.click();
  await expect(dialog.getByText("نسخهٔ محتوا روی سرور تغییر کرده", { exact: false })).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(approve).toBeDisabled();
  await expect(dialog.getByLabel("برند")).toHaveValue("پیش‌نویس من");
  expect(control.loads).toBe(1);
  expect(control.patches).toHaveLength(1);
  expect(control.patches[0].body.expectedContentRevision).toBe(2);
  // Merely opening/cancelling conflict resolution must not lose the draft.
  await dialog.getByRole("button", { name: "دریافت نسخهٔ تازه", exact: true }).click();
  await dialog.getByRole("button", { name: "حفظ پیش‌نویس", exact: true }).click();
  await expect(dialog.getByLabel("برند")).toHaveValue("پیش‌نویس من");
  await expect(save).toBeDisabled();
  // A failed deliberate reload also preserves the draft and conflict gate.
  control.failLoad = true;
  await dialog.getByRole("button", { name: "دریافت نسخهٔ تازه", exact: true }).click();
  await dialog.getByRole("button", { name: "جایگزینی پیش‌نویس با نسخهٔ سرور", exact: true }).click();
  await expect(dialog.getByLabel("برند")).toBeEnabled();
  await expect(dialog.getByLabel("برند")).toHaveValue("پیش‌نویس من");
  await expect(save).toBeDisabled();
  control.failLoad = false;
  await dialog.getByRole("button", { name: "جایگزینی پیش‌نویس با نسخهٔ سرور", exact: true }).click();
  await expect(dialog.getByLabel("تولیدکننده")).toHaveValue("ویرایش مدیر دیگر");
  await expect(dialog.getByLabel("برند")).toHaveValue("برند 1");
  await expect(save).toBeDisabled();
  await dialog.getByLabel("برند").fill("پیش‌نویس من");
  await save.click();
  await expect(approve).toBeEnabled();
  expect(control.patches[1].body.expectedContentRevision).toBe(3);
  expect(control.patches[1].body.fields.manufacturer).toBe("ویرایش مدیر دیگر");
  expect(control.contents[0].contentRevision).toBe(4);
  // Approval conflicts obey the same explicit-review gate.
  control.conflict = true;
  await approve.click();
  await expect(dialog.getByText("تأیید انجام نشد", { exact: false })).toBeVisible();
  await expect(approve).toBeDisabled();
  await dialog.getByRole("button", { name: "دریافت نسخهٔ تازه", exact: true }).click();
  await dialog.getByRole("button", { name: "جایگزینی پیش‌نویس با نسخهٔ سرور", exact: true }).click();
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(dialog.getByText("نگارش جاری تأیید شده است", { exact: true })).toBeVisible();
  expect(control.approvals.map((request) => request.body.expectedContentRevision)).toEqual([4, 5]);
  // A whitespace-only draft change is a no-op and does not invalidate approval.
  await dialog.getByLabel("برند").fill("پیش‌نویس من ");
  await expect(save).toBeDisabled();
  expect(control.contents[0].approvedContentRevision).toBe(5);
}

export async function verifySessionRegression(page) {
  const now = new Date("2026-10-14T10:00:00Z");
  await page.clock.install({ time: now });
  const { control, dialog, open, ids } = await fixture(page);
  const save = dialog.getByRole("button", { name: "ذخیره محتوا", exact: true });
  await dialog.getByLabel("برند").fill("پیش‌نویس نشست");
  control.failPatch = true;
  await page.clock.setFixedTime(new Date(now.getTime() + 610_000));
  await save.click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("برند")).toHaveValue("پیش‌نویس نشست");
  expect(control.refreshes).toBe(2);
  expect(control.loads).toBe(1);
  expect(control.patches[0].token).toBe("Bearer mock-token-2");
  await save.click();
  const approve = dialog.getByRole("button", { name: "تأیید نگارش ذخیره‌شده", exact: true });
  await expect(save).toBeDisabled();
  await expect(approve).toBeEnabled();
  expect(control.patches[1].body.expectedContentRevision).toBe(2);
  await approve.click();
  await expect(dialog.getByText("نگارش جاری تأیید شده است", { exact: true })).toBeVisible();
  expect(control.approvals[0].token).toBe("Bearer mock-token-2");
  await page.keyboard.press("Escape");
  await open(2);
  await dialog.getByLabel("برند").fill("پیش‌نویس محصول دوم");
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "ادامه ویرایش", exact: true }).click();
  await expect(dialog.getByLabel("برند")).toHaveValue("پیش‌نویس محصول دوم");
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "بستن بدون ذخیره", exact: true }).click();
  await open(1);
  expect(control.patches.every((request) => request.id === ids[0])).toBe(true);
  await expect(dialog.getByLabel("برند")).toHaveValue("پیش‌نویس نشست");
  // A different authenticated account must not inherit the previous draft.
  await dialog.getByLabel("برند").fill("خصوصی مدیر اول");
  control.userId = "admin-b";
  await page.clock.setFixedTime(new Date(now.getTime() + 1_220_000));
  await save.click();
  await expect(dialog).toBeHidden();
  await open(1);
  // Authorization loss remains controlled by the existing session gate.
  control.roles = ["PATIENT"];
  await dialog.getByLabel("برند").fill("تغییر مجوز");
  await page.clock.setFixedTime(new Date(now.getTime() + 1_830_000));
  await save.click();
  await expect(dialog).toBeHidden();
}
