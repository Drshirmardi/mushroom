'use client';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Compass, Heart, Leaf, Sparkles } from 'lucide-react';
import type { MezajService, OwnedMezajService } from '@/lib/mezaj-services-api';
import { formatToman, rialToToman, rialRemainderLabel } from '@/lib/wallet-money';
import { formatRial } from '@/lib/wallet-money';

export function ServiceIcon({ name }: { name: string }) {
  const icons: Record<string, typeof BookOpen> = { book: BookOpen, compass: Compass, heart: Heart, leaf: Leaf, sparkles: Sparkles };
  const Icon = icons[name] ?? BookOpen;
  return <span className="mezaj-service-icon"><Icon size={23} strokeWidth={1.6} aria-hidden="true" /></span>;
}
export function ServiceCard({ item }: { item: MezajService }) {
  const amount = BigInt(item.amountRial);
  const remainder = rialRemainderLabel(amount);
  const price = `${formatToman(rialToToman(amount))} تومان${remainder ? ` و ${remainder}` : ''}`;
  const owned = item.state === 'OWNED' && item.accessGrantId;
  const pending = item.state === 'PENDING' && item.purchaseId;
  const href = owned ? `/programs/content/${encodeURIComponent(item.accessGrantId!)}` : pending ? `/programs/purchases/${encodeURIComponent(item.purchaseId!)}` : `/programs/offerings/${encodeURIComponent(item.publicationId)}`;
  return <article className="mezaj-service-card"><ServiceIcon name={item.icon} /><h3>{item.title}</h3>{item.summary && <p>{item.summary}</p>}{!owned&&!pending&&item.discountPercent>0&&<p><del>{formatRial(BigInt(item.baseAmountRial))}</del> · <strong>{item.discountPercent.toLocaleString('fa-IR')}٪ تخفیف</strong></p>}<div className="mezaj-service-card__footer"><span>{owned ? 'در کتابخانهٔ شما' : pending ? 'در انتظار پرداخت' : amount === BigInt(0) ? 'رایگان' : price}</span><Link href={href}>{owned ? 'مطالعهٔ محتوا' : pending ? 'ادامهٔ خرید' : 'جزئیات و خرید'}<ArrowLeft size={16} aria-hidden="true" /></Link></div></article>;
}
export function OwnedServiceCard({ item }: { item: OwnedMezajService }) {
  const href = item.accessAvailable ? `/programs/content/${encodeURIComponent(item.accessGrantId)}` : `/programs/purchases/${encodeURIComponent(item.purchaseId)}`;
  return <Link className="mezaj-owned-card" href={href}><ServiceIcon name={item.icon} /><span><strong>{item.title}</strong><small>{item.accessAvailable ? 'باز کردن محتوای من' : 'بررسی وضعیت دسترسی'}</small></span><ArrowLeft size={17} aria-hidden="true" /></Link>;
}
