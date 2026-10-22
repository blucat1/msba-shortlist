/** Filesystem-only test setup. NEVER run config push with this working copy.
 * The committed/hosted product remains Google-only. No network calls here.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(repositoryRoot, 'supabase/config.toml');
const backupPath = path.join(repositoryRoot, '.tools/integration-auth-config.backup.json');
const hash = text => createHash('sha256').update(text).digest('hex');
if (process.argv.slice(2).some(arg => !['--restore', '--local-disposable'].includes(arg))) throw new Error('Use --local-disposable and/or --restore only.');
const allowed = process.env.CI === 'true' || process.argv.includes('--local-disposable');
if (!allowed) throw new Error('Use only the CI workspace or explicitly request --local-disposable for a disposable local stack. Never config push this test setup.');
if (process.argv.includes('--restore')) {
  if (existsSync(backupPath)) {
    const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
    if (hash(readFileSync(configPath, 'utf8')) !== backup.preparedHash) throw new Error('Config changed after local test preparation; inspect before restoring.');
    writeFileSync(configPath, backup.original); rmSync(backupPath);
    console.log('Restored the original product Auth configuration working copy.');
  }
} else {
  if (existsSync(backupPath)) throw new Error('An integration config backup already exists; restore it before preparing again.');
  const original = readFileSync(configPath, 'utf8');
  const setSignup = (input, section, enabled) => {
    let matched = false, currentSection = '';
    const output = input.split('\n').map(line => {
      const header = line.match(/^\[([^\]]+)\]\s*$/);
      if (header) currentSection = header[1];
      if (currentSection !== section || !/^enable_signup\s*=\s*(?:true|false)\s*$/.test(line)) return line;
      matched = true; return `enable_signup = ${enabled}`;
    }).join('\n');
    if (!matched) throw new Error('Expected local Auth section missing.');
    return output;
  };
  const prepared = setSignup(setSignup(original, 'auth', false), 'auth.email', true);
  mkdirSync(path.dirname(backupPath), { recursive: true });
  writeFileSync(backupPath, JSON.stringify({ original, preparedHash: hash(prepared) }), { mode: 0o600 });
  writeFileSync(configPath, prepared);
  console.log('Prepared disposable LOCAL Auth: password provider on, public signup off. NEVER run config push with this working copy.');
}
