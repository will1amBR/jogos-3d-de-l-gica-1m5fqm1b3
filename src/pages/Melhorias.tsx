import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wrench,
  Coins,
  ArrowLeft,
  Sparkles,
  Zap,
  CheckCircle2,
  Tractor,
  Flame,
  ArrowUpCircle,
  HelpCircle,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { UPGRADES, getUpgradeCost, type UpgradeId, getWorkerHireCost } from '@/types/game'
import { Button } from '@/components/ui/button'

export default function Melhorias() {
  const { player, upgrades, buyUpgrade, hireWorker } = useGame()
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const currentCoins = player?.coins || 0
  const workersCount = player?.hired_workers || 0
  const workerCost = getWorkerHireCost(workersCount)

  const handleBuy = async (id: UpgradeId) => {
    setBuyingId(id)
    try {
      await buyUpgrade(id)
    } finally {
      setBuyingId(null)
    }
  }

  const handleHire = async () => {
    setBuyingId('worker')
    try {
      await hireWorker()
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <AuthGate>
      <div className="space-y-8 animate-fade-in pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/fazenda">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-[#3E2723]/20 text-[#3E2723] hover:bg-amber-100 font-black"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar à Fazenda
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#3E2723] flex items-center gap-2">
                <Wrench className="w-7 h-7 text-[#FF9800]" /> Loja de Melhorias
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Invista suas moedas para aprimorar ferramentas, fertilizantes, forno e
                trabalhadores!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#FFF3E0] border border-[#FFB74D]/60 px-4 py-2 rounded-2xl shadow-inner text-[#E65100]">
            <Coins className="w-5 h-5 text-[#FB8C00] fill-[#FFE082]" />
            <span className="text-lg font-black text-[#E65100] tabular-nums">
              {currentCoins.toLocaleString('pt-BR')} moedas
            </span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-[#E8F5E9] border border-[#C8E6C9] rounded-2xl flex items-center gap-3 text-xs text-[#2E7D32] font-bold">
          <Sparkles className="w-5 h-5 shrink-0 text-[#4CAF50]" />
          <span>
            <strong>Impacto Permanente:</strong> Todas as melhorias compradas ficam salvas na sua
            conta de jogador e afetam diretamente a velocidade, colheita e faturamento na fazenda.
          </span>
        </div>

        {/* Upgrades Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.values(UPGRADES).map((u) => {
            const currentLvl = upgrades[u.id] || 0
            const isMax = currentLvl >= u.maxLevel
            const cost = isMax ? 0 : getUpgradeCost(u.id, currentLvl)
            const canAfford = currentCoins >= cost
            const nextLvl = currentLvl + 1
            const progressPercent = (currentLvl / u.maxLevel) * 100

            return (
              <div
                key={u.id}
                className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl shadow-inner">
                        {u.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[#3E2723]">{u.name}</h3>
                        <span className="text-xs font-black text-[#5E35B1] bg-purple-100 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                          {isMax ? 'Nível Máximo ⭐' : `Nível ${currentLvl} / ${u.maxLevel}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {isMax ? (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                          Completo
                        </span>
                      ) : (
                        <div className="text-sm font-black text-[#E65100]">
                          🪙 {cost.toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#795548] font-bold leading-relaxed mb-4">
                    {u.description}
                  </p>

                  {/* Level progress bar */}
                  <div className="space-y-1 mb-5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#795548]">
                      <span>Efeito Atual</span>
                      <span className="font-black text-[#3E2723]">
                        {currentLvl * u.effectValuePerLevel} {u.effectUnit}
                        {!isMax && (
                          <span className="text-[#2E7D32]">
                            {' '}
                            → {nextLvl * u.effectValuePerLevel} {u.effectUnit}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-[#FFB74D] to-[#8BC34A] rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleBuy(u.id)}
                  disabled={isMax || !canAfford || buyingId === u.id}
                  className={`w-full font-black rounded-2xl h-12 text-sm ${
                    isMax
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : canAfford
                        ? 'bg-[#8BC34A] hover:bg-[#7CB342] text-white shadow-sm'
                        : 'bg-amber-200/60 text-[#795548] cursor-not-allowed'
                  }`}
                >
                  {isMax
                    ? 'Melhoria no Nível Máximo'
                    : buyingId === u.id
                      ? 'Aprimorando...'
                      : canAfford
                        ? `Melhorar para Nível ${nextLvl} (🪙 ${cost})`
                        : `Faltam ${cost - currentCoins} moedas`}
                </Button>
              </div>
            )
          })}

          {/* Workers Card in Upgrades Store */}
          <div className="bg-[#FFF9F0] border-2 border-blue-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl shadow-inner">
                    🧑‍🌾
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#3E2723]">
                      Contratar Trabalhadores Rurais
                    </h3>
                    <span className="text-xs font-black text-[#1976D2] bg-blue-100 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                      {workersCount} Ativo{workersCount !== 1 ? 's' : ''} na Fazenda
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-[#E65100]">
                    🪙 {workerCost.toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#795548] font-bold leading-relaxed mb-4">
                Cada trabalhador contratado percorre seus lotes em 3D e colhe vegetais maduros
                automaticamente, depositando no celeiro e garantindo lucros constantes!
              </p>

              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs font-bold text-blue-900 mb-5">
                Capacidade atual: {workersCount} ajudante{workersCount !== 1 ? 's' : ''} colhendo
                continuamente.
              </div>
            </div>

            <Button
              onClick={handleHire}
              disabled={currentCoins < workerCost || buyingId === 'worker'}
              className={`w-full font-black rounded-2xl h-12 text-sm ${
                currentCoins >= workerCost
                  ? 'bg-[#1976D2] hover:bg-[#1565C0] text-white shadow-sm'
                  : 'bg-amber-200/60 text-[#795548] cursor-not-allowed'
              }`}
            >
              {buyingId === 'worker'
                ? 'Contratando...'
                : currentCoins >= workerCost
                  ? `Contratar Trabalhador #${workersCount + 1} (🪙 ${workerCost})`
                  : `Faltam ${workerCost - currentCoins} moedas`}
            </Button>
          </div>
        </div>
      </div>
    </AuthGate>
  )
}
