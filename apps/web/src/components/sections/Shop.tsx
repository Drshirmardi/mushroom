import { products } from "@/data";
import { Icon } from "@/components/shared/Icon";
import { ProductCard } from "@/components/shared/ProductCard";

export function Shop() {
    return (
        <section id="shop" className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
            <div className="flex items-end justify-between mb-7 md:mb-10 flex-wrap gap-4">
                <div>
                    <div className="text-primary text-xs md:text-sm font-semibold mb-2 tracking-wide">
                        فروشگاه سلامت
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold">محصولات منتخب و ارگانیک</h2>
                    <p className="text-sm md:text-base text-muted-foreground mt-2">
                        برای تقویت اثرات درمانی.
                    </p>
                </div>
                <a
                    href="#"
                    className="press inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                >
                    مشاهده همه محصولات
                    <Icon name="arrow_back" />
                </a>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-5">
                {products.map((p, i) => (
                    <ProductCard key={p.name} product={p} index={i} />
                ))}
            </div>
        </section>
    );
}
