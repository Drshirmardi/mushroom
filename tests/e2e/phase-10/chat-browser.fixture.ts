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

type ChatBrowserFixture = { appointmentId: string; runId: string };

const apiRequire = createRequire(resolve(process.cwd(), "apps/api/package.json"));
const { Client } = apiRequire("pg") as { Client: new (options: { connectionString: string }) => DatabaseClient };

function localDatabaseUrl(): string {
  const line = readFileSync(resolve(process.cwd(), "apps/api/.env"), "utf8")
    .split(/\r?\n/u)
    .find((value) => value.startsWith("DATABASE_URL="));
  const value = line?.slice("DATABASE_URL=".length).trim().replace(/^(?:"|')|(?:"|')$/gu, "");
  if (!value) throw new Error("Missing local DATABASE_URL for Phase 10 browser verification.");
  const url = new URL(value);
  // Docker on the local Windows harness is exposed through IPv4; this does not
  // alter the application configuration used by the browser or API.
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  return url.toString();
}

export function disposablePhone(runId: string): string {
  const numeric = BigInt(`0x${createHash("sha256").update(runId).digest("hex").slice(0, 14)}`) % 900_000_000n + 100_000_000n;
  return `+989${numeric.toString()}`;
}

export async function openDatabase(): Promise<DatabaseClient> {
  const database = new Client({ connectionString: localDatabaseUrl() });
  await database.connect();
  return database;
}

export async function createChatBrowserFixture(database: DatabaseClient, patientPhone: string): Promise<ChatBrowserFixture> {
  const runId = `f10e2e-${randomUUID()}`;
  const patient = await database.query<{ patientId: string; clinicId: string }>(
    "SELECT pp.id AS \"patientId\", pp.clinic_id AS \"clinicId\" FROM patient_profiles pp JOIN users u ON u.id = pp.user_id WHERE u.phone = $1",
    [patientPhone],
  );
  if (patient.rows.length !== 1) throw new Error("Browser registration did not create exactly one patient profile.");
  const baseOffering = await database.query<{ serviceId: string; durationMinutes: number; priceAmount: number; currency: string }>(
    "SELECT service_id AS \"serviceId\", duration_minutes AS \"durationMinutes\", price_amount AS \"priceAmount\", currency FROM doctor_services WHERE clinic_id = $1 AND visit_mode = 'ONLINE' AND is_active = true AND publication_status = 'PUBLISHED' ORDER BY created_at ASC LIMIT 1",
    [patient.rows[0].clinicId],
  );
  const specialty = await database.query<{ id: string }>(
    "SELECT id FROM specialties WHERE clinic_id = $1 AND is_active = true AND publication_status = 'PUBLISHED' ORDER BY created_at ASC LIMIT 1",
    [patient.rows[0].clinicId],
  );
  if (!baseOffering.rows[0] || !specialty.rows[0]) throw new Error("An active online offering and specialty are required for Phase 10 browser verification.");
  const doctorUserId = randomUUID();
  const doctorId = randomUUID();
  const offeringId = randomUUID();
  const appointmentId = randomUUID();
  const now = new Date();
  await database.query("BEGIN");
  try {
    await database.query("INSERT INTO users (id, phone, status, created_at, updated_at) VALUES ($1, $2, 'ACTIVE', now(), now())", [doctorUserId, disposablePhone(`${runId}:doctor`)]);
    await database.query("INSERT INTO doctor_profiles (id, clinic_id, user_id, display_name, is_active, publication_status, created_at, updated_at) VALUES ($1, $2, $3, $4, false, 'UNPUBLISHED', now(), now())", [doctorId, patient.rows[0].clinicId, doctorUserId, `Synthetic F10 doctor ${runId}`]);
    await database.query("INSERT INTO doctor_specialties (clinic_id, doctor_id, specialty_id, created_at) VALUES ($1, $2, $3, now())", [patient.rows[0].clinicId, doctorId, specialty.rows[0].id]);
    await database.query("UPDATE doctor_profiles SET is_active = true, publication_status = 'PUBLISHED', published_at = now(), updated_at = now() WHERE id = $1", [doctorId]);
    await database.query("INSERT INTO doctor_services (id, clinic_id, doctor_id, service_id, visit_mode, duration_minutes, buffer_minutes, price_amount, currency, is_active, publication_status, published_at, created_at, updated_at) VALUES ($1, $2, $3, $4, 'ONLINE', $5, 0, $6, $7, true, 'PUBLISHED', now(), now(), now())", [offeringId, patient.rows[0].clinicId, doctorId, baseOffering.rows[0].serviceId, baseOffering.rows[0].durationMinutes, baseOffering.rows[0].priceAmount, baseOffering.rows[0].currency]);
    await database.query("INSERT INTO appointments (id, clinic_id, patient_id, doctor_service_id, doctor_id, starts_at, ends_at, status, price_amount, currency, price_captured_at, idempotency_actor_user_id, idempotency_key, idempotency_request_hash, confirmed_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, now() - interval '5 minutes', now() + interval '30 minutes', 'CONFIRMED', $6, $7, now(), $8, $9, $10, now(), now(), now())", [appointmentId, patient.rows[0].clinicId, patient.rows[0].patientId, offeringId, doctorId, baseOffering.rows[0].priceAmount, baseOffering.rows[0].currency, doctorUserId, runId, createHash("sha256").update(runId).digest("hex")]);
    await database.query("COMMIT");
  } catch (error) {
    await database.query("ROLLBACK");
    throw error;
  }
  return { appointmentId, runId };
}

export async function cancelChatBrowserFixture(database: DatabaseClient, fixture: ChatBrowserFixture): Promise<void> {
  await database.query("UPDATE appointments SET status = 'CANCELLED', cancelled_at = now(), updated_at = now() WHERE id = $1 AND status = 'CONFIRMED'", [fixture.appointmentId]);
}

export type { DatabaseClient };
