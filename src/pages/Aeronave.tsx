import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Shield,
  Zap,
  HelpCircle,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

interface Projectile {
  id: number
  x: number
  y: number
  vy: number
  radius: number
  color: string
}

interface Asteroid {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  hp: number
  maxHp: number
  type: 'stone' | 'crystal' | 'gold'
  rotation: number
  rotSpeed: number
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

export default function Aeronave() {
  const { addReward } = useGame()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Game state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('sky_defender_highscore') || '0')
    } catch {
      return 0
    }
  })
  const [lives, setLives] = useState(3)
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
    (type: 'shoot' | 'hit' | 'explode' | 'hurt' | 'powerup') => {
      if (!soundEnabled) return
      try {
        const ctx = getAudioContext()
        if (!ctx) return
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        if (type === 'shoot') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(600, now)
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.08)
          gain.gain.setValueAtTime(0.06, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        } else if (type === 'hit') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(400, now)
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.06)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
          osc.start(now)
          osc.stop(now + 0.06)
        } else if (type === 'explode') {
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(240, now)
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.25)
          gain.gain.setValueAtTime(0.12, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
          osc.start(now)
          osc.stop(now + 0.25)
        } else if (type === 'hurt') {
          osc.type = 'square'
          osc.frequency.setValueAtTime(150, now)
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.2)
          gain.gain.setValueAtTime(0.15, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
          osc.start(now)
          osc.stop(now + 0.2)
        }
      } catch {
        // audio fail safe
      }
    },
    [soundEnabled, getAudioContext],
  )

  // Ship position
  const shipPosRef = useRef({ x: 250, y: 440 })
  const targetXRef = useRef(250)
  const isDraggingRef = useRef(false)

  // Entities refs for 60fps loop
  const projectilesRef = useRef<Projectile[]>([])
  const asteroidsRef = useRef<Asteroid[]>([])
  const particlesRef = useRef<Particle[]>([])
  const starsRef = useRef<{ x: number; y: number; speed: number; size: number }[]>([])
  const cloudsRef = useRef<{ x: number; y: number; speed: number; size: number }[]>([])
  const nextShootRef = useRef(0)
  const nextSpawnRef = useRef(0)
  const entityIdRef = useRef(1)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)

  // Initialize stars and gentle clouds
  useEffect(() => {
    const stars = []
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * 500,
        y: Math.random() * 520,
        speed: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 2,
      })
    }
    starsRef.current = stars

    const clouds = []
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * 500,
        y: Math.random() * 520,
        speed: 0.2 + Math.random() * 0.4,
        size: 40 + Math.random() * 50,
      })
    }
    cloudsRef.current = clouds
  }, [])

  // Start new game
  const startGame = () => {
    setScore(0)
    scoreRef.current = 0
    setLives(3)
    livesRef.current = 3
    setIsPlaying(true)
    setIsGameOver(false)
    projectilesRef.current = []
    asteroidsRef.current = []
    particlesRef.current = []
    shipPosRef.current = { x: 250, y: 440 }
    targetXRef.current = 250
    nextShootRef.current = 0
    nextSpawnRef.current = 0
  }

  // Handle pointer/touch dragging
  const handlePointerDown = (clientX: number) => {
    isDraggingRef.current = true
    updateTargetX(clientX)
  }

  const handlePointerMove = (clientX: number) => {
    if (isDraggingRef.current) {
      updateTargetX(clientX)
    }
  }

  const handlePointerUp = () => {
    isDraggingRef.current = false
  }

  const updateTargetX = (clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const x = (clientX - rect.left) * scaleX
    targetXRef.current = Math.max(25, Math.min(canvas.width - 25, x))
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        targetXRef.current = Math.max(25, targetXRef.current - 35)
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        targetXRef.current = Math.min(475, targetXRef.current + 35)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = performance.now()

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000)
      lastTime = time

      const w = canvas.width
      const h = canvas.height

      // 1. UPDATE PARALLAX SKY BACKGROUND
      ctx.fillStyle = '#1A237E' // deep twilight valley sky
      ctx.fillRect(0, 0, w, h)

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      for (const cloud of cloudsRef.current) {
        cloud.y += cloud.speed
        if (cloud.y > h + 60) {
          cloud.y = -60
          cloud.x = Math.random() * w
        }
        ctx.beginPath()
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Stars
      ctx.fillStyle = '#FFF9C4'
      for (const star of starsRef.current) {
        star.y += star.speed
        if (star.y > h) {
          star.y = 0
          star.x = Math.random() * w
        }
        ctx.fillRect(star.x, star.y, star.size, star.size)
      }

      if (isPlaying && !isGameOver) {
        // 2. SMOOTH SHIP MOVEMENT (LERP)
        const ship = shipPosRef.current
        ship.x += (targetXRef.current - ship.x) * 0.25

        // 3. AUTO SHOOT
        if (time > nextShootRef.current) {
          nextShootRef.current = time + 175 // fires every ~175ms
          entityIdRef.current++
          projectilesRef.current.push({
            id: entityIdRef.current,
            x: ship.x,
            y: ship.y - 18,
            vy: -480,
            radius: 4,
            color: '#FFEB3B',
          })
          // Left & right mini blasters
          projectilesRef.current.push({
            id: ++entityIdRef.current,
            x: ship.x - 12,
            y: ship.y - 10,
            vy: -460,
            radius: 3,
            color: '#80D8FF',
          })
          projectilesRef.current.push({
            id: ++entityIdRef.current,
            x: ship.x + 12,
            y: ship.y - 10,
            vy: -460,
            radius: 3,
            color: '#80D8FF',
          })
          playSfx('shoot')
        }

        // 4. SPAWN ASTEROIDS
        if (time > nextSpawnRef.current) {
          // Spawn interval decreases as score rises (starts at 1.1s, down to 0.4s)
          const spawnDelay = Math.max(380, 1100 - Math.min(scoreRef.current * 0.4, 700))
          nextSpawnRef.current = time + spawnDelay

          const randType = Math.random()
          let type: 'stone' | 'crystal' | 'gold' = 'stone'
          let radius = 18 + Math.random() * 16
          let hp = 1
          if (randType > 0.8) {
            type = 'gold'
            radius = 20
            hp = 2
          } else if (randType > 0.5) {
            type = 'crystal'
            radius = 24
            hp = 3
          } else if (radius > 26) {
            hp = 2
          }

          const speedY = 120 + Math.random() * 90 + Math.min(scoreRef.current * 0.05, 120)
          const speedX = (Math.random() - 0.5) * 40

          asteroidsRef.current.push({
            id: ++entityIdRef.current,
            x: Math.max(radius, Math.min(w - radius, Math.random() * w)),
            y: -radius - 10,
            vx: speedX,
            vy: speedY,
            radius,
            hp,
            maxHp: hp,
            type,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 2,
          })
        }

        // 5. UPDATE & COLLIDE PROJECTILES
        const activeProjs: Projectile[] = []
        for (const proj of projectilesRef.current) {
          proj.y += proj.vy * dt
          let hit = false

          if (proj.y > -10) {
            // Check collision with asteroids
            for (const ast of asteroidsRef.current) {
              const dist = Math.hypot(proj.x - ast.x, proj.y - ast.y)
              if (dist < proj.radius + ast.radius) {
                hit = true
                ast.hp -= 1
                playSfx('hit')

                // Spark particle
                particlesRef.current.push({
                  x: proj.x,
                  y: proj.y,
                  vx: (Math.random() - 0.5) * 80,
                  vy: (Math.random() - 0.5) * 80,
                  radius: 3,
                  alpha: 1,
                  color: proj.color,
                })
                break
              }
            }
          }

          if (!hit && proj.y > -10) {
            activeProjs.push(proj)
          }
        }
        projectilesRef.current = activeProjs

        // 6. UPDATE ASTEROIDS & CHECK PLAYER COLLISION
        const activeAsteroids: Asteroid[] = []
        for (const ast of asteroidsRef.current) {
          ast.x += ast.vx * dt
          ast.y += ast.vy * dt
          ast.rotation += ast.rotSpeed * dt

          // Check if dead
          if (ast.hp <= 0) {
            playSfx('explode')
            const pts = ast.type === 'gold' ? 60 : ast.type === 'crystal' ? 40 : 20
            scoreRef.current += pts
            setScore(scoreRef.current)

            // Spawn explosion particles
            const particleColor =
              ast.type === 'gold' ? '#FFD54F' : ast.type === 'crystal' ? '#B388FF' : '#BCAAA4'
            for (let i = 0; i < 14; i++) {
              const ang = Math.random() * Math.PI * 2
              const spd = 40 + Math.random() * 120
              particlesRef.current.push({
                x: ast.x,
                y: ast.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                radius: 2 + Math.random() * 3,
                alpha: 1,
                color: particleColor,
              })
            }
            continue
          }

          // Check collision with player ship
          const distToShip = Math.hypot(ast.x - ship.x, ast.y - ship.y)
          if (distToShip < ast.radius + 16) {
            playSfx('hurt')
            livesRef.current -= 1
            setLives(livesRef.current)

            // Screen shake / burst particles
            for (let i = 0; i < 20; i++) {
              particlesRef.current.push({
                x: ship.x,
                y: ship.y,
                vx: (Math.random() - 0.5) * 160,
                vy: (Math.random() - 0.5) * 160,
                radius: 3,
                alpha: 1,
                color: '#FF5252',
              })
            }

            if (livesRef.current <= 0) {
              setIsGameOver(true)
              setIsPlaying(false)
              // Update high score
              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current)
                try {
                  localStorage.setItem('sky_defender_highscore', String(scoreRef.current))
                } catch {
                  // safe
                }
              }
              // Reward Coins & XP based on score
              const coinsEarned = Math.max(15, Math.round(scoreRef.current * 0.35))
              const xpEarned = Math.max(25, Math.round(scoreRef.current * 0.45))
              addReward(xpEarned, coinsEarned, `Defensor do Céu: ${scoreRef.current} pontos! 🚀`)
            }
            continue
          }

          if (ast.y < h + ast.radius + 10) {
            activeAsteroids.push(ast)
          }
        }
        asteroidsRef.current = activeAsteroids
      }

      // 7. DRAW PARTICLES
      const activeParticles: Particle[] = []
      for (const p of particlesRef.current) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.alpha -= dt * 1.8
        if (p.alpha > 0) {
          ctx.save()
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
          activeParticles.push(p)
        }
      }
      particlesRef.current = activeParticles

      // 8. DRAW PROJECTILES
      for (const proj of projectilesRef.current) {
        ctx.fillStyle = proj.color
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(proj.x - 1, proj.y, 2, 8)
      }

      // 9. DRAW ASTEROIDS
      for (const ast of asteroidsRef.current) {
        ctx.save()
        ctx.translate(ast.x, ast.y)
        ctx.rotate(ast.rotation)

        if (ast.type === 'gold') {
          ctx.fillStyle = '#FFA000'
          ctx.strokeStyle = '#FFE082'
        } else if (ast.type === 'crystal') {
          ctx.fillStyle = '#7E57C2'
          ctx.strokeStyle = '#D1C4E9'
        } else {
          ctx.fillStyle = '#6D4C41'
          ctx.strokeStyle = '#A1887F'
        }
        ctx.lineWidth = 2.5

        ctx.beginPath()
        ctx.arc(0, 0, ast.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Inner crater / shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.beginPath()
        ctx.arc(-ast.radius * 0.3, -ast.radius * 0.3, ast.radius * 0.3, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      // 10. DRAW SHIP (STYLIZED RETRO/FANTASY AIRSHIP)
      const ship = shipPosRef.current
      ctx.save()
      ctx.translate(ship.x, ship.y)

      // Thruster flame
      if (isPlaying && !isGameOver) {
        const flameH = 12 + Math.random() * 10
        ctx.fillStyle = '#FF9800'
        ctx.beginPath()
        ctx.moveTo(-6, 14)
        ctx.lineTo(6, 14)
        ctx.lineTo(0, 14 + flameH)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#FFEB3B'
        ctx.beginPath()
        ctx.moveTo(-3, 14)
        ctx.lineTo(3, 14)
        ctx.lineTo(0, 14 + flameH * 0.6)
        ctx.closePath()
        ctx.fill()
      }

      // Wings
      ctx.fillStyle = '#8BC34A'
      ctx.beginPath()
      ctx.moveTo(0, -18)
      ctx.lineTo(-24, 12)
      ctx.lineTo(-14, 14)
      ctx.lineTo(0, 6)
      ctx.lineTo(14, 14)
      ctx.lineTo(24, 12)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#558B2F'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Cockpit / Fuselage
      ctx.fillStyle = '#FFF9F0'
      ctx.beginPath()
      ctx.ellipse(0, -2, 8, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#3E2723'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Glass Dome (Cyan glow)
      ctx.fillStyle = '#4DD0E1'
      ctx.beginPath()
      ctx.arc(0, -6, 5, 0, Math.PI * 2)
      ctx.fill()

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
                <Zap className="w-6 h-6 text-amber-500 fill-amber-400" /> Defensor do Céu (Aeronave
                2D)
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Pilote sua aeronave mágica, destrua asteroides do vale e colete recompensas!
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
              {isPlaying ? 'Reiniciar' : 'Jogar Agora'}
            </Button>
          </div>
        </div>

        {/* HUD Info: Vidas, Pontos, Recorde */}
        <div className="grid grid-cols-3 gap-2.5">
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

          {/* Pontos */}
          <div className="bg-[#FFF9F0] border-2 border-amber-300 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs">
            <span className="text-xl sm:text-2xl">⭐</span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                Pontuação
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-700 tabular-nums">
                {score}
              </span>
            </div>
          </div>

          {/* Recorde */}
          <div className="bg-[#FFF9F0] border-2 border-purple-200 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs">
            <span className="text-xl sm:text-2xl">🏆</span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                Recorde
              </span>
              <span className="text-lg sm:text-xl font-black text-[#5E35B1] tabular-nums">
                {highScore}
              </span>
            </div>
          </div>
        </div>

        {/* 2D Canvas Area */}
        <div className="relative rounded-3xl overflow-hidden border-4 border-[#303F9F] shadow-2xl bg-[#0D1B2A] max-w-xl mx-auto">
          <canvas
            ref={canvasRef}
            width={500}
            height={520}
            onPointerDown={(e) => handlePointerDown(e.clientX)}
            onPointerMove={(e) => handlePointerMove(e.clientX)}
            onPointerUp={handlePointerUp}
            className="w-full h-[360px] sm:h-[460px] block cursor-crosshair touch-none"
          />

          {/* Touch Guidance overlay */}
          {!isPlaying && !isGameOver && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center text-4xl animate-bounce">
                🚀
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Defensor do Céu</h2>
                <p className="text-xs sm:text-sm text-stone-200 max-w-xs mt-1">
                  Arraste o dedo ou use as setas ← → para mover a nave. Tiros são disparados
                  automaticamente!
                </p>
              </div>
              <Button
                onClick={startGame}
                className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-base py-5 px-8 rounded-2xl shadow-xl transition-transform active:scale-95"
              >
                Decolar Agora! 🚀
              </Button>
            </div>
          )}

          {/* Game Over Modal */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white space-y-4 animate-scale-in">
              <div className="w-16 h-16 rounded-3xl bg-red-500/20 border-2 border-red-400 flex items-center justify-center text-4xl animate-pulse">
                💥
              </div>
              <div>
                <h2 className="text-2xl font-black text-red-400">Missão Encerrada!</h2>
                <p className="text-xs text-stone-300 mt-1">
                  Sua nave enfrentou bravamente a tempestade!
                </p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/20 w-full max-w-xs grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-300">Pontos</span>
                  <p className="text-2xl font-black text-amber-300 tabular-nums">{score}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-300">Recorde</span>
                  <p className="text-2xl font-black text-purple-300 tabular-nums">{highScore}</p>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs font-black text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>
                  Recompensa: +{Math.max(15, Math.round(score * 0.35))} Moedas | +
                  {Math.max(25, Math.round(score * 0.45))} XP
                </span>
              </div>

              <div className="flex gap-2 w-full max-w-xs pt-1">
                <Button
                  onClick={startGame}
                  className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-4 rounded-xl shadow-md"
                >
                  Tentar de Novo
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
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Como Jogar o Defensor do Céu:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-2 leading-relaxed">
            <li>
              <strong>Controle Intuitivo:</strong> Arraste o dedo ou o mouse para os lados para
              desviar e mirar. Em teclado, use setas esquerda/direita ou teclas A/D.
            </li>
            <li>
              <strong>Disparos Automáticos:</strong> Os canhões de energia atiram sozinhos em
              rajadas rápidas.
            </li>
            <li>
              <strong>Tipos de Asteroides:</strong> Rochas marrons (20 pts), Cristais roxos (40 pts)
              e Minérios Dourados raros (60 pts).
            </li>
            <li>
              <strong>Recompensa de Verdade:</strong> Cada partida vencida ou perdida rende ouro e
              experiência para o seu perfil e sua fazenda!
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
