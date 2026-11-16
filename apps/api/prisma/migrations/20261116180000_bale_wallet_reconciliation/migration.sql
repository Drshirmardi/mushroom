ALTER TABLE billing_gateway_attempts ADD COLUMN bale_last_inquired_at TIMESTAMPTZ(3);

CREATE TABLE bale_precheckout_decisions (
    transaction_id VARCHAR(128) PRIMARY KEY,
    fingerprint CHAR(64) NOT NULL,
    approved BOOLEAN NOT NULL
);
