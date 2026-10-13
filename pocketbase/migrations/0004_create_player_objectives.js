migrate(
  (app) => {
    const playerCol = app.findCollectionByNameOrId('player')
    const playerId = playerCol.id

    // Create player_objectives collection
    const playerObjectives = new Collection({
      name: 'player_objectives',
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
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'metric_type',
          type: 'text', // 'custom' | 'level' | 'coins' | 'harvests' | 'bread' | 'workers'
          required: false,
        },
        {
          name: 'target_value',
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
          name: 'notes',
          type: 'text',
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
        'CREATE INDEX idx_player_objectives_player ON player_objectives (player, created DESC)',
      ],
    })
    app.save(playerObjectives)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('player_objectives')
      app.delete(col)
    } catch (_) {}
  },
)
