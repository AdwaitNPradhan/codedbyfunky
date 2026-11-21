import type { CollectionConfig } from 'payload'
import { adminOnly, loggedIn, nobody } from '../access'
import { contentHooks } from '../hooks/revalidate'

export const GUEST_STICKERS = [
  'star',
  'heart',
  'smile',
  'fire',
  'rocket',
  'coffee',
  'camera',
  'bug',
] as const

/**
 * Visitor entries. Only the `signGuestbook` server action creates them (overrideAccess).
 * Public reads see approved entries only, and never the ipHash.
 */
export const Guestbook: CollectionConfig = {
  slug: 'guestbook',
  admin: {
    group: 'Inbox',
    useAsTitle: 'name',
    defaultColumns: ['name', 'message', 'approved', 'createdAt'],
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => (req.user ? true : { approved: { equals: true } }),
    create: nobody,
    update: loggedIn,
    delete: adminOnly,
  },
  hooks: contentHooks,
  fields: [
    { name: 'name', type: 'text', required: true, minLength: 2, maxLength: 40 },
    { name: 'message', type: 'textarea', required: true, minLength: 2, maxLength: 280 },
    {
      name: 'sticker',
      type: 'select',
      defaultValue: 'star',
      options: GUEST_STICKERS.map((v) => ({ label: v, value: v })),
    },
    {
      name: 'approved',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Tick to show this entry on the site.' },
    },
    {
      name: 'ipHash',
      type: 'text',
      access: { read: ({ req }) => Boolean(req.user) },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
