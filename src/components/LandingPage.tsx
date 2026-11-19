import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  Coins,
  Trophy,
  TrendingUp,
  Gamepad2,
  User,
  Brain,
  Zap,
  Dices,
  Tractor,
  FlaskConical,
  Layers,
  Map,
  Spade,
  Rocket,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'

/**
 * LandingPage — página pública exibida em "/" para quem NÃO está logado.
 * Enxuta em texto: hero curto, 3 grupos de jogos, progressão em 1 linha e CTA final.
 * Usuário logado não passa por aqui (Index mostra o Hub).
 */
export const LandingPage: React.FC = () => {
  const { user, isLoading } = useGame()

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFB74D] via-[#8BC34A] to-[#2E7D32] p-0.5 shadow-md animate-float-slow">
          <div className="w-full h-full rounded-[14px] bg-[#2E7D32] flex items-center justify-center text-white font-black text-2xl">
            G
          </div>
        </div>
      </div>
    )
  }

  if (user) return null // logado → Index renderiza o Hub; nada a renderizar aqui

  const groups = [
    {
      id: 'jogos-3d',
      title: 'Jogos 3D',
      tagline: 'Construa, encaixe e explore em três dimensões',
      icon: Dices,
      tint: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      games: [
        { name: 'Fazenda Encantada', icon: Tractor },
        { name: 'Fábrica de Garrafas', icon: FlaskConical },
        { name: 'Tetris 3D', icon: Layers },
        { name: 'Mundo RPG', icon: Map },
      ],
    },
    {
      id: 'cartas',
      title: 'Cartas & Tabuleiro',
      tagline: 'Estratégia clássica para mentes afiadas',
      icon: Spade,
      tint: 'bg-amber-100 text-amber-900 border-amber-300',
      games: [
        { name: 'Spider', icon: Spade },
        { name: 'Mahjong', icon: Brain },
        { name: 'FreeCell', icon: Spade },
        { name: 'Paciência', icon: Spade },
        { name: 'Pirâmide', icon: Sparkles },
        { name: 'Jogo da Velha', icon: Gamepad2 },
        { name: 'Xadrez', icon: Trophy },
        { name: 'Damas', icon: Coins },
        { name: 'Pinball', icon: Zap },
      ],
    },
    {
      id: 'acao-2d',
      title: 'Jogos 2D de Ação',
      tagline: 'Reflexos rápidos, pontuação alta',
      icon: Zap,
      tint: 'bg-blue-100 text-blue-900 border-blue-300',
      games: [
        { name: 'Defensor do Céu', icon: Rocket },
        { name: 'Corrida do Vale', icon: Gamepad2 },
      ],
    },
  ]

  return (
    <div className="animate-fade-in pb-10 -mt-4">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E8F5E9] via-[#FFF9F0] to-[#FFF3E0] border-2 border-[#3E2723]/10 shadow-lg px-5 py-10 sm:px-10 sm:py-16 text-center">
        {/* Formas flutuantes de fundo (leves, CSS puro) */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-8 left-[8%] w-16 h-16 rounded-2xl bg-[#8BC34A]/25 rotate-12 animate-float-slow" />
          <div
            className="absolute top-16 right-[10%] w-20 h-20 rounded-full bg-[#FFB74D]/30 animate-float-slow"
            style={{ animationDelay: '1.2s' }}
          />
          <div
            className="absolute bottom-10 left-[18%] w-12 h-12 rounded-xl bg-purple-200/50 -rotate-6 animate-float-slow"
            style={{ animationDelay: '2.4s' }}
          />
          <div
            className="absolute bottom-6 right-[16%] w-14 h-14 rounded-2xl bg-amber-200/60 rotate-45 animate-float-slow"
            style={{ animationDelay: '0.6s' }}
          />
          <Sparkles className="absolute top-6 right-[30%] w-8 h-8 text-[#8BC34A]/60 animate-float-slow" />
          <Sparkles className="absolute bottom-14 left-[6%] w-6 h-6 text-[#FFB74D]/70 animate-float-slow" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-[#FFB74D] via-[#8BC34A] to-[#2E7D32] p-1 shadow-xl transform hover:rotate-6 transition-transform">
            <div className="w-full h-full rounded-[20px] bg-[#2E7D32] flex items-center justify-center text-white font-black text-4xl shadow-inner">
              G
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-[#3E2723]">
            Glik <span className="text-[#8BC34A]">Games</span>
          </h1>

          <p className="mt-3 text-lg sm:text-2xl font-extrabold text-[#795548]">
            Jogue, pense e evolua.
          </p>

          <p className="mt-2 text-sm sm:text-base font-bold text-[#795548]/80">
            15 jogos • nível, moedas e conquistas salvos na nuvem
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/cadastro" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto min-h-[48px] px-8 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-base rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                <User className="w-5 h-5" />
                Criar Conta
              </Button>
            </Link>
            <Link to="/entrar" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] px-8 bg-white/80 text-[#2E7D32] border-2 border-[#8BC34A] font-black text-base rounded-2xl shadow-sm hover:bg-[#E8F5E9] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Entrar
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-[11px] font-bold text-[#795548]/70">
            Grátis • sem download • direto no navegador
          </p>
        </div>
      </section>

      {/* ===== GRUPOS DE JOGOS ===== */}
      <section className="mt-10 space-y-5">
        {groups.map((group) => {
          const GroupIcon = group.icon
          return (
            <div
              key={group.id}
              className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-5 sm:p-6 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <GroupIcon className="w-6 h-6 text-[#3E2723]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#3E2723] tracking-tight">
                    {group.title}
                  </h2>
                  <p className="text-xs font-bold text-[#795548]">{group.tagline}</p>
                </div>
              </div>

              {/* Chips de jogos — clicáveis, levam ao cadastro/login */}
              <div className="flex flex-wrap gap-2">
                {group.games.map((g) => (
                  <Link
                    key={g.name}
                    to="/cadastro"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border-2 border-[#3E2723]/10 text-xs sm:text-sm font-extrabold text-[#3E2723] hover:border-[#8BC34A] hover:bg-[#F1F8E9] hover:scale-[1.03] transition-all active:scale-95 min-h-[40px]"
                  >
                    <g.icon className="w-3.5 h-3.5 text-[#8BC34A] shrink-0" />
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      {/* ===== PROGRESSÃO (1 linha + ícones) ===== */}
      <section className="mt-10 rounded-3xl bg-gradient-to-r from-[#F1F8E9] to-[#FFF9F0] border-2 border-[#8BC34A]/40 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <span className="inline-flex items-center gap-2 text-sm font-black text-[#5E35B1]">
            <TrendingUp className="w-5 h-5" /> Nível & XP
          </span>
          <span className="inline-flex items-center gap-2 text-sm font-black text-[#E65100]">
            <Coins className="w-5 h-5" /> Moedas
          </span>
          <span className="inline-flex items-center gap-2 text-sm font-black text-[#2E7D32]">
            <Trophy className="w-5 h-5" /> Conquistas
          </span>
        </div>
        <p className="mt-2 text-center text-xs font-bold text-[#795548]">
          Tudo que você ganha nos jogos alimenta um único perfil RPG.
        </p>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="mt-8 relative overflow-hidden rounded-3xl bg-[#2E7D32] border-2 border-[#1B5E20] p-7 sm:p-10 text-center shadow-lg">
        <div className="absolute inset-0 pointer-events-none opacity-10" aria-hidden>
          <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-white/40 blur-2xl" />
          <div className="absolute -bottom-8 -right-4 w-36 h-36 rounded-full bg-[#8BC34A]/70 blur-2xl" />
        </div>
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Pronto para jogar?
          </h2>
          <p className="mt-1.5 text-sm font-bold text-white/85">Crie sua conta em segundos.</p>
          <Link to="/cadastro" className="inline-block mt-5">
            <Button className="min-h-[48px] px-8 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-base rounded-2xl shadow-md active:scale-95 transition-all flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Criar Conta Grátis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
