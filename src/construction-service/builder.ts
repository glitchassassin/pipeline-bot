import { packPos } from 'packrat';
import { PipelinesByRoom } from 'pipeline/byRoom';
import { Roles } from 'roles/_roles';
import { nearbyWalkablePositions } from 'selectors';
import { energyBuffer } from './selectors';
import { worklist } from './worklist';

export function runBuilder(creep: Creep) {
  let buildTarget = creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)[0];
  let pipelineTarget =
    creep.pos
      .findInRange(FIND_STRUCTURES, 1)
      .find(c => c.structureType === STRUCTURE_CONTAINER && c.store.getUsedCapacity(RESOURCE_ENERGY) > 0) ??
    creep.pos
      .findInRange(FIND_MY_CREEPS, 1)
      .find(c => c.memory.role === Roles.PIPE && c.store.getUsedCapacity(RESOURCE_ENERGY) > 0);

  // check for new build target position
  if (!buildTarget) {
    const nextTarget = worklist(creep.room.name)[0];
    if (!nextTarget) return; // TODO - Recycle
    let bestPos: RoomPosition | undefined;
    let bestScore = 0;
    const pipelines = PipelinesByRoom.get(creep.room.name)
      ?.filter(p => p.type === 'INPUT')
      .flatMap(p => p.path);
    for (const pos of nearbyWalkablePositions(nextTarget.pos, 3, false)) {
      if (!pipelines?.some(p => p.inRangeTo(pos, 1))) continue;
      const sites = pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3).length;
      if (sites > bestScore) {
        bestPos = pos;
        bestScore = sites;
      }
    }
    if (bestPos) creep.memory.pullTarget = packPos(bestPos);
    return;
  } else {
    creep.build(buildTarget);
  }

  if (
    creep.store.getFreeCapacity(RESOURCE_ENERGY) > CARRY_CAPACITY / 2 &&
    energyBuffer(creep.room.name) >= creep.room.energyCapacityAvailable
  ) {
    if (pipelineTarget instanceof Creep) {
      pipelineTarget.transfer(creep, RESOURCE_ENERGY);
    } else if (pipelineTarget) {
      creep.withdraw(pipelineTarget, RESOURCE_ENERGY);
    }
  }
}

export function spawnBuilder(room: string) {
  const spawn = Game.rooms[room]?.find(FIND_MY_SPAWNS).find(s => !s.spawning);
  if (!spawn) return;
  const actualSize = Math.floor(
    (Game.rooms[room].energyCapacityAvailable - BODYPART_COST[CARRY]) / BODYPART_COST[WORK]
  );
  const name = `${Roles.BUILDER}-${room}-${Game.time}`;
  const body = [...Array(actualSize).fill(WORK), CARRY];
  console.log(Game.rooms[room].energyCapacityAvailable, body);
  console.log(spawn.spawnCreep(body, name, { memory: { role: Roles.BUILDER } }));
}
