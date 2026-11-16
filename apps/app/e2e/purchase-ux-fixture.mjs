export async function installPurchaseFixture(page) {
  const state = { paid: false, reads: 0, commands: [], receiptStatus: 'VERIFIED' };
  const product = { id: 'p1', title: 'محصول آزمایشی سلامت', image: null, skus: [{ id: 's1', title: null, code: 'S1', currentPriceToman: '100000', currentTaxToman: '0' }] };
  const cart = () => ({ items: state.paid ? [] : [{ id: 'item1', quantity: 1, product, sku: product.skus[0] }] });
  const order = () => ({ id: 'o1', orderNumber: '1024', status: state.paid ? 'PAID' : 'PENDING_PAYMENT', paymentStatus: state.paid ? 'VERIFIED' : 'PENDING', shippingMethod: 'PICKUP', shippingAddress: null, subtotalAmountToman: '100000', taxAmountToman: '0', discountAmountToman: '0', shippingAmountToman: '0', totalAmountToman: '100000', lines: [{ productTitle: product.title, skuCode: 'S1', quantity: 1, unitPriceToman: '100000', unitTaxToman: '0', lineTotalToman: '100000' }], createdAt: '2026-11-01T10:00:00Z' });
  const intent = () => ({ id: 'i1', purpose: 'ORDER', status: state.paid ? 'PAID' : 'PENDING', orderId: 'o1', amountRial: '1000000', currency: 'IRR', methods: [{ code: 'WALLET', available: true, balanceRial: '2000000' }, { code: 'GATEWAY', available: false }], createdAt: '2026-11-01T10:00:00Z' });
  await page.route('**/v1/**', async route => {
    const req = route.request(), p = new URL(req.url()).pathname;
    const headers = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' };
    const send = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (p.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 3600, user: { id: '11111111-1111-4111-8111-111111111111', roles: ['PATIENT'] } });
    if (p.endsWith('/entry')) return send({ required: false });
    if (p.endsWith('/journey')) return send({ onboarding: { isComplete: true }, home: { latestAssessment: null, activeTreatmentPlanId: null, actions: [{ code: 'CONTINUE_PAYMENT', resourceId: 'i1', amountRial: '1000000', paymentPurpose: 'ORDER' }] } });
    if (req.method() !== 'GET') {
      state.commands.push(p);
      if (p.endsWith('/orders')) return send(order());
      if (p.endsWith('/billing/order-intents')) return send(intent());
      if (p.endsWith('/wallet-payment')) { state.paid = true; return send(intent()); }
      if (p.endsWith('/discount-preview')) return send({ code: 'INVALID' }, 422);
      throw Error(`Unexpected fixture command: ${p}`);
    }
    if (p.endsWith('/cart')) return send(cart());
    if (p.endsWith('/addresses')) return send([]);
    if (p.endsWith('/shipping-options')) return send([{ method: 'PICKUP', amountToman: '0' }]);
    if (p.endsWith('/orders/o1')) return send(order());
    if (p.endsWith('/receipt')) return send({ orderId: 'o1', status: state.receiptStatus, totalAmountToman: '100000', method: 'WALLET', verifiedAt: '2026-11-01T10:00:00Z' });
    if (p.includes('/billing/intents/i1')) { state.reads++; return send(intent()); }
    return send({ items: [], total: 0 });
  });
  return state;
}
