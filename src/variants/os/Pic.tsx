'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { Img } from '@/lib/types'

/** CMS URLs can be absolute (Payload serverURL). next/image only allows relative `/api/media/file/**`. */
export const local = (url: string) => {
  if (!url.startsWith('http')) return url
  try {
    const u = new URL(url)
    return u.pathname.startsWith('/api/media/file/') ? u.pathname + u.search : url
  } catch {
    return url
  }
}

type Size = 'thumb' | 'card' | 'hero' | 'url'

/** Pick the smallest rendition that is large enough. Falls back to the original. */
export const pick = (img: Img, size: Size) =>
  local(
    (size === 'url'
      ? img.url
      : size === 'hero'
        ? (img.hero ?? img.card ?? img.url)
        : size === 'card'
          ? (img.card ?? img.url)
          : (img.thumb ?? img.card ?? img.url)) as string,
  )

type Props = {
  img: Img
  size?: Size
  sizes: string
  alt?: string
  className?: string
  style?: CSSProperties
  priority?: boolean
  fit?: 'cover' | 'contain'
  /** Draw the image absolutely filling its (positioned) parent. */
  fill?: boolean
  draggable?: boolean
}

export function Pic({
  img,
  size = 'card',
  sizes,
  alt,
  className,
  style,
  priority,
  fit = 'cover',
  fill = true,
  draggable = false,
}: Props) {
  const focal = `${img.focalX ?? 50}% ${img.focalY ?? 50}%`
  const common = {
    src: pick(img, size),
    alt: alt ?? img.alt ?? '',
    sizes,
    className,
    priority,
    draggable,
    placeholder: img.blur ? ('blur' as const) : ('empty' as const),
    blurDataURL: img.blur,
    style: { objectFit: fit, objectPosition: focal, ...style } as CSSProperties,
  }
  return fill ? (
    <Image {...common} fill />
  ) : (
    <Image {...common} width={img.width} height={img.height} />
  )
}
