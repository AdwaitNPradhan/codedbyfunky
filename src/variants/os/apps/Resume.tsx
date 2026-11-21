'use client'

import { useOS } from '../store'
import type { AppProps } from '../types'
import { resumeFileName } from '../util'
import { Empty, Ext } from './common'
import ui from './apps.module.css'

export default function Resume(_: AppProps) {
  const os = useOS()
  const { settings: s } = os.data
  const url = s.resumeUrl
  if (!url)
    return (
      <div className={ui.scroll}>
        <Empty>
          The resume PDF has not been uploaded yet.
          {s.publicEmail ? (
            <>
              {' '}
              Ask for it at <a href={`mailto:${s.publicEmail}`}>{s.publicEmail}</a>.
            </>
          ) : null}
        </Empty>
      </div>
    )
  const name = resumeFileName(url, s.name)
  return (
    <div className={ui.resume}>
      <div className={ui.toolbar}>
        <strong className={ui.fileName}>{name}</strong>
        <span className={ui.grow} />
        <a className={`${ui.btn} ${ui.btnPrimary}`} href={url} download={name}>
          Download
        </a>
        <Ext href={url} className={ui.btn}>
          Open in new tab ↗
        </Ext>
      </div>
      <iframe className={ui.pdf} src={`${url}#toolbar=0&navpanes=0`} title={`${name} preview`} />
      <p className={ui.statusbar}>
        Can’t see the preview? <a href={url} download={name}>Download the PDF</a>.
      </p>
    </div>
  )
}
