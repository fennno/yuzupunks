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

  // ── Entry ───────────────────────────────────────────────────────────────────
  'room-enter': {
    image: '/interior/room-enter.png',
    label: 'Room — Enter',
    connections: {
      north: 'room-middle',   // ↑ deeper into room
      east:  'upstairs-1',   // → upstairs section
      south: 'door',          // ↓ back to door
    },
  },

  'door': {
    image: '/interior/door.png',
    label: 'Door',
    connections: {
      north: 'room-enter',   // ↑ back inside
      // ← Back button exits to grove
    },
  },

  // ── Main room ───────────────────────────────────────────────────────────────
  'room-middle': {
    image: '/interior/room-middle.png',
    label: 'Room — Middle',
    connections: {
      south: 'room-enter',   // ↓ back to entry
      east:  'room-kitchen', // → kitchen
      west:  'room-table',   // ← table area
    },
  },

  'room-kitchen': {
    image: '/interior/room-kitchen.png',
    label: 'Kitchen',
    connections: {
      west: 'room-middle',   // ← back to middle
    },
  },

  // ── Table area ──────────────────────────────────────────────────────────────
  'room-table': {
    image: '/interior/room-table.png',
    label: 'Table',
    connections: {
      east:  'room-middle',  // → back to middle
      west:  'room-table-l', // ← left chair
      north: 'room-table-r', // ↑ right chair
    },
  },
  'room-table-l': {
    image: '/interior/room-table-l.png',
    label: 'Table — Left Chair',
    connections: {
      north: 'room-table-r', // ↑ other chair
      south: 'room-table',   // ↓ back to table
    },
  },
  'room-table-r': {
    image: '/interior/room-table-r.png',
    label: 'Table — Right Chair',
    connections: {
      north: 'room-table-l', // ↑ other chair
      south: 'room-table',   // ↓ back to table
    },
  },

  // ── Upstairs — north chain ───────────────────────────────────────────────
  'upstairs-1': {
    image: '/interior/upstairs-1.png',
    label: 'Upstairs 1',
    connections: {
      south: 'room-enter',   // ↓ back down to entry
      north: 'upstairs-2',   // ↑ further up
    },
  },
  'upstairs-2': {
    image: '/interior/upstairs-2.png',
    label: 'Upstairs 2',
    connections: {
      south: 'upstairs-1',   // ↓ back
      north: 'upstairs-3',   // ↑ further
    },
  },
  'upstairs-3': {
    image: '/interior/upstairs-3.png',
    label: 'Upstairs 3',
    connections: {
      south: 'upstairs-2',   // ↓ back
    },
  },

}

const START_NODE: NodeId = 'room-enter'

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
