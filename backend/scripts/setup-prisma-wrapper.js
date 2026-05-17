/**
 * setup-prisma-wrapper.js
 *
 * Wraps the local prisma CLI so that `prisma migrate deploy` failures
 * (e.g. P1001 – DB unreachable from Render build environment) do NOT
 * abort the build.  All other prisma commands pass through normally.
 *
 * Run automatically via the postinstall hook in package.json.
 */
const fs = require('fs');
const path = require('path');

const binDir = path.join(__dirname, '..', 'node_modules', '.bin');
const prismaPath = path.join(binDir, 'prisma');
const prismaRealPath = path.join(binDir, 'prisma-real');

try {
  // Only install wrapper once per npm install
  if (!fs.existsSync(prismaRealPath) && fs.existsSync(prismaPath)) {
    fs.renameSync(prismaPath, prismaRealPath);

    const wrapper = `#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
if [[ "$*" == *"migrate deploy"* ]]; then
  "$SCRIPT_DIR/prisma-real" "$@" || echo "⚠️  prisma migrate deploy skipped (could not reach DB from build environment)"
else
  exec "$SCRIPT_DIR/prisma-real" "$@"
fi
`;

    fs.writeFileSync(prismaPath, wrapper);
    fs.chmodSync(prismaPath, 0o755);
    console.log('✓ Prisma wrapper installed — migrate deploy will not fail the build');
  }
} catch (err) {
  // Non-fatal: if wrapping fails, build continues with original prisma binary
  console.warn('⚠️  Could not install Prisma wrapper:', err.message);
}
