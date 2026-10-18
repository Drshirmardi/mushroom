BEGIN;
-- The new exact native content hash reads these two existing FK relations on each preparation/issue.
CREATE INDEX exercise_plans_native_content_idx ON exercise_plans(treatment_plan_id,id);
CREATE INDEX nutrition_plans_native_content_idx ON nutrition_plans(treatment_plan_id,id);
COMMIT;
