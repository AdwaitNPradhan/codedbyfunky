'use client'

import ReactMarkdown from 'react-markdown'
import ui from './apps.module.css'

/** Links and images may only be http(s), mailto, site-relative or an in-page anchor. */
const OK = /^(https?:|mailto:|\/(?!\/)|#)/i
const urlTransform = (u: string) => (OK.test(u.trim()) ? u : '')

/**
 * Markdown from the CMS, rendered safely: no rehype-raw, no dangerouslySetInnerHTML.
 * Raw HTML in the text is dropped (`skipHtml`), never executed.
 */
export default function Md({ children }: { children: string }) {
  return (
    <div className={ui.md}>
      <ReactMarkdown
        skipHtml
        urlTransform={urlTransform}
        components={{
          // The article title is the h2, so markdown headings start at h3.
          h1: ({ children: c }) => <h3>{c}</h3>,
          h2: ({ children: c }) => <h3>{c}</h3>,
          h3: ({ children: c }) => <h4>{c}</h4>,
          h4: ({ children: c }) => <h5>{c}</h5>,
          a: ({ href, children: c }) =>
            href ? (
              <a
                href={href}
                {...(href.startsWith('#') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
              >
                {c}
              </a>
            ) : (
              <span>{c}</span>
            ),
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) =>
            typeof src === 'string' && src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" />
            ) : null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
