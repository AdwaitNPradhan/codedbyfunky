import type { GlobalConfig } from 'payload'
import { anyone, loggedIn } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Site settings',
  admin: { group: 'Content' },
  access: { read: anyone, update: loggedIn },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identity',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'handle', type: 'text', required: true },
              ],
            },
            {
              name: 'tagline',
              type: 'text',
              required: true,
              admin: { description: 'One line above the fold' },
            },
            {
              name: 'roles',
              type: 'text',
              hasMany: true,
              admin: { description: 'Rotating titles: Engineer, Photographer…' },
            },
            { name: 'shortBio', type: 'textarea', required: true, maxLength: 320 },
            { name: 'longBio', type: 'textarea' },
            {
              type: 'row',
              fields: [
                { name: 'location', type: 'text' },
                { name: 'timezone', type: 'text' },
              ],
            },
            { name: 'avatar', type: 'upload', relationTo: 'media' },
            { name: 'resume', type: 'upload', relationTo: 'media', admin: { description: 'PDF' } },
            {
              name: 'availability',
              type: 'group',
              fields: [
                {
                  name: 'status',
                  type: 'select',
                  defaultValue: 'open',
                  options: [
                    { label: 'Open to work', value: 'open' },
                    { label: 'Selective', value: 'selective' },
                    { label: 'Not available', value: 'closed' },
                  ],
                },
                { name: 'note', type: 'text' },
              ],
            },
            {
              name: 'stats',
              type: 'array',
              fields: [
                { name: 'value', type: 'text', required: true },
                { name: 'label', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          label: 'Links',
          fields: [
            {
              name: 'publicEmail',
              type: 'email',
              admin: {
                description: 'Shown on the site (optional). Form mail goes to CONTACT_TO env.',
              },
            },
            {
              name: 'socials',
              type: 'array',
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: [
                    'github',
                    'linkedin',
                    'instagram',
                    'x',
                    'youtube',
                    'dribbble',
                    'email',
                    'other',
                  ].map((v) => ({ label: v, value: v })),
                },
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
            },
            {
              name: 'instagram',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'handle', type: 'text' },
                    { name: 'url', type: 'text' },
                    { name: 'followers', type: 'text' },
                  ],
                },
                {
                  name: 'pitch',
                  type: 'textarea',
                  admin: { description: 'Why follow — shown next to the photo section' },
                },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            { name: 'seoTitle', type: 'text' },
            { name: 'seoDescription', type: 'textarea', maxLength: 180 },
            { name: 'ogImage', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
  ],
}
