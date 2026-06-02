'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)
CustomEase.create('snap', '.22,.49,0,.96')

export default function Home() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const treeNoiseRef   = useRef<SVGFETurbulenceElement>(null)
  const subtleNoiseRef = useRef<SVGFETurbulenceElement>(null)

  useEffect(() => {
    gsap.ticker.fps(12)

    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // intro: 3s duration — snappier front half via bezier steep start
      tl.fromTo('.layers',
        { scale: 1.8, yPercent: -3 },
        { scale: 1.08, yPercent: -20, duration: 3, ease: 'snap' },
        0
      )

      tl.fromTo('.layer-far',  { yPercent: 8  }, { yPercent: 0, duration: 3,   ease: 'snap' }, 0)
      tl.fromTo('.layer-tree', { yPercent: 6  }, { yPercent: 0, duration: 4.5, ease: 'snap' }, 0)
      tl.fromTo('.layer-mid',  { yPercent: 10 }, { yPercent: 0, duration: 0.3, ease: 'snap' }, 0)

      // god rays: start at t=1, fade over 6s, half opacity
      tl.fromTo('.layer-gr',
        { opacity: 0 },
        { opacity: 0.5, duration: 6, ease: 'snap' },
        1
      )

      // logo at t=2.5
      tl.fromTo('.logo',
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 1.2, ease: 'snap' },
        2.5
      )

      // ambient slow zoom out
      tl.to('.layers', {
        scale: 0.88,
        duration: 18,
        ease: 'snap',
      }, 3)

    }, containerRef)

    // warble: tree scale 3, bg scale 1, lower freq
    if (treeNoiseRef.current) {
      gsap.to(treeNoiseRef.current, {
        attr: { seed: 4 },
        duration: 1.33,
        repeat: -1,
        ease: 'steps(4)',
        yoyo: true,
      })
    }
    if (subtleNoiseRef.current) {
      gsap.to(subtleNoiseRef.current, {
        attr: { seed: 4 },
        duration: 2,
        repeat: -1,
        ease: 'steps(4)',
        yoyo: true,
      })
    }

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
