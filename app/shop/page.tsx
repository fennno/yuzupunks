'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

const COMPANY_ID = 'R6AAiB'
const EMAIL_LIST  = 'T85JMt'
const SMS_LIST    = 'XqzNLs'

type Status = 'idle' | 'loading' | 'success' | 'error'

function toE164(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  const full = digits.startsWith('1') ? digits : `1${digits}`
  return full.length >= 11 ? `+${full}` : null
}

async function klaviyoSubscribe(listId: string, profileAttrs: Record<string, string>) {
  const res = await fetch(
    `https://a.klaviyo.com/client/subscriptions/?company_id=${COMPANY_ID}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', revision: '2024-07-15' },
      body: JSON.stringify({
        data: {
          type: 'subscription',
          attributes: {
            profile: {
              data: { type: 'profile', attributes: profileAttrs },
            },
          },
          relationships: {
            list: { data: { type: 'list', id: listId } },
          },
        },
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('Klaviyo error', res.status, body)
    throw new Error('klaviyo error')
  }
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.17 1.32.68 2.66 1.6 3.57.92.91 2.22 1.36 3.5 1.54v3.46c-1.21-.05-2.43-.37-3.5-.94v7.06c-.04 1.57-.47 3.14-1.24 4.48-1.21 2.08-3.49 3.49-5.84 3.53-1.43.06-2.85-.38-4.04-1.15-2.1-1.33-3.44-3.64-3.48-6.02-.03-1.33.31-2.66.97-3.83C5.34 9.3 6.83 8.13 8.49 7.7c1.19-.32 2.44-.26 3.64.02v3.56c-.65-.21-1.36-.25-2.03-.1-1.02.22-1.93.85-2.54 1.72-.59.84-.86 1.89-.76 2.93.11 1.02.57 1.99 1.27 2.69.72.71 1.71 1.12 2.71 1.09 1-.03 1.99-.5 2.64-1.27.6-.69.93-1.57.96-2.46l.01-14.88z" />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24c3.259 0 3.668-.014 4.948-.072 1.277-.06 2.148-.261 2.913-.558.788-.306 1.459-.717 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.689.072-4.948 0-3.259-.014-3.667-.072-4.947-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

export default function ShopPage() {
  const headlineRef = useRef<HTMLHeadingElement>(null)

  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [phoneStatus, setPhoneStatus] = useState<Status>('idle')
  const [emailStatus, setEmailStatus] = useState<Status>('idle')

  useEffect(() => {
    gsap.ticker.fps(12)
    if (headlineRef.current) {
      gsap.to(headlineRef.current, {
        x: 0.5, y: 0.4, rotation: 0.3,
        duration: 0.66, repeat: -1, ease: 'steps(1)', yoyo: true,
      })
    }
    return () => { gsap.ticker.fps(60) }
  }, [])

  const handlePhone = async () => {
    const formatted = toE164(phone)
    if (!formatted) return
    setPhoneStatus('loading')
    try {
      await klaviyoSubscribe(SMS_LIST, { phone_number: formatted })
      setPhoneStatus('success')
    } catch {
      setPhoneStatus('error')
    }
  }

  const handleEmail = async () => {
    if (!email.includes('@')) return
    setEmailStatus('loading')
    try {
      await klaviyoSubscribe(EMAIL_LIST, { email })
      setEmailStatus('success')
    } catch {
      setEmailStatus('error')
    }
  }

  return (
    <main className="shop-page">
      <div className="checkerboard" />

      <div className="shop-content">
        <img src="/logo.png" className="shop-logo" alt="Yuzu Punks" />

        <h1 ref={headlineRef} className="shop-headline">
          coming soon to a yuzupunks.com near you!
        </h1>

        <div className="klaviyo-section">
          <div className="subscribe-row">
            <input
              type="tel"
              className="subscribe-input"
              placeholder="phone number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePhone()}
            />
            <button
              className="subscribe-btn"
              onClick={handlePhone}
              disabled={phoneStatus === 'loading' || phoneStatus === 'success'}
            >
              {phoneStatus === 'success' ? '✓' : phoneStatus === 'loading' ? '…' : 'text me'}
            </button>
          </div>
          {phoneStatus === 'error' && <p className="subscribe-err">something went wrong — try again</p>}

          <div className="subscribe-row">
            <input
              type="email"
              className="subscribe-input"
              placeholder="email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
            />
            <button
              className="subscribe-btn"
              onClick={handleEmail}
              disabled={emailStatus === 'loading' || emailStatus === 'success'}
            >
              {emailStatus === 'success' ? '✓' : emailStatus === 'loading' ? '…' : 'email me'}
            </button>
          </div>
          {emailStatus === 'error' && <p className="subscribe-err">something went wrong — try again</p>}
        </div>

        <div className="social-links">
          <a href="https://www.tiktok.com/@yuzupunks" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="TikTok">
            <IconTikTok />
          </a>
          <a href="https://www.instagram.com/yuzupunks" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
            <IconInstagram />
          </a>
        </div>
      </div>
    </main>
  )
}
