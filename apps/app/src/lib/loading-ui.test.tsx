import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLoading, HeartbeatLoader } from "../components/shared/heartbeat-loader";
import { LoadingState, type SkeletonVariant } from "../components/shared/skeletons";
import { PatientResourceState } from "../components/shared/patient-resource-state";
import { Button } from "../components/ui/button";
import { ProductImage } from "../components/store/product-image";
import { AsyncButton } from "../components/shared/async-button";

describe("Patient loading feedback", () => {
  it("reserves content in the first server render instead of a timer-only blank", () => {
    for (const variant of ["list", "grid", "card", "detail", "product", "form", "settings", "payment", "chat", "profile", "rows"] satisfies SkeletonVariant[]) {
      const html = renderToStaticMarkup(<LoadingState variant={variant} />);
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('class="skeleton ');
      expect(html).toContain('class="sr-only"');
      expect(html).not.toContain("style=\"opacity:0");
    }
  });

  it("uses an ECG for bootstrap with no visible preparation text", () => {
    const html = renderToStaticMarkup(<AppLoading />);
    expect(html).toContain('data-heartbeat="screen"');
    expect(html).not.toContain("dots");
    expect(html).not.toContain("آماده‌سازی");
    expect(renderToStaticMarkup(<HeartbeatLoader />)).toContain('aria-hidden="true"');
  });

  it("keeps actionable errors separate from skeletons and refresh feedback", () => {
    const html = renderToStaticMarkup(<PatientResourceState loading refreshing error="خطای آزمایشی" retry={() => {}} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("دریافت دوباره");
    expect(html).not.toContain("data-loading-skeleton");
    expect(html).not.toContain("data-heartbeat");
  });

  it("accepts a shaped skeleton and renders a local ECG only while refreshing", () => {
    expect(renderToStaticMarkup(<PatientResourceState loading error={null} retry={() => {}} skeleton={<div data-custom-skeleton />} />)).toContain("data-custom-skeleton");
    const html = renderToStaticMarkup(<PatientResourceState loading={false} refreshing error={null} retry={() => {}} />);
    expect(html).toContain('data-heartbeat="inline"');
    expect(html).not.toContain("data-loading-skeleton");
  });

  it("disables pending buttons and does not cram two icons into icon-only controls", () => {
    const text = renderToStaticMarkup(<Button busy>در حال ثبت…</Button>);
    expect(text).toContain('disabled=""'); expect(text).toContain('aria-busy="true"');
    expect(text.match(/data-heartbeat=/g)).toHaveLength(1);
    const icon = renderToStaticMarkup(<Button busy aria-label="ذخیره"><svg data-original-icon /></Button>);
    expect(icon).not.toContain("data-original-icon");
    expect(icon).toContain('aria-label="ذخیره"');
  });

  it("keeps image space while loading and ends immediately at a missing-image fallback", () => {
    expect(renderToStaticMarkup(<ProductImage src="https://image.test/a.webp" alt="محصول" />)).toContain('data-pending="true"');
    const fallback = renderToStaticMarkup(<ProductImage src={null} alt="محصول" />);
    expect(fallback).toContain('data-pending="false"');
    expect(fallback).not.toContain("product-image-placeholder");
  });

  it("preserves native action-button semantics and the original label", () => {
    const html = renderToStaticMarkup(<AsyncButton type="button" disabled className="original" onClick={async () => {}}>ثبت رضایت</AsyncButton>);
    expect(html).toContain('type="button"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('class="original"');
    expect(html).toContain('ثبت رضایت');
    expect(html).not.toContain('data-heartbeat');
  });
});
