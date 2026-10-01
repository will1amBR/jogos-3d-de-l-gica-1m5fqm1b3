import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import type {
  PlayerRecord,
  DailyQuestRecord,
  FarmInventoryRecord,
  QuestType,
  CropType,
} from '@/types/game'
import { getXpForLevel, CROPS } from '@/types/game'
import {
  fetchPlayerByUser,
  createInitialPlayer,
  updatePlayerStats,
  fetchDailyQuest,
  updateDailyQuestProgress,
  fetchFarmInventory,
  addFarmInventory,
  clearFarmInventory,
} from '@/services/player'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'

interface LevelUpInfo {
  newLevel: number
  bonusCoins: number
}

interface GameContextType {
  user: any | null
  player: PlayerRecord | null
  dailyQuest: DailyQuestRecord | null
  inventory: FarmInventoryRecord[]
  isLoading: boolean
  levelUpModal: LevelUpInfo | null
  closeLevelUpModal: () => void
  addReward: (xpGained: number, coinsGained: number, reason?: string) => Promise<void>
  addQuestProgress: (questType: QuestType, amount?: number) => Promise<void>
  harvestCrop: (cropType: CropType) => Promise<void>
  sellAllInventory: () => Promise<{ soldCount: number; coinsEarned: number; xpEarned: number }>
  unlockPlots: (cost: number, newCount: number) => Promise<boolean>
  refreshPlayer: () => Promise<void>
  refreshInventory: () => Promise<void>
  refreshQuest: () => Promise<void>
  logout: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(pb.authStore.model)
  const [player, setPlayer] = useState<PlayerRecord | null>(null)
  const [dailyQuest, setDailyQuest] = useState<DailyQuestRecord | null>(null)
  const [inventory, setInventory] = useState<FarmInventoryRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [levelUpModal, setLevelUpModal] = useState<LevelUpInfo | null>(null)

  // Listen to authStore changes
  useEffect(() => {
    return pb.authStore.onChange((token, model) => {
      setUser(model)
    })
  }, [])

  // Load player profile, quest, inventory
  const loadPlayerData = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      setPlayer(null)
      setDailyQuest(null)
      setInventory([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const currentUserId = pb.authStore.model.id
      let p = await fetchPlayerByUser(currentUserId)

      if (!p) {
        // Player doesn't exist yet, auto-create
        p = await createInitialPlayer(currentUserId)
      }

      setPlayer(p)

      // Fetch quest and inventory
      const [q, inv] = await Promise.all([fetchDailyQuest(p.id), fetchFarmInventory(p.id)])

      setDailyQuest(q)
      setInventory(inv)
    } catch (err) {
      console.error('Error loading player data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlayerData()
  }, [user?.id, loadPlayerData])

  // Real-time listener for player updates
  useRealtime<PlayerRecord>(
    'player',
    (e) => {
      if (player && e.record.id === player.id) {
        setPlayer((prev) => (prev ? { ...prev, ...e.record } : e.record))
      }
    },
    Boolean(player?.id),
  )

  // Real-time listener for daily quests
  useRealtime<DailyQuestRecord>(
    'daily_quests',
    (e) => {
      if (dailyQuest && e.record.id === dailyQuest.id) {
        setDailyQuest((prev) => (prev ? { ...prev, ...e.record } : e.record))
      }
    },
    Boolean(dailyQuest?.id),
  )

  // Real-time listener for farm inventory
  useRealtime<FarmInventoryRecord>(
    'farm_inventory',
    (e) => {
      if (player && e.record.player === player.id) {
        setInventory((prev) => {
          const index = prev.findIndex((i) => i.id === e.record.id)
          if (e.action === 'delete') {
            return prev.filter((i) => i.id !== e.record.id)
          }
          if (index >= 0) {
            const next = [...prev]
            next[index] = e.record
            return next
          }
          return [...prev, e.record]
        })
      }
    },
    Boolean(player?.id),
  )

  const refreshPlayer = useCallback(async () => {
    if (player?.id) {
      const refreshed = await pb.collection<PlayerRecord>('player').getOne(player.id)
      setPlayer(refreshed)
    }
  }, [player?.id])

  const refreshInventory = useCallback(async () => {
    if (player?.id) {
      const inv = await fetchFarmInventory(player.id)
      setInventory(inv)
    }
  }, [player?.id])

  const refreshQuest = useCallback(async () => {
    if (player?.id) {
      const q = await fetchDailyQuest(player.id)
      setDailyQuest(q)
    }
  }, [player?.id])

  const closeLevelUpModal = () => {
    setLevelUpModal(null)
  }

  // RPG Progression: Shared reward handler with level-up check
  const addReward = useCallback(
    async (xpGained: number, coinsGained: number, reason?: string) => {
      if (!player) return

      let currentXp = (player.xp || 0) + xpGained
      let currentCoins = (player.coins || 0) + coinsGained
      let currentLevel = player.level || 1
      let leveledUp = false
      let totalBonusCoins = 0

      // Check level up (formula: 100 * level^1.5)
      while (currentXp >= getXpForLevel(currentLevel)) {
        currentXp -= getXpForLevel(currentLevel)
        currentLevel += 1
        leveledUp = true
        // Level up bonus: 100 * level
        const bonus = currentLevel * 100
        totalBonusCoins += bonus
        currentCoins += bonus
      }

      const updated = await updatePlayerStats(player.id, {
        level: currentLevel,
        xp: currentXp,
        coins: currentCoins,
      })

      setPlayer(updated)

      if (leveledUp) {
        setLevelUpModal({
          newLevel: currentLevel,
          bonusCoins: totalBonusCoins,
        })
      } else if (xpGained > 0 || coinsGained > 0) {
        toast({
          title: reason || 'Recompensa Ganha!',
          description: `+${xpGained} XP | +${coinsGained} Moedas`,
          className: 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold',
        })
      }
    },
    [player],
  )

  // Track daily quest progress
  const addQuestProgress = useCallback(
    async (questType: QuestType, amount: number = 1) => {
      if (!dailyQuest || dailyQuest.completed || dailyQuest.quest_type !== questType) {
        return
      }

      const newProg = (dailyQuest.progress || 0) + amount
      const isCompleted = newProg >= dailyQuest.target

      const updated = await updateDailyQuestProgress(dailyQuest.id, newProg, isCompleted)
      setDailyQuest(updated)

      if (isCompleted) {
        toast({
          title: '🎉 Missão Diária Cumprida!',
          description: `Você recebeu +${dailyQuest.reward_xp} XP e +${dailyQuest.reward_coins} Moedas!`,
          className: 'bg-amber-50 border-amber-400 text-amber-950 font-extrabold',
        })
        await addReward(dailyQuest.reward_xp, dailyQuest.reward_coins, 'Missão Diária Concluída!')
      }
    },
    [dailyQuest, addReward],
  )

  // Farm actions
  const harvestCrop = useCallback(
    async (cropType: CropType) => {
      if (!player) return
      const crop = CROPS[cropType]
      await addFarmInventory(player.id, cropType, 1)

      const updated = await updatePlayerStats(player.id, {
        total_harvests: (player.total_harvests || 0) + 1,
      })
      setPlayer(updated)
      await refreshInventory()
      await addReward(crop.xpReward, 5, `Colheita: ${crop.name}`)
      await addQuestProgress('harvest', 1)
    },
    [player, refreshInventory, addReward, addQuestProgress],
  )

  const sellAllInventory = useCallback(async () => {
    if (!player) return { soldCount: 0, coinsEarned: 0, xpEarned: 0 }

    const inv = await fetchFarmInventory(player.id)
    const multiplier = player.farm_daily_price_multiplier || 1.0

    let totalCoins = 0
    let totalXp = 0
    let totalItems = 0

    for (const item of inv) {
      if (item.quantity > 0 && CROPS[item.crop_type as CropType]) {
        const crop = CROPS[item.crop_type as CropType]
        const unitPrice = Math.round(crop.baseSellPrice * multiplier)
        totalCoins += unitPrice * item.quantity
        totalXp += Math.round(crop.xpReward * 0.5) * item.quantity
        totalItems += item.quantity
      }
    }

    if (totalItems > 0) {
      await clearFarmInventory(player.id)
      await refreshInventory()
      await addReward(totalXp, totalCoins, `Venda no Mercado (${totalItems} colheitas)`)
    }

    return { soldCount: totalItems, coinsEarned: totalCoins, xpEarned: totalXp }
  }, [player, refreshInventory, addReward])

  const unlockPlots = useCallback(
    async (cost: number, newCount: number): Promise<boolean> => {
      if (!player) return false
      if ((player.coins || 0) < cost) {
        toast({
          title: 'Moedas insuficientes!',
          description: `Você precisa de ${cost} moedas para desbloquear novos lotes.`,
          variant: 'destructive',
        })
        return false
      }

      const updated = await updatePlayerStats(player.id, {
        coins: (player.coins || 0) - cost,
        farm_plots_unlocked: newCount,
      })
      setPlayer(updated)
      toast({
        title: '🌟 Fazenda Expandida!',
        description: `Agora você possui ${newCount} lotes disponíveis para cultivo!`,
        className: 'bg-emerald-50 border-emerald-400 text-emerald-900',
      })
      return true
    },
    [player],
  )

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setPlayer(null)
    setDailyQuest(null)
    setInventory([])
  }

  return (
    <GameContext.Provider
      value={{
        user,
        player,
        dailyQuest,
        inventory,
        isLoading,
        levelUpModal,
        closeLevelUpModal,
        addReward,
        addQuestProgress,
        harvestCrop,
        sellAllInventory,
        unlockPlots,
        refreshPlayer,
        refreshInventory,
        refreshQuest,
        logout,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextType {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
