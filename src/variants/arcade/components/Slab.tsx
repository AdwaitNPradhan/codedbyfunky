import Image from 'next/image'
import type { ReactNode } from 'react'
import type { Img } from '@/lib/types'
import { cx, type Tone } from '../lib/misc'

/** Full-bleed colour band with ink borders. `data-slam` content slams in on scroll (see index). */
export function Slab({
  id,
  tone,
  className,
  labelledBy,
  children,
}: {
  id: string
  tone: Tone | 'cream' | 'ink'
  className?: string
  labelledBy?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={cx('ar-slab', `ar-slab--${tone}`, className)}
      aria-labelledby={labelledBy}
    >
      <div className="ar-wrap" data-slam="">
        {children}
      </div>
    </section>
  )
}

export function SlabHead({
  id,
  title,
  count,
  children,
}: {
  id: string
  title: string
  count?: number | string
  children?: ReactNode
}) {
  return (
    <header className="ar-head">
      <h2 id={id} className="ar-h2">
        {title}
        {count != null && count !== '' && (
          <span className="ar-count" aria-hidden="true">
            {count}
          </span>
        )}
      </h2>
      {children && <div className="ar-head__aside">{children}</div>}
    </header>
  )
}

/** CMS media urls arrive absolute (http://host/api/media/...). next/image only allows configured hosts, so use the same-origin path. */
function local(src: string) {
  if (!/^https?:\/\//.test(src)) return src
  try {
    const u = new URL(src)
    return u.pathname + u.search
  } catch {
    return src
  }
}

/** CMS image that fills its (positioned, aspect-ratio'd) parent. */
export function Pic({
  img,
  sizes,
  priority,
  alt,
  thumb,
  className,
}: {
  img: Img | null | undefined
  sizes: string
  priority?: boolean
  alt?: string
  thumb?: boolean
  className?: string
}) {
  if (!img) return <div className={cx('ar-pic-empty', className)} aria-hidden="true" />
  const src = local(thumb ? (img.thumb ?? img.card ?? img.url) : (img.card ?? img.url))
  return (
    <Image
      src={src}
      alt={alt ?? img.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cx('ar-pic', className)}
      placeholder={img.blur ? 'blur' : 'empty'}
      blurDataURL={img.blur}
      draggable={false}
      style={{
        objectPosition:
          img.focalX != null && img.focalY != null ? `${img.focalX}% ${img.focalY}%` : undefined,
      }}
    />
  )
}
