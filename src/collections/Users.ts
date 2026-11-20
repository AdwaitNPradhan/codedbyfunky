import type { CollectionConfig } from 'payload'
import { adminOnly, adminOnlyField, adminOrSelf, hasRole } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email', group: 'System' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 60 * 60 * 8,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  access: {
    // Anonymous users can never list, read or create accounts.
    read: adminOrSelf,
    create: adminOnly,
    update: ({ req, id }) => hasRole(req.user, 'admin') || (req.user ? req.user.id === id : false),
    delete: adminOnly,
    admin: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['editor'],
      required: true,
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: { create: adminOnlyField, update: adminOnlyField },
    },
  ],
}
