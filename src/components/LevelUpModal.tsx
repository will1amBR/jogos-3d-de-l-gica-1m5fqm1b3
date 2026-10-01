import React, { useMemo } from 'react'
import { Sparkles, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LevelUpModalProps {
  level: number
  bonusCoins: number
  onClose: () => void
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ level, bonusCoins, onClose }) => {
  // Generate random confetti pieces
  const confettiPieces = useMemo(() => {
    const colors = ['#8BC34A', '#FFB74D', '#5E35B1', '#FF5722', '#00BCD4', '#FFEB3B']
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${Math.random() * 95}%`,
      delay: `${Math.random() * 1.5}s`,
      size: `${Math.random() * 8 + 8}px`,
      duration: `${Math.random() * 1.5 + 2.5}s`,
    }))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Confetti particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {confettiPieces.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm animate-confetti"
            style={{
              left: p.left,
              top: '-20px',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md bg-[#FFF9F0] border-4 border-[#FFB74D] rounded-3xl p-8 shadow-2xl text-center transform animate-in zoom-in-95 duration-200">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-[#5E35B1] to-[#8E24AA] flex items-center justify-center text-white shadow-lg animate-bounce">
          <Award className="w-12 h-12" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-[#5E35B1] text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          Subiu de Nível!
        </div>

        <h2 className="text-3xl font-extrabold text-[#3E2723] mb-1">Parabéns, Herói!</h2>
        <p className="text-[#795548] text-sm mb-6">
          Sua dedicação aos jogos e à fazenda elevou suas habilidades de fazendeiro e pensador!
        </p>

        <div className="bg-[#F5F0E8] rounded-2xl p-4 border border-[#FFB74D]/40 mb-6 flex items-center justify-around">
          <div>
            <div className="text-xs uppercase font-bold text-[#795548]">Novo Nível</div>
            <div className="text-3xl font-black text-[#5E35B1] tabular-nums">Lv. {level}</div>
          </div>
          <div className="w-[1px] h-10 bg-amber-300" />
          <div>
            <div className="text-xs uppercase font-bold text-[#795548]">Bônus de Ouro</div>
            <div className="text-3xl font-black text-[#FFB74D] tabular-nums flex items-center justify-center gap-1">
              <span>🪙</span> +{bonusCoins}
            </div>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-extrabold text-lg py-6 rounded-2xl shadow-lg transition-transform active:scale-95"
        >
          Continuar Jogando! 🚀
        </Button>
      </div>
    </div>
  )
}
