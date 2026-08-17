import type { Product } from "@/types";

import { Icon } from "./Icon";

export function ProductCard({ product, index }: { product: Product; index: number }) {
    return (
        <div className="group press rounded-2xl md:rounded-3xl bg-card border border-border overflow-hidden shadow-premium hover:shadow-glow hover:-translate-y-1 hover:border-primary/25 transition-all duration-300">
            <div className="relative aspect-square overflow-hidden bg-secondary">
                <img
                    src={product.img}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {index === 0 && (
                    <span className="absolute top-2.5 right-2.5 md:top-3 md:right-3 rounded-full bg-[color:var(--gold)] text-primary text-[10px] md:text-xs font-bold px-2.5 md:px-3 py-1">
                        پرفروش
                    </span>
                )}
            </div>
            <div className="p-3.5 md:p-5">
                <div className="text-[11px] md:text-xs text-muted-foreground mb-1">
                    {product.category}
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-3 leading-snug line-clamp-2">
                    {product.name}
                </h3>
                <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-primary">
                        <span className="text-base md:text-lg">{product.price}</span>{" "}
                        <span className="text-[10px] md:text-xs text-muted-foreground">تومان</span>
                    </div>
                    <button
                        aria-label="افزودن به سبد"
                        className="press w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 hover:scale-105"
                    >
                        <Icon name="add_shopping_cart" className="text-lg" />
                    </button>
                </div>
            </div>
        </div>
    );
}
