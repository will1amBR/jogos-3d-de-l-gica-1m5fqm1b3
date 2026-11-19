import React, { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Tractor,
  Layers,
  FlaskConical,
  Menu,
  X,
  LogOut,
  Gamepad2,
  TrendingUp,
  Spade,
  Target,
  Map,
  Trophy,
  Store,
  Rocket,
  Zap,
  Activity,
  Grid3X3,
  Palette,
  Landmark,
  Blocks,
  Triangle,
  Crown,
  CircleDot,
  Joystick,
  Dices,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { getXpForLevel } from '@/types/game'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const NAV_SECTIONS = [
  {
    title: 'Início',
    items: [{ name: 'Central do Hub', path: '/', icon: Gamepad2 }],
  },
  {
    title: 'Jogos 3D',
    items: [
      { name: 'Fazenda Encantada', path: '/fazenda', icon: Tractor },
      { name: 'Fábrica de Garrafas', path: '/fabrica', icon: FlaskConical },
      { name: 'Tetris 3D', path: '/tetris', icon: Blocks },
    ],
  },
  {
    title: 'Cartas & Tabuleiro',
    items: [
      { name: 'Spider', path: '/spider', icon: Spade },
      { name: 'Mahjong', path: '/mahjong', icon: Dices },
      { name: 'FreeCell', path: '/freecell', icon: Spade },
      { name: 'Paciência', path: '/paciencia', icon: Spade },
      { name: 'Pirâmide', path: '/piramide', icon: Triangle },
      { name: 'Xadrez', path: '/xadrez', icon: Crown },
      { name: 'Damas', path: '/damas', icon: Grid3X3 },
      { name: 'Jogo da Velha', path: '/velha', icon: CircleDot },
      { name: 'Pinball', path: '/pinball', icon: Joystick },
    ],
  },
  {
    title: '2D Ação',
    items: [
      { name: 'Defensor do Céu', path: '/aeronave', icon: Rocket },
      { name: 'Corrida do Vale', path: '/runner', icon: Activity },
    ],
  },
  {
    title: 'Mais',
    items: [
      { name: 'Mundo RPG', path: '/mundo', icon: Map },
      { name: 'Meus Objetivos', path: '/objetivos', icon: Target },
      { name: 'Jornada RPG', path: '/jornada', icon: Sparkles },
      { name: 'Loja de Melhorias', path: '/melhorias', icon: Store },
      { name: 'Conquistas', path: '/conquistas', icon: Trophy },
    ],
  },
] as const

interface NavMenuProps {
  open: boolean
  onClose: () => void
}

/** Full-screen sliding drawer with all game links grouped by section. Shared by desktop (hamburger) and mobile. */
export const NavMenu: React.FC<NavMenuProps> = ({ open, onClose }) => {
  const { user, player, logout } = useGame()
  const location = useLocation()
  const navigate = useNavigate()

  // ESC closes the menu (and overlay click via its own onClick)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open) return null

  const handleLogout = () => {
    onClose()
    logout()
    navigate('/')
  }

  const currentLevel = player?.level || 1
  const currentXp = player?.xp || 0
  const xpNeeded = getXpForLevel(currentLevel)
  const xpPercent = Math.min(100, Math.round((currentXp / Math.max(1, xpNeeded)) * 100))

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay (click outside to close) */}
      <div
        className="absolute inset-0 bg-[#3E2723]/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sliding panel — right side */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-xs sm:max-w-sm bg-[#FFF9F0] shadow-2xl border-l border-[#3E2723]/10 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#3E2723]/10">
          <span className="flex items-center gap-2 font-black text-lg text-[#3E2723]">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8BC34A] to-[#2E7D32] text-white font-black text-base inline-flex items-center justify-center">
              G
            </span>
            Glik Games
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Fechar menu"
            className="text-[#3E2723] rounded-xl"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable grouped links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-2 mb-1.5 text-[11px] font-black uppercase tracking-wider text-[#8BC34A]">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-extrabold transition-colors',
                        isActive
                          ? 'bg-[#8BC34A] text-white shadow-sm'
                          : 'text-[#3E2723] hover:bg-[#8BC34A]/10 hover:text-[#2E7D32]',
                      )}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer of drawer */}
        <div className="px-4 py-4 border-t border-[#3E2723]/10 space-y-3">
          {player && (
            <div className="p-3 bg-[#F5F0E8] rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-[#5E35B1] font-black">Nível {currentLevel}</span>
                <span className="text-[#795548]">
                  {currentXp} / {xpNeeded} XP ({xpPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#E0D8CB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8BC34A] to-[#FFB74D] rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#795548] font-bold truncate">
              {user?.email || 'Jogador'}
            </span>
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" /> Sair
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  onClose()
                  navigate('/entrar')
                }}
                className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-xs rounded-xl shrink-0"
              >
                Entrar
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

export const HamburgerButton: React.FC<{ onClick: () => void; open: boolean }> = ({
  onClick,
  open,
}) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    title={open ? 'Fechar menu' : 'Abrir menu'}
    className="text-[#3E2723] rounded-xl"
  >
    {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
  </Button>
)
