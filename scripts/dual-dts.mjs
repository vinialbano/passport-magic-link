import { readdirSync, copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// TS 6 under node16/nodenext resolution infers the module format from the
// declaration file extension. For CJS consumers we need a .d.cts sibling
// next to each .d.ts so that types resolve under the `require` condition.
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (path.endsWith('.d.ts')) {
      copyFileSync(path, path.slice(0, -'.d.ts'.length) + '.d.cts')
    } else if (path.endsWith('.d.ts.map')) {
      copyFileSync(path, path.slice(0, -'.d.ts.map'.length) + '.d.cts.map')
    }
  }
}

walk('lib')
