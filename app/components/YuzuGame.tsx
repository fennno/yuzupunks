'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'

// ─── Asset guide ───────────────────────────────────────────────────────────────
// Drop pixel-art PNGs into /public/game/
//
//   sky.png             360×200  — scrolling background (or static)
//   ground.png           32×16   — tileable ground strip
//   player-run-1.png     24×32 ─┐
//   player-run-2.png     24×32  ├─ 4-frame run cycle
//   player-run-3.png     24×32  │
//   player-run-4.png     24×32 ─┘
//   player-jump.png      24×32  — jump pose
//   obstacle-stump.png   20×28  — tree stump
//   obstacle-rock.png    26×18  — rock
//   fruit-yuzu.png       16×16  — collectible yuzu
//
// Until real PNGs exist, coloured placeholders render automatically.
// ──────────────────────────────────────────────────────────────────────────────

const A = {
  sky:    '/game/sky.png',
  ground: '/game/ground.png',
  run:    [1,2,3,4].map(n => `/game/player-run-${n}.png`),
  jump:   '/game/player-jump.png',
  stump:  '/game/obstacle-stump.png',
  rock:   '/game/obstacle-rock.png',
  fruit:  '/game/fruit-yuzu.png',
}

// ─── Dimensions & physics ─────────────────────────────────────────────────────
const W          = 360
const H          = 200
const GROUND_Y   = 152   // y of ground surface
const PLAYER_X   = 48
const PLAYER_W   = 24
const PLAYER_H   = 32
const GRAVITY    = 1.4
const JUMP_V     = -14
const SPEED_BASE = 3
const SPAWN_MIN  = 55    // frames between obstacles
const SPAWN_MAX  = 110

// ─── Types ────────────────────────────────────────────────────────────────────
type Obstacle = { x: number; y: number; w: number; h: number; type: 'stump' | 'rock' }
type Fruit    = { x: number; y: number; w: number; h: number; collected: boolean }
type GState   = {
  running:    boolean
  dead:       boolean
  score:      number
  hiScore:    number
  speed:      number
  groundX:    number
  frameCount: number
  nextSpawn:  number
  player: {
    y: number; vy: number; jumping: boolean
    frame: number; frameTimer: number
  }
  obstacles: Obstacle[]
  fruits:    Fruit[]
}

function freshState(hi = 0): GState {
  return {
    running: false, dead: false,
    score: 0, hiScore: hi,
    speed: SPEED_BASE,
    groundX: 0, frameCount: 0,
    nextSpawn: 60,
    player: { y: GROUND_Y - PLAYER_H, vy: 0, jumping: false, frame: 0, frameTimer: 0 },
    obstacles: [], fruits: [],
  }
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────
type Imgs = Record<string, HTMLImageElement>

function img(imgs: Imgs, src: string) {
  const i = imgs[src]
  return i?.complete && i.naturalWidth ? i : null
}

function drawBg(ctx: CanvasRenderingContext2D, imgs: Imgs) {
  const i = img(imgs, A.sky)
  if (i) { ctx.drawImage(i, 0, 0, W, H); return }
  // placeholder sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#b4dfe5')
  g.addColorStop(1, '#e8f4d4')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function drawGround(ctx: CanvasRenderingContext2D, s: GState, imgs: Imgs) {
  const i = img(imgs, A.ground)
  if (i) {
    for (let x = s.groundX; x < W + 32; x += 32)
      ctx.drawImage(i, x, GROUND_Y, 32, H - GROUND_Y)
  } else {
    ctx.fillStyle = '#5c4a2a'
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y)
    ctx.fillStyle = '#7a6138'
    ctx.fillRect(0, GROUND_Y, W, 4)
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, s: GState, imgs: Imgs) {
  const src = s.player.jumping ? A.jump : A.run[s.player.frame]
  const i   = img(imgs, src)
  const px  = PLAYER_X, py = s.player.y
  if (i) { ctx.drawImage(i, px, py, PLAYER_W, PLAYER_H); return }
  // placeholder: yellow body + green "eye"
  ctx.fillStyle = '#FFF100'
  ctx.fillRect(px, py, PLAYER_W, PLAYER_H)
  ctx.fillStyle = '#00A651'
  ctx.fillRect(px + 5, py + 5, 6, 6)
  ctx.fillStyle = '#e8c200'
  ctx.fillRect(px, py + PLAYER_H - 6, PLAYER_W, 6)
}

function drawObstacles(ctx: CanvasRenderingContext2D, s: GState, imgs: Imgs) {
  for (const o of s.obstacles) {
    const i = img(imgs, o.type === 'stump' ? A.stump : A.rock)
    if (i) { ctx.drawImage(i, o.x, o.y, o.w, o.h); continue }
    ctx.fillStyle = o.type === 'stump' ? '#6d4c41' : '#9e9e9e'
    ctx.fillRect(o.x, o.y, o.w, o.h)
    ctx.fillStyle = o.type === 'stump' ? '#4e342e' : '#757575'
    ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, 4)
  }
}

function drawFruits(ctx: CanvasRenderingContext2D, s: GState, imgs: Imgs) {
  for (const f of s.fruits) {
    if (f.collected) continue
    const i = img(imgs, A.fruit)
    if (i) { ctx.drawImage(i, f.x, f.y, f.w, f.h); continue }
    // placeholder: yuzu yellow circle
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(f.x + 8, f.y + 8, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#00A651'
    ctx.fillRect(f.x + 6, f.y, 4, 5)  // stem
  }
}

function drawScore(ctx: CanvasRenderingContext2D, score: number, hi: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(0, 0, W, 18)
  ctx.fillStyle = '#FFF100'
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'right'
  ctx.fillText(`HI ${String(hi).padStart(5,'0')}  ${String(score).padStart(5,'0')}`, W - 6, 12)
}

function drawAll(ctx: CanvasRenderingContext2D, s: GState, imgs: Imgs) {
  drawBg(ctx, imgs)
  drawGround(ctx, s, imgs)
  drawObstacles(ctx, s, imgs)
  drawFruits(ctx, s, imgs)
  drawPlayer(ctx, s, imgs)
  drawScore(ctx, Math.floor(s.score), s.hiScore)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function YuzuGame({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const s         = useRef<GState>(freshState())
  const imgs      = useRef<Imgs>({})
  const [phase, setPhase] = useState<'idle' | 'running' | 'dead'>('idle')
  const [score, setScore] = useState(0)
  const flashRef  = useRef<HTMLDivElement>(null)

  // ── Preload assets ──────────────────────────────────────────────────────────
  useEffect(() => {
    const srcs = [A.sky, A.ground, A.jump, A.stump, A.rock, A.fruit, ...A.run]
    srcs.forEach(src => {
      const i = new Image(); i.src = src
      imgs.current[src] = i
    })
  }, [])

  // ── Flash fade-in ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (flashRef.current)
      gsap.to(flashRef.current, { opacity: 0, duration: 0.5, ease: 'steps(12)' })
  }, [])

  // ── GSAP ticker game loop at 12fps ──────────────────────────────────────────
  useEffect(() => {
    gsap.ticker.fps(12)
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    const tick = () => {
      const g = s.current
      if (!g.running || g.dead) {
        drawAll(ctx, g, imgs.current)
        return
      }

      // physics
      g.player.vy += GRAVITY
      g.player.y  += g.player.vy
      if (g.player.y >= GROUND_Y - PLAYER_H) {
        g.player.y       = GROUND_Y - PLAYER_H
        g.player.vy      = 0
        g.player.jumping = false
      }

      // scroll
      g.groundX = (g.groundX - g.speed) % 32
      g.speed   = SPEED_BASE + g.score / 600   // gentle ramp

      // run animation
      if (!g.player.jumping) {
        g.player.frameTimer++
        if (g.player.frameTimer >= 2) {
          g.player.frameTimer = 0
          g.player.frame = (g.player.frame + 1) % 4
        }
      }

      // spawn
      g.frameCount++
      g.nextSpawn--
      if (g.nextSpawn <= 0) {
        const type = Math.random() < 0.55 ? 'stump' : 'rock'
        const oh   = type === 'stump' ? 28 : 18
        const ow   = type === 'stump' ? 20 : 26
        g.obstacles.push({ x: W + 8, y: GROUND_Y - oh, w: ow, h: oh, type })
        if (Math.random() < 0.45)
          g.fruits.push({ x: W + 60 + Math.random() * 40, y: GROUND_Y - 52 - Math.random() * 24, w: 16, h: 16, collected: false })
        g.nextSpawn = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN)
      }

      // move objects
      g.obstacles = g.obstacles.filter(o => o.x + o.w > 0)
      g.fruits    = g.fruits.filter(f => f.x + f.w > 0)
      g.obstacles.forEach(o => { o.x -= g.speed })
      g.fruits.forEach(f => { f.x -= g.speed })

      // collision — shrink hitbox slightly for fairness
      const px = PLAYER_X + 4, py = g.player.y + 4
      const pw = PLAYER_W - 8,  ph = PLAYER_H - 6
      for (const o of g.obstacles) {
        if (px < o.x + o.w - 2 && px + pw > o.x + 2 && py < o.y + o.h - 2 && py + ph > o.y) {
          g.dead    = true
          g.hiScore = Math.max(g.hiScore, Math.floor(g.score))
          setPhase('dead')
          break
        }
      }
      if (!g.dead) {
        for (const f of g.fruits) {
          if (!f.collected && px < f.x + f.w && px + pw > f.x && py < f.y + f.h && py + ph > f.y) {
            f.collected = true
            g.score    += 50
          }
        }
        g.score += 1
        setScore(Math.floor(g.score))
      }

      drawAll(ctx, g, imgs.current)
    }

    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      gsap.ticker.fps(60)
    }
  }, [])

  // ── Jump / start ────────────────────────────────────────────────────────────
  const jump = useCallback(() => {
    const g = s.current
    if (!g.running) {
      // start
      s.current = freshState(g.hiScore)
      s.current.running = true
      setPhase('running')
      setScore(0)
      return
    }
    if (g.dead) {
      s.current = freshState(g.hiScore)
      s.current.running = true
      setPhase('running')
      setScore(0)
      return
    }
    if (!g.player.jumping) {
      g.player.vy      = JUMP_V
      g.player.jumping = true
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jump])

  const handleExit = () => {
    if (!flashRef.current) return
    gsap.to(flashRef.current, {
      opacity: 1, duration: 0.4, ease: 'steps(12)', onComplete: onExit,
    })
  }

  return (
    <div className="game-wrap">
      <div ref={flashRef} className="flash-overlay" />

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="game-canvas"
        onClick={jump}
        onTouchStart={e => { e.preventDefault(); jump() }}
      />

      {phase === 'idle' && (
        <div className="game-overlay">
          <p className="game-hint">TAP TO START</p>
        </div>
      )}

      {phase === 'dead' && (
        <div className="game-overlay">
          <p className="game-hint">GAME OVER</p>
          <p className="game-hint" style={{ fontSize: '0.7em', marginTop: '0.2em' }}>
            SCORE {score}
          </p>
          <p className="game-hint" style={{ fontSize: '0.6em', marginTop: '0.5em', opacity: 0.7 }}>
            TAP TO RETRY
          </p>
        </div>
      )}

      <button className="interior-back" onClick={handleExit}>← Back</button>
    </div>
  )
}
