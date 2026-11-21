'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import ui from './apps.module.css'

export function CopyButton({
  text,
  label = 'Copy email',
  className,
}: {
  text: string
  label?: string
  className?: string
}) {
  const [done, setDone] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  const copy = () => {
    setDone(true) // instant confirmation (well under 150 ms)
    clearTimeout(t.current)
    t.current = setTimeout(() => setDone(false), 1600)
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* ignore */
      }
      ta.remove()
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback)
    else fallback()
  }
  return (
    <button
      type="button"
      className={`${ui.btn} ${className ?? ''}`}
      onClick={copy}
      aria-live="polite"
    >
      {done ? 'Copied ✓' : label}
    </button>
  )
}

export function Ext({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={ui.empty}>{children}</p>
}

export function StatusChip({
  status,
}: {
  status: 'built' | 'in-progress' | 'planned' | 'shipped' | 'prototype'
}) {
  const label = status === 'in-progress' ? 'in progress' : status
  return (
    <span className={`${ui.status} ${ui[`st_${status.replace('-', '_')}`] ?? ''}`}>{label}</span>
  )
}
