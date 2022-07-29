import { Upgrader } from 'pipeline/Upgrader';
import { roomEnergy } from './selectors';
import { Roles } from './_roles';

export function spawn(pipeline: Upgrader) {
  const name = Roles.UPGRADER + '-' + Game.time;
  const actualSize = Math.min(8, Math.floor((roomEnergy(pipeline.room) - BODYPART_COST[CARRY]) / BODYPART_COST[WORK]));
  const result = pipeline.spawn.spawnCreep([...Array(actualSize).fill(WORK), CARRY], name, {
    memory: { role: Roles.UPGRADER, pipeline: pipeline.controller.id }
  });

  if (result === OK) {
    pipeline._upgraders.push(name);
    return true;
  }
  if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
  throw new Error(`Bad spawn of ${Roles.UPGRADER}: ` + result);
}
