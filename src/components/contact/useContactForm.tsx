'use client'

import { useActionState, useEffect, useState } from 'react'
import { sendContact, type ContactState } from '@/app/actions/contact'

/**
 * Headless contact form logic. Each variant renders its own UI:
 *
 *   const { state, formAction, pending, hiddenFields } = useContactForm('orbit')
 *   <form action={formAction}>
 *     {hiddenFields}
 *     <input name="name" /> <input name="email" type="email" /> <input name="topic" />
 *     <textarea name="message" />
 *     {state?.fieldErrors?.email}  {state?.message}
 *     <button disabled={pending}>Send</button>
 *   </form>
 */
export function useContactForm(source: string) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendContact, null)
  const [startedAt, setStartedAt] = useState(0)
  useEffect(() => setStartedAt(Date.now()), [])

  const hiddenFields = (
    <>
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }}
      />
      <input type="hidden" name="t" value={startedAt} readOnly />
      <input type="hidden" name="source" value={source} readOnly />
    </>
  )

  return { state, formAction, pending, hiddenFields }
}
