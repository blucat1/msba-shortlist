# Repository instructions

- Read the supplied master brief before changing scope. Preserve exactly three primary routes: Opportunities, My Search, Insights.
- Use Node from `.nvmrc`, npm and the committed lockfile. Keep strict TypeScript; run lint, typecheck, relevant tests and build after changes.
- Shared types and pure logic live in `src/domain`; demo and production implement `src/repositories/types.ts`.
- Demo is explicitly fictional, browser-local and isolated. Never substitute fixtures in live mode or import demo into production.
- An application click is not a submission. Preserve date uncertainty, historical stage events, and private snapshots.
- Never weaken RLS, child ownership FKs, caller checks or secret separation to fix a UI failure. New exposed tables require explicit RLS/grants and authorization tests.
- Feed content is untrusted data. Use only approved public endpoints, schema validation and complete snapshots. Failed/partial/quarantined imports cannot close listings. Preserve original timestamps and first discovery.
- No privileged key in a VITE variable, Git, output, screenshots, frontend request or export. Do not log personal notes or tokens.
- Keep observed results in `docs/TEST_REPORT.md`; distinguish PostgreSQL smoke tests from actual Supabase/OAuth/cloud acceptance. Do not invent deployment or verification.
- No paid services, LLM APIs, arbitrary-URL scraping, application autofill, messaging integrations or feature expansion without a user request.
