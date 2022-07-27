import { Harvester } from 'pipeline/Harvester';
import { Pipeline } from 'pipeline/Pipeline';
import { byId } from 'selectors';
import { Roles } from './_roles';

export function spawn(pipeline: Harvester) {
  const name = Roles.HARVESTER + '-' + Game.time;
  const result = pipeline.spawn.spawnCreep([WORK, WORK, CARRY], name, {
    memory: { role: Roles.HARVESTER, pipeline: pipeline.source.id }
  });

  if (result === OK) {
    pipeline._harvesters.push(name);
    return true;
  }
  if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
  throw new Error('Bad spawn of PICKER: ' + result);
}
