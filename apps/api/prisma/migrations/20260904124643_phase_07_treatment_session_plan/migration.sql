-- CreateTable
CREATE TABLE "treatment_session_plans" (
    "id" UUID NOT NULL,
    "treatment_plan_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "instructions" TEXT,
    "patient_instructions" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "treatment_session_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "treatment_session_plans_plan_position_key" ON "treatment_session_plans"("treatment_plan_id", "position");

-- AddForeignKey
ALTER TABLE "treatment_session_plans" ADD CONSTRAINT "treatment_session_plans_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
