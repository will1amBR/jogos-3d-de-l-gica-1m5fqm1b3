import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Trophy,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Crown,
  Medal,
  Users,
  Coins,
  ShieldCheck,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { ACHIEVEMENTS, type AchievementDef, type PlayerRecord } from '@/types/game'
import { fetchLeaderboard } from '@/services/player'
import { Button } from '@/components/ui/button'

export default function Conquistas() {
  const { player, user, claimedAchievements, claimAchievement } = useGame()
  const [activeTab, setActiveTab] = useState<'achievements' | 'leaderboard'>('achievements')
  const [leaderboard, setLeaderboard] = useState<PlayerRecord[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadRanking()
    }
  }, [activeTab])

  const loadRanking = async () => {
    setLoadingLeaderboard(true)
    try {
      const items = await fetchLeaderboard(50)
      setLeaderboard(items)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  const handleClaim = async (ach: AchievementDef) => {
    setClaimingId(ach.id)
    try {
      await claimAchievement(ach)
    } finally {
      setClaimingId(null)
    }
  }

  const totalAch = ACHIEVEMENTS.length
  const completedAch = ACHIEVEMENTS.filter((a) => {
    if (!player) return false
    return a.getProgress(player) >= a.target
  }).length
  const claimedCount = Object.keys(claimedAchievements).length

  return (
    <AuthGate>
      <div className="space-y-8 animate-fade-in pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <Trophy className="w-7 h-7 text-[#FB8C00]" /> Conquistas & Ranking
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Cumpra marcas lendárias, resgate bônus e dispute o topo do ranking de jogadores!
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-[#F5EFE6] p-1.5 rounded-2xl border border-[#3E2723]/10">
            <button
              type="button"
              onClick={() => setActiveTab('achievements')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'achievements'
                  ? 'bg-[#8BC34A] text-white shadow-sm'
                  : 'text-[#3E2723] hover:text-[#2E7D32]'
              }`}
            >
              <Award className="w-4 h-4" />
              Conquistas ({claimedCount}/{totalAch})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-[#8BC34A] text-white shadow-sm'
                  : 'text-[#3E2723] hover:text-[#2E7D32]'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Placar Geral (Ranking)
            </button>
          </div>
        </div>

        {/* Tab 1: Achievements */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            {/* Progress summary banner */}
            <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase text-[#8D6E63] tracking-wider block mb-1">
                  Seu Progresso de Proezas
                </span>
                <div className="text-2xl font-black text-[#3E2723]">
                  {claimedCount} de {totalAch} Conquistas Resgatadas
                </div>
                <p className="text-xs text-[#795548] font-bold mt-1">
                  {completedAch - claimedCount > 0
                    ? `Você possui ${completedAch - claimedCount} conquista(s) pronta(s) para resgate!`
                    : 'Continue jogando e expandindo sua fazenda para desbloquear novos prêmios.'}
                </p>
              </div>

              <div className="w-full sm:w-64 space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-[#795548]">
                  <span>Conclusão</span>
                  <span className="font-black text-[#3E2723]">
                    {Math.round((claimedCount / totalAch) * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-amber-200/70 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#FFB74D] to-[#8BC34A] rounded-full transition-all duration-500"
                    style={{ width: `${(claimedCount / totalAch) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACHIEVEMENTS.map((ach) => {
                const currentVal = player ? ach.getProgress(player) : 0
                const isReady = currentVal >= ach.target
                const isClaimed = claimedAchievements[ach.id] || false
                const percent = Math.min(100, Math.round((currentVal / ach.target) * 100))

                return (
                  <div
                    key={ach.id}
                    className={`bg-[#FFF9F0] border-2 rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all ${
                      isClaimed
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : isReady
                          ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-300'
                          : 'border-[#3E2723]/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-2xl shadow-inner shrink-0">
                            {ach.icon}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-[#3E2723] flex items-center gap-1.5">
                              {ach.title}
                              {isClaimed && (
                                <CheckCircle2 className="w-4 h-4 text-[#2E7D32] inline" />
                              )}
                            </h3>
                            <p className="text-xs text-[#795548] font-bold leading-relaxed">
                              {ach.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-[#E65100]">
                            🪙 +{ach.rewardCoins}
                          </div>
                          <div className="text-[10px] font-black text-[#2E7D32]">
                            +{ach.rewardXp} XP
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1 my-3">
                        <div className="flex justify-between text-[11px] font-bold text-[#795548]">
                          <span>Progresso</span>
                          <span className="tabular-nums font-black text-[#3E2723]">
                            {currentVal} / {ach.target} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-amber-200/50 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-[#FFB74D] to-[#8BC34A] rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleClaim(ach)}
                      disabled={!isReady || isClaimed || claimingId === ach.id}
                      className={`w-full font-black rounded-xl text-xs h-10 ${
                        isClaimed
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : isReady
                            ? 'bg-[#FF9800] hover:bg-[#F57C00] text-white shadow-md animate-pulse'
                            : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {isClaimed
                        ? '✓ Conquista Resgatada'
                        : claimingId === ach.id
                          ? 'Resgatando...'
                          : isReady
                            ? 'Resgatar Recompensa! 🎁'
                            : `Em andamento (${currentVal}/${ach.target})`}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#3E2723] flex items-center gap-2">
                  <Crown className="w-6 h-6 text-[#FF9800]" /> Hall dos Maiores Agricultores
                </h2>
                <p className="text-xs text-[#795548] font-bold">
                  Classificação baseada em Nível, Experiência (XP) e Moedas Acumuladas.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadRanking}
                disabled={loadingLeaderboard}
                className="rounded-xl border-[#3E2723]/20 font-black text-xs"
              >
                {loadingLeaderboard ? 'Atualizando...' : 'Atualizar Placar'}
              </Button>
            </div>

            {/* Leaderboard Table / Cards */}
            <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden">
              {loadingLeaderboard ? (
                <div className="py-12 text-center text-sm font-bold text-[#795548]">
                  Carregando o ranking dos jogadores...
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center text-sm font-bold text-[#795548]">
                  Nenhum jogador registrado no ranking ainda.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {leaderboard.map((item, index) => {
                    const isCurrentUser = item.id === player?.id
                    const rankNum = index + 1
                    const playerName =
                      item.expand?.user?.name ||
                      item.expand?.user?.email?.split('@')[0] ||
                      `Jogador #${item.id.slice(0, 4)}`

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                          isCurrentUser
                            ? 'bg-amber-100/80 border-[#FF9800] shadow-md ring-2 ring-[#FF9800]/40'
                            : rankNum === 1
                              ? 'bg-yellow-50/80 border-yellow-300'
                              : rankNum === 2
                                ? 'bg-slate-50/80 border-slate-300'
                                : rankNum === 3
                                  ? 'bg-amber-50/40 border-amber-200'
                                  : 'bg-white border-[#3E2723]/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Rank badge */}
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                            {rankNum === 1 ? (
                              <span className="text-2xl">🥇</span>
                            ) : rankNum === 2 ? (
                              <span className="text-2xl">🥈</span>
                            ) : rankNum === 3 ? (
                              <span className="text-2xl">🥉</span>
                            ) : (
                              <span className="text-sm font-black text-[#795548]">#{rankNum}</span>
                            )}
                          </div>

                          {/* Player avatar & name */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base sm:text-lg font-black text-[#3E2723]">
                                {playerName}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] font-black bg-[#8BC34A] text-white px-2 py-0.5 rounded-full uppercase">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#795548] font-bold flex items-center gap-2 mt-0.5">
                              <span>🌾 {item.total_harvests || 0} colheitas</span>
                              <span>•</span>
                              <span>📦 {item.total_bread_delivered || 0} entregas</span>
                            </div>
                          </div>
                        </div>

                        {/* Level and Coins */}
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-sm sm:text-base font-black text-[#5E35B1]">
                              Nível {item.level || 1}
                            </div>
                            <div className="text-xs text-[#795548] font-bold">
                              {item.xp || 0} XP
                            </div>
                          </div>

                          <div className="hidden sm:block min-w-[90px]">
                            <div className="text-sm font-black text-[#E65100]">
                              🪙 {(item.coins || 0).toLocaleString('pt-BR')}
                            </div>
                            <div className="text-[11px] text-[#795548] font-bold">Moedas</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}
