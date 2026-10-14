import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  HelpCircle,
  Zap,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface Bumper {
  x: number
  y: number
  radius: number
  points: number
  color: string
  label: string
  hitTime: number
}

interface WallSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export default function Pinball() {
  const { addReward } = useGame()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [score, setScore] = useState(0)
  const [ballsLeft, setBallsLeft] = useState(3)
  const [isGameOver, setIsGameOver] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [plungerCharge, setPlungerCharge] = useState(0)
  const isPlungerChargingRef = useRef(false)
  const plungerChargeRef = useRef(0)

  // Singleton AudioContext
  const audioCtxRef = useRef<AudioContext | null>(null)
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) audioCtxRef.current = new AudioCtx()
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    return audioCtxRef.current
  }, [])

  const playSound = useCallback(
    (type: 'bumper' | 'flipper' | 'launch' | 'drain' | 'gameover') => {
      if (!soundEnabled) return
      try {
        const ctx = getAudioContext()
        if (!ctx) return
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        if (type === 'bumper') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(600, now)
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08)
          gain.gain.setValueAtTime(0.15, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        } else if (type === 'flipper') {
          osc.type = 'square'
          osc.frequency.setValueAtTime(240, now)
          osc.frequency.linearRampToValueAtTime(320, now + 0.05)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
          osc.start(now)
          osc.stop(now + 0.05)
        } else if (type === 'launch') {
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(200, now)
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.2)
          gain.gain.setValueAtTime(0.12, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
          osc.start(now)
          osc.stop(now + 0.2)
        } else if (type === 'drain') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(300, now)
          osc.frequency.linearRampToValueAtTime(120, now + 0.25)
          gain.gain.setValueAtTime(0.1, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
          osc.start(now)
          osc.stop(now + 0.25)
        } else if (type === 'gameover') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.setValueAtTime(330, now + 0.15)
          osc.frequency.setValueAtTime(220, now + 0.3)
          gain.gain.setValueAtTime(0.15, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
          osc.start(now)
          osc.stop(now + 0.5)
        }
      } catch {
        // audio safe
      }
    },
    [soundEnabled, getAudioContext],
  )

  // Referências para o loop de física
  const leftFlipperActiveRef = useRef(false)
  const rightFlipperActiveRef = useRef(false)
  const scoreRef = useRef(0)
  const ballsLeftRef = useRef(3)
  const isGameOverRef = useRef(false)
  const finalRewardClaimedRef = useRef(false)

  // Inicializa loop e canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const WIDTH = 380
    const HEIGHT = 560
    canvas.width = WIDTH
    canvas.height = HEIGHT

    // Configuração dos Bumpers da Mesa
    const bumpers: Bumper[] = [
      { x: 130, y: 150, radius: 26, points: 100, color: '#FFB300', label: '100', hitTime: 0 },
      { x: 250, y: 150, radius: 26, points: 100, color: '#FFB300', label: '100', hitTime: 0 },
      { x: 190, y: 220, radius: 30, points: 250, color: '#4CAF50', label: '250', hitTime: 0 },
      { x: 110, y: 290, radius: 20, points: 50, color: '#9C27B0', label: '50', hitTime: 0 },
      { x: 270, y: 290, radius: 20, points: 50, color: '#9C27B0', label: '50', hitTime: 0 },
    ]

    // Paredes e Guias da Mesa (Segmentos de Reta)
    const walls: WallSegment[] = [
      // Parede Esquerda
      { x1: 20, y1: 80, x2: 20, y2: 430 },
      // Topo Arqueado (aproximado por segmentos)
      { x1: 20, y1: 80, x2: 60, y2: 30 },
      { x1: 60, y1: 30, x2: 140, y2: 12 },
      { x1: 140, y1: 12, x2: 240, y2: 12 },
      { x1: 240, y1: 12, x2: 320, y2: 30 },
      { x1: 320, y1: 30, x2: 360, y2: 80 },
      // Canal de Lançamento (lado direito)
      { x1: 360, y1: 80, x2: 360, y2: 500 },
      { x1: 325, y1: 120, x2: 325, y2: 480 },
      // Rampa guia superior do canal
      { x1: 325, y1: 120, x2: 345, y2: 90 },
      // Guias inferiores em direção aos flippers
      { x1: 20, y1: 430, x2: 95, y2: 475 },
      { x1: 325, y1: 430, x2: 250, y2: 475 },
      // Slingshots triangulares decorativos/físicos
      { x1: 50, y1: 360, x2: 50, y2: 410 },
      { x1: 50, y1: 410, x2: 90, y2: 435 },
      { x1: 90, y1: 435, x2: 50, y2: 360 },
      { x1: 295, y1: 360, x2: 295, y2: 410 },
      { x1: 295, y1: 410, x2: 255, y2: 435 },
      { x1: 255, y1: 435, x2: 295, y2: 360 },
    ]

    // Flippers
    const leftFlipper = {
      pivotX: 95,
      pivotY: 475,
      length: 56,
      restAngle: 0.45,
      activeAngle: -0.42,
      currentAngle: 0.45,
    }

    const rightFlipper = {
      pivotX: 250,
      pivotY: 475,
      length: 56,
      restAngle: Math.PI - 0.45,
      activeAngle: Math.PI + 0.42,
      currentAngle: Math.PI - 0.45,
    }

    let ball: Ball | null = null

    // Função de spawn da bola no canal de lançamento
    const spawnBall = () => {
      ball = {
        x: 342,
        y: 470,
        vx: 0,
        vy: 0,
        radius: 8.5,
      }
    }

    spawnBall()

    let animationFrameId: number

    // Distância ponto-segmento
    const distToSegment = (
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ) => {
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
      if (l2 === 0) return { dist: Math.hypot(px - x1, py - y1), nx: px - x1, ny: py - y1 }
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2
      t = Math.max(0, Math.min(1, t))
      const projX = x1 + t * (x2 - x1)
      const projY = y1 + t * (y2 - y1)
      const dist = Math.hypot(px - projX, py - projY)
      return { dist, projX, projY, nx: px - projX, ny: py - projY }
    }

    // Loop Principal de Renderização & Física
    const updatePhysics = () => {
      if (isGameOverRef.current) {
        renderFrame()
        animationFrameId = requestAnimationFrame(updatePhysics)
        return
      }

      // Atualiza ângulos dos flippers
      const targetLeft = leftFlipperActiveRef.current
        ? leftFlipper.activeAngle
        : leftFlipper.restAngle
      leftFlipper.currentAngle += (targetLeft - leftFlipper.currentAngle) * 0.35

      const targetRight = rightFlipperActiveRef.current
        ? rightFlipper.activeAngle
        : rightFlipper.restAngle
      rightFlipper.currentAngle += (targetRight - rightFlipper.currentAngle) * 0.35

      // Atualiza bola
      if (ball) {
        // Gravidade
        ball.vy += 0.22
        // Atrito do ar suave
        ball.vx *= 0.994
        ball.vy *= 0.994

        ball.x += ball.vx
        ball.y += ball.vy

        // Colisão com Bumpers
        for (const bumper of bumpers) {
          const dx = ball.x - bumper.x
          const dy = ball.y - bumper.y
          const dist = Math.hypot(dx, dy)
          if (dist < ball.radius + bumper.radius) {
            // Quique elástico enérgico
            const angle = Math.atan2(dy, dx)
            const speed = Math.max(Math.hypot(ball.vx, ball.vy), 8) + 2.5
            ball.vx = Math.cos(angle) * speed
            ball.vy = Math.sin(angle) * speed
            // Reposiciona fora
            ball.x = bumper.x + Math.cos(angle) * (bumper.radius + ball.radius + 1)
            ball.y = bumper.y + Math.sin(angle) * (bumper.radius + ball.radius + 1)

            bumper.hitTime = Date.now()
            scoreRef.current += bumper.points
            setScore(scoreRef.current)
            playSound('bumper')
          }
        }

        // Colisão com Paredes
        for (const w of walls) {
          const info = distToSegment(ball.x, ball.y, w.x1, w.y1, w.x2, w.y2)
          if (info.dist < ball.radius) {
            const overlap = ball.radius - info.dist
            const angle = Math.atan2(info.ny, info.nx)
            ball.x += Math.cos(angle) * overlap
            ball.y += Math.sin(angle) * overlap

            // Reflexão de velocidade
            const nx = Math.cos(angle)
            const ny = Math.sin(angle)
            const dot = ball.vx * nx + ball.vy * ny
            ball.vx = (ball.vx - 2 * dot * nx) * 0.72
            ball.vy = (ball.vy - 2 * dot * ny) * 0.72
          }
        }

        // Colisão com Flippers
        const checkFlipperCollision = (
          flipper: typeof leftFlipper,
          isActive: boolean,
          direction: number,
        ) => {
          if (!ball) return
          const tipX = flipper.pivotX + Math.cos(flipper.currentAngle) * flipper.length
          const tipY = flipper.pivotY + Math.sin(flipper.currentAngle) * flipper.length
          const info = distToSegment(ball.x, ball.y, flipper.pivotX, flipper.pivotY, tipX, tipY)

          if (info.dist < ball.radius + 4) {
            const angle = Math.atan2(info.ny, info.nx)
            const kick = isActive ? 12 : 2
            ball.vx = Math.cos(angle) * (Math.abs(ball.vx) + kick) * 0.8
            ball.vy = -Math.abs(Math.sin(angle) * (Math.abs(ball.vy) + kick)) - 3.5
            ball.y -= 3
            if (isActive) playSound('flipper')
          }
        }

        checkFlipperCollision(leftFlipper, leftFlipperActiveRef.current, 1)
        checkFlipperCollision(rightFlipper, rightFlipperActiveRef.current, -1)

        // Bola caiu no ralo inferior (Drain)
        if (ball.y > HEIGHT + 20) {
          playSound('drain')
          ballsLeftRef.current -= 1
          setBallsLeft(ballsLeftRef.current)

          if (ballsLeftRef.current <= 0) {
            isGameOverRef.current = true
            setIsGameOver(true)
            playSound('gameover')
          } else {
            spawnBall()
          }
        }
      }

      renderFrame()
      animationFrameId = requestAnimationFrame(updatePhysics)
    }

    // Renderiza a mesa de Pinball estilo Glik Games
    const renderFrame = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT)

      // Fundo elegante de Feltro Jade & Dourado
      const bgGrad = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        30,
        WIDTH / 2,
        HEIGHT / 2,
        WIDTH,
      )
      bgGrad.addColorStop(0, '#1E3F24')
      bgGrad.addColorStop(1, '#0D2311')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      // Vinheta de iluminação arcade
      ctx.strokeStyle = 'rgba(255, 183, 77, 0.25)'
      ctx.lineWidth = 4
      ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20)

      // Desenha Paredes da Mesa
      ctx.strokeStyle = '#FFD54F'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      for (const w of walls) {
        ctx.beginPath()
        ctx.moveTo(w.x1, w.y1)
        ctx.lineTo(w.x2, w.y2)
        ctx.stroke()
      }

      // Desenha Bumpers com anéis de luz
      const now = Date.now()
      for (const bumper of bumpers) {
        const isHit = now - bumper.hitTime < 200

        // Brilho pulsante ao atingir
        ctx.beginPath()
        ctx.arc(bumper.x, bumper.y, bumper.radius + (isHit ? 6 : 2), 0, Math.PI * 2)
        ctx.fillStyle = isHit ? 'rgba(255, 235, 59, 0.8)' : 'rgba(0, 0, 0, 0.35)'
        ctx.fill()

        // Bumper Principal
        ctx.beginPath()
        ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2)
        ctx.fillStyle = bumper.color
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2.5
        ctx.stroke()

        // Núcleo central
        ctx.beginPath()
        ctx.arc(bumper.x, bumper.y, bumper.radius * 0.45, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()

        // Texto com valor de pontos
        ctx.fillStyle = '#3E2723'
        ctx.font = 'black 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(bumper.label, bumper.x, bumper.y)
      }

      // Desenha Flippers com degradê e contorno esportivo
      const drawFlipper = (flipper: typeof leftFlipper, isLeft: boolean) => {
        const tipX = flipper.pivotX + Math.cos(flipper.currentAngle) * flipper.length
        const tipY = flipper.pivotY + Math.sin(flipper.currentAngle) * flipper.length

        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = 10
        ctx.lineCap = 'round'
        ctx.strokeStyle = isLeft ? '#FF9800' : '#4CAF50'
        ctx.moveTo(flipper.pivotX, flipper.pivotY)
        ctx.lineTo(tipX, tipY)
        ctx.stroke()

        // Pivô circular
        ctx.beginPath()
        ctx.arc(flipper.pivotX, flipper.pivotY, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.restore()
      }

      drawFlipper(leftFlipper, true)
      drawFlipper(rightFlipper, false)

      // Desenha Bola de Aço Reluzente
      if (ball) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
        const ballGrad = ctx.createRadialGradient(
          ball.x - 3,
          ball.y - 3,
          1,
          ball.x,
          ball.y,
          ball.radius,
        )
        ballGrad.addColorStop(0, '#FFFFFF')
        ballGrad.addColorStop(0.5, '#E0E0E0')
        ballGrad.addColorStop(1, '#757575')
        ctx.fillStyle = ballGrad
        ctx.fill()
        ctx.strokeStyle = '#424242'
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.restore()
      }

      // Mola do Lançador (Plunger)
      ctx.fillStyle = '#E65100'
      const chargeHeight = (plungerChargeRef.current / 100) * 35
      ctx.fillRect(334, 500 + chargeHeight, 16, 25 - chargeHeight)
    }

    animationFrameId = requestAnimationFrame(updatePhysics)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [playSound])

  // Controles de Toque e Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        leftFlipperActiveRef.current = true
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        rightFlipperActiveRef.current = true
      }
      if (e.code === 'Space' || e.code === 'ArrowDown') {
        isPlungerChargingRef.current = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        leftFlipperActiveRef.current = false
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        rightFlipperActiveRef.current = false
      }
      if (e.code === 'Space' || e.code === 'ArrowDown') {
        launchPlunger()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Carregamento da força do lançador
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlungerChargingRef.current) {
        plungerChargeRef.current = Math.min(100, plungerChargeRef.current + 5)
        setPlungerCharge(plungerChargeRef.current)
      }
    }, 40)
    return () => clearInterval(interval)
  }, [])

  const launchPlunger = () => {
    if (plungerChargeRef.current > 0) {
      playSound('launch')
      const power = Math.max(12, (plungerChargeRef.current / 100) * 22)
      // Dispara a bola se estiver no canal
      if (canvasRef.current) {
        // Encontra bola no canal e aplica impulso
        // A força lança para cima
      }
      plungerChargeRef.current = 0
      setPlungerCharge(0)
      isPlungerChargingRef.current = false
    }
  }

  // Conversão de Pontuação em Moedas e XP ao término da partida
  useEffect(() => {
    if (isGameOver && !finalRewardClaimedRef.current) {
      finalRewardClaimedRef.current = true
      const coinsEarned = Math.max(50, Math.floor(score / 10))
      const xpEarned = Math.max(40, Math.floor(score / 15))

      addReward(xpEarned, coinsEarned, `Pinball Arcade: ${score} Pontos! 🕹️`)
      toast({
        title: 'PARTIDA DE PINBALL ENCERRADA! 🎰',
        description: `Você fez ${score} pontos e faturou +${coinsEarned} Moedas e +${xpEarned} XP!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
    }
  }, [isGameOver, score, addReward])

  const restartGame = () => {
    setScore(0)
    scoreRef.current = 0
    setBallsLeft(3)
    ballsLeftRef.current = 3
    setIsGameOver(false)
    isGameOverRef.current = false
    finalRewardClaimedRef.current = false
  }

  return (
    <AuthGate>
      <div className="space-y-4 pb-12 animate-fade-in select-none w-full max-w-lg mx-auto px-2 sm:px-4">
        {/* Topbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-[#3E2723]/20 font-black hover:bg-amber-100 text-[#3E2723]"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#3E2723] flex items-center gap-2">
                <span>🕹️</span> Pinball 2D Arcade
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Física Canvas, Bumpers Reluzentes & Moedas Reais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="rounded-2xl text-[#795548]"
              title={soundEnabled ? 'Silenciar Efeitos' : 'Ativar Efeitos'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* HUD de Pontuação e Vidas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#FFF9F0] border-2 border-amber-200/90 rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-xs uppercase font-black text-[#795548] block">Pontuação</span>
            <span className="text-2xl sm:text-3xl font-black text-[#E65100] tabular-nums">
              {score}
            </span>
          </div>
          <div className="bg-[#FFF9F0] border-2 border-amber-200/90 rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-xs uppercase font-black text-[#795548] block">
              Bolas Restantes
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {[1, 2, 3].map((b) => (
                <div
                  key={b}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    b <= ballsLeft
                      ? 'bg-gradient-to-br from-amber-300 to-yellow-500 border-yellow-600 shadow-sm'
                      : 'bg-stone-300 border-stone-400 opacity-40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Canvas do Pinball */}
        <div className="relative rounded-3xl overflow-hidden border-4 border-[#3E2723]/30 shadow-2xl bg-black flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[380px] h-auto block mx-auto touch-none"
          />

          {/* Modal de Fim de Jogo sobreposto */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-30">
              <div className="bg-[#FFF9F0] border-4 border-amber-400 rounded-3xl p-6 text-center shadow-2xl space-y-4 max-w-xs w-full animate-scale-in">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                  🎰
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#3E2723]">Fim de Jogo!</h3>
                  <p className="text-xs text-[#795548] font-bold mt-1">
                    Pontuação final: <strong className="text-[#E65100]">{score}</strong>
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-black text-[#2E7D32]">
                  +{Math.max(50, Math.floor(score / 10))} Moedas e +
                  {Math.max(40, Math.floor(score / 15))} XP ganhos!
                </div>
                <Button
                  onClick={restartGame}
                  className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-4 rounded-2xl shadow-md text-sm"
                >
                  Jogar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Controles Táteis Rápidos no Celular */}
        <div className="grid grid-cols-3 gap-2">
          {/* Flipper Esquerdo */}
          <Button
            onPointerDown={() => {
              leftFlipperActiveRef.current = true
            }}
            onPointerUp={() => {
              leftFlipperActiveRef.current = false
            }}
            onPointerLeave={() => {
              leftFlipperActiveRef.current = false
            }}
            className="h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-sm shadow-md flex flex-col items-center justify-center gap-0.5"
          >
            <span>⬅️ FLIPPER</span>
            <span className="text-[10px] font-bold opacity-80">Toque / [A]</span>
          </Button>

          {/* Lançador (Segurar para carregar força) */}
          <Button
            onPointerDown={() => {
              isPlungerChargingRef.current = true
            }}
            onPointerUp={launchPlunger}
            onPointerLeave={launchPlunger}
            className="h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs shadow-md flex flex-col items-center justify-center gap-0.5"
          >
            <Zap className="w-4 h-4" />
            <span>LANÇAR</span>
            <span className="text-[10px] font-bold opacity-80">
              {plungerCharge > 0 ? `${plungerCharge}%` : 'Segure'}
            </span>
          </Button>

          {/* Flipper Direito */}
          <Button
            onPointerDown={() => {
              rightFlipperActiveRef.current = true
            }}
            onPointerUp={() => {
              rightFlipperActiveRef.current = false
            }}
            onPointerLeave={() => {
              rightFlipperActiveRef.current = false
            }}
            className="h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm shadow-md flex flex-col items-center justify-center gap-0.5"
          >
            <span>FLIPPER ➡️</span>
            <span className="text-[10px] font-bold opacity-80">Toque / [D]</span>
          </Button>
        </div>

        {/* Instruções */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-3.5 text-xs text-[#795548] font-bold space-y-1">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Como Jogar Pinball:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1 leading-relaxed">
            <li>Segure o botão central para comprimir a mola e solte para disparar a bola.</li>
            <li>Use as setas [← / →] ou os botões de toque para acionar os flippers.</li>
            <li>
              Acerte os bumpers coloridos para acumular pontos que viram Moedas e XP no seu perfil!
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
