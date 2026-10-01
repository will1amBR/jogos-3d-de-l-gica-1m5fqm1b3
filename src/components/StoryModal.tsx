import React from 'react'
import { Sparkles, MapPin, Coins, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StoryPlace } from '@/types/game'

interface StoryModalProps {
  place: StoryPlace
  rewardCoins: number
  rewardXp: number
  isFirstVisit: boolean
  onClose: () => void
}

export const StoryModal: React.FC<StoryModalProps> = ({
  place,
  rewardCoins,
  rewardXp,
  isFirstVisit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl p-6 sm:p-8 shadow-2xl text-center transform animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl shadow-inner animate-bounce">
          {place.icon}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#2E7D32] text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          {isFirstVisit ? 'Novo Lugar Descoberto!' : 'Crônica da Região'}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#3E2723] mb-1">{place.name}</h2>
        <p className="text-xs text-[#795548] font-bold mb-4">{place.shortDescription}</p>

        {/* Narrative Box */}
        <div className="bg-[#F5F0E8] rounded-2xl p-4 sm:p-5 border border-amber-200/80 mb-5 text-left">
          <div className="text-[11px] font-black uppercase text-[#8D6E63] mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> História RPG • Crônica Oficial
          </div>
          <p className="text-sm sm:text-base text-[#3E2723] font-medium leading-relaxed italic">
            "{place.storyText}"
          </p>
        </div>

        {/* Reward Pill */}
        {isFirstVisit && (
          <div className="bg-amber-100/80 rounded-2xl p-3 border border-amber-300 mb-6 flex items-center justify-around">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#795548]">
                Bônus de Descoberta
              </div>
              <div className="text-lg font-black text-[#E65100] flex items-center gap-1">
                <span>🪙</span> +{rewardCoins}
              </div>
            </div>
            <div className="w-[1px] h-8 bg-amber-300" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#795548]">
                Experiência Ganhada
              </div>
              <div className="text-lg font-black text-[#2E7D32] flex items-center gap-1">
                <span>🌟</span> +{rewardXp} XP
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={onClose}
          className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-extrabold text-base py-5 rounded-2xl shadow-lg transition-transform active:scale-95"
        >
          {isFirstVisit ? 'Avançar na Aventura! 🗺️' : 'Fechar Crônica'}
        </Button>
      </div>
    </div>
  )
}
