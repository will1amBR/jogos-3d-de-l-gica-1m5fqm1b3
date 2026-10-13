import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Tractor,
  ArrowLeft,
  Sparkles,
  Store,
  PlusCircle,
  Check,
  Flame,
  Users,
  ShoppingBag,
  Coins,
  TrendingUp,
  CheckCircle2,
  PackageCheck,
  Wrench,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Farm3DCanvas, type PlotData } from '@/components/Farm3DCanvas'
import { CROPS, type CropType, getWorkerHireCost, UPGRADES } from '@/types/game'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export default function Fazenda() {
  const {
    player,
    inventory,
    upgrades,
    customerOrders,
    harvestCrop,
    sellAllInventory,
    unlockPlots,
    addReward,
    hireWorker,
    bakeBread,
    deliverCustomerOrder,
  } = useGame()

  const [selectedSeed, setSelectedSeed] = useState<CropType>('soja')
  const [marketOpen, setMarketOpen] = useState(false)
  const [bakeryOpen, setBakeryOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [selling, setSelling] = useState(false)
  const [baking, setBaking] = useState(false)
  const [deliveringId, setDeliveringId] = useState<string | null>(null)

  const unlockedCount = player?.farm_plots_unlocked || 6
  const dailyMultiplier = player?.farm_daily_price_multiplier || 1.15
  const workersCount = player?.hired_workers || 0
  const breadCount = player?.bread_count || 0
  const bakeryLevel = upgrades.bakery || 0
  const fasterToolsLevel = upgrades.faster_tools || 0
  const speedBonusMultiplier = 1.0 - fasterToolsLevel * 0.1 // 10% faster per level

  // 24 slots maximum
  const [plots, setPlots] = useState<PlotData[]>(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      crop: i < 3 ? (i === 2 ? 'soja' : 'milho') : null,
      plantedAt: i < 3 ? Date.now() - 4000 : null,
      growDuration: 8,
    }))
  })

  // Expansion costs
  const expansionTiers = [
    { target: 12, cost: 250 },
    { target: 18, cost: 500 },
    { target: 24, cost: 1000 },
  ]
  const nextTier = expansionTiers.find((t) => t.target > unlockedCount)
  const nextWorkerCost = getWorkerHireCost(workersCount)

  // Auto-harvest / speed-up periodic effect from hired workers
  // Each worker periodically checks for mature crops and harvests one
  const lastWorkerHarvestRef = useRef<number>(Date.now())

  useEffect(() => {
    if (workersCount <= 0) return

    const interval = setInterval(() => {
      const now = Date.now()
      // Interval speeds up with more workers: e.g. 5s for 1 worker, 3s for 2, 2s for 3+
      const cooldownMs = Math.max(2000, 6000 / workersCount)

      if (now - lastWorkerHarvestRef.current >= cooldownMs) {
        lastWorkerHarvestRef.current = now

        // Find first plot that is mature and harvest it
        setPlots((prevPlots) => {
          let harvestTargetIndex = -1
          for (let i = 0; i < unlockedCount; i++) {
            const p = prevPlots[i]
            if (p.crop && p.plantedAt) {
              const elapsed = (now - p.plantedAt) / 1000
              if (elapsed >= p.growDuration) {
                harvestTargetIndex = i
                break
              }
            }
          }

          if (harvestTargetIndex !== -1) {
            const plot = prevPlots[harvestTargetIndex]
            const cropType = plot.crop!
            // Clear plot
            const next = [...prevPlots]
            next[harvestTargetIndex] = {
              id: harvestTargetIndex,
              crop: null,
              plantedAt: null,
              growDuration: 0,
            }

            // Execute harvest in background
            harvestCrop(cropType).then(() => {
              toast({
                title: '🧑‍🌾 Trabalhador em Ação!',
                description: `Seu ajudante colheu ${CROPS[cropType].name} automaticamente!`,
                className: 'bg-emerald-50 border-emerald-300 text-emerald-900 text-xs',
              })
            })
            return next
          }

          return prevPlots
        })
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [workersCount, unlockedCount, harvestCrop])

  const handlePlotClick = async (plotIndex: number) => {
    if (plotIndex >= unlockedCount) {
      toast({
        title: 'Lote Bloqueado!',
        description: `Expanda sua fazenda para liberar este lote.`,
        variant: 'destructive',
      })
      return
    }

    const plot = plots[plotIndex]
    const now = Date.now()

    // 1. If empty -> Plant selected seed
    if (!plot.crop) {
      const seedCfg = CROPS[selectedSeed]
      const currentCoins = player?.coins || 0

      if (currentCoins < seedCfg.seedPrice) {
        toast({
          title: 'Moedas insuficientes!',
          description: `Você precisa de ${seedCfg.seedPrice} moedas para a semente de ${seedCfg.name}.`,
          variant: 'destructive',
        })
        return
      }

      await addReward(0, -seedCfg.seedPrice, `Compra de Semente: ${seedCfg.name}`)

      // Apply faster tools upgrade
      const adjustedDuration = Math.max(
        2,
        Math.round(seedCfg.growTimeSeconds * speedBonusMultiplier),
      )

      setPlots((prev) => {
        const next = [...prev]
        next[plotIndex] = {
          id: plotIndex,
          crop: selectedSeed,
          plantedAt: now,
          growDuration: adjustedDuration,
        }
        return next
      })

      toast({
        title: '🌱 Semente Plantada!',
        description: `${seedCfg.name} plantado no Lote #${plotIndex + 1} (${adjustedDuration}s).`,
      })
      return
    }

    // 2. If planted -> Check if ready to harvest
    if (plot.crop && plot.plantedAt) {
      const elapsed = (now - plot.plantedAt) / 1000
      if (elapsed >= plot.growDuration) {
        const harvestedCrop = plot.crop
        // Clear plot
        setPlots((prev) => {
          const next = [...prev]
          next[plotIndex] = {
            id: plotIndex,
            crop: null,
            plantedAt: null,
            growDuration: 0,
          }
          return next
        })

        await harvestCrop(harvestedCrop)
      } else {
        const remaining = Math.ceil(plot.growDuration - elapsed)
        toast({
          title: 'Ainda crescendo...',
          description: `Faltam ${remaining} segundos para colher este vegetal.`,
        })
      }
    }
  }

  const handleExpand = async () => {
    if (!nextTier) return
    await unlockPlots(nextTier.cost, nextTier.target)
  }

  const handleHireWorker = async () => {
    await hireWorker()
  }

  const handleBakeBread = async (qty: number) => {
    setBaking(true)
    try {
      await bakeBread(qty)
    } finally {
      setBaking(false)
    }
  }

  const handleDeliver = async (order: any) => {
    setDeliveringId(order.id)
    try {
      await deliverCustomerOrder(order)
    } finally {
      setDeliveringId(null)
    }
  }

  const handleSellAll = async () => {
    setSelling(true)
    try {
      const res = await sellAllInventory()
      if (res.soldCount === 0) {
        toast({
          title: 'Estoque Vazio!',
          description: 'Você não tem colheitas para vender no mercado.',
        })
      } else {
        toast({
          title: '💰 Venda Concluída com Sucesso!',
          description: `Você vendeu ${res.soldCount} colheitas por ${res.coinsEarned} moedas e ganhou +${res.xpEarned} XP!`,
          className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
        })
        setMarketOpen(false)
      }
    } finally {
      setSelling(false)
    }
  }

  // Count available trigo and bread
  const trigoCount = inventory.find((i) => i.crop_type === 'trigo')?.quantity || 0
  const sojaCount = inventory.find((i) => i.crop_type === 'soja')?.quantity || 0

  return (
    <AuthGate>
      <div className="space-y-6 pb-12 animate-fade-in">
        {/* Navigation & Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-[#3E2723]/20 text-[#3E2723] hover:bg-amber-100 font-black"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Hub
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#3E2723] flex items-center gap-2">
                <Tractor className="w-7 h-7 text-[#8BC34A]" /> Fazenda Encantada
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Plante, colha soja e trigo, asse pão e atenda clientes para lucrar!
              </p>
            </div>
          </div>

          {/* Action Bar Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/mundo">
              <Button
                type="button"
                className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-black rounded-2xl shadow-sm text-xs sm:text-sm h-11 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Mundo RPG Andável 🚶
              </Button>
            </Link>

            <Button
              type="button"
              onClick={() => setOrdersOpen(true)}
              className="bg-[#FF9800] hover:bg-[#F57C00] text-white font-black rounded-2xl shadow-sm text-xs sm:text-sm h-11 relative transition-transform active:scale-95"
            >
              <PackageCheck className="w-4 h-4 mr-1.5" />
              Pedidos ({customerOrders.length})
              {customerOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                  {customerOrders.length}
                </span>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => setBakeryOpen(true)}
              className="bg-[#D84315] hover:bg-[#BF360C] text-white font-black rounded-2xl shadow-sm text-xs sm:text-sm h-11 transition-transform active:scale-95"
            >
              <Flame className="w-4 h-4 mr-1.5" />
              Forno de Pão {bakeryLevel > 0 ? `(Nível ${bakeryLevel})` : '(Bloqueado)'}
            </Button>

            <Link to="/melhorias">
              <Button
                type="button"
                variant="outline"
                className="border-2 border-[#8BC34A] text-[#2E7D32] hover:bg-green-50 font-black rounded-2xl shadow-sm text-xs sm:text-sm h-11 transition-transform active:scale-95"
              >
                <Wrench className="w-4 h-4 mr-1.5" />
                Melhorias
              </Button>
            </Link>

            <Button
              type="button"
              onClick={() => setMarketOpen(true)}
              className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-2xl shadow-sm text-xs sm:text-sm h-11 transition-transform active:scale-95"
            >
              <Store className="w-4 h-4 mr-1.5" />
              Mercado ({dailyMultiplier.toFixed(2)}x)
            </Button>
          </div>
        </div>

        {/* Top Summary Bar: Workers + Bread + Expand */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Workers Card */}
          <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#795548] uppercase">
                  Trabalhadores Ativos
                </div>
                <div className="text-base font-black text-[#1976D2]">
                  {workersCount} Contratado{workersCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleHireWorker}
              className="bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-black rounded-xl h-9"
            >
              + Contratar (🪙 {nextWorkerCost})
            </Button>
          </div>

          {/* Bread Counter Card */}
          <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 text-xl">
                🥖
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#795548] uppercase">
                  Estoque de Pães
                </div>
                <div className="text-base font-black text-[#D84315] tabular-nums">
                  {breadCount} pães assados
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setBakeryOpen(true)}
              className="bg-[#D84315] hover:bg-[#BF360C] text-white text-xs font-black rounded-xl h-9"
            >
              Assar Mais
            </Button>
          </div>

          {/* Expand Plot Card */}
          <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#795548] uppercase">
                  Lotes da Fazenda
                </div>
                <div className="text-base font-black text-[#2E7D32]">
                  {unlockedCount} de 24 Lotes
                </div>
              </div>
            </div>
            {nextTier ? (
              <Button
                size="sm"
                onClick={handleExpand}
                className="bg-[#FFB74D] hover:bg-[#FFA726] text-[#3E2723] text-xs font-black rounded-xl h-9"
              >
                + {nextTier.target} Lotes (🪙 {nextTier.cost})
              </Button>
            ) : (
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                Máximo!
              </span>
            )}
          </div>
        </div>

        {/* 3D Isometric Canvas View */}
        <Farm3DCanvas
          plots={plots}
          unlockedCount={unlockedCount}
          selectedSeed={selectedSeed}
          dailyMultiplier={dailyMultiplier}
          workersCount={workersCount}
          hasBakery={bakeryLevel > 0}
          onPlotClick={handlePlotClick}
        />

        {/* Seed Selection Bar (including Soja) */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8BC34A]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#3E2723]">
                Bolsa de Sementes Mágicas (5 Opções com Soja)
              </h2>
            </div>
            <span className="text-xs text-[#795548] font-bold">
              Ferramentas Ágeis: -{fasterToolsLevel * 10}% no tempo de crescimento
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.values(CROPS).map((crop) => {
              const isSelected = selectedSeed === crop.type
              const actualGrow = Math.max(
                2,
                Math.round(crop.growTimeSeconds * speedBonusMultiplier),
              )
              return (
                <button
                  key={crop.type}
                  type="button"
                  onClick={() => setSelectedSeed(crop.type)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#8BC34A] bg-[#F1F8E9] shadow-md scale-102 ring-2 ring-[#8BC34A]/30'
                      : 'border-[#3E2723]/10 bg-white hover:border-[#8BC34A]/50'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-[#8BC34A] text-white rounded-full flex items-center justify-center text-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                  {crop.type === 'soja' && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500 text-white rounded-md text-[9px] font-black uppercase">
                      NOVA!
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl">{crop.icon}</span>
                    <div>
                      <div className="text-sm font-black text-[#3E2723] leading-tight">
                        {crop.name}
                      </div>
                      <div className="text-[11px] font-bold text-[#795548]">
                        Cresce em {actualGrow}s
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#3E2723]/10 text-xs">
                    <span className="font-extrabold text-[#E65100]">🪙 {crop.seedPrice}</span>
                    <span className="font-black text-[#2E7D32]">+{crop.xpReward} XP</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Township-Style Customer Orders Panel (Floating/Collapsible) */}
        <div className="bg-[#FFF9F0] border-2 border-[#FF9800]/40 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">📦</span>
              <div>
                <h2 className="text-base font-black text-[#3E2723]">
                  Pedidos dos Clientes da Cidade (Township)
                </h2>
                <p className="text-xs text-[#795548] font-bold">
                  Entregue pães e vegetais solicitados para receber moedas e XP!
                </p>
              </div>
            </div>
            <span className="text-xs font-black bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
              {customerOrders.length} Pedido{customerOrders.length !== 1 ? 's' : ''} Pendente
              {customerOrders.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {customerOrders.map((order) => {
              const isBread = order.item_type === 'pao'
              const currentStock = isBread
                ? breadCount
                : inventory.find((i) => i.crop_type === order.item_type)?.quantity || 0
              const hasEnough = currentStock >= order.quantity_required
              const itemIcon = isBread ? '🥖' : CROPS[order.item_type as CropType]?.icon || '📦'
              const itemName = isBread
                ? 'Pão Quentinho'
                : CROPS[order.item_type as CropType]?.name || order.item_type

              return (
                <div
                  key={order.id}
                  className="bg-white border-2 border-amber-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    {/* Customer header */}
                    <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-amber-100">
                      <span className="text-2xl">{order.customer_avatar || '🧑'}</span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-black text-[#3E2723] truncate">
                          {order.customer_name}
                        </div>
                        <div className="text-[10px] text-[#795548] font-bold">
                          Cliente da Cidade
                        </div>
                      </div>
                    </div>

                    {/* Order requirement */}
                    <div className="p-2.5 bg-amber-50 rounded-xl mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{itemIcon}</span>
                        <div>
                          <div className="text-xs font-black text-[#3E2723]">{itemName}</div>
                          <div className="text-[11px] font-bold text-[#795548]">
                            Precisa de: <strong>{order.quantity_required} un.</strong>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-full ${
                            hasEnough
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {currentStock} / {order.quantity_required}
                        </span>
                      </div>
                    </div>

                    {/* Reward */}
                    <div className="flex items-center justify-between text-xs font-black mb-3 text-[#3E2723]">
                      <span className="text-[#E65100]">🪙 +{order.reward_coins} moedas</span>
                      <span className="text-[#2E7D32]">🌟 +{order.reward_xp} XP</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDeliver(order)}
                    disabled={!hasEnough || deliveringId === order.id}
                    className={`w-full font-black rounded-xl text-xs h-10 ${
                      hasEnough
                        ? 'bg-[#8BC34A] hover:bg-[#7CB342] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {deliveringId === order.id
                      ? 'Entregando...'
                      : hasEnough
                        ? 'Entregar Pedido! 📦'
                        : 'Faltam Recursos'}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Farm Inventory Summary */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#3E2723] mb-3">
            Seu Celeiro (Estoque de Colheitas e Pães)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {Object.values(CROPS).map((crop) => {
              const invItem = inventory.find((i) => i.crop_type === crop.type)
              const count = invItem?.quantity || 0
              return (
                <div
                  key={crop.type}
                  className="p-3 bg-white border border-[#3E2723]/10 rounded-2xl flex items-center gap-3"
                >
                  <span className="text-3xl">{crop.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-[#795548] leading-tight">
                      {crop.name}
                    </div>
                    <div className="text-lg font-black text-[#3E2723] tabular-nums">
                      {count} un.
                    </div>
                  </div>
                </div>
              )
            })}
            {/* Bread inventory slot */}
            <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center gap-3">
              <span className="text-3xl">🥖</span>
              <div>
                <div className="text-xs font-bold text-amber-900 leading-tight">Pão Quentinho</div>
                <div className="text-lg font-black text-amber-950 tabular-nums">
                  {breadCount} un.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bakery Modal */}
        {bakeryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#FFF9F0] border-4 border-[#D84315] rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[#D84315] text-2xl">
                    🥖
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#3E2723]">Forno do Padeiro</h3>
                    <p className="text-xs text-[#795548] font-bold">
                      {bakeryLevel > 0
                        ? `Forno Nível ${bakeryLevel} • 2 Trigos produzem 1 Pão quentinho`
                        : 'Desbloqueie na Loja de Melhorias!'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBakeryOpen(false)}
                  className="w-8 h-8 rounded-full bg-amber-100 text-[#3E2723] font-black hover:bg-amber-200 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {bakeryLevel === 0 ? (
                <div className="p-6 bg-white rounded-2xl border border-amber-200 text-center space-y-3 mb-4">
                  <span className="text-4xl block">🔒</span>
                  <h4 className="text-base font-black text-[#3E2723]">
                    Forno do Padeiro Bloqueado
                  </h4>
                  <p className="text-xs text-[#795548]">
                    Para começar a assar pães e atender os clientes da cidade, visite a Loja de
                    Melhorias e adquira o primeiro nível do Forno!
                  </p>
                  <Link to="/melhorias">
                    <Button className="bg-[#D84315] hover:bg-[#BF360C] text-white font-black rounded-xl text-xs mt-2">
                      Ir para Loja de Melhorias
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-white rounded-2xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#795548]">
                      <span>Seu Trigo em Estoque:</span>
                      <strong className="text-base text-[#3E2723]">{trigoCount} un.</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#795548]">
                      <span>Pães no Estoque:</span>
                      <strong className="text-base text-[#D84315]">{breadCount} un.</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleBakeBread(1)}
                      disabled={baking || trigoCount < 2}
                      className="bg-[#D84315] hover:bg-[#BF360C] text-white font-black rounded-2xl h-14 flex flex-col justify-center items-center text-xs"
                    >
                      <span>Assar 1 Pão</span>
                      <span className="text-[10px] font-normal opacity-90">Custa 2 Trigos</span>
                    </Button>

                    <Button
                      onClick={() => handleBakeBread(3)}
                      disabled={baking || trigoCount < 6}
                      className="bg-[#BF360C] hover:bg-[#8D2600] text-white font-black rounded-2xl h-14 flex flex-col justify-center items-center text-xs"
                    >
                      <span>Fornada Rápida (3x Pães)</span>
                      <span className="text-[10px] font-normal opacity-90">Custa 6 Trigos</span>
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setBakeryOpen(false)}
                className="w-full rounded-2xl border-[#3E2723]/20 font-black h-11"
              >
                Voltar à Fazenda
              </Button>
            </div>
          </div>
        )}

        {/* Customer Orders Modal (from Header quick button) */}
        {ordersOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#FFF9F0] border-4 border-[#FF9800] rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
                    📦
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#3E2723]">Central de Entregas</h3>
                    <p className="text-xs text-[#795548] font-bold">
                      Atenda aos pedidos dos moradores da vila e ganhe muito ouro!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOrdersOpen(false)}
                  className="w-8 h-8 rounded-full bg-amber-100 text-[#3E2723] font-black hover:bg-amber-200 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {customerOrders.map((order) => {
                  const isBread = order.item_type === 'pao'
                  const currentStock = isBread
                    ? breadCount
                    : inventory.find((i) => i.crop_type === order.item_type)?.quantity || 0
                  const hasEnough = currentStock >= order.quantity_required
                  const itemIcon = isBread ? '🥖' : CROPS[order.item_type as CropType]?.icon || '📦'
                  const itemName = isBread
                    ? 'Pão Quentinho'
                    : CROPS[order.item_type as CropType]?.name || order.item_type

                  return (
                    <div
                      key={order.id}
                      className="p-3.5 bg-white rounded-2xl border-2 border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{order.customer_avatar || '🧑'}</span>
                        <div>
                          <div className="text-sm font-black text-[#3E2723]">
                            {order.customer_name}
                          </div>
                          <div className="text-xs font-bold text-[#795548] flex items-center gap-2 mt-0.5">
                            <span>
                              Pede: <strong>{order.quantity_required}x</strong> {itemIcon}{' '}
                              {itemName}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                hasEnough
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              Estoque: {currentStock}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <div className="text-sm font-black text-[#E65100]">
                            🪙 {order.reward_coins}
                          </div>
                          <div className="text-[10px] font-black text-[#2E7D32]">
                            +{order.reward_xp} XP
                          </div>
                        </div>

                        <Button
                          onClick={() => handleDeliver(order)}
                          disabled={!hasEnough || deliveringId === order.id}
                          className={`font-black rounded-xl text-xs h-10 px-4 ${
                            hasEnough
                              ? 'bg-[#8BC34A] hover:bg-[#7CB342] text-white'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {deliveringId === order.id
                            ? 'Entregando...'
                            : hasEnough
                              ? 'Entregar'
                              : 'Faltam Itens'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => setOrdersOpen(false)}
                className="w-full rounded-2xl border-[#3E2723]/20 font-black h-11"
              >
                Fechar Painel
              </Button>
            </div>
          </div>
        )}

        {/* Market Modal */}
        {marketOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-[#2E7D32]">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#3E2723]">Mercado de Produtores</h3>
                    <p className="text-xs text-[#795548] font-bold">
                      Cotação de hoje:{' '}
                      <span className="text-[#2E7D32] font-black">
                        {(dailyMultiplier * (1.0 + (upgrades.sell_bonus || 0) * 0.08)).toFixed(2)}x
                        com bônus
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMarketOpen(false)}
                  className="w-8 h-8 rounded-full bg-amber-100 text-[#3E2723] font-black hover:bg-amber-200 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Items listing */}
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {Object.values(CROPS).map((crop) => {
                  const invItem = inventory.find((i) => i.crop_type === crop.type)
                  const count = invItem?.quantity || 0
                  const sellMult = dailyMultiplier * (1.0 + (upgrades.sell_bonus || 0) * 0.08)
                  const unitPrice = Math.round(crop.baseSellPrice * sellMult)
                  const total = count * unitPrice

                  return (
                    <div
                      key={crop.type}
                      className="p-3 bg-white rounded-2xl border border-amber-200/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{crop.icon}</span>
                        <div>
                          <div className="text-sm font-black text-[#3E2723]">{crop.name}</div>
                          <div className="text-[11px] text-[#795548] font-bold">
                            {count} em estoque • {unitPrice} moedas cada
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-[#E65100] tabular-nums">
                          🪙 {total}
                        </div>
                        <div className="text-[10px] text-[#2E7D32] font-bold">
                          +{Math.round(crop.xpReward * 0.5 * count)} XP
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setMarketOpen(false)}
                  className="flex-1 rounded-2xl border-[#3E2723]/20 font-black h-12"
                >
                  Fechar
                </Button>
                <Button
                  onClick={handleSellAll}
                  disabled={selling}
                  className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-2xl shadow-md h-12 text-sm"
                >
                  {selling ? 'Processando...' : 'Vender Tudo! 💰'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}
