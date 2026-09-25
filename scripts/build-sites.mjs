import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

execFileSync('npm', ['exec', 'vite', 'build', '--', '--outDir', 'dist/client'], { stdio: 'inherit' });
mkdirSync('dist/server', { recursive: true });
execFileSync('npm', ['exec', 'esbuild', 'sites-worker.ts', '--', '--bundle', '--platform=browser', '--format=esm', '--target=es2022', '--outfile=dist/server/index.js'], { stdio: 'inherit' });
