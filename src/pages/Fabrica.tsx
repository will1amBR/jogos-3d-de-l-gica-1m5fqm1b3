import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FlaskConical,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  CheckCircle2,
  HelpCircle,
  Play,
  Undo2,
  Award,
  Zap,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

// 4 Vivid Liquid Colors
export type LiquidColor = 'blue' | 'emerald' | 'amber' | 'rose'

export interface ColorDef {
  id: LiquidColor
  name: string
  hex: string
  lightHex: string
  borderHex: string
  icon: string
}

export const LIQUID_COLORS: Record<LiquidColor, ColorDef> = {
  blue: {
    id: 'blue',
    name: 'Azul Místico',
    hex: '#0284C7',
    lightHex: '#38BDF8',
    borderHex: '#0369A1',
    icon: '💧',
  },
  emerald: {
    id: 'emerald',
    name: 'Verde Élfico',
    hex: '#16A34A',
    lightHex: '#4ADE80',
    borderHex: '#15803D',
    icon: '🍃',
  },
  amber: {
    id: 'amber',
    name: 'Âmbar Solar',
    hex: '#EA580C',
    lightHex: '#FB923C',
    borderHex: '#C2410C',
    icon: '☀️',
  },
  rose: {
    id: 'rose',
    name: 'Rosa Encantado',
    hex: '#E11D48',
    lightHex: '#FB7185',
    borderHex: '#BE123C',
    icon: '🌸',
  },
}

const COLOR_KEYS: LiquidColor[] = ['blue', 'emerald', 'amber', 'rose']
const BOTTLE_CAPACITY = 6 // 6 andares por garrafa
const NUM_BOTTLES = 8 // 8 garrafas na prateleira
const BIG_JUG_CAPACITY = 8 // Garrafão aceita 8 unidades da MESMA cor

interface BottleState {
  id: number
  liquids: LiquidColor[] // stacked from bottom (index 0) to top (last index)
}

interface GameHistoryStep {
  bottles: BottleState[]
  bigJug: {
    color: LiquidColor | null
    count: number
  }
}

export default function Fabrica() {
  const { addReward, addQuestProgress } = useGame()

  const [level, setLevel] = useState(1)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'levelclear'>('idle')
  const [selectedBottleIndex, setSelectedBottleIndex] = useState<number | null>(null)
  const [movesCount, setMovesCount] = useState(0)

  // 8 bottles shelf
  const [bottles, setBottles] = useState<BottleState[]>([])

  // Big Jug by the shelf side: holds ONLY ONE chosen color up to BIG_JUG_CAPACITY
  const [bigJug, setBigJug] = useState<{
    color: LiquidColor | null
    count: number
  }>({
    color: null,
    count: 0,
  })

  // Undo history
  const [history, setHistory] = useState<GameHistoryStep[]>([])

  // Generate balanced puzzle for current level
  const generateLevel = useCallback((lvl: number) => {
    // 8 bottles, each has 6 slots. Total units = 8 * 4.5 ~= 36 units of liquid across 4 colors.
    // 6 bottles initially filled with 6 mixed layers, and 2 bottles with 4 or 5 layers (leaving room for sorting)
    // Guarantee each of the 4 colors appears equally
    const colorPool: LiquidColor[] = []
    const unitsPerColor = 8 // 8 units for each of the 4 colors = 32 units total
    COLOR_KEYS.forEach((c) => {
      for (let i = 0; i < unitsPerColor; i++) {
        colorPool.push(c)
      }
    })

    // Shuffle pool
    for (let i = colorPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]]
    }

    // Distribute into 8 bottles:
    // First 5 bottles get 6 layers (full)
    // Bottle 6 gets 2 layers (partially full)
    // Bottles 7 & 8 are empty or have 0-1 layers to allow strategic sorting
    const initialBottles: BottleState[] = []
    let poolIndex = 0

    // Levels 1-3 have varying initial free space to ease into the logic
    const distribution =
      lvl === 1
        ? [5, 5, 5, 5, 4, 4, 2, 2] // More breathing room
        : lvl === 2
          ? [6, 6, 5, 5, 4, 3, 2, 1]
          : [6, 6, 6, 6, 4, 4, 0, 0] // Standard 8-bottle setup

    for (let b = 0; b < NUM_BOTTLES; b++) {
      const count = distribution[b] || 4
      const liquids: LiquidColor[] = []
      for (let s = 0; s < count && poolIndex < colorPool.length; s++) {
        liquids.push(colorPool[poolIndex++])
      }
      initialBottles.push({ id: b, liquids })
    }

    setBottles(initialBottles)
    setBigJug({ color: null, count: 0 })
    setSelectedBottleIndex(null)
    setMovesCount(0)
    setHistory([])
    setGameState('playing')
  }, [])

  // Start / Restart game
  const startGame = (lvl: number = 1) => {
    setLevel(lvl)
    generateLevel(lvl)
  }

  // Check victory condition
  // Goal: Big Jug is filled to max with first color (8 units) AND all remaining bottles are sorted (each bottle is either empty or filled exclusively with one uniform color)
  useEffect(() => {
    if (gameState !== 'playing') return

    // 1. Big jug must be completely full (8 units)
    if (bigJug.count < BIG_JUG_CAPACITY || !bigJug.color) return

    // 2. All 8 bottles must be "closed" / sorted: either empty or all layers of the same color
    const allRemainingBottlesSorted = bottles.every((b) => {
      if (b.liquids.length === 0) return true
      const firstColor = b.liquids[0]
      return b.liquids.every((c) => c === firstColor)
    })

    if (allRemainingBottlesSorted) {
      setGameState('levelclear')
      const bonusXp = 150 + level * 50
      const bonusCoins = 180 + level * 60

      addReward(bonusXp, bonusCoins, `Laboratório de Garrafas: Nível ${level} Concluído! 🧪`)
      addQuestProgress('fill_bottles', 1)

      toast({
        title: '🎉 Lógica Perfeita!',
        description: `Garrafão de ${LIQUID_COLORS[bigJug.color].name} preenchido e garrafinhas organizadas! (+${bonusCoins} Moedas, +${bonusXp} XP)`,
        className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
      })
    }
  }, [bottles, bigJug, gameState, level, addReward, addQuestProgress])

  // Save current step to undo history
  const pushHistory = () => {
    setHistory((prev) => [
      ...prev.slice(-15), // keep up to 15 undo steps
      {
        bottles: bottles.map((b) => ({ ...b, liquids: [...b.liquids] })),
        bigJug: { ...bigJug },
      },
    ])
  }

  // Undo last action
  const handleUndo = () => {
    if (history.length === 0 || gameState !== 'playing') return
    const last = history[history.length - 1]
    setBottles(last.bottles)
    setBigJug(last.bigJug)
    setHistory((prev) => prev.slice(0, -1))
    setSelectedBottleIndex(null)
  }

  // Pour from selected bottle into Big Jug
  const handlePourToBigJug = () => {
    if (selectedBottleIndex === null || gameState !== 'playing') return
    const sourceBottle = bottles[selectedBottleIndex]

    if (sourceBottle.liquids.length === 0) {
      toast({
        title: 'Garrafinha Vazia!',
        description: 'Selecione uma garrafa que tenha líquidos.',
        variant: 'destructive',
      })
      return
    }

    const topLiquid = sourceBottle.liquids[sourceBottle.liquids.length - 1]

    // Rule 1: Big Jug only accepts ONE color
    if (bigJug.color !== null && bigJug.color !== topLiquid) {
      toast({
        title: 'Cor incompatível!',
        description: `O garrafão aceita apenas ${LIQUID_COLORS[bigJug.color].name}. Não misture cores!`,
        variant: 'destructive',
      })
      return
    }

    // Rule 2: Big Jug capacity
    if (bigJug.count >= BIG_JUG_CAPACITY) {
      toast({
        title: 'Garrafão Cheio!',
        description: 'O garrafão já atingiu a capacidade máxima (8 unidades).',
        variant: 'destructive',
      })
      return
    }

    pushHistory()

    // Count contiguous top liquid of same color in source bottle
    let transferCount = 0
    const newSourceLiquids = [...sourceBottle.liquids]
    while (
      newSourceLiquids.length > 0 &&
      newSourceLiquids[newSourceLiquids.length - 1] === topLiquid &&
      bigJug.count + transferCount < BIG_JUG_CAPACITY
    ) {
      newSourceLiquids.pop()
      transferCount++
    }

    setBigJug({
      color: topLiquid,
      count: bigJug.count + transferCount,
    })

    setBottles((prev) =>
      prev.map((b, idx) => (idx === selectedBottleIndex ? { ...b, liquids: newSourceLiquids } : b)),
    )

    setMovesCount((m) => m + 1)
    setSelectedBottleIndex(null)

    toast({
      title: 'Transferência Feita! 🧪',
      description: `+${transferCount} unidade(s) de ${LIQUID_COLORS[topLiquid].name} no Garrafão.`,
      className: 'bg-cyan-50 border-cyan-300 text-cyan-950 font-bold',
    })
  }

  // Click on a bottle on the shelf
  const handleBottleClick = (targetIndex: number) => {
    if (gameState !== 'playing') return

    // If none selected -> select this bottle if not empty
    if (selectedBottleIndex === null) {
      if (bottles[targetIndex].liquids.length > 0) {
        setSelectedBottleIndex(targetIndex)
      } else {
        toast({
          title: 'Garrafinha vazia!',
          description: 'Selecione uma garrafa que contenha líquidos para mover.',
        })
      }
      return
    }

    // If clicking same bottle -> deselect
    if (selectedBottleIndex === targetIndex) {
      setSelectedBottleIndex(null)
      return
    }

    // Try transferring from selectedBottle -> targetBottle (Water Sort Logic)
    const source = bottles[selectedBottleIndex]
    const target = bottles[targetIndex]

    if (source.liquids.length === 0) {
      setSelectedBottleIndex(null)
      return
    }

    if (target.liquids.length >= BOTTLE_CAPACITY) {
      toast({
        title: 'Garrafa Cheia!',
        description: 'Esta garrafinha já atingiu o limite de 6 andares.',
        variant: 'destructive',
      })
      setSelectedBottleIndex(targetIndex)
      return
    }

    const sourceTopColor = source.liquids[source.liquids.length - 1]
    const targetTopColor =
      target.liquids.length > 0 ? target.liquids[target.liquids.length - 1] : null

    // Target must be empty OR have same top color
    if (targetTopColor !== null && targetTopColor !== sourceTopColor) {
      toast({
        title: 'Cores Diferentes!',
        description: 'Você só pode despejar sobre a mesma cor ou em uma garrafa vazia.',
        variant: 'destructive',
      })
      setSelectedBottleIndex(targetIndex)
      return
    }

    pushHistory()

    // Calculate how many layers of top color can move
    const newSourceLiquids = [...source.liquids]
    const newTargetLiquids = [...target.liquids]
    let transferred = 0

    while (
      newSourceLiquids.length > 0 &&
      newSourceLiquids[newSourceLiquids.length - 1] === sourceTopColor &&
      newTargetLiquids.length < BOTTLE_CAPACITY
    ) {
      newTargetLiquids.push(newSourceLiquids.pop()!)
      transferred++
    }

    setBottles((prev) =>
      prev.map((b, idx) => {
        if (idx === selectedBottleIndex) return { ...b, liquids: newSourceLiquids }
        if (idx === targetIndex) return { ...b, liquids: newTargetLiquids }
        return b
      }),
    )

    setMovesCount((m) => m + 1)
    setSelectedBottleIndex(null)
  }

  const selectedBottle = selectedBottleIndex !== null ? bottles[selectedBottleIndex] : null
  const selectedTopColor =
    selectedBottle && selectedBottle.liquids.length > 0
      ? selectedBottle.liquids[selectedBottle.liquids.length - 1]
      : null

  return (
    <AuthGate>
      <div className="space-y-3 pb-6 animate-fade-in max-w-full">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                <FlaskConical className="w-7 h-7 text-[#00BCD4]" /> Jogo das Garrafas (Sort &
                Garrafão)
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                8 garrafas de 6 andares na prateleira • Preencha o garrafão com a cor-alvo e
                organize as garrafinhas!
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-3">
            <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 px-4 py-2 rounded-2xl flex items-center gap-4 shadow-sm">
              <div>
                <div className="text-[10px] font-black uppercase text-[#795548]">Nível</div>
                <div className="text-xl font-black text-[#00BCD4]">{level}</div>
              </div>
              <div className="w-[1px] h-6 bg-[#3E2723]/10" />
              <div>
                <div className="text-[10px] font-black uppercase text-[#795548]">Movimentos</div>
                <div className="text-xl font-black text-[#5E35B1] tabular-nums">{movesCount}</div>
              </div>
              <div className="w-[1px] h-6 bg-[#3E2723]/10" />
              <div>
                <div className="text-[10px] font-black uppercase text-[#795548]">Garrafão</div>
                <div className="text-xl font-black text-[#E65100] tabular-nums">
                  {bigJug.count}/{BIG_JUG_CAPACITY}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Objective & Actions Bar */}
        <div className="bg-[#E0F7FA] border-2 border-[#00BCD4] rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00BCD4] text-white flex items-center justify-center shrink-0 text-2xl shadow-sm">
              🧪
            </div>
            <div>
              <div className="text-xs font-black uppercase text-[#006064] tracking-wide">
                Missão do Nível {level}
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#004D40] leading-snug">
                {bigJug.color === null ? (
                  <>
                    Escolha a <strong>primeira cor</strong> a despejar no Garrafão. Depois, encha-o
                    até <strong>{BIG_JUG_CAPACITY} unidades</strong> e organize todas as garrafinhas
                    da prateleira por cor uniforme!
                  </>
                ) : (
                  <>
                    Cor do Garrafão fixada:{' '}
                    <strong
                      className="px-2 py-0.5 rounded-md text-white text-xs uppercase"
                      style={{ backgroundColor: LIQUID_COLORS[bigJug.color].hex }}
                    >
                      {LIQUID_COLORS[bigJug.color].name}
                    </strong>
                    . Faltam {BIG_JUG_CAPACITY - bigJug.count} unidade(s) para completar!
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={history.length === 0 || gameState !== 'playing'}
              className="rounded-2xl border-[#3E2723]/20 font-black h-10 px-3 hover:bg-amber-100"
            >
              <Undo2 className="w-4 h-4 mr-1.5" /> Desfazer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateLevel(level)}
              className="rounded-2xl border-[#3E2723]/20 font-black h-10 px-3 hover:bg-amber-100"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" /> Reiniciar Lote
            </Button>
          </div>
        </div>

        {/* MAIN GAME INTERACTIVE AREA: Shelf with 8 bottles + Large Jug Side Station */}
        <div className="relative bg-gradient-to-b from-[#241711] via-[#35241C] to-[#1C120D] border-4 border-[#3E2723]/30 rounded-3xl p-3 sm:p-6 shadow-2xl overflow-hidden min-h-[420px]">
          {/* Wooden Shelf Background Graphic Details */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D7CCC8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Idle screen overlay */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 z-20 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <FlaskConical className="w-16 h-16 text-[#00BCD4] mb-3 animate-bounce" />
              <h2 className="text-3xl font-black text-white mb-2">Laboratório das Garrafas</h2>
              <p className="text-sm text-gray-200 max-w-md mb-6 font-bold leading-relaxed">
                8 garrafinhas alinhadas na prateleira, cada uma com 6 andares de líquidos. Preencha
                o garrafão ao lado com apenas uma cor e organize as demais garrafas na sequência
                correta!
              </p>
              <Button
                onClick={() => startGame(1)}
                className="bg-[#00BCD4] hover:bg-[#00ACC1] text-white font-black text-lg py-6 px-8 rounded-2xl shadow-xl transition-transform active:scale-95"
              >
                <Play className="w-6 h-6 mr-2 fill-white" /> Iniciar Desafio das Garrafas
              </Button>
            </div>
          )}

          {/* Level Clear Overlay */}
          {gameState === 'levelclear' && (
            <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <Trophy className="w-16 h-16 text-[#FFD54F] mb-3 animate-bounce" />
              <h2 className="text-3xl font-black text-white mb-2">Nível {level} Concluído!</h2>
              <p className="text-sm text-gray-200 mb-6 font-bold max-w-sm">
                Excelente raciocínio lógico! O garrafão foi perfeitamente preenchido e todas as
                garrafas foram fechadas com as cores corretas.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => startGame(level + 1)}
                  className="bg-[#4CAF50] hover:bg-[#43A047] text-white font-black text-base py-5 px-8 rounded-2xl shadow-xl"
                >
                  Avançar para Nível {level + 1} 🚀
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10 items-end">
            {/* LEFT SIDE (Cols 1 to 3): Shelf with 8 Glass Bottles */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between text-xs text-amber-200/90 font-bold px-1">
                <span>
                  Prateleira de Vidro (8 Garrafas • Toque para selecionar / transferir líquidos)
                </span>
                {selectedBottleIndex !== null && (
                  <span className="text-amber-300 font-black animate-pulse">
                    Garrafa #{selectedBottleIndex + 1} Selecionada ⬆️
                  </span>
                )}
              </div>

              {/* 8 Bottles Shelf Grid (4 cols on mobile, 8 on tablet/desktop) */}
              <div className="relative pt-6 pb-4 px-3 sm:px-6 bg-[#2B1B14]/80 rounded-3xl border-2 border-[#5D4037]/50 shadow-inner">
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4 items-end">
                  {bottles.map((bottle, idx) => {
                    const isSelected = selectedBottleIndex === idx
                    const isFull = bottle.liquids.length === BOTTLE_CAPACITY
                    const isUniform =
                      bottle.liquids.length > 0 &&
                      bottle.liquids.every((c) => c === bottle.liquids[0])
                    const isCompleted = isFull && isUniform

                    return (
                      <div
                        key={bottle.id}
                        onClick={() => handleBottleClick(idx)}
                        className={`flex flex-col items-center cursor-pointer transition-all duration-200 select-none ${
                          isSelected ? '-translate-y-4 scale-105' : 'hover:-translate-y-1'
                        }`}
                      >
                        {/* Status badge above bottle */}
                        <div className="h-5 flex items-center justify-center mb-1">
                          {isSelected ? (
                            <span className="text-[10px] font-black bg-amber-400 text-[#3E2723] px-1.5 py-0.2 rounded-full">
                              Ativa
                            </span>
                          ) : isCompleted ? (
                            <span className="text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                              ✓
                            </span>
                          ) : null}
                        </div>

                        {/* Glass Bottle Body (6-tier cylinder with subtle glass reflections) */}
                        <div
                          className={`relative w-11 sm:w-14 h-40 sm:h-48 rounded-b-2xl rounded-t-lg border-2 backdrop-blur-xs flex flex-col justify-end p-1 transition-all shadow-lg ${
                            isSelected
                              ? 'border-amber-300 ring-4 ring-amber-400/50 bg-white/20 scale-105'
                              : isCompleted
                                ? 'border-emerald-400 bg-emerald-950/20 shadow-emerald-500/20'
                                : 'border-stone-400/60 bg-white/10 hover:border-amber-200'
                          }`}
                        >
                          {/* Bottle Cork / Neck */}
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-3 bg-amber-200/80 rounded-t-sm border border-stone-400/60" />

                          {/* 6 Liquid Layers Stacked */}
                          <div className="w-full h-full flex flex-col-reverse justify-start rounded-b-xl overflow-hidden gap-[1px]">
                            {bottle.liquids.map((color, layerIdx) => {
                              const colorDef = LIQUID_COLORS[color]
                              return (
                                <div
                                  key={layerIdx}
                                  className="w-full h-[16.6%] relative rounded-xs transition-all duration-300 flex items-center justify-center group"
                                  style={{
                                    backgroundColor: colorDef.hex,
                                    borderTop: `1px solid ${colorDef.lightHex}`,
                                  }}
                                  title={`${colorDef.name} (Andar ${layerIdx + 1})`}
                                >
                                  {/* Gloss shine reflection line */}
                                  <div className="absolute left-1 top-0 bottom-0 w-1 bg-white/30 rounded-full pointer-events-none" />
                                </div>
                              )
                            })}
                          </div>

                          {/* Empty Level Guide Ticks (6 markings) */}
                          <div className="absolute inset-y-1 right-1 flex flex-col justify-between pointer-events-none opacity-40">
                            {[1, 2, 3, 4, 5, 6].map((tick) => (
                              <div key={tick} className="w-1.5 h-[1px] bg-white" />
                            ))}
                          </div>
                        </div>

                        {/* Bottle Label Number */}
                        <div className="mt-2 text-[11px] font-bold text-amber-200/80">
                          #{idx + 1}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Wooden Shelf Plinth */}
                <div className="w-full h-4 mt-3 bg-gradient-to-r from-[#5D4037] via-[#8D6E63] to-[#5D4037] rounded-xl shadow-md border-t border-[#A1887F]" />
              </div>

              {/* Action helper bar when a bottle is selected */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#3E2723]/60 p-3 rounded-2xl border border-amber-300/30">
                <div className="text-xs text-amber-100 font-bold">
                  {selectedBottleIndex !== null ? (
                    <>
                      Garrafa <strong>#{selectedBottleIndex + 1}</strong> ativa (Cor no topo:{' '}
                      <span
                        className="px-2 py-0.5 rounded-md text-white text-[11px] font-black uppercase"
                        style={{
                          backgroundColor: selectedTopColor
                            ? LIQUID_COLORS[selectedTopColor].hex
                            : '#777',
                        }}
                      >
                        {selectedTopColor ? LIQUID_COLORS[selectedTopColor].name : 'Vazia'}
                      </span>
                      )
                    </>
                  ) : (
                    '💡 Clique em uma garrafa para selecioná-la e transferir líquidos.'
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePourToBigJug}
                    disabled={selectedBottleIndex === null || gameState !== 'playing'}
                    className="bg-[#00BCD4] hover:bg-[#00ACC1] text-white font-black text-xs rounded-xl h-9 px-4 shadow-sm disabled:opacity-50"
                  >
                    Despejar no Garrafão ➡️
                  </Button>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE (Col 4): The Big Monochromatic Jug */}
            <div className="bg-[#2B1B14]/90 border-2 border-cyan-400/40 rounded-3xl p-5 flex flex-col items-center justify-between text-center shadow-xl">
              <div className="space-y-1 mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-900/60 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Garrafão Principal
                </div>
                <h3 className="text-lg font-black text-white">Garrafão Alvo</h3>
                <p className="text-[11px] text-stone-300 font-bold">
                  {bigJug.color === null
                    ? 'Aceita apenas 1 cor por vez!'
                    : `Cor fixada: ${LIQUID_COLORS[bigJug.color].name}`}
                </p>
              </div>

              {/* Big Jug Graphic (8-capacity wide vessel) */}
              <div className="relative w-28 sm:w-32 h-60 rounded-b-3xl rounded-t-xl border-4 border-cyan-300/60 backdrop-blur-sm bg-white/10 flex flex-col justify-end p-2 my-2 shadow-2xl">
                {/* Jug Neck & Handle */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-4 bg-cyan-100/90 rounded-t-md border-2 border-cyan-300/80" />
                <div className="absolute top-8 -right-4 w-5 h-16 rounded-r-2xl border-4 border-cyan-300/60 border-l-0 pointer-events-none" />

                {/* Liquid fill inside Big Jug */}
                <div className="w-full h-full flex flex-col-reverse justify-start rounded-b-2xl overflow-hidden relative">
                  {bigJug.count > 0 && bigJug.color && (
                    <div
                      className="w-full transition-all duration-500 relative"
                      style={{
                        height: `${(bigJug.count / BIG_JUG_CAPACITY) * 100}%`,
                        backgroundColor: LIQUID_COLORS[bigJug.color].hex,
                        borderTop: `2px solid ${LIQUID_COLORS[bigJug.color].lightHex}`,
                      }}
                    >
                      {/* Wave shine */}
                      <div className="absolute left-2 top-0 bottom-0 w-2 bg-white/30 rounded-full" />
                    </div>
                  )}

                  {/* Empty state prompt inside jug */}
                  {bigJug.count === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-2 text-cyan-200/50 text-[11px] font-bold">
                      <span>Vazio</span>
                      <span className="text-[9px]">0 / {BIG_JUG_CAPACITY}</span>
                    </div>
                  )}
                </div>

                {/* Capacity ticks */}
                <div className="absolute inset-y-2 right-2 flex flex-col justify-between pointer-events-none opacity-50">
                  {Array.from({ length: BIG_JUG_CAPACITY }).map((_, i) => (
                    <div key={i} className="w-2 h-[1.5px] bg-cyan-200" />
                  ))}
                </div>
              </div>

              {/* Jug Progress Summary */}
              <div className="w-full space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs font-black text-cyan-200">
                  <span>Volume</span>
                  <span>
                    {bigJug.count} / {BIG_JUG_CAPACITY} un.
                  </span>
                </div>
                <div className="w-full h-3 bg-stone-900 rounded-full overflow-hidden p-0.5 border border-cyan-400/40">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(bigJug.count / BIG_JUG_CAPACITY) * 100}%`,
                      backgroundColor: bigJug.color ? LIQUID_COLORS[bigJug.color].hex : '#00BCD4',
                    }}
                  />
                </div>

                <Button
                  onClick={handlePourToBigJug}
                  disabled={selectedBottleIndex === null || gameState !== 'playing'}
                  className="w-full bg-[#00BCD4] hover:bg-[#00ACC1] text-white font-black text-xs rounded-2xl h-11 mt-1 shadow-md"
                >
                  Transferir para Cá 💧
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Rules & Help Card */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-black text-[#3E2723]">
            <HelpCircle className="w-5 h-5 text-[#00BCD4]" />
            Como Jogar o Novo Modo das Garrafas:
          </div>
          <ul className="text-xs text-[#795548] font-bold space-y-1.5 list-disc list-inside leading-relaxed">
            <li>
              <strong>1. Selecionar e Mover:</strong> Toque em uma garrafinha para ativá-la e toque
              em outra garrafa para transferir líquidos (apenas sobre a mesma cor ou garrafa vazia).
            </li>
            <li>
              <strong>2. O Garrafão Principal:</strong> Aceita <strong>apenas uma cor</strong> por
              vez. Despeje líquidos da sua primeira cor escolhida nele até atingir 8 unidades.
            </li>
            <li>
              <strong>3. Fechar as Garrafinhas:</strong> Enquanto enche o garrafão, reorganize os
              outros líquidos para que cada garrafa na prateleira fique 100% pura (apenas uma cor
              uniforme).
            </li>
            <li>
              <strong>4. Recompensas:</strong> Vencer o lote concede ouro e XP que sobem de nível em
              todo o RPG!
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
