ALTER TABLE payment_provider_config_revisions
  ADD COLUMN idempotency_key VARCHAR(240);

CREATE UNIQUE INDEX payment_provider_config_revisions_config_idempotency_key
  ON payment_provider_config_revisions (config_id, idempotency_key);
