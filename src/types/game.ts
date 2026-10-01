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
  hired_workers?: number
  bread_count?: number
  total_bread_delivered?: number
  total_soja_harvested?: number
  expand?: {
    user?: UserRecord
  }
}

export type CropType = 'milho' | 'cenoura' | 'abobora' | 'trigo' | 'soja'

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
  soja: {
    type: 'soja',
    name: 'Soja Fértil',
    seedPrice: 25,
    baseSellPrice: 65,
    growTimeSeconds: 10,
    color: '#7CB342',
    icon: '🫘',
    xpReward: 42,
  },
}

// RPG Leveling formula: threshold = 100 * (level ^ 1.5)
export function getXpForLevel(level: number): number {
  return Math.round(100 * Math.pow(Math.max(1, level), 1.5))
}

// --- UPGRADES ---
export type UpgradeId = 'faster_tools' | 'fertilizers' | 'sell_bonus' | 'bakery'

export interface UpgradeConfig {
  id: UpgradeId
  name: string
  description: string
  maxLevel: number
  baseCost: number
  costMultiplier: number
  icon: string
  effectUnit: string
  effectValuePerLevel: number
}

export const UPGRADES: Record<UpgradeId, UpgradeConfig> = {
  faster_tools: {
    id: 'faster_tools',
    name: 'Ferramentas Ágeis',
    description: 'Reduz o tempo de crescimento das colheitas na fazenda.',
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.8,
    icon: '⚡',
    effectUnit: '% mais rápido',
    effectValuePerLevel: 10,
  },
  fertilizers: {
    id: 'fertilizers',
    name: 'Fertilizantes Naturais',
    description: 'Chance de colheita farta dando vegetais extras por lote colhido.',
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 2.0,
    icon: '🧪',
    effectUnit: '% chance colheita dupla',
    effectValuePerLevel: 15,
  },
  sell_bonus: {
    id: 'sell_bonus',
    name: 'Bônus de Mercado',
    description: 'Aumenta permanentemente o valor de venda de todos os vegetais.',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 2.2,
    icon: '💰',
    effectUnit: '% preço adicional',
    effectValuePerLevel: 8,
  },
  bakery: {
    id: 'bakery',
    name: 'Forno do Padeiro',
    description: 'Permite transformar Trigo em Pão quentinho e agiliza o tempo de fornada.',
    maxLevel: 5,
    baseCost: 180,
    costMultiplier: 1.9,
    icon: '🍞',
    effectUnit: 'Nível de Eficiência',
    effectValuePerLevel: 1,
  },
}

export function getUpgradeCost(id: UpgradeId, currentLevel: number): number {
  const cfg = UPGRADES[id]
  return Math.round(cfg.baseCost * Math.pow(cfg.costMultiplier, currentLevel))
}

export interface PlayerUpgradeRecord extends RecordModel {
  player: string
  upgrade_id: UpgradeId
  level: number
}

// --- PLACES / MAPA RPG ---
export interface StoryPlace {
  id: string
  name: string
  requiredLevel: number
  icon: string
  tag: string
  shortDescription: string
  storyText: string
  rewardCoins: number
  rewardXp: number
  position: { x: number; y: number } // Percentage 0..100 for map rendering
}

export const STORY_PLACES: StoryPlace[] = [
  {
    id: 'fazenda_origens',
    name: 'Fazenda das Origens',
    requiredLevel: 1,
    icon: '🏡',
    tag: 'Seu Lar',
    shortDescription: 'O ponto de partida da sua jornada como agricultor lendário.',
    storyText:
      'Você herdou terras férteis e ensolaradas cercadas por colinas. Com um punhado de sementes e ferramentas rústicas, seu destino de construir o maior entreposto do reino acaba de começar.',
    rewardCoins: 50,
    rewardXp: 50,
    position: { x: 12, y: 78 },
  },
  {
    id: 'vila_mercado',
    name: 'Vila do Mercado',
    requiredLevel: 3,
    icon: '🏪',
    tag: 'Comércio',
    shortDescription: 'Mercadores de várias vilas negociam grãos frescos e novidades.',
    storyText:
      'As ruas de pedra da Vila do Mercado ecoam com o clamor dos feirantes. Eles ficam maravilhados com a pureza do seu trigo e da sua soja, abrindo rotas de comércio antes inacessíveis.',
    rewardCoins: 120,
    rewardXp: 90,
    position: { x: 28, y: 62 },
  },
  {
    id: 'floresta_ancestral',
    name: 'Floresta Ancestral',
    requiredLevel: 5,
    icon: '🌲',
    tag: 'Mistério',
    shortDescription: 'Árvores milenares e solo enriquecido por orvalho mágico.',
    storyText:
      'Ao explorar as clareiras da floresta, você encontra espíritos da natureza que abençoam suas sementes com vitalidade sobrenatural. As colheitas respondem ao cuidado e carinho com que você trabalha.',
    rewardCoins: 200,
    rewardXp: 140,
    position: { x: 42, y: 75 },
  },
  {
    id: 'moinho_vento',
    name: 'Moinho de Vento Celestial',
    requiredLevel: 8,
    icon: '💨',
    tag: 'Indústria',
    shortDescription: 'Pás gigantes que moem os melhores grãos em farinha finíssima.',
    storyText:
      'O velho mestre moleiro ensina segredos para transformar o trigo colhido nos mais aromáticos e macios pães da região. Seus clientes da cidade fazem filas quilométricas pelas suas fornadas!',
    rewardCoins: 350,
    rewardXp: 220,
    position: { x: 38, y: 38 },
  },
  {
    id: 'cidade_alta',
    name: 'Cidade Alta de Pedra',
    requiredLevel: 12,
    icon: '🏰',
    tag: 'Civilização',
    shortDescription: 'Coração político e cultural com estalagens movimentadas.',
    storyText:
      'A nobreza da capital reconhece a qualidade superior da sua produção rural. A partir de agora, banquetes reais e grandes festivais exigem os produtos da sua Fazenda como fornecedora oficial.',
    rewardCoins: 500,
    rewardXp: 350,
    position: { x: 58, y: 48 },
  },
  {
    id: 'porto_real',
    name: 'Porto Real das Caravelas',
    requiredLevel: 16,
    icon: '⛵',
    tag: 'Exportação',
    shortDescription: 'Navios partem para além-mar levando caixas com a sua marca.',
    storyText:
      'Caravelas ancoradas carregam sacas de grãos, fardos de soja e cestas de pães com destino a terras longínquas. O seu império agrícola agora alimenta nações inteiras!',
    rewardCoins: 750,
    rewardXp: 500,
    position: { x: 74, y: 32 },
  },
  {
    id: 'montanha_cristal',
    name: 'Pico do Cristal Nevado',
    requiredLevel: 20,
    icon: '🏔️',
    tag: 'Desafio',
    shortDescription: 'Altitudes gélidas guardam minérios raros e águas puras.',
    storyText:
      'Subindo as encostas geladas da cordilheira, você descobre nascentes de água cristalina que irrigam os vales mais férteis do continente. Nenhuma praga atinge as terras alimentadas por essa água pura.',
    rewardCoins: 1100,
    rewardXp: 750,
    position: { x: 72, y: 70 },
  },
  {
    id: 'vale_dourado',
    name: 'Santuário do Vale Dourado',
    requiredLevel: 25,
    icon: '✨',
    tag: 'Lenda',
    shortDescription: 'O solo sagrado onde toda semente plantada se torna tesouro.',
    storyText:
      'Você atingiu a maestria suprema da agricultura e da estratégia de vida! O Vale Dourado coroa você como o Grão-Mestre da Fazenda Encantada, com respeito eterno de todos os reinos.',
    rewardCoins: 2000,
    rewardXp: 1500,
    position: { x: 88, y: 52 },
  },
]

export interface PlayerPlaceRecord extends RecordModel {
  player: string
  place_id: string
  visited: boolean
  claimed_reward: boolean
}

// --- CONQUISTAS (ACHIEVEMENTS) ---
export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  category: 'harvest' | 'coins' | 'level' | 'bread' | 'soja' | 'workers'
  target: number
  rewardCoins: number
  rewardXp: number
  getProgress: (player: PlayerRecord) => number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_harvest',
    title: 'Primeiro Broto',
    description: 'Colha 5 vegetais mágicos na fazenda.',
    icon: '🌱',
    category: 'harvest',
    target: 5,
    rewardCoins: 50,
    rewardXp: 40,
    getProgress: (p) => p.total_harvests || 0,
  },
  {
    id: 'harvester_50',
    title: 'Mãos Calejadas',
    description: 'Colha um total de 50 vegetais em sua propriedade.',
    icon: '🚜',
    category: 'harvest',
    target: 50,
    rewardCoins: 250,
    rewardXp: 180,
    getProgress: (p) => p.total_harvests || 0,
  },
  {
    id: 'harvester_200',
    title: 'Ceifador Lendário',
    description: 'Alcance a marca épica de 200 colheitas realizadas.',
    icon: '🌾',
    category: 'harvest',
    target: 200,
    rewardCoins: 800,
    rewardXp: 600,
    getProgress: (p) => p.total_harvests || 0,
  },
  {
    id: 'rich_1000',
    title: 'Bolsa Tilintante',
    description: 'Acumule 1.000 moedas de ouro.',
    icon: '🪙',
    category: 'coins',
    target: 1000,
    rewardCoins: 200,
    rewardXp: 150,
    getProgress: (p) => p.coins || 0,
  },
  {
    id: 'rich_5000',
    title: 'Cofre do Barão',
    description: 'Acumule 5.000 moedas de ouro.',
    icon: '💎',
    category: 'coins',
    target: 5000,
    rewardCoins: 1000,
    rewardXp: 800,
    getProgress: (p) => p.coins || 0,
  },
  {
    id: 'level_5',
    title: 'Agricultor Dedicado',
    description: 'Alcance o nível 5 de jogador.',
    icon: '⭐',
    category: 'level',
    target: 5,
    rewardCoins: 300,
    rewardXp: 200,
    getProgress: (p) => p.level || 1,
  },
  {
    id: 'level_10',
    title: 'Pilar da Comunidade',
    description: 'Alcance o nível 10 de jogador.',
    icon: '👑',
    category: 'level',
    target: 10,
    rewardCoins: 800,
    rewardXp: 600,
    getProgress: (p) => p.level || 1,
  },
  {
    id: 'bread_10',
    title: 'Cheiro de Fornada',
    description: 'Entregue 10 pedidos de pães para clientes da vila.',
    icon: '🍞',
    category: 'bread',
    target: 10,
    rewardCoins: 400,
    rewardXp: 300,
    getProgress: (p) => p.total_bread_delivered || 0,
  },
  {
    id: 'bread_30',
    title: 'Padeiro do Reino',
    description: 'Entregue 30 pedidos com pães quentinhos.',
    icon: '🥐',
    category: 'bread',
    target: 30,
    rewardCoins: 1200,
    rewardXp: 900,
    getProgress: (p) => p.total_bread_delivered || 0,
  },
  {
    id: 'soja_20',
    title: 'Especialista em Soja',
    description: 'Colha 20 porções de soja fértil.',
    icon: '🫘',
    category: 'soja',
    target: 20,
    rewardCoins: 350,
    rewardXp: 250,
    getProgress: (p) => p.total_soja_harvested || 0,
  },
  {
    id: 'hire_first_worker',
    title: 'Primeiro Ajudante',
    description: 'Contrate seu 1º trabalhador para cuidar dos lotes.',
    icon: '🧑‍🌾',
    category: 'workers',
    target: 1,
    rewardCoins: 200,
    rewardXp: 150,
    getProgress: (p) => p.hired_workers || 0,
  },
  {
    id: 'hire_team_workers',
    title: 'Equipe Eficiente',
    description: 'Contrate 3 trabalhadores para a fazenda.',
    icon: '👥',
    category: 'workers',
    target: 3,
    rewardCoins: 600,
    rewardXp: 500,
    getProgress: (p) => p.hired_workers || 0,
  },
]

export interface PlayerAchievementRecord extends RecordModel {
  player: string
  achievement_id: string
  claimed: boolean
  unlocked_at?: string
}

// --- CUSTOMER ORDERS (Township Style) ---
export interface CustomerOrderRecord extends RecordModel {
  player: string
  customer_name: string
  customer_avatar?: string
  item_type: 'pao' | CropType
  quantity_required: number
  reward_coins: number
  reward_xp: number
  fulfilled: boolean
}

// Worker hire cost formula: 150 * (workers + 1)^1.4
export function getWorkerHireCost(currentWorkers: number): number {
  return Math.round(150 * Math.pow(currentWorkers + 1, 1.35))
}
