'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import InteriorScene from './components/InteriorScene'

gsap.registerPlugin(CustomEase)
CustomEase.create('snap', '.22,.49,0,.96')

type Phase = 'loading' | 'hero' | 'transition' | 'interior'

const LAYER_SRCS = [
  '/layers/far-bg.png',
  '/layers/mid-bg.png',
  '/layers/tree.png',
  '/layers/fg.png',
  '/layers/gr.png',
  '/logo.png',
]

// ── Speaker SVG icons ─────────────────────────────────────────────────────────
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
  const [phase, setPhase]   = useState<Phase>('loading')
  const [muted, setMuted]   = useState(false)

  const containerRef    = useRef<HTMLDivElement>(null)
  const videoRef        = useRef<HTMLVideoElement>(null)
  const audioRef        = useRef<HTMLAudioElement>(null)
  const pageFlashRef    = useRef<HTMLDivElement>(null)
  const flashStartedRef = useRef(false)
  const treeNoiseRef    = useRef<SVGFETurbulenceElement>(null)
  const subtleNoiseRef  = useRef<SVGFETurbulenceElement>(null)
  const grNoiseRef      = useRef<SVGFETurbulenceElement>(null)
  const orientationRef  = useRef<((e: DeviceOrientationEvent) => void) | null>(null)

  // ── Preload images then transition from white loading screen ───────────────
  useEffect(() => {
    Promise.all(LAYER_SRCS.map(src => new Promise<void>(resolve => {
      const img = new Image()
      img.onload  = () => resolve()
      img.onerror = () => resolve()
      img.src = src
    }))).then(() => setPhase('hero'))
  }, [])

  // ── Start audio on first user interaction (required by browsers) ───────────
  useEffect(() => {
    const startAudio = () => {
      audioRef.current?.play().catch(() => {})
    }
    document.addEventListener('click',      startAudio, { once: true })
    document.addEventListener('touchstart', startAudio, { once: true })
    return () => {
      document.removeEventListener('click',      startAudio)
      document.removeEventListener('touchstart', startAudio)
    }
  }, [])

  // ── Hero animations ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'hero') return

    gsap.ticker.fps(12)
    // Desktop = animate warble seeds (GSAP steps).
    // Mobile  = seeds stay static; feTurbulence result cached once — no per-frame GPU cost.
    const isMobile = window.matchMedia('(pointer: coarse)').matches

    // Bezier-fade white loading overlay out
    if (pageFlashRef.current) {
      gsap.to(pageFlashRef.current, { opacity: 0, duration: 0.9, ease: 'power2.inOut', delay: 0.05 })
    }

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

      tl.fromTo('.layer-gr',
        { opacity: 0 },
        { opacity: 0.5, duration: 6, ease: 'snap' },
        1
      )

      tl.to('.logo, .buttons', { opacity: 1, scale: 1, duration: 1.2, ease: 'snap' }, 3.5)
    }, containerRef)

    // ── Warble seed animation — desktop only; mobile uses static (cached) warp ──
    if (!isMobile) {
      if (treeNoiseRef.current)
        gsap.to(treeNoiseRef.current,   { attr: { seed: 4 }, duration: 2.66, repeat: -1, ease: 'steps(4)', yoyo: true })
      if (subtleNoiseRef.current)
        gsap.to(subtleNoiseRef.current, { attr: { seed: 4 }, duration: 2,    repeat: -1, ease: 'steps(4)', yoyo: true })
      if (grNoiseRef.current)
        gsap.to(grNoiseRef.current,     { attr: { seed: 6 }, duration: 1.6,  repeat: -1, ease: 'steps(4)', yoyo: true })
    }

    // god ray flicker
    gsap.to('.layer-gr', { opacity: 0.3, duration: 1.2, repeat: -1, ease: 'steps(8)', yoyo: true, delay: 7 })

    // logo + button ambient shake
    gsap.to('.logo', { x: 0.5, y: 0.4, rotation: 0.3, duration: 0.66, repeat: -1, ease: 'steps(1)', yoyo: true, delay: 3.7 })
    gsap.to('.btn',  { x: 0.5, y: 0.4, rotation: 0.3, duration: 0.66, repeat: -1, ease: 'steps(1)', yoyo: true, delay: 3.7, stagger: 0.15 })

    // ── Button press/release (GSAP handles transform; CSS :active can't override inline styles) ──
    const btns = document.querySelectorAll<HTMLElement>('.btn')
    type BtnHandler = { el: HTMLElement; press: () => void; release: () => void }
    const pressHandlers: BtnHandler[] = []
    btns.forEach(btn => {
      const press   = () => gsap.to(btn, { scale: 0.88, y: 5, duration: 0.05, ease: 'power2.in',  overwrite: 'auto' })
      const release = () => gsap.to(btn, { scale: 1,    y: 0, duration: 0.35, ease: 'snap',        overwrite: 'auto' })
      btn.addEventListener('mousedown',  press)
      btn.addEventListener('touchstart', press,   { passive: true })
      btn.addEventListener('mouseup',    release)
      btn.addEventListener('touchend',   release)
      btn.addEventListener('mouseleave', release)
      pressHandlers.push({ el: btn, press, release })
    })

    // ── Gyro parallax ─────────────────────────────────────────────────────────
    const farX  = gsap.quickTo('.layer-far',  'x', { duration: 0.8, ease: 'power2.out' })
    const farY  = gsap.quickTo('.layer-far',  'y', { duration: 0.8, ease: 'power2.out' })
    const midX  = gsap.quickTo('.layer-mid',  'x', { duration: 0.8, ease: 'power2.out' })
    const midY  = gsap.quickTo('.layer-mid',  'y', { duration: 0.8, ease: 'power2.out' })
    const treeX = gsap.quickTo('.layer-tree', 'x', { duration: 0.8, ease: 'power2.out' })
    const treeY = gsap.quickTo('.layer-tree', 'y', { duration: 0.8, ease: 'power2.out' })
    const fgX   = gsap.quickTo('.layer-fg',   'x', { duration: 0.8, ease: 'power2.out' })
    const fgY   = gsap.quickTo('.layer-fg',   'y', { duration: 0.8, ease: 'power2.out' })

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = (e.gamma ?? 0) / 30
      const y = ((e.beta  ?? 0) - 45) / 30
      farX(x * 4);   farY(y * 3)
      midX(x * 7);   midY(y * 5)
      treeX(x * 11); treeY(y * 8)
      fgX(x * 16);   fgY(y * 11)
    }
    orientationRef.current = handleOrientation

    const setupGyro = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        // iOS 13+ — must be triggered by a user gesture
        try {
          const res = await (DeviceOrientationEvent as any).requestPermission()
          if (res === 'granted') window.addEventListener('deviceorientation', handleOrientation)
        } catch (_) {}
      } else {
        // Android / non-iOS — no permission needed, start immediately
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // iOS: wait for first touch before requesting permission
      document.addEventListener('touchstart', setupGyro, { once: true })
    } else {
      // Android / desktop: wire up immediately
      setupGyro()
    }

    return () => {
      ctx.revert()
      gsap.ticker.fps(60)
      if (orientationRef.current) window.removeEventListener('deviceorientation', orientationRef.current)
      pressHandlers.forEach(({ el, press, release }) => {
        el.removeEventListener('mousedown',  press)
        el.removeEventListener('touchstart', press)
        el.removeEventListener('mouseup',    release)
        el.removeEventListener('touchend',   release)
        el.removeEventListener('mouseleave', release)
      })
    }
  }, [phase])

  // ── Play transition video ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'transition' || !videoRef.current) return
    videoRef.current.play().catch(() => setPhase('interior'))
  }, [phase])

  // ── Flash white near end of video ─────────────────────────────────────────
  const handleTimeUpdate = () => {
    const vid   = videoRef.current
    const flash = pageFlashRef.current
    if (!vid || !flash || flashStartedRef.current || isNaN(vid.duration)) return
    if (vid.duration - vid.currentTime <= 1.2) {
      flashStartedRef.current = true
      gsap.to(flash, { opacity: 1, duration: 1.2, ease: 'steps(10)' })
    }
  }

  // ── Explore handler ────────────────────────────────────────────────────────
  const enterInterior = () => {
    if (orientationRef.current) window.removeEventListener('deviceorientation', orientationRef.current)
    gsap.to('.ui', { opacity: 0, duration: 0.3 })
    setTimeout(() => {
      flashStartedRef.current = false
      setPhase('transition')
    }, 300)
  }

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !audioRef.current.muted
    setMuted(m => !m)
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (phase === 'loading') return <div className="loading-screen" />

  // ── Single render tree for all post-load phases ────────────────────────────
  // Audio element persists across hero ↔ interior so music doesn't restart
  return (
    <>
      <audio ref={audioRef} src="/music.mp3" loop preload="auto" />

      <button className="mute-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? <IconMute /> : <IconSpeaker />}
      </button>

      {phase === 'interior' ? (
        <InteriorScene onExit={() => setPhase('hero')} />
      ) : (
        <main ref={containerRef} className="hero">

          {phase === 'transition' && (
            <video
              ref={videoRef}
              src="/transition.mp4"
              muted
              playsInline
              className="transition-video"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setPhase('interior')}
            />
          )}

          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              <filter id="warble-tree" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence ref={treeNoiseRef} type="turbulence" baseFrequency="0.007" numOctaves="1" seed="1" result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
              <filter id="warble-subtle" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence ref={subtleNoiseRef} type="turbulence" baseFrequency="0.004" numOctaves="1" seed="1" result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
              <filter id="warble-gr" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blurred"/>
                <feTurbulence ref={grNoiseRef} type="turbulence" baseFrequency="0.018" numOctaves="1" seed="1" result="noise"/>
                <feDisplacementMap in="blurred" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
            </defs>
          </svg>

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

          {/* White flash — covers load fade-in, explore click, and video cuts */}
          <div ref={pageFlashRef} className="flash-overlay" style={{ opacity: 1 }} />

        </main>
      )}
    </>
  )
}
