import { redirect } from "next/navigation";

export default function WishlistPage() {
  redirect("/store/cart?tab=saved");
}
