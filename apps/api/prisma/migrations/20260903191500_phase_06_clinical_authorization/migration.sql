CREATE TYPE "clinical_permission" AS ENUM (
  'CLINICAL_RECORD_VIEW',
  'CLINICAL_RECORD_EDIT',
  'CLINICAL_RECORD_SIGN',
  'CLINICAL_RECORD_AMEND'
);

CREATE TABLE "clinical_role_permissions" (
  "role_id" UUID NOT NULL,
  "permission" "clinical_permission" NOT NULL,

  CONSTRAINT "clinical_role_permissions_pkey" PRIMARY KEY ("role_id", "permission"),
  CONSTRAINT "clinical_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "clinical_role_permissions_permission_idx" ON "clinical_role_permissions"("permission");

CREATE TABLE "clinical_clinic_accesses" (
  "user_id" UUID NOT NULL,
  "clinic_id" UUID NOT NULL,
  "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "clinical_clinic_accesses_pkey" PRIMARY KEY ("user_id", "clinic_id"),
  CONSTRAINT "clinical_clinic_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_clinic_accesses_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "clinical_clinic_accesses_clinic_user_idx" ON "clinical_clinic_accesses"("clinic_id", "user_id");
