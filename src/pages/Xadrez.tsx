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
  AlertCircle,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export type PieceColor = 'w' | 'b'
export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k'

export interface Piece {
  type: PieceType
  color: PieceColor
  hasMoved?: boolean
}

export type BoardState = (Piece | null)[][]

export interface Move {
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  piece: Piece
  captured?: Piece | null
  isCastling?: 'kingside' | 'queenside'
  isEnPassant?: boolean
  promotion?: PieceType
}

// Unicode das peças de xadrez
const UNICODE_PIECES: Record<PieceColor, Record<PieceType, string>> = {
  w: {
    k: '♔',
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
    p: '♙',
  },
  b: {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟',
  },
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

// Posição inicial clássica
function createInitialBoard(): BoardState {
  const b: BoardState = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))

  // Peças pretas (linha 0 e 1)
  b[0][0] = { type: 'r', color: 'b' }
  b[0][1] = { type: 'n', color: 'b' }
  b[0][2] = { type: 'b', color: 'b' }
  b[0][3] = { type: 'q', color: 'b' }
  b[0][4] = { type: 'k', color: 'b' }
  b[0][5] = { type: 'b', color: 'b' }
  b[0][6] = { type: 'n', color: 'b' }
  b[0][7] = { type: 'r', color: 'b' }
  for (let c = 0; c < 8; c++) {
    b[1][c] = { type: 'p', color: 'b' }
  }

  // Peças brancas (linha 6 e 7)
  for (let c = 0; c < 8; c++) {
    b[6][c] = { type: 'p', color: 'w' }
  }
  b[7][0] = { type: 'r', color: 'w' }
  b[7][1] = { type: 'n', color: 'w' }
  b[7][2] = { type: 'b', color: 'w' }
  b[7][3] = { type: 'q', color: 'w' }
  b[7][4] = { type: 'k', color: 'w' }
  b[7][5] = { type: 'b', color: 'w' }
  b[7][6] = { type: 'n', color: 'w' }
  b[7][7] = { type: 'r', color: 'w' }

  return b
}

export default function Xadrez() {
  const { addReward } = useGame()

  const [board, setBoard] = useState<BoardState>(createInitialBoard)
  const [turn, setTurn] = useState<PieceColor>('w')
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null)
  const [lastMove, setLastMove] = useState<Move | null>(null)
  const [enPassantTarget, setEnPassantTarget] = useState<[number, number] | null>(null)
  const [history, setHistory] = useState<
    { board: BoardState; turn: PieceColor; enPassant: [number, number] | null }[]
  >([])
  const [capturedByWhite, setCapturedByWhite] = useState<Piece[]>([])
  const [capturedByBlack, setCapturedByBlack] = useState<Piece[]>([])
  const [mode, setMode] = useState<'pve' | 'pvp'>('pve')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [gameResult, setGameResult] = useState<'checkmate' | 'stalemate' | null>(null)
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
    (type: 'move' | 'capture' | 'check' | 'win') => {
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
          osc.frequency.setValueAtTime(320, now)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        } else if (type === 'capture') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(240, now)
          osc.frequency.setValueAtTime(480, now + 0.04)
          gain.gain.setValueAtTime(0.12, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
          osc.start(now)
          osc.stop(now + 0.14)
        } else if (type === 'check') {
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(587, now)
          gain.gain.setValueAtTime(0.1, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
          osc.start(now)
          osc.stop(now + 0.18)
        } else if (type === 'win') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.setValueAtTime(554, now + 0.1)
          osc.frequency.setValueAtTime(659, now + 0.2)
          osc.frequency.setValueAtTime(880, now + 0.3)
          gain.gain.setValueAtTime(0.15, now)
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

  // Localiza o Rei
  const findKing = (b: BoardState, color: PieceColor): [number, number] | null => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c]
        if (p && p.type === 'k' && p.color === color) {
          return [r, c]
        }
      }
    }
    return null
  }

  // Verifica se uma casa está sob ataque
  const isSquareAttacked = (
    b: BoardState,
    targetRow: number,
    targetCol: number,
    attackerColor: PieceColor,
  ): boolean => {
    // 1. Ataque de peão
    const pawnRowOffset = attackerColor === 'w' ? 1 : -1
    const pR = targetRow + pawnRowOffset
    if (pR >= 0 && pR < 8) {
      if (targetCol - 1 >= 0) {
        const p = b[pR][targetCol - 1]
        if (p && p.color === attackerColor && p.type === 'p') return true
      }
      if (targetCol + 1 < 8) {
        const p = b[pR][targetCol + 1]
        if (p && p.color === attackerColor && p.type === 'p') return true
      }
    }

    // 2. Ataque de cavalo
    const knightOffsets = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]
    for (const [dr, dc] of knightOffsets) {
      const nr = targetRow + dr
      const nc = targetCol + dc
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = b[nr][nc]
        if (p && p.color === attackerColor && p.type === 'n') return true
      }
    }

    // 3. Ataque de rei (adjacente)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = targetRow + dr
        const nc = targetCol + dc
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = b[nr][nc]
          if (p && p.color === attackerColor && p.type === 'k') return true
        }
      }
    }

    // 4. Linhas retas (torre e rainha)
    const straightDirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]
    for (const [dr, dc] of straightDirs) {
      let step = 1
      while (true) {
        const nr = targetRow + dr * step
        const nc = targetCol + dc * step
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break
        const p = b[nr][nc]
        if (p) {
          if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) return true
          break
        }
        step++
      }
    }

    // 5. Diagonais (bispo e rainha)
    const diagDirs = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]
    for (const [dr, dc] of diagDirs) {
      let step = 1
      while (true) {
        const nr = targetRow + dr * step
        const nc = targetCol + dc * step
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break
        const p = b[nr][nc]
        if (p) {
          if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) return true
          break
        }
        step++
      }
    }

    return false
  }

  // Verifica se o Rei de uma cor está em xeque
  const isKingInCheck = (b: BoardState, color: PieceColor): boolean => {
    const kPos = findKing(b, color)
    if (!kPos) return false
    const opponent = color === 'w' ? 'b' : 'w'
    return isSquareAttacked(b, kPos[0], kPos[1], opponent)
  }

  // Gera movimentos pseudo-legais de uma peça
  const getPseudoLegalMoves = (
    b: BoardState,
    row: number,
    col: number,
    epTarget: [number, number] | null,
  ): Move[] => {
    const piece = b[row][col]
    if (!piece) return []
    const moves: Move[] = []
    const opponent = piece.color === 'w' ? 'b' : 'w'

    if (piece.type === 'p') {
      const dir = piece.color === 'w' ? -1 : 1
      const startRow = piece.color === 'w' ? 6 : 1
      const promoRow = piece.color === 'w' ? 0 : 7

      // Passo simples
      const f1 = row + dir
      if (f1 >= 0 && f1 < 8 && !b[f1][col]) {
        if (f1 === promoRow) {
          moves.push({ fromRow: row, fromCol: col, toRow: f1, toCol: col, piece, promotion: 'q' })
        } else {
          moves.push({ fromRow: row, fromCol: col, toRow: f1, toCol: col, piece })
        }

        // Passo duplo inicial
        const f2 = row + dir * 2
        if (row === startRow && !b[f2][col]) {
          moves.push({ fromRow: row, fromCol: col, toRow: f2, toCol: col, piece })
        }
      }

      // Capturas diagonais
      for (const dc of [-1, 1]) {
        const tc = col + dc
        if (tc >= 0 && tc < 8 && f1 >= 0 && f1 < 8) {
          const target = b[f1][tc]
          if (target && target.color === opponent) {
            if (f1 === promoRow) {
              moves.push({
                fromRow: row,
                fromCol: col,
                toRow: f1,
                toCol: tc,
                piece,
                captured: target,
                promotion: 'q',
              })
            } else {
              moves.push({
                fromRow: row,
                fromCol: col,
                toRow: f1,
                toCol: tc,
                piece,
                captured: target,
              })
            }
          } else if (epTarget && epTarget[0] === f1 && epTarget[1] === tc) {
            // En Passant
            const epPawn = b[row][tc]
            moves.push({
              fromRow: row,
              fromCol: col,
              toRow: f1,
              toCol: tc,
              piece,
              captured: epPawn,
              isEnPassant: true,
            })
          }
        }
      }
    } else if (piece.type === 'n') {
      const offsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ]
      for (const [dr, dc] of offsets) {
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const t = b[nr][nc]
          if (!t || t.color === opponent) {
            moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, piece, captured: t })
          }
        }
      }
    } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
      const dirs: [number, number][] = []
      if (piece.type === 'b' || piece.type === 'q') {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1])
      }
      if (piece.type === 'r' || piece.type === 'q') {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1])
      }

      for (const [dr, dc] of dirs) {
        let step = 1
        while (true) {
          const nr = row + dr * step
          const nc = col + dc * step
          if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break
          const t = b[nr][nc]
          if (!t) {
            moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, piece })
          } else {
            if (t.color === opponent) {
              moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, piece, captured: t })
            }
            break
          }
          step++
        }
      }
    } else if (piece.type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = row + dr
          const nc = col + dc
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const t = b[nr][nc]
            if (!t || t.color === opponent) {
              moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, piece, captured: t })
            }
          }
        }
      }

      // Roque
      if (!piece.hasMoved && !isSquareAttacked(b, row, col, opponent)) {
        // Roque Menor (kingside: col 4 -> 6, torre em 7)
        const rookK = b[row][7]
        if (rookK && rookK.type === 'r' && !rookK.hasMoved && !b[row][5] && !b[row][6]) {
          if (!isSquareAttacked(b, row, 5, opponent) && !isSquareAttacked(b, row, 6, opponent)) {
            moves.push({
              fromRow: row,
              fromCol: col,
              toRow: row,
              toCol: 6,
              piece,
              isCastling: 'kingside',
            })
          }
        }
        // Roque Maior (queenside: col 4 -> 2, torre em 0)
        const rookQ = b[row][0]
        if (
          rookQ &&
          rookQ.type === 'r' &&
          !rookQ.hasMoved &&
          !b[row][1] &&
          !b[row][2] &&
          !b[row][3]
        ) {
          if (!isSquareAttacked(b, row, 3, opponent) && !isSquareAttacked(b, row, 2, opponent)) {
            moves.push({
              fromRow: row,
              fromCol: col,
              toRow: row,
              toCol: 2,
              piece,
              isCastling: 'queenside',
            })
          }
        }
      }
    }

    return moves
  }

  // Aplica movimento em cópia de tabuleiro
  const applyMoveToBoard = (b: BoardState, m: Move): BoardState => {
    const next: BoardState = b.map((r) => r.map((c) => (c ? { ...c } : null)))
    const p = { ...m.piece, hasMoved: true }

    if (m.promotion) {
      p.type = m.promotion
    }

    next[m.fromRow][m.fromCol] = null
    next[m.toRow][m.toCol] = p

    if (m.isEnPassant) {
      next[m.fromRow][m.toCol] = null
    }

    if (m.isCastling === 'kingside') {
      const rook = next[m.fromRow][7]
      next[m.fromRow][7] = null
      next[m.fromRow][5] = rook ? { ...rook, hasMoved: true } : null
    } else if (m.isCastling === 'queenside') {
      const rook = next[m.fromRow][0]
      next[m.fromRow][0] = null
      next[m.fromRow][3] = rook ? { ...rook, hasMoved: true } : null
    }

    return next
  }

  // Filtra apenas movimentos estritamente legais (que não deixam o próprio Rei em xeque)
  const getLegalMovesForPiece = (
    b: BoardState,
    row: number,
    col: number,
    epTarget: [number, number] | null,
  ): Move[] => {
    const pseudo = getPseudoLegalMoves(b, row, col, epTarget)
    const piece = b[row][col]
    if (!piece) return []

    return pseudo.filter((m) => {
      const next = applyMoveToBoard(b, m)
      return !isKingInCheck(next, piece.color)
    })
  }

  // Todos os movimentos legais para a cor do turno
  const getAllLegalMoves = (
    b: BoardState,
    color: PieceColor,
    epTarget: [number, number] | null,
  ): Move[] => {
    const list: Move[] = []
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.color === color) {
          list.push(...getLegalMovesForPiece(b, r, c, epTarget))
        }
      }
    }
    return list
  }

  // Movimentos possíveis da peça selecionada
  const legalMovesForSelected = useMemo(() => {
    if (!selectedPos) return []
    return getLegalMovesForPiece(board, selectedPos[0], selectedPos[1], enPassantTarget)
  }, [board, selectedPos, enPassantTarget])

  // Avaliação heurística do tabuleiro para a IA (material + posicionamento simples)
  const evaluateBoard = (b: BoardState): number => {
    let score = 0
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c]
        if (p) {
          let val = PIECE_VALUES[p.type]
          // Bônus posicional de centro
          if ((r === 3 || r === 4) && (c === 3 || c === 4)) val += 25
          if (p.color === 'b') {
            score += val
          } else {
            score -= val
          }
        }
      }
    }
    return score
  }

  // Minimax simples (profundidade 2-3) para IA
  const minimaxChess = (
    b: BoardState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    epTarget: [number, number] | null,
  ): { score: number; move?: Move } => {
    if (depth === 0) {
      return { score: evaluateBoard(b) }
    }

    const currentTurn: PieceColor = isMaximizing ? 'b' : 'w'
    const legalMoves = getAllLegalMoves(b, currentTurn, epTarget)

    if (legalMoves.length === 0) {
      if (isKingInCheck(b, currentTurn)) {
        return { score: isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth) }
      }
      return { score: 0 } // afogamento
    }

    if (isMaximizing) {
      let maxEval = -Infinity
      let bestMove = legalMoves[0]
      for (const m of legalMoves) {
        const next = applyMoveToBoard(b, m)
        const nextEp: [number, number] | null =
          m.piece.type === 'p' && Math.abs(m.toRow - m.fromRow) === 2
            ? [(m.fromRow + m.toRow) / 2, m.fromCol]
            : null

        const ev = minimaxChess(next, depth - 1, alpha, beta, false, nextEp).score
        if (ev > maxEval) {
          maxEval = ev
          bestMove = m
        }
        alpha = Math.max(alpha, ev)
        if (beta <= alpha) break
      }
      return { score: maxEval, move: bestMove }
    } else {
      let minEval = Infinity
      let bestMove = legalMoves[0]
      for (const m of legalMoves) {
        const next = applyMoveToBoard(b, m)
        const nextEp: [number, number] | null =
          m.piece.type === 'p' && Math.abs(m.toRow - m.fromRow) === 2
            ? [(m.fromRow + m.toRow) / 2, m.fromCol]
            : null

        const ev = minimaxChess(next, depth - 1, alpha, beta, true, nextEp).score
        if (ev < minEval) {
          minEval = ev
          bestMove = m
        }
        beta = Math.min(beta, ev)
        if (beta <= alpha) break
      }
      return { score: minEval, move: bestMove }
    }
  }

  // Execução de jogada
  const executeMove = (m: Move) => {
    // Guarda histórico
    setHistory((prev) => [
      ...prev,
      {
        board: board.map((r) => r.map((c) => (c ? { ...c } : null))),
        turn,
        enPassant: enPassantTarget,
      },
    ])

    if (m.captured) {
      playSound('capture')
      if (m.captured.color === 'w') {
        setCapturedByBlack((prev) => [...prev, m.captured!])
      } else {
        setCapturedByWhite((prev) => [...prev, m.captured!])
      }
    } else {
      playSound('move')
    }

    const nextBoard = applyMoveToBoard(board, m)
    const nextTurn: PieceColor = turn === 'w' ? 'b' : 'w'

    // Atualiza En Passant
    let nextEp: [number, number] | null = null
    if (m.piece.type === 'p' && Math.abs(m.toRow - m.fromRow) === 2) {
      nextEp = [(m.fromRow + m.toRow) / 2, m.fromCol]
    }

    setBoard(nextBoard)
    setTurn(nextTurn)
    setLastMove(m)
    setSelectedPos(null)
    setEnPassantTarget(nextEp)

    // Checagem de Fim de Jogo (Xeque-mate ou afogamento)
    const nextLegalMoves = getAllLegalMoves(nextBoard, nextTurn, nextEp)
    const inCheck = isKingInCheck(nextBoard, nextTurn)

    if (nextLegalMoves.length === 0) {
      if (inCheck) {
        setGameResult('checkmate')
        playSound('win')
      } else {
        setGameResult('stalemate')
      }
    } else if (inCheck) {
      playSound('check')
      toast({
        title: '⚠️ XEQUE!',
        description: `O Rei ${nextTurn === 'w' ? 'Branco' : 'Preto'} está sob ataque direto!`,
        className: 'bg-amber-100 border-amber-400 text-amber-950 font-black',
      })
    }
  }

  // IA jogando (Pretas)
  useEffect(() => {
    if (mode === 'pve' && turn === 'b' && !gameResult) {
      setIsAiThinking(true)
      const timer = setTimeout(() => {
        const result = minimaxChess(board, 2, -Infinity, Infinity, true, enPassantTarget)
        if (result.move) {
          executeMove(result.move)
        }
        setIsAiThinking(false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [turn, mode, board, gameResult, enPassantTarget])

  // Recompensas ao vencer
  useEffect(() => {
    if (gameResult === 'checkmate' && turn === 'b' && !rewardClaimedRef.current) {
      rewardClaimedRef.current = true
      addReward(300, 400, 'Vitória no Xadrez! 🏆')
      toast({
        title: 'XEQUE-MATE! VITÓRIA DO JOGADOR! 🏆',
        description: 'Você venceu a partida de Xadrez e ganhou +400 Moedas e +300 XP!',
        className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
      })
    }
  }, [gameResult, turn, addReward])

  const handleSquareClick = (r: number, c: number) => {
    if (gameResult || (mode === 'pve' && turn === 'b')) return

    const clickedPiece = board[r][c]

    if (selectedPos) {
      const [selR, selC] = selectedPos
      // Se clicou na mesma casa, desseleciona
      if (selR === r && selC === c) {
        setSelectedPos(null)
        return
      }

      // Se é um movimento legal da peça selecionada
      const matchingMove = legalMovesForSelected.find((m) => m.toRow === r && m.toCol === c)
      if (matchingMove) {
        executeMove(matchingMove)
        return
      }

      // Se clicou em outra peça da mesma cor, troca a seleção
      if (clickedPiece && clickedPiece.color === turn) {
        setSelectedPos([r, c])
        return
      }

      setSelectedPos(null)
    } else {
      // Seleciona a peça se for da cor do turno
      if (clickedPiece && clickedPiece.color === turn) {
        setSelectedPos([r, c])
      }
    }
  }

  const handleUndo = () => {
    if (history.length === 0 || gameResult) return
    const last = history[history.length - 1]
    setBoard(last.board)
    setTurn(last.turn)
    setEnPassantTarget(last.enPassant)
    setHistory((prev) => prev.slice(0, -1))
    setSelectedPos(null)
    setLastMove(null)
    playSound('move')
  }

  const resetGame = () => {
    setBoard(createInitialBoard())
    setTurn('w')
    setSelectedPos(null)
    setLastMove(null)
    setEnPassantTarget(null)
    setHistory([])
    setCapturedByWhite([])
    setCapturedByBlack([])
    setGameResult(null)
    rewardClaimedRef.current = false
    playSound('move')
  }

  const inCheckCurrent = isKingInCheck(board, turn)

  return (
    <AuthGate>
      <div className="space-y-4 pb-12 animate-fade-in select-none w-full max-w-3xl mx-auto px-2 sm:px-4">
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
                <span>♟️</span> Xadrez Real
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Movimentos Completos, Roque, En Passant e IA Minimax
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
                <Bot className="w-4 h-4" /> Jogar Contra IA
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

            {/* Indicador de Turno */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-100/80 border border-amber-300">
              <span className="text-xl leading-none">{turn === 'w' ? '♔' : '♚'}</span>
              <span className="text-xs font-black text-[#3E2723]">
                {turn === 'w' ? 'Vez das Brancas' : 'Vez das Pretas'}
                {mode === 'pve' && turn === 'b' && isAiThinking && ' (Pensando...)'}
              </span>
              {inCheckCurrent && (
                <span className="text-[10px] font-black uppercase bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                  Xeque!
                </span>
              )}
            </div>
          </div>

          {/* Peças Capturadas */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
            <div className="flex items-center gap-1.5 overflow-x-auto min-h-[28px]">
              <span className="text-[10px] font-black text-[#795548] uppercase shrink-0">
                Pretas Capturadas:
              </span>
              <div className="flex gap-0.5 text-base sm:text-lg">
                {capturedByWhite.map((p, i) => (
                  <span key={i} className="text-stone-900">
                    {UNICODE_PIECES[p.color][p.type]}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto min-h-[28px] justify-end">
              <span className="text-[10px] font-black text-[#795548] uppercase shrink-0">
                Brancas Capturadas:
              </span>
              <div className="flex gap-0.5 text-base sm:text-lg">
                {capturedByBlack.map((p, i) => (
                  <span key={i} className="text-stone-600">
                    {UNICODE_PIECES[p.color][p.type]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabuleiro 8x8 de Alto Contraste com Unicode Grande */}
        <div className="relative bg-gradient-to-br from-[#4E342E] to-[#2E1C14] border-4 border-[#3E2723]/40 rounded-3xl p-3 sm:p-5 shadow-2xl max-w-lg mx-auto aspect-square flex flex-col justify-center">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-2xl overflow-hidden border-2 border-stone-800 shadow-inner">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0
                const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c
                const isLegalTarget = legalMovesForSelected.some(
                  (m) => m.toRow === r && m.toCol === c,
                )
                const isLastMoveSquare =
                  lastMove &&
                  ((lastMove.fromRow === r && lastMove.fromCol === c) ||
                    (lastMove.toRow === r && lastMove.toCol === c))

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative w-full h-full flex items-center justify-center select-none transition-all duration-150 touch-manipulation cursor-pointer ${
                      isLight ? 'bg-[#EEEED2]' : 'bg-[#769656]'
                    } ${
                      isSelected
                        ? 'ring-4 ring-amber-400 ring-inset bg-amber-200/90'
                        : isLastMoveSquare
                          ? 'bg-yellow-200/60'
                          : ''
                    }`}
                  >
                    {/* Marcador de casa com movimento legal */}
                    {isLegalTarget && (
                      <div
                        className={`absolute rounded-full z-10 ${
                          piece
                            ? 'w-full h-full border-4 border-amber-500 bg-amber-400/30'
                            : 'w-4 h-4 bg-emerald-600/70 shadow-xs'
                        }`}
                      />
                    )}

                    {/* Peça Unicode Grande e Legível */}
                    {piece && (
                      <span
                        className={`text-3xl sm:text-5xl font-normal leading-none filter drop-shadow-sm transition-transform active:scale-95 ${
                          piece.color === 'w'
                            ? 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)]'
                            : 'text-stone-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'
                        }`}
                      >
                        {UNICODE_PIECES[piece.color][piece.type]}
                      </span>
                    )}

                    {/* Coordenadas nos cantos (Notação de Xadrez) */}
                    {c === 0 && (
                      <span className="absolute top-0.5 left-1 text-[8px] font-black opacity-50 text-stone-700">
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span className="absolute bottom-0.5 right-1 text-[8px] font-black opacity-50 text-stone-700">
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}
                  </button>
                )
              }),
            )}
          </div>
        </div>

        {/* Modal / Banner de Fim de Jogo */}
        {gameResult && (
          <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl p-5 text-center shadow-xl space-y-3 animate-scale-in">
            <h2 className="text-2xl font-black text-[#3E2723]">
              {gameResult === 'checkmate'
                ? `Xeque-Mate! Vitória das ${turn === 'b' ? 'Brancas' : 'Pretas'}! 🎉`
                : 'Partida Empatada por Afogamento (Stalemate)! 🤝'}
            </h2>
            <p className="text-xs text-[#795548] font-bold">
              {gameResult === 'checkmate'
                ? 'Uma demonstração impecável de estratégia e domínio das 64 casas!'
                : 'O jogador da vez não possui lances legais e não está em xeque.'}
            </p>
            <div className="flex gap-2 justify-center pt-1">
              <Button
                onClick={resetGame}
                className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-3 px-6 rounded-2xl"
              >
                Jogar Novamente
              </Button>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-2 max-w-lg mx-auto">
          <Button
            onClick={handleUndo}
            disabled={history.length === 0 || !!gameResult}
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

        {/* Instruções */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-3.5 text-xs text-[#795548] font-bold space-y-1">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Regras Oficiais do Xadrez:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1 leading-relaxed">
            <li>
              Toque em uma peça para ver todos os seus movimentos legais destacados em
              verde/dourado.
            </li>
            <li>Suporta Roque Maior/Menor, captura En Passant e promoção automática a Dama.</li>
            <li>Vitórias rendem +400 moedas e +300 XP para o seu perfil RPG!</li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
