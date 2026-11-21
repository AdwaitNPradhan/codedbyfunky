import type { CollectionConfig, Field } from 'payload'
import { adminOnly, loggedIn, publishedOrLoggedIn } from '../access'
import { contentHooks } from '../hooks/revalidate'
import { GAME_KEYS, GAME_LABELS } from '../games/keys'

const published: Field = {
  name: 'published',
  type: 'checkbox',
  defaultValue: true,
  admin: { position: 'sidebar' },
}
const order: Field = {
  name: 'order',
  type: 'number',
  defaultValue: 0,
  admin: { position: 'sidebar', description: 'Lower shows first' },
}
const featured: Field = {
  name: 'featured',
  type: 'checkbox',
  defaultValue: false,
  admin: { position: 'sidebar' },
}
const slug: Field = {
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: { position: 'sidebar' },
  validate: (v: unknown) =>
    (typeof v === 'string' && /^[a-z0-9-]+$/.test(v)) || 'lowercase letters, digits, dashes',
}
const accent: Field = {
  name: 'accent',
  type: 'text',
  admin: { description: 'Hex color, e.g. #ff4d2e' },
}

const contentAccess = {
  read: publishedOrLoggedIn,
  create: loggedIn,
  update: loggedIn,
  delete: adminOnly,
}

const base = (s: Omit<CollectionConfig, 'access' | 'hooks'>): CollectionConfig => ({
  ...s,
  access: contentAccess,
  hooks: contentHooks,
  defaultSort: 'order',
  admin: { group: 'Content', ...s.admin },
})

export const Projects = base({
  slug: 'projects',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'year', 'featured', 'published'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    slug,
    { name: 'summary', type: 'textarea', required: true, maxLength: 280 },
    {
      type: 'row',
      fields: [
        { name: 'role', type: 'text' },
        { name: 'client', type: 'text' },
        { name: 'year', type: 'number' },
      ],
    },
    { name: 'stack', type: 'text', hasMany: true },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'problem', type: 'textarea' },
    { name: 'approach', type: 'textarea' },
    { name: 'outcome', type: 'textarea' },
    {
      name: 'metrics',
      type: 'array',
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
    {
      name: 'links',
      type: 'group',
      fields: [
        { name: 'live', type: 'text' },
        { name: 'repo', type: 'text' },
        { name: 'caseStudy', type: 'text' },
      ],
    },
    accent,
    featured,
    order,
    published,
  ],
})

export const Photos = base({
  slug: 'photos',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'location', 'featured', 'published'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    {
      type: 'row',
      fields: [
        { name: 'location', type: 'text' },
        { name: 'takenAt', type: 'date' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'camera', type: 'text' },
        { name: 'lens', type: 'text' },
        { name: 'exposure', type: 'text', admin: { description: 'f/1.8 · 1/250 · ISO 200' } },
      ],
    },
    { name: 'instagramUrl', type: 'text' },
    {
      name: 'series',
      type: 'text',
      admin: { description: 'Group photos into a series, e.g. "Monsoon"' },
    },
    featured,
    order,
    published,
  ],
})

export const Games = base({
  slug: 'games',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'component', 'featured', 'published'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    slug,
    {
      name: 'component',
      type: 'select',
      required: true,
      options: GAME_KEYS.map((k) => ({ label: GAME_LABELS[k], value: k })),
      admin: { description: 'Which built-in game engine to load' },
    },
    { name: 'tagline', type: 'text' },
    { name: 'description', type: 'textarea' },
    {
      name: 'controls',
      type: 'text',
      admin: { description: 'e.g. "Arrows / WASD · tap on mobile"' },
    },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    accent,
    featured,
    order,
    published,
  ],
})

export const Hardware = base({
  slug: 'hardware',
  labels: { singular: 'Hardware project', plural: 'Hardware projects' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'year', 'published'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    slug,
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'built',
      options: [
        { label: 'Built', value: 'built' },
        { label: 'In progress', value: 'in-progress' },
        { label: 'Planned', value: 'planned' },
      ],
    },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'details', type: 'textarea' },
    {
      name: 'components',
      type: 'text',
      hasMany: true,
      admin: { description: 'Parts: ESP32, BME280…' },
    },
    { name: 'tools', type: 'text', hasMany: true, admin: { description: 'KiCad, Fusion 360…' } },
    { name: 'year', type: 'number' },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
    {
      name: 'links',
      type: 'group',
      fields: [
        { name: 'repo', type: 'text' },
        { name: 'video', type: 'text' },
        { name: 'writeup', type: 'text' },
      ],
    },
    featured,
    order,
    published,
  ],
})

export const Skills = base({
  slug: 'skills',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'category', 'level'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: ['frontend', 'backend', 'mobile', 'devops', 'hardware', 'creative', 'tools'].map(
        (v) => ({ label: v, value: v }),
      ),
    },
    {
      name: 'level',
      type: 'number',
      min: 1,
      max: 5,
      defaultValue: 3,
      admin: { description: '1 = learning, 5 = expert' },
    },
    { name: 'years', type: 'number' },
    featured,
    order,
    published,
  ],
})

export const Experience = base({
  slug: 'experience',
  labels: { singular: 'Experience', plural: 'Experience' },
  admin: { useAsTitle: 'org', defaultColumns: ['org', 'role', 'start', 'end'] },
  fields: [
    { name: 'org', label: 'Company / school', type: 'text', required: true },
    { name: 'role', type: 'text', required: true },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'job',
      options: ['job', 'freelance', 'education', 'award', 'talk'].map((v) => ({
        label: v,
        value: v,
      })),
    },
    {
      type: 'row',
      fields: [
        { name: 'start', type: 'date', required: true },
        { name: 'end', type: 'date', admin: { description: 'Empty = present' } },
      ],
    },
    { name: 'location', type: 'text' },
    { name: 'url', type: 'text' },
    { name: 'summary', type: 'textarea' },
    { name: 'highlights', type: 'array', fields: [{ name: 'text', type: 'text', required: true }] },
    order,
    published,
  ],
})
