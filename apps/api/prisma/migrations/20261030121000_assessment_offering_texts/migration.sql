ALTER TABLE assessment_offering_versions ADD COLUMN authoring_texts JSONB;
ALTER TABLE assessment_offering_versions ADD CONSTRAINT assessment_offering_texts_check CHECK (authoring_texts IS NULL OR (jsonb_typeof(authoring_texts) = 'object' AND octet_length(authoring_texts::text) <= 262144));
