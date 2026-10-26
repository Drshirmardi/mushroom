-- Add profile gender to user_profiles (like firstName/lastName: optional at rest, required by clients).
ALTER TABLE "user_profiles" ADD COLUMN "gender" VARCHAR(20);
