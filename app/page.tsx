'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import InteriorScene from './components/InteriorScene'

gsap.registerPlugin(CustomEase)
CustomEase.create('snap',    '.22,.49,0,.96')

type Phase = 'loading' | 'hero' | 'transition' | 'interior'

const LAYER_SRCS = [
  '/layers/far-bg.png',
  '/layers/mid-bg.png',
  '/layers/tree.png',
  '/layers/fg.png',
  '/layers/gr.png',
  '/logo.png',
]

export default function Home() {
  const [phase, setPhase] = useState<Phase>('loading')

  const containerRef      = useRef<HTMLDivElement>(null)
  const videoRef          = useRef<HTMLVideoElement>(null)
  const flashRef          = useRef<HTMLDivElement>(null)
  const flashStartedRef   = useRef(false)
  const treeNoiseRef      = useRef<SVGFETurbulenceElement>(null)
  const subtleNoiseRef    = useRef<SVGFETurbulenceElement>(null)
  const grNoiseRef        = useRef<SVGFETurbulenceElement>(null)
  const orientationRef    = useRef<((e: DeviceOrientationEvent) => void) | null>(null)

  // ── Preload all images before showing anything ─────────────────────────────
  useEffect(() => {
    Promise.all(LAYER_SRCS.map(src => new Promise<void>(resolve => {
      const img = new Image()
      img.onload  = () => resolve()
      img.onerror = () => resolve()  // don't block on missing files
      img.src = src
    }))).then(() => setPhase('hero'))
  }, [])

  // ── Hero animations ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'hero') return

    gsap.ticker.fps(12)
    const isMobile = window.matchMedia('(pointer: coarse)').matches

    const ctx = gsap.context(() => {
      // Set initial positions immediately — prevents FOUC before timeline fires
      gsap.set('.layers',           { scale: 1.8, yPercent: -3 })
      gsap.set('.layer-far',        { yPercent: 8 })
      gsap.set('.layer-tree',       { scale: 1.2, yPercent: -10 })
      gsap.set('.layer-mid',        { yPercent: 10 })
      gsap.set('.layer-gr',         { opacity: 0 })
      gsap.set('.logo, .buttons',   { opacity: 0, scale: 0.92 })

      const tl = gsap.timeline()

      // all layers reach canonical rest within 5s — clean base for transition
      tl.to('.layers',     { scale: 1.0, yPercent: -28, duration: 5,   ease: 'snap' }, 0)
      tl.to('.layer-far',  { yPercent: 0,               duration: 5,   ease: 'snap' }, 0)
      tl.to('.layer-tree', { scale: 1.0, yPercent: 0,   duration: 4,   ease: 'snap' }, 0)
      tl.to('.layer-mid',  { yPercent: 0,                duration: 0.3, ease: 'snap' }, 0)

      tl.fromTo('.layer-gr',
        { opacity: 0 },
        { opacity: 0.5, duration: 6, ease: 'snap' },
        1
      )

      tl.to('.logo, .buttons', { opacity: 1, scale: 1, duration: 1.2, ease: 'snap' }, 3.5)

    }, containerRef)

    // ── Warble seed animation — desktop only (too expensive on mobile GPUs) ──
    if (!isMobile) {
      if (treeNoiseRef.current)
        gsap.to(treeNoiseRef.current,   { attr: { seed: 4 }, duration: 2.66, repeat: -1, ease: 'steps(4)', yoyo: true })
      if (subtleNoiseRef.current)
        gsap.to(subtleNoiseRef.current, { attr: { seed: 4 }, duration: 2,    repeat: -1, ease: 'steps(4)', yoyo: true })
      if (grNoiseRef.current)
        gsap.to(grNoiseRef.current,     { attr: { seed: 6 }, duration: 1.6,  repeat: -1, ease: 'steps(4)', yoyo: true })
    }

    // god ray opacity flicker — cheap, fine on mobile
    gsap.to('.layer-gr', { opacity: 0.3, duration: 1.2, repeat: -1, ease: 'steps(8)', yoyo: true, delay: 7 })

    // logo + button shake
    gsap.to('.logo', { x: 0.5, y: 0.4, rotation: 0.3, duration: 0.66, repeat: -1, ease: 'steps(1)', yoyo: true, delay: 3.7 })
    gsap.to('.btn',  { x: 0.5, y: 0.4, rotation: 0.3, duration: 0.66, repeat: -1, ease: 'steps(1)', yoyo: true, delay: 3.7, stagger: 0.15 })

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
        try {
          const res = await (DeviceOrientationEvent as any).requestPermission()
          if (res === 'granted') window.addEventListener('deviceorientation', handleOrientation)
        } catch (_) {}
      } else {
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }
    document.addEventListener('touchstart', setupGyro, { once: true })

    return () => {
      ctx.revert()
      gsap.ticker.fps(60)
      if (orientationRef.current) window.removeEventListener('deviceorientation', orientationRef.current)
    }
  }, [phase])

  // ── Play transition video when phase flips to 'transition' ─────────────────
  useEffect(() => {
    if (phase !== 'transition' || !videoRef.current) return
    videoRef.current.play().catch(() => setPhase('interior'))
  }, [phase])

  // ── Transition video flash handler ──────────────────────────────────────────
  const handleTimeUpdate = () => {
    const vid = videoRef.current
    const flash = flashRef.current
    if (!vid || !flash || flashStartedRef.current) return
    const timeLeft = vid.duration - vid.currentTime
    if (timeLeft <= 2) {
      flashStartedRef.current = true
      gsap.to(flash, { opacity: 1, duration: 2, ease: 'steps(24)' })
    }
  }

  // ── Explore handler ─────────────────────────────────────────────────────────
  const enterInterior = () => {
    if (orientationRef.current) window.removeEventListener('deviceorientation', orientationRef.current)
    gsap.to('.ui', { opacity: 0, duration: 0.3 })
    setTimeout(() => setPhase('transition'), 300)
  }

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-pulse" />
      </div>
    )
  }

  // ── Interior ────────────────────────────────────────────────────────────────
  if (phase === 'interior') {
    return <InteriorScene onExit={() => setPhase('hero')} />
  }

  // ── Hero (+ transition video overlay) ──────────────────────────────────────
  return (
    <main ref={containerRef} className="hero">

      {phase === 'transition' && (
        <>
          <video
            ref={videoRef}
            src="/transition.mp4"
            muted
            playsInline
            className="transition-video"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setPhase('interior')}
          />
          <div ref={flashRef} className="flash-overlay" style={{ opacity: 0 }} />
        </>
      )}

      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {/* Dither — 4-level posterization, desktop only (applied via CSS) */}
          <filter id="dither" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 0.33 0.66 1"/>
              <feFuncG type="discrete" tableValues="0 0.33 0.66 1"/>
              <feFuncB type="discrete" tableValues="0 0.33 0.66 1"/>
            </feComponentTransfer>
          </filter>
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

    </main>
  )
}
