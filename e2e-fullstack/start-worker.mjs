// Starts the real Worker for the full-stack e2e run: a fresh local D1 database with every
// migration applied, then `wrangler dev` with e2e-fullstack/worker.env (never .dev.vars).
// Expects a fresh `npm run build` in dist/.
import { spawn, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const state = fileURLToPath(new URL('../.wrangler/e2e-fullstack', import.meta.url));
const envFile = fileURLToPath(new URL('./worker.env', import.meta.url));
const port = process.env.WORKER_PORT || '8788';
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' };

rmSync(state, { recursive: true, force: true });
const migrate = spawnSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'pulsar', '--local', '--persist-to', state], {
  cwd: root,
  env,
  stdio: 'inherit',
});
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const dev = spawn(
  'npx',
  ['wrangler', 'dev', '--port', port, '--ip', '127.0.0.1', '--persist-to', state, '--env-file', envFile, '--show-interactive-dev-session=false', '--infer-origin-from-routes=false'],
  { cwd: root, env, stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => dev.kill(signal));
dev.on('exit', (code) => process.exit(code ?? 0));
