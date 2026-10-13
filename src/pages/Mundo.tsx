import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Compass,
  Tractor,
  Flame,
  Store,
  Users,
  Coins,
  Sparkles,
  ArrowLeft,
  ShoppingBag,
  PlusCircle,
  HelpCircle,
  ChevronRight,
  PackageCheck,
  Check,
  MapPin,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { CROPS, type CropType, getWorkerHireCost } from '@/types/game'

// RPG Collectible Item on Ground
interface CollectibleSoy {
  id: string
  x: number // canvas coords
  y: number
  respawnAt: number // timestamp
  collected: boolean
}

// RPG Customer NPC wandering around town/market
interface CustomerNPC {
  id: string
  name: string
  avatar: string
  x: number
  y: number
  targetX: number
  targetY: number
  speed: number
  demandBread: number // how many breads they want
  rewardCoins: number
  rewardXp: number
  satisfied: boolean
  talkCooldown: number
}

// RPG Zones with Portals / Entrances
interface WorldZone {
  id: string
  name: string
  icon: string
  route: string
  x: number
  y: number
  radius: number
  desc: string
  badgeColor: string
}

const WORLD_ZONES: WorldZone[] = [
  {
    id: 'fazenda_zone',
    name: 'Campos de Plantio',
    icon: '🚜',
    route: '/fazenda',
    x: 180,
    y: 200,
    radius: 75,
    desc: 'Lotes de terra para cultivar milho, abóbora, cenoura e trigo',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  {
    id: 'bakery_zone',
    name: 'Padaria & Forno Imperial',
    icon: '🥖',
    route: '/fazenda',
    x: 480,
    y: 150,
    radius: 70,
    desc: 'Transforme soja e trigo em pão quentinho',
    badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
  },
  {
    id: 'market_zone',
    name: 'Feira dos Produtores',
    icon: '🏪',
    route: '/fazenda',
    x: 720,
    y: 220,
    radius: 75,
    desc: 'Venda colheitas pelo multiplicador diário',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    id: 'jornada_zone',
    name: 'Estrada Real (Jornada RPG)',
    icon: '🗺️',
    route: '/jornada',
    x: 750,
    y: 440,
    radius: 70,
    desc: 'Explore os 8 territórios do reino',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
  },
]

export default function Mundo() {
  const navigate = useNavigate()
  const { player, inventory, upgrades, addReward, harvestCrop, bakeBread, hireWorker } = useGame()

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Character RPG Position & Continuous Movement
  // Character starts in center of the world
  const playerPosRef = useRef<{ x: number; y: number }>({ x: 450, y: 320 })
  const targetPosRef = useRef<{ x: number; y: number }>({ x: 450, y: 320 })
  const isMovingRef = useRef(false)
  const facingRef = useRef<'left' | 'right'>('right')
  const walkFrameRef = useRef(0)

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true)
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

  const playSfx = useCallback(
    (freq1: number, freq2: number, duration: number, type: OscillatorType = 'sine') => {
      if (!soundEnabled) return
      try {
        const ctx = getAudioContext()
        if (!ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = type
        osc.connect(gain)
        gain.connect(ctx.destination)
        const now = ctx.currentTime
        osc.frequency.setValueAtTime(freq1, now)
        osc.frequency.exponentialRampToValueAtTime(freq2, now + duration)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
        osc.start(now)
        osc.stop(now + duration)
      } catch {
        // audio fail safe
      }
    },
    [soundEnabled, getAudioContext],
  )

  // Collectible Soja plants scattered around the map
  const [collectibles, setCollectibles] = useState<CollectibleSoy[]>(() => [
    { id: 'soy_1', x: 260, y: 260, respawnAt: 0, collected: false },
    { id: 'soy_2', x: 330, y: 340, respawnAt: 0, collected: false },
    { id: 'soy_3', x: 210, y: 380, respawnAt: 0, collected: false },
    { id: 'soy_4', x: 390, y: 240, respawnAt: 0, collected: false },
    { id: 'soy_5', x: 300, y: 440, respawnAt: 0, collected: false },
    { id: 'soy_6', x: 140, y: 320, respawnAt: 0, collected: false },
    { id: 'soy_7', x: 280, y: 160, respawnAt: 0, collected: false },
  ])
  const collectiblesRef = useRef(collectibles)
  collectiblesRef.current = collectibles

  // NPCs / Customers walking in town to buy bread
  const [customers, setCustomers] = useState<CustomerNPC[]>(() => [
    {
      id: 'cust_1',
      name: 'Dona Maria',
      avatar: '👵',
      x: 580,
      y: 280,
      targetX: 620,
      targetY: 310,
      speed: 0.6,
      demandBread: 1,
      rewardCoins: 45,
      rewardXp: 35,
      satisfied: false,
      talkCooldown: 0,
    },
    {
      id: 'cust_2',
      name: 'Ferreiro João',
      avatar: '🧔',
      x: 640,
      y: 190,
      targetX: 690,
      targetY: 220,
      speed: 0.5,
      demandBread: 2,
      rewardCoins: 90,
      rewardXp: 70,
      satisfied: false,
      talkCooldown: 0,
    },
    {
      id: 'cust_3',
      name: 'Pequena Sofia',
      avatar: '👧',
      x: 520,
      y: 360,
      targetX: 560,
      targetY: 390,
      speed: 0.7,
      demandBread: 1,
      rewardCoins: 50,
      rewardXp: 40,
      satisfied: false,
      talkCooldown: 0,
    },
    {
      id: 'cust_4',
      name: 'Viajante Arthur',
      avatar: '🧳',
      x: 620,
      y: 430,
      targetX: 660,
      targetY: 410,
      speed: 0.55,
      demandBread: 3,
      rewardCoins: 140,
      rewardXp: 110,
      satisfied: false,
      talkCooldown: 0,
    },
  ])
  const customersRef = useRef(customers)
  customersRef.current = customers

  // Quick Action Modal states for Bakery & Hiring
  const [bakingQuick, setBakingQuick] = useState(false)
  const [hiringLoading, setHiringLoading] = useState(false)

  const breadCount = player?.bread_count || 0
  const workersCount = player?.hired_workers || 0
  const nextWorkerCost = getWorkerHireCost(workersCount)
  const sojaCount = inventory.find((i) => i.crop_type === 'soja')?.quantity || 0
  const trigoCount = inventory.find((i) => i.crop_type === 'trigo')?.quantity || 0

  // Worker auto-gathering / auto-baking periodically in background
  const lastWorkerEffectRef = useRef<number>(Date.now())
  useEffect(() => {
    if (workersCount <= 0) return
    const interval = setInterval(() => {
      const now = Date.now()
      // Interval reduces with more workers (e.g. 8s for 1 worker, 4s for 2, 2.5s for 3+)
      const cooldown = Math.max(2500, 8000 / workersCount)
      if (now - lastWorkerEffectRef.current >= cooldown) {
        lastWorkerEffectRef.current = now
        // Respawn collected soybean faster or give 1 extra soja
        harvestCrop('soja').then(() => {
          playSfx(440, 660, 0.08)
          toast({
            title: '🧑‍🌾 Trabalhador Coletando!',
            description: `Seus ajudantes colheram Soja fresca no campo!`,
            className: 'bg-emerald-50 border-emerald-300 text-emerald-900 text-xs font-black',
          })
        })
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [workersCount, harvestCrop, playSfx])

  // Handle Canvas Tap/Click to move character or interact
  const handleCanvasInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const clickX = (clientX - rect.left) * scaleX
      const clickY = (clientY - rect.top) * scaleY

      // 1. Check if clicking directly on a Soja collectible
      let clickedSoy = false
      const currentCollectibles = collectiblesRef.current
      for (const soy of currentCollectibles) {
        if (!soy.collected) {
          const dist = Math.hypot(clickX - soy.x, clickY - soy.y)
          if (dist < 32) {
            clickedSoy = true
            // Walk toward it and collect
            targetPosRef.current = { x: soy.x, y: soy.y }
            isMovingRef.current = true
            playSfx(480, 720, 0.06)
            break
          }
        }
      }

      // 2. Check if clicking on an NPC Customer
      const currentCustomers = customersRef.current
      for (const cust of currentCustomers) {
        const dist = Math.hypot(clickX - cust.x, clickY - cust.y)
        if (dist < 38) {
          // Walk up to customer
          targetPosRef.current = { x: cust.x, y: cust.y }
          isMovingRef.current = true
          return
        }
      }

      // 3. Set destination target point: continuous smooth walking
      targetPosRef.current = {
        x: Math.max(30, Math.min(canvas.width - 30, clickX)),
        y: Math.max(40, Math.min(canvas.height - 40, clickY)),
      }
      isMovingRef.current = true
      playSfx(380, 500, 0.04)
    },
    [playSfx],
  )

  // Direct Handlers
  const handleQuickBake = async (amount: number) => {
    setBakingQuick(true)
    try {
      // Check if user has either trigo or soja
      // In this RPG, baking uses 2 Trigo OR 2 Soja to bake nutritious artisanal bread!
      if (trigoCount >= amount * 2) {
        await bakeBread(amount)
        playSfx(523, 784, 0.15)
      } else if (sojaCount >= amount * 2) {
        // Turn soja into bread directly!
        await harvestCrop('soja') // grant crop xp
        await addReward(amount * 30, 0, `Pão de Soja Artesanal Assado! 🥖`)
        // Update bread count
        if (player) {
          const currentBread = player.bread_count || 0
          // Use game context player update
          await bakeBread(amount)
        }
        playSfx(523, 784, 0.15)
        toast({
          title: '🥖 Pão de Soja Assado com Sucesso!',
          description: `Você usou ${amount * 2} Sojas para assar ${amount} Pão(es) quentinho(s)!`,
          className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
        })
      } else {
        toast({
          title: 'Ingredientes Insuficientes!',
          description: `Você precisa de ${amount * 2} Trigos ou Sojas para assar este pão. Colete soja no chão ou cultive nos lotes!`,
          variant: 'destructive',
        })
      }
    } finally {
      setBakingQuick(false)
    }
  }

  const handleHireWorkerDirect = async () => {
    setHiringLoading(true)
    try {
      await hireWorker()
      playSfx(600, 900, 0.12)
    } finally {
      setHiringLoading(false)
    }
  }

  // Animation Loop (60 FPS on mobile, smooth lerp movement, NPC wandering, item pickup)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = performance.now()

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000)
      lastTime = time

      // Canvas dimensions
      const w = canvas.width
      const h = canvas.height

      // 1. UPDATE PLAYER CONTINUOUS WALKING (LERP)
      const p = playerPosRef.current
      const target = targetPosRef.current
      const dx = target.x - p.x
      const dy = target.y - p.y
      const dist = Math.hypot(dx, dy)

      const speed = 140 // pixels per second
      if (dist > 3) {
        isMovingRef.current = true
        const step = Math.min(dist, speed * dt)
        p.x += (dx / dist) * step
        p.y += (dy / dist) * step

        if (dx < -1) facingRef.current = 'left'
        else if (dx > 1) facingRef.current = 'right'

        walkFrameRef.current += dt * 8
      } else {
        isMovingRef.current = false
      }

      // 2. CHECK COLLECTIBLE PICKUP (SOJA)
      const now = Date.now()
      const updatedCollectibles = collectiblesRef.current.map((soy) => {
        // Respawn check
        if (soy.collected && now > soy.respawnAt) {
          return { ...soy, collected: false }
        }

        // Proximity check with player
        if (!soy.collected) {
          const d = Math.hypot(p.x - soy.x, p.y - soy.y)
          if (d < 28) {
            // Collect!
            harvestCrop('soja')
            playSfx(587, 880, 0.08)
            toast({
              title: '🌱 Soja Coletada!',
              description: '+1 Soja adicionada ao celeiro! Use no Forno para fazer pão.',
              className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
            })
            return {
              ...soy,
              collected: true,
              respawnAt: now + 12000, // respawns in 12s
            }
          }
        }
        return soy
      })
      collectiblesRef.current = updatedCollectibles

      // 3. UPDATE CUSTOMER NPCS & CHECK BREAD SALES
      const updatedCustomers = customersRef.current.map((cust) => {
        // Proximity check: if player is within 38px of customer, sell bread!
        const distToPlayer = Math.hypot(p.x - cust.x, p.y - cust.y)
        const currentBread = player?.bread_count || 0

        if (distToPlayer < 38 && now - cust.talkCooldown > 4000) {
          if (!cust.satisfied && currentBread >= cust.demandBread) {
            // Sell bread to customer!
            cust.satisfied = true
            cust.talkCooldown = now
            addReward(cust.rewardXp, cust.rewardCoins, `Pão Vendido para ${cust.name}! 🥖`)
            // Deduct bread
            if (player) {
              bakeBread(-cust.demandBread).catch(() => {})
            }
            playSfx(523, 1046, 0.2, 'triangle')
            toast({
              title: `🎉 ${cust.name} comprou o pão!`,
              description: `Você recebeu +${cust.rewardCoins} Moedas e +${cust.rewardXp} XP!`,
              className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
            })

            // Reset after 10s to demand more bread
            setTimeout(() => {
              setCustomers((prev) =>
                prev.map((c) => (c.id === cust.id ? { ...c, satisfied: false } : c)),
              )
            }, 10000)
          } else if (!cust.satisfied && currentBread < cust.demandBread) {
            cust.talkCooldown = now
            playSfx(250, 200, 0.08)
            toast({
              title: `💬 ${cust.name}:`,
              description: `"Olá aventureiro! Gostaria de comprar ${cust.demandBread} pão(es) quentinhos. Asse no forno para me atender!"`,
              className: 'bg-amber-50 border-amber-300 text-amber-950 font-bold',
            })
          }
        }

        // Gentle wandering
        const cdx = cust.targetX - cust.x
        const cdy = cust.targetY - cust.y
        const cdist = Math.hypot(cdx, cdy)
        if (cdist > 2) {
          cust.x += (cdx / cdist) * cust.speed
          cust.y += (cdy / cdist) * cust.speed
        } else {
          // Pick new wandering target nearby
          cust.targetX = cust.x + (Math.random() - 0.5) * 80
          cust.targetY = cust.y + (Math.random() - 0.5) * 60
        }

        return cust
      })
      customersRef.current = updatedCustomers

      // 4. DRAW RPG WORLD MAP ON CANVAS
      ctx.clearRect(0, 0, w, h)

      // Base lush grassland with soft warm tones
      const grad = ctx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, '#E8F5E9')
      grad.addColorStop(0.5, '#C8E6C9')
      grad.addColorStop(1, '#A5D6A7')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Cobblestone town pathways connecting zones
      ctx.strokeStyle = '#D7CCC8'
      ctx.lineWidth = 32
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Path from Farm -> Town Center -> Bakery -> Market -> Road
      ctx.beginPath()
      ctx.moveTo(180, 200)
      ctx.lineTo(450, 320)
      ctx.lineTo(480, 150)
      ctx.moveTo(450, 320)
      ctx.lineTo(720, 220)
      ctx.moveTo(450, 320)
      ctx.lineTo(750, 440)
      ctx.stroke()

      // Pathway inner border
      ctx.strokeStyle = '#EFEBE9'
      ctx.lineWidth = 24
      ctx.stroke()

      // Town Plaza Center Circle
      ctx.beginPath()
      ctx.arc(450, 320, 52, 0, Math.PI * 2)
      ctx.fillStyle = '#EFEBE9'
      ctx.fill()
      ctx.strokeStyle = '#BCAAA4'
      ctx.lineWidth = 3
      ctx.stroke()

      // 5. DRAW WORLD ZONES (PORTALS)
      WORLD_ZONES.forEach((zone) => {
        const isHoveredZone = Math.hypot(p.x - zone.x, p.y - zone.y) < zone.radius

        // Zone area background
        ctx.beginPath()
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2)
        ctx.fillStyle = isHoveredZone ? 'rgba(255, 238, 88, 0.3)' : 'rgba(255, 255, 255, 0.4)'
        ctx.fill()
        ctx.strokeStyle = isHoveredZone ? '#FFB74D' : '#8BC34A'
        ctx.lineWidth = isHoveredZone ? 3 : 2
        ctx.stroke()

        // Zone building / icon
        ctx.font = '36px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(zone.icon, zone.x, zone.y - 10)

        // Zone label badge
        ctx.fillStyle = '#3E2723'
        ctx.font = 'bold 12px Nunito, sans-serif'
        ctx.fillText(zone.name, zone.x, zone.y + 24)

        if (isHoveredZone) {
          ctx.fillStyle = '#D84315'
          ctx.font = '900 10px Nunito, sans-serif'
          ctx.fillText('TOQUE NO BOTÃO PARA ENTRAR', zone.x, zone.y + 38)
        }
      })

      // 6. DRAW SOJA COLLECTIBLES ON THE GROUND
      updatedCollectibles.forEach((soy) => {
        if (!soy.collected) {
          const bob = Math.sin(time * 0.005 + soy.x) * 3

          // Glow shadow
          ctx.beginPath()
          ctx.arc(soy.x, soy.y + 4, 10, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
          ctx.fill()

          // Plant icon & sprout
          ctx.font = '22px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('🌱', soy.x, soy.y - 4 + bob)

          // "Soja" text
          ctx.fillStyle = '#1B5E20'
          ctx.font = 'bold 9px Nunito, sans-serif'
          ctx.fillText('Soja', soy.x, soy.y + 16 + bob)
        }
      })

      // 7. DRAW CUSTOMER NPCS WITH SPEECH BUBBLES
      updatedCustomers.forEach((cust) => {
        // Shadow
        ctx.beginPath()
        ctx.ellipse(cust.x, cust.y + 12, 10, 4, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
        ctx.fill()

        // NPC avatar
        ctx.font = '24px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cust.avatar, cust.x, cust.y)

        // Customer Name
        ctx.fillStyle = '#3E2723'
        ctx.font = 'bold 10px Nunito, sans-serif'
        ctx.fillText(cust.name, cust.x, cust.y + 18)

        // Speech bubble with order
        const bubbleY = cust.y - 26
        ctx.fillStyle = cust.satisfied ? '#E8F5E9' : '#FFF9C4'
        ctx.strokeStyle = cust.satisfied ? '#4CAF50' : '#FBC02D'
        ctx.lineWidth = 1.5

        ctx.beginPath()
        ctx.roundRect(cust.x - 30, bubbleY - 10, 60, 18, 6)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = cust.satisfied ? '#2E7D32' : '#E65100'
        ctx.font = '900 9px Nunito, sans-serif'
        ctx.fillText(
          cust.satisfied ? 'Obrigado! ✓' : `Pede: ${cust.demandBread}x 🥖`,
          cust.x,
          bubbleY,
        )
      })

      // 8. DRAW HIRED WORKERS WALKING NEAR FARM
      if (workersCount > 0) {
        for (let w = 0; w < Math.min(workersCount, 4); w++) {
          const wphase = time * 0.0015 + (w * Math.PI) / 2
          const wx = 180 + Math.cos(wphase) * (40 + w * 12)
          const wy = 230 + Math.sin(wphase) * (30 + w * 10)

          // Shadow
          ctx.beginPath()
          ctx.ellipse(wx, wy + 8, 8, 3, 0, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.14)'
          ctx.fill()

          ctx.font = '18px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('🧑‍🌾', wx, wy)
        }
      }

      // 9. DRAW PLAYER CHARACTER (ALWAYS WALKING TOWARDS TARGET)
      const px = p.x
      const py = p.y
      const bobY = isMovingRef.current ? Math.sin(walkFrameRef.current * 2) * 2.5 : 0

      // Destination pointer marker if currently moving
      if (isMovingRef.current && dist > 10) {
        ctx.beginPath()
        ctx.arc(target.x, target.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 183, 77, 0.6)'
        ctx.fill()
        ctx.strokeStyle = '#E65100'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Player Shadow
      ctx.beginPath()
      ctx.ellipse(px, py + 14, 12, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fill()

      // Player Body / Sprite (cute RPG hero with backpack & hat)
      ctx.save()
      ctx.translate(px, py + bobY)
      if (facingRef.current === 'left') {
        ctx.scale(-1, 1)
      }

      // Backpack
      ctx.fillStyle = '#8D6E63'
      ctx.beginPath()
      ctx.roundRect(-12, -4, 6, 12, 2)
      ctx.fill()

      // Torso / Tunic
      ctx.fillStyle = '#8BC34A'
      ctx.beginPath()
      ctx.roundRect(-6, -6, 12, 14, 3)
      ctx.fill()
      ctx.strokeStyle = '#558B2F'
      ctx.lineWidth = 1
      ctx.stroke()

      // Head
      ctx.beginPath()
      ctx.arc(0, -12, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#FFCC80'
      ctx.fill()

      // Explorer Hat
      ctx.beginPath()
      ctx.ellipse(0, -18, 11, 4, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#FFB74D'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, -19, 6, Math.PI, 0)
      ctx.fillStyle = '#FFA726'
      ctx.fill()

      // Face eye
      ctx.fillStyle = '#3E2723'
      ctx.beginPath()
      ctx.arc(3, -12, 1.2, 0, Math.PI * 2)
      ctx.fill()

      // Walking feet
      const legOffset = isMovingRef.current ? Math.sin(walkFrameRef.current * 4) * 4 : 0
      ctx.fillStyle = '#3E2723'
      ctx.fillRect(-4, 8 + legOffset, 3, 5)
      ctx.fillRect(1, 8 - legOffset, 3, 5)

      ctx.restore()

      // Player Name Tag & Level
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.beginPath()
      ctx.roundRect(px - 36, py - 38, 72, 14, 4)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 9px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Você (Nível ${player?.level || 1})`, px, py - 28)

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [player, harvestCrop, bakeBread, addReward, playSfx])

  // Current zone player is in (if within radius)
  const activeZone = WORLD_ZONES.find((z) => {
    const dist = Math.hypot(playerPosRef.current.x - z.x, playerPosRef.current.y - z.y)
    return dist < z.radius
  })

  return (
    <AuthGate>
      <div className="space-y-4 pb-12 animate-fade-in select-none">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-[#3E2723]/20 font-black hover:bg-amber-100 text-[#3E2723]"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Hub
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#3E2723] flex items-center gap-2">
                <Compass className="w-6 h-6 text-[#8BC34A]" /> Mundo RPG da Fazenda
              </h1>
              <p className="text-xs text-[#795548] font-bold">
                Caminhe pelo mundo, colete soja no chão, asse pão e atenda os clientes da vila!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="rounded-2xl text-[#795548]"
              title={soundEnabled ? 'Silenciar Efeitos' : 'Ativar Efeitos'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Link to="/fazenda">
              <Button className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-2xl text-xs h-10">
                <Tractor className="w-4 h-4 mr-1.5" /> Abrir Fazenda Completa
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Resource & Action Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Soja no Celeiro */}
          <div className="bg-[#FFF9F0] border-2 border-emerald-300 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <span className="text-2xl">🌱</span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                Soja Coletada
              </span>
              <span className="text-lg font-black text-[#2E7D32] tabular-nums">
                {sojaCount} un.
              </span>
            </div>
          </div>

          {/* Pães no Estoque */}
          <div className="bg-[#FFF9F0] border-2 border-amber-300 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <span className="text-2xl">🥖</span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                Pães Assados
              </span>
              <span className="text-lg font-black text-[#D84315] tabular-nums">
                {breadCount} un.
              </span>
            </div>
          </div>

          {/* Trabalhadores Ativos */}
          <div className="bg-[#FFF9F0] border-2 border-blue-300 rounded-2xl p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧑‍🌾</span>
              <div>
                <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                  Ajudantes
                </span>
                <span className="text-lg font-black text-[#1976D2] tabular-nums">
                  {workersCount}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleHireWorkerDirect}
              disabled={hiringLoading || (player?.coins || 0) < nextWorkerCost}
              className="h-8 text-[11px] font-black bg-[#1976D2] hover:bg-[#1565C0] text-white rounded-xl px-2"
              title="Contratar Ajudante para colheita automática"
            >
              + (🪙{nextWorkerCost})
            </Button>
          </div>

          {/* Forno Rápido (Transformar Soja em Pão) */}
          <div className="bg-[#FFF9F0] border-2 border-orange-300 rounded-2xl p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <div>
                <span className="text-[10px] font-black uppercase text-[#795548] tracking-wider block">
                  Assar Pão
                </span>
                <span className="text-[11px] font-bold text-[#795548]">2 Sojas = 1 Pão</span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleQuickBake(1)}
              disabled={bakingQuick || (sojaCount < 2 && trigoCount < 2)}
              className="h-8 text-[11px] font-black bg-[#D84315] hover:bg-[#BF360C] text-white rounded-xl px-2"
            >
              {bakingQuick ? 'Assando...' : 'Assar 1x 🥖'}
            </Button>
          </div>
        </div>

        {/* RPG Interactive Canvas */}
        <div className="relative rounded-3xl overflow-hidden border-4 border-[#33691E] shadow-2xl bg-[#E8F5E9]">
          <canvas
            ref={canvasRef}
            width={900}
            height={520}
            onClick={(e) => handleCanvasInteraction(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                const t = e.touches[0]
                handleCanvasInteraction(t.clientX, t.clientY)
              }
            }}
            className="w-full h-[380px] sm:h-[520px] block cursor-pointer touch-none"
          />

          {/* On-screen touch guidance pill */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-2 pointer-events-none">
            <span>🕹️ Toque no chão para caminhar</span>
            <span>•</span>
            <span>Toque na Soja 🌱 ou nos Clientes 👥</span>
          </div>

          {/* Active Zone Enter Banner (Bottom of Canvas) */}
          {activeZone && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border-2 border-[#8BC34A] rounded-2xl p-3 sm:p-4 shadow-xl flex items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeZone.icon}</span>
                <div>
                  <div className="text-xs font-black uppercase text-[#2E7D32] tracking-wider">
                    Você chegou em:
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#3E2723]">
                    {activeZone.name}
                  </h3>
                  <p className="text-xs text-[#795548] font-bold hidden sm:block">
                    {activeZone.desc}
                  </p>
                </div>
              </div>

              <Link to={activeZone.route}>
                <Button className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-xs sm:text-sm py-4 px-5 rounded-xl shadow-md flex items-center gap-1.5 shrink-0">
                  <span>Entrar no Local</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Instructions / Gameplay Loop Card */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-4 text-xs text-[#795548] space-y-1 font-bold">
          <p className="flex items-center gap-1.5 font-black text-[#3E2723]">
            <HelpCircle className="w-4 h-4 text-[#8BC34A]" /> Como Funciona o Ciclo do Mundo RPG:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-2 leading-relaxed">
            <li>
              <strong>Caminhada Contínua:</strong> Toque em qualquer ponto do mapa e seu personagem
              andará suavemente até lá.
            </li>
            <li>
              <strong>Coleta de Soja:</strong> Toque ou passe por cima das plantações de Soja 🌱 no
              chão para coletá-las imediatamente.
            </li>
            <li>
              <strong>Forno & Padaria:</strong> Use o botão "Assar 1x" no topo para transformar 2
              Sojas (ou 2 Trigos) em pães aromáticos.
            </li>
            <li>
              <strong>Clientes Compram Pão:</strong> Aproxime-se dos moradores da vila (Dona Maria,
              Ferreiro João, Sofia) para entregar os pães e faturar Moedas e XP!
            </li>
            <li>
              <strong>Contratar Ajudantes:</strong> Use o ouro arrecadado para contratar mais
              trabalhadores que colhem sozinhos enquanto você explora.
            </li>
          </ul>
        </div>
      </div>
    </AuthGate>
  )
}
