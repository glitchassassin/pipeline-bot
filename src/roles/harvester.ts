import { Harvester } from 'pipeline/Harvester';
import { roomEnergy } from './selectors';
import { Roles } from './_roles';

export function spawn(pipeline: Harvester) {
  const name = Roles.HARVESTER + '-' + Game.time;
  const actualSize = Math.min(5, Math.floor((roomEnergy(pipeline.room) - BODYPART_COST[CARRY]) / BODYPART_COST[WORK]));

  const result = pipeline.spawn.spawnCreep([...Array(actualSize).fill(WORK), CARRY], name, {
    memory: { role: Roles.HARVESTER, pipeline: pipeline.source.id }
  });

  if (result === OK) {
    pipeline._harvesters.push(name);
    return true;
  }
  if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
  throw new Error(`Bad spawn of ${Roles.HARVESTER}: ` + result);
}
