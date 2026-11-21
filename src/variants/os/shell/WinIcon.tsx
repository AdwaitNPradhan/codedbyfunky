'use client'

import { iconOf } from '../appmeta'
import { Icon } from '../icons'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppId, WinProps } from '../types'
import styles from '../os.module.css'

/** Icon for a window or a dock slot. An installed product shows its own app icon (or its cover). */
export function WinIcon({ app, props, size }: { app: AppId; props?: WinProps; size: number }) {
  const { data } = useOS()
  if (app === 'product') {
    const p = data.projects.find((x) => x.slug === props?.slug)
    const img = p?.appIcon ?? p?.cover
    if (p && img)
      return (
        <span className={styles.appImg} style={{ width: size, height: size }}>
          <Pic img={img} size="thumb" sizes={`${size}px`} alt="" />
        </span>
      )
  }
  return <Icon name={iconOf(app, props)} size={size} />
}
