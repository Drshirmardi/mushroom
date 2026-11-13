"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StoreIcon } from "./store-icon";
import { ShellAction } from "../layout/shell-slots";
import { SkeletonBox } from "../shared/skeletons";
import { Button } from "../ui/button";
import styles from "./product-page.module.css";
export function ProductLoadingContent() {
  return <><div className="store-detail store-detail--panel" data-product-loading role="status" aria-busy="true"><span className="sr-only">در حال دریافت محصول…</span><div className="store-gallery" aria-hidden="true"><div className="store-gallery__strip store-gallery__strip--single"><SkeletonBox className="h-full w-full"/></div></div><section className="store-detail__sheet" aria-hidden="true"><div className="store-detail__handle-button"><SkeletonBox className="h-1 w-11"/></div><SkeletonBox className="my-4 h-16 w-full"/><SkeletonBox className="my-4 h-12 w-full"/><SkeletonBox className="my-4 h-8 w-1/2"/></section></div><ShellAction><div className={`store-purchase-bar ${styles.actions}`}><div className="store-purchase-bar__action"><Button disabled className={`store-full-button ${styles.addButton}`}>در حال دریافت محصول…</Button></div><div className="store-purchase-bar__price" data-product-price-loading><SkeletonBox className="h-12 w-24"/></div></div></ShellAction></>;
}
export function ProductPageLoading() { const router=useRouter(); return <main className={`store-page store-product-page ${styles.page}`}><header className="store-page-header"><Button variant="ghost" className="store-icon-button" aria-label="بازگشت" onClick={()=>router.back()}><StoreIcon name="arrowRight" size={22}/></Button><h1>جزئیات محصول</h1><Link href="/store/cart" className="store-icon-button" aria-label="سبد خرید"><StoreIcon name="shoppingBag" size={20}/></Link></header><ProductLoadingContent/></main>; }
