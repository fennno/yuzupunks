'use client'

import { useState, useRef, useEffect } from 'react'

// Tiny unlock affordance for the public landing page. A faint "enter" glyph
// bottom-left; clicking it reveals a password field. Correct password → the
// /api/unlock endpoint sets the signed access cookie and we navigate to /site.

function IconEnter() {
  // door-with-arrow "enter" glyph
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}

type State = 'idle' | 'open' | 'checking' | 'error'

export default function UnlockGate() {
  const [state, setState] = useState<State>('idle')
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state === 'open') inputRef.current?.focus()
  }, [state])

  const submit = async () => {
    if (!value) return
    setState('checking')
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: value }),
      })
      if (res.ok) {
        // Cookie is set; full navigation so the proxy sees it.
        window.location.href = '/site'
        return
      }
    } catch {
      /* fall through to error */
    }
    setState('error')
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div className={`unlock-gate ${state !== 'idle' ? 'unlock-gate--active' : ''}`}>
      {state === 'idle' ? (
        <button
          className="unlock-icon"
          onClick={() => setState('open')}
          aria-label="Enter site"
        >
          <IconEnter />
        </button>
      ) : (
        <div className="unlock-form">
          <input
            ref={inputRef}
            type="password"
            className={`unlock-input ${state === 'error' ? 'unlock-input--error' : ''}`}
            placeholder={state === 'error' ? 'nope, try again' : 'password'}
            value={value}
            onChange={e => { setValue(e.target.value); if (state === 'error') setState('open') }}
            onKeyDown={e => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') { setState('idle'); setValue('') }
            }}
            disabled={state === 'checking'}
          />
          <button
            className="unlock-go"
            onClick={submit}
            disabled={state === 'checking' || !value}
            aria-label="Unlock"
          >
            {state === 'checking' ? '…' : <IconEnter />}
          </button>
        </div>
      )}
    </div>
  )
}
