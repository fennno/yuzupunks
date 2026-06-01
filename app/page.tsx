'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // intro: start zoomed in showing top of image, pan down while zooming out
      tl.fromTo('.layers',
        { scale: 1.4, yPercent: -10 },
        { scale: 1.0, yPercent: 0, duration: 8, ease: 'steps(96)' },
        0
      )

      // logo fades in as the pan settles
      tl.fromTo('.logo',
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'steps(10)' },
        6
      )

      // ambient slow zoom-in begins after the intro lands
      tl.to('.layers', {
        scale: 1.08,
        duration: 15,
        ease: 'steps(180)',
      }, 8)

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <main ref={containerRef} className="hero">
      <div className="layers">
        <img src="/layers/far-bg.png" className="layer layer-far"  alt="" />
        <img src="/layers/mid-bg.png" className="layer layer-mid"  alt="" />
        <img src="/layers/gr.png"     className="layer layer-gr"   alt="" />
        <img src="/layers/tree.png"   className="layer layer-tree" alt="" />
        <img src="/layers/fg.png"     className="layer layer-fg"   alt="" />
      </div>

      <div className="ui">
        <img src="/logo.png" className="logo" alt="Yuzu Punks" />
      </div>
    </main>
  )
}