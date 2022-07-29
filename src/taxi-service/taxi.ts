import { unpackPos } from 'packrat';
import { Roles } from 'roles/_roles';
import { recycleCreep } from 'utils/recycleCreep';
import { getAssignment, pullDone } from './assignments';

export function runTaxi(creep: Creep) {
  // try to get assignment
  if (!creep.memory.towTarget || !Game.creeps[creep.memory.towTarget]) {
    creep.memory.towTarget = getAssignment(creep);
  }
  // otherwise, return to spawn
  if (!creep.memory.towTarget || !Game.creeps[creep.memory.towTarget]) {
    // TODO: Move to container square instead of spawn
    recycleCreep(creep);
    return;
  }

  // we have an assignment!
  const target = Game.creeps[creep.memory.towTarget];
  const moveTarget = target.memory.pullTarget && unpackPos(target.memory.pullTarget);
  if (!moveTarget || target.pos.isEqualTo(moveTarget)) {
    delete creep.memory.towTarget;
    delete target.memory.pullTarget;
    pullDone(target);
    return;
  }

  if (!creep.pos.inRangeTo(target, 1)) {
    creep.moveTo(target, { reusePath: 20, visualizePathStyle: { stroke: 'blue' } });
  } else {
    if (creep.pos.isEqualTo(moveTarget)) {
      // we have arrived
      creep.move(target);
      creep.pull(target);
      target.move(creep);
    } else {
      creep.moveTo(moveTarget, { range: 0, reusePath: 20 });
      creep.pull(target);
      target.move(creep);
    }
  }
}

export function spawnTaxi(room: string, size: number) {
  const spawn = Game.rooms[room]?.find(FIND_MY_SPAWNS).find(s => !s.spawning);
  if (!spawn) return;
  const actualSize = Math.min(size, Math.floor(Game.rooms[room].energyCapacityAvailable / BODYPART_COST[MOVE]));
  const name = `${Roles.TAXI}-${room}-${Game.time}`;
  spawn.spawnCreep(Array(actualSize).fill(MOVE), name, { memory: { role: Roles.TAXI } });
}
