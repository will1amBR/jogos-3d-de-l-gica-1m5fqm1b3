import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import type {
  PlayerRecord,
  DailyQuestRecord,
  FarmInventoryRecord,
  QuestType,
  CropType,
  UpgradeId,
  CustomerOrderRecord,
  PlayerAchievementRecord,
  PlayerPlaceRecord,
  StoryPlace,
  AchievementDef,
} from '@/types/game'
import {
  getXpForLevel,
  CROPS,
  UPGRADES,
  getUpgradeCost,
  ACHIEVEMENTS,
  STORY_PLACES,
  getWorkerHireCost,
} from '@/types/game'
import {
  fetchPlayerByUser,
  createInitialPlayer,
  updatePlayerStats,
  fetchDailyQuest,
  updateDailyQuestProgress,
  fetchFarmInventory,
  addFarmInventory,
  deductFarmInventory,
  clearFarmInventory,
  fetchPlayerUpgrades,
  purchasePlayerUpgrade,
  fetchCustomerOrders,
  fulfillCustomerOrder,
  generateNewCustomerOrder,
  seedInitialCustomerOrders,
  fetchPlayerAchievements,
  claimPlayerAchievement,
  fetchPlayerPlaces,
  recordPlaceVisited,
} from '@/services/player'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'

interface LevelUpInfo {
  newLevel: number
  bonusCoins: number
}

interface StoryModalInfo {
  place: StoryPlace
  rewardCoins: number
  rewardXp: number
  isFirstVisit: boolean
}

interface GameContextType {
  user: any | null
  player: PlayerRecord | null
  dailyQuest: DailyQuestRecord | null
  inventory: FarmInventoryRecord[]
  upgrades: Record<UpgradeId, number>
  customerOrders: CustomerOrderRecord[]
  claimedAchievements: Record<string, boolean>
  visitedPlaces: Record<string, boolean>
  isLoading: boolean
  levelUpModal: LevelUpInfo | null
  storyModal: StoryModalInfo | null
  closeLevelUpModal: () => void
  closeStoryModal: () => void
  openStoryModal: (place: StoryPlace) => void
  addReward: (xpGained: number, coinsGained: number, reason?: string) => Promise<void>
  addQuestProgress: (questType: QuestType, amount?: number) => Promise<void>
  harvestCrop: (cropType: CropType) => Promise<{ extraYield: boolean }>
  sellAllInventory: () => Promise<{ soldCount: number; coinsEarned: number; xpEarned: number }>
  unlockPlots: (cost: number, newCount: number) => Promise<boolean>
  buyUpgrade: (upgradeId: UpgradeId) => Promise<boolean>
  hireWorker: () => Promise<boolean>
  bakeBread: (breadAmount?: number) => Promise<boolean>
  deliverCustomerOrder: (order: CustomerOrderRecord) => Promise<boolean>
  claimAchievement: (achievement: AchievementDef) => Promise<boolean>
  visitAndClaimPlace: (place: StoryPlace) => Promise<boolean>
  refreshPlayer: () => Promise<void>
  refreshInventory: () => Promise<void>
  refreshQuest: () => Promise<void>
  refreshUpgrades: () => Promise<void>
  refreshCustomerOrders: () => Promise<void>
  refreshAchievements: () => Promise<void>
  refreshPlaces: () => Promise<void>
  logout: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(pb.authStore.model)
  const [player, setPlayer] = useState<PlayerRecord | null>(null)
  const [dailyQuest, setDailyQuest] = useState<DailyQuestRecord | null>(null)
  const [inventory, setInventory] = useState<FarmInventoryRecord[]>([])
  const [upgrades, setUpgrades] = useState<Record<UpgradeId, number>>({
    faster_tools: 0,
    fertilizers: 0,
    sell_bonus: 0,
    bakery: 0,
  })
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderRecord[]>([])
  const [claimedAchievements, setClaimedAchievements] = useState<Record<string, boolean>>({})
  const [visitedPlaces, setVisitedPlaces] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [levelUpModal, setLevelUpModal] = useState<LevelUpInfo | null>(null)
  const [storyModal, setStoryModal] = useState<StoryModalInfo | null>(null)

  // Listen to authStore changes
  useEffect(() => {
    return pb.authStore.onChange((token, model) => {
      setUser(model)
    })
  }, [])

  // Load player profile, quest, inventory, upgrades, orders, achievements, places
  const loadPlayerData = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      setPlayer(null)
      setDailyQuest(null)
      setInventory([])
      setUpgrades({ faster_tools: 0, fertilizers: 0, sell_bonus: 0, bakery: 0 })
      setCustomerOrders([])
      setClaimedAchievements({})
      setVisitedPlaces({})
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

      // Fetch all subsystems in parallel
      const [q, inv, upgs, orders, achs, places] = await Promise.all([
        fetchDailyQuest(p.id),
        fetchFarmInventory(p.id),
        fetchPlayerUpgrades(p.id),
        fetchCustomerOrders(p.id),
        fetchPlayerAchievements(p.id),
        fetchPlayerPlaces(p.id),
      ])

      setDailyQuest(q)
      setInventory(inv)
      setUpgrades(upgs)

      // If orders empty, seed initial orders
      if (orders.length === 0) {
        const seeded = await seedInitialCustomerOrders(p.id)
        setCustomerOrders(seeded)
      } else {
        setCustomerOrders(orders)
      }

      // Map claimed achievements map
      const achMap: Record<string, boolean> = {}
      for (const a of achs) {
        if (a.claimed) achMap[a.achievement_id] = true
      }
      setClaimedAchievements(achMap)

      // Map visited places map
      const placeMap: Record<string, boolean> = {}
      for (const pl of places) {
        if (pl.claimed_reward || pl.visited) placeMap[pl.place_id] = true
      }
      setVisitedPlaces(placeMap)
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

  const refreshUpgrades = useCallback(async () => {
    if (player?.id) {
      const upgs = await fetchPlayerUpgrades(player.id)
      setUpgrades(upgs)
    }
  }, [player?.id])

  const refreshCustomerOrders = useCallback(async () => {
    if (player?.id) {
      const orders = await fetchCustomerOrders(player.id)
      setCustomerOrders(orders)
    }
  }, [player?.id])

  const refreshAchievements = useCallback(async () => {
    if (player?.id) {
      const achs = await fetchPlayerAchievements(player.id)
      const achMap: Record<string, boolean> = {}
      for (const a of achs) {
        if (a.claimed) achMap[a.achievement_id] = true
      }
      setClaimedAchievements(achMap)
    }
  }, [player?.id])

  const refreshPlaces = useCallback(async () => {
    if (player?.id) {
      const places = await fetchPlayerPlaces(player.id)
      const placeMap: Record<string, boolean> = {}
      for (const pl of places) {
        if (pl.claimed_reward || pl.visited) placeMap[pl.place_id] = true
      }
      setVisitedPlaces(placeMap)
    }
  }, [player?.id])

  const closeLevelUpModal = () => {
    setLevelUpModal(null)
  }

  const closeStoryModal = () => {
    setStoryModal(null)
  }

  const openStoryModal = (place: StoryPlace) => {
    const isClaimed = visitedPlaces[place.id] || false
    setStoryModal({
      place,
      rewardCoins: place.rewardCoins,
      rewardXp: place.rewardXp,
      isFirstVisit: !isClaimed,
    })
  }

  // RPG Progression: Shared reward handler with level-up check
  const addReward = useCallback(
    async (xpGained: number, coinsGained: number, reason?: string) => {
      if (!player) return

      let currentXp = (player.xp || 0) + xpGained
      let currentCoins = Math.max(0, (player.coins || 0) + coinsGained)
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

  // Farm Harvest Crop (takes fertilizers upgrade into account)
  const harvestCrop = useCallback(
    async (cropType: CropType): Promise<{ extraYield: boolean }> => {
      if (!player) return { extraYield: false }
      const crop = CROPS[cropType]

      // Check fertilizer bonus (15% chance per level for extra crop)
      const fertilizerLevel = upgrades.fertilizers || 0
      const extraChance = fertilizerLevel * 0.15
      const extraYield = Math.random() < extraChance
      const yieldAmount = extraYield ? 2 : 1

      await addFarmInventory(player.id, cropType, yieldAmount)

      const updates: Partial<PlayerRecord> = {
        total_harvests: (player.total_harvests || 0) + 1,
      }
      if (cropType === 'soja') {
        updates.total_soja_harvested = (player.total_soja_harvested || 0) + yieldAmount
      }

      const updated = await updatePlayerStats(player.id, updates)
      setPlayer(updated)
      await refreshInventory()

      const xpEarned = crop.xpReward * yieldAmount
      const coinsEarned = 5 * yieldAmount
      await addReward(
        xpEarned,
        coinsEarned,
        extraYield ? `Colheita Dupla! ${crop.name} x2 🌟` : `Colheita: ${crop.name}`,
      )
      await addQuestProgress('harvest', 1)

      return { extraYield }
    },
    [player, upgrades.fertilizers, refreshInventory, addReward, addQuestProgress],
  )

  // Sell All Inventory (takes sell_bonus upgrade into account)
  const sellAllInventory = useCallback(async () => {
    if (!player) return { soldCount: 0, coinsEarned: 0, xpEarned: 0 }

    const inv = await fetchFarmInventory(player.id)
    const dailyMult = player.farm_daily_price_multiplier || 1.15
    const sellBonusLevel = upgrades.sell_bonus || 0
    // +8% sell price per upgrade level
    const upgradeMult = 1.0 + sellBonusLevel * 0.08
    const totalMultiplier = dailyMult * upgradeMult

    let totalCoins = 0
    let totalXp = 0
    let totalItems = 0

    for (const item of inv) {
      if (item.quantity > 0 && CROPS[item.crop_type as CropType]) {
        const crop = CROPS[item.crop_type as CropType]
        const unitPrice = Math.round(crop.baseSellPrice * totalMultiplier)
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
  }, [player, upgrades.sell_bonus, refreshInventory, addReward])

  // Unlock Plots
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

  // Buy Upgrade
  const buyUpgrade = useCallback(
    async (upgradeId: UpgradeId): Promise<boolean> => {
      if (!player) return false
      const currentLevel = upgrades[upgradeId] || 0
      const cfg = UPGRADES[upgradeId]

      if (currentLevel >= cfg.maxLevel) {
        toast({
          title: 'Nível Máximo!',
          description: `Esta melhoria já atingiu o nível máximo (${cfg.maxLevel}).`,
        })
        return false
      }

      const cost = getUpgradeCost(upgradeId, currentLevel)
      if ((player.coins || 0) < cost) {
        toast({
          title: 'Moedas insuficientes!',
          description: `Você precisa de ${cost} moedas para aprimorar ${cfg.name}.`,
          variant: 'destructive',
        })
        return false
      }

      const newLevel = currentLevel + 1
      await purchasePlayerUpgrade(player.id, upgradeId, newLevel)
      const updated = await updatePlayerStats(player.id, {
        coins: (player.coins || 0) - cost,
      })
      setPlayer(updated)
      setUpgrades((prev) => ({ ...prev, [upgradeId]: newLevel }))

      toast({
        title: `✨ ${cfg.name} Nível ${newLevel}!`,
        description: `Melhoria adquirida com sucesso por ${cost} moedas!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
      return true
    },
    [player, upgrades],
  )

  // Hire Worker
  const hireWorker = useCallback(async (): Promise<boolean> => {
    if (!player) return false
    const currentWorkers = player.hired_workers || 0
    const cost = getWorkerHireCost(currentWorkers)

    if ((player.coins || 0) < cost) {
      toast({
        title: 'Moedas insuficientes!',
        description: `Você precisa de ${cost} moedas para contratar um novo trabalhador.`,
        variant: 'destructive',
      })
      return false
    }

    const updated = await updatePlayerStats(player.id, {
      coins: (player.coins || 0) - cost,
      hired_workers: currentWorkers + 1,
    })
    setPlayer(updated)

    toast({
      title: '🧑‍🌾 Trabalhador Contratado!',
      description: `Agora você possui ${currentWorkers + 1} trabalhadores cuidando das colheitas!`,
      className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
    })
    return true
  }, [player])

  // Bake Bread (requires Forno level >= 1, consumes 2 Trigo per Pão)
  const bakeBread = useCallback(
    async (breadAmount: number = 1): Promise<boolean> => {
      if (!player) return false
      const bakeryLevel = upgrades.bakery || 0
      if (bakeryLevel < 1) {
        toast({
          title: 'Forno Bloqueado!',
          description: 'Compre a melhoria "Forno do Padeiro" na Loja de Melhorias para assar pães!',
          variant: 'destructive',
        })
        return false
      }

      const trigoRequired = breadAmount * 2
      const trigoItem = inventory.find((i) => i.crop_type === 'trigo')
      const currentTrigo = trigoItem?.quantity || 0

      if (currentTrigo < trigoRequired) {
        toast({
          title: 'Trigo insuficiente!',
          description: `Você precisa de ${trigoRequired} unidades de Trigo para assar ${breadAmount} pão(es).`,
          variant: 'destructive',
        })
        return false
      }

      await deductFarmInventory(player.id, 'trigo', trigoRequired)
      const currentBread = player.bread_count || 0
      const updated = await updatePlayerStats(player.id, {
        bread_count: currentBread + breadAmount,
      })
      setPlayer(updated)
      await refreshInventory()

      // Give bonus crafting XP
      const xpBonus = breadAmount * 25
      await addReward(xpBonus, 0, `Padeiro: ${breadAmount}x Pão Assado 🥖`)

      toast({
        title: '🥖 Fornada Pronta!',
        description: `Você assou ${breadAmount} pão(es) frescos e aromáticos!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
      return true
    },
    [player, upgrades.bakery, inventory, refreshInventory, addReward],
  )

  // Deliver Customer Order (Township style)
  const deliverCustomerOrder = useCallback(
    async (order: CustomerOrderRecord): Promise<boolean> => {
      if (!player) return false

      if (order.item_type === 'pao') {
        const currentBread = player.bread_count || 0
        if (currentBread < order.quantity_required) {
          toast({
            title: 'Pães insuficientes!',
            description: `Este cliente precisa de ${order.quantity_required} pão(es). Você tem ${currentBread}.`,
            variant: 'destructive',
          })
          return false
        }

        // Deduct bread
        const updated = await updatePlayerStats(player.id, {
          bread_count: currentBread - order.quantity_required,
          total_bread_delivered: (player.total_bread_delivered || 0) + order.quantity_required,
        })
        setPlayer(updated)
      } else {
        // Crop order
        const cropItem = inventory.find((i) => i.crop_type === order.item_type)
        const currentQty = cropItem?.quantity || 0
        if (currentQty < order.quantity_required) {
          toast({
            title: 'Colheita insuficiente!',
            description: `Você precisa de ${order.quantity_required} un. de ${order.item_type}.`,
            variant: 'destructive',
          })
          return false
        }
        await deductFarmInventory(player.id, order.item_type as CropType, order.quantity_required)
        await refreshInventory()
      }

      // Mark order fulfilled
      await fulfillCustomerOrder(order.id)

      // Grant rewards
      await addReward(
        order.reward_xp,
        order.reward_coins,
        `Entrega Feita: ${order.customer_name}! 📦`,
      )

      // Generate a new customer order to replace it
      const newOrder = await generateNewCustomerOrder(player.id, (upgrades.bakery || 0) >= 1)
      setCustomerOrders((prev) => [...prev.filter((o) => o.id !== order.id), newOrder])

      toast({
        title: '📦 Pedido Entregue com Sucesso!',
        description: `${order.customer_name} pagou 🪙 ${order.reward_coins} moedas e você ganhou +${order.reward_xp} XP!`,
        className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
      })
      return true
    },
    [player, inventory, upgrades.bakery, refreshInventory, addReward],
  )

  // Claim Achievement
  const claimAchievement = useCallback(
    async (achievement: AchievementDef): Promise<boolean> => {
      if (!player) return false
      if (claimedAchievements[achievement.id]) {
        toast({
          title: 'Já Reclamada!',
          description: 'Esta conquista já foi resgatada.',
        })
        return false
      }

      const progress = achievement.getProgress(player)
      if (progress < achievement.target) {
        toast({
          title: 'Ainda em andamento!',
          description: `Progresso atual: ${progress} / ${achievement.target}.`,
          variant: 'destructive',
        })
        return false
      }

      await claimPlayerAchievement(player.id, achievement.id)
      setClaimedAchievements((prev) => ({ ...prev, [achievement.id]: true }))

      await addReward(
        achievement.rewardXp,
        achievement.rewardCoins,
        `🏆 Conquista: ${achievement.title}`,
      )

      toast({
        title: `🏆 Conquista Desbloqueada: ${achievement.title}!`,
        description: `Recompensa: +${achievement.rewardXp} XP e +${achievement.rewardCoins} Moedas!`,
        className: 'bg-amber-50 border-amber-400 text-amber-950 font-black',
      })
      return true
    },
    [player, claimedAchievements, addReward],
  )

  // Visit and Claim Place on the RPG Story Map
  const visitAndClaimPlace = useCallback(
    async (place: StoryPlace): Promise<boolean> => {
      if (!player) return false
      const playerLevel = player.level || 1
      if (playerLevel < place.requiredLevel) {
        toast({
          title: 'Lugar Bloqueado!',
          description: `Você precisa alcançar o Nível ${place.requiredLevel} para desbravar ${place.name}.`,
          variant: 'destructive',
        })
        return false
      }

      const alreadyClaimed = visitedPlaces[place.id]
      if (alreadyClaimed) {
        // Just show narrative modal again
        openStoryModal(place)
        return true
      }

      await recordPlaceVisited(player.id, place.id, true)
      setVisitedPlaces((prev) => ({ ...prev, [place.id]: true }))

      await addReward(place.rewardXp, place.rewardCoins, `🗺️ Novo Território: ${place.name}!`)

      openStoryModal(place)

      toast({
        title: `🗺️ Você descobriu: ${place.name}!`,
        description: `Recompensa de exploração: +${place.rewardXp} XP e +${place.rewardCoins} Moedas!`,
        className: 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black',
      })
      return true
    },
    [player, visitedPlaces, addReward],
  )

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setPlayer(null)
    setDailyQuest(null)
    setInventory([])
    setUpgrades({ faster_tools: 0, fertilizers: 0, sell_bonus: 0, bakery: 0 })
    setCustomerOrders([])
    setClaimedAchievements({})
    setVisitedPlaces({})
  }

  return (
    <GameContext.Provider
      value={{
        user,
        player,
        dailyQuest,
        inventory,
        upgrades,
        customerOrders,
        claimedAchievements,
        visitedPlaces,
        isLoading,
        levelUpModal,
        storyModal,
        closeLevelUpModal,
        closeStoryModal,
        openStoryModal,
        addReward,
        addQuestProgress,
        harvestCrop,
        sellAllInventory,
        unlockPlots,
        buyUpgrade,
        hireWorker,
        bakeBread,
        deliverCustomerOrder,
        claimAchievement,
        visitAndClaimPlace,
        refreshPlayer,
        refreshInventory,
        refreshQuest,
        refreshUpgrades,
        refreshCustomerOrders,
        refreshAchievements,
        refreshPlaces,
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
