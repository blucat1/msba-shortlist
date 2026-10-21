import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadRegistry } from '../src/ingestion/registry';

const runtime = Number(process.versions.node.split('.')[0]) === 24;
const sources = await loadRegistry();
const commandExists = (cmd: string) => spawnSync(cmd, ['--version'], { encoding: 'utf8', timeout: 5000 }).status === 0;
console.log(`Runtime: ${runtime ? 'Node 24 LTS available' : 'use Node 24 from .nvmrc'}`);
console.log(`Dependencies: ${existsSync('node_modules') ? 'installed' : 'missing; run npm ci'}`);
console.log(`Employer registry: ${sources.length} entries, ${sources.filter(s => s.enabled && s.state === 'verified').length} enabled verified identities. Run npm run sources:verify to check current payloads.`);
console.log(`Database integration tools: Docker ${commandExists('docker') ? 'available' : 'not found'}, Supabase CLI ${commandExists('supabase') ? 'available' : 'not found'}.`);
console.log('Offline demo: npm run dev → /demo. Tests: npm run test:unit and npm run test:e2e. Live auth requires owner Supabase/Google setup.');
console.log('Source health in the app comes from actual completed imports, not this static registry or demo fixtures.');
if (!runtime || !existsSync('node_modules')) process.exitCode = 1;
