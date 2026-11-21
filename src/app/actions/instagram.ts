'use server'

import { loadInstagram, type IgPost } from '@/lib/instagram'

/** The Instagram feed for the Photos app. Posts only: the token never leaves the server. */
export async function getInstagramFeed(): Promise<{ ok: boolean; posts: IgPost[] }> {
  const posts = await loadInstagram()
  return posts ? { ok: true, posts } : { ok: false, posts: [] }
}
