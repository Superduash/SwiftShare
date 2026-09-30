import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
spawnSync('node', [path.join(__dirname, 'generate-seo.mjs'), '--postbuild'], { stdio: 'inherit' });