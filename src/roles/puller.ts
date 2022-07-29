import { Pipeline } from 'pipeline/Pipeline';
import { recycleCreep } from 'utils/recycleCreep';
import { enterPipeline } from './behaviors/enterPipeline';
import { Roles } from './_roles';

declare global {
  interface CreepMemory {
    pullTarget?: string;
  }
}

export function role(creep: Creep, pipeline: Pipeline) {
  // dump energy, if possible
  const nearbyPipe = pipeline.pipes.find(c => c?.pos.inRangeTo(creep.pos, 1) && c.store.getFreeCapacity());
  if (nearbyPipe && creep.store.getUsedCapacity()) creep.transfer(nearbyPipe, RESOURCE_ENERGY);

  if (!pipeline.needsPuller()) {
    recycleCreep(creep);
    return;
  }
  const target = [...pipeline.pullSpots(), ...pipeline.haulSpots()][0];
  if (!target) return;
  enterPipeline(creep, pipeline.path[target]);
}

export function spawn(pipeline: Pipeline) {
  const name = Roles.PULLER + '-' + Game.time;
  const result = pipeline.spawn.spawnCreep([MOVE, CARRY], name, {
    memory: { role: Roles.PULLER, pipeline: pipeline.id }
  });

  if (result === OK) {
    pipeline._pullers.push(name);
    return true;
  }
  if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
  throw new Error('Bad spawn of PULLER: ' + result);
}
