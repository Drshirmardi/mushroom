-- Optional merchandising only; existing paid definitions, receipts and grants are unchanged.
ALTER TABLE program_definition_versions ADD CONSTRAINT program_definitions_id_clinic_key UNIQUE(id,clinic_id);
CREATE TABLE program_mezaj_presentations (
  program_definition_id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  icon varchar(20) NOT NULL,
  pairs text[] NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1,
  CONSTRAINT program_mezaj_definition_clinic_key UNIQUE(program_definition_id,clinic_id),
  CONSTRAINT program_mezaj_definition_fkey FOREIGN KEY(program_definition_id,clinic_id) REFERENCES program_definition_versions(id,clinic_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT program_mezaj_revision_check CHECK(revision>0),
  CONSTRAINT program_mezaj_icon_check CHECK(icon IN ('book','compass','leaf','sparkles','heart')),
  CONSTRAINT program_mezaj_pairs_check CHECK(cardinality(pairs)<=16 AND array_position(pairs,NULL) IS NULL AND pairs <@ ARRAY['damavi/damavi','damavi/safravi','damavi/balgami','damavi/sodavi','safravi/damavi','safravi/safravi','safravi/balgami','safravi/sodavi','balgami/damavi','balgami/safravi','balgami/balgami','balgami/sodavi','sodavi/damavi','sodavi/safravi','sodavi/balgami','sodavi/sodavi']::text[]),
  CONSTRAINT program_mezaj_enabled_check CHECK(NOT enabled OR cardinality(pairs)>0)
);
CREATE INDEX program_mezaj_clinic_enabled_idx ON program_mezaj_presentations(clinic_id,enabled);
