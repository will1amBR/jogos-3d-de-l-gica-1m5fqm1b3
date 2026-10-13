import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Footprints,
  HelpCircle,
  Zap,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

interface Obstacle {
  id: number
  x: number
  y: number
  width: number
  height: number
  type: 'crate' | 'rock' | 'fence'
}

interface CollectibleItem {
  id: number
  x: number
  y: number
  radius: number
  type: 'golden_soja' | 'wheat_coin'
  collected: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  color: string
}

export default function Runner() {
  const { addReward } = useGame()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Game state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('runner_vale_highscore') || '0')
    } catch {
      return 0
    }
  })
  const [lives, setLives] = useState(3)
  const [sojaCount, setSojaCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Audio singleton
  const audioCtxRef = useRef<AudioContext | null>(null)
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx()
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    return audioCtxRef.current
  }, [])

  const playSfx = useCallback(
    (type: 'jump' | 'collect' | 'hit' | 'gameover') => {
      if (!soundEnabled) return
      try {
        const ctx = getAudioContext()
        if (!ctx) return
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        if (type === 'jump') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(320, now)
          osc.frequency.exponentialRampToValueAtTime(680, now + 0.12)
          gain.gain.setValueAtTime(0.09, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
          osc.start(now)
          osc.stop(now + 0.12)
        } else if (type === 'collect') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(587, now)
          osc.frequency.setValueAtTime(880, now + 0.06)
          gain.gain.setValueAtTime(0.1, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
          osc.start(now)
          osc.stop(now + 0.15)
        } else if (type === 'hit') {
          osc.type = 'square'
          osc.frequency.setValueAtTime(180, now)
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.15)
          gain.gain.setValueAtTime(0.14, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
          osc.start(now)
          osc.stop(now + 0.15)
        } else if (type === 'gameover') {
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(300, now)
          osc.frequency.linearRampToValueAtTime(100, now + 0.4)
          gain.gain.setValueAtTime(0.15, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
          osc.start(now)
          osc.stop(now + 0.4)
        }
      } catch {
        // audio safe
      }
    },
    [soundEnabled, getAudioContext],
  )

  // Player physics
  const GROUND_Y = 360
  const playerRef = useRef({
    x: 80,
    y: GROUND_Y,
    vy: 0,
    width: 28,
    height: 38,
    isGrounded: true,
    jumpCount: 0,
    maxJumps: 2, // Double jump enabled!
    legPhase: 0,
    invincibleTimer: 0,
  })

  // Game loop entity refs
  const obstaclesRef = useRef<Obstacle[]>([])
  const collectiblesRef = useRef<CollectibleItem[]>([])
  const particlesRef = useRef<Particle[]>([])
  const nextObstacleTimeRef = useRef(0)
  const nextItemTimeRef = useRef(0)
  const entityIdRef = useRef(1)
  const speedRef = useRef(240) // pixels per sec
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const sojaRef = useRef(0)

  // Start / restart game
  const startGame = () => {
    setScore(0)
    scoreRef.current = 0
    setLives(3)
    livesRef.current = 3
    setSojaCount(0)
    sojaRef.current = 0
    speedRef.current = 240
    setIsPlaying(true)
    setIsGameOver(false)
    obstaclesRef.current = []
    collectiblesRef.current = []
    particlesRef.current = []
    playerRef.current = {
      x: 80,
      y: GROUND_Y,
      vy: 0,
      width: 28,
      height: 38,
      isGrounded: true,
      jumpCount: 0,
      maxJumps: 2,
      legPhase: 0,
      invincibleTimer: 0,
    }
    nextObstacleTimeRef.current = 0
    nextItemTimeRef.current = 0
  }

  // Jump action (single and double jump)
  const handleJump = useCallback(() => {
    if (!isPlaying || isGameOver) {
      startGame()
      return
    }

    const p = playerRef.current
    if (p.jumpCount < p.maxJumps) {
      p.vy = p.jumpCount === 0 ? -480 : -420 // responsive snappy jumps
      p.jumpCount += 1
      p.isGrounded = false
      playSfx('jump')

      // Jump dust puff
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * 16,
          y: p.y,
          vx: (Math.random() - 0.5) * 60,
          vy: -20 - Math.random() * 30,
          radius: 2.5,
          alpha: 0.8,
          color: '#E0D8CB',
        })
      }
    }
  }, [isPlaying, isGameOver, playSfx])

  // Keyboard space / up to jump
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        handleJump()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleJump])

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = performance.now()
    let bgOffset = 0
    let hillOffset = 0
    let groundOffset = 0

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000)
      lastTime = time

      const w = canvas.width
      const h = canvas.height

      // Increase speed gradually over time
      if (isPlaying && !isGameOver) {
        speedRef.current = Math.min(480, 240 + scoreRef.current * 0.12)
        scoreRef.current += Math.round(dt * 15)
        setScore(scoreRef.current)
      }

      const spd = isPlaying && !isGameOver ? speedRef.current : 60

      // Scroll offsets
      bgOffset = (bgOffset + spd * 0.15 * dt) % w
      hillOffset = (hillOffset + spd * 0.4 * dt) % w
      groundOffset = (groundOffset + spd * dt) % 40

      // 1. DRAW BACKGROUND (GOLDEN VALLEY SKY & ROLLING HILLS)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
      skyGrad.addColorStop(0, '#FFF9C4') // warm golden dawn
      skyGrad.addColorStop(0.5, '#FFE082')
      skyGrad.addColorStop(1, '#E8F5E9')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Distant rolling hills (parallax layer 1)
      ctx.fillStyle = '#C8E6C9'
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y)
      for (let x = 0; x <= w + 60; x += 30) {
        const hillY = GROUND_Y - 90 + Math.sin((x + hillOffset * 0.5) * 0.015) * 25
        ctx.lineTo(x, hillY)
      }
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.fill()

      // Near hills (parallax layer 2)
      ctx.fillStyle = '#A5D6A7'
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y)
      for (let x = 0; x <= w + 40; x += 20) {
        const hillY = GROUND_Y - 45 + Math.sin((x + hillOffset) * 0.02) * 15
        ctx.lineTo(x, hillY)
      }
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.fill()

      // 2. DRAW GROUND ROADWAY
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, h)
      groundGrad.addColorStop(0, '#795548')
      groundGrad.addColorStop(0.15, '#5D4037')
      groundGrad.addColorStop(1, '#3E2723')
      ctx.fillStyle = groundGrad
      ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y)

      // Lush grass stripe
      ctx.fillStyle = '#8BC34A'
      ctx.fillRect(0, GROUND_Y - 4, w, 8)

      // Cobblestone dashes
      ctx.fillStyle = '#D7CCC8'
      for (let x = -groundOffset; x < w; x += 40) {
        ctx.fillRect(x, GROUND_Y + 12, 22, 4)
      }

      // 3. SPAWN OBSTACLES & SOJAS
      if (isPlaying && !isGameOver) {
        if (time > nextObstacleTimeRef.current) {
          const delay = Math.max(900, 1900 - Math.min(scoreRef.current * 0.8, 900))
          nextObstacleTimeRef.current = time + delay + Math.random() * 500

          const r = Math.random()
          let type: 'crate' | 'rock' | 'fence' = 'crate'
          let width = 24
          let height = 28
          if (r > 0.65) {
            type = 'rock'
            width = 30
            height = 24
          } else if (r > 0.35) {
            type = 'fence'
            width = 20
            height = 36
          }

          obstaclesRef.current.push({
            id: ++entityIdRef.current,
            x: w + 20,
            y: GROUND_Y - height,
            width,
            height,
            type,
          })
        }

        // Spawn golden sojas and wheat coins
        if (time > nextItemTimeRef.current) {
          nextItemTimeRef.current = time + 700 + Math.random() * 800
          const itemY = Math.random() > 0.4 ? GROUND_Y - 25 : GROUND_Y - 75 // some on ground, some mid-air!
          collectiblesRef.current.push({
            id: ++entityIdRef.current,
            x: w + 20,
            y: itemY,
            radius: 12,
            type: Math.random() > 0.3 ? 'golden_soja' : 'wheat_coin',
            collected: false,
          })
        }

        // 4. UPDATE PLAYER PHYSICS
        const p = playerRef.current
        const gravity = 1200 // gravity
        p.vy += gravity * dt
        p.y += p.vy * dt

        if (p.y >= GROUND_Y) {
          p.y = GROUND_Y
          p.vy = 0
          p.isGrounded = true
          p.jumpCount = 0
        }

        if (p.isGrounded) {
          p.legPhase += dt * (spd * 0.05)
        }

        if (p.invincibleTimer > 0) {
          p.invincibleTimer -= dt
        }

        // 5. UPDATE OBSTACLES & CHECK HIT
        const activeObstacles: Obstacle[] = []
        for (const obs of obstaclesRef.current) {
          obs.x -= spd * dt

          // Check AABB collision with player
          const px = p.x - p.width / 2
          const py = p.y - p.height
          const isColliding =
            px < obs.x + obs.width &&
            px + p.width > obs.x &&
            py < obs.y + obs.height &&
            py + p.height > obs.y

          if (isColliding && p.invincibleTimer <= 0) {
            playSfx('hit')
            livesRef.current -= 1
            setLives(livesRef.current)
            p.invincibleTimer = 1.5 // 1.5s invincibility

            // Hit burst particles
            for (let i = 0; i < 14; i++) {
              particlesRef.current.push({
                x: p.x,
                y: p.y - p.height / 2,
                vx: (Math.random() - 0.5) * 140,
                vy: (Math.random() - 0.5) * 140,
                radius: 3,
                alpha: 1,
                color: '#FF5722',
              })
            }

            if (livesRef.current <= 0) {
              setIsGameOver(true)
              setIsPlaying(false)
              playSfx('gameover')

              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current)
                try {
                  localStorage.setItem('runner_vale_highscore', String(scoreRef.current))
                } catch {
                  // safe
                }
              }

              // Give XP and Coins
              const coinsEarned = Math.max(
                15,
                Math.round(scoreRef.current * 0.3) + sojaRef.current * 4,
              )
              const xpEarned = Math.max(
                25,
                Math.round(scoreRef.current * 0.4) + sojaRef.current * 5,
              )
              addReward(xpEarned, coinsEarned, `Corrida do Vale: ${scoreRef.current} pontos! 🏃`)
            }
          }

          if (obs.x + obs.width > -20) {
            activeObstacles.push(obs)
          }
        }
        obstaclesRef.current = activeObstacles

        // 6. UPDATE COLLECTIBLES
        const activeCollectibles: CollectibleItem[] = []
        for (const it of collectiblesRef.current) {
          it.x -= spd * dt

          // Check collect distance
          const dist = Math.hypot(p.x - it.x, p.y - p.height / 2 - it.y)
          if (!it.collected && dist < it.radius + 18) {
            it.collected = true
            playSfx('collect')
            sojaRef.current += 1
            setSojaCount(sojaRef.current)
            scoreRef.current += 40
            setScore(scoreRef.current)

            // Sparkle particles
            for (let i = 0; i < 8; i++) {
              particlesRef.current.push({
                x: it.x,
                y: it.y,
                vx: (Math.random() - 0.5) * 80,
                vy: (Math.random() - 0.5) * 80,
                radius: 2.5,
                alpha: 1,
                color: it.type === 'golden_soja' ? '#FFD54F' : '#8BC34A',
              })
            }
          }

          if (!it.collected && it.x > -20) {
            activeCollectibles.push(it)
          }
        }
        collectiblesRef.current = activeCollectibles
      }

      // 7. DRAW COLLECTIBLES
      for (const it of collectiblesRef.current) {
        if (it.collected) continue
        const bob = Math.sin(time * 0.006 + it.x) * 4
        ctx.font = '22px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(it.type === 'golden_soja' ? '🌱' : '🌾', it.x, it.y + bob)
      }

      // 8. DRAW OBSTACLES
      for (const obs of obstaclesRef.current) {
        if (obs.type === 'crate') {
          ctx.fillStyle = '#8D6E63'
          ctx.strokeStyle = '#4E342E'
          ctx.lineWidth = 2
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height)
          // X pattern
          ctx.beginPath()
          ctx.moveTo(obs.x, obs.y)
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height)
          ctx.moveTo(obs.x + obs.width, obs.y)
          ctx.lineTo(obs.x, obs.y + obs.height)
          ctx.stroke()
        } else if (obs.type === 'rock') {
          ctx.fillStyle = '#78909C'
          ctx.strokeStyle = '#37474F'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        } else {
          // Fence
          ctx.fillStyle = '#A1887F'
          ctx.strokeStyle = '#5D4037'
          ctx.lineWidth = 2
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height)
          ctx.fillRect(obs.x - 3, obs.y + 8, obs.width + 6, 6)
          ctx.fillRect(obs.x - 3, obs.y + 22, obs.width + 6, 6)
        }
      }

      // 9. DRAW PARTICLES
      const activeParticles: Particle[] = []
      for (const pt of particlesRef.current) {
        pt.x += pt.vx * dt
        pt.y += pt.vy * dt
        pt.alpha -= dt * 2.2
        if (pt.alpha > 0) {
          ctx.save()
          ctx.globalAlpha = pt.alpha
          ctx.fillStyle = pt.color
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
          activeParticles.push(pt)
        }
      }
      particlesRef.current = activeParticles

      // 10. DRAW PLAYER CHARACTER (FARMER RUNNER)
      const p = playerRef.current
      ctx.save()
      ctx.translate(p.x, p.y)

      // Invincible flash
      if (p.invincibleTimer > 0 && Math.floor(time / 80) % 2 === 0) {
        ctx.globalAlpha = 0.4
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Character body
      const bobY = p.isGrounded ? Math.sin(p.legPhase * 2) * 2 : 0

      // Legs
      const leg1 = p.isGrounded ? Math.sin(p.legPhase) * 10 : 8
      const leg2 = p.isGrounded ? -Math.sin(p.legPhase) * 10 : -4
      ctx.strokeStyle = '#3E2723'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-4, -12)
      ctx.lineTo(-4 + leg1 * 0.6, 0)
      ctx.moveTo(4, -12)
      ctx.lineTo(4 + leg2 * 0.6, 0)
      ctx.stroke()

      // Torso / Dungarees (verde folha)
      ctx.fillStyle = '#8BC34A'
      ctx.strokeStyle = '#558B2F'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(-8, -26 + bobY, 16, 16, 3)
      ctx.fill()
      ctx.stroke()

      // Head
      ctx.fillStyle = '#FFCC80'
      ctx.beginPath()
      ctx.arc(0, -32 + bobY, 7, 0, Math.PI * 2)
      ctx.fill()

      // Straw hat
      ctx.fillStyle = '#FFB74D'
      ctx.beginPath()
      ctx.ellipse(0, -36 + bobY, 12, 4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, -38 + bobY, 6, Math.PI, 0)
      ctx.fill()

      // Backpack
      ctx.fillStyle = '#8D6E63'
      ctx.fillRect(-12, -24 + bobY, 5, 10)

      ctx.restore()

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying, isGameOver, highScore, addReward, playSfx])

  return (
    <AuthGate>
      <div className="space-y-3 pb-6 animate-fade-in select-none max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-[#3E2723]/20 font-black hover:bg-amber-100 text-[#3E2723]"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Hub
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#3E2723] flex items-center gap-2">
                <Footprints className="w-6 h-6 text-[#8BC34A]" /> Corrida do Vale (Runner 2D)
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Corra pelo vale encantado, pule caixotes e colete sojas douradas com pulo duplo!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="rounded-2xl text-[#795548]"
              title={soundEnabled ? 'Silenciar Sons' : 'Ativar Sons'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button
              onClick={startGame}
              className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-2xl text-xs h-10 px-4"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {isPlaying ? 'Reiniciar' : 'Começar Corrida'}
            </Button>
          </div>
        </div>

        {/* HUD Info: Vidas, Sojas, Pontos, Recorde */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Vidas */}
          <div className="bg-[#FFF9F0] border-2 border-red-200 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs">
            <span className="text-xl sm:text-2xl">❤️</span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                Vidas
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((heart) => (
                  <span
                    key={heart}
                    className={`text-base sm:text-lg transition-transform ${
                      heart <= lives
                        ? 'scale-100 text-red-500'
                        : 'scale-75 opacity-30 text-gray-400'
                    }`}
                  >
                    ❤️
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sojas Coletadas */}
          <div className="bg-[#FFF9F0] border-2 border-emerald-300 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs">
            <span className="text-xl sm:text-2xl">🌱</span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                Sojas do Vale
              </span>
              <span className="text-lg sm:text-xl font-black text-[#2E7D32] tabular-nums">
                {sojaCount} un.
              </span>
            </div>
          </div>

          {/* Pontos */}
          <div className="bg-[#FFF9F0] border-2 border-amber-300 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs">
            <span className="text-xl sm:text-2xl">⭐</span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                Distância / Pontos
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-700 tabular-nums">
                {score} m
              </span>
            </div>
          </div>

          {/* Recorde */}
          <div className="bg-[#FFF9F0] border-2 border-purple-200 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs">
            <span className="text-xl sm:text-2xl">🏆</span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                Melhor Marca
              </span>
              <span className="text-lg sm:text-xl font-black text-[#5E35B1] tabular-nums">
                {highScore} m
              </span>
            </div>
          </div>
        </div>

        {/* 2D Runner Canvas Area */}
        <div
          onClick={handleJump}
          className="relative rounded-3xl overflow-hidden border-4 border-[#33691E] shadow-2xl bg-[#FFF9C4] max-w-2xl mx-auto cursor-pointer"
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={420}
            className="w-full h-[320px] sm:h-[400px] block touch-none"
          />

          {/* Touch overlay instructions */}
          {!isPlaying && !isGameOver && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center text-4xl animate-bounce">
                🏃
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Corrida do Vale Encantado</h2>
                <p className="text-xs sm:text-sm text-stone-200 max-w-xs mt-1">
                  Toque na tela ou pressione <strong>Espaço</strong> para pular. Toque duas vezes no
                  ar para o <strong>Pulo Duplo</strong>!
                </p>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  startGame()
                }}
                className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-base py-5 px-8 rounded-2xl shadow-xl transition-transform active:scale-95"
              >
                Começar a Correr! 🏃
              </Button>
            </div>
          )}

          {/* Game Over Modal */}
          {isGameOver && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white space-y-4 animate-scale-in"
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl animate-pulse">
                🌾
              </div>
              <div>
                <h2 className="text-2xl font-black text-amber-300">Corrida Concluída!</h2>
                <p className="text-xs text-stone-300 mt-1">
                  Você cruzou o vale e colheu preciosos recursos!
                </p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/20 w-full max-w-xs grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-300">Distância</span>
                  <p className="text-2xl font-black text-amber-300 tabular-nums">{score} m</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-300">
                    Sojas Coletadas
                  </span>
                  <p className="text-2xl font-black text-emerald-300 tabular-nums">{sojaCount}</p>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs font-black text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>
                  Recompensa: +{Math.max(15, Math.round(score * 0.3) + sojaCount * 4)} Moedas | +
                  {Math.max(25, Math.round(score * 0.4) + sojaCount * 5)} XP
                </span>
              </div>

              <div className="flex gap-2 w-full max-w-xs pt-1">
                <Button
                  onClick={startGame}
                  className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-4 rounded-xl shadow-md"
                >
                  Correr de Novo
                </Button>
                <Link to="/" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-white/30 text-white font-black py-4 rounded-xl hover:bg-white/10"
                  >
                    Voltar ao Hub
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Rules Card */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-4 text-xs text-[#795548] space-y-1 font-bold">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Como Jogar a Corrida do Vale:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-2 leading-relaxed">
            <li>
              <strong>Pulo Duplo Dinâmico:</strong> Toque uma vez para saltar obstáculos baixos, ou
              toque uma segunda vez no ar para alcançar sojas douradas no alto.
            </li>
            <li>
              <strong>Obstáculos no Caminho:</strong> Caixotes de maçã, pedras rolantes e cercas de
              madeira tiram 1 das suas 3 vidas.
            </li>
            <li>
              <strong>Velocidade Progressiva:</strong> Conforme você avança pelo vale, o cenário
              acelera, testando seus reflexos.
            </li>
            <li>
              <strong>Economia Integrada:</strong> Os pontos e as sojas colhidas viram ouro e
              experiência real para sua conta e melhorias!
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
