import type { Settings } from '@/lib/types'
import { Icon } from './art'
import { InstagramSlab } from './Photos'

export function Footer({ s }: { s: Settings }) {
  return (
    <>
      <InstagramSlab ig={s.instagram} compact />
      <footer className="ar-footer">
        <div className="ar-wrap ar-footer__row">
          <p>
            © {new Date().getFullYear()} {s.name}. Built by hand with Next.js, Payload and too much coffee.
          </p>
          <nav aria-label="Footer" className="ar-footer__nav">
            <a href="#work">Work</a>
            <a href="#play">Play</a>
            <a href="#contact">Contact</a>
            {s.resumeUrl && (
              <a href={s.resumeUrl} download>
                Resume
              </a>
            )}
            <a href="#top" className="ar-footer__top">
              Back to top <Icon name="up" size={16} />
            </a>
          </nav>
        </div>
      </footer>
    </>
  )
}
