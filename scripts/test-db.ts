import { spawnSync } from 'node:child_process';

const docker = spawnSync('docker', ['info'], { encoding: 'utf8', stdio: 'pipe', timeout: 10000 });
if (docker.status !== 0) {
  console.error('Database authorization tests NOT EXECUTED: Docker is not installed/running. Install Docker Desktop, start it, then run: npx supabase start && npm run test:db');
  process.exit(1);
}
const binary = process.env.SUPABASE_CLI || 'supabase';
const cli = spawnSync(binary, ['--version'], { encoding: 'utf8', stdio: 'pipe', timeout: 10000 });
const command = cli.status === 0 ? binary : 'npx';
const args = cli.status === 0 ? ['test', 'db'] : ['--yes', 'supabase', 'test', 'db'];
const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
if (result.error) console.error(`Database authorization tests NOT EXECUTED: ${result.error.message}. Run npx supabase start, then npx supabase test db.`);
process.exit(result.status ?? 1);
