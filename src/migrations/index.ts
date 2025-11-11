import * as migration_20251111_212742_add_excerpt_to_updates from './20251111_212742_add_excerpt_to_updates';

export const migrations = [
  {
    up: migration_20251111_212742_add_excerpt_to_updates.up,
    down: migration_20251111_212742_add_excerpt_to_updates.down,
    name: '20251111_212742_add_excerpt_to_updates'
  },
];
