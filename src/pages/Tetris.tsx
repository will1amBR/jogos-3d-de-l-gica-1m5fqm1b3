import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  ArrowLeft,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  HelpCircle,
  RotateCw,
  ArrowDown,
  ArrowUp,
  ArrowRight as ArrowRightIcon,
  ArrowLeft as ArrowLeftIcon,
  Grid3X3,
  Box,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { ClassicTetris } from '@/components/ClassicTetris'

// Arena 4x4x8 (X: 0..3, Z: 0..3, Y: 0..7)
const ARENA_X = 4
const ARENA_Z = 4
const ARENA_Y = 8

// 3D Polycube Shapes defined as relative voxel coordinates [x, y, z]
const SHAPES = [
  // T-Block (4 voxels)
  {
    name: 'T',
    color: '#9C27B0',
    voxels: [
      [0, 0, 0],
      [-1, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
    ],
  },
  // L-Block (4 voxels)
  {
    name: 'L',
    color: '#FF9800',
    voxels: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2],
      [1, 0, 0],
    ],
  },
  // Cube Block 2x2x1 (4 voxels)
  {
    name: 'O',
    color: '#FFEB3B',
    voxels: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
      [1, 0, 1],
    ],
  },
  // Line Block (3 voxels)
  {
    name: 'I',
    color: '#00BCD4',
    voxels: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2],
    ],
  },
  // Corner 3D Block (4 voxels)
  {
    name: 'Corner',
    color: '#E91E63',
    voxels: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  },
]

type VoxelGrid = (string | null)[][][] // [y][x][z]

export default function Tetris() {
  const { addReward, addQuestProgress } = useGame()

  const [gameMode, setGameMode] = useState<'classic' | '3d'>('classic')
  const [gameState3D, setGameState3D] = useState<'idle' | 'playing' | 'gameover'>('idle')
  const [score, setScore] = useState(0)
  const [clearedLayers, setClearedLayers] = useState(0)
  const [combo, setCombo] = useState(1)

  // Arena Grid: 8 layers high, each 4x4
  const gridRef = useRef<VoxelGrid>(
    Array.from({ length: ARENA_Y }, () =>
      Array.from({ length: ARENA_X }, () => Array.from({ length: ARENA_Z }, () => null)),
    ),
  )

  // Current active piece
  const piecePosRef = useRef<{ x: number; y: number; z: number }>({ x: 1, y: ARENA_Y - 1, z: 1 })
  const pieceVoxelsRef = useRef<number[][]>(SHAPES[0].voxels)
  const pieceColorRef = useRef<string>(SHAPES[0].color)

  // Camera Orbit
  const orbitAngleRef = useRef<number>(0.6)
  const isDraggingRef = useRef<boolean>(false)
  const lastMouseXRef = useRef<number>(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastFallRef = useRef<number>(Date.now())

  // Check collision helper
  const canPlace = (
    voxels: number[][],
    pos: { x: number; y: number; z: number },
    grid: VoxelGrid,
  ): boolean => {
    for (const [vx, vy, vz] of voxels) {
      const gx = pos.x + vx
      const gy = pos.y + vy
      const gz = pos.z + vz

      // Out of bounds
      if (gx < 0 || gx >= ARENA_X || gz < 0 || gz >= ARENA_Z || gy < 0) {
        return false
      }

      // Check collision with placed voxels
      if (gy < ARENA_Y && grid[gy][gx][gz] !== null) {
        return false
      }
    }
    return true
  }

  // Spawn New Random Piece
  const spawnPiece = useCallback((): boolean => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    const initialPos = { x: 1, y: ARENA_Y - 1, z: 1 }

    if (!canPlace(shape.voxels, initialPos, gridRef.current)) {
      // Cannot spawn -> Game Over!
      return false
    }

    pieceVoxelsRef.current = shape.voxels
    pieceColorRef.current = shape.color
    piecePosRef.current = initialPos
    return true
  }, [])

  // Start game
  const startGame = () => {
    // Reset grid
    gridRef.current = Array.from({ length: ARENA_Y }, () =>
      Array.from({ length: ARENA_X }, () => Array.from({ length: ARENA_Z }, () => null)),
    )
    setScore(0)
    setClearedLayers(0)
    setCombo(1)
    setGameState3D('playing')
    spawnPiece()
    lastFallRef.current = Date.now()
  }

  // Clear Full 4x4 Layers (Y plane)
  const checkClearedLayers = useCallback(() => {
    let clearedCount = 0
    const grid = gridRef.current

    for (let y = 0; y < ARENA_Y; y++) {
      let isFull = true
      for (let x = 0; x < ARENA_X; x++) {
        for (let z = 0; z < ARENA_Z; z++) {
          if (grid[y][x][z] === null) {
            isFull = false
            break
          }
        }
        if (!isFull) break
      }

      if (isFull) {
        clearedCount++
        // Shift all layers above down by 1
        for (let ny = y; ny < ARENA_Y - 1; ny++) {
          for (let nx = 0; nx < ARENA_X; nx++) {
            for (let nz = 0; nz < ARENA_Z; nz++) {
              grid[ny][nx][nz] = grid[ny + 1][nx][nz]
            }
          }
        }
        // Empty top layer
        for (let nx = 0; nx < ARENA_X; nx++) {
          for (let nz = 0; nz < ARENA_Z; nz++) {
            grid[ARENA_Y - 1][nx][nz] = null
          }
        }
        y-- // recheck same layer index
      }
    }

    if (clearedCount > 0) {
      setCombo((c) => c + 1)
      const points = clearedCount * 400 * combo
      const xpBonus = clearedCount * 60
      const coinsBonus = clearedCount * 50

      setScore((s) => s + points)
      setClearedLayers((cl) => cl + clearedCount)

      toast({
        title: `🎉 ${clearedCount} Camada(s) 3D Limpas!`,
        description: `+${points} Pontos | +${coinsBonus} Moedas | +${xpBonus} XP (Combo x${combo})`,
        className: 'bg-purple-50 border-purple-300 text-purple-950 font-black',
      })

      addQuestProgress('tetris_layers', clearedCount)
      addReward(xpBonus, coinsBonus, `${clearedCount} Camada(s) Tetris 3D`)
    } else {
      setCombo(1)
    }
  }, [combo, addQuestProgress, addReward])

  // Lock Piece into Grid
  const lockPiece = useCallback(() => {
    const pos = piecePosRef.current
    const voxels = pieceVoxelsRef.current
    const color = pieceColorRef.current

    for (const [vx, vy, vz] of voxels) {
      const gx = pos.x + vx
      const gy = pos.y + vy
      const gz = pos.z + vz
      if (gy >= 0 && gy < ARENA_Y && gx >= 0 && gx < ARENA_X && gz >= 0 && gz < ARENA_Z) {
        gridRef.current[gy][gx][gz] = color
      }
    }

    checkClearedLayers()

    const spawned = spawnPiece()
    if (!spawned) {
      setGameState3D('gameover')
      toast({
        title: 'Fim de Jogo! 🧱',
        description: 'Os blocos atingiram o topo da arena 3D!',
        variant: 'destructive',
      })
    }
  }, [checkClearedLayers, spawnPiece])

  // Drop / Move controls
  const movePiece = (dx: number, dz: number) => {
    if (gameMode !== '3d' || gameState3D !== 'playing') return
    const nextPos = {
      x: piecePosRef.current.x + dx,
      y: piecePosRef.current.y,
      z: piecePosRef.current.z + dz,
    }
    if (canPlace(pieceVoxelsRef.current, nextPos, gridRef.current)) {
      piecePosRef.current = nextPos
    }
  }

  const dropOneStep = useCallback(() => {
    if (gameMode !== '3d' || gameState3D !== 'playing') return
    const nextPos = {
      x: piecePosRef.current.x,
      y: piecePosRef.current.y - 1,
      z: piecePosRef.current.z,
    }

    if (canPlace(pieceVoxelsRef.current, nextPos, gridRef.current)) {
      piecePosRef.current = nextPos
    } else {
      lockPiece()
    }
  }, [gameMode, gameState3D, lockPiece])

  const hardDrop = () => {
    if (gameMode !== '3d' || gameState3D !== 'playing') return
    let currentY = piecePosRef.current.y
    while (
      canPlace(
        pieceVoxelsRef.current,
        { x: piecePosRef.current.x, y: currentY - 1, z: piecePosRef.current.z },
        gridRef.current,
      )
    ) {
      currentY--
    }
    piecePosRef.current = {
      x: piecePosRef.current.x,
      y: currentY,
      z: piecePosRef.current.z,
    }
    lockPiece()
  }

  // 3-Axis Rotations: X, Y, Z
  const rotatePiece = (axis: 'x' | 'y' | 'z') => {
    if (gameMode !== '3d' || gameState3D !== 'playing') return

    const rotated = pieceVoxelsRef.current.map(([vx, vy, vz]) => {
      if (axis === 'y') {
        // Rotate in XZ plane
        return [-vz, vy, vx]
      } else if (axis === 'x') {
        // Rotate in YZ plane
        return [vx, -vz, vy]
      } else {
        // Rotate in XY plane (z)
        return [-vy, vx, vz]
      }
    })

    if (canPlace(rotated, piecePosRef.current, gridRef.current)) {
      pieceVoxelsRef.current = rotated
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameMode !== '3d' || gameState3D !== 'playing') return

      switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          movePiece(-1, 0)
          break
        case 'arrowright':
        case 'd':
          movePiece(1, 0)
          break
        case 'arrowup':
        case 'w':
          movePiece(0, -1)
          break
        case 'arrowdown':
        case 's':
          movePiece(0, 1)
          break
        case 'q':
          rotatePiece('y')
          break
        case 'e':
          rotatePiece('x')
          break
        case 'r':
          rotatePiece('z')
          break
        case ' ':
          hardDrop()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameMode, gameState3D, dropOneStep])

  // Game loop & 3D Canvas rendering
  useEffect(() => {
    if (gameMode !== '3d') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number

    const render = () => {
      const now = Date.now()
      const w = canvas.width
      const h = canvas.height

      // Gravity step
      if (gameState3D === 'playing' && now - lastFallRef.current > 1100) {
        lastFallRef.current = now
        dropOneStep()
      }

      ctx.clearRect(0, 0, w, h)

      // Futuristic Cosmic Arena background
      const bg = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400)
      bg.addColorStop(0, '#2D154B')
      bg.addColorStop(1, '#0F081D')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Orbit camera rotation
      if (!isDraggingRef.current && gameState3D === 'playing') {
        orbitAngleRef.current += 0.003
      }
      const angle = orbitAngleRef.current
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)

      const cx = w / 2
      const cy = h / 2 + 110

      // 3D Isometric / Orbit projection function
      // Voxels: X: 0..3 (center 1.5), Z: 0..3 (center 1.5), Y: 0..7
      const project = (vx: number, vy: number, vz: number) => {
        const ox = vx - 1.5
        const oz = vz - 1.5
        const rx = ox * cosA - oz * sinA
        const rz = ox * sinA + oz * cosA

        const scale = 24
        const px = cx + rx * scale
        const py = cy - vy * scale * 0.9 + rz * (scale * 0.45)
        const depth = rz
        return { px, py, depth }
      }

      // Draw Arena Base Floor
      ctx.strokeStyle = 'rgba(156, 39, 176, 0.4)'
      ctx.lineWidth = 1.5
      for (let x = 0; x <= ARENA_X; x++) {
        const p1 = project(x, 0, 0)
        const p2 = project(x, 0, ARENA_Z)
        ctx.beginPath()
        ctx.moveTo(p1.px, p1.py)
        ctx.lineTo(p2.px, p2.py)
        ctx.stroke()
      }
      for (let z = 0; z <= ARENA_Z; z++) {
        const p1 = project(0, 0, z)
        const p2 = project(ARENA_X, 0, z)
        ctx.beginPath()
        ctx.moveTo(p1.px, p1.py)
        ctx.lineTo(p2.px, p2.py)
        ctx.stroke()
      }

      // Draw 4 Corner Wireframe Pillars (Height 8)
      ctx.strokeStyle = 'rgba(255, 183, 77, 0.35)'
      ctx.setLineDash([4, 4])
      const corners = [
        [0, 0],
        [ARENA_X, 0],
        [0, ARENA_Z],
        [ARENA_X, ARENA_Z],
      ]
      corners.forEach(([cx, cz]) => {
        const b = project(cx, 0, cz)
        const t = project(cx, ARENA_Y, cz)
        ctx.beginPath()
        ctx.moveTo(b.px, b.py)
        ctx.lineTo(t.px, t.py)
        ctx.stroke()
      })
      ctx.setLineDash([])

      // Draw top bounding box
      ctx.strokeStyle = 'rgba(255, 183, 77, 0.4)'
      for (let x = 0; x <= ARENA_X; x++) {
        const p1 = project(x, ARENA_Y, 0)
        const p2 = project(x, ARENA_Y, ARENA_Z)
        ctx.beginPath()
        ctx.moveTo(p1.px, p1.py)
        ctx.lineTo(p2.px, p2.py)
        ctx.stroke()
      }
      for (let z = 0; z <= ARENA_Z; z++) {
        const p1 = project(0, ARENA_Y, z)
        const p2 = project(ARENA_X, ARENA_Y, z)
        ctx.beginPath()
        ctx.moveTo(p1.px, p1.py)
        ctx.lineTo(p2.px, p2.py)
        ctx.stroke()
      }

      // Collect all voxels to draw: locked + active piece
      interface VoxelItem {
        x: number
        y: number
        z: number
        color: string
        depth: number
      }
      const voxelsToDraw: VoxelItem[] = []

      // Placed voxels
      for (let y = 0; y < ARENA_Y; y++) {
        for (let x = 0; x < ARENA_X; x++) {
          for (let z = 0; z < ARENA_Z; z++) {
            const col = gridRef.current[y][x][z]
            if (col) {
              const p = project(x + 0.5, y + 0.5, z + 0.5)
              voxelsToDraw.push({ x, y, z, color: col, depth: p.depth })
            }
          }
        }
      }

      // Active falling piece voxels
      if (gameState3D === 'playing') {
        const pos = piecePosRef.current
        for (const [vx, vy, vz] of pieceVoxelsRef.current) {
          const gx = pos.x + vx
          const gy = pos.y + vy
          const gz = pos.z + vz
          const p = project(gx + 0.5, gy + 0.5, gz + 0.5)
          voxelsToDraw.push({
            x: gx,
            y: gy,
            z: gz,
            color: pieceColorRef.current,
            depth: p.depth,
          })
        }
      }

      // Painter's algorithm: sort by depth (back to front)
      voxelsToDraw.sort((a, b) => a.depth - b.depth)

      // Draw 3D isometric cube
      const drawCube = (x: number, y: number, z: number, color: string) => {
        const s = 12
        const p = project(x + 0.5, y + 0.5, z + 0.5)
        const px = p.px
        const py = p.py

        // Top face
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(px, py - s)
        ctx.lineTo(px + s * 1.1, py - s * 0.4)
        ctx.lineTo(px, py + s * 0.2)
        ctx.lineTo(px - s * 1.1, py - s * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#111'
        ctx.lineWidth = 1
        ctx.stroke()

        // Left face
        ctx.fillStyle = shade(color, -25)
        ctx.beginPath()
        ctx.moveTo(px - s * 1.1, py - s * 0.4)
        ctx.lineTo(px, py + s * 0.2)
        ctx.lineTo(px, py + s * 1.3)
        ctx.lineTo(px - s * 1.1, py + s * 0.7)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Right face
        ctx.fillStyle = shade(color, -40)
        ctx.beginPath()
        ctx.moveTo(px, py + s * 0.2)
        ctx.lineTo(px + s * 1.1, py - s * 0.4)
        ctx.lineTo(px + s * 1.1, py + s * 0.7)
        ctx.lineTo(px, py + s * 1.3)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }

      voxelsToDraw.forEach((v) => {
        drawCube(v.x, v.y, v.z, v.color)
      })

      animId = requestAnimationFrame(render)
    }

    render()

    // Mouse drag to orbit
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      lastMouseXRef.current = e.clientX
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - lastMouseXRef.current
      lastMouseXRef.current = e.clientX
      orbitAngleRef.current += dx * 0.015
    }
    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [gameMode, gameState3D, dropOneStep])

  return (
    <AuthGate>
      <div className="space-y-3 pb-6 animate-fade-in select-none max-w-full">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {' '}
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
                <Layers className="w-7 h-7 text-[#5E35B1]" /> Tetris • Clássico & 3D
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Jogue o clássico tradicional 2D (10x20) ou aventure-se na arena tridimensional!
              </p>
            </div>
          </div>
          {/* Mode Switcher Pill */}
          <div className="flex items-center bg-[#F5EFE6] p-1.5 rounded-2xl border border-[#3E2723]/10">
            <button
              type="button"
              onClick={() => setGameMode('classic')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                gameMode === 'classic'
                  ? 'bg-[#8BC34A] text-white shadow-sm'
                  : 'text-[#3E2723] hover:text-[#2E7D32]'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Clássico 2D
            </button>
            <button
              type="button"
              onClick={() => setGameMode('3d')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                gameMode === '3d'
                  ? 'bg-[#5E35B1] text-white shadow-sm'
                  : 'text-[#3E2723] hover:text-[#5E35B1]'
              }`}
            >
              <Box className="w-4 h-4" />
              Tetris 3D
            </button>
          </div>
        </div>

        {/* MODE 1: CLASSIC 2D (RECOMMENDED FOR MOBILE) */}
        {gameMode === 'classic' && (
          <ClassicTetris
            onReward={(xp, coins, reason) => addReward(xp, coins, reason)}
            onQuestProgress={(type, count) => addQuestProgress(type, count)}
          />
        )}

        {/* MODE 2: TETRIS 3D (POLISHED CONTROLS WITH NO OVERLAPS) */}
        {gameMode === '3d' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Bar */}
            <div className="flex items-center justify-between bg-[#FFF9F0] border-2 border-[#3E2723]/10 px-5 py-3 rounded-2xl shadow-sm">
              <div>
                <div className="text-[10px] font-black uppercase text-[#795548]">Arena 3D</div>
                <div className="text-base font-black text-[#5E35B1]">4x4x8 Cubos</div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase text-[#795548]">Pontuação</div>
                  <div className="text-lg font-black text-[#5E35B1] tabular-nums">{score}</div>
                </div>
                <div className="w-[1px] h-6 bg-[#3E2723]/10" />
                <div>
                  <div className="text-[10px] font-black uppercase text-[#795548]">Camadas</div>
                  <div className="text-lg font-black text-[#2E7D32] tabular-nums">
                    {clearedLayers}
                  </div>
                </div>
                <div className="w-[1px] h-6 bg-[#3E2723]/10" />
                <div>
                  <div className="text-[10px] font-black uppercase text-[#795548]">Combo</div>
                  <div className="text-lg font-black text-[#E65100]">x{combo}</div>
                </div>
              </div>
            </div>

            {/* 3D Canvas Area */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-[#3E2723]/10 shadow-2xl bg-gradient-to-b from-[#0F081D] via-[#1A0E30] to-[#0D061A]">
              <canvas
                ref={canvasRef}
                width={800}
                height={450}
                className="w-full h-[320px] sm:h-[420px] block cursor-grab active:cursor-grabbing touch-none"
              />

              {/* Orbit hint label with Mobile touch mention */}
              <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/50 backdrop-blur-xs rounded-xl text-white text-[11px] font-black pointer-events-none flex items-center gap-1.5 border border-white/10">
                <span>🕹️</span>
                <span>Arraste com o dedo ou mouse para orbitar em 360°</span>
              </div>
              {/* Idle Overlay */}
              {gameState3D === 'idle' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                  <Layers className="w-16 h-16 text-[#BA68C8] mb-3 animate-bounce" />
                  <h2 className="text-3xl font-black text-white mb-2">Desafio Espacial 3D</h2>
                  <p className="text-sm text-gray-200 max-w-md mb-6 font-bold">
                    Mova peças nos eixos X e Z, rotacione em 3 eixos espaciais e complete camadas
                    4x4 para ganhar moedas e XP!
                  </p>
                  <Button
                    onClick={startGame}
                    className="bg-[#5E35B1] hover:bg-[#512DA8] text-white font-black text-lg py-6 px-8 rounded-2xl shadow-xl transition-transform active:scale-95"
                  >
                    <Play className="w-6 h-6 mr-2 fill-white" /> Iniciar Tetris 3D
                  </Button>
                </div>
              )}

              {/* Game Over Overlay */}
              {gameState3D === 'gameover' && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                  <Trophy className="w-16 h-16 text-[#FFD54F] mb-3 animate-bounce" />
                  <h2 className="text-3xl font-black text-white mb-1">Partida Encerrada!</h2>
                  <p className="text-sm text-gray-200 mb-6 font-bold">
                    Você limpou {clearedLayers} camada(s) e alcançou {score} pontos!
                  </p>
                  <Button
                    onClick={startGame}
                    className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-5 px-8 rounded-2xl shadow-xl"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" /> Jogar Novamente
                  </Button>
                </div>
              )}
            </div>

            {/* On-screen controls 3D - Fixed Grid without overlapping buttons */}
            <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#795548] tracking-wider">
                  Controles da Arena 3D
                </span>
                <span className="text-xs text-[#795548] font-bold hidden sm:block">
                  Teclado: W/A/S/D para mover • Q/E para girar • Espaço para soltar
                </span>
              </div>

              {/* Directional controls row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => movePiece(-1, 0)}
                  disabled={gameState3D !== 'playing'}
                  className="rounded-2xl h-12 font-black border-[#3E2723]/20 hover:bg-amber-100 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeftIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">Esquerda (A)</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => movePiece(1, 0)}
                  disabled={gameState3D !== 'playing'}
                  className="rounded-2xl h-12 font-black border-[#3E2723]/20 hover:bg-amber-100 flex items-center justify-center gap-1.5"
                >
                  <ArrowRightIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">Direita (D)</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => movePiece(0, -1)}
                  disabled={gameState3D !== 'playing'}
                  className="rounded-2xl h-12 font-black border-[#3E2723]/20 hover:bg-amber-100 flex items-center justify-center gap-1.5"
                >
                  <ArrowUp className="w-4 h-4 shrink-0" />
                  <span className="truncate">Fundo (W)</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => movePiece(0, 1)}
                  disabled={gameState3D !== 'playing'}
                  className="rounded-2xl h-12 font-black border-[#3E2723]/20 hover:bg-amber-100 flex items-center justify-center gap-1.5"
                >
                  <ArrowDown className="w-4 h-4 shrink-0" />
                  <span className="truncate">Frente (S)</span>
                </Button>
              </div>

              {/* Rotations and drop row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => rotatePiece('y')}
                  disabled={gameState3D !== 'playing'}
                  className="rounded-2xl h-12 font-black border-[#5E35B1]/30 bg-purple-50 text-[#5E35B1] hover:bg-purple-100 flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-4 h-4 shrink-0" />
                  <span>Girar Y (Q)</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => rotatePiece('x')}
                  disabled={gameState3D !== 'playing'}
                  className="rounded-2xl h-12 font-black border-[#5E35B1]/30 bg-purple-50 text-[#5E35B1] hover:bg-purple-100 flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-4 h-4 shrink-0" />
                  <span>Girar X (E)</span>
                </Button>

                <Button
                  onClick={hardDrop}
                  disabled={gameState3D !== 'playing'}
                  className="bg-[#FF9800] hover:bg-[#F57C00] text-white font-black rounded-2xl h-12 shadow-sm text-xs flex items-center justify-center gap-1.5"
                >
                  ⚡ Soltar Peça (Espaço)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}

function shade(color: string, percent: number) {
  let num = parseInt(color.replace('#', ''), 16)
  let amt = Math.round(2.55 * percent)
  let R = (num >> 16) + amt
  let B = ((num >> 8) & 0x00ff) + amt
  let G = (num & 0x0000ff) + amt
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
      (G < 255 ? (G < 1 ? 0 : G) : 255)
    )
      .toString(16)
      .slice(1)
  )
}
