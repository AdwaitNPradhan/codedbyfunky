/**
 * npm run seed            → seed demo content if the DB has none
 * npm run seed -- --fresh → wipe content + media, then seed again
 * npm run seed -- --wipe  → wipe content, media and *.test users (keeps the admin). Use before real data.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import { getPayload } from 'payload'
import config from '../payload.config'
import { ensureTestEditor, seed, wipe } from './seed'

const args = new Set(process.argv.slice(2))
const payload = await getPayload({ config })

if (args.has('--wipe')) {
  await wipe(payload, { includeTestUsers: true })
  console.log('Wiped demo content and test users.')
  process.exit(0)
}

if (args.has('--fresh')) await wipe(payload)
const { totalDocs } = await payload.count({ collection: 'projects', overrideAccess: true })
if (totalDocs === 0) await seed(payload, console.log)
else console.log('Content exists — skipped (use --fresh to reseed).')

// Test editor account; credentials go to a gitignored file, never to stdout.
const email = 'editor@codedbyfunky.test'
const password = crypto.randomBytes(12).toString('base64url')
if (await ensureTestEditor(payload, email, password)) {
  fs.mkdirSync('docs/private', { recursive: true })
  fs.writeFileSync(
    'docs/private/test-accounts.md',
    `# Test accounts (local, gitignored)\n\n- Admin: ADMIN_EMAIL / ADMIN_PASSWORD in .env\n- Editor: ${email} / ${password}\n\nWipe with: npm run seed -- --wipe\n`,
    { mode: 0o600 },
  )
  console.log('Created test editor; credentials in docs/private/test-accounts.md')
}
process.exit(0)
