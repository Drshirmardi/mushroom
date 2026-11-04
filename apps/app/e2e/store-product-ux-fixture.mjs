export async function installStoreProductFixture(page) {
  const state = { quantities: {}, writes: [], rejectCart: false, long: false, failProduct: false, holdProduct: false, failImage: false, empty: false, recommendations: false };
  const category = { id: 'cat1', name: 'محصولات سلامت', slug: 'health' };
  const sku = (id, title, price) => ({ id, code: id, title, currentPriceToman: price, currentTaxToman: '0' });
  const product = () => ({ id: 'p1', title: 'روغن آزمایشی مراقبت و سلامت', slug: 'sample', category,
    image: { contentPath: '/v1/commerce/products/p1/images/image1', altText: 'تصویر کالای آزمایشی' },
    skus: [sku('s1', 'بسته کوچک', '12500'), sku('s2', 'بسته بزرگ', '25000')],
    content: { brand: 'برند آزمایشی', manufacturer: 'تولیدکننده آزمایشی', shortDescription: 'معرفی کوتاه واقعی محصول',
      ...Object.fromEntries(['description', 'ingredients', 'usageInstructions', 'warnings', 'contraindications'].map(key => [key, `متن آزمایشی ${key}؛ ${(state.long ? 'توضیح فارسی بلند برای بررسی پیمایش و خوانایی. '.repeat(30) : 'اطلاعات کوتاه و روشن.')}`])) } });
  const cart = () => ({ items: product().skus.filter(s => state.quantities[s.id]).map(s => ({ id: `item-${s.id}`, quantity: state.quantities[s.id], sku: s, product: product() })) });
  const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#e7f1f7"/><rect x="220" y="120" width="160" height="360" rx="32" fill="#176b9a"/></svg>';
  await page.route('**/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const headers = { 'access-control-allow-origin': request.headers().origin || '*', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' };
    const send = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 3600, user: { id: '11111111-1111-4111-8111-111111111111', roles: ['PATIENT'] } });
    if (request.method() !== 'GET') {
      if (!path.endsWith('/cart') || request.method() !== 'PUT') throw Error(`Unexpected fixture mutation ${path}`);
      const body = request.postDataJSON(); state.writes.push(body);
      await new Promise(resolve => setTimeout(resolve, 150));
      if (state.rejectCart) return send({ code: 'INVALID_QUANTITY' }, 422);
      state.quantities[body.skuId] = body.quantity; return send(cart());
    }
    if (path.endsWith('/entry')) return send({ required: false });
    if (path.endsWith('/journey')) return send({ onboarding: { isComplete: true }, home: { actions: [] } });
    if (path.endsWith('/cart')) return send(cart());
    if (path.endsWith('/wishlist')) return send({ items: [] });
    if (path.endsWith('/commerce/addresses')) return send([]);
    if (path.endsWith('/commerce/recommendations')) return send({ status: 'READY', items: state.recommendations ? [product()] : [] });
    if (path.endsWith('/content/banners')) return send({ items: [{ id: 'b1', title: 'بنر آزمایشی', altText: 'بنر آزمایشی', contentPath: '/v1/content/banners/b1/image', href: '/store?view=all' }] });
    if (path.endsWith('/images/image1') || path.endsWith('/b1/image')) return route.fulfill({ status: state.failImage ? 404 : 200, headers, contentType: 'image/svg+xml', body: state.failImage ? '' : picture });
    if (path.endsWith('/commerce/products/p1')) {
      if (state.holdProduct) await new Promise(resolve => { state.releaseProduct = resolve; });
      return send(state.failProduct ? { code: 'NOT_FOUND' } : product(), state.failProduct ? 404 : 200);
    }
    if (path.endsWith('/commerce/products')) return send({ items: state.empty ? [] : [product()], page: Number(url.searchParams.get('page') || 1), pageSize: 20, total: state.empty ? 0 : 1 });
    return send({ items: [], total: 0 });
  });
  return state;
}
