import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Coins, LogOut, TrendingUp, Gamepad2, Target } from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { getXpForLevel } from '@/types/game'
import { Button } from '@/components/ui/button'
import { NavMenu, HamburgerButton } from '@/components/NavMenu'

export const Navbar: React.FC = () => {
  const { user, player, logout } = useGame()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const currentXp = player?.xp || 0
  const xpNeeded = getXpForLevel(player?.level || 1)
  const xpPercent = Math.min(100, Math.round((currentXp / Math.max(1, xpNeeded)) * 100))

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/')
  }

  // Poucos itens essenciais que ficam sempre visíveis no header (desktop e mobile)
  const essentialLinks = [
    { name: 'Início', path: '/', icon: Gamepad2 },
    { name: 'Meus Objetivos', path: '/objetivos', icon: Target },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFF9F0]/90 backdrop-blur-md border-b border-[#3E2723]/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
          {/* Brand / Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFB74D] via-[#8BC34A] to-[#2E7D32] p-0.5 shadow-md transform group-hover:rotate-6 transition-transform">
              <div className="w-full h-full rounded-[14px] bg-[#2E7D32] flex items-center justify-center text-white font-black text-2xl tracking-tighter shadow-inner">
                G
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-[#3E2723] tracking-tight block">
                Glik <span className="text-[#8BC34A]">Games</span>
              </span>
              <span className="text-xs text-[#795548] font-bold hidden sm:block">
                Jogos 3D, Cartas, Ação & Fazenda RPG
              </span>
            </div>
          </Link>

          {/* Itens essenciais (desktop) */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1.5">
              {essentialLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-extrabold text-[#3E2723] hover:bg-[#8BC34A]/10 hover:text-[#2E7D32] transition-all"
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Link>
              ))}
            </nav>
          )}

          {/* Deslogado: CTA de autenticação no topo */}
          {!user ? (
            <div className="flex items-center gap-2">
              <Link to="/entrar" className="hidden sm:block">
                <Button
                  variant="outline"
                  className="min-h-[44px] px-5 bg-white/70 text-[#2E7D32] border-2 border-[#8BC34A]/70 font-black text-sm rounded-2xl hover:bg-[#E8F5E9] active:scale-95 transition-all"
                >
                  Entrar
                </Button>
              </Link>
              <Link to="/cadastro">
                <Button className="min-h-[44px] px-5 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-sm rounded-2xl shadow-sm active:scale-95 transition-all">
                  Criar Conta
                </Button>
              </Link>
            </div>
          ) : null}

          {/* Player Stats & Level Pill */}
          {user && player ? (
            <div className="flex items-center gap-3">
              {/* Level & XP progress */}
              <div className="hidden md:flex flex-col items-end gap-1 min-w-[140px]">
                <div className="flex items-center justify-between w-full text-xs font-black">
                  <span className="text-[#5E35B1] bg-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Nível {player.level}
                  </span>
                  <span className="text-[#795548] tabular-nums">
                    {currentXp} / {xpNeeded} XP
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E0D8CB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#8BC34A] to-[#FFB74D] transition-all duration-500 rounded-full"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>

              {/* Coins Counter */}
              <div className="flex items-center gap-1.5 bg-[#FFF3E0] border border-[#FFB74D]/60 px-3.5 py-1.5 rounded-2xl shadow-inner text-[#E65100]">
                <Coins className="w-5 h-5 text-[#FB8C00] fill-[#FFE082]" />
                <AnimatedCounter
                  value={player.coins || 0}
                  className="text-base font-black text-[#E65100]"
                />
              </div>

              {/* Logout button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sair da Conta"
                className="hidden sm:inline-flex text-[#795548] hover:text-[#D32F2F] hover:bg-red-50 rounded-xl"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          ) : null}

          {/* Hamburger (desktop + mobile, logado ou não) */}
          <HamburgerButton open={menuOpen} onClick={() => setMenuOpen(true)} />
        </div>
      </header>

      {/* Menu deslizante (drawer lateral direito) — compartilhado por desktop e mobile */}
      <NavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}

export const Footer: React.FC = () => {
  const { user } = useGame()

  // Deslogado: rodapé enxuto (marca + link de login), sem paredão de links
  if (!user) {
    return (
      <footer className="mt-auto bg-[#ECE5D8] border-t border-[#3E2723]/10 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-2 text-center">
          <p className="font-extrabold text-[#3E2723] text-sm flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-[#2E7D32] text-amber-300 font-black text-xs inline-flex items-center justify-center">
              G
            </span>
            Glik Games
          </p>
          <p className="text-xs text-[#795548] font-bold">
            Jogos 3D, cartas, tabuleiro e ação — grátis no navegador.
          </p>
          <Link
            to="/entrar"
            className="text-xs font-black text-[#2E7D32] hover:text-[#8BC34A] transition-colors min-h-[44px] flex items-center"
          >
            Já tem conta? Entrar
          </Link>
          <p className="text-[11px] text-[#795548]/80">© {new Date().getFullYear()} Glik Games</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="mt-auto bg-[#ECE5D8] border-t border-[#3E2723]/10 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <p className="font-extrabold text-[#3E2723] text-sm flex items-center justify-center md:justify-start gap-1.5">
            <span className="w-5 h-5 rounded-md bg-[#2E7D32] text-amber-300 font-black text-xs inline-flex items-center justify-center">
              G
            </span>
            Glik Games • Jogos 3D, Cartas e Lógica
          </p>
          <p className="text-xs text-[#795548] mt-0.5">
            Exercite seu cérebro, colha recompensas e expanda sua fazenda mágica.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-extrabold text-[#795548]">
          <Link
            to="/mundo"
            className="hover:text-[#8BC34A] transition-colors font-black text-[#2E7D32]"
          >
            🌍 Mundo RPG
          </Link>
          <span>•</span>
          <Link to="/fazenda" className="hover:text-[#8BC34A] transition-colors">
            🚜 Fazenda Encantada
          </Link>
          <span>•</span>
          <Link to="/aeronave" className="hover:text-[#8BC34A] transition-colors">
            🚀 Aeronave 2D
          </Link>
          <span>•</span>
          <Link to="/runner" className="hover:text-[#8BC34A] transition-colors">
            🏃 Corrida do Vale
          </Link>
          <span>•</span>
          <Link to="/pinball" className="hover:text-[#8BC34A] transition-colors">
            🕹️ Pinball Arcade
          </Link>
          <span>•</span>
          <Link to="/velha" className="hover:text-[#8BC34A] transition-colors">
            ❌ Jogo da Velha
          </Link>
          <span>•</span>
          <Link to="/xadrez" className="hover:text-[#8BC34A] transition-colors">
            ♟️ Xadrez
          </Link>
          <span>•</span>
          <Link to="/damas" className="hover:text-[#8BC34A] transition-colors">
            🔴 Damas Brasileiras
          </Link>
          <span>•</span>
          <Link to="/mahjong" className="hover:text-[#8BC34A] transition-colors">
            🀄 Mahjong Solitaire
          </Link>
          <span>•</span>
          <Link to="/spider" className="hover:text-[#8BC34A] transition-colors">
            🕷️ Paciência Spider
          </Link>
          <span>•</span>
          <Link to="/freecell" className="hover:text-[#8BC34A] transition-colors">
            🃏 FreeCell
          </Link>
          <span>•</span>
          <Link to="/paciencia" className="hover:text-[#8BC34A] transition-colors">
            ♠️ Paciência Klondike
          </Link>
          <span>•</span>
          <Link to="/piramide" className="hover:text-[#8BC34A] transition-colors">
            🔺 Paciência Pirâmide
          </Link>
          <span>•</span>
          <Link to="/fabrica" className="hover:text-[#8BC34A] transition-colors">
            🧪 Garrafas
          </Link>
          <span>•</span>
          <Link to="/tetris" className="hover:text-[#8BC34A] transition-colors">
            🧱 Tetris (2D/3D)
          </Link>
          <span>•</span>
          <Link
            to="/objetivos"
            className="hover:text-[#8BC34A] transition-colors font-black text-amber-700"
          >
            🎯 Meus Objetivos
          </Link>
          <span>•</span>
          <Link to="/jornada" className="hover:text-[#8BC34A] transition-colors">
            🗺️ Jornada RPG
          </Link>
          <span>•</span>
          <Link to="/melhorias" className="hover:text-[#8BC34A] transition-colors">
            ⚡ Melhorias
          </Link>
          <span>•</span>
          <Link to="/conquistas" className="hover:text-[#8BC34A] transition-colors">
            🏆 Conquistas
          </Link>
        </div>

        <div className="text-xs text-[#795548]/80 font-bold">
          © {new Date().getFullYear()} Glik Games • Progressão Salva
        </div>
      </div>
    </footer>
  )
}
