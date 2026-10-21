import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
const args = process.argv.slice(2); const dryRun = args.includes('--dry-run');
const retentionDays = 90;
if (dryRun) console.log('Dry-run: retention policy prunes source-run diagnostics older than 90 days and unreferenced closed-job details older than 90 days. Private tracker snapshots/history are preserved. No database contacted.');
else {
  const env = z.object({ SUPABASE_URL: z.string().url(), SUPABASE_SECRET_KEY: z.string().min(20) }).parse(process.env);
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc('run_catalog_maintenance', { p_retention_days: retentionDays });
  if (error) throw new Error(`Maintenance failed (${error.code}); check server credentials and migrations.`);
  console.log('Server maintenance complete:', JSON.stringify(data));
}
