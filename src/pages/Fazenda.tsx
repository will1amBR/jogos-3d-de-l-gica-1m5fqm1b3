import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Tractor,
  Coins,
  ArrowLeft,
  Sparkles,
  Store,
  PlusCircle,
  HelpCircle,
  Check,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Farm3DCanvas, type PlotData } from '@/components/Farm3DCanvas'
import { CROPS, type CropType } from '@/types/game'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export default function Fazenda() {
  const { player, inventory, harvestCrop, sellAllInventory, unlockPlots, addReward } = useGame()
  const [selectedSeed, setSelectedSeed] = useState<CropType>('milho')
  const [marketOpen, setMarketOpen] = useState(false)
  const [selling, setSelling] = useState(false)

  // 24 slots maximum in state
  const unlockedCount = player?.farm_plots_unlocked || 6
  const dailyMultiplier = player?.farm_daily_price_multiplier || 1.15

  // Local state for farm plots (saved or synced in memory while on screen)
  const [plots, setPlots] = useState<PlotData[]>(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      crop: i < 2 ? 'milho' : null,
      plantedAt: i < 2 ? Date.now() - 5000 : null,
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

    // 1. If empty -> Plant selected seed if player can afford it
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

      // Deduct seed cost
      await addReward(0, -seedCfg.seedPrice, `Compra de Semente: ${seedCfg.name}`)

      setPlots((prev) => {
        const next = [...prev]
        next[plotIndex] = {
          id: plotIndex,
          crop: selectedSeed,
          plantedAt: now,
          growDuration: seedCfg.growTimeSeconds,
        }
        return next
      })

      toast({
        title: '🌱 Semente Plantada!',
        description: `${seedCfg.name} plantado no Lote #${plotIndex + 1}.`,
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

        // Give player inventory item + XP
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
    const success = await unlockPlots(nextTier.cost, nextTier.target)
    if (success) {
      // Unlocked
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

  return (
    <AuthGate>
      <div className="space-y-6 pb-12">
        {/* Navigation & Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-[#3E2723]/20 text-[#3E2723] hover:bg-amber-100 font-black"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Hub
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#3E2723] flex items-center gap-2">
                <Tractor className="w-7 h-7 text-[#8BC34A]" /> Fazenda Encantada
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Plante, espere amadurecer e colha para lucrar no mercado!
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {nextTier && (
              <Button
                onClick={handleExpand}
                className="bg-[#FFB74D] hover:bg-[#FFA726] text-[#3E2723] font-black rounded-2xl shadow-sm text-xs sm:text-sm h-11"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Expandir ({nextTier.target} Lotes) • 🪙 {nextTier.cost}
              </Button>
            )}

            <Button
              onClick={() => setMarketOpen(true)}
              className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-2xl shadow-sm text-xs sm:text-sm h-11"
            >
              <Store className="w-4 h-4 mr-1.5" />
              Mercado do Dia ({dailyMultiplier.toFixed(2)}x)
            </Button>
          </div>
        </div>

        {/* 3D Isometric Canvas View */}
        <Farm3DCanvas
          plots={plots}
          unlockedCount={unlockedCount}
          selectedSeed={selectedSeed}
          dailyMultiplier={dailyMultiplier}
          onPlotClick={handlePlotClick}
        />

        {/* Seed Selection Bar */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8BC34A]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#3E2723]">
                Bolsa de Sementes Mágicas
              </h2>
            </div>
            <span className="text-xs text-[#795548] font-bold">
              Selecione uma semente e clique em um lote de terra vazio
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.values(CROPS).map((crop) => {
              const isSelected = selectedSeed === crop.type
              return (
                <button
                  key={crop.type}
                  type="button"
                  onClick={() => setSelectedSeed(crop.type)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#8BC34A] bg-[#F1F8E9] shadow-md scale-102'
                      : 'border-[#3E2723]/10 bg-white hover:border-[#8BC34A]/50'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-[#8BC34A] text-white rounded-full flex items-center justify-center text-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl">{crop.icon}</span>
                    <div>
                      <div className="text-sm font-black text-[#3E2723]">{crop.name}</div>
                      <div className="text-[11px] font-bold text-[#795548]">
                        Cresce em {crop.growTimeSeconds}s
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

        {/* Current Farm Inventory Summary */}
        <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#3E2723] mb-3">
            Seu Celeiro (Estoque de Colheitas)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    <div className="text-xs font-bold text-[#795548]">{crop.name}</div>
                    <div className="text-lg font-black text-[#3E2723] tabular-nums">
                      {count} un.
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

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
                        {dailyMultiplier.toFixed(2)}x sobre o preço base
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
              <div className="space-y-2 mb-6">
                {Object.values(CROPS).map((crop) => {
                  const invItem = inventory.find((i) => i.crop_type === crop.type)
                  const count = invItem?.quantity || 0
                  const unitPrice = Math.round(crop.baseSellPrice * dailyMultiplier)
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
