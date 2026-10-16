-- Financial outcomes cannot be erased through a direct database writer either.
CREATE TRIGGER billing_intent_no_delete BEFORE DELETE ON billing_intents FOR EACH ROW EXECUTE FUNCTION wallet_history_immutable();
CREATE TRIGGER billing_attempt_no_delete BEFORE DELETE ON billing_gateway_attempts FOR EACH ROW EXECUTE FUNCTION wallet_history_immutable();
CREATE TRIGGER billing_refund_no_delete BEFORE DELETE ON billing_refunds FOR EACH ROW EXECUTE FUNCTION wallet_history_immutable();
