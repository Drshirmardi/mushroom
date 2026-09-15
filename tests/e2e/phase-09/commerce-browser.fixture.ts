import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

type QueryResult<T = Record<string, unknown>> = { rows: T[] };
type DatabaseClient = {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
};

type Fixture = {
  runId: string;
  clinicId: string;
  categoryId: string;
  productId: string;
  skuId: string;
  inventoryItemId: string;
  title: string;
  skuCode: string;
  courierRateToman: string;
  patientAPhone: string;
  patientBPhone: string;
  password: string;
  baseline: { onHandQuantity: number; reservedQuantity: number; reservations: number; ledgerEntries: number };
};

type PatientRecord = { patientId: string; userId: string };
type OrderState = {
  orderCount: number;
  status: string | null;
  reservationStatus: string | null;
  reservationQuantity: number;
  onHandQuantity: number;
  reservedQuantity: number;
  reservationEffects: number;
  releaseEffects: number;
  paymentAttempts: number;
  payments: number;
};

const apiRequire = createRequire(resolve(process.cwd(), "apps/api/package.json"));
const { Client } = apiRequire("pg") as { Client: new (options: { connectionString: string }) => DatabaseClient };

function localSetting(key: string): string {
  const line = readFileSync(resolve(process.cwd(), "apps/api/.env"), "utf8")
    .split(/\r?\n/u)
    .find((value) => value.startsWith(`${key}=`));
  const value = line?.slice(key.length + 1).trim().replace(/^(?:"|')|(?:"|')$/gu, "");
  if (!value) throw new Error(`Missing local ${key} for Phase 09 browser verification.`);
  return value;
}

export function localAdminCredentials() {
  return { phone: localSetting("DEV_DASHBOARD_ADMIN_PHONE"), password: localSetting("DEV_DASHBOARD_ADMIN_PASSWORD") };
}

export async function openDatabase(): Promise<DatabaseClient> {
  const database = new Client({ connectionString: localSetting("DATABASE_URL") });
  await database.connect();
  return database;
}

function disposablePhone(runId: string, suffix: string): string {
  const numeric = BigInt(`0x${createHash("sha256").update(`${runId}:${suffix}`).digest("hex").slice(0, 14)}`) % 900_000_000n + 100_000_000n;
  return `+989${numeric.toString()}`;
}

const asNumber = (value: unknown) => Number(value);

export async function createRunScopedFixture(database: DatabaseClient): Promise<Fixture> {
  const runId = `f09e2e-${randomUUID()}`;
  const title = `F09 E2E ${runId}`;
  const categoryId = randomUUID();
  const productId = randomUUID();
  const skuId = randomUUID();
  const inventoryItemId = randomUUID();
  const clinic = await database.query<{ id: string }>("SELECT id FROM clinics WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1");
  if (!clinic.rows[0]) throw new Error("No active clinic is available for Phase 09 browser verification.");
  const fixture: Fixture = {
    runId, clinicId: clinic.rows[0].id, categoryId, productId, skuId, inventoryItemId, title,
    skuCode: `F09-${runId.slice(-12).toUpperCase()}`, courierRateToman: "",
    patientAPhone: disposablePhone(runId, "patient-a"), patientBPhone: disposablePhone(runId, "patient-b"), password: "F09-e2e-disposable-password",
    baseline: { onHandQuantity: 2, reservedQuantity: 0, reservations: 0, ledgerEntries: 0 },
  };
  await database.query("BEGIN");
  try {
    await database.query("INSERT INTO commerce_categories (id, clinic_id, name, slug, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, now(), now())", [categoryId, fixture.clinicId, title, runId]);
    await database.query("INSERT INTO commerce_products (id, clinic_id, category_id, title, slug, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', now(), now())", [productId, fixture.clinicId, categoryId, title, `${runId}-product`]);
    await database.query("INSERT INTO commerce_skus (id, clinic_id, product_id, code, current_price_toman, current_tax_toman, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, 125000, 0, true, now(), now())", [skuId, fixture.clinicId, productId, fixture.skuCode]);
    await database.query("INSERT INTO inventory_items (id, clinic_id, sku_id, on_hand_quantity, reserved_quantity, created_at, updated_at) VALUES ($1, $2, $3, 2, 0, now(), now())", [inventoryItemId, fixture.clinicId, skuId]);
    await database.query("COMMIT");
  } catch (error) { await database.query("ROLLBACK"); throw error; }
  const inventory = await database.query<{ onHandQuantity: number; reservedQuantity: number }>("SELECT on_hand_quantity AS \"onHandQuantity\", reserved_quantity AS \"reservedQuantity\" FROM inventory_items WHERE id = $1", [fixture.inventoryItemId]);
  const courierRate = await database.query<{ amountToman: string }>("SELECT amount_toman::text AS \"amountToman\" FROM commerce_shipping_rates WHERE clinic_id = $1 AND method = 'COURIER' AND is_active = true", [fixture.clinicId]);
  const reservations = await database.query<{ count: string }>("SELECT count(*)::text AS count FROM inventory_reservations WHERE inventory_item_id = $1", [fixture.inventoryItemId]);
  const ledger = await database.query<{ count: string }>("SELECT count(*)::text AS count FROM inventory_ledger_entries WHERE inventory_item_id = $1", [fixture.inventoryItemId]);
  if (!inventory.rows[0] || !courierRate.rows[0]) throw new Error("Run-scoped fixture requires active inventory and the persisted COURIER rate.");
  fixture.courierRateToman = courierRate.rows[0].amountToman;
  fixture.baseline = { onHandQuantity: asNumber(inventory.rows[0].onHandQuantity), reservedQuantity: asNumber(inventory.rows[0].reservedQuantity), reservations: asNumber(reservations.rows[0]?.count ?? 0), ledgerEntries: asNumber(ledger.rows[0]?.count ?? 0) };
  return fixture;
}

export async function patientForPhone(database: DatabaseClient, phone: string, clinicId: string): Promise<PatientRecord> {
  const result = await database.query<PatientRecord>("SELECT pp.id AS \"patientId\", u.id AS \"userId\" FROM patient_profiles pp JOIN users u ON u.id = pp.user_id WHERE u.phone = $1 AND pp.clinic_id = $2", [phone, clinicId]);
  if (result.rows.length !== 1) throw new Error("Disposable patient registration was not persisted exactly once.");
  return result.rows[0];
}

export async function orderState(database: DatabaseClient, fixture: Fixture, patientId: string, orderId?: string): Promise<OrderState> {
  const order = await database.query<{ id: string; status: string }>("SELECT id, status FROM commerce_orders WHERE patient_id = $1 ORDER BY created_at DESC, id DESC", [patientId]);
  const selected = orderId ? order.rows.find((item) => item.id === orderId) : order.rows[0];
  const orderRef = selected?.id ?? orderId ?? "00000000-0000-0000-0000-000000000000";
  const reservation = await database.query<{ status: string; quantity: number }>("SELECT status, quantity FROM inventory_reservations WHERE order_id = $1 AND inventory_item_id = $2", [orderRef, fixture.inventoryItemId]);
  const inventory = await database.query<{ onHandQuantity: number; reservedQuantity: number }>("SELECT on_hand_quantity AS \"onHandQuantity\", reserved_quantity AS \"reservedQuantity\" FROM inventory_items WHERE id = $1", [fixture.inventoryItemId]);
  const effects = await database.query<{ entryType: string; count: string }>("SELECT entry_type AS \"entryType\", count(*)::text AS count FROM inventory_ledger_entries entry JOIN inventory_reservations reservation ON reservation.id = entry.reference_id WHERE entry.inventory_item_id = $1 AND reservation.order_id = $2 GROUP BY entry_type", [fixture.inventoryItemId, orderRef]);
  const attempts = await database.query<{ count: string }>("SELECT count(*)::text AS count FROM payment_attempts WHERE order_id = $1", [orderRef]);
  const payments = await database.query<{ count: string }>("SELECT count(*)::text AS count FROM payments WHERE order_id = $1", [orderRef]);
  const count = (entryType: string) => asNumber(effects.rows.find((item) => item.entryType === entryType)?.count ?? 0);
  return { orderCount: order.rows.length, status: selected?.status ?? null, reservationStatus: reservation.rows[0]?.status ?? null, reservationQuantity: asNumber(reservation.rows[0]?.quantity ?? 0), onHandQuantity: asNumber(inventory.rows[0]?.onHandQuantity ?? 0), reservedQuantity: asNumber(inventory.rows[0]?.reservedQuantity ?? 0), reservationEffects: count("RESERVATION"), releaseEffects: count("RELEASE"), paymentAttempts: asNumber(attempts.rows[0]?.count ?? 0), payments: asNumber(payments.rows[0]?.count ?? 0) };
}

export async function cleanupRunScopedFixture(database: DatabaseClient, fixture: Fixture): Promise<void> {
  const patients = await database.query<PatientRecord>("SELECT pp.id AS \"patientId\", u.id AS \"userId\" FROM patient_profiles pp JOIN users u ON u.id = pp.user_id WHERE u.phone = ANY($1::text[]) AND pp.clinic_id = $2", [[fixture.patientAPhone, fixture.patientBPhone], fixture.clinicId]);
  const product = await database.query<{ title: string }>("SELECT title FROM commerce_products WHERE id = $1 AND clinic_id = $2", [fixture.productId, fixture.clinicId]);
  const inventory = await database.query<{ skuId: string }>("SELECT sku_id AS \"skuId\" FROM inventory_items WHERE id = $1 AND clinic_id = $2", [fixture.inventoryItemId, fixture.clinicId]);
  if (product.rows.length !== 1 || product.rows[0].title !== fixture.title || inventory.rows.length !== 1 || inventory.rows[0].skuId !== fixture.skuId || patients.rows.some((patient) => !patient.patientId || !patient.userId)) throw new Error("Refusing cleanup because the disposable run identity did not validate.");
  const patientIds = patients.rows.map((patient) => patient.patientId); const userIds = patients.rows.map((patient) => patient.userId);
  const orders = await database.query<{ id: string }>("SELECT id FROM commerce_orders WHERE patient_id = ANY($1::uuid[])", [patientIds]); const orderIds = orders.rows.map((order) => order.id);
  await database.query("BEGIN");
  try {
    if (orderIds.length) {
      await database.query("DELETE FROM refunds WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ANY($1::uuid[]))", [orderIds]);
      await database.query("DELETE FROM payments WHERE order_id = ANY($1::uuid[])", [orderIds]); await database.query("DELETE FROM payment_attempts WHERE order_id = ANY($1::uuid[])", [orderIds]);
      await database.query("DELETE FROM commerce_discount_reservations WHERE order_id = ANY($1::uuid[])", [orderIds]); await database.query("DELETE FROM commerce_order_operations WHERE order_id = ANY($1::uuid[])", [orderIds]);
      await database.query("DELETE FROM inventory_ledger_entries WHERE inventory_item_id = $1", [fixture.inventoryItemId]); await database.query("DELETE FROM inventory_reservations WHERE order_id = ANY($1::uuid[])", [orderIds]);
      await database.query("ALTER TABLE commerce_order_snapshots DISABLE TRIGGER commerce_order_snapshots_immutable"); await database.query("DELETE FROM commerce_order_snapshots WHERE order_id = ANY($1::uuid[])", [orderIds]); await database.query("ALTER TABLE commerce_order_snapshots ENABLE TRIGGER commerce_order_snapshots_immutable"); await database.query("DELETE FROM commerce_order_lines WHERE order_id = ANY($1::uuid[])", [orderIds]); await database.query("DELETE FROM commerce_orders WHERE id = ANY($1::uuid[])", [orderIds]);
    }
    await database.query("DELETE FROM commerce_cart_items WHERE cart_id IN (SELECT id FROM commerce_carts WHERE patient_id = ANY($1::uuid[]))", [patientIds]); await database.query("DELETE FROM commerce_carts WHERE patient_id = ANY($1::uuid[])", [patientIds]);
    await database.query("DELETE FROM wishlist_items WHERE patient_id = ANY($1::uuid[])", [patientIds]); await database.query("DELETE FROM commerce_addresses WHERE patient_id = ANY($1::uuid[])", [patientIds]);
    await database.query("DELETE FROM audit_events WHERE actor_user_id = ANY($1::uuid[]) OR subject_id = ANY($2::uuid[])", [userIds, [...patientIds, fixture.categoryId, fixture.productId, fixture.skuId, fixture.inventoryItemId, ...orderIds]]);
    await database.query("DELETE FROM login_attempts WHERE user_id = ANY($1::uuid[]) OR phone = ANY($2::text[])", [userIds, [fixture.patientAPhone, fixture.patientBPhone]]);
    await database.query("DELETE FROM patient_profiles WHERE id = ANY($1::uuid[])", [patientIds]); await database.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
    await database.query("DELETE FROM inventory_ledger_entries WHERE inventory_item_id = $1", [fixture.inventoryItemId]); await database.query("DELETE FROM inventory_items WHERE id = $1 AND sku_id = $2", [fixture.inventoryItemId, fixture.skuId]);
    await database.query("DELETE FROM commerce_skus WHERE id = $1 AND product_id = $2", [fixture.skuId, fixture.productId]); await database.query("DELETE FROM commerce_products WHERE id = $1 AND category_id = $2 AND title = $3", [fixture.productId, fixture.categoryId, fixture.title]); await database.query("DELETE FROM commerce_categories WHERE id = $1 AND slug = $2", [fixture.categoryId, fixture.runId]);
    await database.query("COMMIT");
  } catch (error) { await database.query("ROLLBACK"); throw error; }
  const remaining = await database.query<{ count: string }>(`SELECT
    (SELECT count(*) FROM users WHERE phone = ANY($1::text[]))
    + (SELECT count(*) FROM commerce_categories WHERE id = $2)
    + (SELECT count(*) FROM commerce_products WHERE id = $3)
    + (SELECT count(*) FROM commerce_skus WHERE id = $4)
    + (SELECT count(*) FROM inventory_items WHERE id = $5)
    + (SELECT count(*) FROM commerce_orders WHERE patient_id = ANY($6::uuid[]))
    + (SELECT count(*) FROM inventory_reservations WHERE order_id = ANY($7::uuid[]) OR inventory_item_id = $5)
    + (SELECT count(*) FROM inventory_ledger_entries WHERE inventory_item_id = $5)
    + (SELECT count(*) FROM payment_attempts WHERE order_id = ANY($7::uuid[]))
    + (SELECT count(*) FROM payments WHERE order_id = ANY($7::uuid[]))
    + (SELECT count(*) FROM commerce_carts WHERE patient_id = ANY($6::uuid[]))
    + (SELECT count(*) FROM commerce_addresses WHERE patient_id = ANY($6::uuid[]))
    + (SELECT count(*) FROM audit_events WHERE actor_user_id = ANY($8::uuid[]) OR subject_id = ANY($9::uuid[])) AS count`, [
    [fixture.patientAPhone, fixture.patientBPhone], fixture.categoryId, fixture.productId, fixture.skuId,
    fixture.inventoryItemId, patientIds, orderIds, userIds,
    [...patientIds, fixture.categoryId, fixture.productId, fixture.skuId, fixture.inventoryItemId, ...orderIds],
  ]);
  if (asNumber(remaining.rows[0]?.count ?? 0) !== 0) throw new Error("Disposable Phase 09 browser fixture cleanup was incomplete.");
}

export type { DatabaseClient, Fixture, OrderState, PatientRecord };
