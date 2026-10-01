import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FlaskConical,
  ArrowLeft,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

interface Bottle {
  id: number
  lane: number // 0, 1, 2, 3
  y: number // distance along the conveyor: 0 to 1
  capColor: 'verde' | 'azul' | 'vermelho' | 'amarelo'
  hasStarLabel: boolean
  fillLevel: number // 0 to 100%
  isFilled: boolean
  result?: 'perfect' | 'overfill' | 'underfill' | 'wrong_rule'
}

export default function Fabrica() {
  const { addReward, addQuestProgress } = useGame()

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'levelclear'>('idle')
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [bottlesProcessed, setBottlesProcessed] = useState(0)
  const [targetFill, setTargetFill] = useState(80) // 80% target

  // Target Gauge & Rules for current level
  const levelRules = [
    {
      level: 1,
      ruleText: 'Encha apenas garrafas com TAMPA VERDE até a marca-alvo (80%)!',
      validCheck: (b: Bottle) => b.capColor === 'verde',
      time: 35,
      targetQuota: 8,
    },
    {
      level: 2,
      ruleText: 'Encha garrafas com TAMPA AZUL ou AMARELA. Ignore as demais!',
      validCheck: (b: Bottle) => b.capColor === 'azul' || b.capColor === 'amarelo',
      time: 30,
      targetQuota: 10,
    },
    {
      level: 3,
      ruleText: 'ATENÇÃO: NÃO encha nenhuma garrafa com ETIQUETA DE ESTRELA ⭐!',
      validCheck: (b: Bottle) => !b.hasStarLabel,
      time: 25,
      targetQuota: 12,
    },
    {
      level: 4,
      ruleText: 'Mestre da Fábrica: Encha apenas garrafas de TAMPA VERMELHA ou AZUL sem estrela!',
      validCheck: (b: Bottle) =>
        (b.capColor === 'vermelho' || b.capColor === 'azul') && !b.hasStarLabel,
      time: 25,
      targetQuota: 14,
    },
  ]

  const currentRule = levelRules[(level - 1) % levelRules.length]

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bottlesRef = useRef<Bottle[]>([])
  const fillingBottleIdRef = useRef<number | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastSpawnRef = useRef<number>(Date.now())

  // Start Level
  const startLevel = useCallback((lvl: number) => {
    setLevel(lvl)
    setGameState('playing')
    setTimeLeft(levelRules[(lvl - 1) % levelRules.length].time)
    setBottlesProcessed(0)
    setStreak(0)
    bottlesRef.current = []
    fillingBottleIdRef.current = null
    lastSpawnRef.current = Date.now()
  }, [])

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setGameState('gameover')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState])

  // Click / Press to Fill
  const handleBottleClick = (bottleId: number) => {
    if (gameState !== 'playing') return

    const bottle = bottlesRef.current.find((b) => b.id === bottleId)
    if (!bottle || bottle.isFilled) return

    const isValidChoice = currentRule.validCheck(bottle)

    if (!isValidChoice) {
      bottle.result = 'wrong_rule'
      bottle.isFilled = true
      setStreak(0)
      toast({
        title: 'Regra Quebrada! ⚠️',
        description: 'Você tentou encher uma garrafa proibida pela lógica do nível!',
        variant: 'destructive',
      })
      return
    }

    // Interactive Fill: simulate rapid fill up to target
    // Filling adds +25% per tap or precision target
    bottle.fillLevel = Math.min(100, bottle.fillLevel + 30)

    const diff = Math.abs(bottle.fillLevel - targetFill)

    if (diff <= 10) {
      // Perfect target!
      bottle.result = 'perfect'
      bottle.isFilled = true
      setScore((s) => s + 100)
      setStreak((st) => st + 1)
      setBottlesProcessed((p) => {
        const next = p + 1
        if (next >= currentRule.targetQuota) {
          // Cleared!
          setTimeout(() => handleLevelClear(), 500)
        }
        return next
      })
      addQuestProgress('fill_bottles', 1)
      addReward(25, 20, 'Garrafa Perfeita!')
    } else if (bottle.fillLevel > targetFill + 15) {
      // Overfill!
      bottle.result = 'overfill'
      bottle.isFilled = true
      setStreak(0)
      toast({
        title: 'Transbordou! 💧',
        description: 'Passou do medidor-alvo!',
        variant: 'destructive',
      })
    }
  }

  const handleLevelClear = async () => {
    setGameState('levelclear')
    const bonusXp = level * 100
    const bonusCoins = level * 120
    await addReward(bonusXp, bonusCoins, `Fábrica - Nível ${level} Concluído!`)
  }

  // 3D Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let conveyorOffset = 0

    const render = () => {
      const w = canvas.width
      const h = canvas.height
      conveyorOffset = (conveyorOffset + 2) % 40

      ctx.clearRect(0, 0, w, h)

      // 1. Factory Industrial Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
      bgGrad.addColorStop(0, '#ECEFF1')
      bgGrad.addColorStop(1, '#CFD8DC')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // Perspective Conveyor Belts (3 lanes)
      const numLanes = 3
      const laneWidth = 140
      const startX = (w - numLanes * laneWidth) / 2

      // Draw Main Conveyor Chassis
      ctx.fillStyle = '#263238'
      ctx.beginPath()
      ctx.moveTo(startX - 20, 40)
      ctx.lineTo(startX + numLanes * laneWidth + 20, 40)
      ctx.lineTo(startX + numLanes * laneWidth + 40, h)
      ctx.lineTo(startX - 40, h)
      ctx.closePath()
      ctx.fill()

      // 3D Conveyor Metal Edge
      ctx.fillStyle = '#37474F'
      ctx.fillRect(startX - 40, h - 16, numLanes * laneWidth + 80, 16)

      // Conveyor Tracks with animated treads
      for (let l = 0; l < numLanes; l++) {
        const lx = startX + l * laneWidth
        ctx.fillStyle = l % 2 === 0 ? '#455A64' : '#546E7A'
        ctx.fillRect(lx + 10, 40, laneWidth - 20, h - 40)

        // Treads
        ctx.strokeStyle = '#263238'
        ctx.lineWidth = 2
        for (let y = 40 + (conveyorOffset % 20); y < h; y += 20) {
          ctx.beginPath()
          ctx.moveTo(lx + 12, y)
          ctx.lineTo(lx + laneWidth - 12, y)
          ctx.stroke()
        }
      }

      // Filling Station Overhead Gantry (Target Gauge)
      ctx.fillStyle = '#1A237E'
      ctx.fillRect(0, 0, w, 40)

      // Target Fill Gauge Indicator
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 13px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`VOLUME-ALVO: ${targetFill}%`, w / 2, 24)

      // Spawn bottles if playing
      if (gameState === 'playing') {
        const now = Date.now()
        if (now - lastSpawnRef.current > 1400) {
          lastSpawnRef.current = now
          const colors: Bottle['capColor'][] = ['verde', 'azul', 'vermelho', 'amarelo']
          const randomColor = colors[Math.floor(Math.random() * colors.length)]
          const hasStar = Math.random() < 0.35

          bottlesRef.current.push({
            id: Date.now() + Math.random(),
            lane: Math.floor(Math.random() * numLanes),
            y: 0.05,
            capColor: randomColor,
            hasStarLabel: hasStar,
            fillLevel: Math.random() < 0.5 ? 0 : 25,
            isFilled: false,
          })
        }
      }

      // Update & Draw Bottles
      const capColorsMap = {
        verde: '#4CAF50',
        azul: '#2196F3',
        vermelho: '#F44336',
        amarelo: '#FFEB3B',
      }

      bottlesRef.current.forEach((bottle) => {
        if (gameState === 'playing') {
          bottle.y += 0.003 + level * 0.0006
        }

        const lx = startX + bottle.lane * laneWidth + laneWidth / 2
        const by = 50 + bottle.y * (h - 90)

        // 3D perspective scale
        const scale = 0.8 + bottle.y * 0.4
        const bw = 36 * scale
        const bh = 70 * scale

        ctx.save()
        ctx.translate(lx, by)

        // Bottle Drop Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath()
        ctx.ellipse(0, bh / 2, bw * 0.7, bw * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()

        // Glass bottle body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
        ctx.strokeStyle = '#90A4AE'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(-bw / 2, -bh / 2 + 15 * scale, bw, bh - 15 * scale, 6 * scale)
        ctx.fill()
        ctx.stroke()

        // Liquid inside
        if (bottle.fillLevel > 0) {
          const liquidH = ((bh - 18 * scale) * bottle.fillLevel) / 100
          ctx.fillStyle =
            bottle.result === 'wrong_rule'
              ? '#D32F2F'
              : bottle.result === 'overfill'
                ? '#FF5722'
                : '#00BCD4'

          ctx.beginPath()
          ctx.roundRect(-bw / 2 + 2, bh / 2 - liquidH - 2, bw - 4, liquidH, [2, 2, 4, 4])
          ctx.fill()
        }

        // Target Line marker inside bottle
        const targetLineY = bh / 2 - ((bh - 18 * scale) * targetFill) / 100
        ctx.strokeStyle = '#D50000'
        ctx.setLineDash([4, 2])
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-bw / 2 + 2, targetLineY)
        ctx.lineTo(bw / 2 - 2, targetLineY)
        ctx.stroke()
        ctx.setLineDash([])

        // Neck
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.strokeStyle = '#90A4AE'
        ctx.beginPath()
        ctx.rect(-bw * 0.25, -bh / 2, bw * 0.5, 16 * scale)
        ctx.fill()
        ctx.stroke()

        // Colored Cap
        ctx.fillStyle = capColorsMap[bottle.capColor]
        ctx.beginPath()
        ctx.roundRect(-bw * 0.28, -bh / 2 - 4 * scale, bw * 0.56, 8 * scale, 2)
        ctx.fill()
        ctx.stroke()

        // Star Label
        if (bottle.hasStarLabel) {
          ctx.fillStyle = '#FFD700'
          ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText('⭐', 0, 5 * scale)
        }

        // Status badge if clicked
        if (bottle.result === 'perfect') {
          ctx.fillStyle = '#4CAF50'
          ctx.font = 'bold 12px Nunito, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('EXATO! +100', 0, -bh / 2 - 12)
        } else if (bottle.result === 'overfill') {
          ctx.fillStyle = '#E53935'
          ctx.font = 'bold 11px Nunito, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('TRANSBORDO', 0, -bh / 2 - 12)
        }

        ctx.restore()
      })

      // Clean off-screen bottles
      bottlesRef.current = bottlesRef.current.filter((b) => b.y < 1.05)

      animId = requestAnimationFrame(render)
    }

    render()

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const cx = (e.clientX - rect.left) * (canvas.width / rect.width)
      const cy = (e.clientY - rect.top) * (canvas.height / rect.height)

      const numLanes = 3
      const laneWidth = 140
      const startX = (canvas.width - numLanes * laneWidth) / 2

      // Check click against bottles (bottom-most first)
      for (let i = bottlesRef.current.length - 1; i >= 0; i--) {
        const b = bottlesRef.current[i]
        const lx = startX + b.lane * laneWidth + laneWidth / 2
        const by = 50 + b.y * (canvas.height - 90)
        const scale = 0.8 + b.y * 0.4
        const bw = 36 * scale
        const bh = 70 * scale

        if (cx >= lx - bw && cx <= lx + bw && cy >= by - bh && cy <= by + bh) {
          handleBottleClick(b.id)
          break
        }
      }
    }

    canvas.addEventListener('click', handleCanvasClick)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('click', handleCanvasClick)
    }
  }, [gameState, level, targetFill, currentRule])

  return (
    <AuthGate>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-[#3E2723]/20 font-black hover:bg-amber-100"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Hub
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#3E2723] flex items-center gap-2">
                <FlaskConical className="w-7 h-7 text-[#00BCD4]" /> Fábrica de Garrafas
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Exercite sua atenção e reflexo: encha os frascos corretos no volume ideal!
              </p>
            </div>
          </div>

          {/* Level Info & Timer */}
          <div className="flex items-center gap-3">
            <div className="bg-[#FFF9F0] border border-[#3E2723]/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
              <div>
                <div className="text-[10px] font-black uppercase text-[#795548]">Nível</div>
                <div className="text-lg font-black text-[#5E35B1]">{level}</div>
              </div>
              <div className="w-[1px] h-6 bg-[#3E2723]/10" />
              <div>
                <div className="text-[10px] font-black uppercase text-[#795548]">Tempo</div>
                <div
                  className={`text-lg font-black tabular-nums ${
                    timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-[#3E2723]'
                  }`}
                >
                  {timeLeft}s
                </div>
              </div>
              <div className="w-[1px] h-6 bg-[#3E2723]/10" />
              <div>
                <div className="text-[10px] font-black uppercase text-[#795548]">Pontos</div>
                <div className="text-lg font-black text-[#E65100] tabular-nums">{score}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Level Logic Rule Card */}
        <div className="bg-[#E0F7FA] border-2 border-[#00BCD4] rounded-3xl p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00BCD4] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-[#006064] tracking-wide">
                Regra de Lógica deste Lote (Nível {level})
              </div>
              <div className="text-sm sm:text-base font-black text-[#004D40]">
                {currentRule.ruleText}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-[#006064]">Meta</div>
            <div className="text-sm font-black text-[#004D40] tabular-nums">
              {bottlesProcessed} / {currentRule.targetQuota} garrafas
            </div>
          </div>
        </div>

        {/* 3D Canvas Conveyor Area */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-[#3E2723]/10 shadow-xl bg-[#263238]">
          <canvas
            ref={canvasRef}
            width={800}
            height={460}
            className="w-full h-[380px] sm:h-[460px] block cursor-crosshair touch-none"
          />

          {/* Idle Overlay */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <FlaskConical className="w-16 h-16 text-[#00BCD4] mb-3 animate-bounce" />
              <h2 className="text-3xl font-black text-white mb-2">Pronto para o Turno?</h2>
              <p className="text-sm text-gray-200 max-w-md mb-6 font-bold">
                Clique nas garrafas na esteira para enchê-las até a linha vermelha tracejada.
                Cuidado com garrafas proibidas pela regra do nível!
              </p>
              <Button
                onClick={() => startLevel(1)}
                className="bg-[#00BCD4] hover:bg-[#00ACC1] text-white font-black text-lg py-6 px-8 rounded-2xl shadow-xl transition-transform active:scale-95"
              >
                <Play className="w-6 h-6 mr-2 fill-white" /> Iniciar Fábrica
              </Button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <AlertTriangle className="w-16 h-16 text-[#FF5722] mb-3" />
              <h2 className="text-3xl font-black text-white mb-2">Tempo Esgotado!</h2>
              <p className="text-sm text-gray-200 mb-6 font-bold">
                Você processou {bottlesProcessed} garrafas e somou {score} pontos.
              </p>
              <Button
                onClick={() => startLevel(level)}
                className="bg-[#FF9800] hover:bg-[#F57C00] text-white font-black py-5 px-8 rounded-2xl shadow-xl"
              >
                <RotateCcw className="w-5 h-5 mr-2" /> Tentar Novamente
              </Button>
            </div>
          )}

          {/* Level Clear Overlay */}
          {gameState === 'levelclear' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <Trophy className="w-16 h-16 text-[#FFD54F] mb-3 animate-bounce" />
              <h2 className="text-3xl font-black text-white mb-2">Lote Concluído com Sucesso!</h2>
              <p className="text-sm text-gray-200 mb-6 font-bold">
                Excelente precisão mental! Ouro e experiência foram adicionados à sua conta.
              </p>
              <Button
                onClick={() => startLevel(level + 1)}
                className="bg-[#4CAF50] hover:bg-[#43A047] text-white font-black text-lg py-6 px-8 rounded-2xl shadow-xl"
              >
                Avançar para o Nível {level + 1} 🚀
              </Button>
            </div>
          )}
        </div>

        {/* How to play help bar */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-4 flex items-center gap-3 text-xs text-[#795548] font-bold">
          <HelpCircle className="w-5 h-5 text-[#8BC34A] shrink-0" />
          <span>
            <strong>Como jogar:</strong> Clique ou toque repetidamente sobre a garrafa na esteira
            enquanto ela desce para preenchê-la com líquido até atingir a linha tracejada vermelha
            (80%). Não encha garrafas que violem a regra do lote!
          </span>
        </div>
      </div>
    </AuthGate>
  )
}
