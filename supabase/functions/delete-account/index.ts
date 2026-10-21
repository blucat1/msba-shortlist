import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2.118.0/cors';
import { createDeleteAccountHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
// Hosted functions may expose named secret keys as SUPABASE_SECRET_KEYS JSON.
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}') as Record<string, string>;
const serverKey = Deno.env.get('SUPABASE_SECRET_KEY') || secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serverKey) throw new Error('Server-side Supabase credentials are missing.');
const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(origin => origin.trim()).filter(Boolean);
Deno.serve(createDeleteAccountHandler({
  allowedOrigins, allowedHeaders: corsHeaders['Access-Control-Allow-Headers'],
  async verifyAccessToken(token) {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  async deleteAuthUser(id) {
    const { error } = await admin.auth.admin.deleteUser(id, false);
    return !error;
  },
}));
