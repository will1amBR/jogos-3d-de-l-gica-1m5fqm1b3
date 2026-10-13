import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Tractor,
  FlaskConical,
  Layers,
  Sparkles,
  Award,
  Coins,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Brain,
  Zap,
  MapPin,
  Wrench,
  Trophy,
  PackageCheck,
  Spade,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { Game3DPreview } from '@/components/Game3DPreview'
import { getXpForLevel } from '@/types/game'
import { Button } from '@/components/ui/button'

export default function Index() {
  const { user, player, dailyQuest } = useGame()
  const [hoveredGame, setHoveredGame] = useState<string | null>(null)

  const currentLevel = player?.level || 1
  const currentXp = player?.xp || 0
  const xpNeeded = getXpForLevel(currentLevel)
  const xpPercent = Math.min(100, Math.round((currentXp / Math.max(1, xpNeeded)) * 100))

  const questPercent = dailyQuest
    ? Math.min(100, Math.round(((dailyQuest.progress || 0) / (dailyQuest.target || 1)) * 100))
    : 0

  const getQuestLabel = () => {
    if (!dailyQuest) return 'Carregando missão diária...'
    switch (dailyQuest.quest_type) {
      case 'harvest':
        return `Colha ${dailyQuest.target} vegetais mágicos na fazenda`
      case 'fill_bottles':
        return `Encha com perfeição ${dailyQuest.target} garrafas na fábrica`
      case 'tetris_layers':
        return `Complete e limpe ${dailyQuest.target} camadas no Tetris 3D`
      default:
        return 'Cumpra os desafios diários para faturar ouro e XP'
    }
  }

  const games = [
    {
      id: 'mundo',
      title: 'Mundo RPG Andável',
      type: 'farm' as const,
      route: '/mundo',
      icon: Sparkles,
      description:
        'Ande com seu personagem pelos cenários, colete soja no chão, asse pão e atenda clientes da vila para faturar ouro e contratar ajudantes!',
      tags: ['RPG Andável', 'Soja → Pão', 'Portais Fixos'],
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black',
      actionText: 'Explorar Mundo RPG',
    },
    {
      id: 'aeronave',
      title: 'Defensor do Céu (Aeronave 2D)',
      type: 'aeronave' as const,
      route: '/aeronave',
      icon: Zap,
      description:
        'Pilote a aeronave mágica desviando e destruindo asteroides de pedra, cristal e ouro. Tiros automáticos, 3 vidas e alta recompensa!',
      tags: ['Ação 2D', 'Shooter', 'Novo!'],
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300 font-black',
      actionText: 'Decolar com a Aeronave',
    },
    {
      id: 'runner',
      title: 'Corrida do Vale (Runner 2D)',
      type: 'runner' as const,
      route: '/runner',
      icon: Sparkles,
      description:
        'Endless runner acolhedor: corra pelo vale dourado, salte sobre caixotes e pedras com pulo duplo e colete sojas douradas!',
      tags: ['Pulo Duplo', 'Endless Runner', 'Novo!'],
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-black',
      actionText: 'Correr no Vale',
    },
    {
      id: 'mahjong',
      title: 'Mahjong Solitaire Animado',
      type: 'mahjong' as const,
      route: '/mahjong',
      icon: Brain,
      description:
        'Estilo Vita Mahjong com peças grandes, elevação 3D ao tocar, brilho de jade e ouro nos pares e combo multiplicador de sequência!',
      tags: ['Memória', 'Jade & Ouro', 'Combos'],
      badgeColor: 'bg-emerald-100 text-emerald-900',
      actionText: 'Jogar Mahjong',
    },
    {
      id: 'fazenda',
      title: 'Fazenda Encantada 3D',
      type: 'farm' as const,
      route: '/fazenda',
      icon: Tractor,
      description:
        'Cultive sementes mágicas (soja, milho, cenoura, trigo), gerencie seu terreno isométrico e atenda pedidos da cidade.',
      tags: ['Colheita', 'Economia', 'Expansão'],
      badgeColor: 'bg-emerald-100 text-emerald-800',
      actionText: 'Ir para a Fazenda',
    },
    {
      id: 'spider',
      title: 'Paciência Spider',
      type: 'spider' as const,
      route: '/spider',
      icon: Spade,
      description:
        'Clássico de 10 colunas e 104 cartas. Organize sequências perfeitas K→A no mesmo naipe (1, 2 ou 4 naipes) com desfazer ilimitado e dicas!',
      tags: ['Paciência', 'Estratégia', '1/2/4 Naipes'],
      badgeColor: 'bg-amber-100 text-amber-900',
      actionText: 'Jogar Spider',
    },
    {
      id: 'fabrica',
      title: 'Jogo das Garrafas',
      type: 'bottle' as const,
      route: '/fabrica',
      icon: FlaskConical,
      description:
        '8 garrafinhas de 6 andares na prateleira: preencha o garrafão com uma única cor e ordene as garrafinhas.',
      tags: ['Lógica', 'Prateleira 3D', 'Water Sort'],
      badgeColor: 'bg-cyan-100 text-cyan-800',
      actionText: 'Jogar Garrafas',
    },
    {
      id: 'tetris',
      title: 'Tetris • 2D Clássico & 3D',
      type: 'tetris' as const,
      route: '/tetris',
      icon: Layers,
      description:
        'Jogue o Tetris tradicional 2D com controles de toque confortáveis ou encare o desafio na arena 3D!',
      tags: ['2D Clássico', 'Espacial 3D', 'Combos'],
      badgeColor: 'bg-purple-100 text-purple-800',
      actionText: 'Jogar Tetris',
    },
  ]

  return (
    <AuthGate>
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Floating 3D Background Decorative Badges */}
        <div className="relative">
          {/* Hero Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF9F0] via-[#FFF3E0] to-[#F1F8E9] border-2 border-[#3E2723]/10 p-6 sm:p-10 shadow-lg">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 opacity-10 sm:opacity-20 pointer-events-none">
              <Sparkles className="w-36 h-36 text-[#8BC34A]" />
            </div>

            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#8BC34A]/20 text-[#2E7D32] text-xs font-black uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4" />
                RPG de Jogos & Evolução de Habilidades
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-[#3E2723] tracking-tight leading-tight">
                Bem-vindo de volta,{' '}
                <span className="text-[#8BC34A]">
                  {user?.name || user?.email?.split('@')[0] || 'Aventureiro'}
                </span>
                !
              </h1>

              <p className="mt-2 text-sm sm:text-base text-[#795548] font-bold">
                Jogue para exercitar seu cérebro. Todo ouro e experiência ganhos em qualquer jogo
                fortalecem o seu perfil e desbloqueiam novos lotes e recursos!
              </p>

              {/* Progress Bar inside Hero */}
              <div className="mt-6 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200/60 max-w-lg shadow-sm">
                <div className="flex items-center justify-between text-xs font-black mb-1.5">
                  <span className="text-[#5E35B1] flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Nível Atual: {currentLevel}
                  </span>
                  <span className="text-[#795548] tabular-nums">
                    {currentXp} / {xpNeeded} XP ({xpPercent}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-[#E0D8CB] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#8BC34A] to-[#FFB74D] rounded-full transition-all duration-700"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick RPG Navigation Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <Link
            to="/mundo"
            className="group bg-[#F1F8E9] border-2 border-[#8BC34A] rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-[#689F38] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#8BC34A] text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🚶
              </div>
              <div>
                <h3 className="text-sm font-black text-[#2E7D32]">Mundo RPG</h3>
                <p className="text-[11px] text-[#795548] font-bold">Ande & colete</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#2E7D32] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/objetivos"
            className="group bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-amber-500 transition-all flex items-center justify-between ring-2 ring-amber-300/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-xs">
                🎯
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-black text-amber-950">Meus Objetivos</h3>
                  <span className="text-[9px] font-black uppercase bg-amber-400 text-stone-900 px-1 rounded-sm">
                    Novo!
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 font-bold">Metas do Jogador</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-700 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/jornada"
            className="group bg-[#FFF9F0] border-2 border-[#8BC34A]/40 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-[#8BC34A] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🗺️
              </div>
              <div>
                <h3 className="text-sm font-black text-[#3E2723]">Jornada RPG</h3>
                <p className="text-[11px] text-[#795548] font-bold">8 Lugares no mapa</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8BC34A] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/melhorias"
            className="group bg-[#FFF9F0] border-2 border-[#FF9800]/40 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-[#FF9800] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <div>
                <h3 className="text-sm font-black text-[#3E2723]">Melhorias</h3>
                <p className="text-[11px] text-[#795548] font-bold">Forno & Ferramentas</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#FF9800] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/conquistas"
            className="group bg-[#FFF9F0] border-2 border-purple-300 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-purple-400 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🏆
              </div>
              <div>
                <h3 className="text-sm font-black text-[#3E2723]">Conquistas</h3>
                <p className="text-[11px] text-[#795548] font-bold">Prêmios & Ranking</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#5E35B1] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 3 Key Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-[#5E35B1] shrink-0">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-[#795548] tracking-wider block">
                Nível de Jogador
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#5E35B1] tabular-nums">
                Nível {player?.level || 1}
              </span>
            </div>
          </div>

          <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-[#FFB74D] shrink-0">
              <Coins className="w-8 h-8 text-[#FB8C00]" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-[#795548] tracking-wider block">
                Total de Moedas
              </span>
              <AnimatedCounter
                value={player?.coins || 0}
                className="text-2xl sm:text-3xl font-black text-[#E65100]"
              />
            </div>
          </div>

          <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-[#66BB6A] shrink-0">
              <Tractor className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-[#795548] tracking-wider block">
                Colheitas Feitas
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#2E7D32] tabular-nums">
                {player?.total_harvests || 0}
              </span>
            </div>
          </div>

          <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl shrink-0">
              🥖
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-[#795548] tracking-wider block">
                Pães Entregues
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#D84315] tabular-nums">
                {player?.total_bread_delivered || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Quest Banner */}
        <div className="bg-[#FFF9F0] border-2 border-[#FFB74D] rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black uppercase">
                  Missão do Dia
                </span>
                {dailyQuest?.completed && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Concluída!
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#3E2723]">{getQuestLabel()}</h2>
              <p className="text-xs text-[#795548] font-bold">
                Recompensa:{' '}
                <span className="text-[#5E35B1] font-black">+{dailyQuest?.reward_xp || 80} XP</span>{' '}
                e{' '}
                <span className="text-[#E65100] font-black">
                  +{dailyQuest?.reward_coins || 100} Moedas
                </span>
              </p>
            </div>

            <div className="w-full md:w-64 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-[#795548]">
                <span>Progresso</span>
                <span className="tabular-nums font-black text-[#3E2723]">
                  {dailyQuest?.progress || 0} / {dailyQuest?.target || 1}
                </span>
              </div>
              <div className="w-full h-3 bg-amber-100 rounded-full overflow-hidden p-0.5 border border-amber-300">
                <div
                  className="h-full bg-gradient-to-r from-[#FFB74D] to-[#8BC34A] rounded-full transition-all duration-500"
                  style={{ width: `${questPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Games Grid (3 Playable Games) */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#3E2723]">Escolha seu Jogo</h2>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Todos os 5 jogos alimentam seu ouro e nível compartilhado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => {
              const Icon = game.icon
              const isHovered = hoveredGame === game.id

              return (
                <div
                  key={game.id}
                  onMouseEnter={() => setHoveredGame(game.id)}
                  onMouseLeave={() => setHoveredGame(null)}
                  className="group bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-200 transform hover:-translate-y-2 flex flex-col justify-between"
                >
                  <div>
                    {/* 3D Animated Preview Canvas */}
                    <div className="mb-4">
                      <Game3DPreview type={game.type} isHovered={isHovered} />
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {game.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${game.badgeColor}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-[#3E2723]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black text-[#3E2723]">{game.title}</h3>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-[#795548] font-bold leading-relaxed mb-6">
                      {game.description}
                    </p>
                  </div>

                  {/* Play CTA Button */}
                  <Link to={game.route}>
                    <Button className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-extrabold text-sm py-5 rounded-2xl shadow-md transition-all group-hover:bg-[#7CB342] flex items-center justify-center gap-2">
                      <span>{game.actionText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* Small tips banner */}
        <div className="p-4 bg-[#E8F5E9] border border-[#C8E6C9] rounded-2xl flex items-center gap-3 text-xs text-[#2E7D32] font-bold">
          <Brain className="w-5 h-5 shrink-0 text-[#4CAF50]" />
          <span>
            <strong>Dica Estratégica:</strong> Venda suas colheitas da fazenda quando o
            multiplicador diário de preços estiver acima de 1.2x para faturar muito mais moedas!
          </span>
        </div>
      </div>
    </AuthGate>
  )
}
