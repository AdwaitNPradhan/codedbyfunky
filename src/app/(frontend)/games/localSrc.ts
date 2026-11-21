/** CMS image URLs can be absolute (http://host/api/media/...). next/image only accepts same-origin paths without remotePatterns. */
export function localSrc(url: string): string {
  if (url.startsWith('/')) return url
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}
