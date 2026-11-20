export const dynamic = 'force-dynamic';

/** Public reachability check; intentionally independent of sessions and databases. */
export function GET() {
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store', 'X-Mushroom-Connection': 'ok' },
  });
}
