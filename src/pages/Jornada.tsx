import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Lock,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Coins,
  BookOpen,
  Award,
  ChevronRight,
  Compass,
} from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { STORY_PLACES, type StoryPlace } from '@/types/game'
import { Button } from '@/components/ui/button'

export default function Jornada() {
  const { player, visitedPlaces, visitAndClaimPlace, openStoryModal } = useGame()
  const [selectedPlace, setSelectedPlace] = useState<StoryPlace | null>(STORY_PLACES[0])
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const currentLevel = player?.level || 1

  const handlePlaceClick = async (place: StoryPlace) => {
    setSelectedPlace(place)
    const isUnlocked = currentLevel >= place.requiredLevel
    const isVisited = visitedPlaces[place.id]

    if (isUnlocked && !isVisited) {
      setClaimingId(place.id)
      try {
        await visitAndClaimPlace(place)
      } finally {
        setClaimingId(null)
      }
    } else {
      openStoryModal(place)
    }
  }

  const unlockedCount = STORY_PLACES.filter((p) => currentLevel >= p.requiredLevel).length
  const visitedCount = Object.keys(visitedPlaces).length

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
                <Compass className="w-7 h-7 text-[#8BC34A]" /> Jornada do Reino • Mapa RPG
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Lugares lendários que se desbloqueiam conforme você sobe de nível!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-purple-100 text-[#5E35B1] px-3.5 py-1.5 rounded-2xl">
              Nível {currentLevel} • {unlockedCount} de {STORY_PLACES.length} Lugares Liberados
            </span>
          </div>
        </div>

        {/* Illustrated World Map Canvas / Graphic Area */}
        <div className="relative overflow-hidden rounded-3xl border-4 border-[#8BC34A]/40 bg-gradient-to-br from-[#E8F5E9] via-[#FFF9C4] to-[#C8E6C9] p-6 sm:p-10 shadow-lg min-h-[380px] sm:min-h-[460px]">
          {/* Subtle Map Compass background decoration */}
          <div className="absolute top-4 right-4 opacity-15 pointer-events-none">
            <Compass className="w-48 h-48 text-[#2E7D32]" />
          </div>

          {/* SVG Connection Path between Places */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <path
              d="M 12% 78% Q 20% 70%, 28% 62% T 42% 75% T 38% 38% T 58% 48% T 74% 32% T 72% 70% T 88% 52%"
              fill="none"
              stroke="#8D6E63"
              strokeWidth="4"
              strokeDasharray="8 8"
              opacity="0.6"
            />
          </svg>

          {/* Map Node Pins */}
          <div className="relative z-10 w-full h-full min-h-[340px] sm:min-h-[400px]">
            {STORY_PLACES.map((place, idx) => {
              const isUnlocked = currentLevel >= place.requiredLevel
              const isVisited = visitedPlaces[place.id]
              const isSelected = selectedPlace?.id === place.id

              return (
                <div
                  key={place.id}
                  style={{
                    left: `${place.position.x}%`,
                    top: `${place.position.y}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                  onClick={() => handlePlaceClick(place)}
                >
                  {/* Pin Circle */}
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 shadow-md ${
                      isSelected ? 'ring-4 ring-[#FF9800] scale-110' : ''
                    } ${
                      isVisited
                        ? 'bg-[#8BC34A] text-white border-2 border-white'
                        : isUnlocked
                          ? 'bg-[#FFB74D] text-[#3E2723] animate-pulse border-2 border-white'
                          : 'bg-stone-300 text-stone-500 border-2 border-stone-400 opacity-80'
                    }`}
                  >
                    {isUnlocked ? place.icon : <Lock className="w-5 h-5" />}
                  </div>

                  {/* Place Name Tag */}
                  <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#3E2723]/20 shadow-sm text-center whitespace-nowrap">
                    <span className="text-[11px] font-black text-[#3E2723] block leading-tight">
                      {place.name}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold ${
                        isVisited
                          ? 'text-[#2E7D32]'
                          : isUnlocked
                            ? 'text-[#E65100]'
                            : 'text-stone-500'
                      }`}
                    >
                      {isVisited
                        ? '✓ Concluído'
                        : isUnlocked
                          ? '⭐ Desbloqueado!'
                          : `Nível ${place.requiredLevel}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Place Details Card */}
        {selectedPlace && (
          <div className="bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-3xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center text-4xl shadow-inner shrink-0">
                  {selectedPlace.icon}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      {selectedPlace.tag}
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        currentLevel >= selectedPlace.requiredLevel
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      Requer Nível {selectedPlace.requiredLevel}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-[#3E2723]">{selectedPlace.name}</h2>
                  <p className="text-xs sm:text-sm text-[#795548] font-bold">
                    {selectedPlace.shortDescription}
                  </p>
                </div>
              </div>

              {/* Rewards */}
              <div className="bg-white rounded-2xl border border-amber-200 p-4 shrink-0 min-w-[200px] text-right space-y-1">
                <div className="text-[11px] font-bold text-[#795548] uppercase">
                  Recompensa de Descoberta:
                </div>
                <div className="text-lg font-black text-[#E65100]">
                  🪙 +{selectedPlace.rewardCoins} moedas
                </div>
                <div className="text-sm font-black text-[#2E7D32]">
                  🌟 +{selectedPlace.rewardXp} XP
                </div>
              </div>
            </div>

            {/* Narrative Box */}
            <div className="mt-6 p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#8D6E63]">
                <BookOpen className="w-4 h-4" />
                <span>História do Território (RPG)</span>
              </div>
              <p className="text-sm text-[#3E2723] font-medium leading-relaxed italic">
                "{selectedPlace.storyText}"
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-bold text-[#795548]">
                {visitedPlaces[selectedPlace.id] ? (
                  <span className="text-[#2E7D32] flex items-center gap-1.5 font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    Você já desbravou este local e resgatou sua recompensa de ouro e XP!
                  </span>
                ) : currentLevel >= selectedPlace.requiredLevel ? (
                  <span className="text-[#E65100] font-black">
                    ⭐ Local disponível! Clique abaixo para resgatar sua recompensa de descoberta.
                  </span>
                ) : (
                  <span className="text-stone-500">
                    🔒 Suba para o Nível {selectedPlace.requiredLevel} para desbloquear este local.
                  </span>
                )}
              </div>

              <Button
                onClick={() => handlePlaceClick(selectedPlace)}
                disabled={
                  currentLevel < selectedPlace.requiredLevel || claimingId === selectedPlace.id
                }
                className={`font-black rounded-2xl h-11 px-6 text-sm ${
                  visitedPlaces[selectedPlace.id]
                    ? 'bg-amber-100 hover:bg-amber-200 text-[#3E2723]'
                    : currentLevel >= selectedPlace.requiredLevel
                      ? 'bg-[#8BC34A] hover:bg-[#7CB342] text-white shadow-md'
                      : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                }`}
              >
                {visitedPlaces[selectedPlace.id]
                  ? 'Ler História Novamente'
                  : currentLevel >= selectedPlace.requiredLevel
                    ? 'Desbravar & Coletar Tesouro! 🎁'
                    : `Requer Nível ${selectedPlace.requiredLevel}`}
              </Button>
            </div>
          </div>
        )}

        {/* All Places List / Accordion Preview */}
        <div className="space-y-3">
          <h3 className="text-lg font-black text-[#3E2723] flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#8BC34A]" /> Roteiro Completo de Lugares (
            {STORY_PLACES.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STORY_PLACES.map((p) => {
              const isUnlocked = currentLevel >= p.requiredLevel
              const isVisited = visitedPlaces[p.id]

              return (
                <div
                  key={p.id}
                  onClick={() => handlePlaceClick(p)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    selectedPlace?.id === p.id
                      ? 'border-[#8BC34A] bg-[#F1F8E9]'
                      : 'border-[#3E2723]/10 bg-white hover:border-[#8BC34A]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{p.icon}</span>
                    <div>
                      <div className="text-sm font-black text-[#3E2723] flex items-center gap-2">
                        {p.name}
                        {isVisited && (
                          <span className="text-xs text-[#2E7D32]">
                            <CheckCircle2 className="w-4 h-4 inline" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#795548] font-bold">
                        {isUnlocked
                          ? p.shortDescription
                          : `Desbloqueia no Nível ${p.requiredLevel}`}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-[#795548]" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AuthGate>
  )
}
