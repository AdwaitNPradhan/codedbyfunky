'use client'

import Image from 'next/image'
import { imgSrc } from './util'
import type { Img } from '@/lib/types'
import s from './sections.module.css'

/**
 * Two stacked copies of one image: full colour below, cyanotype duotone above. The cyanotype
 * layer is a static filtered image inside a wrapper; only the wrapper's opacity animates, so the
 * filter is never re-rasterised. Hover / focus / `data-colour` (set by scroll on touch) reveals colour.
 */
export function Duotone({
  img,
  sizes,
  alt,
  priority,
}: {
  img: Img
  sizes: string
  alt?: string
  priority?: boolean
}) {
  const src = imgSrc(img)
  return (
    <div className={s.duo}>
      <Image
        className={s.duoColour}
        src={src}
        alt={alt ?? img.alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={img.blur ? 'blur' : 'empty'}
        blurDataURL={img.blur}
      />
      <div className={s.duoCyan} aria-hidden="true">
        <Image className={s.duoFiltered} src={src} alt="" fill sizes={sizes} priority={priority} />
      </div>
    </div>
  )
}
