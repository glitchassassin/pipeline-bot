import { Roles } from 'roles/_roles';
import { runBuilder, spawnBuilder } from './builder';
import { worklist } from './worklist';

export function spawnConstructionService(room: string) {
  const construction = worklist(room).length > 0;
  const builders = Game.rooms[room].find(FIND_MY_CREEPS).filter(c => c.memory.role === Roles.BUILDER);

  if (builders.length < 1 && construction) {
    spawnBuilder(room);
  }
}

export function runConstructionService(room: string) {
  const builders = Game.rooms[room].find(FIND_MY_CREEPS).filter(c => c.memory.role === Roles.BUILDER);
  builders.forEach(b => runBuilder(b));
}
