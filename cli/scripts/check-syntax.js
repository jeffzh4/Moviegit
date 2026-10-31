/** Check every shipped JavaScript file before publishing the CLI. */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));

function checkDirectory(directory) {
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(relative);
    } else if (entry.name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', join(root, relative)], { stdio: 'inherit' });
      if (result.error) throw result.error;
      if (result.status !== 0) process.exit(result.status || 1);
      console.log(`OK: ${relative}`);
    }
  }
}

for (const directory of ['bin', 'src', 'scripts']) checkDirectory(directory);
