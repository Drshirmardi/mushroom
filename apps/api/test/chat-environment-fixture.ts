// Synthetic configuration for schema-validation tests. No live engine or key.
export const chatTestEnvironment = {
  EJABBERD_DOMAIN: 'chat.example.invalid',
  EJABBERD_WEBSOCKET_URL: 'wss://chat.example.invalid/xmpp-websocket',
  EJABBERD_API_URL: 'http://127.0.0.1:9/api/v2',
  EJABBERD_POLICY_SECRET: 'synthetic-chat-policy-secret-'.repeat(3),
  EJABBERD_JWT_PRIVATE_KEY_FILE: '/synthetic-test-only/private.pem',
};
