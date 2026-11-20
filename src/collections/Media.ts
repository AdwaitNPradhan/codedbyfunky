import type { CollectionConfig } from 'payload'
import { adminOnly, anyone, loggedIn } from '../access'
import { contentHooks } from '../hooks/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Content' },
  access: { read: anyone, create: loggedIn, update: loggedIn, delete: adminOnly },
  hooks: contentHooks,
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'caption', type: 'text' },
    { name: 'blurDataURL', type: 'text', admin: { hidden: true } },
  ],
  upload: {
    mimeTypes: ['image/*', 'video/mp4', 'video/webm', 'application/pdf'],
    focalPoint: true,
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      { name: 'thumb', width: 480, formatOptions: { format: 'webp', options: { quality: 75 } } },
      { name: 'card', width: 960, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'hero', width: 1920, formatOptions: { format: 'webp', options: { quality: 82 } } },
    ],
  },
}
