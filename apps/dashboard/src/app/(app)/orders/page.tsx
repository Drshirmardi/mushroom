import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { OrdersPage } from "@/features/orders/orders-page";

export const metadata: Metadata = pageMetadata("orders");

export default function Page() {
  return <OrdersPage />;
}
