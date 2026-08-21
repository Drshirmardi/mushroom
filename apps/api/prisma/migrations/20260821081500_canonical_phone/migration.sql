-- Normalize digit systems and supported Iranian mobile formats before enforcing
-- the canonical +989XXXXXXXXX representation.
BEGIN;

WITH normalized AS (
    SELECT
        "id",
        regexp_replace(
            translate(
                btrim("phone"),
                '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',
                '01234567890123456789'
            ),
            '[[:space:]()-]',
            '',
            'g'
        ) AS "compact_phone"
    FROM "users"
)
UPDATE "users" AS "user"
SET "phone" = CASE
    WHEN normalized."compact_phone" ~ '^09[0-9]{9}$'
        THEN '+98' || substring(normalized."compact_phone" FROM 2)
    WHEN normalized."compact_phone" ~ '^9[0-9]{9}$'
        THEN '+98' || normalized."compact_phone"
    WHEN normalized."compact_phone" ~ '^989[0-9]{9}$'
        THEN '+' || normalized."compact_phone"
    WHEN normalized."compact_phone" ~ '^00989[0-9]{9}$'
        THEN '+' || substring(normalized."compact_phone" FROM 3)
    ELSE normalized."compact_phone"
END
FROM normalized
WHERE "user"."id" = normalized."id";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "users"
        WHERE "phone" !~ '^\+989[0-9]{9}$'
    ) THEN
        RAISE EXCEPTION 'Cannot enforce canonical Iranian mobile format: invalid existing users.phone value';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "users"
        GROUP BY "phone"
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce users.phone uniqueness: canonicalization produced duplicates';
    END IF;
END
$$;

DROP INDEX "users_phone_idx";

ALTER TABLE "users"
    ALTER COLUMN "phone" TYPE VARCHAR(13),
    ADD CONSTRAINT "users_phone_format_check"
        CHECK ("phone" ~ '^\+989[0-9]{9}$');

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

COMMIT;
