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
  Zap,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'

export interface Card {
  id: string
  suit: Suit
  value: number // 1 (A) .. 13 (K)
  faceUp: boolean
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

const SUIT_IS_RED: Record<Suit, boolean> = {
  spades: false,
  hearts: true,
  clubs: false,
  diamonds: true,
}

interface KlondikeHistoryState {
  stock: Card[]
  waste: Card[]
  foundations: Record<Suit, number>
  tableau: Card[][]
  moves: number
  score: number
}

function generateDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
  const deck: Card[] = []
  suits.forEach((suit) => {
    for (let v = 1; v <= 13; v++) {
      deck.push({
        id: `kl_${suit}_${v}`,
        suit,
        value: v,
        faceUp: false,
      })
    }
  })

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

type SelectedSource = { type: 'waste' } | { type: 'tableau'; colIndex: number; cardIndex: number }

export default function Paciencia() {
  const { addReward } = useGame()

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [stock, setStock] = useState<Card[]>([])
  const [waste, setWaste] = useState<Card[]>([])
  const [foundations, setFoundations] = useState<Record<Suit, number>>({
    spades: 0,
    hearts: 0,
    clubs: 0,
    diamonds: 0,
  })
  const [tableau, setTableau] = useState<Card[][]>(() => Array.from({ length: 7 }, () => []))
  const [selected, setSelected] = useState<SelectedSource | null>(null)
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isWon, setIsWon] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [history, setHistory] = useState<KlondikeHistoryState[]>([])

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
    (type: 'card' | 'snap' | 'foundation' | 'win' | 'error') => {
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
          osc.frequency.setValueAtTime(460, now)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
          osc.start(now)
          osc.stop(now + 0.05)
        } else if (type === 'snap') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(520, now)
          osc.frequency.exponentialRampToValueAtTime(740, now + 0.08)
          gain.gain.setValueAtTime(0.1, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        } else if (type === 'foundation') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(523.25, now)
          osc.frequency.setValueAtTime(659.25, now + 0.07)
          osc.frequency.setValueAtTime(783.99, now + 0.14)
          gain.gain.setValueAtTime(0.14, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
          osc.start(now)
          osc.stop(now + 0.3)
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

  // Start new game
  const startNewGame = useCallback(() => {
    const deck = generateDeck()
    const newTableau: Card[][] = Array.from({ length: 7 }, () => [])

    let deckIdx = 0
    for (let col = 0; col < 7; col++) {
      for (let r = 0; r <= col; r++) {
        const card = deck[deckIdx++]
        card.faceUp = r === col // top card of each column is face up
        newTableau[col].push(card)
      }
    }

    const remainingStock = deck.slice(deckIdx).map((c) => ({ ...c, faceUp: false }))

    setTableau(newTableau)
    setStock(remainingStock)
    setWaste([])
    setFoundations({ spades: 0, hearts: 0, clubs: 0, diamonds: 0 })
    setSelected(null)
    setMoves(0)
    setScore(0)
    setElapsedSeconds(0)
    setIsWon(false)
    setHasStarted(true)
    setHint(null)
    setHistory([])
    winClaimedRef.current = false
    playSound('snap')
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
        stock: stock.map((c) => ({ ...c })),
        waste: waste.map((c) => ({ ...c })),
        foundations: { ...foundations },
        tableau: tableau.map((col) => col.map((c) => ({ ...c }))),
        moves,
        score,
      },
    ])
  }, [stock, waste, foundations, tableau, moves, score])

  // Undo
  const handleUndo = () => {
    if (history.length === 0 || isWon) return
    const last = history[history.length - 1]
    setStock(last.stock)
    setWaste(last.waste)
    setFoundations(last.foundations)
    setTableau(last.tableau)
    setMoves(last.moves)
    setScore(last.score)
    setHistory((prev) => prev.slice(0, -1))
    setSelected(null)
    setHint(null)
    playSound('card')
  }

  // Foundations total
  const totalFoundationCards = useMemo(
    () => Object.values(foundations).reduce((acc, v) => acc + v, 0),
    [foundations],
  )

  useEffect(() => {
    if (totalFoundationCards === 52 && !isWon) {
      setIsWon(true)
    }
  }, [totalFoundationCards, isWon])

  // Win reward integration
  useEffect(() => {
    if (isWon && !winClaimedRef.current) {
      winClaimedRef.current = true
      playSound('win')

      const bonusXp = 320
      const bonusCoins = 400
      addReward(bonusXp, bonusCoins, 'Vitória na Paciência Klondike!')

      toast({
        title: '🏆 PACIÊNCIA CONCLUÍDA!',
        description: `Todas as 52 cartas organizadas nas fundações! +${bonusCoins} Moedas e +${bonusXp} XP adicionados!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
    }
  }, [isWon, addReward, playSound])

  // Stock draw
  const handleStockClick = () => {
    if (isWon) return
    pushHistory()

    if (stock.length > 0) {
      // Draw 1 card to waste
      const nextStock = [...stock]
      const drawn = nextStock.pop()!
      drawn.faceUp = true
      setStock(nextStock)
      setWaste((prev) => [...prev, drawn])
      setMoves((m) => m + 1)
      playSound('card')
    } else {
      // Recycle waste back to stock
      if (waste.length === 0) return
      const recycled = [...waste].reverse().map((c) => ({ ...c, faceUp: false }))
      setStock(recycled)
      setWaste([])
      setMoves((m) => m + 1)
      playSound('card')
    }
    setSelected(null)
  }

  // Handle Foundation Click (send selected card to foundation)
  const handleFoundationClick = (suit: Suit) => {
    if (!selected || isWon) return

    let movingCard: Card | null = null
    if (selected.type === 'waste') {
      if (waste.length > 0) movingCard = waste[waste.length - 1]
    } else {
      const col = tableau[selected.colIndex]
      if (selected.cardIndex === col.length - 1) {
        movingCard = col[col.length - 1]
      }
    }

    if (!movingCard) {
      playSound('error')
      setSelected(null)
      return
    }

    if (movingCard.suit === suit && movingCard.value === foundations[suit] + 1) {
      pushHistory()
      if (selected.type === 'waste') {
        setWaste((prev) => prev.slice(0, -1))
      } else {
        setTableau((prev) => {
          const next = prev.map((c) => [...c])
          next[selected.colIndex].pop()
          // Flip new top card if face down
          if (next[selected.colIndex].length > 0) {
            next[selected.colIndex][next[selected.colIndex].length - 1].faceUp = true
          }
          return next
        })
      }
      setFoundations((prev) => ({ ...prev, [suit]: movingCard!.value }))
      setScore((s) => s + 50)
      setMoves((m) => m + 1)
      playSound('foundation')
      setSelected(null)
    } else {
      playSound('error')
      toast({
        title: 'Movimento Inválido na Fundação',
        description: `A fundação de ${SUIT_SYMBOLS[suit]} precisa da carta ${
          VALUE_LABELS[foundations[suit] + 1] || 'A'
        }.`,
        variant: 'destructive',
      })
      setSelected(null)
    }
  }

  // Try move single card to foundation
  const tryMoveCardToFoundation = (card: Card, source: SelectedSource): boolean => {
    if (card.value === foundations[card.suit] + 1) {
      pushHistory()
      if (source.type === 'waste') {
        setWaste((prev) => prev.slice(0, -1))
      } else {
        setTableau((prev) => {
          const next = prev.map((c) => [...c])
          next[source.colIndex].pop()
          if (next[source.colIndex].length > 0) {
            next[source.colIndex][next[source.colIndex].length - 1].faceUp = true
          }
          return next
        })
      }
      setFoundations((prev) => ({ ...prev, [card.suit]: card.value }))
      setScore((s) => s + 50)
      setMoves((m) => m + 1)
      playSound('foundation')
      setSelected(null)
      return true
    }
    return false
  }

  // Handle Tableau Column Click
  const handleTableauClick = (targetColIdx: number, targetCardIdx?: number) => {
    if (isWon) return
    const targetCol = tableau[targetColIdx]

    if (!selected) {
      if (targetCol.length === 0) return
      const clickedIdx = targetCardIdx !== undefined ? targetCardIdx : targetCol.length - 1
      const clickedCard = targetCol[clickedIdx]
      if (!clickedCard.faceUp) {
        // If clicking top card that is face down, flip it!
        if (clickedIdx === targetCol.length - 1) {
          pushHistory()
          setTableau((prev) => {
            const next = prev.map((col) => col.map((c) => ({ ...c })))
            next[targetColIdx][clickedIdx].faceUp = true
            return next
          })
          playSound('card')
        }
        return
      }

      // Card is faceUp, select it
      setSelected({ type: 'tableau', colIndex: targetColIdx, cardIndex: clickedIdx })
      playSound('card')
      return
    }

    // Deselect if same col and same card
    if (
      selected.type === 'tableau' &&
      selected.colIndex === targetColIdx &&
      selected.cardIndex === targetCardIdx
    ) {
      setSelected(null)
      return
    }

    // Determine moving cards
    let movingCards: Card[] = []
    if (selected.type === 'waste') {
      if (waste.length > 0) movingCards = [waste[waste.length - 1]]
    } else {
      const srcCol = tableau[selected.colIndex]
      movingCards = srcCol.slice(selected.cardIndex)
    }

    if (movingCards.length === 0) {
      setSelected(null)
      return
    }

    const firstMoving = movingCards[0]
    const targetEmpty = targetCol.length === 0
    const topTarget = targetEmpty ? null : targetCol[targetCol.length - 1]

    let isValid = false
    if (targetEmpty) {
      // Only Kings (value 13) can go to empty columns
      isValid = firstMoving.value === 13
    } else if (topTarget && topTarget.faceUp) {
      const oppositeColor = SUIT_IS_RED[firstMoving.suit] !== SUIT_IS_RED[topTarget.suit]
      const nextValue = topTarget.value === firstMoving.value + 1
      isValid = oppositeColor && nextValue
    }

    if (!isValid) {
      playSound('error')
      toast({
        title: 'Movimento Inválido',
        description: targetEmpty
          ? 'Apenas Reis (K) podem ser movidos para colunas vazias.'
          : 'Cartas devem alternar de cor (vermelho/preto) e descer de valor.',
        variant: 'destructive',
      })
      setSelected(null)
      return
    }

    // Apply move
    pushHistory()
    if (selected.type === 'waste') {
      setWaste((prev) => prev.slice(0, -1))
    } else {
      setTableau((prev) => {
        const next = prev.map((c) => [...c])
        next[selected.colIndex] = next[selected.colIndex].slice(0, selected.cardIndex)
        // Auto-flip newly exposed card
        if (next[selected.colIndex].length > 0) {
          next[selected.colIndex][next[selected.colIndex].length - 1].faceUp = true
        }
        return next
      })
    }

    setTableau((prev) => {
      const next = prev.map((c) => [...c])
      next[targetColIdx] = [...next[targetColIdx], ...movingCards]
      return next
    })

    setMoves((m) => m + 1)
    setScore((s) => s + 10)
    playSound('snap')
    setSelected(null)
  }

  // Auto Play: check waste and tableau tops to foundation
  const handleAutoPlay = () => {
    if (isWon) return
    // Check waste
    if (waste.length > 0) {
      const topWaste = waste[waste.length - 1]
      if (tryMoveCardToFoundation(topWaste, { type: 'waste' })) return
    }
    // Check tableau
    for (let c = 0; c < 7; c++) {
      const col = tableau[c]
      if (col.length > 0) {
        const top = col[col.length - 1]
        if (
          top.faceUp &&
          tryMoveCardToFoundation(top, { type: 'tableau', colIndex: c, cardIndex: col.length - 1 })
        ) {
          return
        }
      }
    }

    toast({
      title: 'Nenhum envio automático!',
      description: 'Não há cartas imediatamente prontas para subir para as fundações.',
    })
  }

  // Hint
  const handleHint = () => {
    if (isWon) return

    // 1. Foundation moves
    if (waste.length > 0) {
      const w = waste[waste.length - 1]
      if (w.value === foundations[w.suit] + 1) {
        setHint(`Mova ${VALUE_LABELS[w.value]}${SUIT_SYMBOLS[w.suit]} do descarte para a Fundação!`)
        playSound('card')
        return
      }
    }
    for (let c = 0; c < 7; c++) {
      const col = tableau[c]
      if (col.length > 0) {
        const top = col[col.length - 1]
        if (top.faceUp && top.value === foundations[top.suit] + 1) {
          setHint(
            `Mova ${VALUE_LABELS[top.value]}${SUIT_SYMBOLS[top.suit]} da Coluna ${c + 1} para a Fundação!`,
          )
          playSound('card')
          return
        }
      }
    }

    // 2. Tableau moves
    for (let s = 0; s < 7; s++) {
      const srcCol = tableau[s]
      const firstFaceUpIdx = srcCol.findIndex((card) => card.faceUp)
      if (firstFaceUpIdx === -1) continue

      const movingCard = srcCol[firstFaceUpIdx]
      // Don't suggest moving King from base of empty column to another empty column
      if (movingCard.value === 13 && firstFaceUpIdx === 0) continue

      for (let t = 0; t < 7; t++) {
        if (s === t) continue
        const tgtCol = tableau[t]
        if (tgtCol.length === 0) {
          if (movingCard.value === 13 && firstFaceUpIdx > 0) {
            setHint(
              `Mova o Rei (K) da Coluna ${s + 1} para a Coluna vazia ${t + 1} para liberar cartas ocultas!`,
            )
            playSound('card')
            return
          }
        } else {
          const topTgt = tgtCol[tgtCol.length - 1]
          if (
            topTgt.faceUp &&
            SUIT_IS_RED[movingCard.suit] !== SUIT_IS_RED[topTgt.suit] &&
            topTgt.value === movingCard.value + 1
          ) {
            setHint(
              `Mova ${VALUE_LABELS[movingCard.value]}${SUIT_SYMBOLS[movingCard.suit]} da Coluna ${s + 1} para a Coluna ${t + 1}!`,
            )
            playSound('card')
            return
          }
        }
      }
    }

    if (stock.length > 0 || waste.length > 0) {
      setHint('Dica: Toque no estoque de cartas para comprar novas opções!')
    } else {
      setHint('Sem movimentos óbvios. Experimente desfazer ou tente uma nova partida.')
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
        {/* Navigation / Header */}
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
                <span className="text-2xl">♠️</span> Paciência Klondike
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                O clássico atemporal de cartas • 7 colunas • Estoque com compra • Fundações A→K
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAutoPlay}
              variant="outline"
              size="sm"
              className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 hover:bg-emerald-100 font-black text-xs text-emerald-900"
              title="Mover cartas prontas para as fundações"
            >
              <Zap className="w-3.5 h-3.5 mr-1 text-emerald-600 fill-emerald-500" /> Auto-Subir
            </Button>

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
              Fundações
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-[#D84315] tabular-nums">
                {totalFoundationCards} / 52
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

        {selected && (
          <div className="bg-emerald-100 border border-emerald-300 rounded-2xl px-4 py-2 flex items-center justify-between text-xs font-black text-emerald-950 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">👉</span>
              <span>
                {selected.type === 'waste'
                  ? 'Carta do descarte selecionada'
                  : `Coluna ${selected.colIndex + 1} selecionada`}
                {' — '}Toque na coluna de destino ou na fundação!
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

        {/* Feltro Verde Clássico */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#1b5e20] via-[#2e7d32] to-[#154d1a] border-4 border-[#33691E] p-2 sm:p-4 shadow-2xl overflow-hidden min-h-[520px]">
          <div className="absolute inset-0 bg-radial from-transparent to-black/30 pointer-events-none" />

          {/* Top Row: Estoque & Descarte (esquerda) + 4 Fundações (direita) */}
          <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-white/20 gap-2">
            {/* Estoque e Descarte */}
            <div className="flex items-center gap-2 sm:gap-3">
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

              {/* Descarte (Waste) */}
              <div
                onClick={() => {
                  if (waste.length > 0) {
                    setSelected({ type: 'waste' })
                    playSound('card')
                  }
                }}
                className={`relative aspect-[5/7] w-12 sm:w-16 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all ${
                  waste.length > 0
                    ? 'bg-white border-amber-300 shadow-md'
                    : 'bg-black/20 border-dashed border-white/30'
                } ${selected?.type === 'waste' ? 'ring-3 ring-amber-400 scale-105 shadow-xl' : ''}`}
              >
                {waste.length > 0 ? (
                  (() => {
                    const top = waste[waste.length - 1]
                    return (
                      <div
                        onDoubleClick={() => tryMoveCardToFoundation(top, { type: 'waste' })}
                        className="w-full h-full p-1 flex flex-col justify-between items-center select-none"
                      >
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
                          {VALUE_LABELS[top.value]}
                        </span>
                      </div>
                    )
                  })()
                ) : (
                  <span className="text-[9px] text-white/40 font-bold">Vazio</span>
                )}
              </div>
            </div>

            {/* 4 Fundações A -> K */}
            <div className="flex items-center gap-1 sm:gap-2">
              {(['spades', 'hearts', 'clubs', 'diamonds'] as Suit[]).map((suit) => {
                const val = foundations[suit]
                return (
                  <div
                    key={suit}
                    onClick={() => handleFoundationClick(suit)}
                    className={`relative aspect-[5/7] w-11 sm:w-16 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      val > 0
                        ? 'bg-white border-amber-300 shadow-md hover:scale-105'
                        : 'bg-black/25 border-dashed border-white/35 hover:bg-black/35'
                    }`}
                  >
                    {val > 0 ? (
                      <div className="w-full h-full p-1 flex flex-col justify-between items-center select-none">
                        <div className="w-full flex items-center justify-between leading-none">
                          <span
                            className="text-xs sm:text-sm font-black"
                            style={{ color: SUIT_COLORS[suit] }}
                          >
                            {VALUE_LABELS[val]}
                          </span>
                          <span className="text-xs sm:text-sm" style={{ color: SUIT_COLORS[suit] }}>
                            {SUIT_SYMBOLS[suit]}
                          </span>
                        </div>
                        <span
                          className="text-lg sm:text-2xl leading-none"
                          style={{ color: SUIT_COLORS[suit] }}
                        >
                          {SUIT_SYMBOLS[suit]}
                        </span>
                        <span
                          className="text-[9px] font-bold opacity-60 leading-none"
                          style={{ color: SUIT_COLORS[suit] }}
                        >
                          {val === 13 ? '👑' : `${val}/13`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center opacity-40">
                        <span className="text-base sm:text-xl" style={{ color: SUIT_COLORS[suit] }}>
                          {SUIT_SYMBOLS[suit]}
                        </span>
                        <span className="text-[9px] text-white font-bold">A</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 7 Colunas de Tableau */}
          <div className="relative z-10 grid grid-cols-7 gap-1 sm:gap-2 min-h-[380px]">
            {tableau.map((col, colIdx) => {
              const isColSelected = selected?.type === 'tableau' && selected.colIndex === colIdx

              return (
                <div
                  key={colIdx}
                  onClick={() => handleTableauClick(colIdx)}
                  className={`relative flex flex-col rounded-xl transition-colors p-0.5 cursor-pointer min-h-[360px] ${
                    col.length === 0
                      ? 'border-2 border-dashed border-white/35 bg-white/5 hover:bg-white/10 flex items-start justify-center'
                      : ''
                  }`}
                >
                  {col.length === 0 && (
                    <div className="w-full py-4 rounded-lg flex items-center justify-center text-white/50 text-[10px] font-black">
                      K
                    </div>
                  )}

                  {col.map((card, cardIdx) => {
                    const isCardSelected = isColSelected && cardIdx >= (selected?.cardIndex ?? 999)
                    const isTopCard = cardIdx === col.length - 1
                    const topOffset = cardIdx * (card.faceUp ? 22 : 12)

                    return (
                      <div
                        key={card.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTableauClick(colIdx, cardIdx)
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          if (isTopCard && card.faceUp) {
                            tryMoveCardToFoundation(card, {
                              type: 'tableau',
                              colIndex: colIdx,
                              cardIndex: cardIdx,
                            })
                          }
                        }}
                        style={{
                          top: `${topOffset}px`,
                          zIndex: cardIdx + 1,
                        }}
                        className={`absolute left-0 right-0 h-16 sm:h-20 rounded-xl border shadow-sm transition-transform duration-100 p-1 flex flex-col justify-between cursor-pointer select-none ${
                          card.faceUp
                            ? 'bg-white border-stone-300 hover:border-[#8BC34A]'
                            : 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] border-white/70'
                        } ${isCardSelected ? 'ring-3 ring-amber-400 border-amber-500 scale-[1.04] shadow-xl z-40 bg-amber-50' : ''}`}
                      >
                        {card.faceUp ? (
                          <>
                            <div className="flex items-center justify-between leading-none px-0.5">
                              <span
                                className="text-xs sm:text-sm font-black"
                                style={{ color: SUIT_COLORS[card.suit] }}
                              >
                                {VALUE_LABELS[card.value]}
                              </span>
                              <span
                                className="text-xs sm:text-sm"
                                style={{ color: SUIT_COLORS[card.suit] }}
                              >
                                {SUIT_SYMBOLS[card.suit]}
                              </span>
                            </div>

                            {isTopCard && (
                              <div className="text-center">
                                <span
                                  className="text-base sm:text-xl leading-none"
                                  style={{ color: SUIT_COLORS[card.suit] }}
                                >
                                  {SUIT_SYMBOLS[card.suit]}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between leading-none px-0.5 opacity-60">
                              <span
                                className="text-[9px] font-bold"
                                style={{ color: SUIT_COLORS[card.suit] }}
                              >
                                {SUIT_SYMBOLS[card.suit]}
                              </span>
                              <span
                                className="text-[9px] font-bold"
                                style={{ color: SUIT_COLORS[card.suit] }}
                              >
                                {VALUE_LABELS[card.value]}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-40">
                            <span className="text-xs sm:text-sm text-white">♦</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Victory Modal */}
          {isWon && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-scale-in space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                  🏆
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#3E2723]">
                    Vitória na Paciência!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#795548] font-bold mt-1">
                    Você completou o jogo Klondike com paciência e raciocínio afiado!
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
                  <span>+400 Moedas e +320 XP creditados na sua conta!</span>
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

        {/* Regras e Dicas */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-4 text-xs text-[#795548] space-y-1 font-bold">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Regras da Paciência Klondike Clássica:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-2 leading-relaxed">
            <li>
              <strong>Objetivo:</strong> Mover todas as 52 cartas para as 4 Fundações de Ás (A) até
              o Rei (K) de cada naipe.
            </li>
            <li>
              <strong>Colunas:</strong> Construa sequências alternando cores (vermelho/preto) em
              ordem decrescente (ex: 7 vermelho sobre 8 preto).
            </li>
            <li>
              <strong>Espaços vazios:</strong> Apenas Reis (K) ou sequências que começam com Rei
              podem ser colocados em colunas vazias.
            </li>
            <li>
              <strong>Estoque:</strong> Toque no baralho de estoque à esquerda para comprar novas
              cartas para o descarte.
            </li>
            <li>
              <strong>Toque Duplo ou Auto-Subir:</strong> Dê duplo toque em qualquer carta aberta
              para enviá-la automaticamente para a sua fundação!
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
