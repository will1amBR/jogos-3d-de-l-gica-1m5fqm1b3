import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Bot,
  Volume2,
  VolumeX,
  Undo2,
  HelpCircle,
  Crown,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export type CheckersColor = 'w' | 'b' // 'w' = brancas (jogador 1), 'b' = pretas (jogador 2 / IA)

export interface CheckersPiece {
  id: string
  color: CheckersColor
  isKing: boolean
}

export type CheckersBoard = (CheckersPiece | null)[][]

export interface CheckersMove {
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  captures: { row: number; col: number }[]
  isPromotion?: boolean
}

// Inicializa tabuleiro 8x8 nas casas escuras com 12 peças de cada lado
function createInitialCheckersBoard(): CheckersBoard {
  const b: CheckersBoard = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))

  let pId = 0
  // Pretas nas linhas 0, 1, 2
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        b[r][c] = { id: `b_${pId++}`, color: 'b', isKing: false }
      }
    }
  }

  // Brancas nas linhas 5, 6, 7
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        b[r][c] = { id: `w_${pId++}`, color: 'w', isKing: false }
      }
    }
  }

  return b
}

export default function Damas() {
  const { addReward } = useGame()

  const [board, setBoard] = useState<CheckersBoard>(createInitialCheckersBoard)
  const [turn, setTurn] = useState<CheckersColor>('w')
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null)
  const [lastMove, setLastMove] = useState<CheckersMove | null>(null)
  const [history, setHistory] = useState<{ board: CheckersBoard; turn: CheckersColor }[]>([])
  const [mode, setMode] = useState<'pve' | 'pvp'>('pve')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [winner, setWinner] = useState<CheckersColor | null>(null)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const rewardClaimedRef = useRef(false)

  // Audio Context Singleton
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
    (type: 'move' | 'capture' | 'king' | 'win') => {
      if (!soundEnabled) return
      try {
        const ctx = getAudioContext()
        if (!ctx) return
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        if (type === 'move') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(360, now)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        } else if (type === 'capture') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(400, now)
          osc.frequency.setValueAtTime(600, now + 0.05)
          gain.gain.setValueAtTime(0.12, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
          osc.start(now)
          osc.stop(now + 0.15)
        } else if (type === 'king') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(523.25, now)
          osc.frequency.setValueAtTime(659.25, now + 0.08)
          osc.frequency.setValueAtTime(783.99, now + 0.16)
          gain.gain.setValueAtTime(0.15, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
          osc.start(now)
          osc.stop(now + 0.3)
        } else if (type === 'win') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.setValueAtTime(880, now + 0.25)
          gain.gain.setValueAtTime(0.18, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
          osc.start(now)
          osc.stop(now + 0.5)
        }
      } catch {
        // fail safe
      }
    },
    [soundEnabled, getAudioContext],
  )

  // Encontra todas as capturas encadeadas a partir de uma casa (regras brasileiras)
  const getCapturesForPiece = (
    b: CheckersBoard,
    r: number,
    c: number,
    visitedPieces: Set<string> = new Set(),
  ): CheckersMove[] => {
    const piece = b[r][c]
    if (!piece) return []

    const opponent = piece.color === 'w' ? 'b' : 'w'
    const fullSequences: CheckersMove[] = []

    // 4 direções diagonais
    const dirs = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]

    if (!piece.isKing) {
      // Peça comum: pode capturar para frente E para trás (regra brasileira)
      for (const [dr, dc] of dirs) {
        const midR = r + dr
        const midC = c + dc
        const landR = r + dr * 2
        const landC = c + dc * 2

        if (landR >= 0 && landR < 8 && landC >= 0 && landC < 8) {
          const midP = b[midR][midC]
          const landP = b[landR][landC]

          if (midP && midP.color === opponent && !visitedPieces.has(midP.id) && !landP) {
            // Movimento de salto simulado
            const nextVisited = new Set(visitedPieces)
            nextVisited.add(midP.id)

            // Criar cópia para testar se há capturas subsequentes
            const tempBoard = b.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
            tempBoard[r][c] = null
            tempBoard[landR][landC] = piece

            const subCaptures = getCapturesForPiece(tempBoard, landR, landC, nextVisited)

            if (subCaptures.length > 0) {
              for (const sc of subCaptures) {
                fullSequences.push({
                  fromRow: r,
                  fromCol: c,
                  toRow: sc.toRow,
                  toCol: sc.toCol,
                  captures: [{ row: midR, col: midC }, ...sc.captures],
                  isPromotion: landR === (piece.color === 'w' ? 0 : 7) || sc.isPromotion,
                })
              }
            } else {
              fullSequences.push({
                fromRow: r,
                fromCol: c,
                toRow: landR,
                toCol: landC,
                captures: [{ row: midR, col: midC }],
                isPromotion: landR === (piece.color === 'w' ? 0 : 7),
              })
            }
          }
        }
      }
    } else {
      // Dama voadora (regra brasileira): anda múltiplas casas e pula peça adversária
      for (const [dr, dc] of dirs) {
        let step = 1
        let pieceToCapture: { p: CheckersPiece; r: number; c: number } | null = null

        while (true) {
          const checkR = r + dr * step
          const checkC = c + dc * step
          if (checkR < 0 || checkR >= 8 || checkC < 0 || checkC >= 8) break

          const cell = b[checkR][checkC]
          if (!pieceToCapture) {
            if (cell) {
              if (cell.color === opponent && !visitedPieces.has(cell.id)) {
                pieceToCapture = { p: cell, r: checkR, c: checkC }
              } else {
                break
              }
            }
          } else {
            // Já encontramos a peça a capturar, casas livres depois dela são pousos válidos
            if (!cell) {
              const landR = checkR
              const landC = checkC
              const nextVisited = new Set(visitedPieces)
              nextVisited.add(pieceToCapture.p.id)

              const tempBoard = b.map((row) => row.map((c) => (c ? { ...c } : null)))
              tempBoard[r][c] = null
              tempBoard[landR][landC] = piece

              const subCaptures = getCapturesForPiece(tempBoard, landR, landC, nextVisited)
              if (subCaptures.length > 0) {
                for (const sc of subCaptures) {
                  fullSequences.push({
                    fromRow: r,
                    fromCol: c,
                    toRow: sc.toRow,
                    toCol: sc.toCol,
                    captures: [{ row: pieceToCapture.r, col: pieceToCapture.c }, ...sc.captures],
                  })
                }
              } else {
                fullSequences.push({
                  fromRow: r,
                  fromCol: c,
                  toRow: landR,
                  toCol: landC,
                  captures: [{ row: pieceToCapture.r, col: pieceToCapture.c }],
                })
              }
            } else {
              break // bloquado por outra peça após a capturada
            }
          }
          step++
        }
      }
    }

    return fullSequences
  }

  // Movimentos simples (sem captura)
  const getSimpleMovesForPiece = (b: CheckersBoard, r: number, c: number): CheckersMove[] => {
    const piece = b[r][c]
    if (!piece) return []
    const moves: CheckersMove[] = []

    if (!piece.isKing) {
      // Peça comum só anda para frente
      const forwardDir = piece.color === 'w' ? -1 : 1
      for (const dc of [-1, 1]) {
        const nr = r + forwardDir
        const nc = c + dc
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr][nc]) {
          moves.push({
            fromRow: r,
            fromCol: c,
            toRow: nr,
            toCol: nc,
            captures: [],
            isPromotion: nr === (piece.color === 'w' ? 0 : 7),
          })
        }
      }
    } else {
      // Dama voa em todas as diagonais
      const dirs = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
      for (const [dr, dc] of dirs) {
        let step = 1
        while (true) {
          const nr = r + dr * step
          const nc = c + dc * step
          if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break
          if (!b[nr][nc]) {
            moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc, captures: [] })
          } else {
            break
          }
          step++
        }
      }
    }

    return moves
  }

  // Todos os movimentos legais para a cor do turno (aplica a REGRA DA MAIORIA da Dama Brasileira: captura obrigatória e com o maior número de peças)
  const getAllLegalMoves = (b: CheckersBoard, color: CheckersColor): CheckersMove[] => {
    let allCaptures: CheckersMove[] = []

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.color === color) {
          const caps = getCapturesForPiece(b, r, c)
          allCaptures.push(...caps)
        }
      }
    }

    // Se houver capturas, a captura é obrigatória e deve-se capturar a maior quantidade de peças
    if (allCaptures.length > 0) {
      const maxCaptures = Math.max(...allCaptures.map((m) => m.captures.length))
      return allCaptures.filter((m) => m.captures.length === maxCaptures)
    }

    // Se não houver capturas, retorna movimentos simples
    const simpleMoves: CheckersMove[] = []
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.color === color) {
          simpleMoves.push(...getSimpleMovesForPiece(b, r, c))
        }
      }
    }
    return simpleMoves
  }

  const allLegalMoves = useMemo(() => {
    return getAllLegalMoves(board, turn)
  }, [board, turn])

  const movesForSelected = useMemo(() => {
    if (!selectedPos) return []
    return allLegalMoves.filter((m) => m.fromRow === selectedPos[0] && m.fromCol === selectedPos[1])
  }, [allLegalMoves, selectedPos])

  // Aplica o movimento
  const executeMove = (m: CheckersMove) => {
    setHistory((prev) => [
      ...prev,
      {
        board: board.map((r) => r.map((c) => (c ? { ...c } : null))),
        turn,
      },
    ])

    const next = board.map((r) => r.map((c) => (c ? { ...c } : null)))
    const piece = next[m.fromRow][m.fromCol]
    if (!piece) return

    // Move peça
    next[m.fromRow][m.fromCol] = null

    // Remove peças capturadas
    for (const cap of m.captures) {
      next[cap.row][cap.col] = null
    }

    // Promoção a Dama
    let becameKing = piece.isKing
    if (!piece.isKing && m.toRow === (piece.color === 'w' ? 0 : 7)) {
      becameKing = true
      playSound('king')
      toast({
        title: '👑 COROAÇÃO A DAMA!',
        description: `Uma peça ${piece.color === 'w' ? 'branca' : 'preta'} alcançou a última linha e virou Dama!`,
        className: 'bg-amber-100 border-amber-400 text-amber-950 font-black',
      })
    } else if (m.captures.length > 0) {
      playSound('capture')
    } else {
      playSound('move')
    }

    next[m.toRow][m.toCol] = {
      ...piece,
      isKing: becameKing,
    }

    const nextTurn: CheckersColor = turn === 'w' ? 'b' : 'w'
    setBoard(next)
    setTurn(nextTurn)
    setLastMove(m)
    setSelectedPos(null)

    // Verifica se o próximo jogador tem movimentos
    const nextMoves = getAllLegalMoves(next, nextTurn)
    if (nextMoves.length === 0) {
      setWinner(turn)
      playSound('win')
    }
  }

  // IA simples com heurística de capturas múltiplas e segurança
  useEffect(() => {
    if (mode === 'pve' && turn === 'b' && !winner) {
      setIsAiThinking(true)
      const timer = setTimeout(() => {
        const moves = getAllLegalMoves(board, 'b')
        if (moves.length === 0) {
          setWinner('w')
          setIsAiThinking(false)
          return
        }

        // Escolhe o lance com mais capturas ou que proteja melhor as peças
        let bestMove = moves[0]
        let bestScore = -9999

        for (const m of moves) {
          let score = m.captures.length * 100
          if (m.isPromotion) score += 60
          // Bônus para manter peças nas bordas (mais seguro)
          if (m.toCol === 0 || m.toCol === 7) score += 15
          // Evitar avançar além da conta sem apoio
          score += Math.random() * 5

          if (score > bestScore) {
            bestScore = score
            bestMove = m
          }
        }

        executeMove(bestMove)
        setIsAiThinking(false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [turn, mode, board, winner])

  // Vitória
  useEffect(() => {
    if (winner === 'w' && !rewardClaimedRef.current) {
      rewardClaimedRef.current = true
      addReward(250, 350, 'Vitória no Jogo de Damas! 🔴')
      toast({
        title: 'TABULEIRO DOMINADO! 🏆',
        description: 'Você venceu a partida de Damas e ganhou +350 Moedas e +250 XP!',
        className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
      })
    }
  }, [winner, addReward])

  const handleSquareClick = (r: number, c: number) => {
    if (winner || (mode === 'pve' && turn === 'b')) return

    const clicked = board[r][c]

    if (selectedPos) {
      const [selR, selC] = selectedPos
      if (selR === r && selC === c) {
        setSelectedPos(null)
        return
      }

      // Procura movimento legal para a casa clicada
      const matching = movesForSelected.find((m) => m.toRow === r && m.toCol === c)
      if (matching) {
        executeMove(matching)
        return
      }

      // Troca seleção se for peça da mesma cor que tem lance disponível
      if (clicked && clicked.color === turn) {
        const hasMoves = allLegalMoves.some((m) => m.fromRow === r && m.fromCol === c)
        if (hasMoves) {
          setSelectedPos([r, c])
        }
      } else {
        setSelectedPos(null)
      }
    } else {
      if (clicked && clicked.color === turn) {
        const hasMoves = allLegalMoves.some((m) => m.fromRow === r && m.fromCol === c)
        if (hasMoves) {
          setSelectedPos([r, c])
        } else {
          toast({
            title: 'Captura Obrigatória!',
            description: 'Você deve jogar com as peças destacadas que realizam capturas.',
            variant: 'destructive',
          })
        }
      }
    }
  }

  const handleUndo = () => {
    if (history.length === 0 || winner) return
    const last = history[history.length - 1]
    setBoard(last.board)
    setTurn(last.turn)
    setHistory((prev) => prev.slice(0, -1))
    setSelectedPos(null)
    setLastMove(null)
    playSound('move')
  }

  const resetGame = () => {
    setBoard(createInitialCheckersBoard())
    setTurn('w')
    setSelectedPos(null)
    setLastMove(null)
    setHistory([])
    setWinner(null)
    rewardClaimedRef.current = false
    playSound('move')
  }

  // Contagem de peças
  const whiteCount = useMemo(() => {
    return board.flat().filter((p) => p && p.color === 'w').length
  }, [board])

  const blackCount = useMemo(() => {
    return board.flat().filter((p) => p && p.color === 'b').length
  }, [board])

  return (
    <AuthGate>
      <div className="space-y-4 pb-12 animate-fade-in select-none w-full max-w-2xl mx-auto px-2 sm:px-4">
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
                <span>🔴⚪</span> Damas Brasileiras
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Captura Obrigatória, Dama Voadora & 2 Jogadores ou IA
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

        {/* Barra de Status e Modos */}
        <div className="bg-[#FFF9F0] border-2 border-amber-200/90 rounded-3xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex bg-[#F5ECE1] p-1 rounded-2xl border border-amber-200 gap-1">
              <button
                onClick={() => {
                  setMode('pve')
                  resetGame()
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  mode === 'pve'
                    ? 'bg-[#8BC34A] text-white shadow-xs'
                    : 'text-[#795548] hover:text-[#3E2723]'
                }`}
              >
                <Bot className="w-4 h-4" /> Contra a IA
              </button>
              <button
                onClick={() => {
                  setMode('pvp')
                  resetGame()
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  mode === 'pvp'
                    ? 'bg-[#8BC34A] text-white shadow-xs'
                    : 'text-[#795548] hover:text-[#3E2723]'
                }`}
              >
                <Users className="w-4 h-4" /> 2 Jogadores
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-100 border border-amber-300">
              <span className="text-sm font-black text-[#3E2723]">
                {turn === 'w' ? '⚪ Vez das Brancas' : '🔴 Vez das Pretas'}
                {mode === 'pve' && turn === 'b' && isAiThinking && ' (Pensando...)'}
              </span>
            </div>
          </div>

          {/* Contagem de Peças Restantes */}
          <div className="grid grid-cols-2 gap-3 pt-1 text-center">
            <div className="bg-[#FFFDF9] border border-amber-200 rounded-2xl p-2 flex items-center justify-between px-4">
              <span className="text-xs font-black text-[#3E2723] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white border-2 border-stone-400 inline-block" />{' '}
                Brancas Restantes:
              </span>
              <span className="text-xl font-black text-[#2E7D32] tabular-nums">{whiteCount}</span>
            </div>
            <div className="bg-[#FFFDF9] border border-amber-200 rounded-2xl p-2 flex items-center justify-between px-4">
              <span className="text-xs font-black text-[#3E2723] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-600 border-2 border-rose-800 inline-block" />{' '}
                Pretas Restantes:
              </span>
              <span className="text-xl font-black text-rose-700 tabular-nums">{blackCount}</span>
            </div>
          </div>
        </div>

        {/* Tabuleiro de Damas 8x8 */}
        <div className="relative bg-gradient-to-br from-[#4E342E] to-[#2E1C14] border-4 border-[#3E2723]/40 rounded-3xl p-3 sm:p-5 shadow-2xl max-w-lg mx-auto aspect-square flex flex-col justify-center">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-2xl overflow-hidden border-2 border-stone-800 shadow-inner">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isDarkSquare = (r + c) % 2 === 1
                const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c
                const isLegalTarget = movesForSelected.some((m) => m.toRow === r && m.toCol === c)
                const mustCapture = allLegalMoves.some(
                  (m) => m.fromRow === r && m.fromCol === c && m.captures.length > 0,
                )

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    disabled={!isDarkSquare}
                    className={`relative w-full h-full flex items-center justify-center select-none transition-all duration-150 touch-manipulation ${
                      isDarkSquare ? 'bg-[#5D4037] cursor-pointer' : 'bg-[#D7CCC8] cursor-default'
                    } ${
                      isSelected
                        ? 'ring-4 ring-amber-400 ring-inset bg-amber-900/60'
                        : mustCapture && !selectedPos
                          ? 'ring-2 ring-yellow-400 animate-pulse'
                          : ''
                    }`}
                  >
                    {/* Indicador de destino legal */}
                    {isLegalTarget && (
                      <div className="absolute w-5 h-5 rounded-full bg-emerald-400 border-2 border-white shadow-md z-20 animate-scale-in" />
                    )}

                    {/* Peça de Dama */}
                    {piece && (
                      <div
                        className={`relative w-[82%] h-[82%] rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-2 ${
                          piece.color === 'w'
                            ? 'bg-gradient-to-br from-white via-amber-50 to-stone-200 border-stone-300 text-amber-700'
                            : 'bg-gradient-to-br from-rose-600 via-rose-700 to-rose-950 border-rose-900 text-yellow-300'
                        } ${isSelected ? 'scale-110 shadow-2xl ring-2 ring-amber-300' : ''}`}
                      >
                        {/* Relevo circular interno */}
                        <div
                          className={`w-[68%] h-[68%] rounded-full border border-black/15 flex items-center justify-center shadow-inner ${
                            piece.color === 'w' ? 'bg-amber-50/50' : 'bg-rose-800/50'
                          }`}
                        >
                          {piece.isKing && (
                            <Crown className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md animate-bounce" />
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                )
              }),
            )}
          </div>
        </div>

        {/* Modal / Banner de Vitória */}
        {winner && (
          <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl p-5 text-center shadow-xl space-y-3 animate-scale-in">
            <h2 className="text-2xl font-black text-[#3E2723]">
              Vitória das {winner === 'w' ? 'Brancas' : 'Pretas'}! 🎉
            </h2>
            <p className="text-xs text-[#795548] font-bold">
              Todas as peças adversárias foram capturadas ou imobilizadas!
            </p>
            <div className="flex gap-2 justify-center pt-1">
              <Button
                onClick={resetGame}
                className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-3 px-6 rounded-2xl"
              >
                Jogar de Novo
              </Button>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-2 max-w-lg mx-auto">
          <Button
            onClick={handleUndo}
            disabled={history.length === 0 || !!winner}
            variant="outline"
            className="flex-1 border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-black py-4 rounded-2xl min-h-[48px] text-xs sm:text-sm text-[#3E2723] flex items-center justify-center gap-1.5"
          >
            <Undo2 className="w-4 h-4 text-[#5E35B1]" /> Desfazer Lance
          </Button>
          <Button
            onClick={resetGame}
            className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-4 rounded-2xl shadow-md min-h-[48px] text-xs sm:text-sm flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> Reiniciar Tabuleiro
          </Button>
        </div>

        {/* Dicas e Regras Brasileiras */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-3.5 text-xs text-[#795548] font-bold space-y-1">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Regras Oficiais Brasileiras:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1 leading-relaxed">
            <li>
              A captura é <strong>obrigatória</strong> e tem prioridade para a maior quantidade de
              peças (Regra da Maioria).
            </li>
            <li>Peças comuns podem capturar tanto para a frente quanto para trás.</li>
            <li>
              Ao atingir a última linha, a peça é coroada <strong>Dama</strong> e pode andar
              livremente pelas diagonais.
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
