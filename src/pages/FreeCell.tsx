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

interface FreeCellHistoryState {
  freeCells: (Card | null)[]
  foundations: Record<Suit, number>
  cascades: Card[][]
  moves: number
  score: number
}

// Generate classic 52-card deck
function generateDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
  const deck: Card[] = []
  suits.forEach((suit) => {
    for (let v = 1; v <= 13; v++) {
      deck.push({
        id: `fc_${suit}_${v}`,
        suit,
        value: v,
      })
    }
  })

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

type SelectedSource =
  | { type: 'cell'; index: number }
  | { type: 'cascade'; colIndex: number; cardIndex: number }

export default function FreeCell() {
  const { addReward } = useGame()

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [freeCells, setFreeCells] = useState<(Card | null)[]>([null, null, null, null])
  const [foundations, setFoundations] = useState<Record<Suit, number>>({
    spades: 0,
    hearts: 0,
    clubs: 0,
    diamonds: 0,
  })
  const [cascades, setCascades] = useState<Card[][]>(() => Array.from({ length: 8 }, () => []))
  const [selected, setSelected] = useState<SelectedSource | null>(null)
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isWon, setIsWon] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [celebratingSuit, setCelebratingSuit] = useState<Suit | null>(null)
  const [history, setHistory] = useState<FreeCellHistoryState[]>([])

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
          osc.frequency.setValueAtTime(480, now)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
          osc.start(now)
          osc.stop(now + 0.05)
        } else if (type === 'snap') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(540, now)
          osc.frequency.exponentialRampToValueAtTime(720, now + 0.08)
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
          osc.frequency.setValueAtTime(180, now)
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
    const newCascades: Card[][] = Array.from({ length: 8 }, () => [])

    // Deal 52 cards across 8 cascades: first 4 get 7 cards, next 4 get 6 cards
    deck.forEach((card, idx) => {
      const col = idx % 8
      newCascades[col].push(card)
    })

    setCascades(newCascades)
    setFreeCells([null, null, null, null])
    setFoundations({ spades: 0, hearts: 0, clubs: 0, diamonds: 0 })
    setSelected(null)
    setMoves(0)
    setScore(0)
    setElapsedSeconds(0)
    setIsWon(false)
    setHasStarted(true)
    setHint(null)
    setCelebratingSuit(null)
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

  // Save history state before every move
  const pushHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-30),
      {
        freeCells: freeCells.map((c) => (c ? { ...c } : null)),
        foundations: { ...foundations },
        cascades: cascades.map((col) => col.map((c) => ({ ...c }))),
        moves,
        score,
      },
    ])
  }, [freeCells, foundations, cascades, moves, score])

  // Undo
  const handleUndo = () => {
    if (history.length === 0 || isWon) return
    const last = history[history.length - 1]
    setFreeCells(last.freeCells)
    setFoundations(last.foundations)
    setCascades(last.cascades)
    setMoves(last.moves)
    setScore(last.score)
    setHistory((prev) => prev.slice(0, -1))
    setSelected(null)
    setHint(null)
    playSound('card')
  }

  // Calculate maximum movable sequence size: (1 + freeCells) * 2^(emptyCascades)
  const emptyCellsCount = useMemo(() => freeCells.filter((c) => c === null).length, [freeCells])
  const emptyCascadesCount = useMemo(
    () => cascades.filter((col) => col.length === 0).length,
    [cascades],
  )

  const getMaxMovableCards = useCallback(
    (targetColIsEmpty: boolean) => {
      const freeCols = targetColIsEmpty ? Math.max(0, emptyCascadesCount - 1) : emptyCascadesCount
      return (1 + emptyCellsCount) * Math.pow(2, freeCols)
    },
    [emptyCellsCount, emptyCascadesCount],
  )

  // Verify if a slice of cards in cascade is valid alternating sequence (descending value, opposite color)
  const isValidDescendingSequence = (col: Card[], startIndex: number): boolean => {
    if (startIndex < 0 || startIndex >= col.length) return false
    for (let i = startIndex; i < col.length - 1; i++) {
      const curr = col[i]
      const next = col[i + 1]
      if (curr.value !== next.value + 1) return false
      if (SUIT_IS_RED[curr.suit] === SUIT_IS_RED[next.suit]) return false
    }
    return true
  }

  // Total cards in foundation
  const totalFoundationCards = useMemo(
    () => Object.values(foundations).reduce((acc, v) => acc + v, 0),
    [foundations],
  )

  // Check victory (52 cards in foundation)
  useEffect(() => {
    if (totalFoundationCards === 52 && !isWon) {
      setIsWon(true)
    }
  }, [totalFoundationCards, isWon])

  // Win reward integration (XP, Coins, Daily Quests)
  useEffect(() => {
    if (isWon && !winClaimedRef.current) {
      winClaimedRef.current = true
      playSound('win')

      const bonusXp = 350
      const bonusCoins = 450
      addReward(bonusXp, bonusCoins, 'Vitória no FreeCell Clássico!')

      toast({
        title: '🏆 VITÓRIA NO FREECELL!',
        description: `Todas as 52 cartas organizadas com sucesso! +${bonusCoins} Moedas e +${bonusXp} XP adicionados!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
    }
  }, [isWon, addReward, playSound])

  // Auto-move single card to foundation if valid
  const tryMoveCardToFoundation = (card: Card): boolean => {
    const currentVal = foundations[card.suit]
    if (card.value === currentVal + 1) {
      pushHistory()
      setFoundations((prev) => {
        const next = { ...prev, [card.suit]: card.value }
        if (card.value === 13) {
          setCelebratingSuit(card.suit)
          setTimeout(() => setCelebratingSuit(null), 1800)
        }
        return next
      })
      setScore((s) => s + 50)
      setMoves((m) => m + 1)
      playSound('foundation')
      return true
    }
    return false
  }

  // Handle FreeCell slot click
  const handleCellClick = (cellIdx: number) => {
    if (isWon) return
    const cellCard = freeCells[cellIdx]

    if (!selected) {
      if (cellCard) {
        setSelected({ type: 'cell', index: cellIdx })
        playSound('card')
      }
      return
    }

    // If source is already this cell, deselect
    if (selected.type === 'cell' && selected.index === cellIdx) {
      setSelected(null)
      return
    }

    // Trying to move into this freecell
    if (!cellCard) {
      if (selected.type === 'cell') {
        // Move from cell to cell
        const moving = freeCells[selected.index]
        if (moving) {
          pushHistory()
          setFreeCells((prev) => {
            const next = [...prev]
            next[selected.index] = null
            next[cellIdx] = moving
            return next
          })
          setMoves((m) => m + 1)
          playSound('snap')
        }
        setSelected(null)
      } else if (selected.type === 'cascade') {
        const col = cascades[selected.colIndex]
        if (selected.cardIndex === col.length - 1) {
          // Can only move single top card into a FreeCell
          const moving = col[col.length - 1]
          pushHistory()
          setCascades((prev) => {
            const next = prev.map((c) => [...c])
            next[selected.colIndex].pop()
            return next
          })
          setFreeCells((prev) => {
            const next = [...prev]
            next[cellIdx] = moving
            return next
          })
          setMoves((m) => m + 1)
          playSound('snap')
          setSelected(null)
        } else {
          playSound('error')
          toast({
            title: 'Movimento Inválido',
            description: 'Apenas uma carta individual pode ser colocada em uma Célula Livre.',
            variant: 'destructive',
          })
          setSelected(null)
        }
      }
    } else {
      // Cell is occupied, select this cell instead
      setSelected({ type: 'cell', index: cellIdx })
      playSound('card')
    }
  }

  // Handle Foundation slot click (click to send selected card to foundation)
  const handleFoundationClick = (suit: Suit) => {
    if (!selected || isWon) return

    let movingCard: Card | null = null
    if (selected.type === 'cell') {
      movingCard = freeCells[selected.index]
    } else if (selected.type === 'cascade') {
      const col = cascades[selected.colIndex]
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
      if (selected.type === 'cell') {
        setFreeCells((prev) => {
          const next = [...prev]
          next[selected.index] = null
          return next
        })
      } else {
        setCascades((prev) => {
          const next = prev.map((c) => [...c])
          next[selected.colIndex].pop()
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

  // Handle Cascade Column Click
  const handleCascadeClick = useCallback(
    (targetColIdx: number, targetCardIdx?: number) => {
      if (isWon) return
      const targetCol = cascades[targetColIdx]

      if (!selected) {
        if (targetCol.length === 0) return
        const clickedIdx = targetCardIdx !== undefined ? targetCardIdx : targetCol.length - 1
        // Check if clicked card is part of a valid movable descending run to bottom
        if (isValidDescendingSequence(targetCol, clickedIdx)) {
          setSelected({ type: 'cascade', colIndex: targetColIdx, cardIndex: clickedIdx })
          playSound('card')
        } else {
          // If not a valid sequence, select just the bottom card if clicked
          if (clickedIdx === targetCol.length - 1) {
            setSelected({ type: 'cascade', colIndex: targetColIdx, cardIndex: clickedIdx })
            playSound('card')
          } else {
            playSound('error')
            toast({
              title: 'Sequência Não Móvel',
              description:
                'Para mover várias cartas juntas, elas devem alternar de cor (vermelho/preto) e descer de valor.',
            })
          }
        }
        return
      }

      // If clicking same cascade, deselect
      if (selected.type === 'cascade' && selected.colIndex === targetColIdx) {
        setSelected(null)
        return
      }

      // Determine cards being moved
      let movingCards: Card[] = []
      if (selected.type === 'cell') {
        const c = freeCells[selected.index]
        if (c) movingCards = [c]
      } else if (selected.type === 'cascade') {
        const srcCol = cascades[selected.colIndex]
        movingCards = srcCol.slice(selected.cardIndex)
      }

      if (movingCards.length === 0) {
        setSelected(null)
        return
      }

      const firstMoving = movingCards[0]
      const targetEmpty = targetCol.length === 0
      const topTarget = targetEmpty ? null : targetCol[targetCol.length - 1]

      // Validate rules:
      // 1. Alternating colors and descending value (unless target is empty cascade)
      let isValidPlacement = false
      if (targetEmpty) {
        isValidPlacement = true
      } else if (topTarget) {
        const oppositeColor = SUIT_IS_RED[firstMoving.suit] !== SUIT_IS_RED[topTarget.suit]
        const nextValue = topTarget.value === firstMoving.value + 1
        isValidPlacement = oppositeColor && nextValue
      }

      if (!isValidPlacement) {
        playSound('error')
        toast({
          title: 'Movimento Não Permitido',
          description: topTarget
            ? `Precisa de carta de cor oposta e valor ${VALUE_LABELS[topTarget.value - 1] || 'inferior'}.`
            : 'Coluna vazia aceita qualquer carta ou sequência válida.',
          variant: 'destructive',
        })
        setSelected(null)
        return
      }

      // 2. Supermove capacity check: are there enough free cells/cascades to move N cards?
      const maxCapacity = getMaxMovableCards(targetEmpty)
      if (movingCards.length > maxCapacity) {
        playSound('error')
        toast({
          title: 'Células Insuficientes para Supermove',
          description: `Você só pode mover até ${maxCapacity} carta(s) com as células livres atuais (${emptyCellsCount} livres).`,
          variant: 'destructive',
        })
        setSelected(null)
        return
      }

      // Apply valid cascade move
      pushHistory()
      if (selected.type === 'cell') {
        setFreeCells((prev) => {
          const next = [...prev]
          next[selected.index] = null
          return next
        })
      } else {
        setCascades((prev) => {
          const next = prev.map((c) => [...c])
          next[selected.colIndex] = next[selected.colIndex].slice(0, selected.cardIndex)
          return next
        })
      }

      setCascades((prev) => {
        const next = prev.map((c) => [...c])
        next[targetColIdx] = [...next[targetColIdx], ...movingCards]
        return next
      })

      setMoves((m) => m + 1)
      setScore((s) => s + 10)
      playSound('snap')
      setSelected(null)
    },
    [
      isWon,
      selected,
      cascades,
      freeCells,
      pushHistory,
      getMaxMovableCards,
      emptyCellsCount,
      playSound,
    ],
  )

  // Double click or fast tap to auto-move a card to foundation
  const handleCardDoubleClick = (card: Card, source: SelectedSource) => {
    if (isWon) return
    const moved = tryMoveCardToFoundation(card)
    if (moved) {
      if (source.type === 'cell') {
        setFreeCells((prev) => {
          const next = [...prev]
          next[source.index] = null
          return next
        })
      } else {
        setCascades((prev) => {
          const next = prev.map((c) => [...c])
          next[source.colIndex].pop()
          return next
        })
      }
      setSelected(null)
    }
  }

  // Quick Auto-Play: scans bottom cards and moves safe cards to foundation
  const handleAutoPlay = () => {
    if (isWon) return
    let madeMove = false

    // Check cells
    for (let i = 0; i < 4; i++) {
      const c = freeCells[i]
      if (c && c.value === foundations[c.suit] + 1) {
        pushHistory()
        setFreeCells((prev) => {
          const next = [...prev]
          next[i] = null
          return next
        })
        setFoundations((prev) => ({ ...prev, [c.suit]: c.value }))
        setScore((s) => s + 50)
        setMoves((m) => m + 1)
        playSound('foundation')
        madeMove = true
        break
      }
    }

    if (madeMove) return

    // Check bottom cards of cascades
    for (let c = 0; c < 8; c++) {
      const col = cascades[c]
      if (col.length > 0) {
        const top = col[col.length - 1]
        if (top.value === foundations[top.suit] + 1) {
          pushHistory()
          setCascades((prev) => {
            const next = prev.map((arr) => [...arr])
            next[c].pop()
            return next
          })
          setFoundations((prev) => ({ ...prev, [top.suit]: top.value }))
          setScore((s) => s + 50)
          setMoves((m) => m + 1)
          playSound('foundation')
          madeMove = true
          break
        }
      }
    }

    if (!madeMove) {
      toast({
        title: 'Nenhum envio automático óbvio!',
        description: 'Não há cartas imediatamente prontas para subir para as fundações.',
      })
    }
  }

  // Hint finder (SEMPRE clicável)
  const handleHint = () => {
    if (isWon) return

    // 1. Can any card go to foundation?
    for (let i = 0; i < 4; i++) {
      const c = freeCells[i]
      if (c && c.value === foundations[c.suit] + 1) {
        setHint(
          `Mova ${VALUE_LABELS[c.value]}${SUIT_SYMBOLS[c.suit]} da Célula ${i + 1} para a Fundação!`,
        )
        playSound('card')
        return
      }
    }
    for (let colIdx = 0; colIdx < 8; colIdx++) {
      const col = cascades[colIdx]
      if (col.length > 0) {
        const top = col[col.length - 1]
        if (top.value === foundations[top.suit] + 1) {
          setHint(
            `Mova ${VALUE_LABELS[top.value]}${SUIT_SYMBOLS[top.suit]} da Coluna ${colIdx + 1} para a Fundação!`,
          )
          playSound('card')
          return
        }
      }
    }

    // 2. Can any card move between cascades?
    for (let srcIdx = 0; srcIdx < 8; srcIdx++) {
      const srcCol = cascades[srcIdx]
      if (srcCol.length === 0) continue
      const topSrc = srcCol[srcCol.length - 1]

      for (let tgtIdx = 0; tgtIdx < 8; tgtIdx++) {
        if (srcIdx === tgtIdx) continue
        const tgtCol = cascades[tgtIdx]
        if (tgtCol.length === 0) continue
        const topTgt = tgtCol[tgtCol.length - 1]

        if (
          SUIT_IS_RED[topSrc.suit] !== SUIT_IS_RED[topTgt.suit] &&
          topTgt.value === topSrc.value + 1
        ) {
          setHint(
            `Mova ${VALUE_LABELS[topSrc.value]}${SUIT_SYMBOLS[topSrc.suit]} da Coluna ${srcIdx + 1} para a Coluna ${tgtIdx + 1}!`,
          )
          playSound('card')
          return
        }
      }
    }

    // 3. Can a cell move to a cascade?
    for (let i = 0; i < 4; i++) {
      const c = freeCells[i]
      if (!c) continue
      for (let tgtIdx = 0; tgtIdx < 8; tgtIdx++) {
        const tgtCol = cascades[tgtIdx]
        if (tgtCol.length === 0) continue
        const topTgt = tgtCol[tgtCol.length - 1]
        if (SUIT_IS_RED[c.suit] !== SUIT_IS_RED[topTgt.suit] && topTgt.value === c.value + 1) {
          setHint(
            `Mova ${VALUE_LABELS[c.value]}${SUIT_SYMBOLS[c.suit]} da Célula ${i + 1} para a Coluna ${tgtIdx + 1}!`,
          )
          playSound('card')
          return
        }
      }
    }

    // No obvious hint
    if (emptyCellsCount > 0) {
      setHint('Dica: Use uma das células livres para liberar cartas bloqueadas!')
    } else {
      setHint('Sem movimentos óbvios no momento. Analise as colunas ou use Desfazer.')
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
                <span className="text-2xl">🃏</span> FreeCell Clássico
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                8 colunas • 4 células livres • 4 fundações A→K • Quase 100% dos jogos têm solução!
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

          {/* Action buttons */}
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

        {/* Hint banner */}
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
                {selected.type === 'cell'
                  ? `Célula Livre ${selected.index + 1} selecionada`
                  : `Coluna ${selected.colIndex + 1} selecionada`}
                {' — '}Toque no destino (outra coluna, célula livre ou fundação)!
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

        {/* Celebrating completed suit banner */}
        {celebratingSuit && (
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 text-stone-900 font-black px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between border-2 border-white animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-spin">👑</span>
              <span className="text-sm sm:text-base">
                Fundação de {SUIT_SYMBOLS[celebratingSuit]} COMPLETA até o Rei (K)! +100 Pontos!
              </span>
            </div>
            <Sparkles className="w-5 h-5 text-amber-700 animate-pulse" />
          </div>
        )}

        {/* Mesa de feltro verde clássica */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#1b5e20] via-[#2e7d32] to-[#154d1a] border-4 border-[#33691E] p-2 sm:p-4 shadow-2xl overflow-hidden min-h-[520px]">
          <div className="absolute inset-0 bg-radial from-transparent to-black/30 pointer-events-none" />

          {/* Top Row: 4 FreeCells (left) + 4 Foundations (right) */}
          <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-6 mb-4 pb-3 border-b border-white/20">
            {/* 4 Células Livres */}
            <div>
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider">
                  Células Livres ({emptyCellsCount}/4)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 sm:gap-2">
                {freeCells.map((card, idx) => {
                  const isSelected = selected?.type === 'cell' && selected.index === idx
                  return (
                    <div
                      key={idx}
                      onClick={() => handleCellClick(idx)}
                      className={`relative aspect-[5/7] max-h-24 sm:max-h-28 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        card
                          ? 'bg-white border-amber-300 shadow-md hover:scale-[1.03]'
                          : 'bg-black/25 border-dashed border-white/35 hover:bg-black/35'
                      } ${isSelected ? 'ring-3 ring-amber-400 border-amber-500 scale-105 shadow-xl' : ''}`}
                    >
                      {card ? (
                        <div
                          onDoubleClick={() =>
                            handleCardDoubleClick(card, { type: 'cell', index: idx })
                          }
                          className="w-full h-full p-1 flex flex-col justify-between items-center select-none"
                        >
                          <div className="w-full flex items-center justify-between leading-none">
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
                          <span
                            className="text-lg sm:text-2xl leading-none"
                            style={{ color: SUIT_COLORS[card.suit] }}
                          >
                            {SUIT_SYMBOLS[card.suit]}
                          </span>
                          <span
                            className="text-[9px] font-bold opacity-60 leading-none"
                            style={{ color: SUIT_COLORS[card.suit] }}
                          >
                            {VALUE_LABELS[card.value]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/40 font-bold">Livre</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 4 Fundações (A -> K por naipe) */}
            <div>
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-black text-amber-200 uppercase tracking-wider">
                  Fundações A → K
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 sm:gap-2">
                {(['spades', 'hearts', 'clubs', 'diamonds'] as Suit[]).map((suit) => {
                  const val = foundations[suit]
                  const isTopKing = val === 13

                  return (
                    <div
                      key={suit}
                      onClick={() => handleFoundationClick(suit)}
                      className={`relative aspect-[5/7] max-h-24 sm:max-h-28 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        val > 0
                          ? 'bg-white border-amber-300 shadow-md hover:scale-[1.03]'
                          : 'bg-black/25 border-dashed border-white/35 hover:bg-black/35'
                      } ${isTopKing ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`}
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
                            <span
                              className="text-xs sm:text-sm"
                              style={{ color: SUIT_COLORS[suit] }}
                            >
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
                          <span
                            className="text-base sm:text-xl"
                            style={{ color: SUIT_COLORS[suit] }}
                          >
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
          </div>

          {/* 8 Colunas Principais de Cascata */}
          <div className="relative z-10 grid grid-cols-8 gap-1 sm:gap-2 min-h-[380px]">
            {cascades.map((col, colIdx) => {
              const isColSelected = selected?.type === 'cascade' && selected.colIndex === colIdx

              return (
                <div
                  key={colIdx}
                  onClick={() => handleCascadeClick(colIdx)}
                  className={`relative flex flex-col rounded-xl transition-colors p-0.5 cursor-pointer min-h-[360px] ${
                    col.length === 0
                      ? 'border-2 border-dashed border-white/35 bg-white/5 hover:bg-white/10 flex items-start justify-center'
                      : ''
                  }`}
                >
                  {col.length === 0 && (
                    <div className="w-full py-4 rounded-lg flex items-center justify-center text-white/50 text-[10px] font-black">
                      Vazio
                    </div>
                  )}

                  {col.map((card, cardIdx) => {
                    const isCardSelected = isColSelected && cardIdx >= (selected?.cardIndex ?? 999)
                    const isTopCard = cardIdx === col.length - 1
                    const topOffset = cardIdx * (cardIdx > 8 ? 20 : 24)

                    return (
                      <div
                        key={card.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCascadeClick(colIdx, cardIdx)
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          if (isTopCard) {
                            handleCardDoubleClick(card, {
                              type: 'cascade',
                              colIndex: colIdx,
                              cardIndex: cardIdx,
                            })
                          }
                        }}
                        style={{
                          top: `${topOffset}px`,
                          zIndex: cardIdx + 1,
                        }}
                        className={`absolute left-0 right-0 h-16 sm:h-20 bg-white rounded-xl border border-stone-300 shadow-sm transition-transform duration-100 p-1 flex flex-col justify-between cursor-pointer select-none ${
                          isCardSelected
                            ? 'ring-3 ring-amber-400 border-amber-500 scale-[1.04] shadow-xl z-40 bg-amber-50'
                            : 'hover:border-[#8BC34A] hover:scale-[1.01]'
                        }`}
                      >
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
                  👑
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#3E2723]">
                    Vitória no FreeCell!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#795548] font-bold mt-1">
                    Você organizou as 52 cartas em suas 4 fundações reais com maestria!
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
                  <span>+450 Moedas e +350 XP creditados na sua conta!</span>
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

        {/* Regras e Como Jogar */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-4 text-xs text-[#795548] space-y-1 font-bold">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Regras e Estratégia do FreeCell:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-2 leading-relaxed">
            <li>
              <strong>Objetivo:</strong> Mover todas as 52 cartas para as 4 Fundações no canto
              superior direito, organizadas de Ás (A) até o Rei (K) de cada naipe.
            </li>
            <li>
              <strong>Colunas (Cascata):</strong> Construa sequências descendentes alternando cores
              (ex.: 8 preto sobre 9 vermelho).
            </li>
            <li>
              <strong>Células Livres (FreeCells):</strong> 4 espaços temporários no canto superior
              esquerdo para guardar qualquer carta individual e abrir caminho nas colunas.
            </li>
            <li>
              <strong>Supermoves:</strong> Você pode mover sequências inteiras se houver células
              livres e colunas vazias suficientes disponíveis.
            </li>
            <li>
              <strong>Toque Duplo ou Auto-Subir:</strong> Dê duplo toque em qualquer carta
              desbloqueada ou use o botão <em>Auto-Subir</em> para enviá-la direto para a Fundação!
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
