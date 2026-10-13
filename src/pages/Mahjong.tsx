import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  HelpCircle,
  Lightbulb,
  Shuffle,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

// Categorias do Mahjong Solitaire no estilo Vita Mahjong:
// Bambu (1..9), Circulos/Pontos (1..9), Caracteres Numericos (1..9), Ventos (4), Dragoes (3), Flores (4 - combinam entre si), Estacoes (4 - combinam entre si)
export type TileCategory = 'bamboo' | 'dot' | 'character' | 'wind' | 'dragon' | 'flower' | 'season'

export interface TileDef {
  id: string
  category: TileCategory
  value: number
  matchGroup: string // chave que define quais pecas casam entre si
  label: string
  subLabel: string
  color: string
}

export interface BoardSlot {
  id: string
  layer: number // 0 (base) .. 3 (topo)
  row: number
  col: number
  tile: TileDef | null
}

export type MahjongDifficulty = 'easy' | 'classic'

// Ventos com simbolos visuais limpos
const WIND_TILES: Record<number, { name: string; symbol: string }> = {
  1: { name: 'Leste', symbol: 'L' },
  2: { name: 'Sul', symbol: 'S' },
  3: { name: 'Oeste', symbol: 'O' },
  4: { name: 'Norte', symbol: 'N' },
}

// Dragoes
const DRAGON_TILES: Record<number, { name: string; symbol: string; color: string }> = {
  1: { name: 'Dragao Vermelho', symbol: 'DV', color: '#D32F2F' },
  2: { name: 'Dragao Verde', symbol: 'DV', color: '#2E7D32' },
  3: { name: 'Dragao Branco', symbol: 'DB', color: '#1976D2' },
}

// Flores (qualquer flor combina com qualquer flor, matchGroup: "flower_group")
const FLOWER_NAMES: Record<number, { name: string; icon: string }> = {
  1: { name: 'Ameixeira', icon: '🌸' },
  2: { name: 'Orquidea', icon: '🌺' },
  3: { name: 'Crisantemo', icon: '🌼' },
  4: { name: 'Flor Bambu', icon: '🎋' },
}

// Estacoes (qualquer estacao combina com qualquer estacao, matchGroup: "season_group")
const SEASON_NAMES: Record<number, { name: string; icon: string }> = {
  1: { name: 'Primavera', icon: '🌱' },
  2: { name: 'Verao', icon: '☀️' },
  3: { name: 'Outono', icon: '🍂' },
  4: { name: 'Inverno', icon: '❄️' },
}

// Gera pecas em pares correspondentes (quadras de 4 pecas)
function createTilePairPool(totalTiles: number): TileDef[] {
  const pool: TileDef[] = []
  let tileSeq = 0

  const pushQuad = (
    category: TileCategory,
    value: number,
    matchGroup: string,
    label: string,
    subLabel: string,
    color: string,
  ) => {
    for (let i = 0; i < 4; i++) {
      tileSeq++
      pool.push({
        id: `tile_${tileSeq}_${matchGroup}_${i}`,
        category,
        value,
        matchGroup,
        label,
        subLabel,
        color,
      })
    }
  }

  // Circulos 1..9
  for (let v = 1; v <= 9; v++) {
    pushQuad('dot', v, `dot_${v}`, `${v}`, 'Circulo', '#1E88E5')
  }

  // Bambu 1..9
  for (let v = 1; v <= 9; v++) {
    pushQuad('bamboo', v, `bamboo_${v}`, `${v}`, 'Bambu', '#2E7D32')
  }

  // Caracteres Numericos 1..9
  for (let v = 1; v <= 9; v++) {
    pushQuad('character', v, `char_${v}`, `${v}`, 'Numero', '#D32F2F')
  }

  // Ventos 1..4
  for (let v = 1; v <= 4; v++) {
    pushQuad('wind', v, `wind_${v}`, WIND_TILES[v].symbol, WIND_TILES[v].name, '#5E35B1')
  }

  // Dragoes 1..3
  for (let v = 1; v <= 3; v++) {
    pushQuad(
      'dragon',
      v,
      `dragon_${v}`,
      DRAGON_TILES[v].symbol,
      DRAGON_TILES[v].name,
      DRAGON_TILES[v].color,
    )
  }

  // Flores (todas pertencem ao grupo de flor)
  for (let v = 1; v <= 4; v++) {
    tileSeq++
    pool.push({
      id: `flower_${v}_${tileSeq}`,
      category: 'flower',
      value: v,
      matchGroup: 'flower_group',
      label: FLOWER_NAMES[v].icon,
      subLabel: FLOWER_NAMES[v].name,
      color: '#E91E63',
    })
  }

  // Estacoes (todas pertencem ao grupo de estacao)
  for (let v = 1; v <= 4; v++) {
    tileSeq++
    pool.push({
      id: `season_${v}_${tileSeq}`,
      category: 'season',
      value: v,
      matchGroup: 'season_group',
      label: SEASON_NAMES[v].icon,
      subLabel: SEASON_NAMES[v].name,
      color: '#FB8C00',
    })
  }

  // Embaralhar todas as pecas
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  // Garantir selecao em pares exatos
  const result: TileDef[] = []
  const groupBuckets: Record<string, TileDef[]> = {}

  for (const t of pool) {
    if (!groupBuckets[t.matchGroup]) groupBuckets[t.matchGroup] = []
    groupBuckets[t.matchGroup].push(t)
  }

  const groupKeys = Object.keys(groupBuckets)
  let kIdx = 0
  while (result.length < totalTiles && kIdx < groupKeys.length * 3) {
    const k = groupKeys[kIdx % groupKeys.length]
    const list = groupBuckets[k]
    if (list && list.length >= 2) {
      result.push(list.pop()!)
      result.push(list.pop()!)
    }
    kIdx++
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

// Layout Facil (36 pecas, 3 camadas em piramide compacta)
function generateEasySlots(): { layer: number; row: number; col: number }[] {
  const slots: { layer: number; row: number; col: number }[] = []

  // Camada 0: 6x4 = 24 pecas
  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 6; c++) {
      slots.push({ layer: 0, row: r, col: c })
    }
  }

  // Camada 1: 4x2 = 8 pecas
  for (let r = 2; r <= 3; r++) {
    for (let c = 2; c <= 5; c++) {
      slots.push({ layer: 1, row: r, col: c })
    }
  }

  // Camada 2: 2x2 = 4 pecas
  for (let r = 2; r <= 3; r++) {
    for (let c = 3; c <= 4; c++) {
      slots.push({ layer: 2, row: r, col: c })
    }
  }

  return slots // 24 + 8 + 4 = 36 pecas
}

// Layout Classico Tartaruga / Piramidal (72 pecas, 4 camadas)
function generateClassicSlots(): { layer: number; row: number; col: number }[] {
  const slots: { layer: number; row: number; col: number }[] = []

  // Camada 0: Base 8x6 = 48 pecas
  for (let r = 1; r <= 6; r++) {
    for (let c = 1; c <= 8; c++) {
      slots.push({ layer: 0, row: r, col: c })
    }
  }

  // Camada 1: Plataforma intermediaria 4x4 = 16 pecas
  for (let r = 2; r <= 5; r++) {
    for (let c = 3; c <= 6; c++) {
      slots.push({ layer: 1, row: r, col: c })
    }
  }

  // Camada 2: 6 pecas no terceiro andar
  slots.push({ layer: 2, row: 3, col: 4 })
  slots.push({ layer: 2, row: 3, col: 5 })
  slots.push({ layer: 2, row: 4, col: 4 })
  slots.push({ layer: 2, row: 4, col: 5 })
  slots.push({ layer: 2, row: 3, col: 3 })
  slots.push({ layer: 2, row: 4, col: 6 })

  // Camada 3: 2 pecas no topo
  slots.push({ layer: 3, row: 3, col: 4 })
  slots.push({ layer: 3, row: 4, col: 5 })

  return slots // 48 + 16 + 6 + 2 = 72 pecas
}

export default function Mahjong() {
  const { addReward } = useGame()

  const [difficulty, setDifficulty] = useState<MahjongDifficulty>('classic')
  const [boardSlots, setBoardSlots] = useState<BoardSlot[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [hintPair, setHintPair] = useState<[string, string] | null>(null)
  const [history, setHistory] = useState<BoardSlot[][]>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [movesCount, setMovesCount] = useState(0)
  const [isWon, setIsWon] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const winClaimedRef = useRef(false)

  // Reusable AudioContext singleton to prevent mobile crashes
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

  // Sons sinteticos via Web Audio API singleton
  const playSound = useCallback(
    (type: 'select' | 'match' | 'shuffle' | 'win' | 'blocked') => {
      if (!soundEnabled) return
      try {
        const ctx = getAudioContext()
        if (!ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        const now = ctx.currentTime
        if (type === 'select') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(587.33, now)
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
          osc.start(now)
          osc.stop(now + 0.06)
        } else if (type === 'match') {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(523.25, now)
          osc.frequency.setValueAtTime(659.25, now + 0.06)
          osc.frequency.setValueAtTime(783.99, now + 0.12)
          osc.frequency.setValueAtTime(1046.5, now + 0.18)
          gain.gain.setValueAtTime(0.15, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
          osc.start(now)
          osc.stop(now + 0.3)
        } else if (type === 'shuffle') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(300, now)
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.15)
          gain.gain.setValueAtTime(0.12, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
          osc.start(now)
          osc.stop(now + 0.15)
        } else if (type === 'blocked') {
          osc.type = 'square'
          osc.frequency.setValueAtTime(180, now)
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.08)
          gain.gain.setValueAtTime(0.06, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
          osc.start(now)
          osc.stop(now + 0.08)
        } else if (type === 'win') {
          osc.type = 'sine'
          osc.frequency.setValueAtTime(440, now)
          osc.frequency.linearRampToValueAtTime(880, now + 0.3)
          gain.gain.setValueAtTime(0.2, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
          osc.start(now)
          osc.stop(now + 0.6)
        }
      } catch {
        // audio fail safe
      }
    },
    [soundEnabled, getAudioContext],
  )

  // Mapa memoizado de quais pecas estao livres (calculado UMA VEZ por mudanca de tabuleiro)
  const freeTileMap = useMemo(() => {
    const map = new Map<string, boolean>()

    // Filtrar apenas slots com pecas
    const activeSlots = boardSlots.filter((s) => s.tile !== null)

    for (const targetSlot of activeSlots) {
      // 1. Verifica se ha peca por cima
      let hasAbove = false
      for (const s of activeSlots) {
        if (s.layer > targetSlot.layer) {
          const rowDiff = Math.abs(s.row - targetSlot.row)
          const colDiff = Math.abs(s.col - targetSlot.col)
          if (rowDiff < 0.9 && colDiff < 0.9) {
            hasAbove = true
            break
          }
        }
      }

      if (hasAbove) {
        map.set(targetSlot.id, false)
        continue
      }

      // 2. Verifica vizinhos a esquerda e a direita no mesmo nivel
      let hasLeft = false
      let hasRight = false

      for (const s of activeSlots) {
        if (s.layer === targetSlot.layer && s.id !== targetSlot.id) {
          if (Math.abs(s.row - targetSlot.row) < 0.5) {
            if (s.col === targetSlot.col - 1) hasLeft = true
            if (s.col === targetSlot.col + 1) hasRight = true
            if (hasLeft && hasRight) break
          }
        }
      }

      map.set(targetSlot.id, !(hasLeft && hasRight))
    }

    return map
  }, [boardSlots])

  // Verifica se peca esta livre via Map O(1)
  const isTileFree = useCallback(
    (targetSlot: BoardSlot): boolean => {
      if (!targetSlot.tile) return false
      return freeTileMap.get(targetSlot.id) || false
    },
    [freeTileMap],
  )

  // Iniciar nova partida
  const startNewGame = useCallback(
    (diff: MahjongDifficulty = difficulty) => {
      const templateSlots = diff === 'easy' ? generateEasySlots() : generateClassicSlots()
      const tilePool = createTilePairPool(templateSlots.length)

      const initialSlots: BoardSlot[] = templateSlots.map((s, idx) => ({
        id: `slot_${s.layer}_${s.row}_${s.col}_${idx}`,
        layer: s.layer,
        row: s.row,
        col: s.col,
        tile: tilePool[idx] || null,
      }))

      setBoardSlots(initialSlots)
      setSelectedSlotId(null)
      setHintPair(null)
      setHistory([])
      setElapsedSeconds(0)
      setMovesCount(0)
      setIsWon(false)
      winClaimedRef.current = false
      playSound('shuffle')
    },
    [difficulty, playSound],
  )

  useEffect(() => {
    startNewGame(difficulty)
  }, [difficulty, startNewGame])

  // Temporizador
  useEffect(() => {
    if (isWon) return
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isWon])

  const remainingSlots = useMemo(() => {
    return boardSlots.filter((s) => s.tile !== null)
  }, [boardSlots])

  // Pares livres disponiveis
  const availablePairs = useMemo(() => {
    const freeSlots = boardSlots.filter((s) => s.tile !== null && freeTileMap.get(s.id))
    const pairs: [BoardSlot, BoardSlot][] = []

    // Agrupa por matchGroup para busca linear rapida
    const grouped: Record<string, BoardSlot[]> = {}
    for (const slot of freeSlots) {
      const g = slot.tile!.matchGroup
      if (!grouped[g]) grouped[g] = []
      grouped[g].push(slot)
    }

    for (const key in grouped) {
      const list = grouped[key]
      if (list.length >= 2) {
        pairs.push([list[0], list[1]])
      }
    }
    return pairs
  }, [boardSlots, freeTileMap])

  // Historico de Desfazer
  const pushHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-25),
      boardSlots.map((s) => ({
        ...s,
        tile: s.tile ? { ...s.tile } : null,
      })),
    ])
  }, [boardSlots])

  const handleUndo = () => {
    if (history.length === 0 || isWon) return
    const last = history[history.length - 1]
    setBoardSlots(last)
    setHistory((prev) => prev.slice(0, -1))
    setSelectedSlotId(null)
    setHintPair(null)
    playSound('select')
  }

  // Embaralhar pecas restantes
  const handleShuffle = () => {
    if (remainingSlots.length === 0 || isWon) return

    pushHistory()

    const tiles = remainingSlots.map((s) => ({ ...s.tile! }))

    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[tiles[i], tiles[j]] = [tiles[j], tiles[i]]
    }

    let tIdx = 0
    const newSlots = boardSlots.map((s) => {
      if (s.tile) {
        return { ...s, tile: tiles[tIdx++] }
      }
      return s
    })

    setBoardSlots(newSlots)
    setSelectedSlotId(null)
    setHintPair(null)
    playSound('shuffle')

    toast({
      title: 'Pecas Embaralhadas!',
      description: 'O tabuleiro foi reorganizado com novos caminhos abertos.',
      className: 'bg-amber-50 border-amber-300 text-amber-950 font-bold',
    })
  }

  // Destacar dica
  const handleHint = () => {
    if (isWon) return

    if (availablePairs.length > 0) {
      const [first, second] = availablePairs[0]
      setHintPair([first.id, second.id])
      playSound('select')
      toast({
        title: 'Dica Encontrada!',
        description: `Par de ${first.tile?.subLabel || 'pecas'} destacado em dourado no tabuleiro.`,
        className: 'bg-amber-50 border-amber-300 text-amber-950 font-bold',
      })
    } else {
      playSound('blocked')
      toast({
        title: 'Nenhum par disponivel!',
        description:
          'Nao ha pares livres no momento. Toque em "Embaralhar" para abrir novas jogadas!',
        variant: 'destructive',
      })
    }
  }

  // Clique em peca
  const handleSlotClick = (slot: BoardSlot) => {
    if (!slot.tile || isWon) return

    const isFree = freeTileMap.get(slot.id)
    if (!isFree) {
      playSound('blocked')
      toast({
        title: 'Peça Bloqueada!',
        description:
          'A peça precisa ter pelo menos um lado (esquerdo ou direito) livre e nenhuma peça por cima.',
        variant: 'destructive',
      })
      return
    }

    setHintPair(null)

    if (selectedSlotId === null) {
      setSelectedSlotId(slot.id)
      playSound('select')
      return
    }

    if (selectedSlotId === slot.id) {
      setSelectedSlotId(null)
      playSound('select')
      return
    }

    const firstSlot = boardSlots.find((s) => s.id === selectedSlotId)
    if (!firstSlot || !firstSlot.tile) {
      setSelectedSlotId(slot.id)
      return
    }

    if (firstSlot.tile.matchGroup === slot.tile.matchGroup) {
      pushHistory()

      const nextSlots = boardSlots.map((s) => {
        if (s.id === firstSlot.id || s.id === slot.id) {
          return { ...s, tile: null }
        }
        return s
      })

      setBoardSlots(nextSlots)
      setSelectedSlotId(null)
      setMovesCount((m) => m + 1)
      playSound('match')

      const remainingCount = nextSlots.filter((s) => s.tile !== null).length
      if (remainingCount === 0) {
        setIsWon(true)
      } else {
        toast({
          title: 'Par Removido!',
          description: `${slot.tile.subLabel} correspondido! Restam ${remainingCount / 2} pares.`,
          className: 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold',
        })
      }
    } else {
      setSelectedSlotId(slot.id)
      playSound('select')
    }
  }

  // Vitoria e XP / Moedas
  useEffect(() => {
    if (isWon && !winClaimedRef.current) {
      winClaimedRef.current = true
      playSound('win')

      const bonusXp = difficulty === 'easy' ? 180 : 380
      const bonusCoins = difficulty === 'easy' ? 220 : 500

      addReward(
        bonusXp,
        bonusCoins,
        `Vitoria no Mahjong Solitaire (${difficulty === 'easy' ? 'Facil' : 'Classico'})!`,
      )

      toast({
        title: 'TABULEIRO LIMPO COM MAESTRIA!',
        description: `Voce removeu todas as pecas do Mahjong Solitaire! +${bonusCoins} Moedas e +${bonusXp} XP ganhos!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
    }
  }, [isWon, difficulty, addReward, playSound])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Renderiza face da peca no estilo Vita Mahjong (alto contraste, facil leitura)
  const renderTileContent = (tile: TileDef) => {
    if (tile.category === 'flower' || tile.category === 'season') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-1 leading-none text-center">
          <span className="text-2xl sm:text-3xl drop-shadow-sm">{tile.label}</span>
          <span
            className="text-[9px] sm:text-[10px] font-black mt-1 uppercase tracking-tight"
            style={{ color: tile.color }}
          >
            {tile.subLabel}
          </span>
        </div>
      )
    }

    if (tile.category === 'dot') {
      return (
        <div className="flex flex-col items-center justify-between h-full p-1.5 text-[#0288D1]">
          <span className="text-xs sm:text-sm font-black self-start leading-none">
            {tile.value}
          </span>
          <div className="flex items-center justify-center text-xl sm:text-2xl leading-none">
            {tile.value === 1 ? '🔵' : '🔘'}
          </div>
          <span className="text-[9px] sm:text-[10px] font-black uppercase text-[#0277BD]">
            Circulo
          </span>
        </div>
      )
    }

    if (tile.category === 'bamboo') {
      return (
        <div className="flex flex-col items-center justify-between h-full p-1.5 text-[#2E7D32]">
          <span className="text-xs sm:text-sm font-black self-start leading-none">
            {tile.value}
          </span>
          <div className="flex items-center justify-center text-xl sm:text-2xl leading-none">
            {tile.value === 1 ? '🦜' : '🎋'}
          </div>
          <span className="text-[9px] sm:text-[10px] font-black uppercase text-[#1B5E20]">
            Bambu
          </span>
        </div>
      )
    }

    return (
      <div
        className="flex flex-col items-center justify-between h-full p-1.5"
        style={{ color: tile.color }}
      >
        <span className="text-xs font-black self-start leading-none opacity-80">{tile.value}</span>
        <span className="text-xl sm:text-2xl font-black drop-shadow-sm leading-none">
          {tile.label}
        </span>
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight">
          {tile.subLabel}
        </span>
      </div>
    )
  }

  const maxRow = useMemo(() => Math.max(...boardSlots.map((s) => s.row), 6), [boardSlots])
  const maxCol = useMemo(() => Math.max(...boardSlots.map((s) => s.col), 8), [boardSlots])

  return (
    <AuthGate>
      <div className="space-y-4 pb-12 animate-fade-in select-none">
        {/* Navegacao e Titulo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-4 sm:p-5 shadow-sm">
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
                <span className="text-2xl">🀄</span> Mahjong Solitaire
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Estilo Vita Mahjong com pecas grandes, relevo 3D nitido e alto contraste.
              </p>
            </div>
          </div>

          {/* Selecao de dificuldade */}
          <div className="flex items-center gap-2">
            <div className="flex bg-[#F5ECE1] p-1 rounded-2xl border border-amber-200">
              <button
                onClick={() => {
                  setDifficulty('easy')
                  startNewGame('easy')
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  difficulty === 'easy'
                    ? 'bg-[#8BC34A] text-white shadow-sm'
                    : 'text-[#795548] hover:text-[#3E2723]'
                }`}
              >
                Facil (36 Pecas)
              </button>
              <button
                onClick={() => {
                  setDifficulty('classic')
                  startNewGame('classic')
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  difficulty === 'classic'
                    ? 'bg-[#8BC34A] text-white shadow-sm'
                    : 'text-[#795548] hover:text-[#3E2723]'
                }`}
              >
                Classico (72 Pecas)
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

        {/* Estatisticas do Jogo */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Pares Restantes */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Pares Restantes
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#D84315] tabular-nums">
              {remainingSlots.length / 2}
            </span>
          </div>

          {/* Jogadas Livres */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Jogadas Livres
            </span>
            <span
              className={`text-xl sm:text-2xl font-black tabular-nums ${
                availablePairs.length > 0 ? 'text-[#2E7D32]' : 'text-red-600'
              }`}
            >
              {availablePairs.length}
            </span>
          </div>

          {/* Tempo */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Tempo
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#5E35B1] tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Pares Casados */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Pares Casados
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#E65100] tabular-nums">
              {movesCount}
            </span>
          </div>

          {/* Botoes de Acao: Desfazer, Dica, Embaralhar */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
            <Button
              onClick={handleUndo}
              disabled={history.length === 0 || isWon}
              variant="outline"
              className="flex-1 h-full min-h-[48px] rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-xs text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
            >
              <Undo2 className="w-4 h-4 text-[#5E35B1]" />
              <span>Desfazer</span>
            </Button>
            <Button
              onClick={handleHint}
              disabled={isWon || remainingSlots.length === 0}
              variant="outline"
              className="flex-1 h-full min-h-[48px] rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-xs text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
            >
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span>Dica</span>
            </Button>
            <Button
              onClick={handleShuffle}
              disabled={isWon || remainingSlots.length === 0}
              variant="outline"
              className="flex-1 h-full min-h-[48px] rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-xs text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
              title="Embaralhar Pecas Restantes"
            >
              <Shuffle className="w-4 h-4 text-[#2E7D32]" />
              <span>Embaralhar</span>
            </Button>
          </div>
        </div>

        {/* Tabuleiro 3D Mahjong */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#2E5A36] via-[#1E3F24] to-[#152F1A] border-4 border-[#3E2723]/30 p-2 sm:p-6 shadow-2xl min-h-[540px] flex items-center justify-center overflow-x-auto">
          <div className="absolute inset-0 bg-radial from-transparent to-black/35 pointer-events-none rounded-2xl" />

          {/* Area do tabuleiro com profundidade 3D em CSS otimizada para mobile */}
          <div
            className="relative my-2 sm:my-4"
            style={{
              width: `${(maxCol + 1) * 62}px`,
              height: `${(maxRow + 1) * 74}px`,
              minWidth: '320px',
            }}
          >
            {boardSlots.map((slot) => {
              if (!slot.tile) return null

              const isFree = freeTileMap.get(slot.id) || false
              const isSelected = selectedSlotId === slot.id
              const isHinted = hintPair?.includes(slot.id) || false

              const layerZ = slot.layer * 10
              const layerOffsetX = slot.layer * -3
              const layerOffsetY = slot.layer * -5

              const leftPos = slot.col * 58 + layerOffsetX
              const topPos = slot.row * 68 + layerOffsetY

              return (
                <div
                  key={slot.id}
                  onClick={() => handleSlotClick(slot)}
                  style={{
                    left: `${leftPos}px`,
                    top: `${topPos}px`,
                    zIndex: layerZ + slot.row,
                  }}
                  className={`absolute w-13 h-17 sm:w-16 sm:h-20 rounded-xl cursor-pointer transition-transform duration-100 touch-manipulation active:scale-95 ${
                    isSelected
                      ? 'scale-105 ring-3 ring-amber-400 z-40'
                      : isHinted
                        ? 'ring-3 ring-yellow-300 animate-pulse'
                        : isFree
                          ? 'hover:brightness-105'
                          : 'opacity-65 cursor-not-allowed'
                  }`}
                >
                  {/* Base de sombra 3D da peca simplificada (sem filtro pesado de drop-shadow) */}
                  <div
                    className="absolute inset-0 rounded-xl bg-[#5D4037]/40"
                    style={{
                      transform: 'translate(3px, 4px)',
                    }}
                  />

                  {/* Camada verde traseira de jade */}
                  <div
                    className="absolute inset-0 rounded-xl bg-[#1B5E20]"
                    style={{
                      transform: 'translate(1.5px, 2px)',
                    }}
                  />

                  {/* Face frontal de marfim */}
                  <div
                    className={`relative w-full h-full rounded-xl border-2 transition-colors ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 shadow-md'
                        : isFree
                          ? 'bg-[#FFFDF9] border-[#D7CCC8]'
                          : 'bg-[#ECE5D8] border-[#BCAAA4]'
                    }`}
                  >
                    {renderTileContent(slot.tile)}

                    {!isFree && (
                      <div className="absolute inset-0 rounded-xl bg-black/10 pointer-events-none" />
                    )}

                    {slot.layer > 0 && (
                      <div className="absolute bottom-1 right-1 text-[8px] font-black text-[#8D6E63]/70">
                        N{slot.layer + 1}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Modal de Vitoria */}
          {isWon && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
              <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-scale-in space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                  🀄
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#3E2723]">
                    Vitoria no Mahjong!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#795548] font-bold mt-1">
                    Voce encontrou todos os pares no modo{' '}
                    <strong>{difficulty === 'easy' ? 'Facil' : 'Classico'}</strong> com clareza
                    mental!
                  </p>
                </div>

                <div className="bg-[#F5ECE1] rounded-2xl p-4 border border-amber-200 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <span className="text-[10px] font-black text-[#795548] uppercase">
                      Pares Casados
                    </span>
                    <p className="text-xl font-black text-[#E65100]">{movesCount}</p>
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
                  <span>XP e Moedas adicionadas a sua conta!</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => startNewGame(difficulty)}
                    className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-4 rounded-2xl shadow-md"
                  >
                    Jogar de Novo
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

        {/* Card de Regras e Ajuda */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-4 text-xs text-[#795548] space-y-1 font-bold">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Regras do Mahjong Solitaire:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-2 leading-relaxed">
            <li>
              <strong>Como jogar:</strong> Toque em dois blocos iguais para remove-los do tabuleiro.
              O jogo termina quando todas as pecas forem casadas e retiradas.
            </li>
            <li>
              <strong>Pecas livres:</strong> Uma peca so pode ser selecionada se nao houver outra
              peca por cima dela e se seu lado esquerdo ou direito estiver desimpedido.
            </li>
            <li>
              <strong>Flores e Estacoes:</strong> Qualquer flor combina com outra flor, e qualquer
              estacao combina com outra estacao.
            </li>
            <li>
              <strong>Embaralhar & Dica:</strong> Use "Dica" para localizar pares disponiveis ou
              "Embaralhar" quando nao houver mais jogadas livres na mesa.
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
