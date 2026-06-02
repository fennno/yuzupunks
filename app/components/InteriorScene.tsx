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

const NODES: Record<NodeId, SceneNode> = {
  'living-room': {
    image:  '/interior/living-room.png',
    label:  'Living Room',
    connections: {
      north: 'hallway',
      east:  'kitchen',
    },
  },
  'hallway': {
    image:  '/interior/hallway.png',
    label:  'Hallway',
    connections: {
      south: 'living-room',
      north: 'upstairs',
      east:  'bathroom',
    },
  },
  'kitchen': {
    image:  '/interior/kitchen.png',
    label:  'Kitchen',
    connections: {
      west: 'living-room',
    },
  },
  'upstairs': {
    image:  '/interior/upstairs.png',
    label:  'Upstairs',
    connections: {
      south: 'hallway',
    },
  },
  'bathroom': {
    image:  '/interior/bathroom.png',
    label:  'Bathroom',
    connections: {
      west: 'hallway',
    },
  },
}

const START_NODE: NodeId = 'living-room'

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

  const node = NODES[nodeId]

  // fade in on mount
  useEffect(() => {
    if (!sceneRef.current) return
    gsap.fromTo(sceneRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out', onComplete: () => setEntering(false) }
    )
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
