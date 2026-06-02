'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

// ─── Node graph ────────────────────────────────────────────────────────────────
// Each node = one camera position render from Blender.
// Drop PNGs into /public/interior/ and reference them here.
// connections: which node id lives in each compass direction (null = no exit)

type NodeId = string

interface SceneNode {
  image: string
  label?: string   // optional debug label
  connections: {
    north?: NodeId
    east?:  NodeId
    south?: NodeId
    west?:  NodeId
  }
}

// ─── Naming convention ─────────────────────────────────────────────────────────
// Files live at /public/interior/explore-N.png
// N is a sequential integer — just the next available number, no semantic meaning.
// The node graph below defines all the spatial relationships; the filename is just an ID.
//
//   explore-1.png   ← opening shot, player spawn point
//   explore-2.png   ← wherever explore-1 connects north/east/etc.
//   explore-3.png   ← and so on
//
// To add a new room:
//   1. Drop explore-N.png into /public/interior/
//   2. Add a new node entry below with the right connections
//   3. Add the matching reverse connection in the node you're linking from
//
// connections: north/south/east/west describe the camera move direction,
// matching the arrow the player taps. They don't have to be literal compass — just
// pick a consistent direction for each move and mirror it in the target node.
// ──────────────────────────────────────────────────────────────────────────────

const NODES: Record<NodeId, SceneNode> = {
  'explore-1': {
    image:  '/interior/explore-1.png',
    label:  'explore-1',
    connections: {
      // add connections when you have more renders, e.g.:
      // north: 'explore-2',
    },
  },
}

const START_NODE: NodeId = 'explore-1'

// ─── Arrow directions ──────────────────────────────────────────────────────────
const ARROWS: { dir: keyof SceneNode['connections']; label: string; style: React.CSSProperties }[] = [
  { dir: 'north', label: '↑', style: { top: '38%',  left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'south', label: '↓', style: { bottom: '20%', left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'east',  label: '→', style: { top: '50%',  right: '8%',  transform: 'translateY(-50%)' } },
  { dir: 'west',  label: '←', style: { top: '50%',  left: '8%',   transform: 'translateY(-50%)' } },
]

// ─── Component ────────────────────────────────────────────────────────────────
interface InteriorSceneProps {
  onExit: () => void   // called when user clicks back to grove
}

export default function InteriorScene({ onExit }: InteriorSceneProps) {
  const [nodeId, setNodeId]   = useState<NodeId>(START_NODE)
  const [entering, setEntering] = useState(true)
  const sceneRef  = useRef<HTMLDivElement>(null)
  const imageRef  = useRef<HTMLImageElement>(null)
  const flashRef  = useRef<HTMLDivElement>(null)

  const node = NODES[nodeId]

  // fade in on mount + flash fade-out
  useEffect(() => {
    if (!sceneRef.current) return
    gsap.fromTo(sceneRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out', onComplete: () => setEntering(false) }
    )
    // white flash fades out over first 2s (24 frames @ 12fps)
    if (flashRef.current) {
      gsap.to(flashRef.current, { opacity: 0, duration: 2, ease: 'steps(24)' })
    }
  }, [])

  const navigate = (targetId: NodeId) => {
    if (!imageRef.current) return
    gsap.to(imageRef.current, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        setNodeId(targetId)
        gsap.to(imageRef.current, { opacity: 1, duration: 0.35, ease: 'power2.out' })
      },
    })
  }

  const handleExit = () => {
    if (!flashRef.current) return
    // Flash to white then call onExit — hero will mount with its own white overlay and bezier it out
    gsap.to(flashRef.current, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: onExit,
    })
  }

  return (
    <div ref={sceneRef} className="interior" style={{ opacity: 0 }}>

      {/* white flash overlay — fades out from white on enter */}
      <div ref={flashRef} className="flash-overlay" />

      {/* scene image */}
      <img
        ref={imageRef}
        src={node.image}
        className="interior-scene-img"
        alt={node.label ?? nodeId}
      />

      {/* navigation arrows */}
      {ARROWS.map(({ dir, label, style }) => {
        const target = node.connections[dir]
        if (!target) return null
        return (
          <button
            key={dir}
            className="nav-arrow"
            style={style}
            onClick={() => navigate(target)}
            aria-label={`Go ${dir}`}
          >
            {label}
          </button>
        )
      })}

      {/* back button */}
      <button className="interior-back" onClick={handleExit}>
        ← Back
      </button>

      {/* debug: current node label */}
      {process.env.NODE_ENV === 'development' && (
        <div className="interior-debug">{node.label ?? nodeId}</div>
      )}

    </div>
  )
}
