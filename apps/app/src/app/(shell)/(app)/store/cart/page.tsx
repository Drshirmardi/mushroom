'use client';
import { RefreshIndicator } from '@/components/shared/heartbeat-loader';
import { ShellAction } from '@/components/layout/shell-slots';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, MotionConfig } from 'motion/react';

import { useAuthSession } from '@/components/auth/session-gate';
import { Button } from '@/components/ui/button';
import { CartItem, ProductPrice, StoreState } from '@/components/store/store-ui';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentedTabs } from '@/components/shared/segmented-tabs';
import styles from '@/components/store/purchase-flow.module.css';

import {
  commerceErrorMessage,
  getCommerceCart,
  updateCommerceCart,
  type CommerceCart,
} from '@/lib/commerce-catalog-api';

import { useScreenNavigation } from '@/lib/navigation';
import { cartTotal, cartTax, cartCount, useCartStore } from '@/stores/cart';
import { toP } from '@/lib/format';
import { productImageUrl } from '@/lib/product-image';
import { useRecentStore } from '@/stores/recently-viewed';
import { RecentCard } from '@/components/store/recent-card';
import { StoreCollection } from '@/components/store/store-collection';
import { StoreIcon } from '@/components/store/store-icon';
import { WishlistPanel } from '@/components/store/wishlist-panel';
import { getCommerceWishlist } from '@/lib/commerce-catalog-api';
import { useWishlistStore } from '@/stores/wishlist';

const cache = (cart: CommerceCart) =>
  useCartStore.getState().replace(
    cart.items.map((item) => ({
      id: item.id,
      skuId: item.sku.id,
      productId: item.product.id,
      name: item.product.title,
      variantTitle: item.sku.title,
      price: item.sku.currentPriceToman,
      tax: item.sku.currentTaxToman,
      qty: item.quantity,
      imageUrl: productImageUrl(item.product),
    })),
  );

export default function CartPage() {
  return (
    <Suspense fallback={<StoreState title="در حال دریافت سبد خرید…" pending />}>
      <CartScreen />
    </Suspense>
  );
}

function CartScreen() {
  const { authentication } = useAuthSession();
  const router = useRouter();
  const search = useSearchParams();
  const savedTab = search.get('tab') === 'saved';
  const navigateScreen = useScreenNavigation();
  const items = useCartStore((state) => state.items);
  const savedCount = useWishlistStore((state) => state.ids.length);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const recent = useRecentStore((state) => state.items);
  /** Undo window for removals (matches the progress-bar animation in CSS). */
  const UNDO_MS = 5000;
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const removeTimers = useRef<Map<string, number>>(new Map());
  const clearRemoveTimer = (skuId: string) => {
    const timer = removeTimers.current.get(skuId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      removeTimers.current.delete(skuId);
    }
  };
  useEffect(
    () => () => {
      removeTimers.current.forEach((timer) => window.clearTimeout(timer));
      removeTimers.current.clear();
    },
    [],
  );
  const loaded = useRef(false),
    generation = useRef(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(!loaded.current);
    setRefreshing(loaded.current);
    setError(null);
    try {
      const cart = await getCommerceCart(authentication.accessToken);
      if (request === generation.current) {
        cache(cart);
        loaded.current = true;
        setHasLoaded(true);
      }
    } catch (cause) {
      if (request === generation.current) setError(commerceErrorMessage(cause));
    } finally {
      if (request === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [authentication.accessToken]);
  useEffect(() => {
    const requests = generation;
    loaded.current = false;
    setHasLoaded(false);
    void load();
    return () => {
      requests.current++;
    };
  }, [load]);
  const change = async (skuId: string, quantity: number) => {
    setBusy(skuId);
    setError(null);
    try {
      cache(await updateCommerceCart(authentication.accessToken, skuId, quantity));
    } catch (cause) {
      setError(commerceErrorMessage(cause));
    } finally {
      setBusy(null);
    }
  };
  const requestRemove = (skuId: string) => {
    clearRemoveTimer(skuId);
    setRemovingIds((ids) => (ids.includes(skuId) ? ids : [...ids, skuId]));
    removeTimers.current.set(
      skuId,
      window.setTimeout(() => {
        removeTimers.current.delete(skuId);
        setRemovingIds((ids) => ids.filter((id) => id !== skuId));
        void change(skuId, 0);
      }, UNDO_MS),
    );
  };
  const undoRemove = (skuId: string) => {
    clearRemoveTimer(skuId);
    setRemovingIds((ids) => ids.filter((id) => id !== skuId));
  };
  const onQty = (skuId: string, quantity: number) => {
    if (quantity === 0) requestRemove(skuId);
    else void change(skuId, quantity);
  };
  const [emptyVisible, setEmptyVisible] = useState(false);
  const prevLength = useRef(items.length);
  useEffect(() => {
    const wasNonEmpty = prevLength.current > 0;
    prevLength.current = items.length;
    if (loading || error || items.length > 0) {
      setEmptyVisible(false);
      return;
    }
    if (wasNonEmpty) {
      const timer = window.setTimeout(() => setEmptyVisible(true), 300);
      return () => window.clearTimeout(timer);
    }
    setEmptyVisible(true);
  }, [loading, error, items.length]);
  useEffect(() => {
    void getCommerceWishlist(authentication.accessToken)
      .then((list) => useWishlistStore.getState().replace(list.items.map((item) => item.sku.id)))
      .catch(() => undefined);
  }, [authentication.accessToken]);
  const tax = cartTax(items);
  const total = cartTotal(items) + tax;
  const selectTab = (next: 'cart' | 'saved') => {
    router.replace(next === 'saved' ? '/store/cart?tab=saved' : '/store/cart');
  };
  return (
    <main className={`store-page ${styles.page}`}>
      <div className={styles.header}>
        <PageHeader title={savedTab ? 'علاقه‌مندی‌ها' : 'سبد خرید'} onBack={() => router.back()} backIcon={<StoreIcon name="arrowRight" size={20} className="text-foreground" />} />
      </div>
      <SegmentedTabs
        ariaLabel="سبد و علاقه‌مندی"
        value={savedTab ? 'saved' : 'cart'}
        onChange={selectTab}
        className="mb-4"
        options={[
          {
            value: 'cart',
            id: 'cart-tab',
            controls: 'cart-panel',
            label: (
              <>
                سبد خرید <span className="tabular-nums">{toP(cartCount(items))}</span>
              </>
            ),
          },
          {
            value: 'saved',
            id: 'saved-tab',
            controls: 'saved-panel',
            label: (
              <>
                <StoreIcon name="heart" size={16} />
                علاقه‌مندی‌ها <span className="tabular-nums">{toP(savedCount)}</span>
              </>
            ),
          },
        ]}
      />
      {savedTab ? (
        <div id="saved-panel" role="tabpanel" aria-labelledby="saved-tab">
          <WishlistPanel />
        </div>
      ) : (
        <div id="cart-panel" role="tabpanel" aria-labelledby="cart-tab">
      {refreshing && <RefreshIndicator />}
      {loading && <StoreState title="در حال دریافت سبد خرید…" pending />}
      {error && (
        <StoreState
          title="سبد به‌روزرسانی نشد"
          description={error}
          error
          action="تلاش دوباره"
          onAction={() => void load()}
        />
      )}
      {!loading && !error && emptyVisible && (
        <div className="store-empty">
          <StoreIcon name="shoppingBag" size={44} className="text-primary" />
          <h2>سبد خرید شما خالی است!</h2>
          <p>اگر به فروشگاه سر بزنید، دست‌پر برمی‌گردید.</p>
          <Button
            variant="secondary"
            className="store-empty__action"
            onClick={() => router.push('/store')}
          >
            رفتن به فروشگاه
          </Button>
        </div>
      )}
      {!loading && (!error || hasLoaded) && (
        <MotionConfig reducedMotion="user">
          <div className="store-cart-list">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  busy={busy === item.skuId}
                  removing={removingIds.includes(item.skuId)}
                  onChange={(quantity) => onQty(item.skuId, quantity)}
                  onUndo={() => undoRemove(item.skuId)}
                />
              ))}
            </AnimatePresence>
          </div>
        </MotionConfig>
      )}
      {!loading && !error && items.length > 0 && (
        <ShellAction>
          <div className={styles.cartAction} aria-label="خلاصهٔ سبد">
            <div className="store-cart-bar__action">
              <Button
                className="store-full-button"
                disabled={!!busy || removingIds.length > 0}
                onClick={() => navigateScreen('CheckoutScreen')}
              >
                ثبت سفارش
              </Button>
            </div>
            <div className="store-cart-bar__total">
              <span>
                جمع {toP(cartCount(items))} کالا{tax > BigInt(0) ? '، با مالیات' : ''}
              </span>
              <ProductPrice amount={total} />
            </div>
          </div>
        </ShellAction>
      )}
        </div>
      )}
      {/* {recent.length > 0 && (
        <>
          <div className="store-divider" aria-hidden="true" />
          <StoreCollection title="بازدیدهای اخیر" id="store-recent">
            {recent.map((item) => (
              <RecentCard key={item.productId} item={item} />
            ))}
          </StoreCollection>
        </>
      )} */}
    </main>
  );
}
