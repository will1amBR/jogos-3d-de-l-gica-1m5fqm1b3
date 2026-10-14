import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  HelpCircle,
  Lightbulb,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'

export interface PyramidCard {
  id: string
  suit: Suit
  value: number // 1 (A) .. 13 (K)
  row: number
  col: number
  removed: boolean
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
}

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1A1A1A',
  hearts: '#D32F2F',
  clubs: '#2E7D32',
  diamonds: '#E65100',
}

const VALUE_LABELS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
}

interface PyramidHistoryState {
  pyramid: PyramidCard[]
  stock: PyramidCard[]
  waste: PyramidCard[]
  score: number
  moves: number
}

function generateDeck(): { suit: Suit; value: number }[] {
  const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
  const deck: { suit: Suit; value: number }[] = []
  suits.forEach((suit) => {
    for (let v = 1; v <= 13; v++) {
      deck.push({ suit, value: v })
    }
  })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

type SelectedSource = { type: 'pyramid'; cardId: string } | { type: 'waste' }

export default function Piramide() {
  const { addReward } = useGame()

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [pyramid, setPyramid] = useState<PyramidCard[]>([])
  const [stock, setStock] = useState<PyramidCard[]>([])
  const [waste, setWaste] = useState<PyramidCard[]>([])
  const [selected, setSelected] = useState<SelectedSource | null>(null)
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isWon, setIsWon] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [history, setHistory] = useState<PyramidHistoryState[]>([])

  const winClaimedRef = useRef(false)
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

  const playSound = useCallback(
    (type: 'card' | 'match' | 'win' | 'error') => {
      if (!soundEnabled) return
      try {
        const ctx = getAudioContext()
        if (!ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        const now = ctx.currentTime

        if (type === 'card') {
          osc.frequency.setValueAtTime(450, now)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
          osc.start(now)
          osc.stop(now + 0.05)
        } else if (type === 'match') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(523.25, now)
          osc.frequency.setValueAtTime(659.25, now + 0.07)
          osc.frequency.setValueAtTime(783.99, now + 0.14)
          gain.gain.setValueAtTime(0.12, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
          osc.start(now)
          osc.stop(now + 0.25)
        } else if (type === 'win') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.linearRampToValueAtTime(880, now + 0.3)
          gain.gain.setValueAtTime(0.2, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
          osc.start(now)
          osc.stop(now + 0.6)
        } else if (type === 'error') {
          osc.frequency.setValueAtTime(170, now)
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.08)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        }
      } catch {
        // audio fail safe
      }
    },
    [soundEnabled, getAudioContext],
  )

  // Start new game: 28 cards in 7 rows pyramid, 24 in stock
  const startNewGame = useCallback(() => {
    const rawDeck = generateDeck()
    const newPyramid: PyramidCard[] = []
    let deckIdx = 0

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c <= r; c++) {
        const item = rawDeck[deckIdx++]
        newPyramid.push({
          id: `pyr_${r}_${c}`,
          suit: item.suit,
          value: item.value,
          row: r,
          col: c,
          removed: false,
        })
      }
    }

    const remainingStock: PyramidCard[] = []
    while (deckIdx < rawDeck.length) {
      const item = rawDeck[deckIdx++]
      remainingStock.push({
        id: `stk_${deckIdx}`,
        suit: item.suit,
        value: item.value,
        row: -1,
        col: -1,
        removed: false,
      })
    }

    setPyramid(newPyramid)
    setStock(remainingStock)
    setWaste([])
    setSelected(null)
    setMoves(0)
    setScore(0)
    setElapsedSeconds(0)
    setIsWon(false)
    setHasStarted(true)
    setHint(null)
    setHistory([])
    winClaimedRef.current = false
    playSound('match')
  }, [playSound])

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  // Timer
  useEffect(() => {
    if (!hasStarted || isWon) return
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [hasStarted, isWon])

  // Push history
  const pushHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-30),
      {
        pyramid: pyramid.map((c) => ({ ...c })),
        stock: stock.map((c) => ({ ...c })),
        waste: waste.map((c) => ({ ...c })),
        score,
        moves,
      },
    ])
  }, [pyramid, stock, waste, score, moves])

  // Undo
  const handleUndo = () => {
    if (history.length === 0 || isWon) return
    const last = history[history.length - 1]
    setPyramid(last.pyramid)
    setStock(last.stock)
    setWaste(last.waste)
    setScore(last.score)
    setMoves(last.moves)
    setHistory((prev) => prev.slice(0, -1))
    setSelected(null)
    setHint(null)
    playSound('card')
  }

  // Check if a card in pyramid is exposed (no cards covering it in row + 1)
  const isCardExposed = useCallback(
    (card: PyramidCard): boolean => {
      if (card.removed) return false
      if (card.row === 6) return true // bottom row is always exposed
      // Look at children: (row+1, col) and (row+1, col+1)
      const leftChild = pyramid.find((c) => c.row === card.row + 1 && c.col === card.col)
      const rightChild = pyramid.find((c) => c.row === card.row + 1 && c.col === card.col + 1)
      const leftCovered = leftChild && !leftChild.removed
      const rightCovered = rightChild && !rightChild.removed
      return !leftCovered && !rightCovered
    },
    [pyramid],
  )

  const remainingPyramidCards = useMemo(() => pyramid.filter((c) => !c.removed).length, [pyramid])

  // Check victory: all 28 pyramid cards removed
  useEffect(() => {
    if (remainingPyramidCards === 0 && pyramid.length > 0 && !isWon) {
      setIsWon(true)
    }
  }, [remainingPyramidCards, pyramid.length, isWon])

  // Win rewards
  useEffect(() => {
    if (isWon && !winClaimedRef.current) {
      winClaimedRef.current = true
      playSound('win')

      const bonusXp = 380
      const bonusCoins = 500
      addReward(bonusXp, bonusCoins, 'Vitória na Paciência Pirâmide!')

      toast({
        title: '👑 PIRÂMIDE DESMONTADA!',
        description: `Você eliminou todas as 28 cartas da pirâmide somando 13! +${bonusCoins} Moedas e +${bonusXp} XP adicionados!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
    }
  }, [isWon, addReward, playSound])

  // Stock draw
  const handleStockClick = () => {
    if (isWon) return
    pushHistory()
    if (stock.length > 0) {
      const nextStock = [...stock]
      const drawn = nextStock.pop()!
      setStock(nextStock)
      setWaste((prev) => [...prev, drawn])
      setMoves((m) => m + 1)
      playSound('card')
    } else {
      if (waste.length === 0) return
      setStock([...waste].reverse())
      setWaste([])
      setMoves((m) => m + 1)
      playSound('card')
    }
    setSelected(null)
  }

  // Handle click on King (value 13 removes alone) or combination summing to 13
  const handleCardClick = (card: PyramidCard, source: SelectedSource) => {
    if (isWon) return

    // If it's a King (value 13), it removes instantly alone!
    if (card.value === 13) {
      pushHistory()
      if (source.type === 'pyramid') {
        setPyramid((prev) => prev.map((c) => (c.id === card.id ? { ...c, removed: true } : c)))
      } else {
        setWaste((prev) => prev.slice(0, -1))
      }
      setScore((s) => s + 50)
      setMoves((m) => m + 1)
      playSound('match')
      setSelected(null)
      toast({
        title: 'Rei Eliminado! 👑',
        description: 'O Rei vale 13 e é removido sozinho.',
        className: 'bg-amber-50 border-amber-300 text-amber-950 font-bold',
      })
      return
    }

    if (!selected) {
      setSelected(source)
      playSound('card')
      return
    }

    // If clicking same selected card, cancel
    if (
      (selected.type === 'pyramid' && source.type === 'pyramid' && selected.cardId === card.id) ||
      (selected.type === 'waste' && source.type === 'waste')
    ) {
      setSelected(null)
      return
    }

    // Determine first selected card
    let firstCard: PyramidCard | null = null
    if (selected.type === 'pyramid') {
      firstCard = pyramid.find((c) => c.id === selected.cardId) || null
    } else {
      firstCard = waste.length > 0 ? waste[waste.length - 1] : null
    }

    if (!firstCard) {
      setSelected(null)
      return
    }

    // Check sum === 13
    if (firstCard.value + card.value === 13) {
      pushHistory()

      // Remove first card
      if (selected.type === 'pyramid') {
        setPyramid((prev) =>
          prev.map((c) => (c.id === selected.cardId ? { ...c, removed: true } : c)),
        )
      } else {
        setWaste((prev) => prev.slice(0, -1))
      }

      // Remove second card
      if (source.type === 'pyramid') {
        setPyramid((prev) => prev.map((c) => (c.id === card.id ? { ...c, removed: true } : c)))
      } else {
        setWaste((prev) => prev.slice(0, -1))
      }

      setScore((s) => s + 40)
      setMoves((m) => m + 1)
      playSound('match')
      setSelected(null)
      toast({
        title: 'Soma 13! ✨',
        description: `${VALUE_LABELS[firstCard.value]} + ${VALUE_LABELS[card.value]} = 13! Par removido.`,
        className: 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold',
      })
    } else {
      playSound('error')
      toast({
        title: 'Soma diferente de 13',
        description: `${VALUE_LABELS[firstCard.value]} (${firstCard.value}) + ${VALUE_LABELS[card.value]} (${card.value}) = ${
          firstCard.value + card.value
        }. O total deve ser exatamente 13!`,
        variant: 'destructive',
      })
      setSelected(null)
    }
  }

  // Hint
  const handleHint = () => {
    if (isWon) return

    const exposed = pyramid.filter((c) => isCardExposed(c))
    const topWaste = waste.length > 0 ? waste[waste.length - 1] : null

    // 1. King in exposed or waste
    const kingInPyr = exposed.find((c) => c.value === 13)
    if (kingInPyr) {
      setHint(`Toque no Rei (K) exposto na Pirâmide para removê-lo sozinho!`)
      playSound('card')
      return
    }
    if (topWaste && topWaste.value === 13) {
      setHint(`Toque no Rei (K) no descarte para removê-lo sozinho!`)
      playSound('card')
      return
    }

    // 2. Pair between exposed pyramid cards
    for (let i = 0; i < exposed.length; i++) {
      for (let j = i + 1; j < exposed.length; j++) {
        if (exposed[i].value + exposed[j].value === 13) {
          setHint(
            `Combine ${VALUE_LABELS[exposed[i].value]} com ${VALUE_LABELS[exposed[j].value]} na Pirâmide para somar 13!`,
          )
          playSound('card')
          return
        }
      }
    }

    // 3. Pair between exposed and waste
    if (topWaste) {
      const matchInPyr = exposed.find((c) => c.value + topWaste.value === 13)
      if (matchInPyr) {
        setHint(
          `Combine ${VALUE_LABELS[topWaste.value]} do descarte com ${VALUE_LABELS[matchInPyr.value]} da Pirâmide!`,
        )
        playSound('card')
        return
      }
    }

    if (stock.length > 0) {
      setHint('Dica: Toque no estoque para comprar cartas e abrir novos pares de 13!')
    } else {
      setHint('Sem combinações óbvias. Recicle o estoque ou use Desfazer.')
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <AuthGate>
      <div className="space-y-2.5 pb-8 animate-fade-in select-none w-full max-w-full overflow-hidden">
        {/* Header / Nav */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-[#3E2723]/20 font-black hover:bg-amber-100 text-[#3E2723]"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#3E2723] flex items-center gap-2">
                <span className="text-2xl">🔺</span> Paciência Pirâmide
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Some pares iguais a 13 • Reis (K) saem sozinhos • Limpe todas as 28 cartas da
                pirâmide!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Pontuação
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#E65100] tabular-nums">
              {score}
            </span>
          </div>

          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Movimentos
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#5E35B1] tabular-nums">
              {moves}
            </span>
          </div>

          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Tempo
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#2E7D32] tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Pirâmide Restante
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-[#D84315] tabular-nums">
                {remainingPyramidCards} / 28
              </span>
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-300" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
            <Button
              onClick={handleUndo}
              disabled={history.length === 0 || isWon}
              variant="outline"
              className="flex-1 h-full min-h-[46px] rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-xs text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
            >
              <Undo2 className="w-4 h-4 text-[#5E35B1]" />
              <span>Desfazer</span>
            </Button>
            <Button
              onClick={handleHint}
              disabled={isWon}
              variant="outline"
              className="flex-1 h-full min-h-[46px] rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-xs text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
            >
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span>Dica</span>
            </Button>
            <Button
              onClick={startNewGame}
              variant="outline"
              className="h-full min-h-[46px] px-3 rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-xs text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
              title="Nova Partida"
            >
              <RotateCcw className="w-4 h-4 text-[#2E7D32]" />
              <span className="hidden sm:inline">Reiniciar</span>
            </Button>
          </div>
        </div>

        {hint && (
          <div className="bg-amber-100 border border-amber-300 rounded-2xl px-4 py-2 flex items-center justify-between text-xs font-black text-amber-950 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>{hint}</span>
            </div>
            <button
              onClick={() => setHint(null)}
              className="text-amber-800 underline hover:text-amber-950 text-xs px-2 py-0.5"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Selected banner */}
        {selected && (
          <div className="bg-emerald-100 border border-emerald-300 rounded-2xl px-4 py-2 flex items-center justify-between text-xs font-black text-emerald-950 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">👉</span>
              <span>
                Carta selecionada:{' '}
                {selected.type === 'waste'
                  ? waste[waste.length - 1]
                    ? `${VALUE_LABELS[waste[waste.length - 1].value]} (${waste[waste.length - 1].value})`
                    : ''
                  : (() => {
                      const c = pyramid.find((p) => p.id === selected.cardId)
                      return c ? `${VALUE_LABELS[c.value]} (${c.value})` : ''
                    })()}
                {' — '}Toque em outra carta para somar 13!
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-emerald-800 underline hover:text-emerald-950 text-xs px-2 py-0.5"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Feltro Verde e Arena da Pirâmide */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#1b5e20] via-[#2e7d32] to-[#154d1a] border-4 border-[#33691E] p-2 sm:p-4 shadow-2xl overflow-hidden min-h-[560px]">
          <div className="absolute inset-0 bg-radial from-transparent to-black/30 pointer-events-none" />

          {/* Pirâmide de 7 andares centralizada */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2 mb-6">
            {Array.from({ length: 7 }).map((_, rowIdx) => {
              const rowCards = pyramid.filter((c) => c.row === rowIdx)
              return (
                <div key={rowIdx} className="flex items-center justify-center gap-1 sm:gap-2">
                  {rowCards.map((card) => {
                    const exposed = isCardExposed(card)
                    const isSelected = selected?.type === 'pyramid' && selected.cardId === card.id

                    if (card.removed) {
                      return (
                        <div
                          key={card.id}
                          className="w-10 h-14 sm:w-14 sm:h-20 rounded-xl border border-dashed border-white/10 opacity-20"
                        />
                      )
                    }

                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          if (exposed) {
                            handleCardClick(card, { type: 'pyramid', cardId: card.id })
                          } else {
                            playSound('error')
                            toast({
                              title: 'Carta Coberta!',
                              description:
                                'Esta carta está coberta por outras duas na linha de baixo.',
                            })
                          }
                        }}
                        className={`relative w-10 h-14 sm:w-14 sm:h-20 rounded-xl border flex flex-col justify-between p-1 transition-all select-none ${
                          exposed
                            ? 'bg-white border-stone-300 shadow-md cursor-pointer hover:scale-105 hover:border-amber-400'
                            : 'bg-[#ECE5D8] border-stone-400 opacity-60 cursor-not-allowed'
                        } ${isSelected ? 'ring-3 ring-amber-400 border-amber-500 scale-110 shadow-2xl bg-amber-50' : ''}`}
                      >
                        <div className="flex items-center justify-between leading-none">
                          <span
                            className="text-[10px] sm:text-xs font-black"
                            style={{ color: SUIT_COLORS[card.suit] }}
                          >
                            {VALUE_LABELS[card.value]}
                          </span>
                          <span
                            className="text-[10px] sm:text-xs"
                            style={{ color: SUIT_COLORS[card.suit] }}
                          >
                            {SUIT_SYMBOLS[card.suit]}
                          </span>
                        </div>

                        <div className="text-center">
                          <span
                            className="text-base sm:text-2xl leading-none"
                            style={{ color: SUIT_COLORS[card.suit] }}
                          >
                            {SUIT_SYMBOLS[card.suit]}
                          </span>
                        </div>

                        <div className="text-right leading-none opacity-60">
                          <span
                            className="text-[8px] font-bold"
                            style={{ color: SUIT_COLORS[card.suit] }}
                          >
                            {card.value}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Área Inferior: Estoque & Descarte */}
          <div className="relative z-10 flex items-center justify-center gap-4 pt-3 border-t border-white/20">
            {/* Estoque */}
            <div
              onClick={handleStockClick}
              className="relative aspect-[5/7] w-12 sm:w-16 rounded-xl border-2 border-white/80 cursor-pointer shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95 bg-gradient-to-br from-[#1E88E5] to-[#1565C0]"
            >
              {stock.length > 0 ? (
                <div className="flex flex-col items-center">
                  <span className="text-lg sm:text-2xl text-white">🂠</span>
                  <span className="text-[9px] font-black text-white/90">{stock.length}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-white/60">
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-[8px] font-black uppercase">Reciclar</span>
                </div>
              )}
            </div>

            {/* Descarte */}
            <div
              onClick={() => {
                if (waste.length > 0) {
                  const top = waste[waste.length - 1]
                  handleCardClick(top, { type: 'waste' })
                }
              }}
              className={`relative aspect-[5/7] w-12 sm:w-16 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all ${
                waste.length > 0
                  ? 'bg-white border-amber-300 shadow-md hover:scale-105'
                  : 'bg-black/20 border-dashed border-white/30'
              } ${selected?.type === 'waste' ? 'ring-3 ring-amber-400 scale-110 shadow-2xl bg-amber-50' : ''}`}
            >
              {waste.length > 0 ? (
                (() => {
                  const top = waste[waste.length - 1]
                  return (
                    <div className="w-full h-full p-1 flex flex-col justify-between items-center select-none">
                      <div className="w-full flex items-center justify-between leading-none">
                        <span
                          className="text-xs sm:text-sm font-black"
                          style={{ color: SUIT_COLORS[top.suit] }}
                        >
                          {VALUE_LABELS[top.value]}
                        </span>
                        <span
                          className="text-xs sm:text-sm"
                          style={{ color: SUIT_COLORS[top.suit] }}
                        >
                          {SUIT_SYMBOLS[top.suit]}
                        </span>
                      </div>
                      <span
                        className="text-lg sm:text-2xl leading-none"
                        style={{ color: SUIT_COLORS[top.suit] }}
                      >
                        {SUIT_SYMBOLS[top.suit]}
                      </span>
                      <span
                        className="text-[9px] font-bold opacity-60 leading-none"
                        style={{ color: SUIT_COLORS[top.suit] }}
                      >
                        {top.value}
                      </span>
                    </div>
                  )
                })()
              ) : (
                <span className="text-[9px] text-white/40 font-bold">Vazio</span>
              )}
            </div>
          </div>

          {/* Victory Modal */}
          {isWon && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-scale-in space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                  🔺
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#3E2723]">
                    Pirâmide Concluída!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#795548] font-bold mt-1">
                    Você eliminou todas as 28 cartas da pirâmide com combinações perfeitas!
                  </p>
                </div>

                <div className="bg-[#F5ECE1] rounded-2xl p-4 border border-amber-200 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <span className="text-[10px] font-black text-[#795548] uppercase">
                      Movimentos
                    </span>
                    <p className="text-xl font-black text-[#5E35B1]">{moves}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#795548] uppercase">
                      Tempo Total
                    </span>
                    <p className="text-xl font-black text-[#2E7D32]">
                      {formatTime(elapsedSeconds)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-[#2E7D32]">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>+500 Moedas e +380 XP creditados na sua conta!</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={startNewGame}
                    className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-4 rounded-2xl shadow-md"
                  >
                    Jogar Novamente
                  </Button>
                  <Link to="/" className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-2 border-[#3E2723]/20 font-black py-4 rounded-2xl"
                    >
                      Voltar ao Hub
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Guia de Valores que Somam 13 */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-4 text-xs text-[#795548] space-y-1 font-bold">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Tabela de Combinações que Somam 13:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <span className="bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
              👑 <strong>Rei (K = 13)</strong>: Sai sozinho
            </span>
            <span className="bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
              👸 <strong>Dama (Q = 12)</strong> + Ás (A = 1)
            </span>
            <span className="bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
              🗡️ <strong>Valete (J = 11)</strong> + 2
            </span>
            <span className="bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
              🔟 <strong>10</strong> + 3
            </span>
            <span className="bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
              9️⃣ <strong>9</strong> + 4
            </span>
            <span className="bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
              8️⃣ <strong>8</strong> + 5
            </span>
            <span className="bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
              7️⃣ <strong>7</strong> + 6
            </span>
            <span className="bg-emerald-100/60 p-1.5 rounded-lg border border-emerald-300 text-emerald-950 font-black">
              🎯 Objetivo: Limpar a pirâmide
            </span>
          </div>
        </div>
      </div>
    </AuthGate>
  )
}
