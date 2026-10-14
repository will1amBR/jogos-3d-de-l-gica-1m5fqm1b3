import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  HelpCircle,
  Lightbulb,
  Undo2,
  CheckCircle2,
  Layers,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'

export interface Card {
  id: string // unique identifier
  suit: Suit
  value: number // 1 (A) .. 13 (K)
  faceUp: boolean
}

export type SuitMode = 1 | 2 | 4

interface SpiderGameState {
  tableau: Card[][] // 10 columns
  stock: Card[][] // 5 deals of 10 cards each
  completedRuns: Suit[] // completed K->A runs (target: 8)
  moves: number
  score: number
  startTime: number
  elapsedSeconds: number
  isWon: boolean
}

interface SpiderHistoryState {
  tableau: Card[][]
  stock: Card[][]
  completedRuns: Suit[]
  moves: number
  score: number
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
}

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#212121',
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

// Generate a 104-card deck based on suitMode
function generateDeck(suitMode: SuitMode): Card[] {
  let suits: Suit[] = []
  if (suitMode === 1) {
    // 8 decks of 13 spades
    suits = Array(8).fill('spades')
  } else if (suitMode === 2) {
    // 4 spades + 4 hearts
    suits = [...Array(4).fill('spades'), ...Array(4).fill('hearts')]
  } else {
    // 2 of each of the 4 suits
    suits = [
      ...Array(2).fill('spades'),
      ...Array(2).fill('hearts'),
      ...Array(2).fill('clubs'),
      ...Array(2).fill('diamonds'),
    ]
  }

  const deck: Card[] = []
  let cardSeq = 0
  suits.forEach((suit) => {
    for (let v = 1; v <= 13; v++) {
      cardSeq++
      deck.push({
        id: `c_${cardSeq}_${suit}_${v}`,
        suit,
        value: v,
        faceUp: false,
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

// Deep copy helper for Card[][]
function cloneColumns(cols: Card[][]): Card[][] {
  return cols.map((col) => col.map((c) => ({ ...c })))
}

export default function Spider() {
  const { addReward } = useGame()

  const [suitMode, setSuitMode] = useState<SuitMode>(2)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Game state
  const [tableau, setTableau] = useState<Card[][]>(() => Array.from({ length: 10 }, () => []))
  const [stock, setStock] = useState<Card[][]>([])
  const [completedRuns, setCompletedRuns] = useState<Suit[]>([])
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(500)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isWon, setIsWon] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // Selection state for mobile tap-to-move:
  // selected = { colIndex: number, cardIndex: number }
  const [selected, setSelected] = useState<{ colIndex: number; cardIndex: number } | null>(null)

  // Hint highlight
  const [hint, setHint] = useState<{
    fromCol: number
    fromCardIdx: number
    toCol: number
  } | null>(null)

  // Feedback animation when a card sequence snaps onto a destination column
  const [lastMovedCol, setLastMovedCol] = useState<number | null>(null)

  // Celebration state when a K->A run is completed
  const [celebratingRun, setCelebratingRun] = useState<{
    suit: Suit
    key: number
  } | null>(null)

  // Undo history
  const [history, setHistory] = useState<SpiderHistoryState[]>([])

  // Win reward claimed flag
  const winClaimedRef = useRef(false)

  // Reusable AudioContext singleton to prevent mobile Chrome memory leaks / crashes
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

  // Play subtle sound using shared Web Audio API
  const playSound = useCallback(
    (type: 'card' | 'deal' | 'run' | 'win' | 'error') => {
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
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.06)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
          osc.start(now)
          osc.stop(now + 0.06)
        } else if (type === 'deal') {
          osc.frequency.setValueAtTime(320, now)
          osc.frequency.exponentialRampToValueAtTime(550, now + 0.1)
          gain.gain.setValueAtTime(0.1, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
          osc.start(now)
          osc.stop(now + 0.1)
        } else if (type === 'run') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(523.25, now)
          osc.frequency.setValueAtTime(659.25, now + 0.08)
          osc.frequency.setValueAtTime(783.99, now + 0.16)
          gain.gain.setValueAtTime(0.12, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
          osc.start(now)
          osc.stop(now + 0.35)
        } else if (type === 'win') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.linearRampToValueAtTime(880, now + 0.25)
          gain.gain.setValueAtTime(0.15, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
          osc.start(now)
          osc.stop(now + 0.6)
        } else if (type === 'error') {
          osc.frequency.setValueAtTime(200, now)
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.08)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        }
      } catch {
        // audio context not allowed or failed, ignore
      }
    },
    [soundEnabled, getAudioContext],
  )

  // Start / restart new game
  const startNewGame = useCallback(
    (mode: SuitMode = suitMode) => {
      const deck = generateDeck(mode)
      const newTableau: Card[][] = Array.from({ length: 10 }, () => [])

      // Deal 54 cards into 10 columns:
      // First 4 cols get 6 cards (5 face down, 1 face up)
      // Next 6 cols get 5 cards (4 face down, 1 face up)
      let deckIdx = 0
      for (let col = 0; col < 10; col++) {
        const count = col < 4 ? 6 : 5
        for (let r = 0; r < count; r++) {
          const card = deck[deckIdx++]
          // Top card is face up
          card.faceUp = r === count - 1
          newTableau[col].push(card)
        }
      }

      // Remaining 50 cards divided into 5 stock deals of 10 cards each
      const newStock: Card[][] = []
      for (let s = 0; s < 5; s++) {
        const deal: Card[] = []
        for (let c = 0; c < 10; c++) {
          const card = deck[deckIdx++]
          card.faceUp = false // face-down in stock
          deal.push(card)
        }
        newStock.push(deal)
      }

      setTableau(newTableau)
      setStock(newStock)
      setCompletedRuns([])
      setMoves(0)
      setScore(500)
      setElapsedSeconds(0)
      setIsWon(false)
      setSelected(null)
      setHint(null)
      setHistory([])
      setHasStarted(true)
      winClaimedRef.current = false
      playSound('deal')
    },
    [suitMode, playSound],
  )

  // Auto-start on mount
  useEffect(() => {
    startNewGame(suitMode)
  }, [suitMode, startNewGame])

  // Timer
  useEffect(() => {
    if (!hasStarted || isWon) return
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [hasStarted, isWon])

  // Save current step to undo history
  const pushHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-30), // keep up to 30 undo steps
      {
        tableau: cloneColumns(tableau),
        stock: stock.map((s) => s.map((c) => ({ ...c }))),
        completedRuns: [...completedRuns],
        moves,
        score,
      },
    ])
  }, [tableau, stock, completedRuns, moves, score])

  // Undo
  const handleUndo = () => {
    if (history.length === 0 || isWon) return
    const last = history[history.length - 1]
    setTableau(last.tableau)
    setStock(last.stock)
    setCompletedRuns(last.completedRuns)
    setMoves(last.moves)
    setScore(last.score)
    setHistory((prev) => prev.slice(0, -1))
    setSelected(null)
    setHint(null)
    playSound('card')
  }

  // Check if a slice of cards in a column is a valid descending sequence of the SAME suit
  const isValidMovableSequence = (col: Card[], startIndex: number): boolean => {
    if (startIndex < 0 || startIndex >= col.length) return false
    if (!col[startIndex].faceUp) return false

    for (let i = startIndex; i < col.length - 1; i++) {
      const current = col[i]
      const next = col[i + 1]
      if (!current.faceUp || !next.faceUp) return false
      if (current.suit !== next.suit) return false
      if (current.value !== next.value + 1) return false
    }
    return true
  }

  // Check for completed runs (K -> A of same suit) in a column
  // Returns updated column and the suit completed (if any)
  const checkForCompletedRun = (
    col: Card[],
  ): { updatedCol: Card[]; completedSuit: Suit | null } => {
    if (col.length < 13) return { updatedCol: col, completedSuit: null }

    // Look from the bottom of the column (end of array)
    // Needs 13 cards: values 1, 2, 3 ... 13 in reverse, all faceUp and same suit
    const lastCard = col[col.length - 1]
    if (lastCard.value !== 1 || !lastCard.faceUp) {
      return { updatedCol: col, completedSuit: null }
    }

    const suit = lastCard.suit
    let isComplete = true

    for (let i = 0; i < 13; i++) {
      const card = col[col.length - 1 - i]
      if (!card.faceUp || card.suit !== suit || card.value !== i + 1) {
        isComplete = false
        break
      }
    }

    if (isComplete) {
      // Remove 13 cards from the end
      const updated = col.slice(0, col.length - 13)
      // If the new top card is face down, flip it face up!
      if (updated.length > 0 && !updated[updated.length - 1].faceUp) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          faceUp: true,
        }
      }
      return { updatedCol: updated, completedSuit: suit }
    }

    return { updatedCol: col, completedSuit: null }
  }

  // Handle clicking the Stock pile
  const handleDealStock = () => {
    if (stock.length === 0 || isWon) return

    // Traditional Spider rule: CANNOT deal if there are empty columns!
    const hasEmptyCol = tableau.some((col) => col.length === 0)
    if (hasEmptyCol) {
      playSound('error')
      toast({
        title: 'Espaço vazio no tabuleiro!',
        description:
          'Você precisa colocar pelo menos uma carta em cada coluna antes de distribuir do monte.',
        variant: 'destructive',
      })
      return
    }

    pushHistory()

    const deal = stock[stock.length - 1]
    const nextStock = stock.slice(0, stock.length - 1)
    const nextTableau = cloneColumns(tableau)

    // Give 1 card to each column
    let newCompletedSuit: Suit | null = null
    for (let col = 0; col < 10; col++) {
      const card = { ...deal[col], faceUp: true }
      nextTableau[col].push(card)

      // Check if this card completed a K->A run
      const check = checkForCompletedRun(nextTableau[col])
      if (check.completedSuit) {
        nextTableau[col] = check.updatedCol
        newCompletedSuit = check.completedSuit
      }
    }

    setStock(nextStock)
    setTableau(nextTableau)
    setMoves((m) => m + 1)
    setScore((s) => Math.max(0, s - 1))
    setSelected(null)
    setHint(null)

    if (newCompletedSuit) {
      playSound('run')
      setCompletedRuns((prev) => [...prev, newCompletedSuit!])
      setCelebratingRun({ suit: newCompletedSuit, key: Date.now() })
      setScore((s) => s + 100)
      toast({
        title: '🎉 Sequência K → A Completa!',
        description: `Sequência de ${SUIT_SYMBOLS[newCompletedSuit]} removida com sucesso! (+100 pontos)`,
        className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
      })
      setTimeout(() => setCelebratingRun(null), 2500)
    } else {
      playSound('deal')
    }
  }

  // Attempt to move a card sequence from fromCol (starting at fromCardIdx) to toCol
  const attemptMove = (fromCol: number, fromCardIdx: number, toCol: number): boolean => {
    if (fromCol === toCol) return false

    const sourceCol = tableau[fromCol]
    const targetCol = tableau[toCol]

    // Verify valid movable sequence
    if (!isValidMovableSequence(sourceCol, fromCardIdx)) {
      return false
    }

    const movingMovingFirstCard = sourceCol[fromCardIdx]

    // Target validation:
    // 1. Can always move to an empty column
    // 2. Or, target's top card must have value === movingCard.value + 1 (any suit)
    if (targetCol.length > 0) {
      const targetTop = targetCol[targetCol.length - 1]
      if (targetTop.value !== movingMovingFirstCard.value + 1) {
        return false
      }
    }

    pushHistory()

    // Perform move
    const movingCards = sourceCol.slice(fromCardIdx)
    const nextSourceCol = sourceCol.slice(0, fromCardIdx)

    // Flip top of source column if face down
    if (nextSourceCol.length > 0 && !nextSourceCol[nextSourceCol.length - 1].faceUp) {
      nextSourceCol[nextSourceCol.length - 1] = {
        ...nextSourceCol[nextSourceCol.length - 1],
        faceUp: true,
      }
    }

    const nextTargetCol = [...targetCol, ...movingCards]

    // Check if move completed a K->A run in targetCol
    const check = checkForCompletedRun(nextTargetCol)
    let finalTargetCol = nextTargetCol
    let completedSuit: Suit | null = null
    if (check.completedSuit) {
      finalTargetCol = check.updatedCol
      completedSuit = check.completedSuit
    }

    const nextTableau = tableau.map((col, idx) => {
      if (idx === fromCol) return nextSourceCol
      if (idx === toCol) return finalTargetCol
      return col
    })

    setTableau(nextTableau)
    setMoves((m) => m + 1)
    setScore((s) => Math.max(0, s - 1) + (completedSuit ? 100 : 0))
    setSelected(null)
    setHint(null)
    setLastMovedCol(toCol)
    setTimeout(() => setLastMovedCol(null), 600)

    if (completedSuit) {
      playSound('run')
      setCelebratingRun({ suit: completedSuit, key: Date.now() })
      setCompletedRuns((prev) => {
        const next = [...prev, completedSuit!]
        if (next.length === 8) {
          // Trigger win!
          setIsWon(true)
        }
        return next
      })
      toast({
        title: '🎉 Sequência K → A Completa!',
        description: `Sequência de ${SUIT_SYMBOLS[completedSuit]} removida do tabuleiro! (+100 pontos)`,
        className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
      })
      setTimeout(() => setCelebratingRun(null), 2500)
    } else {
      playSound('card')
    }

    return true
  }

  // Win condition listener & GameContext reward
  useEffect(() => {
    if (completedRuns.length === 8 && !winClaimedRef.current) {
      winClaimedRef.current = true
      setIsWon(true)
      playSound('win')

      // Rewards scale with difficulty (suitMode)
      const baseCoins = suitMode === 1 ? 150 : suitMode === 2 ? 300 : 600
      const baseXp = suitMode === 1 ? 120 : suitMode === 2 ? 250 : 500

      addReward(
        baseXp,
        baseCoins,
        `Vitória no Spider Solitaire (${suitMode} Naipe${suitMode > 1 ? 's' : ''})! 🕷️`,
      )
      toast({
        title: '🏆 VITÓRIA INCRÍVEL NO SPIDER!',
        description: `Todas as 8 sequências completadas com maestria! Recompensa: +${baseCoins} Moedas e +${baseXp} XP!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
    }
  }, [completedRuns, suitMode, addReward, playSound])

  // Handle clicking a card in the tableau
  const handleCardClick = (colIndex: number, cardIndex: number) => {
    if (isWon) return
    const col = tableau[colIndex]
    const card = col[cardIndex]

    // If card is face down, can't interact
    if (!card.faceUp) return

    // 1. If no selection active:
    if (!selected) {
      if (isValidMovableSequence(col, cardIndex)) {
        setSelected({ colIndex, cardIndex })
      } else {
        playSound('error')
        toast({
          title: 'Sequência mista!',
          description:
            'Apenas sequências do mesmo naipe em ordem decrescente podem ser movidas juntas.',
          variant: 'destructive',
        })
      }
      return
    }

    // 2. If clicking on the same selected card, deselect
    if (selected.colIndex === colIndex && selected.cardIndex === cardIndex) {
      setSelected(null)
      return
    }

    // 3. If clicking another card in the SAME column:
    if (selected.colIndex === colIndex) {
      if (isValidMovableSequence(col, cardIndex)) {
        setSelected({ colIndex, cardIndex })
      } else {
        setSelected(null)
      }
      return
    }

    // 4. Clicking a card in a DIFFERENT column -> attempt move!
    // Destination card MUST be the top card of that column
    if (cardIndex === col.length - 1) {
      const moved = attemptMove(selected.colIndex, selected.cardIndex, colIndex)
      if (!moved) {
        // If move failed, maybe user wanted to select this new card instead
        if (isValidMovableSequence(col, cardIndex)) {
          setSelected({ colIndex, cardIndex })
        } else {
          playSound('error')
          setSelected(null)
        }
      }
    } else {
      // Clicked on a card that is not the top of destination column
      if (isValidMovableSequence(col, cardIndex)) {
        setSelected({ colIndex, cardIndex })
      } else {
        setSelected(null)
      }
    }
  }

  // Handle clicking on an empty column (or empty space below a column)
  const handleEmptyColumnClick = (colIndex: number) => {
    if (isWon || !selected) return
    if (selected.colIndex === colIndex) {
      setSelected(null)
      return
    }

    attemptMove(selected.colIndex, selected.cardIndex, colIndex)
  }

  // Find a hint (any valid move from tableau -> tableau)
  // Priority: moves of SAME suit > moves that uncover a face-down card > moves to build descending
  const handleHint = () => {
    if (isWon) return

    let bestMove: {
      fromCol: number
      fromCardIdx: number
      toCol: number
      weight: number
    } | null = null

    for (let fCol = 0; fCol < 10; fCol++) {
      const col = tableau[fCol]
      if (col.length === 0) continue

      // Find highest index that can be moved
      for (let fIdx = 0; fIdx < col.length; fIdx++) {
        if (!col[fIdx].faceUp) continue
        if (!isValidMovableSequence(col, fIdx)) continue

        const movingCard = col[fIdx]

        for (let tCol = 0; tCol < 10; tCol++) {
          if (tCol === fCol) continue
          const targetCol = tableau[tCol]

          if (targetCol.length === 0) {
            // Moving a K to an empty space is useful, but only if it frees something or starts a column
            if (fIdx > 0 && !col[fIdx - 1].faceUp) {
              const weight = 30
              if (!bestMove || weight > bestMove.weight) {
                bestMove = { fromCol: fCol, fromCardIdx: fIdx, toCol: tCol, weight }
              }
            }
          } else {
            const targetTop = targetCol[targetCol.length - 1]
            if (targetTop.value === movingCard.value + 1) {
              let weight = 10
              // Same suit is highly preferred!
              if (targetTop.suit === movingCard.suit) weight += 50
              // Uncovers a hidden card
              if (fIdx > 0 && !col[fIdx - 1].faceUp) weight += 40

              if (!bestMove || weight > bestMove.weight) {
                bestMove = { fromCol: fCol, fromCardIdx: fIdx, toCol: tCol, weight }
              }
            }
          }
        }
      }
    }

    if (bestMove) {
      setHint({
        fromCol: bestMove.fromCol,
        fromCardIdx: bestMove.fromCardIdx,
        toCol: bestMove.toCol,
      })
      setSelected({ colIndex: bestMove.fromCol, cardIndex: bestMove.fromCardIdx })
      toast({
        title: '💡 Dica encontrada!',
        description: `Mova a carta da coluna ${bestMove.fromCol + 1} para a coluna ${bestMove.toCol + 1}.`,
        className: 'bg-amber-50 border-amber-300 text-amber-950 font-bold',
      })
    } else {
      if (stock.length > 0) {
        toast({
          title: 'Sem movimentos óbvios!',
          description:
            'Não há movimentos simples entre colunas. Tente distribuir mais cartas do estoque!',
        })
      } else {
        toast({
          title: 'Fim dos movimentos!',
          description: 'Nenhum movimento restante. Use o Desfazer ou reinicie uma nova partida.',
          variant: 'destructive',
        })
      }
    }
  }

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Pre-calculate column height in pixels to avoid layout thrashing
  const getColumnHeight = useCallback((col: Card[]) => {
    if (col.length === 0) return 320
    let total = 0
    for (let i = 0; i < col.length; i++) {
      total += col[i].faceUp ? 18 : 10
    }
    return Math.max(320, total + 60)
  }, [])

  return (
    <AuthGate>
      <div className="space-y-2.5 pb-6 animate-fade-in select-none w-full max-w-full overflow-hidden">
        {/* Header / Navigation */}
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
                <span className="text-2xl">🕷️</span> Paciência Spider
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Organize sequências completas K → A do mesmo naipe para vencer!
              </p>
            </div>
          </div>

          {/* Difficulty selector (1, 2, 4 suits) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#795548] hidden sm:inline">Naipes:</span>
            <div className="flex bg-[#F5ECE1] p-1 rounded-2xl border border-amber-200">
              <button
                onClick={() => {
                  setSuitMode(1)
                  startNewGame(1)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  suitMode === 1
                    ? 'bg-[#8BC34A] text-white shadow-sm'
                    : 'text-[#795548] hover:text-[#3E2723]'
                }`}
              >
                1 Naipe (Fácil)
              </button>
              <button
                onClick={() => {
                  setSuitMode(2)
                  startNewGame(2)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  suitMode === 2
                    ? 'bg-[#8BC34A] text-white shadow-sm'
                    : 'text-[#795548] hover:text-[#3E2723]'
                }`}
              >
                2 Naipes (Padrão)
              </button>
              <button
                onClick={() => {
                  setSuitMode(4)
                  startNewGame(4)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  suitMode === 4
                    ? 'bg-[#8BC34A] text-white shadow-sm'
                    : 'text-[#795548] hover:text-[#3E2723]'
                }`}
              >
                4 Naipes (Mestre)
              </button>
            </div>

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

        {/* Dashboard stats & Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
          {/* Pontos */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Pontuação
            </span>
            <span className="text-lg sm:text-2xl font-black text-[#E65100] tabular-nums">
              {score}
            </span>
          </div>

          {/* Movimentos */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Movimentos
            </span>
            <span className="text-lg sm:text-2xl font-black text-[#5E35B1] tabular-nums">
              {moves}
            </span>
          </div>

          {/* Tempo */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Tempo
            </span>
            <span className="text-lg sm:text-2xl font-black text-[#2E7D32] tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Sequências concluídas */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Sequências
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-lg sm:text-2xl font-black text-[#D84315] tabular-nums">
                {completedRuns.length} / 8
              </span>
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-300" />
            </div>
          </div>

          {/* Quick Action controls */}
          <div className="col-span-2 sm:col-span-1 md:col-span-1 flex items-center gap-1 sm:gap-1.5">
            <Button
              onClick={handleUndo}
              disabled={history.length === 0 || isWon}
              variant="outline"
              className="flex-1 h-full min-h-[44px] px-1.5 rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-[11px] text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
            >
              <Undo2 className="w-3.5 h-3.5 text-[#5E35B1]" />
              <span>Desfazer</span>
            </Button>
            <Button
              onClick={handleHint}
              disabled={isWon}
              variant="outline"
              className="flex-1 h-full min-h-[44px] px-1.5 rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-[11px] text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>Dica</span>
            </Button>
            <Button
              onClick={() => startNewGame(suitMode)}
              variant="outline"
              className="h-full min-h-[44px] px-2.5 rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-[11px] text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
              title="Nova Partida"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span className="hidden sm:inline">Reiniciar</span>
            </Button>
          </div>
        </div>

        {/* Selected Card Status Indicator on Mobile */}
        {selected && (
          <div className="bg-amber-100 border border-amber-300 rounded-2xl px-4 py-2 flex items-center justify-between text-xs font-black text-amber-950 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">👉</span>
              <span>
                Carta selecionada: Coluna {selected.colIndex + 1} (
                {VALUE_LABELS[tableau[selected.colIndex][selected.cardIndex]?.value]}{' '}
                {SUIT_SYMBOLS[tableau[selected.colIndex][selected.cardIndex]?.suit]}) — Toque na
                coluna de destino!
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-amber-800 underline hover:text-amber-950 text-xs px-2 py-0.5"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Celebration Banner when a K->A Run is completed */}
        {celebratingRun && (
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 text-stone-900 font-black px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between border-2 border-white animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-spin">✨</span>
              <span className="text-sm sm:text-base">
                Sequência Completa de{' '}
                <strong className="text-black uppercase">
                  {celebratingRun.suit} {SUIT_SYMBOLS[celebratingRun.suit]}
                </strong>{' '}
                (K → A) voando para o cofre! +100 Pontos!
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs bg-white/80 px-2 py-1 rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Brilho Triplo!</span>
            </div>
          </div>
        )}

        {/* Felt Spider Playfield - Compact responsive container */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#1b5e20] via-[#2e7d32] to-[#1e6b23] border-4 border-[#33691E] p-2 sm:p-4 shadow-2xl overflow-hidden">
          {/* Subtle wood / felt texture border & sheen */}
          <div className="absolute inset-0 bg-radial from-transparent to-black/25 pointer-events-none" />

          {/* Top Bar: Stock pile (left) and Completed Sequences Pile (right) */}
          <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-white/15">
            {/* Stock deals */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDealStock}
                disabled={stock.length === 0 || isWon}
                className={`relative group rounded-xl transition-all duration-150 transform active:scale-95 touch-manipulation ${
                  stock.length > 0
                    ? 'cursor-pointer hover:shadow-lg'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title="Distribuir 1 carta para cada coluna"
              >
                {/* Visual card stack representation */}
                <div className="relative w-12 h-18 sm:w-16 sm:h-24 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] rounded-xl border-2 border-white/80 shadow-md flex items-center justify-center">
                  <div className="absolute inset-1 border border-white/30 rounded-lg flex items-center justify-center">
                    <span className="text-lg sm:text-2xl text-white font-black drop-shadow">
                      🕷️
                    </span>
                  </div>
                  {/* Badge count of remaining stock deals */}
                  <div className="absolute -bottom-2 -right-2 bg-[#FFB74D] text-[#3E2723] font-black text-xs px-2 py-0.5 rounded-full border border-white shadow">
                    {stock.length}
                  </div>
                </div>
              </button>

              <div className="text-white text-xs">
                <span className="font-black block text-amber-200 uppercase tracking-wider text-[10px]">
                  Estoque
                </span>
                <span className="font-extrabold text-white/90">
                  {stock.length > 0 ? `${stock.length} restante(s)` : 'Esgotado'}
                </span>
                <span className="block text-[10px] text-white/60 hidden sm:inline">
                  Toque para distribuir
                </span>
              </div>
            </div>

            {/* Completed Runs Area */}
            <div className="flex items-center gap-2">
              <div className="text-right text-white text-xs mr-2 hidden sm:block">
                <span className="font-black block text-amber-200 uppercase tracking-wider text-[10px]">
                  Sequências K → A
                </span>
                <span className="font-extrabold text-white/90">
                  {completedRuns.length} de 8 concluídas
                </span>
              </div>

              <div className="flex items-center gap-1 bg-black/20 p-1.5 rounded-2xl border border-white/20 min-h-[46px] overflow-x-auto max-w-[200px] sm:max-w-none">
                {Array.from({ length: 8 }).map((_, i) => {
                  const suit = completedRuns[i]
                  return (
                    <div
                      key={i}
                      className={`w-6 h-9 sm:w-9 sm:h-12 rounded-lg border flex items-center justify-center text-xs sm:text-sm font-black transition-all shrink-0 ${
                        suit
                          ? 'bg-white border-amber-300 shadow-sm text-[#212121]'
                          : 'bg-white/5 border-dashed border-white/20 text-white/30'
                      }`}
                    >
                      {suit ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] sm:text-[10px] font-black leading-none">
                            K
                          </span>
                          <span
                            className="text-[10px] sm:text-xs leading-none"
                            style={{ color: SUIT_COLORS[suit] }}
                          >
                            {SUIT_SYMBOLS[suit]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] opacity-40">{i + 1}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 10 Tableau Columns - with smooth horizontal scroll if needed on narrow phones */}
          <div className="relative z-10 grid grid-cols-10 gap-0.5 sm:gap-2 min-h-[440px] overflow-x-auto">
            {tableau.map((col, colIdx) => {
              const isColTargetOfHint = hint?.toCol === colIdx
              const isColSourceOfHint = hint?.fromCol === colIdx
              const colHeight = getColumnHeight(col)

              // Precalculate offsets for the column
              let currentTop = 0
              const offsets = col.map((c) => {
                const top = currentTop
                currentTop += c.faceUp ? 18 : 10
                return top
              })

              return (
                <div
                  key={colIdx}
                  onClick={() => {
                    handleEmptyColumnClick(colIdx)
                  }}
                  style={{ minHeight: `${colHeight}px` }}
                  className={`relative flex flex-col rounded-lg sm:rounded-xl transition-colors p-0.5 touch-manipulation cursor-pointer ${
                    col.length === 0
                      ? 'border-2 border-dashed border-white/40 bg-white/10 hover:bg-white/20 flex items-start justify-center'
                      : ''
                  } ${isColTargetOfHint ? 'ring-2 ring-amber-400 bg-amber-400/20' : ''}`}
                >
                  {/* Empty slot placeholder */}
                  {col.length === 0 && (
                    <div className="w-full h-14 sm:h-20 rounded-lg border border-dashed border-white/35 flex items-center justify-center text-white/60 text-[9px] sm:text-[10px] font-black">
                      Vazio
                    </div>
                  )}

                  {/* Cards inside column */}
                  {col.map((card, cardIdx) => {
                    const isSelected =
                      selected?.colIndex === colIdx && cardIdx >= selected.cardIndex
                    const isHintSource = isColSourceOfHint && cardIdx === hint?.fromCardIdx
                    const isJustSnapped = lastMovedCol === colIdx && cardIdx === col.length - 1
                    const topOffset = offsets[cardIdx]

                    return (
                      <div
                        key={card.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCardClick(colIdx, cardIdx)
                        }}
                        style={{
                          top: `${topOffset}px`,
                          zIndex: cardIdx + 1,
                        }}
                        className={`absolute left-0 right-0 rounded-lg sm:rounded-xl shadow-xs transition-transform duration-150 cursor-pointer touch-manipulation ${
                          card.faceUp
                            ? 'bg-white border'
                            : 'bg-gradient-to-br from-[#1E88E5] to-[#0D47A1] border border-white/80'
                        } ${
                          isSelected
                            ? 'ring-3 ring-amber-400 border-amber-500 scale-[1.05] shadow-lg z-30'
                            : isJustSnapped
                              ? 'animate-card-snap ring-2 ring-emerald-400'
                              : card.faceUp
                                ? 'border-[#BDBDBD] hover:border-[#8BC34A] hover:scale-[1.02]'
                                : 'hover:brightness-105'
                        } ${isHintSource ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}
                      >
                        {' '}
                        {card.faceUp ? (
                          // Face Up Card Content
                          <div
                            className="p-0.5 sm:p-1.5 h-13 sm:h-20 flex flex-col justify-between"
                            style={{ color: SUIT_COLORS[card.suit] }}
                          >
                            {/* Card Top Corner */}
                            <div className="flex items-center justify-between leading-none">
                              <span className="text-[11px] sm:text-sm font-black tabular-nums">
                                {VALUE_LABELS[card.value]}
                              </span>
                              <span className="text-[10px] sm:text-sm leading-none">
                                {SUIT_SYMBOLS[card.suit]}
                              </span>
                            </div>

                            {/* Card Center Symbol */}
                            <div className="flex items-center justify-center text-xs sm:text-xl opacity-90 leading-none">
                              {SUIT_SYMBOLS[card.suit]}
                            </div>

                            {/* Card Bottom Corner */}
                            <div className="flex items-center justify-between leading-none transform rotate-180 opacity-70">
                              <span className="text-[9px] sm:text-xs font-black">
                                {VALUE_LABELS[card.value]}
                              </span>
                              <span className="text-[9px] sm:text-xs">
                                {SUIT_SYMBOLS[card.suit]}
                              </span>
                            </div>
                          </div>
                        ) : (
                          // Face Down Card Back Pattern
                          <div className="h-9 sm:h-16 flex items-center justify-center p-0.5">
                            <div className="w-full h-full border border-white/20 rounded-sm sm:rounded-md flex items-center justify-center">
                              <span className="text-[9px] sm:text-[10px] text-white/50 font-black">
                                🕷️
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Victory Modal Overlay */}
          {isWon && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex items-center justify-center p-4">
              <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-scale-in space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                  🏆
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#3E2723]">
                    Vitória Magnífica!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#795548] font-bold mt-1">
                    Você limpou todas as 8 sequências no modo{' '}
                    <strong>
                      {suitMode} Naipe{suitMode > 1 ? 's' : ''}
                    </strong>
                    !
                  </p>
                </div>

                <div className="bg-[#F5ECE1] rounded-2xl p-4 border border-amber-200 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] font-black text-[#795548] uppercase">Pontos</span>
                    <p className="text-lg font-black text-[#E65100]">{score}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#795548] uppercase">
                      Movimentos
                    </span>
                    <p className="text-lg font-black text-[#5E35B1]">{moves}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#795548] uppercase">Tempo</span>
                    <p className="text-lg font-black text-[#2E7D32]">
                      {formatTime(elapsedSeconds)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-[#2E7D32]">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Recompensa de ouro e XP adicionada ao seu perfil!</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => startNewGame(suitMode)}
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

        {/* Quick Instructions Footer Card */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-4 text-xs text-[#795548] space-y-1 font-bold">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Como Jogar Paciência Spider:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-2 leading-relaxed">
            <li>
              <strong>Objetivo:</strong> Formar 8 sequências completas de K até A do mesmo naipe.
            </li>
            <li>
              <strong>Mover cartas:</strong> Toque na carta ou sequência e depois toque na coluna de
              destino. É possível colocar qualquer carta sobre uma de valor imediatamente superior
              (ex: 7 sobre 8).
            </li>
            <li>
              <strong>Sequências do mesmo naipe:</strong> Somente sequências completadas com o mesmo
              naipe se movem em bloco. Sequências mistas descem individualmente.
            </li>
            <li>
              <strong>Estoque:</strong> Toque no monte azul à esquerda para distribuir 1 nova carta
              em cada coluna quando não tiver movimentos úteis (exige que nenhuma coluna esteja
              vazia).
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
