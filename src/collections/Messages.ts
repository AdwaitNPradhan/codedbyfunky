import type { CollectionConfig } from 'payload'
import { adminOnly, loggedIn, nobody } from '../access'

/** Contact form submissions. Written only by the server action (overrideAccess); never public. */
export const Messages: CollectionConfig = {
  slug: 'messages',
  admin: {
    useAsTitle: 'email',
    group: 'Inbox',
    defaultColumns: ['name', 'email', 'topic', 'status', 'createdAt'],
  },
  access: { read: loggedIn, create: nobody, update: loggedIn, delete: adminOnly },
  defaultSort: '-createdAt',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'topic', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: ['new', 'read', 'replied', 'spam'].map((v) => ({ label: v, value: v })),
      admin: { position: 'sidebar' },
    },
    { name: 'emailed', type: 'checkbox', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'source',
      type: 'text',
      admin: { position: 'sidebar', readOnly: true, description: 'Which page variant' },
    },
    { name: 'ipHash', type: 'text', admin: { position: 'sidebar', readOnly: true } },
  ],
}
