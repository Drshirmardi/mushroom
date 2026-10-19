CREATE UNIQUE INDEX commerce_products_id_clinic_key ON commerce_products(id,clinic_id);
CREATE TABLE commerce_mezaj_collections (
  id uuid PRIMARY KEY, clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  primary_mezaj varchar(16) NOT NULL CHECK (primary_mezaj IN ('damavi','safravi','balgami','sodavi')),
  secondary_mezaj varchar(16) NOT NULL CHECK (secondary_mezaj IN ('damavi','safravi','balgami','sodavi')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0), enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz(3) NOT NULL,
  CONSTRAINT commerce_mezaj_collections_pair_key UNIQUE(clinic_id,primary_mezaj,secondary_mezaj),
  CONSTRAINT commerce_mezaj_collections_id_clinic_key UNIQUE(id,clinic_id)
);
CREATE TABLE commerce_mezaj_collection_items (
  collection_id uuid NOT NULL, clinic_id uuid NOT NULL, product_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 0 AND position < 20),
  PRIMARY KEY(collection_id,product_id), UNIQUE(collection_id,position),
  FOREIGN KEY(collection_id,clinic_id) REFERENCES commerce_mezaj_collections(id,clinic_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY(product_id,clinic_id) REFERENCES commerce_products(id,clinic_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX commerce_mezaj_collection_items_product_id_clinic_id_idx ON commerce_mezaj_collection_items(product_id,clinic_id);
CREATE TABLE commerce_mezaj_collection_sources (
  collection_id uuid NOT NULL, clinic_id uuid NOT NULL, assessment_version_id uuid NOT NULL,
  result_band_id varchar(100) NOT NULL CHECK(length(result_band_id)>0),
  source_content_hash varchar(64) NOT NULL CHECK(source_content_hash ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY(assessment_version_id,result_band_id),
  FOREIGN KEY(collection_id,clinic_id) REFERENCES commerce_mezaj_collections(id,clinic_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT commerce_mezaj_collection_sources_assessment_version_id_cl_fkey FOREIGN KEY(assessment_version_id,clinic_id) REFERENCES assessment_versions(id,clinic_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX commerce_mezaj_collection_sources_collection_id_clinic_id_idx ON commerce_mezaj_collection_sources(collection_id,clinic_id);
