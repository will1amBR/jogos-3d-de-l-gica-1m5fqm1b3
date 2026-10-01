migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const playerCol = app.findCollectionByNameOrId('player')
    const dailyQuestsCol = app.findCollectionByNameOrId('daily_quests')
    const farmInventoryCol = app.findCollectionByNameOrId('farm_inventory')

    const seedEmail = 'william@korenambiental.com'
    let userRecord

    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', seedEmail)
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail(seedEmail)
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'William')
      app.save(userRecord)
    }

    // Check if player record already exists for this user
    let playerRecord
    try {
      playerRecord = app.findFirstRecordByData('player', 'user', userRecord.id)
    } catch (_) {
      playerRecord = new Record(playerCol)
      playerRecord.set('user', userRecord.id)
      playerRecord.set('level', 1)
      playerRecord.set('xp', 20)
      playerRecord.set('coins', 150)
      playerRecord.set('total_harvests', 0)
      playerRecord.set('farm_plots_unlocked', 6)
      playerRecord.set('farm_owned_crops', [])
      playerRecord.set('farm_daily_price_multiplier', 1.15)
      app.save(playerRecord)
    }

    // Seed initial daily quest if not present
    try {
      app.findFirstRecordByData('daily_quests', 'player', playerRecord.id)
    } catch (_) {
      const quest = new Record(dailyQuestsCol)
      quest.set('player', playerRecord.id)
      quest.set('quest_type', 'harvest')
      quest.set('target', 8)
      quest.set('progress', 2)
      quest.set('completed', false)
      quest.set('reward_xp', 80)
      quest.set('reward_coins', 100)
      app.save(quest)
    }

    // Seed sample starter inventory
    const crops = [
      { type: 'milho', qty: 4 },
      { type: 'cenoura', qty: 2 },
    ]

    for (let i = 0; i < crops.length; i++) {
      const c = crops[i]
      try {
        const records = app.findRecordsByFilter(
          'farm_inventory',
          `player = "${playerRecord.id}" && crop_type = "${c.type}"`,
          '',
          1,
          0,
        )
        if (records.length === 0) {
          const inv = new Record(farmInventoryCol)
          inv.set('player', playerRecord.id)
          inv.set('crop_type', c.type)
          inv.set('quantity', c.qty)
          app.save(inv)
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'william@korenambiental.com')
      if (userRecord) {
        try {
          const player = app.findFirstRecordByData('player', 'user', userRecord.id)
          if (player) {
            app.delete(player)
          }
        } catch (_) {}
        app.delete(userRecord)
      }
    } catch (_) {}
  },
)
