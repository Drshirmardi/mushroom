// Browser request outcomes describe UX, never financial or medical completion.
const operations: ReadonlyArray<readonly [string, RegExp, string]> = [
  ['POST', /^\/v1\/auth\/login$/, 'login'],
  ['POST', /^\/v1\/auth\/register$/, 'register'],
  ['POST', /^\/v1\/patients\/me\/entry\/profile$/, 'profile_save'],
  ['POST', /^\/v1\/patients\/me\/entry\/(?:start|resume)$/, 'entry_start'],
  ['POST', /^\/v1\/patients\/me\/entry\/defer$/, 'entry_defer'],
  ['POST', /^\/v1\/patients\/me\/entry\/complete$/, 'entry_finish_request'],
  ['POST', /^\/v1\/patients\/me\/entry\/payment$/, 'billing_start'],
  ['POST', /^\/v1\/patients\/me\/assessment-access-grants\/[^/]+\/submission$/, 'assessment_start'],
  ['POST', /^\/v1\/patients\/me\/marriage-requests$/, 'invitation_create'],
  ['POST', /^\/v1\/patients\/me\/marriage-requests\/[^/]+\/(?:accept|cancel|replace|sms)$/, 'invitation_action'],
  ['POST', /^\/v1\/patients\/me\/(?:educational-couple-assessments|couple-assessments|couple-sessions)$/, 'couple_start'],
  ['POST', /^\/v1\/patients\/me\/(?:educational-couple-assessments|couple-assessments)\/[^/]+\/consent$/, 'sharing_accept'],
  ['POST', /^\/v1\/patients\/me\/assessment-consents$/, 'sharing_accept'],
  ['POST', /^\/v1\/patients\/me\/(?:program-consents|program-access-grants)$/, 'program_access_request'],
  ['POST', /^\/v1\/patients\/me\/commerce\/addresses$/, 'address_create'],
  ['PATCH', /^\/v1\/patients\/me\/commerce\/addresses\/[^/]+$/, 'address_update'],
  ['POST', /^\/v1\/patients\/me\/wallet\/topups$/, 'wallet_topup_request'],
  ['POST', /^\/v1\/patients\/me\/billing\/intents\/[^/]+\/cancel$/, 'payment_cancel'],
  ['GET', /^\/v1\/commerce\/products$/, 'catalog_load'],
  ['GET', /^\/v1\/commerce\/products\/[^/]+$/, 'product_load'],
  ['PUT', /^\/v1\/patients\/me\/cart$/, 'cart_update'],
  ['PUT', /^\/v1\/patients\/me\/wishlist$/, 'wishlist_update'],
  ['POST', /^\/v1\/patients\/me\/orders$/, 'checkout'],
  ['POST', /^\/v1\/patients\/me\/commerce\/discount-preview$/, 'discount_apply'],
  ['POST', /^\/v1\/patients\/me\/orders\/[^/]+\/payment-attempts$/, 'payment_start'],
  ['POST', /^\/v1\/assessments\/[^/]+\/submissions$/, 'assessment_start'],
  ['PUT', /^\/v1\/assessment-submissions\/[^/]+$/, 'assessment_save'],
  ['POST', /^\/v1\/assessment-submissions\/[^/]+\/submit$/, 'assessment_submit'],
  ['POST', /^\/v1\/appointments$/, 'booking_request'],
  ['POST', /^\/v1\/appointments\/[^/]+\/cancel$/, 'booking_cancel'],
  ['POST', /^\/v1\/appointments\/[^/]+\/reschedule$/, 'booking_reschedule'],
  ['POST', /^\/v1\/auth\/otp\/challenges$/, 'otp_request'],
  ['POST', /^\/v1\/auth\/otp\/challenges\/[^/]+\/verify$/, 'otp_verify'],
  ['POST', /^\/v1\/auth\/otp\/challenges\/[^/]+\/resend$/, 'otp_resend'],
  ['POST', /^\/v1\/patients\/me\/billing\/[^/]+-intents$/, 'billing_start'],
  ['POST', /^\/v1\/patients\/me\/billing\/intents\/[^/]+\/(?:wallet-payment|gateway-attempts)$/, 'payment_start'],
];
export function analyticsOperation(method: string, path: string): string | undefined {
  return operations.find(([verb, pattern]) => verb === method.toUpperCase() && pattern.test(path))?.[2];
}
export async function observeOperation(
  operation: string | undefined, run: () => Promise<Response>,
  emit: (event: 'action_attempt' | 'action_result', params: Record<string, unknown>) => void,
): Promise<Response> {
  if (!operation) return run();
  const send = (event: 'action_attempt' | 'action_result', params: Record<string, unknown>) => { try { emit(event, params); } catch { /* Telemetry cannot affect requests. */ } };
  const started = Date.now();
  send('action_attempt', { operation });
  try {
    const response = await run();
    send('action_result', { operation, outcome: response.ok ? 'accepted' : response.status >= 500 ? 'unavailable' : 'rejected', status_code: response.status, duration_ms: Date.now() - started });
    return response;
  } catch (error) {
    send('action_result', { operation, outcome: 'network_error', status_code: 0, duration_ms: Date.now() - started });
    throw error;
  }
}
