import type { RecordModel } from 'pocketbase'

export interface UserRecord extends RecordModel {
  email: string
  name?: string
  avatar?: string
}

export interface PlayerRecord extends RecordModel {
  user: string
  level: number
  xp: number
  coins: number
  total_harvests: number
  farm_plots_unlocked: number
  farm_owned_crops?: string[]
  farm_daily_price_multiplier?: number
}

export type CropType = 'milho' | 'cenoura' | 'abobora' | 'trigo'

export interface FarmInventoryRecord extends RecordModel {
  player: string
  crop_type: CropType
  quantity: number
}

export type QuestType = 'harvest' | 'fill_bottles' | 'tetris_layers'

export interface DailyQuestRecord extends RecordModel {
  player: string
  quest_type: QuestType
  target: number
  progress: number
  completed: boolean
  reward_xp: number
  reward_coins: number
}

export interface CropConfig {
  type: CropType
  name: string
  seedPrice: number
  baseSellPrice: number
  growTimeSeconds: number
  color: string
  icon: string
  xpReward: number
}

export const CROPS: Record<CropType, CropConfig> = {
  milho: {
    type: 'milho',
    name: 'Milho Dourado',
    seedPrice: 15,
    baseSellPrice: 35,
    growTimeSeconds: 8,
    color: '#FBC02D',
    icon: '🌽',
    xpReward: 25,
  },
  cenoura: {
    type: 'cenoura',
    name: 'Cenoura Doce',
    seedPrice: 20,
    baseSellPrice: 50,
    growTimeSeconds: 12,
    color: '#FB8C00',
    icon: '🥕',
    xpReward: 35,
  },
  abobora: {
    type: 'abobora',
    name: 'Abóbora Mágica',
    seedPrice: 35,
    baseSellPrice: 90,
    growTimeSeconds: 18,
    color: '#F4511E',
    icon: '🎃',
    xpReward: 60,
  },
  trigo: {
    type: 'trigo',
    name: 'Trigo Encantado',
    seedPrice: 10,
    baseSellPrice: 24,
    growTimeSeconds: 6,
    color: '#E0A96D',
    icon: '🌾',
    xpReward: 18,
  },
}

// RPG Leveling formula: threshold = 100 * (level ^ 1.5)
export function getXpForLevel(level: number): number {
  return Math.round(100 * Math.pow(Math.max(1, level), 1.5))
}
