'use client'

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import s from '../orbit.module.css'

export function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(s.icon, className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M4.5 11.5l7-7M5.5 4.5h6v6" />
    </svg>
  )
}
export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(s.icon, className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M2.5 8h11M9 3.5L13.5 8 9 12.5" />
    </svg>
  )
}
export function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(s.icon, className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M13.5 8h-11M7 3.5L2.5 8 7 12.5" />
    </svg>
  )
}
export function Download({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(s.icon, className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10" />
    </svg>
  )
}
export function Copy({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(s.icon, className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="5.5" y="5.5" width="8" height="8" />
      <path d="M10.5 5.5v-3h-8v8h3" />
    </svg>
  )
}
export function Close({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(s.icon, className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  )
}

type Variant = 'primary' | 'ghost' | 'text'
const cls = (v: Variant, extra?: string) =>
  clsx(
    s.btn,
    v === 'primary' && s.btnPrimary,
    v === 'ghost' && s.btnGhost,
    v === 'text' && s.btnText,
    extra,
  )

export function BtnLink({
  variant = 'ghost',
  magnetic,
  cursor,
  external,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant
  magnetic?: boolean
  cursor?: string
  external?: boolean
  children: ReactNode
}) {
  return (
    <a
      {...rest}
      className={cls(variant, className)}
      data-magnetic={magnetic ? '' : undefined}
      data-cursor={cursor}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

export function Btn({
  variant = 'ghost',
  magnetic,
  cursor,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  magnetic?: boolean
  cursor?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cls(variant, className)}
      data-magnetic={magnetic ? '' : undefined}
      data-cursor={cursor}
    >
      {children}
    </button>
  )
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'solar' | 'ice' | 'mint' }) {
  return <li className={clsx(s.chip, tone && s[`chip_${tone}`])}>{children}</li>
}
