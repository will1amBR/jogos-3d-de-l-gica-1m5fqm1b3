import React, { useEffect, useRef, useState } from 'react'
import { Coins, Sparkles, TrendingUp } from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { getXpForLevel } from '@/types/game'
import { AnimatedCounter } from './AnimatedCounter'

interface ResourceItemProps {
  icon: string | React.ReactNode
  value: number
  label: string
  colorClass: string
  unit?: string
}

const LiveResourceItem: React.FC<ResourceItemProps> = ({
  icon,
  value,
  label,
  colorClass,
  unit,
}) => {
  const prevValRef = useRef(value)
  const [pulse, setPulse] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (value !== prevValRef.current) {
      const diff = value - prevValRef.current
      prevValRef.current = value
      setPulse(diff > 0 ? 'up' : 'down')
      const timer = setTimeout(() => setPulse(null), 900)
      return () => clearTimeout(timer)
    }
  }, [value])

  return (
    <div
      className={`relative flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-white/80 backdrop-blur-xs border transition-all duration-300 shadow-2xs ${
        pulse === 'up'
          ? 'scale-105 border-emerald-400 ring-2 ring-emerald-300 bg-emerald-50'
          : pulse === 'down'
            ? 'scale-105 border-red-400 ring-2 ring-red-300 bg-red-50'
            : 'border-[#3E2723]/10'
      }`}
      title={label}
    >
      <span className="text-sm sm:text-base leading-none shrink-0 flex items-center justify-center">
        {icon}
      </span>
      <div className="flex flex-col leading-tight min-w-0">
        <div className="flex items-center gap-0.5">
          <AnimatedCounter
            value={value}
            className={`text-xs sm:text-sm font-black tabular-nums transition-colors duration-300 ${
              pulse === 'up'
                ? 'text-emerald-700 font-black'
                : pulse === 'down'
                  ? 'text-red-700 font-black'
                  : colorClass
            }`}
          />
          {unit && (
            <span className="text-[9px] sm:text-[10px] font-bold text-[#795548]">{unit}</span>
          )}
        </div>
      </div>

      {pulse && (
        <span
          className={`absolute -top-1.5 -right-1 text-[9px] font-black px-1 rounded-full text-white animate-bounce pointer-events-none ${
            pulse === 'up' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {pulse === 'up' ? '▲' : '▼'}
        </span>
      )}
    </div>
  )
}

export const ResourceHUD: React.FC = () => {
  const { player, inventory } = useGame()

  if (!player) return null

  const currentLevel = player.level || 1
  const currentXp = player.xp || 0
  const xpNeeded = getXpForLevel(currentLevel)
  const xpPercent = Math.min(100, Math.round((currentXp / Math.max(1, xpNeeded)) * 100))

  const sojaCount = inventory.find((i) => i.crop_type === 'soja')?.quantity || 0
  const trigoCount = inventory.find((i) => i.crop_type === 'trigo')?.quantity || 0
  const breadCount = player.bread_count || 0
  const coinsCount = player.coins || 0
  const workersCount = player.hired_workers || 0

  return (
    <div className="sticky top-20 z-30 w-full bg-[#FFF9F0]/95 backdrop-blur-md border-b border-[#3E2723]/10 shadow-xs px-2 sm:px-4 py-1.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar">
        {/* Level & XP Mini Bar */}
        <div className="flex items-center gap-2 shrink-0 bg-white/70 px-2 py-1 rounded-xl border border-purple-200">
          <div className="flex items-center gap-1 text-[11px] font-black text-[#5E35B1]">
            <TrendingUp className="w-3.5 h-3.5 text-[#5E35B1]" />
            <span>N{currentLevel}</span>
          </div>
          <div className="w-12 sm:w-20 h-2 bg-[#E0D8CB] rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-gradient-to-r from-[#8BC34A] to-[#FFB74D] rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-[#795548] font-bold hidden sm:inline tabular-nums">
            {xpPercent}%
          </span>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Moedas (Ouro) */}
          <LiveResourceItem
            icon={<Coins className="w-4 h-4 text-[#FB8C00] fill-[#FFE082]" />}
            value={coinsCount}
            label="Moedas de Ouro"
            colorClass="text-[#E65100]"
          />

          {/* Soja */}
          <LiveResourceItem
            icon="🌱"
            value={sojaCount}
            label="Soja no Celeiro"
            colorClass="text-[#2E7D32]"
            unit="soja"
          />

          {/* Pães */}
          <LiveResourceItem
            icon="🥖"
            value={breadCount}
            label="Pães Assados"
            colorClass="text-[#D84315]"
            unit="pão"
          />

          {/* Trigo */}
          <LiveResourceItem
            icon="🌾"
            value={trigoCount}
            label="Trigo Colhido"
            colorClass="text-[#F57F17]"
            unit="trigo"
          />

          {/* Ajudantes */}
          {workersCount > 0 && (
            <LiveResourceItem
              icon="🧑‍🌾"
              value={workersCount}
              label="Ajudantes Ativos"
              colorClass="text-[#1976D2]"
            />
          )}
        </div>
      </div>
    </div>
  )
}
