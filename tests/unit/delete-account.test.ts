import { describe, expect, it, vi } from 'vitest';
import { createDeleteAccountHandler } from '../../supabase/functions/delete-account/handler';

const origin = 'https://pilot.example.invalid';
function setup(valid = true, deleteSucceeds = true) {
  const verifyAccessToken = vi.fn(async () => valid ? { id: 'verified-user-a' } : null);
  const deleteAuthUser = vi.fn(async () => deleteSucceeds);
  return { handler: createDeleteAccountHandler({ allowedOrigins: [origin], verifyAccessToken, deleteAuthUser }), verifyAccessToken, deleteAuthUser };
}
function request(body: unknown = { confirmation: 'DELETE MY ACCOUNT' }, token = 'user.jwt.signature', source = origin) {
  return new Request('https://project.example.invalid/functions/v1/delete-account', { method: 'POST',
    headers: { origin: source, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
}
describe('account deletion authorization boundary', () => {
  it('derives the deletion target only from a verified session', async () => {
    const { handler, verifyAccessToken, deleteAuthUser } = setup();
    const response = await handler(request());
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ deleted: true });
    expect(verifyAccessToken).toHaveBeenCalledWith('user.jwt.signature'); expect(deleteAuthUser).toHaveBeenCalledExactlyOnceWith('verified-user-a');
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
  });
  it('rejects a client-nominated target even with an authenticated caller', async () => {
    const { handler, deleteAuthUser } = setup();
    expect((await handler(request({ confirmation: 'DELETE MY ACCOUNT', userId: 'other-user-b' }))).status).toBe(400);
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });
  it('rejects missing, forged, and expired sessions without deleting anything', async () => {
    const { handler, deleteAuthUser } = setup(false);
    expect((await handler(request({}, ''))).status).toBe(401);
    expect((await handler(request())).status).toBe(401);
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });
  it('rejects disallowed origins and supports safe preflights', async () => {
    const { handler, verifyAccessToken, deleteAuthUser } = setup();
    expect((await handler(request(undefined, undefined, 'https://evil.example.invalid'))).status).toBe(403);
    const response = await handler(new Request('https://project.example.invalid', { method: 'OPTIONS', headers: { origin } }));
    expect(response.status).toBe(204); expect(verifyAccessToken).not.toHaveBeenCalled(); expect(deleteAuthUser).not.toHaveBeenCalled();
  });
  it('requires an exact explicit confirmation and reports a failed deletion honestly', async () => {
    const { handler, deleteAuthUser } = setup(true, false);
    expect((await handler(request({ confirmation: 'yes' }))).status).toBe(400); expect(deleteAuthUser).not.toHaveBeenCalled();
    expect((await handler(request())).status).toBe(502);
  });
});
