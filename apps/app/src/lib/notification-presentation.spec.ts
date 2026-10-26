import { describe, expect, it } from "vitest";
import { Bell, Wallet } from "lucide-react";
import { notificationPresentation } from "./notification-presentation";
import type { NotificationCategory } from "./follow-up-api";

describe("notification presentation", () => {
  it("supports financial notifications and their preference label", () => {
    const category: NotificationCategory = "FINANCIAL";
    expect(notificationPresentation(category)).toMatchObject({ icon: Wallet, label: "مالی و کیف پول" });
  });
  it.each(["REMINDER", "TREATMENT", "CONTENT", "SYSTEM"])("retains %s presentation", category => {
    expect(notificationPresentation(category).icon).toBeDefined();
    expect(notificationPresentation(category).label).toBeTruthy();
    expect(notificationPresentation(category).description).toBeTruthy();
  });
  it.each(["FUTURE_CATEGORY", "", null, undefined, "__proto__", "constructor", "toString"])("safely displays an unexpected category %s", category => {
    expect(notificationPresentation(category)).toEqual(notificationPresentation("SYSTEM"));
    expect(notificationPresentation(category).icon).toBe(Bell);
  });
});
