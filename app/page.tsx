'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)
CustomEase.create('snap',    '.22,.49,0,.96')
CustomEase.create('zoomOut', '.6,.02,.95,.99')

export default function Home() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const treeNoiseRef   = useRef<SVGFETurbulenceElement>(null)
  const subtleNoiseRef = useRef<SVGFETurbulenceElement>(null)
  const grNoiseRef     = useRef<SVGFETurbulenceElement>(null)

  useEffect(() => {
    gsap.ticker.fps(12)

    // mobile detection — SVG filter seed animation is too expensive on mobile GPUs
    const isMobile = window.matchMedia('(pointer: coarse)').matches

    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      tl.fromTo('.layers',
        { scale: 1.8, yPercent: -3 },
        { scale: 1.08, yPercent: -20, duration: 3, ease: 'snap' },
        0
      )

      tl.fromTo('.layer-far', { yPercent: 8 }, { yPercent: 0, duration: 3, ease: 'snap' }, 0)

      tl.fromTo('.layer-tree',
        { scale: 1.2, yPercent: -10 },
        { scale: 1.0, yPercent: 0, duration: 2.5, ease: 'snap' },
        0
      )

      tl.fromTo('.layer-mid', { yPercent: 10 }, { yPercent: 0, duration: 0.3, ease: 'snap' }, 0)

      tl.fromTo('.layer-gr',
        { opacity: 0 },
        { opacity: 0.5, duration: 6, ease: 'snap' },
        1
      )

      tl.fromTo('.logo, .buttons',
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 1.2, ease: 'snap' },
        2.5
      )

      tl.to('.layers', {
        scale: 0.88,
        duration: 18,
        ease: 'zoomOut',
      }, 3)

    }, containerRef)

    // warble seed animation — desktop only, too expensive on mobile
    if (!isMobile) {
      if (treeNoiseRef.current) {
        gsap.to(treeNoiseRef.current, {
          attr: { seed: 4 }, duration: 2.66, repeat: -1, ease: 'steps(4)', yoyo: true,
        })
      }
      if (subtleNoiseRef.current) {
        gsap.to(subtleNoiseRef.current, {
          attr: { seed: 4 }, duration: 2, repeat: -1, ease: 'steps(4)', yoyo: true,
        })
      }
      if (grNoiseRef.current) {
        gsap.to(grNoiseRef.current, {
          attr: { seed: 6 }, duration: 1.6, repeat: -1, ease: 'steps(4)', yoyo: true,
        })
      }
    }

    // god ray flicker (opacity only — cheap, fine on mobile)
    gsap.to('.layer-gr', {
      opacity: 0.3,
      duration: 2.5,
      repeat: -1,
      ease: 'steps(5)',
      yoyo: true,
      delay: 7,
    })

    // logo + button shake
    gsap.to('.logo', {
      x: 0.5, y: 0.4, rotation: 0.3,
      duration: 0.66,
      repeat: -1,
      ease: 'steps(1)',
      yoyo: true,
      delay: 3.7,
    })
    gsap.to('.btn', {
      x: 0.5, y: 0.4, rotation: 0.3,
      duration: 0.66,
      repeat: -1,
      ease: 'steps(1)',
      yoyo: true,
      delay: 3.7,
      stagger: 0.15,
    })

    // gyro parallax — mobile only
    // quickTo creates a pre-configured tween setter, much cheaper than gsap.to on every event
    const farX  = gsap.quickTo('.layer-far',  'x', { duration: 0.8, ease: 'power2.out' })
    const farY  = gsap.quickTo('.layer-far',  'y', { duration: 0.8, ease: 'power2.out' })
    const midX  = gsap.quickTo('.layer-mid',  'x', { duration: 0.8, ease: 'power2.out' })
    const midY  = gsap.quickTo('.layer-mid',  'y', { duration: 0.8, ease: 'power2.out' })
    const treeX = gsap.quickTo('.layer-tree', 'x', { duration: 0.8, ease: 'power2.out' })
    const treeY = gsap.quickTo('.layer-tree', 'y', { duration: 0.8, ease: 'power2.out' })
    const fgX   = gsap.quickTo('.layer-fg',   'x', { duration: 0.8, ease: 'power2.out' })
    const fgY   = gsap.quickTo('.layer-fg',   'y', { duration: 0.8, ease: 'power2.out' })

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = (e.gamma ?? 0) / 30         // left-right tilt, -1..1
      const y = ((e.beta ?? 0) - 45) / 30   // fwd-back tilt normalized around reading angle

      farX(x * 4);   farY(y * 3)
      midX(x * 7);   midY(y * 5)
      treeX(x * 11); treeY(y * 8)
      fgX(x * 16);   fgY(y * 11)
    }

    const setupGyro = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        // iOS 13+ requires permission on user gesture
        try {
          const result = await (DeviceOrientationEvent as any).requestPermission()
          if (result === 'granted') window.addEventListener('deviceorientation', handleOrientation)
        } catch (_) { /* permission denied */ }
      } else {
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }

    // trigger gyro on first touch (satisfies iOS user-gesture requirement)
    document.addEventListener('touchstart', setupGyro, { once: true })

    return () => {
      ctx.revert()
      gsap.ticker.fps(60)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  return (
    <main ref={containerRef} className="hero">

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
            <feTurbulence ref={grNoiseRef} type="turbulence" baseFrequency="0.018" numOctaves="1" seed="1" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G"/>
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
          <a href="#" className="btn">Explore</a>
        </div>
      </div>

    </main>
  )
}
