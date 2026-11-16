import { LoadingState, SkeletonBox } from "../shared/skeletons";
import styles from "./store-home.module.css";
export function StoreGridLoading() {
  return <LoadingState label="در حال دریافت محصولات…"><div className="store-grid">{Array.from({length:4},(_,i)=><div className="store-product" key={i}><SkeletonBox className="aspect-square w-full rounded-none"/><div className="store-product__body"><SkeletonBox className="h-12 w-full"/><SkeletonBox className="h-11 w-3/4"/><SkeletonBox className="h-6 w-2/3"/><SkeletonBox className="h-9 w-full"/></div></div>)}</div></LoadingState>;
}
export function StorePageLoading() { return <main className={`store-catalog ${styles.catalog}`} dir="rtl"><div className="store-heading"><SkeletonBox className="h-14 w-28"/></div><SkeletonBox className="mb-6 h-28 w-full"/><StoreGridLoading/></main>; }
