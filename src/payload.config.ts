import { mongooseAdapter } from '@payloadcms/db-mongodb'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Messages } from './collections/Messages'
import { Experience, Games, Hardware, Photos, Projects, Skills } from './collections/content'
import { Site } from './globals/Site'
import { seed } from './seed/seed'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const serverURL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const building = process.env.NEXT_PHASE === 'phase-production-build'
if (!building && (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET.length < 32)) {
  throw new Error('PAYLOAD_SECRET missing or shorter than 32 chars')
}

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' · codedbyfunky CMS' },
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Projects, Photos, Games, Hardware, Skills, Experience, Media, Messages, Users],
  globals: [Site],
  secret: process.env.PAYLOAD_SECRET || '',
  // Only our own origin may make credentialed calls.
  cors: [serverURL],
  csrf: [serverURL],
  graphQL: { disable: true },
  telemetry: false,
  upload: { limits: { fileSize: 25_000_000 } },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: mongooseAdapter({ url: process.env.DATABASE_URL || '' }),
  sharp,
  plugins: [],
  // Close the "create first user" window: if the DB has no users, create the admin from env.
  onInit: async (payload) => {
    const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    if (totalDocs === 0 && email && password) {
      await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: { email, password, name: 'Admin', roles: ['admin'] },
      })
      payload.logger.info('Created initial admin user from ADMIN_EMAIL')
    }
    // Demo content for a fresh deploy. Turn SEED_DEMO off once real content is in.
    if (process.env.SEED_DEMO === 'true') {
      const projects = await payload.count({ collection: 'projects', overrideAccess: true })
      if (projects.totalDocs === 0) await seed(payload)
    }
  },
})
