import { existsSync, readFileSync } from 'node:fs';
import { readSupabaseConfiguration } from '../src/lib/supabase';

// Read only local env files. Never print values, tokens, or the parsed environment.
function envFromFile(path: string): Record<string, string> { if (!existsSync(path)) return {}; return Object.fromEntries(readFileSync(path, 'utf8').split('\n').filter(l => /^[A-Z][A-Z0-9_]*=/.test(l.trim())).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; })); }
const environment = { ...envFromFile('.env'), ...envFromFile('.env.local'), ...process.env };
const secretsInBrowser = Object.keys(environment).filter(k => k.startsWith('VITE_') && /SECRET|SERVICE_ROLE|PRIVATE_KEY/i.test(k));
console.log(`Node ${process.versions.node}; tested runtime family: Node 24 LTS.`);
const major = Number(process.versions.node.split('.')[0]); if (major !== 24) { console.error('Use Node 24 from .nvmrc before running builds.'); process.exitCode = 1; }
if (secretsInBrowser.length) { console.error(`Unsafe browser environment names: ${secretsInBrowser.join(', ')}. Remove privileged keys from every VITE_ variable.`); process.exitCode = 1; }
try { readSupabaseConfiguration(environment); console.log('Browser Supabase configuration: present and structurally valid. Network, OAuth and RLS still require deployment checks.'); }
catch { console.log('Live browser configuration: incomplete or invalid. Credential-free /demo remains available; live routes must show a configuration error.'); }
console.log(`Server ingestion credentials: ${environment.SUPABASE_URL && environment.SUPABASE_SECRET_KEY ? 'present (not exposed)' : 'not configured; dry-run requires none'}.`);
console.log(`Owner contact: ${environment.VITE_OWNER_CONTACT && !environment.VITE_OWNER_CONTACT.includes('example') ? 'configured; owner must confirm it is monitored' : 'requires owner completion before public launch'}.`);
console.log('No service accounts, OAuth clients, deployments, or database privileges were created by this check.');
