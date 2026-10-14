import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  HelpCircle,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

type Player = 'X' | 'O'
type CellValue = Player | null
type GameMode = 'pve' | 'pvp'
type Difficulty = 'easy' | 'medium' | 'hard'

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export default function Velha() {
  const { addReward } = useGame()

  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null))
  const [turn, setTurn] = useState<Player>('X')
  const [winner, setWinner] = useState<Player | 'draw' | null>(null)
  const [winningLine, setWinningLine] = useState<number[] | null>(null)
  const [mode, setMode] = useState<GameMode>('pve')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Placar da sessão
  const [scores, setScores] = useState({ x: 0, o: 0, draws: 0 })
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
    (type: 'click' | 'win' | 'draw' | 'reset') => {
      if (!soundEnabled) return
      try {
        const ctx = getAudioContext()
        if (!ctx) return
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        if (type === 'click') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.exponentialRampToValueAtTime(660, now + 0.08)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        } else if (type === 'win') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(523.25, now)
          osc.frequency.setValueAtTime(659.25, now + 0.1)
          osc.frequency.setValueAtTime(783.99, now + 0.2)
          osc.frequency.setValueAtTime(1046.5, now + 0.3)
          gain.gain.setValueAtTime(0.15, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
          osc.start(now)
          osc.stop(now + 0.5)
        } else if (type === 'draw') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(330, now)
          osc.frequency.linearRampToValueAtTime(260, now + 0.2)
          gain.gain.setValueAtTime(0.09, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
          osc.start(now)
          osc.stop(now + 0.2)
        } else if (type === 'reset') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(350, now)
          osc.frequency.exponentialRampToValueAtTime(500, now + 0.12)
          gain.gain.setValueAtTime(0.07, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
          osc.start(now)
          osc.stop(now + 0.12)
        }
      } catch {
        // audio fail safe
      }
    },
    [soundEnabled, getAudioContext],
  )

  const checkWinner = (currentBoard: CellValue[]) => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return { winner: currentBoard[a], line: combo }
      }
    }
    if (currentBoard.every((cell) => cell !== null)) {
      return { winner: 'draw' as const, line: null }
    }
    return null
  }

  // Minimax para IA Imbatível
  const minimax = (
    newBoard: CellValue[],
    depth: number,
    isMaximizing: boolean,
  ): { score: number; index?: number } => {
    const res = checkWinner(newBoard)
    if (res) {
      if (res.winner === 'O') return { score: 10 - depth }
      if (res.winner === 'X') return { score: depth - 10 }
      if (res.winner === 'draw') return { score: 0 }
    }

    const availableMoves: number[] = []
    newBoard.forEach((cell, idx) => {
      if (cell === null) availableMoves.push(idx)
    })

    if (isMaximizing) {
      let bestScore = -Infinity
      let bestMove = availableMoves[0]
      for (const idx of availableMoves) {
        newBoard[idx] = 'O'
        const score = minimax(newBoard, depth + 1, false).score
        newBoard[idx] = null
        if (score > bestScore) {
          bestScore = score
          bestMove = idx
        }
      }
      return { score: bestScore, index: bestMove }
    } else {
      let bestScore = Infinity
      let bestMove = availableMoves[0]
      for (const idx of availableMoves) {
        newBoard[idx] = 'X'
        const score = minimax(newBoard, depth + 1, true).score
        newBoard[idx] = null
        if (score < bestScore) {
          bestScore = score
          bestMove = idx
        }
      }
      return { score: bestScore, index: bestMove }
    }
  }

  // Heurística Média
  const getMediumAiMove = (currentBoard: CellValue[]): number => {
    const emptyIndices: number[] = []
    currentBoard.forEach((c, idx) => {
      if (c === null) emptyIndices.push(idx)
    })

    // 1. Ganhar se possível
    for (const idx of emptyIndices) {
      const copy = [...currentBoard]
      copy[idx] = 'O'
      if (checkWinner(copy)?.winner === 'O') return idx
    }

    // 2. Bloquear X
    for (const idx of emptyIndices) {
      const copy = [...currentBoard]
      copy[idx] = 'X'
      if (checkWinner(copy)?.winner === 'X') return idx
    }

    // 3. Pegar centro
    if (currentBoard[4] === null && Math.random() < 0.7) return 4

    // 4. Aleatório
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)]
  }

  // Jogada da IA
  const makeAiMove = useCallback(
    (currentBoard: CellValue[]) => {
      const emptyIndices: number[] = []
      currentBoard.forEach((c, idx) => {
        if (c === null) emptyIndices.push(idx)
      })

      if (emptyIndices.length === 0) return

      let chosenIndex: number

      if (difficulty === 'easy') {
        chosenIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)]
      } else if (difficulty === 'medium') {
        chosenIndex = getMediumAiMove(currentBoard)
      } else {
        const result = minimax([...currentBoard], 0, true)
        chosenIndex = result.index !== undefined ? result.index : emptyIndices[0]
      }

      setTimeout(() => {
        setBoard((prev) => {
          if (prev[chosenIndex] !== null || winner) return prev
          const next = [...prev]
          next[chosenIndex] = 'O'
          playSound('click')

          const gameResult = checkWinner(next)
          if (gameResult) {
            setWinner(gameResult.winner)
            setWinningLine(gameResult.line)
            if (gameResult.winner === 'draw') {
              playSound('draw')
              setScores((s) => ({ ...s, draws: s.draws + 1 }))
            } else {
              playSound('win')
              setScores((s) => ({ ...s, o: s.o + 1 }))
            }
          } else {
            setTurn('X')
          }
          return next
        })
      }, 350)
    },
    [difficulty, winner, playSound],
  )

  const handleCellClick = (index: number) => {
    if (board[index] !== null || winner !== null) return
    if (mode === 'pve' && turn !== 'X') return

    playSound('click')
    const nextBoard = [...board]
    nextBoard[index] = turn
    setBoard(nextBoard)

    const gameResult = checkWinner(nextBoard)
    if (gameResult) {
      setWinner(gameResult.winner)
      setWinningLine(gameResult.line)
      if (gameResult.winner === 'draw') {
        playSound('draw')
        setScores((s) => ({ ...s, draws: s.draws + 1 }))
      } else {
        playSound('win')
        setScores((s) => ({
          ...s,
          x: gameResult.winner === 'X' ? s.x + 1 : s.x,
          o: gameResult.winner === 'O' ? s.o + 1 : s.o,
        }))
      }
      return
    }

    if (mode === 'pve') {
      setTurn('O')
      makeAiMove(nextBoard)
    } else {
      setTurn((t) => (t === 'X' ? 'O' : 'X'))
    }
  }

  // Recompensas ao vencer
  useEffect(() => {
    if (winner === 'X' && !rewardClaimedRef.current) {
      rewardClaimedRef.current = true
      const xp = mode === 'pve' && difficulty === 'hard' ? 90 : 60
      const coins = mode === 'pve' && difficulty === 'hard' ? 120 : 80
      addReward(xp, coins, `Vitória no Jogo da Velha! ❌`)
      toast({
        title: 'Vitória no Jogo da Velha! 🎉',
        description: `Você venceu e faturou +${coins} moedas e +${xp} XP!`,
        className: 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold',
      })
    }
  }, [winner, mode, difficulty, addReward])

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setTurn('X')
    setWinner(null)
    setWinningLine(null)
    rewardClaimedRef.current = false
    playSound('reset')
  }

  return (
    <AuthGate>
      <div className="space-y-4 pb-12 animate-fade-in select-none w-full max-w-2xl mx-auto px-2 sm:px-4">
        {/* Cabeçalho */}
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
                <span>❌⭕</span> Jogo da Velha
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Modo 2 Jogadores ou Desafie a IA (3 Níveis)
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

        {/* Configurações de Modo & Dificuldade */}
        <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-3xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Seletor de Modo */}
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

            {/* Seletor de Dificuldade da IA */}
            {mode === 'pve' && (
              <div className="flex bg-[#F5ECE1] p-1 rounded-2xl border border-amber-200 gap-1">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDifficulty(d)
                      resetGame()
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                      difficulty === d
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-[#795548] hover:text-[#3E2723]'
                    }`}
                  >
                    {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Médio' : 'Imbatível'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Placar da Sessão */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-[#FFFDF9] border border-blue-200 rounded-2xl p-2">
              <span className="text-[11px] font-black uppercase text-blue-700 block">
                {mode === 'pve' ? 'Você (X)' : 'Jogador X'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-blue-800 tabular-nums">
                {scores.x}
              </span>
            </div>
            <div className="bg-[#FFFDF9] border border-amber-200 rounded-2xl p-2">
              <span className="text-[11px] font-black uppercase text-amber-700 block">Empates</span>
              <span className="text-xl sm:text-2xl font-black text-amber-800 tabular-nums">
                {scores.draws}
              </span>
            </div>
            <div className="bg-[#FFFDF9] border border-rose-200 rounded-2xl p-2">
              <span className="text-[11px] font-black uppercase text-rose-700 block">
                {mode === 'pve' ? 'IA (O)' : 'Jogador O'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-800 tabular-nums">
                {scores.o}
              </span>
            </div>
          </div>
        </div>

        {/* Turno ou Resultado */}
        <div className="text-center py-1">
          {winner === null ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 font-black text-sm">
              <span>Vez de:</span>
              <span
                className={`text-lg font-black ${turn === 'X' ? 'text-blue-600' : 'text-rose-600'}`}
              >
                {turn}
              </span>
              <span className="text-xs text-[#795548]">
                {mode === 'pve' && turn === 'O' ? '(Pensando...)' : ''}
              </span>
            </div>
          ) : winner === 'draw' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-200 border border-stone-300 text-stone-800 font-black text-sm">
              <span>🤝 Empate! Ninguém pontuou desta vez.</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-950 font-black text-sm animate-bounce">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span>
                Vitória do Jogador <strong>{winner}</strong>! 🎉
              </span>
            </div>
          )}
        </div>

        {/* Tabuleiro 3x3 Responsivo de Alta Legibilidade */}
        <div className="relative bg-gradient-to-br from-[#2E7D32] to-[#1B5E20] border-4 border-[#3E2723]/30 rounded-3xl p-4 sm:p-6 shadow-2xl max-w-md mx-auto aspect-square flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 h-full">
            {board.map((cell, idx) => {
              const isWinningCell = winningLine?.includes(idx)
              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={cell !== null || winner !== null}
                  className={`relative rounded-2xl flex items-center justify-center font-black transition-all duration-200 transform active:scale-95 shadow-md ${
                    cell === null && !winner
                      ? 'bg-[#FFFDF9] hover:bg-amber-50 hover:shadow-lg cursor-pointer'
                      : 'cursor-default'
                  } ${
                    isWinningCell
                      ? 'bg-gradient-to-br from-amber-300 to-yellow-400 border-4 border-yellow-200 animate-pulse scale-[1.03]'
                      : cell !== null
                        ? 'bg-[#FFF9F0] border-2 border-amber-200'
                        : 'border-2 border-stone-300'
                  }`}
                  style={{ minHeight: '80px' }}
                >
                  {cell === 'X' && (
                    <span className="text-4xl sm:text-6xl text-blue-600 font-black drop-shadow-sm animate-scale-in">
                      ✕
                    </span>
                  )}
                  {cell === 'O' && (
                    <span className="text-4xl sm:text-6xl text-rose-600 font-black drop-shadow-sm animate-scale-in">
                      ◯
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Ações Inferiores */}
        <div className="flex gap-2 max-w-md mx-auto">
          <Button
            onClick={resetGame}
            className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm min-h-[48px]"
          >
            <RotateCcw className="w-4 h-4" /> Nova Rodada
          </Button>
          <Link to="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full border-2 border-[#3E2723]/20 font-black py-4 rounded-2xl min-h-[48px] text-sm"
            >
              Voltar ao Hub
            </Button>
          </Link>
        </div>

        {/* Dicas e Regras */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-3.5 text-xs text-[#795548] font-bold space-y-1">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Como Jogar:
          </p>
          <p>
            Alinhe 3 símbolos iguais em linha horizontal, vertical ou diagonal para vencer. No modo
            contra a IA, vitórias rendem ouro e XP para o seu perfil!
          </p>
        </div>
      </div>
    </AuthGate>
  )
}
