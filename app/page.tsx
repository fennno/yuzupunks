'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)
CustomEase.create('snap',    '.22,.49,0,.96')
CustomEase.create('zoomOut', '.6,.02,.95,.99')  // very fast front, almost flat back

export default function Home() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const treeNoiseRef   = useRef<SVGFETurbulenceElement>(null)
  const subtleNoiseRef = useRef<SVGFETurbulenceElement>(null)
  const grNoiseRef     = useRef<SVGFETurbulenceElement>(null)

  useEffect(() => {
    gsap.ticker.fps(12)

    const ctx = gsap.context(() => {
      // center mid-bg via GSAP so the offset survives GSAP's transform takeover
      gsap.set('.layer-mid', { xPercent: -50 })

      const tl = gsap.timeline()

      // main pan + zoom
      tl.fromTo('.layers',
        { scale: 1.8, yPercent: -3 },
        { scale: 1.08, yPercent: -20, duration: 3, ease: 'snap' },
        0
      )

      // far layer parallax lag
      tl.fromTo('.layer-far', { yPercent: 8 }, { yPercent: 0, duration: 3, ease: 'snap' }, 0)

      // tree: starts scaled up and high, lands at natural position — sells the zoom depth
      tl.fromTo('.layer-tree',
        { scale: 1.4, yPercent: -18 },
        { scale: 1.0, yPercent:   0, duration: 4.5, ease: 'snap' },
        0
      )

      // mid-bg snaps up from lower in first 0.3s
      tl.fromTo('.layer-mid', { yPercent: 10 }, { yPercent: 0, duration: 0.3, ease: 'snap' }, 0)

      // god rays: fade in over 6s at half opacity
      tl.fromTo('.layer-gr',
        { opacity: 0 },
        { opacity: 0.5, duration: 6, ease: 'snap' },
        1
      )

      // logo
      tl.fromTo('.logo',
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 1.2, ease: 'snap' },
        2.5
      )

      // ambient zoom out — fast front, almost imperceptible back half
      tl.to('.layers', {
        scale: 0.88,
        duration: 18,
        ease: 'zoomOut',
      }, 3)

    }, containerRef)

    // warble: tree
    if (treeNoiseRef.current) {
      gsap.to(treeNoiseRef.current, {
        attr: { seed: 4 }, duration: 1.33, repeat: -1, ease: 'steps(4)', yoyo: true,
      })
    }
    // warble: mid + fg
    if (subtleNoiseRef.current) {
      gsap.to(subtleNoiseRef.current, {
        attr: { seed: 4 }, duration: 2, repeat: -1, ease: 'steps(4)', yoyo: true,
      })
    }
    // warble + flicker: god rays
    if (grNoiseRef.current) {
      gsap.to(grNoiseRef.current, {
        attr: { seed: 6 }, duration: 1.6, repeat: -1, ease: 'steps(4)', yoyo: true,
      })
    }
    // god ray opacity flicker — starts after fade-in settles (~t=7)
    gsap.to('.layer-gr', {
      opacity: 0.3,
      duration: 2.5,
      repeat: -1,
      ease: 'steps(5)',
      yoyo: true,
      delay: 7,
    })

    // logo: subtle 3fps shake
    gsap.to('.logo', {
      x: 1, y: 0.8,
      duration: 0.33,
      repeat: -1,
      ease: 'steps(1)',
      yoyo: true,
      delay: 3.7,
    })

    return () => {
      ctx.revert()
      gsap.ticker.fps(60)
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
      </div>
    </main>
  )
}
