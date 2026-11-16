BEGIN;

-- CreateTable
CREATE TABLE "program_import_previews" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "bundle_hash" CHAR(64) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "program_import_previews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_import_receipts" (
    "id" UUID NOT NULL,
    "preview_id" UUID NOT NULL,
    "program_key" VARCHAR(141) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,

    CONSTRAINT "program_import_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_import_previews_clinic_id_actor_user_id_expires_at_idx" ON "program_import_previews"("clinic_id", "actor_user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "program_import_receipts_preview_id_program_key_key" ON "program_import_receipts"("preview_id", "program_key");

-- AddForeignKey
ALTER TABLE "program_import_previews" ADD CONSTRAINT "program_import_previews_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_import_receipts" ADD CONSTRAINT "program_import_receipts_preview_id_fkey" FOREIGN KEY ("preview_id") REFERENCES "program_import_previews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A new commercial publication moves current content in the same transaction.
CREATE FUNCTION program_service_capture_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE program_services s SET published_definition_id=NEW.program_definition_id,
   selling_enabled=(s.archived_at IS NULL), base_amount_rial=NEW.amount_rial,revision=s.revision+1
 WHERE s.clinic_id=NEW.clinic_id AND s.program_key=NEW.program_key AND s.locale=NEW.locale;
 RETURN NEW;
END $$;
CREATE TRIGGER program_service_capture_publication AFTER INSERT ON program_offering_publications
 FOR EACH ROW EXECUTE FUNCTION program_service_capture_publication();

-- Availability and already-issued quote eligibility are deliberately separate.
ALTER FUNCTION program_publication_current(uuid) RENAME TO program_publication_before_catalog;
CREATE FUNCTION program_publication_current(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT program_publication_before_catalog(target) AND NOT EXISTS (
   SELECT 1 FROM program_offering_publications p JOIN program_services s
   ON s.clinic_id=p.clinic_id AND s.program_key=p.program_key AND s.locale=p.locale
   WHERE p.id=target AND (s.archived_at IS NOT NULL OR NOT s.selling_enabled))
$$;

COMMIT;
