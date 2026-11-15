import { createHash } from 'node:crypto';

// A deployed offline worker must change whenever any required app-shell file
// changes. The version is content-based, not tied to a manual cache bump.
export function offlineCacheVersion(entries) {
  const hash = createHash('sha256');
  for (const [name, contents] of [...entries].sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(name);
    hash.update('\0');
    hash.update(contents);
    hash.update('\0');
  }
  return `burmese-study-offline-v${hash.digest('hex').slice(0, 12)}`;
}
