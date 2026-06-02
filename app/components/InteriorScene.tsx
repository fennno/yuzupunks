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
// Each node ID maps 1:1 to a PNG file at /public/interior/[id].png
//
// ID format:  [room]-[facing]
//   room    = kebab-case room name  (entry, main, loft, kitchen, hall, bath, etc.)
//   facing  = n | s | e | w        (camera direction — omit if only one view per room)
//
// Examples:
//   entry.png          — opening shot, player spawn
//   main-n.png         — main room looking north
//   main-e.png         — main room looking east
//   loft-s.png         — loft looking south (down the stairs)
//   kitchen.png        — kitchen, single view
//
// Drop renders into /public/interior/ and add nodes below.
// connections mirror the physical layout — north in one node → south in the target.
// ──────────────────────────────────────────────────────────────────────────────

const NODES: Record<NodeId, SceneNode> = {
  // ── Opening shot — the first thing the player sees ──────────────────────────
  'entry': {
    image:  '/interior/entry.png',   // ← your current placeholder goes here
    label:  'Entry',
    connections: {
      north: 'main-n',
    },
  },

  // ── Scaffold nodes — swap image paths as Blender renders come in ────────────
  'main-n': {
    image:  '/interior/main-n.png',
    label:  'Main Room (N)',
    connections: {
      south: 'entry',
      east:  'kitchen',
      north: 'loft-s',
    },
  },
  'kitchen': {
    image:  '/interior/kitchen.png',
    label:  'Kitchen',
    connections: {
      west: 'main-n',
    },
  },
  'loft-s': {
    image:  '/interior/loft-s.png',
    label:  'Loft',
    connections: {
      south: 'main-n',
    },
  },
}

const START_NODE: NodeId = 'entry'

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
    if (!sceneRef.current) return
    gsap.to(sceneRef.current, {
      opacity: 0,
      duration: 0.5,
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
