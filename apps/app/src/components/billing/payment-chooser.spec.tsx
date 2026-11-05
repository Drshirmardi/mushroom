import { createElement, type ButtonHTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PaymentChooser } from "./payment-chooser";
import type { BillingIntent } from "@/lib/wallet-billing-api";

vi.mock("@/components/ui/button", () => ({ Button: ({ variant: _variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => createElement("button", props) }));
vi.mock("@/lib/wallet-billing-api", () => ({ cancelBillingIntent: vi.fn(), createGatewayAttempt: vi.fn(), payWithWallet: vi.fn(), walletErrorMessage: vi.fn() }));
vi.mock("@/lib/wallet-money", async () => import("../../lib/wallet-money"));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock("@/components/billing/topup-sheet", () => ({ TopupSheet: () => null }));

const intent = (purpose: string, methods: BillingIntent["methods"]): BillingIntent => ({
  id: "fixture", purpose, status: "PENDING", method: null, amountRial: "2500000", currency: "IRR", orderId: null, appointmentId: null, expiresAt: null, paidAt: null, createdAt: "2026-10-19T12:00:00Z", methods,
});
const render = (value: BillingIntent) => renderToStaticMarkup(createElement(PaymentChooser, { accessToken: "synthetic", intent: value, onPaid: vi.fn() }));

describe("payment method context", () => {
  it("explains a top-up independently of the user's existing balance and shows the disabled bank method", () => {
    const html = render(intent("TOPUP", [{ code: "GATEWAY", available: false, balanceRial: null }]));
    expect(html).toContain("پرداخت هزینهٔ خرید یا خدمت نیست");
    expect(html).toContain("افزایش موجودی فقط از درگاه بانکی انجام می‌شود.");
    expect(html).toContain('href="/profile/wallet"');
    expect(html).toContain("مبلغ افزایش موجودی");
    expect(html).toContain("افزایش موجودی فعلاً ممکن نیست");
    expect(html).not.toContain('wallet-method__title">پرداخت از کیف پول');
    expect(html).toContain("لغو درخواست شارژ");
  });

  it("retains the enabled wallet method for a purchase funded by the existing balance", () => {
    const html = render(intent("ORDER", [{ code: "WALLET", available: true, balanceRial: "19000000" }, { code: "GATEWAY", available: false, balanceRial: null }]));
    expect(html).toContain('wallet-method__title">پرداخت از کیف پول');
    expect(html).toContain("۱٬۹۰۰٬۰۰۰");
    expect(html).not.toContain("دربارهٔ افزایش موجودی");
    expect(html).toContain("مبلغ قابل پرداخت");
    const walletButton = html.match(/<button[^>]*class="wallet-method(?: [^"\n]*)?"[^>]*>/)?.[0];
    expect(walletButton).toBeDefined();
    expect(walletButton).not.toContain("disabled");
  });

  it("keeps wallet payment disabled for insufficient funds and offers a separate top-up", () => {
    const html = render(intent("ASSESSMENT", [{ code: "WALLET", available: false, balanceRial: "1000000" }]));
    expect(html).toContain("کسری موجودی");
    expect(html).toContain("افزایش موجودی کیف پول");
    expect(html.match(/<button[^>]*class="wallet-method(?: [^"\n]*)?"[^>]*>/)?.[0]).toContain("disabled");
    expect(html).not.toContain("پرداخت هزینهٔ خرید یا خدمت نیست");
  });
});
