/** Dependency-injected so the authorization boundary is tested without an account. */
export interface DeleteAccountDependencies {
  allowedOrigins: string[];
  allowedHeaders?: string;
  verifyAccessToken(token: string): Promise<{ id: string } | null>;
  deleteAuthUser(id: string): Promise<boolean>;
}
export function createDeleteAccountHandler(dependencies: DeleteAccountDependencies) {
  return async function deleteAccount(request: Request): Promise<Response> {
    const origin = request.headers.get('origin');
    const allowed = origin !== null && dependencies.allowedOrigins.includes(origin);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': dependencies.allowedHeaders || 'authorization, apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage',
    };
    if (allowed) headers['Access-Control-Allow-Origin'] = origin;
    const respond = (status: number, message: Record<string, unknown>) => new Response(JSON.stringify(message), { status, headers });
    if (origin !== null && !allowed) return respond(403, { error: 'Origin is not allowed.' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return respond(405, { error: 'Use POST.' });
    const bearer = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]+)$/i)?.[1];
    if (!bearer) return respond(401, { error: 'A valid signed-in session is required.' });
    // JWT validation is an independent server request to Auth, not a decoded or
    // client-supplied user identifier, even with gateway verify_jwt enabled.
    let user: { id: string } | null;
    try { user = await dependencies.verifyAccessToken(bearer); }
    catch { return respond(401, { error: 'The session could not be verified.' }); }
    if (!user) return respond(401, { error: 'The session is invalid or expired.' });
    if (!request.headers.get('content-type')?.startsWith('application/json')) return respond(415, { error: 'A JSON confirmation is required.' });
    if (Number(request.headers.get('content-length')) > 1024) return respond(413, { error: 'Request is too large.' });
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 1024) return respond(413, { error: 'Request is too large.' });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return respond(400, { error: 'Invalid JSON.' }); }
    if (body === null || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1 || !('confirmation' in body) || body.confirmation !== 'DELETE MY ACCOUNT') {
      return respond(400, { error: 'Provide the account deletion confirmation only. Target user IDs are never accepted.' });
    }
    // Auth deletion cascades every private table via auth.users(id) FKs. No
    // pre-deletion private purge that could leave a partially emptied account.
    try {
      if (!await dependencies.deleteAuthUser(user.id)) return respond(502, { error: 'Deletion was not confirmed. Please retry.' });
    } catch { return respond(502, { error: 'Deletion was not confirmed. Please retry.' }); }
    return respond(200, { deleted: true });
  };
}
