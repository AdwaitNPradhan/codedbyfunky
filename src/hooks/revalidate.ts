import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/** Purge every cached (ISR) page after a CMS edit. No-op outside a Next request (e.g. seed script). */
export function purgeSite() {
  import('next/cache')
    .then(({ revalidatePath }) => revalidatePath('/', 'layout'))
    .catch(() => {})
}

const afterChange: CollectionAfterChangeHook = ({ doc }) => (purgeSite(), doc)
const afterDelete: CollectionAfterDeleteHook = ({ doc }) => (purgeSite(), doc)
export const revalidateGlobal: GlobalAfterChangeHook = ({ doc }) => (purgeSite(), doc)

export const contentHooks = { afterChange: [afterChange], afterDelete: [afterDelete] }
