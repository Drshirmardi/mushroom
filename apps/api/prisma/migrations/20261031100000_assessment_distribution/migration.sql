BEGIN;
CREATE TABLE assessment_distribution_settings (
 assessment_version_id uuid PRIMARY KEY REFERENCES assessment_versions(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 publicly_available boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE FUNCTION assessment_publicly_available(source_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE((SELECT publicly_available FROM assessment_distribution_settings WHERE assessment_version_id=source_id),true)
$$;
COMMIT;
