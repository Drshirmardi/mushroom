/** Actor-owned invitation summaries only. Never infer partner response or consent from UI state. */
export type CoupleRequestSummary = {
  id: string;
  status: string;
  isInitiator: boolean;
};

export function classifyCoupleRequests<T extends CoupleRequestSummary>(items: readonly T[]): {
  incoming: T[];
  active: T[];
  history: T[];
} {
  const incoming: T[] = [];
  const active: T[] = [];
  const history: T[] = [];
  for (const item of items) {
    if (item.status === 'PENDING' && !item.isInitiator) incoming.push(item);
    else if (item.status === 'PENDING' || item.status === 'ACCEPTED') active.push(item);
    else history.push(item);
  }
  return { incoming, active, history };
}

export function coupleRequestStatus(item: CoupleRequestSummary): string {
  switch (item.status) {
    case 'PENDING': return item.isInitiator ? 'منتظر پاسخ نفر دوم' : 'منتظر پاسخ شما';
    case 'ACCEPTED': return 'دعوت پذیرفته شد';
    case 'CANCELLED': return 'دعوت لغو شد';
    case 'REPLACED': return 'دعوت جایگزین شد';
    default: return 'بررسی وضعیت دعوت';
  }
}
