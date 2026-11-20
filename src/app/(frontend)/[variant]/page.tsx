import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import type { ComponentType } from 'react'
import { getSiteData } from '@/lib/content'
import type { SiteData } from '@/lib/types'
import { isVariantKey, VARIANT_META, type VariantKey } from '@/variants/keys'
import { PersonJsonLd } from '@/components/seo/PersonJsonLd'

// Each variant is its own client bundle (JS, CSS, fonts) — only the visited one loads.
const variants: Record<VariantKey, ComponentType<{ data: SiteData }>> = {
  orbit: dynamic(() => import('@/variants/orbit')),
  darkroom: dynamic(() => import('@/variants/darkroom')),
  blueprint: dynamic(() => import('@/variants/blueprint')),
  arcade: dynamic(() => import('@/variants/arcade')),
  os: dynamic(() => import('@/variants/os')),
}

// ISR without touching the DB at build time: rendered on first visit, cached,
// and purged by CMS hooks (revalidatePath) whenever content changes.
export const dynamicParams = true
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Params = { params: Promise<{ variant: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { variant } = await params
  if (!isVariantKey(variant)) return {}
  const { settings } = await getSiteData()
  const title = settings.seo.title || `${settings.name} — ${settings.tagline}`
  const description = settings.seo.description || settings.shortBio
  const og = settings.seo.ogImage?.hero || settings.seo.ogImage?.url
  return {
    title: { absolute: `${title} · ${VARIANT_META[variant].title}` },
    description,
    alternates: { canonical: `/${variant}` },
    openGraph: { title, description, images: og ? [og] : undefined },
  }
}

export default async function VariantPage({ params }: Params) {
  const { variant } = await params
  if (!isVariantKey(variant)) notFound()
  const data = await getSiteData()
  const Variant = variants[variant]
  return (
    <>
      <PersonJsonLd settings={data.settings} />
      <Variant data={data} />
    </>
  )
}
