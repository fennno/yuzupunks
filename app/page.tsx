'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import InteriorScene from './components/InteriorScene'
import YuzuGame      from './components/YuzuGame'

gsap.registerPlugin(CustomEase)
CustomEase.create('snap',    '.22,.49,0,.96')
CustomEase.create('zoomBurst', '.87,-.09,.93,.67')

type Phase = 'loading' | 'hero' | 'interior' | 'game'

const LAYER_SRCS = [
  '/layers/far-bg.png',
  '/layers/mid-bg.png',
  '/layers/tree.png',
  '/layers/fg.png',
  '/layers/gr.png',
  '/logo.png',
]

function IconSpeaker() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 2.89-1.55 5.42-3.86 6.82l1.44 1.44C19.13 18.5 21 15.44 21 12s-1.87-6.5-4.42-8.26l-1.44 1.44C17.45 6.58 19 9.11 19 12z"/>
    </svg>
  )
}

function IconMute() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    </svg>
  )
}

export default function Home() {
  const [phase, setPhase]         = useState<Phase>('loading')
  const [muted, setMuted]         = useState(false)
  const [showGyroBtn, setShowGyroBtn] = useState(false)  // iOS only: prompt button

  const containerRef   = useRef<HTMLDivElement>(null)
  const audioRef       = useRef<HTMLAudioElement>(null)
  const pageFlashRef   = useRef<HTMLDivElement>(null)
  const orientationRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)

  // ── Preload images then swap out of white loading screen ──────────────────
  useEffect(() => {
    Promise.all(LAYER_SRCS.map(src => new Promise<void>(resolve => {
      const img = new Image()
      img.onload  = () => resolve()
      img.onerror = () => resolve()
      img.src = src
    }))).then(() => setPhase('hero'))
  }, [])

  // ── Start audio on first user interaction ─────────────────────────────────
  useEffect(() => {
    const start = () => { audioRef.current?.play().catch(() => {}) }
    document.addEventListener('click',      start, { once: true })
    document.addEventListener('touchstart', start, { once: true })
    return () => {
      document.removeEventListener('click',      start)
      document.removeEventListener('touchstart', start)
    }
  }, [])

  // ── Hero ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'hero') return

    gsap.ticker.fps(12)

    // Bezier-fade white loading overlay out
    if (pageFlashRef.current)
      gsap.to(pageFlashRef.current, { opacity: 0, duration: 0.9, ease: 'power2.inOut', delay: 0.05 })

    const ctx = gsap.context(() => {
      gsap.set('.layers',         { scale: 1.8, yPercent: -3 })
      gsap.set('.layer-far',      { yPercent: 8 })
      gsap.set('.layer-tree',     { scale: 1.2, yPercent: -10 })
      gsap.set('.layer-mid',      { yPercent: 10 })
      gsap.set('.layer-gr',       { opacity: 0 })
      gsap.set('.logo, .buttons', { opacity: 0, scale: 0.92 })

      const tl = gsap.timeline()
      tl.to('.layers',     { scale: 1.0, yPercent: -33, duration: 5,   ease: 'snap' }, 0)
      tl.to('.layer-far',  { yPercent: 0,               duration: 5,   ease: 'snap' }, 0)
      tl.to('.layer-tree', { scale: 1.0, yPercent: 0,   duration: 4,   ease: 'snap' }, 0)
      tl.to('.layer-mid',  { yPercent: 0,               duration: 0.3, ease: 'snap' }, 0)
      tl.fromTo('.layer-gr', { opacity: 0 }, { opacity: 0.5, duration: 6, ease: 'snap' }, 1)
      tl.to('.logo, .buttons', { opacity: 1, scale: 1, duration: 1.2, ease: 'snap' }, 3.5)

      // Subtle breathe — starts after intro settles, 6s per cycle
      gsap.to('.layers', {
        scale: 1.015,
        duration: 6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 5.5,
      })
    }, containerRef)


    // god ray flicker
    gsap.to('.layer-gr', { opacity: 0.3, duration: 1.2, repeat: -1, ease: 'steps(8)', yoyo: true, delay: 7 })

    // logo + button ambient shake
    gsap.to('.logo', { x: 0.5, y: 0.4, rotation: 0.3, duration: 0.66, repeat: -1, ease: 'steps(1)', yoyo: true, delay: 3.7 })
    gsap.to('.btn',  { x: 0.5, y: 0.4, rotation: 0.3, duration: 0.66, repeat: -1, ease: 'steps(1)', yoyo: true, delay: 3.7, stagger: 0.15 })

    // ── Button press/release ──────────────────────────────────────────────────
    const btns = document.querySelectorAll<HTMLElement>('.btn')
    type H = { el: HTMLElement; press: () => void; release: () => void }
    const handlers: H[] = []
    btns.forEach(btn => {
      const press   = () => gsap.to(btn, { scale: 0.88, y: 5, duration: 0.05, ease: 'power2.in', overwrite: 'auto' })
      const release = () => gsap.to(btn, { scale: 1,    y: 0, duration: 0.35, ease: 'snap',       overwrite: 'auto' })
      btn.addEventListener('mousedown',  press)
      btn.addEventListener('touchstart', press,   { passive: true })
      btn.addEventListener('mouseup',    release)
      btn.addEventListener('touchend',   release)
      btn.addEventListener('mouseleave', release)
      handlers.push({ el: btn, press, release })
    })

    // ── Gyro parallax ─────────────────────────────────────────────────────────
    const farX  = gsap.quickTo('.layer-far',  'x', { duration: 0.5, ease: 'power2.out' })
    const farY  = gsap.quickTo('.layer-far',  'y', { duration: 0.5, ease: 'power2.out' })
    const midX  = gsap.quickTo('.layer-mid',  'x', { duration: 0.5, ease: 'power2.out' })
    const midY  = gsap.quickTo('.layer-mid',  'y', { duration: 0.5, ease: 'power2.out' })
    const treeX = gsap.quickTo('.layer-tree', 'x', { duration: 0.5, ease: 'power2.out' })
    const treeY = gsap.quickTo('.layer-tree', 'y', { duration: 0.5, ease: 'power2.out' })
    const fgX   = gsap.quickTo('.layer-fg',   'x', { duration: 0.5, ease: 'power2.out' })
    const fgY   = gsap.quickTo('.layer-fg',   'y', { duration: 0.5, ease: 'power2.out' })

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = (e.gamma ?? 0) / 30   // -1 to 1 across ±30°
      const y = ((e.beta  ?? 0) - 45) / 30
      farX(x * 8);   farY(y * 6)
      midX(x * 14);  midY(y * 10)
      treeX(x * 20); treeY(y * 15)
      fgX(x * 28);   fgY(y * 20)
    }
    orientationRef.current = handleOrientation

    // iOS 13+: requestPermission must be called from inside a user gesture.
    // Use .then() (not async/await) so the call stays synchronous in the event handler.
    const setupGyro = () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        ;(DeviceOrientationEvent as any).requestPermission()
          .then((res: string) => {
            if (res === 'granted') window.addEventListener('deviceorientation', handleOrientation)
          })
          .catch(() => {})
      } else {
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // iOS: show a dedicated button — user taps it to trigger the permission dialog
      setShowGyroBtn(true)
    } else {
      // Android / desktop: start immediately, no prompt needed
      setupGyro()
    }

    return () => {
      ctx.revert()
      gsap.ticker.fps(60)
      if (orientationRef.current) window.removeEventListener('deviceorientation', orientationRef.current)
      handlers.forEach(({ el, press, release }) => {
        el.removeEventListener('mousedown',  press)
        el.removeEventListener('touchstart', press)
        el.removeEventListener('mouseup',    release)
        el.removeEventListener('touchend',   release)
        el.removeEventListener('mouseleave', release)
      })
    }
  }, [phase])

  // ── Explore: GSAP zoom — single curve, door anchor ───────────────────────
  const enterInterior = () => {
    if (orientationRef.current) window.removeEventListener('deviceorientation', orientationRef.current)

    gsap.to('.ui', { opacity: 0, duration: 0.25, ease: 'power2.in' })

    // transformOrigin math: door is visually at ~85% of viewport.
    // .layers has yPercent:-33 (translateY -33vh) so in element coords: 85 + 33 = 118%
    gsap.to('.layers', {
      scale: 1.6,
      transformOrigin: '50% 118%',
      duration: 1.8,
      ease: 'zoomBurst',
      overwrite: true,
      onComplete: () => setPhase('interior'),
    })

    // White flash on back half
    gsap.to(pageFlashRef.current, {
      opacity: 1,
      duration: 0.9,
      ease: 'power2.in',
      delay: 0.9,
    })
  }

  // ── Gyro permission (iOS only) ────────────────────────────────────────────
  const handleGyroRequest = () => {
    ;(DeviceOrientationEvent as any).requestPermission()
      .then((res: string) => {
        if (res === 'granted' && orientationRef.current) {
          window.addEventListener('deviceorientation', orientationRef.current)
        }
        setShowGyroBtn(false)   // hide button whether granted or denied
      })
      .catch(() => setShowGyroBtn(false))
  }

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !audioRef.current.muted
    setMuted(m => !m)
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (phase === 'loading') return <div className="loading-screen" />

  return (
    <>
      <audio ref={audioRef} src="/music.mp3" loop preload="auto" />

      {showGyroBtn && (
        <button className="mute-btn gyro-btn" onClick={handleGyroRequest} aria-label="Enable tilt parallax">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            <path d="M16.24 7.76C15.07 6.59 13.54 6 12 6V4c2.03 0 3.93.79 5.36 2.22L16.24 7.76zM7.76 16.24C8.93 17.41 10.46 18 12 18v2c-2.03 0-3.93-.79-5.36-2.22l1.12-1.54z" opacity="0.5"/>
          </svg>
        </button>
      )}

      <button className="mute-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? <IconMute /> : <IconSpeaker />}
      </button>

      {phase === 'game' ? (
        <YuzuGame onExit={() => setPhase('interior')} />
      ) : phase === 'interior' ? (
        <InteriorScene onExit={() => setPhase('hero')} onEnterGame={() => setPhase('game')} />
      ) : (
        <main ref={containerRef} className="hero">

          <div className="layers">
            <img src="/layers/far-bg.png" className="layer layer-far"  alt="" />
            <img src="/layers/mid-bg.png" className="layer layer-mid"  alt="" />
            <img src="/layers/tree.png"   className="layer layer-tree" alt="" />
            <img src="/layers/fg.png"     className="layer layer-fg"   alt="" />
            <img src="/layers/gr.png"     className="layer layer-gr"   alt="" />
          </div>

          <div className="ui">
            <img src="/logo.png" className="logo" alt="Yuzu Punks" />
            <div className="buttons">
              <a href="https://shop.yuzupunks.com" target="_blank" rel="noopener noreferrer" className="btn">Shop</a>
              <a href="#" className="btn" onClick={(e) => { e.preventDefault(); enterInterior() }}>Explore</a>
            </div>
          </div>

          <div ref={pageFlashRef} className="flash-overlay" style={{ opacity: 1 }} />

        </main>
      )}
    </>
  )
}
