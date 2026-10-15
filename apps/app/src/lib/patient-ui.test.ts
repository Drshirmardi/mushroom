import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Children, createElement, isValidElement, type ReactNode } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

describe("Patient primitives", () => {
  it("defaults to a non-submitting button", () => {
    expect(renderToStaticMarkup(createElement(Button, {}, "افزودن"))).toContain('type="button"');
  });
  it("busy disables repeated activation and announces pending state", () => {
    const html = renderToStaticMarkup(createElement(Button, { busy: true }, "در حال انجام…"));
    expect(html).toContain('disabled=""'); expect(html).toContain('aria-busy="true"');
  });
  it("preserves input identity, direction and label association", () => {
    const html = renderToStaticMarkup(createElement(Input, { id: "search", name: "product-search", dir: "auto", disabled: true }));
    expect(html).toContain('id="search"'); expect(html).toContain('dir="auto"'); expect(html).toContain('name="product-search"'); expect(html).toContain('disabled=""');
  });
});

import { ProductCard } from "../components/store/product-card";
import type { CommerceProduct } from "./commerce-catalog-api";

const productImage = {
  id: "11111111-1111-4000-8000-000000000001",
  contentPath: "/v1/commerce/products/synthetic-product/images/11111111-1111-4000-8000-000000000001",
  mimeType: "image/webp" as const,
  sizeBytes: 1200,
  width: 800,
  height: 600,
  altText: "عکس محصول آزمایشی",
};
const product: CommerceProduct = {
  id: "synthetic-product", title: "محصول آزمایشی Test", slug: "synthetic-product",
  category: { id: "synthetic-category", name: "دستهٔ آزمایشی", slug: "synthetic-category" },
  skus: [{ id: "synthetic-sku", code: "TEST-1", currentPriceToman: "125000", currentTaxToman: "0" }],
};
const imagedProduct: CommerceProduct = { ...product, image: productImage };
const cardProps = { product, saved: false, inCart: false, busy: false, onFavorite: () => {} };

describe("Store ProductCard presentation contract", () => {
  it("preserves product destination, real price value and imagery source", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, cardProps));
    expect(html.match(/href="\/store\/products\/synthetic-product"/g)).toHaveLength(2);
    expect(html).toContain('dir="ltr"'); expect(html).toContain("۱۲۵٬۰۰۰");
    expect(html).not.toContain("افزودن به سبد");
  });
  it("renders the resolved API image when the product carries one", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { ...cardProps, product: imagedProduct }));
    expect(html).toContain("/v1/commerce/products/synthetic-product/images/11111111-1111-4000-8000-000000000001");
    expect(html).not.toContain("dkstatics-public.digikala.com");
  });
  it("renders the neutral fallback and no Digikala imagery when the product has none", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, cardProps));
    expect(html).toContain("data:image/svg+xml,");
    expect(html).not.toContain("dkstatics-public.digikala.com");
    expect(html).not.toContain("https://");
  });
  it("makes pending controls disabled and favorites selected without color alone", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { ...cardProps, saved: true, busy: true }));
    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(html).toContain('aria-pressed="true"'); expect(html).toContain('aria-busy="true"');
  });
  it("does not invent a purchasable SKU for an empty product", () => {
    expect(renderToStaticMarkup(createElement(ProductCard, { ...cardProps, product: { ...product, skus: [] } }))).toBe("");
  });
});

it("exposes a labeled favorite control bound to the product", () => {
  const html = renderToStaticMarkup(createElement(ProductCard, { ...cardProps, saved: true }));
  expect(html).toContain("حذف از علاقه‌مندی‌ها: محصول آزمایشی Test");
  expect(html).toContain('aria-pressed="true"');
  expect(html).not.toContain("افزودن به سبد");
});
import { CartItem, ProductPrice, QuantityControl, StoreState } from "../components/store/store-ui";

describe("Store shared presentation controls", () => {
  it("isolates Persian prices from surrounding RTL text", () => {
    const html = renderToStaticMarkup(createElement(ProductPrice, { amount: 125000 }));
    expect(html).toContain('<bdi dir="ltr">۱۲۵٬۰۰۰</bdi>');
    expect(html).toContain("تومان");
    expect(html).toContain("<svg");
  });
  it("disables quantity controls at the existing limits and while pending", () => {
    const props = { label: "آزمایشی", onChange: () => {} };
    expect(renderToStaticMarkup(createElement(QuantityControl, { ...props, value: 1 })).match(/disabled=""/g)).toHaveLength(1);
    expect(renderToStaticMarkup(createElement(QuantityControl, { ...props, value: 100 })).match(/disabled=""/g)).toHaveLength(1);
    const busy = renderToStaticMarkup(createElement(QuantityControl, { ...props, value: 2, busy: true }));
    expect(busy.match(/disabled=""/g)).toHaveLength(2);
    expect(busy).toContain('aria-busy="true"');
  });
  it("forwards zero for removal without changing the cart API contract", () => {
    const values: number[] = [];
    const tree = QuantityControl({ value: 1, min: 0, label: "آزمایشی", onChange: value => values.push(value) });
    const visit = (node: ReactNode): void => {
      if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) return;
      if (node.type === Button) node.props.onClick?.();
      Children.forEach(node.props.children, visit);
    };
    visit(tree);
    expect(values).toEqual([0, 2]);
    expect(renderToStaticMarkup(tree)).toContain("حذف آزمایشی");
  });
  it("preserves cart product links and announces pending updates", () => {
    const html = renderToStaticMarkup(createElement(CartItem, { item: { name: "آزمایشی", productId: "synthetic-product", price: 125000, qty: 1 }, busy: true, removing: false, onChange: () => {}, onUndo: () => {} }));
    expect(html).toContain('href="/store/products/synthetic-product"');
    expect(html).toContain("در حال به‌روزرسانی…");
    expect(html).toContain('aria-live="polite"');
  });
  it("covers a pending removal with an undo affordance", () => {
    const html = renderToStaticMarkup(createElement(CartItem, { item: { name: "آزمایشی", productId: "synthetic-product", price: 125000, qty: 1 }, busy: false, removing: true, onChange: () => {}, onUndo: () => {} }));
    expect(html).toContain("کالای موردنظر شما حذف شد");
    expect(html).toContain("انصراف");
    expect(html).toContain('role="alert"');
  });
  it("exposes recovery and pending states without fabricated data", () => {
    expect(renderToStaticMarkup(createElement(StoreState, { title: "خطا", error: true, action: "تلاش دوباره", onAction: () => {} }))).toContain('role="alert"');
    expect(renderToStaticMarkup(createElement(StoreState, { title: "دریافت…", pending: true }))).toContain('role="status"');
  });
  it("uses the saved SKU price", () => {
    const sku = { ...product.skus[0], id: "saved-sku", currentPriceToman: "225000" };
    expect(renderToStaticMarkup(createElement(ProductCard, { ...cardProps, skuOverride: sku }))).toContain("۲۲۵٬۰۰۰");
  });
});

import { ProductGallery } from "../components/store/product-gallery";
import { ProductImage } from "../components/store/product-image";
import { ProductContentSections } from "../components/store/product-content-sections";
import { RecentCard } from "../components/store/recent-card";

describe("Store real product image presentation (Phase 04C)", () => {
  it("renders the API image with alt text and lazy loading", () => {
    const html = renderToStaticMarkup(createElement(ProductImage, { src: "https://api.test/v1/commerce/products/p/images/i", alt: "عکس محصول" }));
    expect(html).toContain('src="https://api.test/v1/commerce/products/p/images/i"');
    expect(html).toContain('alt="عکس محصول"');
    expect(html).toContain('loading="lazy"');
  });

  it("renders the neutral local fallback for missing images without remote URLs", () => {
    const html = renderToStaticMarkup(createElement(ProductImage, { src: null, alt: "عنوان" }));
    expect(html).toContain("data:image/svg+xml,");
    expect(html).toContain('alt=""');
    expect(html).not.toContain("dkstatics");
    expect(html).not.toContain("https://");
  });

  it("shows a single API image on the gallery without counter or mosaic", () => {
    const html = renderToStaticMarkup(createElement(ProductGallery, { official: ["https://api.test/img-a"], buyer: [], title: "محصول" }));
    expect(html).toContain("https://api.test/img-a");
    expect(html).not.toContain("store-gallery__counter");
    expect(html).not.toContain("store-mosaic");
  });

  it("renders the neutral fallback inside the gallery layout when imageless", () => {
    const html = renderToStaticMarkup(createElement(ProductGallery, { official: [], buyer: [], title: "محصول" }));
    expect(html).toContain("store-gallery__slide");
    expect(html).toContain("data:image/svg+xml,");
    expect(html).not.toContain("store-gallery__counter");
  });

  it("presents cart item images from embedded metadata without extra requests", () => {
    const withImage = renderToStaticMarkup(createElement(CartItem, { item: { name: "آزمایشی", productId: "synthetic-product", price: 125000, qty: 1, imageUrl: "https://api.test/img-a" }, busy: false, removing: false, onChange: () => {}, onUndo: () => {} }));
    expect(withImage).toContain("https://api.test/img-a");
    const withoutImage = renderToStaticMarkup(createElement(CartItem, { item: { name: "آزمایشی", productId: "synthetic-product", price: 125000, qty: 1 }, busy: false, removing: false, onChange: () => {}, onUndo: () => {} }));
    expect(withoutImage).toContain("data:image/svg+xml,");
  });

  it("presents recent items with snapshots and falls back for legacy entries", () => {
    const withImage = renderToStaticMarkup(createElement(RecentCard, { item: { productId: "p1", title: "قدیمی", price: 1000, imageUrl: "https://api.test/img-a", viewedAt: 0 } }));
    expect(withImage).toContain("https://api.test/img-a");
    const legacy = renderToStaticMarkup(createElement(RecentCard, { item: { productId: "p1", title: "قدیمی", price: 1000, viewedAt: 0 } }));
    expect(legacy).toContain("data:image/svg+xml,");
    expect(legacy).not.toContain("dkstatics");
  });
});

const approvedContent = {
  brand: "برند واقعی",
  manufacturer: "تولیدکننده واقعی",
  shortDescription: "معرفی کوتاه واقعی",
  description: "توضیح تأییدشده",
  ingredients: "ماده واقعی",
  usageInstructions: "دستور واقعی",
  warnings: "هشدار واقعی",
  contraindications: "منع واقعی",
  contentRevision: 3,
};
const approvedProduct: CommerceProduct = {
  ...product,
  brand: null,
  shortDescription: null,
  description: null,
  content: approvedContent,
};

describe("Store real product content sections (Phase B1C)", () => {
  it("links navigation only to sections with real product content", () => {
    const html = renderToStaticMarkup(createElement(ProductContentSections, { product: approvedProduct }));
    for (const id of ["product-about", "product-ingredients", "product-usage", "product-warnings", "product-contraindications"]) {
      expect(html).toContain(`href="#${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
    const singleSection = renderToStaticMarkup(createElement(ProductContentSections, {
      product: { ...product, content: null, description: "توضیح واقعی" },
    }));
    expect(singleSection).not.toContain("<nav");
  });

  it("renders every nonempty approved field and nothing else", () => {
    const html = renderToStaticMarkup(createElement(ProductContentSections, { product: approvedProduct }));
    for (const text of ["معرفی کوتاه واقعی", "برند واقعی", "تولیدکننده واقعی", "توضیح تأییدشده", "ماده واقعی", "دستور واقعی", "هشدار واقعی", "منع واقعی"]) {
      expect(html).toContain(text);
    }
    for (const heading of ["دربارهٔ محصول", "ترکیبات", "دستور مصرف", "هشدارها", "موارد منع مصرف"]) {
      expect(html).toContain(heading);
    }
  });

  it("omits missing sections without placeholders or approval claims", () => {
    const html = renderToStaticMarkup(createElement(ProductContentSections, { product }));
    expect(html).not.toContain("دربارهٔ محصول");
    expect(html).not.toContain("ترکیبات");
    expect(html).not.toContain("هشدارها");
    expect(html).not.toContain("تأیید");
  });

  it("renders legacy descriptions and top-level brand fallbacks", () => {
    const legacy = renderToStaticMarkup(
      createElement(ProductContentSections, { product: { ...product, description: "توضیح قدیمی", brand: "برند فهرست", shortDescription: null, content: null } }),
    );
    expect(legacy).toContain("توضیح قدیمی");
    expect(legacy).toContain("برند فهرست");
    expect(legacy).not.toContain("ترکیبات");
  });

  it("renders plain text escaped without fabricating ratings, sellers or reviews", () => {
    const html = renderToStaticMarkup(
      createElement(ProductContentSections, { product: { ...approvedProduct, content: { ...approvedContent, description: "<b>bold</b> & سقوط" } } }),
    );
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
    for (const fake of ["امتیاز", "دیدگاه", "فروشنده", "تأییدشده", "رضایت", "ستاره"]) {
      expect(html).not.toContain(fake);
    }
  });

  it("keeps cart items free of seller claims without touching cart behavior", () => {
    const html = renderToStaticMarkup(createElement(CartItem, { item: { name: "آزمایشی", productId: "synthetic-product", price: 125000, qty: 2 }, busy: false, removing: false, onChange: () => {}, onUndo: () => {} }));
    expect(html).not.toContain("فروشنده");
    expect(html).not.toContain("تأییدشده");
    expect(html).toContain('href="/store/products/synthetic-product"');
  });
});
