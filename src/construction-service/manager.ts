import { Roles } from 'roles/_roles';
import { runBuilder, spawnBuilder } from './builder';
import { worklist } from './worklist';

export function runConstructionService() {
  for (const room in Game.rooms) {
    const construction = worklist(room).length > 0;
    const builders = Game.rooms[room].find(FIND_MY_CREEPS).filter(c => c.memory.role === Roles.BUILDER);
    console.log(builders.length, construction);
    if (builders.length < 1 && construction) {
      spawnBuilder(room);
    }
    builders.forEach(b => runBuilder(b));
  }
}
