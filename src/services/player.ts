import pb from '@/lib/pocketbase/client'
import type {
  PlayerRecord,
  FarmInventoryRecord,
  DailyQuestRecord,
  CropType,
  QuestType,
  UpgradeId,
  PlayerUpgradeRecord,
  PlayerPlaceRecord,
  PlayerAchievementRecord,
  CustomerOrderRecord,
  PlayerObjectiveRecord,
} from '@/types/game'
import { UPGRADES } from '@/types/game'

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
    farm_daily_price_multiplier: 1.15,
    hired_workers: 0,
    bread_count: 0,
    total_bread_delivered: 0,
    total_soja_harvested: 0,
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

  // Seed baseline customer orders
  try {
    await seedInitialCustomerOrders(newPlayer.id)
  } catch (err) {
    console.error('Error creating initial customer orders:', err)
  }

  return newPlayer
}

export async function updatePlayerStats(
  playerId: string,
  updates: Partial<PlayerRecord>,
): Promise<PlayerRecord> {
  return await pb.collection<PlayerRecord>('player').update(playerId, updates)
}

// --- Farm Inventory ---
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

export async function deductFarmInventory(
  playerId: string,
  cropType: CropType,
  amount: number,
): Promise<boolean> {
  const existing = await pb.collection<FarmInventoryRecord>('farm_inventory').getFullList({
    filter: `player = "${playerId}" && crop_type = "${cropType}"`,
  })

  if (existing.length === 0 || (existing[0].quantity || 0) < amount) {
    return false
  }

  const current = existing[0]
  await pb.collection<FarmInventoryRecord>('farm_inventory').update(current.id, {
    quantity: Math.max(0, (current.quantity || 0) - amount),
  })
  return true
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

// --- Daily Quests ---
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

// --- UPGRADES ---
export async function fetchPlayerUpgrades(playerId: string): Promise<Record<UpgradeId, number>> {
  const result: Record<UpgradeId, number> = {
    faster_tools: 0,
    fertilizers: 0,
    sell_bonus: 0,
    bakery: 0,
  }

  try {
    const records = await pb.collection<PlayerUpgradeRecord>('player_upgrades').getFullList({
      filter: `player = "${playerId}"`,
    })
    for (const r of records) {
      if (r.upgrade_id in result) {
        result[r.upgrade_id as UpgradeId] = r.level || 0
      }
    }
  } catch (err) {
    console.error('Error fetching player upgrades:', err)
  }

  return result
}

export async function purchasePlayerUpgrade(
  playerId: string,
  upgradeId: UpgradeId,
  newLevel: number,
): Promise<void> {
  const existing = await pb.collection<PlayerUpgradeRecord>('player_upgrades').getFullList({
    filter: `player = "${playerId}" && upgrade_id = "${upgradeId}"`,
  })

  if (existing.length > 0) {
    await pb.collection<PlayerUpgradeRecord>('player_upgrades').update(existing[0].id, {
      level: newLevel,
    })
  } else {
    await pb.collection<PlayerUpgradeRecord>('player_upgrades').create({
      player: playerId,
      upgrade_id: upgradeId,
      level: newLevel,
    })
  }
}

// --- PLACES / MAPA RPG ---
export async function fetchPlayerPlaces(playerId: string): Promise<PlayerPlaceRecord[]> {
  try {
    return await pb.collection<PlayerPlaceRecord>('player_places').getFullList({
      filter: `player = "${playerId}"`,
    })
  } catch (err) {
    console.error('Error fetching player places:', err)
    return []
  }
}

export async function recordPlaceVisited(
  playerId: string,
  placeId: string,
  claimedReward: boolean = false,
): Promise<PlayerPlaceRecord> {
  const existing = await pb.collection<PlayerPlaceRecord>('player_places').getFullList({
    filter: `player = "${playerId}" && place_id = "${placeId}"`,
  })

  if (existing.length > 0) {
    return await pb.collection<PlayerPlaceRecord>('player_places').update(existing[0].id, {
      visited: true,
      claimed_reward: claimedReward || existing[0].claimed_reward,
    })
  }

  return await pb.collection<PlayerPlaceRecord>('player_places').create({
    player: playerId,
    place_id: placeId,
    visited: true,
    claimed_reward: claimedReward,
  })
}

// --- ACHIEVEMENTS ---
export async function fetchPlayerAchievements(
  playerId: string,
): Promise<PlayerAchievementRecord[]> {
  try {
    return await pb.collection<PlayerAchievementRecord>('player_achievements').getFullList({
      filter: `player = "${playerId}"`,
    })
  } catch (err) {
    console.error('Error fetching achievements:', err)
    return []
  }
}

export async function claimPlayerAchievement(
  playerId: string,
  achievementId: string,
): Promise<PlayerAchievementRecord> {
  const existing = await pb.collection<PlayerAchievementRecord>('player_achievements').getFullList({
    filter: `player = "${playerId}" && achievement_id = "${achievementId}"`,
  })

  if (existing.length > 0) {
    return await pb
      .collection<PlayerAchievementRecord>('player_achievements')
      .update(existing[0].id, {
        claimed: true,
        unlocked_at: new Date().toISOString(),
      })
  }

  return await pb.collection<PlayerAchievementRecord>('player_achievements').create({
    player: playerId,
    achievement_id: achievementId,
    claimed: true,
    unlocked_at: new Date().toISOString(),
  })
}

// --- CUSTOMER ORDERS (Township Style) ---
export const SAMPLE_CUSTOMERS = [
  { name: 'Dona Clara (Confeiteira)', avatar: '👩‍🍳' },
  { name: 'Sr. Bento (Taverneiro)', avatar: '🧔' },
  { name: 'Padeiro João', avatar: '👨‍🍳' },
  { name: 'Menina Nina', avatar: '👧' },
  { name: 'Capitão Valério', avatar: '👨‍✈️' },
  { name: 'Guarda Geraldo', avatar: '🛡️' },
]

export async function fetchCustomerOrders(playerId: string): Promise<CustomerOrderRecord[]> {
  try {
    const orders = await pb.collection<CustomerOrderRecord>('customer_orders').getFullList({
      filter: `player = "${playerId}" && fulfilled = false`,
      sort: 'created',
    })
    return orders
  } catch (err) {
    console.error('Error fetching customer orders:', err)
    return []
  }
}

export async function seedInitialCustomerOrders(playerId: string): Promise<CustomerOrderRecord[]> {
  const sampleOrders: Array<{
    item_type: 'pao' | CropType
    quantity_required: number
    reward_coins: number
    reward_xp: number
  }> = [
    { item_type: 'pao', quantity_required: 2, reward_coins: 140, reward_xp: 70 },
    { item_type: 'trigo', quantity_required: 4, reward_coins: 120, reward_xp: 60 },
    { item_type: 'pao', quantity_required: 3, reward_coins: 220, reward_xp: 110 },
    { item_type: 'soja', quantity_required: 3, reward_coins: 250, reward_xp: 130 },
  ]

  const created: CustomerOrderRecord[] = []
  for (let i = 0; i < sampleOrders.length; i++) {
    const cust = SAMPLE_CUSTOMERS[i % SAMPLE_CUSTOMERS.length]
    const ord = sampleOrders[i]
    const rec = await pb.collection<CustomerOrderRecord>('customer_orders').create({
      player: playerId,
      customer_name: cust.name,
      customer_avatar: cust.avatar,
      item_type: ord.item_type,
      quantity_required: ord.quantity_required,
      reward_coins: ord.reward_coins,
      reward_xp: ord.reward_xp,
      fulfilled: false,
    })
    created.push(rec)
  }
  return created
}

export async function fulfillCustomerOrder(orderId: string): Promise<void> {
  await pb.collection<CustomerOrderRecord>('customer_orders').update(orderId, {
    fulfilled: true,
  })
}

export async function generateNewCustomerOrder(
  playerId: string,
  bakeryUnlocked: boolean,
): Promise<CustomerOrderRecord> {
  const randomCust = SAMPLE_CUSTOMERS[Math.floor(Math.random() * SAMPLE_CUSTOMERS.length)]
  const possibleItems: Array<'pao' | CropType> = bakeryUnlocked
    ? ['pao', 'pao', 'trigo', 'milho', 'cenoura', 'soja']
    : ['trigo', 'milho', 'cenoura', 'soja']

  const item = possibleItems[Math.floor(Math.random() * possibleItems.length)]
  const qty = item === 'pao' ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 4) + 2

  const baseCoin = item === 'pao' ? 65 : item === 'soja' ? 70 : 35
  const baseRewardCoins = qty * baseCoin + Math.floor(Math.random() * 30)
  const baseRewardXp = Math.round(baseRewardCoins * 0.55)

  return await pb.collection<CustomerOrderRecord>('customer_orders').create({
    player: playerId,
    customer_name: randomCust.name,
    customer_avatar: randomCust.avatar,
    item_type: item,
    quantity_required: qty,
    reward_coins: baseRewardCoins,
    reward_xp: baseRewardXp,
    fulfilled: false,
  })
}

// --- LEADERBOARD (Ranking) ---
export async function fetchLeaderboard(limit: number = 30): Promise<PlayerRecord[]> {
  try {
    const list = await pb.collection<PlayerRecord>('player').getList(1, limit, {
      sort: '-level,-xp,-coins',
      expand: 'user',
    })
    return list.items
  } catch (err) {
    console.error('Error fetching leaderboard:', err)
    return []
  }
}

// --- PLAYER OBJECTIVES (Objetivos Pessoais) ---
export async function fetchPlayerObjectives(playerId: string): Promise<PlayerObjectiveRecord[]> {
  try {
    const records = await pb.collection<PlayerObjectiveRecord>('player_objectives').getFullList({
      filter: `player = "${playerId}"`,
      sort: 'completed,created',
    })
    return records
  } catch (err) {
    console.error('Error fetching player objectives:', err)
    return []
  }
}

export async function createPlayerObjective(data: {
  player: string
  title: string
  metric_type?: string
  target_value?: number
  completed?: boolean
  notes?: string
}): Promise<PlayerObjectiveRecord> {
  return await pb.collection<PlayerObjectiveRecord>('player_objectives').create({
    player: data.player,
    title: data.title,
    metric_type: data.metric_type || 'custom',
    target_value: data.target_value ?? 0,
    completed: data.completed ?? false,
    notes: data.notes || '',
  })
}

export async function updatePlayerObjective(
  objectiveId: string,
  data: Partial<PlayerObjectiveRecord>,
): Promise<PlayerObjectiveRecord> {
  return await pb.collection<PlayerObjectiveRecord>('player_objectives').update(objectiveId, data)
}

export async function deletePlayerObjective(objectiveId: string): Promise<boolean> {
  try {
    await pb.collection('player_objectives').delete(objectiveId)
    return true
  } catch (err) {
    console.error('Error deleting objective:', err)
    return false
  }
}
