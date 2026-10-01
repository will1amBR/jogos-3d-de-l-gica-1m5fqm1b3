migrate(
  (app) => {
    const playerCollection = app.findCollectionByNameOrId('player')
    const playerId = playerCollection.id

    // 1. Create player_upgrades collection
    // Tracks purchased upgrades per player: faster_tools, fertilizers, sell_bonus, bakery
    const upgradesCollection = new Collection({
      name: 'player_upgrades',
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
          name: 'upgrade_id',
          type: 'text',
          required: true,
        },
        {
          name: 'level',
          type: 'number',
          required: true,
          min: 0,
          max: 10,
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
        'CREATE UNIQUE INDEX idx_player_upgrades_player_uid ON player_upgrades (player, upgrade_id)',
      ],
    })
    app.save(upgradesCollection)

    // 2. Create player_places collection
    // Tracks story places unlocked/visited/completed by player
    const placesCollection = new Collection({
      name: 'player_places',
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
          name: 'place_id',
          type: 'text',
          required: true,
        },
        {
          name: 'visited',
          type: 'bool',
          required: false,
        },
        {
          name: 'claimed_reward',
          type: 'bool',
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
      indexes: [
        'CREATE UNIQUE INDEX idx_player_places_player_pid ON player_places (player, place_id)',
      ],
    })
    app.save(placesCollection)

    // 3. Create player_achievements collection
    const achievementsCollection = new Collection({
      name: 'player_achievements',
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
          name: 'achievement_id',
          type: 'text',
          required: true,
        },
        {
          name: 'claimed',
          type: 'bool',
          required: false,
        },
        {
          name: 'unlocked_at',
          type: 'date',
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
      indexes: [
        'CREATE UNIQUE INDEX idx_player_achievements_player_aid ON player_achievements (player, achievement_id)',
      ],
    })
    app.save(achievementsCollection)

    // 4. Create customer_orders collection (Township style orders requesting bread/crops)
    const customerOrdersCollection = new Collection({
      name: 'customer_orders',
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
          name: 'customer_name',
          type: 'text',
          required: true,
        },
        {
          name: 'customer_avatar',
          type: 'text',
          required: false,
        },
        {
          name: 'item_type',
          type: 'text',
          required: true,
        },
        {
          name: 'quantity_required',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'reward_coins',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'reward_xp',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'fulfilled',
          type: 'bool',
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
      indexes: [
        'CREATE INDEX idx_customer_orders_player_fulfilled ON customer_orders (player, fulfilled)',
      ],
    })
    app.save(customerOrdersCollection)

    // 5. Add new fields to player collection:
    // hired_workers, bread_count, total_bread_delivered, total_soja_harvested
    if (!playerCollection.fields.getByName('hired_workers')) {
      playerCollection.fields.add(
        new NumberField({
          name: 'hired_workers',
          required: false,
          min: 0,
        }),
      )
    }
    if (!playerCollection.fields.getByName('bread_count')) {
      playerCollection.fields.add(
        new NumberField({
          name: 'bread_count',
          required: false,
          min: 0,
        }),
      )
    }
    if (!playerCollection.fields.getByName('total_bread_delivered')) {
      playerCollection.fields.add(
        new NumberField({
          name: 'total_bread_delivered',
          required: false,
          min: 0,
        }),
      )
    }
    if (!playerCollection.fields.getByName('total_soja_harvested')) {
      playerCollection.fields.add(
        new NumberField({
          name: 'total_soja_harvested',
          required: false,
          min: 0,
        }),
      )
    }
    app.save(playerCollection)
  },
  (app) => {
    try {
      const orders = app.findCollectionByNameOrId('customer_orders')
      app.delete(orders)
    } catch (_) {}

    try {
      const ach = app.findCollectionByNameOrId('player_achievements')
      app.delete(ach)
    } catch (_) {}

    try {
      const places = app.findCollectionByNameOrId('player_places')
      app.delete(places)
    } catch (_) {}

    try {
      const upgrades = app.findCollectionByNameOrId('player_upgrades')
      app.delete(upgrades)
    } catch (_) {}
  },
)
