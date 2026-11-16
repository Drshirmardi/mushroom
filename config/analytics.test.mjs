import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics, logicalPage } from './analytics.ts';

test('logical pages never expose dynamic IDs, queries or article titles', () => {
  assert.equal(logicalPage('/store/products/private-123?token=secret'), '/store/products/:id');
  assert.equal(logicalPage('/articles/private-medical-title'), '/articles/:id');
  assert.equal(logicalPage('/unknown/secret'), '/other');
  assert.equal(logicalPage('/en'), '/landing');
});
test('disabled/denied sends nothing, including queued history', () => {
  const events = [];
  const analytics = createAnalytics((...args) => events.push(args));
  analytics.page('/store');
  analytics.track('cta_click', { action_id: 'header' });
  assert.equal(events.length, 0);
  analytics.setEnabled(true);
  assert.equal(events.length, 0);
  analytics.page('/store');
  analytics.setEnabled(false);
  analytics.track('cta_click', { action_id: 'header' });
  assert.equal(events.length, 1);
});
test('duplicate mounts do not double page views, actual return visits count', () => {
  const events = [];
  const analytics = createAnalytics((...args) => events.push(args));
  analytics.setEnabled(true);
  analytics.page('/store'); analytics.page('/store?login=1');
  analytics.page('/profile'); analytics.page('/store');
  assert.equal(events.length, 3);
});
test('only registered metadata is sent; adapter failures never escape', () => {
  const events = [];
  const analytics = createAnalytics((...args) => events.push(args));
  analytics.setEnabled(true);
  analytics.track('cta_click', { action_id: 'hero', email: 'private', section_id: 'shop', value: 'medical text' });
  assert.deepEqual(events[0], ['cta_click', { action_id: 'hero', section_id: 'shop', schema_version: 1 }]);
  const failing = createAnalytics(() => { throw new Error('blocked'); });
  failing.setEnabled(true);
  assert.doesNotThrow(() => failing.page('/store'));
});

test('distinct products count as navigation without sending their IDs', () => {
  const events = [];
  const analytics = createAnalytics((...args) => events.push(args));
  analytics.setEnabled(true);
  analytics.page('/store/products/first');
  analytics.page('/store/products/second');
  assert.equal(events.length, 2);
  assert.equal(events[0][1].page_path, '/store/products/:id');
  assert.equal(events[1][1].page_path, '/store/products/:id');
});
