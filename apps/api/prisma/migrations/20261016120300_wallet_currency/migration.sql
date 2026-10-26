ALTER TABLE wallet_accounts ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'IRR';
ALTER TABLE billing_intents ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'IRR';
ALTER TABLE wallet_accounts ADD CONSTRAINT wallet_currency_irr CHECK (currency = 'IRR');
ALTER TABLE billing_intents ADD CONSTRAINT billing_currency_irr CHECK (currency = 'IRR');
