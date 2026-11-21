'use client'

import { useOS } from '../store'
import styles from '../os.module.css'

/** A short message (for example "Link copied"). The live region stays mounted so screen readers hear it. */
export function Toast() {
  const { toast } = useOS()
  return (
    <div className={styles.toastHost} role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={styles.toast}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
