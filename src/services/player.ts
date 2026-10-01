import pb from '@/lib/pocketbase/client'
import type {
  PlayerRecord,
  FarmInventoryRecord,
  DailyQuestRecord,
  CropType,
  QuestType,
} from '@/types/game'

export async function fetchPlayerByUser(userId: string): Promise<PlayerRecord | null> {
  try {
    const records = await pb.collection<PlayerRecord>('player').getFullList({
      filter: `user = "${userId}"`,
    })
    return records[0] || null
  } catch (err) {
    console.error('Error fetching player by user:', err)
    return null
  }
}

export async function createInitialPlayer(userId: string): Promise<PlayerRecord> {
  const newPlayer = await pb.collection<PlayerRecord>('player').create({
    user: userId,
    level: 1,
    xp: 0,
    coins: 100,
    total_harvests: 0,
    farm_plots_unlocked: 6,
    farm_owned_crops: [],
    farm_daily_price_multiplier: 1.1,
  })

  // Create initial daily quest
  try {
    await pb.collection<DailyQuestRecord>('daily_quests').create({
      player: newPlayer.id,
      quest_type: 'harvest',
      target: 6,
      progress: 0,
      completed: false,
      reward_xp: 75,
      reward_coins: 100,
    })
  } catch (err) {
    console.error('Error creating initial quest:', err)
  }

  return newPlayer
}

export async function updatePlayerStats(
  playerId: string,
  updates: Partial<PlayerRecord>,
): Promise<PlayerRecord> {
  return await pb.collection<PlayerRecord>('player').update(playerId, updates)
}

export async function fetchFarmInventory(playerId: string): Promise<FarmInventoryRecord[]> {
  try {
    return await pb.collection<FarmInventoryRecord>('farm_inventory').getFullList({
      filter: `player = "${playerId}"`,
    })
  } catch (err) {
    console.error('Error fetching farm inventory:', err)
    return []
  }
}

export async function addFarmInventory(
  playerId: string,
  cropType: CropType,
  amount: number,
): Promise<void> {
  const existing = await pb.collection<FarmInventoryRecord>('farm_inventory').getFullList({
    filter: `player = "${playerId}" && crop_type = "${cropType}"`,
  })

  if (existing.length > 0) {
    const current = existing[0]
    await pb.collection<FarmInventoryRecord>('farm_inventory').update(current.id, {
      quantity: Math.max(0, (current.quantity || 0) + amount),
    })
  } else if (amount > 0) {
    await pb.collection<FarmInventoryRecord>('farm_inventory').create({
      player: playerId,
      crop_type: cropType,
      quantity: amount,
    })
  }
}

export async function clearFarmInventory(playerId: string): Promise<void> {
  const items = await fetchFarmInventory(playerId)
  for (const item of items) {
    if (item.quantity > 0) {
      await pb.collection<FarmInventoryRecord>('farm_inventory').update(item.id, {
        quantity: 0,
      })
    }
  }
}

export async function fetchDailyQuest(playerId: string): Promise<DailyQuestRecord | null> {
  try {
    const quests = await pb.collection<DailyQuestRecord>('daily_quests').getFullList({
      filter: `player = "${playerId}"`,
      sort: '-created',
    })

    if (quests.length > 0) {
      return quests[0]
    }

    // If none exists, create a fresh one
    const newQuest = await pb.collection<DailyQuestRecord>('daily_quests').create({
      player: playerId,
      quest_type: 'harvest',
      target: 8,
      progress: 0,
      completed: false,
      reward_xp: 80,
      reward_coins: 120,
    })
    return newQuest
  } catch (err) {
    console.error('Error fetching or creating daily quest:', err)
    return null
  }
}

export async function updateDailyQuestProgress(
  questId: string,
  progress: number,
  completed: boolean,
): Promise<DailyQuestRecord> {
  return await pb.collection<DailyQuestRecord>('daily_quests').update(questId, {
    progress,
    completed,
  })
}

export async function resetDailyQuest(
  playerId: string,
  type: QuestType = 'harvest',
): Promise<DailyQuestRecord> {
  const targets: Record<QuestType, { target: number; xp: number; coins: number }> = {
    harvest: { target: 10, xp: 90, coins: 150 },
    fill_bottles: { target: 12, xp: 110, coins: 180 },
    tetris_layers: { target: 4, xp: 130, coins: 200 },
  }

  const cfg = targets[type]
  return await pb.collection<DailyQuestRecord>('daily_quests').create({
    player: playerId,
    quest_type: type,
    target: cfg.target,
    progress: 0,
    completed: false,
    reward_xp: cfg.xp,
    reward_coins: cfg.coins,
  })
}
