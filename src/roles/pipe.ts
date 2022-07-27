import { Pipeline } from 'pipeline/Pipeline';
import { Roles } from './_roles';

declare global {
  interface CreepMemory {
    pipeline?: string;
  }
}

export function role(creep: Creep) {
  // if (!creep.memory.pipeline || creep.memory.index === undefined) {
  //     throw new Error('PIPE should have pipeline and index');
  // }
  // const route = getPipeline(creep.pos.roomName, creep.memory.pipeline);
  // if (!route) return;
  // const nextCreepPos = route[creep.memory.index + 1];
  // if (creep.pos.inRangeTo(nextCreepPos, 1)) {
  //     const nextCreep = nextCreepPos.lookFor(LOOK_CREEPS)[0];
  //     if (nextCreep && nextCreep.store.getUsedCapacity(RESOURCE_ENERGY)) {
  //         nextCreep.transfer(creep, RESOURCE_ENERGY);
  //     }
  // }
}

export function spawn(pipeline: Pipeline) {
  const name = Roles.PIPE + '-' + pipeline.id + '-' + Game.time;
  const outputSquare = pipeline.type === 'INPUT' ? pipeline.path[0] : pipeline.path[pipeline.path.length - 1];
  const result = pipeline.spawn.spawnCreep([CARRY], name, {
    memory: { role: Roles.PIPE, pipeline: pipeline.id },
    directions: [pipeline.spawn.pos.getDirectionTo(outputSquare)] // only spawn on path
  });

  if (result === OK) {
    pipeline._pipes.push(name);
    return true;
  }
  if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
  throw new Error('Bad spawn of PIPE: ' + result);
}
