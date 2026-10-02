import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

function launch(label, cwd, args) {
  const child = spawn(npm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  children.push(child);
  child.on('error', (error) => console.error(`${label} failed to start: ${error.message}`));
  child.on('exit', (code) => {
    if (code && !stopping) console.error(`${label} exited with code ${code}.`);
  });
  return child;
}

let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n${signal} received. Stopping Unfazed…`);
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 600);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('Starting Unfazed API on http://localhost:5000');
launch('API', path.join(projectRoot, 'unfazed-backend'), ['run', 'dev']);
console.log('Starting Unfazed website on http://localhost:5173');
launch('Website', path.join(projectRoot, 'unfazed-frontend'), ['run', 'dev', '--', '--host', '0.0.0.0']);
