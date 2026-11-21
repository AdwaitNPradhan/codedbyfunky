'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@payloadcms/ui'
import { getDoom, recoverDoom } from '@/app/actions/doom'

/** CMS dashboard panel: shows whether the rm -rf easter egg has blanked FunkyOS, with an admin-only restore. */
export function RestoreDoom() {
  const [state, setState] = useState<{ active: boolean; left: number } | null>(null)
  const [msg, setMsg] = useState('')

  const check = useCallback(() => {
    getDoom()
      .then((d) => setState({ active: d.active, left: Math.max(0, d.until - d.now) }))
      .catch(() => setMsg('Could not read the FunkyOS status.'))
  }, [])

  useEffect(() => {
    check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [check])

  const restore = async () => {
    const r = await recoverDoom().catch(() => ({ ok: false }))
    setMsg(r.ok ? 'Restored. FunkyOS boots again for every visitor.' : 'Only an admin can restore FunkyOS.')
    check()
  }

  const mins = state ? Math.ceil(state.left / 60000) : 0
  return (
    <section
      aria-label="FunkyOS status"
      style={{ margin: '24px 0', padding: 20, border: '1px solid var(--theme-elevation-150)', borderRadius: 8 }}
    >
      <h3 style={{ margin: '0 0 8px' }}>FunkyOS status</h3>
      <p style={{ margin: '0 0 12px' }}>
        {!state
          ? 'Checking…'
          : state.active
            ? `Down: someone ran rm -rf /. It comes back by itself in about ${mins} min.`
            : 'Running normally.'}
      </p>
      <Button onClick={restore} disabled={!state?.active} buttonStyle="primary">
        Restore FunkyOS now
      </Button>
      {msg && (
        <p role="status" style={{ margin: '12px 0 0' }}>
          {msg}
        </p>
      )}
    </section>
  )
}
