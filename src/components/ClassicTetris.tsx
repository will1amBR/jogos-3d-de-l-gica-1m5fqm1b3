import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  RotateCcw,
  Play,
  Pause,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  RotateCw,
  Trophy,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

// Standard Tetris Matrix 10 columns x 20 rows
const COLS = 10
const ROWS = 20

// Standard 7 Tetrominoes
const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#00BCD4', // Cyan
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#3F51B5', // Blue
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#FF9800', // Orange
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#FFD54F', // Yellow
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#4CAF50', // Green
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#9C27B0', // Purple
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#F44336', // Red
  },
}

type PieceKey = keyof typeof TETROMINOES
const PIECE_KEYS: PieceKey[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

interface ClassicTetrisProps {
  onReward: (xp: number, coins: number, reason: string) => void
  onQuestProgress: (type: 'tetris_layers', count: number) => void
}

export function ClassicTetris({ onReward, onQuestProgress }: ClassicTetrisProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle')
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [combo, setCombo] = useState(0)

  // 10x20 grid storing hex colors or null
  const gridRef = useRef<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null)),
  )

  // Active falling piece
  const currentPieceRef = useRef<{
    type: PieceKey
    matrix: number[][]
    color: string
    x: number
    y: number
  } | null>(null)

  // Next piece preview
  const nextPieceRef = useRef<PieceKey>('T')

  const lastDropTimeRef = useRef<number>(Date.now())
  const animFrameRef = useRef<number | null>(null)

  // Collision detection
  const checkCollision = useCallback(
    (matrix: number[][], offset: { x: number; y: number }, grid: (string | null)[][]): boolean => {
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c] !== 0) {
            const gx = offset.x + c
            const gy = offset.y + r

            // Floor & wall bounds
            if (gx < 0 || gx >= COLS || gy >= ROWS) {
              return true
            }

            // Occupied cell on grid (ignore if above board ceiling)
            if (gy >= 0 && grid[gy][gx] !== null) {
              return true
            }
          }
        }
      }
      return false
    },
    [],
  )

  // Rotate a matrix 90 degrees clockwise
  const rotateMatrix = (matrix: number[][]): number[][] => {
    const N = matrix.length
    const result = Array.from({ length: N }, () => Array.from({ length: N }, () => 0))
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        result[c][N - 1 - r] = matrix[r][c]
      }
    }
    return result
  }

  // Get random piece
  const getRandomPieceKey = (): PieceKey => {
    return PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
  }

  // Spawn new piece
  const spawnPiece = useCallback((): boolean => {
    const key = nextPieceRef.current || getRandomPieceKey()
    nextPieceRef.current = getRandomPieceKey()

    const config = TETROMINOES[key]
    const initialX = Math.floor((COLS - config.shape[0].length) / 2)
    const initialY = key === 'I' ? -1 : 0

    if (checkCollision(config.shape, { x: initialX, y: initialY }, gridRef.current)) {
      return false // Game over
    }

    currentPieceRef.current = {
      type: key,
      matrix: config.shape,
      color: config.color,
      x: initialX,
      y: initialY,
    }
    return true
  }, [checkCollision])

  // Lock piece and clear completed lines
  const lockPiece = useCallback(() => {
    const piece = currentPieceRef.current
    if (!piece) return

    const grid = gridRef.current
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] !== 0) {
          const gx = piece.x + c
          const gy = piece.y + r
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            grid[gy][gx] = piece.color
          }
        }
      }
    }

    // Check full rows
    let cleared = 0
    for (let r = ROWS - 1; r >= 0; r--) {
      const isFull = grid[r].every((cell) => cell !== null)
      if (isFull) {
        cleared++
        // Pull all lines down
        for (let ny = r; ny > 0; ny--) {
          grid[ny] = [...grid[ny - 1]]
        }
        grid[0] = Array.from({ length: COLS }, () => null)
        r++ // Recheck the shifted row
      }
    }

    if (cleared > 0) {
      setCombo((prev) => prev + 1)
      const lineMultiplier = [0, 100, 300, 500, 800][Math.min(cleared, 4)]
      const points = lineMultiplier * level
      const xpGained = cleared * 40
      const coinsGained = cleared * 35

      setScore((s) => s + points)
      setLines((l) => {
        const nextLines = l + cleared
        setLevel(Math.floor(nextLines / 10) + 1)
        return nextLines
      })

      onReward(xpGained, coinsGained, `Tetris Clássico: ${cleared} linha(s) eliminada(s)!`)
      onQuestProgress('tetris_layers', cleared)

      toast({
        title: `⚡ ${cleared} Linha(s) Eliminada(s)!`,
        description: `+${points} pts | +${coinsGained} Moedas | +${xpGained} XP`,
        className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
      })
    } else {
      setCombo(0)
    }

    // Spawn next piece
    const spawned = spawnPiece()
    if (!spawned) {
      setGameState('gameover')
      toast({
        title: 'Fim de Jogo! 🧱',
        description: 'Os blocos atingiram o topo da matriz.',
        variant: 'destructive',
      })
    }
  }, [level, onReward, onQuestProgress, spawnPiece])

  // Move active piece horizontally
  const moveHorizontally = (dx: number) => {
    if (gameState !== 'playing' || !currentPieceRef.current) return
    const nextOffset = {
      x: currentPieceRef.current.x + dx,
      y: currentPieceRef.current.y,
    }
    if (!checkCollision(currentPieceRef.current.matrix, nextOffset, gridRef.current)) {
      currentPieceRef.current.x = nextOffset.x
    }
  }

  // Soft drop 1 step
  const dropStep = useCallback(() => {
    if (gameState !== 'playing' || !currentPieceRef.current) return
    const nextOffset = {
      x: currentPieceRef.current.x,
      y: currentPieceRef.current.y + 1,
    }
    if (!checkCollision(currentPieceRef.current.matrix, nextOffset, gridRef.current)) {
      currentPieceRef.current.y = nextOffset.y
    } else {
      lockPiece()
    }
  }, [gameState, checkCollision, lockPiece])

  // Hard drop instantly to the bottom
  const hardDrop = () => {
    if (gameState !== 'playing' || !currentPieceRef.current) return
    let currentY = currentPieceRef.current.y
    while (
      !checkCollision(
        currentPieceRef.current.matrix,
        { x: currentPieceRef.current.x, y: currentY + 1 },
        gridRef.current,
      )
    ) {
      currentY++
    }
    currentPieceRef.current.y = currentY
    lockPiece()
  }

  // Rotate piece clockwise with wall kick check
  const rotate = () => {
    if (gameState !== 'playing' || !currentPieceRef.current) return
    const rotated = rotateMatrix(currentPieceRef.current.matrix)
    const pos = { x: currentPieceRef.current.x, y: currentPieceRef.current.y }

    // Standard attempt
    if (!checkCollision(rotated, pos, gridRef.current)) {
      currentPieceRef.current.matrix = rotated
      return
    }

    // Wall kick left
    if (!checkCollision(rotated, { x: pos.x - 1, y: pos.y }, gridRef.current)) {
      currentPieceRef.current.x -= 1
      currentPieceRef.current.matrix = rotated
      return
    }

    // Wall kick right
    if (!checkCollision(rotated, { x: pos.x + 1, y: pos.y }, gridRef.current)) {
      currentPieceRef.current.x += 1
      currentPieceRef.current.matrix = rotated
      return
    }
  }

  // Start new game
  const startGame = () => {
    gridRef.current = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
    setScore(0)
    setLines(0)
    setLevel(1)
    setCombo(0)
    nextPieceRef.current = getRandomPieceKey()
    spawnPiece()
    setGameState('playing')
    lastDropTimeRef.current = Date.now()
  }

  // Toggle pause
  const togglePause = () => {
    if (gameState === 'playing') setGameState('paused')
    else if (gameState === 'paused') setGameState('playing')
  }

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          moveHorizontally(-1)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          moveHorizontally(1)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          dropStep()
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          rotate()
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'p':
        case 'P':
          e.preventDefault()
          togglePause()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, dropStep])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const now = Date.now()
      // Speed scales up with level: starts at 900ms, decreases by 70ms per level (min 150ms)
      const fallSpeed = Math.max(150, 900 - (level - 1) * 75)

      if (gameState === 'playing' && now - lastDropTimeRef.current > fallSpeed) {
        lastDropTimeRef.current = now
        dropStep()
      }

      const w = canvas.width
      const h = canvas.height
      const cellSize = Math.floor(h / ROWS)
      const boardWidth = cellSize * COLS
      const offsetX = Math.floor((w - boardWidth) / 2)

      ctx.clearRect(0, 0, w, h)

      // Background
      ctx.fillStyle = '#111827' // Dark navy
      ctx.fillRect(0, 0, w, h)

      // Grid background
      ctx.fillStyle = '#1F2937'
      ctx.fillRect(offsetX, 0, boardWidth, h)

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
      ctx.lineWidth = 1
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath()
        ctx.moveTo(offsetX + c * cellSize, 0)
        ctx.lineTo(offsetX + c * cellSize, h)
        ctx.stroke()
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath()
        ctx.moveTo(offsetX, r * cellSize)
        ctx.lineTo(offsetX + boardWidth, r * cellSize)
        ctx.stroke()
      }

      // Draw ghost / shadow piece of active block
      if (gameState === 'playing' && currentPieceRef.current) {
        const piece = currentPieceRef.current
        let ghostY = piece.y
        while (!checkCollision(piece.matrix, { x: piece.x, y: ghostY + 1 }, gridRef.current)) {
          ghostY++
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
        for (let r = 0; r < piece.matrix.length; r++) {
          for (let c = 0; c < piece.matrix[r].length; c++) {
            if (piece.matrix[r][c] !== 0) {
              const gx = piece.x + c
              const gy = ghostY + r
              if (gy >= 0 && gy < ROWS) {
                ctx.fillRect(
                  offsetX + gx * cellSize + 1,
                  gy * cellSize + 1,
                  cellSize - 2,
                  cellSize - 2,
                )
              }
            }
          }
        }
      }

      // Draw placed blocks
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const color = gridRef.current[r][c]
          if (color) {
            drawBlock(ctx, offsetX + c * cellSize, r * cellSize, cellSize, color)
          }
        }
      }

      // Draw active piece
      if (currentPieceRef.current) {
        const piece = currentPieceRef.current
        for (let r = 0; r < piece.matrix.length; r++) {
          for (let c = 0; c < piece.matrix[r].length; c++) {
            if (piece.matrix[r][c] !== 0) {
              const gx = piece.x + c
              const gy = piece.y + r
              if (gy >= 0 && gy < ROWS) {
                drawBlock(ctx, offsetX + gx * cellSize, gy * cellSize, cellSize, piece.color)
              }
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [gameState, level, dropStep, checkCollision])

  // Draw 2D Beveled Block
  const drawBlock = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
  ) => {
    ctx.fillStyle = color
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2)

    // Bevel highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.beginPath()
    ctx.moveTo(x + 1, y + 1)
    ctx.lineTo(x + size - 1, y + 1)
    ctx.lineTo(x + size - 4, y + 4)
    ctx.lineTo(x + 4, y + 4)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.beginPath()
    ctx.moveTo(x + 1, y + size - 1)
    ctx.lineTo(x + size - 1, y + size - 1)
    ctx.lineTo(x + size - 4, y + size - 4)
    ctx.lineTo(x + 4, y + size - 4)
    ctx.closePath()
    ctx.fill()
  }

  const nextPieceCfg = TETROMINOES[nextPieceRef.current]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 p-3 rounded-2xl shadow-sm text-center">
          <div className="text-[10px] font-black uppercase text-[#795548]">Pontuação</div>
          <div className="text-xl sm:text-2xl font-black text-[#5E35B1] tabular-nums">{score}</div>
        </div>

        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 p-3 rounded-2xl shadow-sm text-center">
          <div className="text-[10px] font-black uppercase text-[#795548]">Linhas</div>
          <div className="text-xl sm:text-2xl font-black text-[#2E7D32] tabular-nums">{lines}</div>
        </div>

        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 p-3 rounded-2xl shadow-sm text-center">
          <div className="text-[10px] font-black uppercase text-[#795548]">Nível</div>
          <div className="text-xl sm:text-2xl font-black text-[#FF9800] tabular-nums">{level}</div>
        </div>

        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 p-3 rounded-2xl shadow-sm flex items-center justify-around">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase text-[#795548]">Próxima</div>
            <div className="text-xs font-black text-[#3E2723]">{nextPieceRef.current}</div>
          </div>
          {/* Mini preview */}
          <div className="w-9 h-9 bg-stone-900 rounded-lg flex items-center justify-center p-1 border border-stone-700">
            <div
              className="w-3.5 h-3.5 rounded-xs"
              style={{ backgroundColor: nextPieceCfg?.color || '#00BCD4' }}
            />
          </div>
        </div>
      </div>

      {/* Main Game Canvas & Overlay Area */}
      <div className="relative rounded-3xl overflow-hidden border-4 border-[#3E2723]/15 shadow-2xl bg-[#111827] mx-auto max-w-md">
        <canvas
          ref={canvasRef}
          width={360}
          height={520}
          className="w-full h-[440px] sm:h-[500px] block"
        />

        {/* Idle Overlay */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[#8BC34A] flex items-center justify-center text-3xl mb-3 shadow-lg text-white">
              🧱
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Tetris Tradicional 2D
            </h2>
            <p className="text-xs sm:text-sm text-gray-200 max-w-xs mb-6 font-bold">
              Grid clássico 10x20, 7 peças originais e controles otimizados para toque no celular e
              teclado!
            </p>
            <Button
              onClick={startGame}
              className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-base py-6 px-8 rounded-2xl shadow-xl transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 mr-2 fill-white" /> Iniciar Partida Clássica
            </Button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <Trophy className="w-14 h-14 text-[#FFD54F] mb-2 animate-bounce" />
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">Fim de Jogo!</h2>
            <p className="text-xs sm:text-sm text-gray-200 mb-2 font-bold">
              Você completou <strong className="text-[#FFD54F]">{lines}</strong> linha(s) e somou{' '}
              <strong className="text-[#8BC34A]">{score}</strong> pontos!
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={startGame}
                className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-5 px-7 rounded-2xl shadow-xl"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Jogar Novamente
              </Button>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <Pause className="w-12 h-12 text-[#FFB74D] mb-2" />
            <h3 className="text-2xl font-black text-white mb-4">Jogo Pausado</h3>
            <Button
              onClick={togglePause}
              className="bg-[#FFB74D] hover:bg-[#FFA726] text-[#3E2723] font-black px-6 py-4 rounded-2xl"
            >
              Continuar Partida
            </Button>
          </div>
        )}
      </div>

      {/* Touch Mobile & Desktop Controls - Clean, Spaced, No Overlaps! */}
      <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-[#795548] tracking-wider">
            Controles de Toque (Celular & Teclado)
          </span>
          {(gameState === 'playing' || gameState === 'paused') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePause}
              className="h-8 text-xs font-bold text-[#795548]"
            >
              {gameState === 'paused' ? 'Continuar' : 'Pausar'}
            </Button>
          )}
        </div>
        {/* Mobile Buttons Layout: Clean 3-tier row with large hit targets */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => moveHorizontally(-1)}
            disabled={gameState !== 'playing'}
            className="rounded-2xl h-14 font-black border-[#3E2723]/20 hover:bg-amber-100 flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeftIcon className="w-5 h-5 text-[#3E2723]" />
            <span className="text-[10px] text-[#795548]">Esq (A)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={rotate}
            disabled={gameState !== 'playing'}
            className="rounded-2xl h-14 font-black border-[#5E35B1]/30 bg-purple-50 text-[#5E35B1] hover:bg-purple-100 flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <RotateCw className="w-5 h-5 text-[#5E35B1]" />
            <span className="text-[10px] font-bold">Girar (W/↑)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => moveHorizontally(1)}
            disabled={gameState !== 'playing'}
            className="rounded-2xl h-14 font-black border-[#3E2723]/20 hover:bg-amber-100 flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowRightIcon className="w-5 h-5 text-[#3E2723]" />
            <span className="text-[10px] text-[#795548]">Dir (D)</span>
          </Button>
        </div>

        {/* Drop controls */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={dropStep}
            disabled={gameState !== 'playing'}
            className="rounded-2xl h-12 font-black border-[#3E2723]/20 hover:bg-amber-100 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <ArrowDown className="w-4 h-4 text-[#3E2723]" />
            <span className="text-xs">Descer (S/↓)</span>
          </Button>

          <Button
            type="button"
            onClick={hardDrop}
            disabled={gameState !== 'playing'}
            className="bg-[#FF9800] hover:bg-[#F57C00] text-white font-black rounded-2xl h-12 shadow-sm text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <Zap className="w-4 h-4" />
            <span>Queda Rápida (Espaço)</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
