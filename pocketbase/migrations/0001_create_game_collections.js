migrate(
  (app) => {
    // 1. Create player collection
    const playerCollection = new Collection({
      name: 'player',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'level',
          type: 'number',
          required: false,
          min: 1,
        },
        {
          name: 'xp',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'coins',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'total_harvests',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'farm_plots_unlocked',
          type: 'number',
          required: false,
          min: 6,
          max: 24,
        },
        {
          name: 'farm_owned_crops',
          type: 'json',
          required: false,
        },
        {
          name: 'farm_daily_price_multiplier',
          type: 'number',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: ['CREATE INDEX idx_player_user ON player (user)'],
    })
    app.save(playerCollection)

    const playerId = playerCollection.id

    // 2. Create farm_inventory collection
    const farmInventoryCollection = new Collection({
      name: 'farm_inventory',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'player',
          type: 'relation',
          required: true,
          collectionId: playerId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'crop_type',
          type: 'text',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_farm_inventory_player_crop ON farm_inventory (player, crop_type)',
      ],
    })
    app.save(farmInventoryCollection)

    // 3. Create daily_quests collection
    const dailyQuestsCollection = new Collection({
      name: 'daily_quests',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'player',
          type: 'relation',
          required: true,
          collectionId: playerId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'quest_type',
          type: 'text',
          required: true,
        },
        {
          name: 'target',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'progress',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'completed',
          type: 'bool',
          required: false,
        },
        {
          name: 'reward_xp',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'reward_coins',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_daily_quests_player_created ON daily_quests (player, created DESC)',
      ],
    })
    app.save(dailyQuestsCollection)
  },
  (app) => {
    try {
      const dailyQuests = app.findCollectionByNameOrId('daily_quests')
      app.delete(dailyQuests)
    } catch (_) {}

    try {
      const farmInventory = app.findCollectionByNameOrId('farm_inventory')
      app.delete(farmInventory)
    } catch (_) {}

    try {
      const player = app.findCollectionByNameOrId('player')
      app.delete(player)
    } catch (_) {}
  },
)
