import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Tractor,
  Layers,
  FlaskConical,
  Coins,
  Menu,
  X,
  LogOut,
  Gamepad2,
  TrendingUp,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { getXpForLevel } from '@/types/game'
import { Button } from '@/components/ui/button'

export const Navbar: React.FC = () => {
  const { user, player, logout } = useGame()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentLevel = player?.level || 1
  const currentXp = player?.xp || 0
  const xpNeeded = getXpForLevel(currentLevel)
  const xpPercent = Math.min(100, Math.round((currentXp / Math.max(1, xpNeeded)) * 100))

  const navLinks = [
    { name: 'Central do Hub', path: '/', icon: Gamepad2 },
    { name: 'Fazenda Encantada', path: '/fazenda', icon: Tractor },
    { name: 'Fábrica de Garrafas', path: '/fabrica', icon: FlaskConical },
    { name: 'Tetris 3D', path: '/tetris', icon: Layers },
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-[#FFF9F0]/90 backdrop-blur-md border-b border-[#3E2723]/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8BC34A] to-[#689F38] flex items-center justify-center text-white shadow-md transform group-hover:rotate-6 transition-transform">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-[#3E2723] tracking-tight block">
              Jogos 3D <span className="text-[#8BC34A]">RPG</span>
            </span>
            <span className="text-xs text-[#795548] font-bold hidden sm:block">
              Fazenda, Lógica & Desafio Mental
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-extrabold transition-all ${
                  isActive
                    ? 'bg-[#8BC34A] text-white shadow-sm'
                    : 'text-[#3E2723] hover:bg-[#8BC34A]/10 hover:text-[#2E7D32]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Player Stats & Level Pill */}
        {user && player ? (
          <div className="flex items-center gap-3">
            {/* Level & XP progress */}
            <div className="hidden sm:flex flex-col items-end gap-1 min-w-[140px]">
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
              className="text-[#795548] hover:text-[#D32F2F] hover:bg-red-50 rounded-xl"
            >
              <LogOut className="w-5 h-5" />
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-[#3E2723] rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FFF9F0] border-b border-[#3E2723]/10 px-4 pt-3 pb-5 space-y-3 shadow-lg">
          {/* Mobile Player Level Bar */}
          {player && (
            <div className="p-3 bg-[#F5F0E8] rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-[#5E35B1] font-black">Nível {player.level}</span>
                <span className="text-[#795548]">
                  {currentXp} / {xpNeeded} XP ({xpPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#E0D8CB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8BC34A] to-[#FFB74D] rounded-full"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-extrabold ${
                    isActive
                      ? 'bg-[#8BC34A] text-white shadow-sm'
                      : 'text-[#3E2723] hover:bg-[#8BC34A]/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.name}
                </Link>
              )
            })}
          </div>

          <div className="pt-2 border-t border-[#3E2723]/10 flex items-center justify-between">
            <span className="text-xs text-[#795548] font-bold">
              Conta: {user?.email || 'Jogador'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Sair
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-[#ECE5D8] border-t border-[#3E2723]/10 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <p className="font-extrabold text-[#3E2723] text-sm">
            🌾 Jogos 3D de Lógica & RPG da Fazenda
          </p>
          <p className="text-xs text-[#795548] mt-0.5">
            Exercite seu cérebro, colha recompensas e expanda sua fazenda mágica.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-extrabold text-[#795548]">
          <Link to="/fazenda" className="hover:text-[#8BC34A] transition-colors">
            🚜 Fazenda Encantada
          </Link>
          <span>•</span>
          <Link to="/fabrica" className="hover:text-[#8BC34A] transition-colors">
            🧪 Fábrica de Garrafas
          </Link>
          <span>•</span>
          <Link to="/tetris" className="hover:text-[#8BC34A] transition-colors">
            🧱 Tetris 3D
          </Link>
        </div>

        <div className="text-xs text-[#795548]/80 font-bold">
          © {new Date().getFullYear()} Jogos 3D • Progressão Salva
        </div>
      </div>
    </footer>
  )
}
