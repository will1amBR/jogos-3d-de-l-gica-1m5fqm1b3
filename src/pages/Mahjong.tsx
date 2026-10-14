import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Sparkles,
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

// Categorias do Mahjong Solitaire:
// Bambu (1..9), Circulos/Pontos (1..9), Numeros/Caracteres (1..9), Ventos (4), Dragoes (3), Flores (4 - combinam entre si), Estacoes (4 - combinam entre si)
export type TileCategory = 'bamboo' | 'dot' | 'character' | 'wind' | 'dragon' | 'flower' | 'season'

export interface TileDef {
  id: string
  category: TileCategory
  value: number
  matchGroup: string // chave que define quais pecas casam entre si
  label: string
  subLabel: string
  color: string
  icon: string
  cornerBadge?: string
  accentBg?: string
}

export interface BoardSlot {
  id: string
  layer: number // 0 (base) .. 3 (topo)
  row: number
  col: number
  tile: TileDef | null
}

export type MahjongDifficulty = 'easy' | 'classic'

// Configuracoes ricas para cada familia de pecas — icone protagonista, cores vivas e diferenciacao nitida

// BAMBU 1..9 (tons verdes de jade e natureza, icones variados de plantas e fauna)
const BAMBOO_SPECS: Record<
  number,
  { icon: string; name: string; badge: string; color: string; bg: string }
> = {
  1: {
    icon: '🦜',
    name: 'Papagaio',
    badge: '1',
    color: '#1B5E20',
    bg: 'from-emerald-50 to-green-100',
  },
  2: {
    icon: '🎋',
    name: 'Broto Duplo',
    badge: '2',
    color: '#2E7D32',
    bg: 'from-green-50 to-emerald-100',
  },
  3: {
    icon: '🎍',
    name: 'Kadomatsu',
    badge: '3',
    color: '#33691E',
    bg: 'from-lime-50 to-green-100',
  },
  4: {
    icon: '🌿',
    name: 'Folhas',
    badge: '4',
    color: '#1B5E20',
    bg: 'from-emerald-50 to-teal-100',
  },
  5: {
    icon: '🍃',
    name: 'Bambu Vento',
    badge: '5',
    color: '#2E7D32',
    bg: 'from-green-50 to-emerald-100',
  },
  6: {
    icon: '🌾',
    name: 'Espigas',
    badge: '6',
    color: '#388E3C',
    bg: 'from-emerald-50 to-green-100',
  },
  7: { icon: '🌱', name: 'Brotos', badge: '7', color: '#1B5E20', bg: 'from-green-50 to-lime-100' },
  8: {
    icon: '🌳',
    name: 'Floresta',
    badge: '8',
    color: '#2E7D32',
    bg: 'from-emerald-50 to-teal-100',
  },
  9: {
    icon: '🌴',
    name: 'Palmeira',
    badge: '9',
    color: '#1B5E20',
    bg: 'from-teal-50 to-emerald-100',
  },
}

// CIRCULOS 1..9 (tons azuis / ciano / safira de orbes celestes e pedras preciosas)
const DOT_SPECS: Record<
  number,
  { icon: string; name: string; badge: string; color: string; bg: string }
> = {
  1: {
    icon: '🔮',
    name: 'Orbe Magico',
    badge: '1',
    color: '#0D47A1',
    bg: 'from-sky-50 to-blue-100',
  },
  2: {
    icon: '🧿',
    name: 'Olho Protetor',
    badge: '2',
    color: '#1565C0',
    bg: 'from-blue-50 to-indigo-100',
  },
  3: {
    icon: '🌕',
    name: 'Lua Cheia',
    badge: '3',
    color: '#0277BD',
    bg: 'from-amber-50 to-sky-100',
  },
  4: { icon: '🌀', name: 'Vortice', badge: '4', color: '#0288D1', bg: 'from-cyan-50 to-blue-100' },
  5: { icon: '💠', name: 'Diamante', badge: '5', color: '#01579B', bg: 'from-sky-50 to-cyan-100' },
  6: { icon: '🔘', name: 'Perola', badge: '6', color: '#0277BD', bg: 'from-blue-50 to-sky-100' },
  7: {
    icon: '🪐',
    name: 'Saturno',
    badge: '7',
    color: '#0288D1',
    bg: 'from-indigo-50 to-blue-100',
  },
  8: { icon: '💎', name: 'Safira', badge: '8', color: '#01579B', bg: 'from-cyan-50 to-blue-100' },
  9: { icon: '🌌', name: 'Galaxia', badge: '9', color: '#0D47A1', bg: 'from-sky-50 to-indigo-100' },
}

// NUMEROS 1..9 (tons rubi / coral / vermelho imperial chinês com simbolos romanos limpos)
const CHAR_SPECS: Record<
  number,
  { icon: string; name: string; badge: string; color: string; bg: string }
> = {
  1: { icon: 'I', name: 'Numero 1', badge: '1', color: '#C62828', bg: 'from-rose-50 to-red-100' },
  2: { icon: 'II', name: 'Numero 2', badge: '2', color: '#D32F2F', bg: 'from-rose-50 to-red-100' },
  3: { icon: 'III', name: 'Numero 3', badge: '3', color: '#B71C1C', bg: 'from-rose-50 to-red-100' },
  4: { icon: 'IV', name: 'Numero 4', badge: '4', color: '#C62828', bg: 'from-red-50 to-rose-100' },
  5: { icon: 'V', name: 'Numero 5', badge: '5', color: '#D32F2F', bg: 'from-rose-50 to-red-100' },
  6: { icon: 'VI', name: 'Numero 6', badge: '6', color: '#B71C1C', bg: 'from-red-50 to-rose-100' },
  7: { icon: 'VII', name: 'Numero 7', badge: '7', color: '#C62828', bg: 'from-rose-50 to-red-100' },
  8: {
    icon: 'VIII',
    name: 'Numero 8',
    badge: '8',
    color: '#D32F2F',
    bg: 'from-rose-50 to-red-100',
  },
  9: { icon: 'IX', name: 'Numero 9', badge: '9', color: '#B71C1C', bg: 'from-red-50 to-rose-100' },
}

// VENTOS (tons violeta / ametista elegantes com pontos cardeais bem claros)
const WIND_TILES: Record<
  number,
  { name: string; symbol: string; icon: string; color: string; bg: string }
> = {
  1: {
    name: 'Leste',
    symbol: 'L',
    icon: '🧭 L',
    color: '#5E35B1',
    bg: 'from-purple-50 to-violet-100',
  },
  2: {
    name: 'Sul',
    symbol: 'S',
    icon: '☀️ S',
    color: '#6A1B9A',
    bg: 'from-purple-50 to-fuchsia-100',
  },
  3: {
    name: 'Oeste',
    symbol: 'O',
    icon: '🌅 O',
    color: '#4A148C',
    bg: 'from-violet-50 to-purple-100',
  },
  4: {
    name: 'Norte',
    symbol: 'N',
    icon: '❄️ N',
    color: '#512DA8',
    bg: 'from-indigo-50 to-purple-100',
  },
}

// DRAGOES (Dragao Vermelho, Verde e Branco com estetica mitica e alto contraste)
const DRAGON_TILES: Record<
  number,
  { name: string; symbol: string; icon: string; color: string; bg: string }
> = {
  1: {
    name: 'Dragao Vermelho',
    symbol: 'DV',
    icon: '🐉',
    color: '#D32F2F',
    bg: 'from-red-50 to-rose-150',
  },
  2: {
    name: 'Dragao Verde',
    symbol: 'DV',
    icon: '🐲',
    color: '#2E7D32',
    bg: 'from-emerald-50 to-green-150',
  },
  3: {
    name: 'Dragao Branco',
    symbol: 'DB',
    icon: '🏛️',
    color: '#1976D2',
    bg: 'from-sky-50 to-blue-150',
  },
}

// FLORES (qualquer flor combina com qualquer flor, matchGroup: "flower_group")
const FLOWER_NAMES: Record<number, { name: string; icon: string }> = {
  1: { name: 'Ameixeira', icon: '🌸' },
  2: { name: 'Orquidea', icon: '🌺' },
  3: { name: 'Crisantemo', icon: '🌼' },
  4: { name: 'Lotus Real', icon: '🪷' },
}

// ESTACOES (qualquer estacao combina com qualquer estacao, matchGroup: "season_group")
const SEASON_NAMES: Record<number, { name: string; icon: string }> = {
  1: { name: 'Primavera', icon: '🌱' },
  2: { name: 'Verao', icon: '☀️' },
  3: { name: 'Outono', icon: '🍂' },
  4: { name: 'Inverno', icon: '❄️' },
}

// Configuracao visual de cada camada para elevacao 3D obvia de relance
const LAYER_STYLES: Record<
  number,
  {
    name: string
    badgeBg: string
    badgeText: string
    borderHighlight: string
    shadowClass: string
    scale: number
    liftOffset: { x: number; y: number }
  }
> = {
  0: {
    name: 'Andar 1 (Base)',
    badgeBg: 'bg-stone-500/80',
    badgeText: 'text-stone-100',
    borderHighlight: 'border-stone-300',
    shadowClass: 'shadow-sm',
    scale: 1,
    liftOffset: { x: 0, y: 0 },
  },
  1: {
    name: 'Andar 2',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    borderHighlight: 'border-emerald-300',
    shadowClass: 'shadow-md',
    scale: 1.015,
    liftOffset: { x: -3, y: -4 },
  },
  2: {
    name: 'Andar 3',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-amber-950 font-black',
    borderHighlight: 'border-amber-300 ring-1 ring-amber-400/60',
    shadowClass: 'shadow-xl',
    scale: 1.035,
    liftOffset: { x: -6, y: -9 },
  },
  3: {
    name: 'Andar 4 (Topo)',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white font-black',
    borderHighlight: 'border-purple-300 ring-2 ring-purple-400/80',
    shadowClass: 'shadow-2xl',
    scale: 1.055,
    liftOffset: { x: -9, y: -14 },
  },
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
    icon: string,
    cornerBadge?: string,
    accentBg?: string,
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
        icon,
        cornerBadge,
        accentBg,
      })
    }
  }

  // Circulos 1..9
  for (let v = 1; v <= 9; v++) {
    const s = DOT_SPECS[v]
    pushQuad('dot', v, `dot_${v}`, s.icon, s.name, s.color, s.icon, s.badge, s.bg)
  }

  // Bambu 1..9
  for (let v = 1; v <= 9; v++) {
    const s = BAMBOO_SPECS[v]
    pushQuad('bamboo', v, `bamboo_${v}`, s.icon, s.name, s.color, s.icon, s.badge, s.bg)
  }

  // Numeros 1..9
  for (let v = 1; v <= 9; v++) {
    const s = CHAR_SPECS[v]
    pushQuad('character', v, `char_${v}`, s.icon, s.name, s.color, s.icon, s.badge, s.bg)
  }

  // Ventos 1..4
  for (let v = 1; v <= 4; v++) {
    const w = WIND_TILES[v]
    pushQuad('wind', v, `wind_${v}`, w.symbol, w.name, w.color, w.icon, w.symbol, w.bg)
  }

  // Dragoes 1..3
  for (let v = 1; v <= 3; v++) {
    const d = DRAGON_TILES[v]
    pushQuad('dragon', v, `dragon_${v}`, d.symbol, d.name, d.color, d.icon, d.symbol, d.bg)
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
      icon: FLOWER_NAMES[v].icon,
      cornerBadge: '🌸',
      accentBg: 'from-pink-50 to-rose-100',
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
      icon: SEASON_NAMES[v].icon,
      cornerBadge: '☀️',
      accentBg: 'from-amber-50 to-orange-100',
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
  while (result.length < totalTiles && kIdx < groupKeys.length * 4) {
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

// Layout Facil (36 pecas, 3 camadas em piramide compacta 6 colunas x 4 linhas)
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

// Layout Classico (72 pecas, 4 camadas)
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
  const [matchingPairIds, setMatchingPairIds] = useState<string[]>([])
  const [history, setHistory] = useState<BoardSlot[][]>([])
  const [matchedPairsTray, setMatchedPairsTray] = useState<Array<{ id: string; tile: TileDef }>>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [movesCount, setMovesCount] = useState(0)
  const [combo, setCombo] = useState(1)
  const [maxCombo, setMaxCombo] = useState(1)
  const [lastMatchTime, setLastMatchTime] = useState(0)
  const [comboAnim, setComboAnim] = useState(false)
  const [isWon, setIsWon] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [tappedSlotId, setTappedSlotId] = useState<string | null>(null)
  const [isGameStarting, setIsGameStarting] = useState(true)

  // Medicao da largura do container do tabuleiro para auto-scale perfeito
  const boardContainerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(360)

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

  // ResizeObserver para manter tabuleiro 100% visivel na tela sem rolagem horizontal
  useEffect(() => {
    const el = boardContainerRef.current
    if (!el) return

    const updateWidth = () => {
      const w = el.clientWidth
      if (w > 0) {
        setContainerWidth(w)
      }
    }

    updateWidth()

    const ro = new ResizeObserver(() => {
      updateWidth()
    })
    ro.observe(el)

    window.addEventListener('resize', updateWidth)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  // Mapa memoizado de quais pecas estao livres (calculado UMA VEZ por mudanca de tabuleiro)
  const freeTileMap = useMemo(() => {
    const map = new Map<string, boolean>()
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
      setMatchedPairsTray([])
      setElapsedSeconds(0)
      setMovesCount(0)
      setCombo(1)
      setMaxCombo(1)
      setLastMatchTime(0)
      setIsWon(false)
      setIsGameStarting(true)
      winClaimedRef.current = false
      playSound('shuffle')

      // Finaliza o estado de deal apos a cascata
      setTimeout(() => {
        setIsGameStarting(false)
      }, 700)
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
    setMatchedPairsTray((prev) => prev.slice(0, -1))
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
      title: 'Pecas Embaralhadas! 🔀',
      description: 'O tabuleiro foi reorganizado com novos caminhos abertos.',
      className: 'bg-amber-50 border-amber-300 text-amber-950 font-bold',
    })
  }

  // Destacar dica (SEMPRE clicavel: destaca quando houver ou avisa/oferece embaralhar)
  const handleHint = () => {
    if (isWon) return

    if (availablePairs.length > 0) {
      const [first, second] = availablePairs[0]
      setHintPair([first.id, second.id])
      playSound('select')
      toast({
        title: '💡 Dica encontrada!',
        description: `Par de ${first.tile?.subLabel || 'peças'} destacado em dourado no tabuleiro.`,
        className: 'bg-amber-50 border-amber-300 text-amber-950 font-bold',
      })
    } else {
      playSound('blocked')
      toast({
        title: '⚠️ Sem pares livres no momento!',
        description:
          'Não há combinações possíveis nesta posição. Use o botão "Embaralhar" para abrir novas jogadas!',
        className: 'bg-amber-100 border-2 border-amber-400 text-amber-950 font-black',
      })
    }
  }

  // Clique em peca
  const handleSlotClick = (slot: BoardSlot) => {
    if (!slot.tile || isWon) return

    // Efeito tatil de toque
    setTappedSlotId(slot.id)
    setTimeout(() => {
      setTappedSlotId((prev) => (prev === slot.id ? null : prev))
    }, 280)

    const isFree = freeTileMap.get(slot.id)
    if (!isFree) {
      playSound('blocked')
      toast({
        title: 'Peca Bloqueada!',
        description:
          'A peca precisa ter pelo menos um lado (esquerdo ou direito) livre e nenhuma peca por cima.',
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
      playSound('match')

      const p1Id = firstSlot.id
      const p2Id = slot.id
      const subLabel = slot.tile.subLabel
      const matchedTileCopy = { ...slot.tile }

      // Combo streak logic: if matched within 4.5 seconds of previous match
      const nowMs = Date.now()
      let currentMultiplier = 1
      if (lastMatchTime > 0 && nowMs - lastMatchTime <= 4500) {
        currentMultiplier = Math.min(8, combo + 1)
        setCombo(currentMultiplier)
        setMaxCombo((prev) => Math.max(prev, currentMultiplier))
        setComboAnim(true)
        setTimeout(() => setComboAnim(false), 600)
      } else {
        currentMultiplier = 1
        setCombo(1)
      }
      setLastMatchTime(nowMs)

      // Ativa efeito visual animado (jade + ouro + choque + faiscas) antes de limpar
      setMatchingPairIds([p1Id, p2Id])
      setSelectedSlotId(null)

      setTimeout(() => {
        setBoardSlots((prev) => {
          const nextSlots = prev.map((s) => {
            if (s.id === p1Id || s.id === p2Id) {
              return { ...s, tile: null }
            }
            return s
          })

          const remainingCount = nextSlots.filter((s) => s.tile !== null).length
          if (remainingCount === 0) {
            setIsWon(true)
          } else {
            toast({
              title:
                currentMultiplier > 1
                  ? `🔥 COMBO ${currentMultiplier}x! Jade & Ouro!`
                  : '✨ Par Removido com Sucesso!',
              description: `${subLabel} correspondido! Restam ${remainingCount / 2} pares.`,
              className:
                currentMultiplier > 1
                  ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold',
            })
          }

          return nextSlots
        })

        // Acumula par na fundação de pares casados (estilo FreeCell/Spider)
        setMatchedPairsTray((prev) => [
          ...prev,
          { id: `${p1Id}_${Date.now()}`, tile: matchedTileCopy },
        ])
        setMatchingPairIds((prev) => prev.filter((id) => id !== p1Id && id !== p2Id))
        setMovesCount((m) => m + 1)
      }, 480)
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
        title: 'TABULEIRO LIMPO COM MAESTRIA! 🏆',
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

  // Renderiza a face protagonista da peca com icone gigante, alto contraste e badge de canto legivel
  const renderTileFace = (tile: TileDef) => {
    const isSpecial = tile.category === 'flower' || tile.category === 'season'

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-between p-1 select-none overflow-hidden">
        {/* Badge minusculo e discreto no topo esquerdo (apenas valor ou simbolo sem atrapalhar) */}
        <div className="w-full flex items-center justify-between px-0.5 leading-none">
          <span
            className="text-[10px] font-black rounded-sm px-1 py-0.2"
            style={{ color: tile.color }}
          >
            {tile.cornerBadge || tile.value}
          </span>
          {/* Categoria em sigla sutil */}
          <span className="text-[7.5px] font-bold uppercase tracking-tighter opacity-60 text-stone-600">
            {tile.category === 'character'
              ? 'NUM'
              : tile.category === 'bamboo'
                ? 'BAM'
                : tile.category === 'dot'
                  ? 'CIR'
                  : tile.category === 'wind'
                    ? 'VENT'
                    : tile.category === 'dragon'
                      ? 'DRAG'
                      : isSpecial
                        ? 'ESPEC'
                        : ''}
          </span>
        </div>

        {/* ICONE PROTAGONISTA: Grande, nitido e altamente distinto de relance */}
        <div className="flex-1 flex items-center justify-center my-0.5">
          {tile.category === 'character' ? (
            <span
              className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-xs"
              style={{ color: tile.color }}
            >
              {tile.label}
            </span>
          ) : (
            <span className="text-2xl sm:text-3xl filter drop-shadow-xs leading-none transform transition-transform hover:scale-110">
              {tile.icon}
            </span>
          )}
        </div>

        {/* Rotulo inferior ultra-compacto (nome especifico da peca em vez de repetir BAMBU/CIRCULO) */}
        <div className="w-full text-center leading-none">
          <span
            className="text-[8px] font-black uppercase tracking-tight block truncate px-0.5"
            style={{ color: tile.color }}
            title={tile.subLabel}
          >
            {tile.subLabel}
          </span>
        </div>
      </div>
    )
  }

  // Layout base: calculo das dimensoes logicas do tabuleiro
  const maxCol = useMemo(() => Math.max(...boardSlots.map((s) => s.col), 8), [boardSlots])
  const maxRow = useMemo(() => Math.max(...boardSlots.map((s) => s.row), 6), [boardSlots])

  // Largura e altura da celula de referencia logica
  const BASE_CELL_WIDTH = 58
  const BASE_CELL_HEIGHT = 70
  const BOARD_PADDING_X = 24
  const BOARD_PADDING_Y = 24

  // Dimensao do tabuleiro no espaco de design ideal
  const logicalBoardWidth = (maxCol + 1.2) * BASE_CELL_WIDTH + BOARD_PADDING_X * 2
  const logicalBoardHeight = (maxRow + 1.2) * BASE_CELL_HEIGHT + BOARD_PADDING_Y * 2

  // Fator de escala dinamico: cabe 100% na largura do container no mobile em retrato sem rolagem horizontal
  const boardScale = useMemo(() => {
    if (!containerWidth || containerWidth <= 0) return 1
    // Permite um padding de 8px nas laterais para respirar confortavelmente
    const availableWidth = Math.max(containerWidth - 16, 280)
    const scale = availableWidth / logicalBoardWidth
    // Limita entre 0.42x (telas ultra estreitas) e 1.08x (telas desktop largas)
    return Math.min(Math.max(scale, 0.42), 1.08)
  }, [containerWidth, logicalBoardWidth])

  const scaledBoardWidth = logicalBoardWidth * boardScale
  const scaledBoardHeight = logicalBoardHeight * boardScale

  return (
    <AuthGate>
      <div className="space-y-2.5 pb-6 animate-fade-in select-none w-full max-w-full overflow-hidden">
        {/* Navegacao e Cabecalho */}
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
                <span className="text-2xl">🀄</span> Mahjong Solitaire
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Auto-ajuste responsivo na tela • Icones grandes de relance • Andares 3D destacados
              </p>
            </div>
          </div>

          {/* Dificuldade & Som */}
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

        {/* Estatisticas e Acoes Rapidas — flexivel sem cortar nas bordas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
          {/* Pares Restantes */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Pares Restantes
            </span>
            <span className="text-lg sm:text-2xl font-black text-[#D84315] tabular-nums">
              {remainingSlots.length / 2}
            </span>
          </div>

          {/* Jogadas Livres */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Jogadas Livres
            </span>
            <span
              className={`text-lg sm:text-2xl font-black tabular-nums ${
                availablePairs.length > 0 ? 'text-[#2E7D32]' : 'text-red-600'
              }`}
            >
              {availablePairs.length}
            </span>
          </div>

          {/* Tempo */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
              Tempo
            </span>
            <span className="text-lg sm:text-2xl font-black text-[#5E35B1] tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Pares Casados & Multiplicador de Combo */}
          <div className="bg-[#FFF9F0] border-2 border-amber-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[10px] uppercase font-black text-[#795548] tracking-wider">
                Pares
              </span>
              <span
                className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full transition-all ${
                  combo > 1
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-emerald-100 text-emerald-800'
                } ${comboAnim ? 'animate-combo-pulse scale-110' : ''}`}
              >
                🔥 {combo}x
              </span>
            </div>
            <span className="text-lg sm:text-2xl font-black text-[#E65100] tabular-nums">
              {movesCount}
            </span>
          </div>

          {/* Botoes de Acao: Desfazer, Dica, Embaralhar */}
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
              className="flex-1 h-full min-h-[44px] px-1.5 rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-[11px] text-[#3E2723] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              title="Ver Dica de Par ou Solução"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>Dica</span>
            </Button>
            <Button
              onClick={handleShuffle}
              disabled={isWon || remainingSlots.length === 0}
              variant="outline"
              className="flex-1 h-full min-h-[44px] px-1.5 rounded-2xl border-2 border-amber-300 bg-[#FFF9F0] hover:bg-amber-100 font-extrabold text-[11px] text-[#3E2723] flex flex-col items-center justify-center gap-0.5"
              title="Embaralhar Pecas Restantes"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>Baralhar</span>
            </Button>
          </div>
        </div>

        {/* Fundação / Bandeja de Pares Casados (Estilo FreeCell / Spider) */}
        <div className="bg-[#FFF9F0] border-2 border-amber-200/90 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-sm shadow-inner">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#3E2723] uppercase tracking-wider">
                  Pares Casados
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900">
                  {matchedPairsTray.length} / {boardSlots.length / 2 || 0}
                </span>
              </div>
              <p className="text-[10px] text-[#795548] font-bold hidden sm:block">
                Fundação dos pares removidos do tabuleiro
              </p>
            </div>
          </div>

          {/* Slots da Fundação: exibe os últimos pares com animação de encaixe suave */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-1 max-w-[65%] sm:max-w-none">
            {matchedPairsTray.length === 0 ? (
              <span className="text-[11px] font-extrabold text-[#795548]/70 italic px-2">
                Nenhum par casado ainda — toque em 2 peças iguais livres!
              </span>
            ) : (
              matchedPairsTray.slice(-8).map((item, idx) => (
                <div
                  key={item.id}
                  className="relative group shrink-0 w-8 h-10 sm:w-9 sm:h-11 rounded-lg bg-gradient-to-br from-amber-50 via-white to-amber-100 border-2 border-amber-400 shadow-sm flex flex-col items-center justify-center p-0.5 animate-mahjong-deal transition-transform hover:scale-110"
                  title={`${item.tile.subLabel} (Par Casado)`}
                >
                  <span
                    className="text-[8px] font-black leading-none"
                    style={{ color: item.tile.color }}
                  >
                    {item.tile.cornerBadge || item.tile.value}
                  </span>
                  <span className="text-sm sm:text-base leading-none">
                    {item.tile.category === 'character' ? (
                      <strong className="text-xs font-black" style={{ color: item.tile.color }}>
                        {item.tile.label}
                      </strong>
                    ) : (
                      item.tile.icon
                    )}
                  </span>
                  {idx === matchedPairsTray.slice(-8).length - 1 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tabuleiro 3D Mahjong — Conteiner de Auto-Ajuste com 100% de visibilidade e sem scroll */}
        <div
          ref={boardContainerRef}
          className="relative rounded-3xl bg-gradient-to-b from-[#2E5A36] via-[#1E3F24] to-[#152F1A] border-4 border-[#3E2723]/30 p-2 sm:p-4 shadow-2xl flex items-center justify-center overflow-hidden min-h-[380px]"
        >
          {/* Luz ambiente de mesa de feltro verde com vinheta */}
          <div className="absolute inset-0 bg-radial from-transparent to-black/40 pointer-events-none rounded-2xl" />

          {/* Wrapper dimensionado na proporcao exata da escala responsiva para nao estourar a tela */}
          <div
            className="relative flex items-center justify-center transition-all duration-300"
            style={{
              width: `${scaledBoardWidth}px`,
              height: `${scaledBoardHeight}px`,
              maxWidth: '100%',
            }}
          >
            {/* Tabuleiro no tamanho logico interno com transform scale aplicado */}
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: `${logicalBoardWidth}px`,
                height: `${logicalBoardHeight}px`,
                transform: `scale(${boardScale})`,
                transformOrigin: 'top left',
              }}
            >
              {boardSlots.map((slot, index) => {
                if (!slot.tile) return null

                const isFree = freeTileMap.get(slot.id) || false
                const isSelected = selectedSlotId === slot.id
                const isHinted = hintPair?.includes(slot.id) || false
                const isMatching = matchingPairIds.includes(slot.id)
                const isTapped = tappedSlotId === slot.id

                const layerConfig = LAYER_STYLES[slot.layer] || LAYER_STYLES[0]

                // Posicionamento espacial com elevacao tridimensional nitida
                const layerOffset = layerConfig.liftOffset
                const leftPos = BOARD_PADDING_X + slot.col * BASE_CELL_WIDTH + layerOffset.x
                const topPos = BOARD_PADDING_Y + slot.row * BASE_CELL_HEIGHT + layerOffset.y

                // Z-index garantido: pecas superiores e linhas inferiores ficam na frente
                const zIndex =
                  slot.layer * 40 + slot.row * 4 + (isSelected ? 500 : isMatching ? 600 : 0)

                // Cascata de deal escalonada
                const dealDelayMs = isGameStarting ? Math.min(index * 12, 450) : 0

                return (
                  <div
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    style={{
                      left: `${leftPos}px`,
                      top: `${topPos}px`,
                      zIndex,
                      animationDelay: isGameStarting ? `${dealDelayMs}ms` : undefined,
                    }}
                    className={`absolute w-[54px] h-[66px] rounded-xl cursor-pointer transition-transform duration-150 touch-manipulation select-none ${
                      isGameStarting ? 'animate-mahjong-deal' : ''
                    } ${isTapped ? 'animate-mahjong-wiggle' : ''} ${
                      isMatching
                        ? 'animate-mahjong-match pointer-events-none'
                        : isSelected
                          ? 'animate-mahjong-lift ring-4 ring-amber-400 ring-offset-2'
                          : isHinted
                            ? 'ring-3 ring-yellow-300 animate-pulse'
                            : isFree
                              ? 'animate-mahjong-free hover:brightness-105 hover:scale-[1.04]'
                              : 'opacity-65 cursor-not-allowed'
                    }`}
                  >
                    {/* Onda de choque e faiscas ao casar */}
                    {isMatching && (
                      <div className="absolute -inset-3 rounded-2xl border-4 border-amber-300 animate-mahjong-shock pointer-events-none z-50 bg-amber-400/20" />
                    )}

                    {/* Sombra 3D projetada proporcional ao andar da peca */}
                    <div
                      className="absolute inset-0 rounded-xl bg-black/45"
                      style={{
                        transform: `translate(${3 + slot.layer * 2}px, ${4 + slot.layer * 3}px)`,
                        filter: slot.layer > 1 ? 'blur(1px)' : 'none',
                      }}
                    />

                    {/* Lateral inferior de marfim/osso (relevo 3D evidente) */}
                    <div
                      className="absolute inset-0 rounded-xl bg-[#C8B89E]"
                      style={{
                        transform: `translate(${1 + slot.layer * 0.8}px, ${2 + slot.layer * 1.2}px)`,
                      }}
                    />

                    {/* Camada verde de jade autentica do Mahjong classico */}
                    <div
                      className="absolute inset-0 rounded-xl bg-[#1B5E20] border border-[#0D3B13]"
                      style={{
                        transform: `translate(${0.5 + slot.layer * 0.4}px, ${1 + slot.layer * 0.6}px)`,
                      }}
                    />

                    {/* Face frontal de porcelana marfim de alto contraste com destaque por andar */}
                    <div
                      className={`relative w-full h-full rounded-xl border-2 transition-all flex flex-col ${layerConfig.borderHighlight} ${
                        isMatching
                          ? 'bg-gradient-to-br from-yellow-100 via-amber-200 to-emerald-200 border-amber-400 shadow-2xl'
                          : isSelected
                            ? 'bg-gradient-to-br from-amber-50 via-yellow-100 to-amber-200 border-amber-400 shadow-2xl'
                            : isFree
                              ? slot.layer >= 2
                                ? 'bg-gradient-to-b from-[#FFFFFF] to-[#F5F2EB]'
                                : 'bg-[#FFFDF9]'
                              : 'bg-[#ECE5D8] border-[#BCAAA4]'
                      }`}
                    >
                      {/* Destaque visual do andar no canto superior direito — ultra nitido */}
                      <div
                        className={`absolute top-0.5 right-0.5 px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-tighter ${layerConfig.badgeBg} ${layerConfig.badgeText} shadow-xs z-10`}
                        title={layerConfig.name}
                      >
                        L{slot.layer + 1}
                      </div>

                      {/* Conteudo da face com icone protagonista */}
                      {renderTileFace(slot.tile)}

                      {/* Efeito de peca selecionada com check dourado festivo */}
                      {isSelected && (
                        <div className="absolute -top-2 -left-2 w-5 h-5 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-amber-950 font-black shadow-md animate-bounce">
                          ✓
                        </div>
                      )}

                      {/* Faiscas dinamicas no par casado */}
                      {isMatching && (
                        <div className="absolute -top-3 -right-3 text-lg animate-ping">✨</div>
                      )}

                      {/* Filtro cinza translucido quando a peca esta travada */}
                      {!isFree && (
                        <div className="absolute inset-0 rounded-xl bg-black/15 pointer-events-none" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Modal de Vitoria */}
          {isWon && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-scale-in space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                  🀄
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#3E2723]">
                    Vitoria no Mahjong!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#795548] font-bold mt-1">
                    Voce removeu todas as pecas do modo{' '}
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
              <strong>Flores e Estacoes:</strong> Qualquer flor combina com outra flor (🌸), e
              qualquer estacao combina com outra estacao (☀️).
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
