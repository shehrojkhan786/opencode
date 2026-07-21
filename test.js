import assert from 'node:assert';
import { execSync } from 'node:child_process';

assert.doesNotThrow(() => execSync('node index.js help', { stdio: 'inherit' }));
console.log('CLI help command works on this platform.');
