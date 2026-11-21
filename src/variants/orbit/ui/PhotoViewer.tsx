'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import type { Photo } from '@/lib/types'
import { imgUrl, monthYear, pad, track } from '../lib/util'
import { ArrowLeft, ArrowRight, ArrowUpRight, Btn, BtnLink } from './bits'
import { Modal } from './Modal'
import s from '../orbit.module.css'

export function PhotoViewer({
  photo,
  index,
  total,
  igUrl,
  onClose,
  onStep,
}: {
  photo: Photo
  index: number
  total: number
  igUrl: string | null
  onClose: () => void
  onStep: (d: -1 | 1) => void
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onStep(-1)
      if (e.key === 'ArrowRight') onStep(1)
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onStep])
  const link = photo.instagramUrl || igUrl
  return (
    <Modal label={`Photo: ${photo.title}`} onClose={onClose} wide>
      <figure className={s.pv}>
        <div className={s.pvImg}>
          <Image
            src={imgUrl(photo.image, 'hero')}
            alt={photo.image.alt || photo.title}
            width={photo.image.width}
            height={photo.image.height}
            sizes="(max-width: 900px) 94vw, 1100px"
            placeholder={photo.image.blur ? 'blur' : 'empty'}
            blurDataURL={photo.image.blur}
            priority
          />
        </div>
        <figcaption className={s.pvCap}>
          <div>
            <p className={s.csCount}>
              {pad(index + 1)}/{pad(total)}
            </p>
            <h2 className={s.csTitle}>{photo.title}</h2>
            <p className={s.place}>{[photo.location, monthYear(photo.takenAt), photo.series].filter(Boolean).join(' · ')}</p>
            {(photo.camera || photo.lens || photo.exposure) && (
              <dl className={s.exif}>
                {photo.camera && (
                  <div>
                    <dt>Camera</dt>
                    <dd>{photo.camera}</dd>
                  </div>
                )}
                {photo.lens && (
                  <div>
                    <dt>Lens</dt>
                    <dd>{photo.lens}</dd>
                  </div>
                )}
                {photo.exposure && (
                  <div>
                    <dt>Exposure</dt>
                    <dd>{photo.exposure}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <div className={s.actions}>
            <Btn onClick={() => onStep(-1)} disabled={total < 2} aria-label="Previous photo">
              <ArrowLeft />
            </Btn>
            <Btn onClick={() => onStep(1)} disabled={total < 2} aria-label="Next photo">
              <ArrowRight />
            </Btn>
            {link && (
              <BtnLink href={link} external variant="primary" cursor="OPEN" onClick={() => track('cta_instagram', { where: 'viewer' })}>
                On Instagram <ArrowUpRight />
              </BtnLink>
            )}
          </div>
        </figcaption>
      </figure>
    </Modal>
  )
}
