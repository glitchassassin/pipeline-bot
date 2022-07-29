import { Roles } from 'roles/_roles';
import { assignPuller, cleanUpAssignments, getAssignment, pullerAssigned } from './assignments';
import { runTaxi, spawnTaxi } from './taxi';

declare global {
  interface CreepMemory {
    towTarget?: string;
  }
}

export function runTaxiService() {
  // Clean up assignments
  cleanUpAssignments();

  for (const room in Game.rooms) {
    // Register new assignments
    const pullers: Creep[] = [];
    const unassignedPullers: Creep[] = [];
    const creepsNeedTowed: Creep[] = [];
    for (const creep of Game.rooms[room].find(FIND_MY_CREEPS)) {
      if (creep.memory.role === Roles.TAXI) {
        pullers.push(creep);
        if (!getAssignment(creep)) {
          unassignedPullers.push(creep);
        }
      }
      if (creep.memory.pullTarget && !pullerAssigned(creep)) {
        creepsNeedTowed.push(creep);
      }
    }
    while (creepsNeedTowed.length) {
      const creep = creepsNeedTowed.shift();
      if (!unassignedPullers.length || !creep) {
        creep && creepsNeedTowed.unshift(creep);
        break;
      }
      if (unassignedPullers.length === 1) {
        assignPuller(creep, unassignedPullers[0]);
        break;
      }
      // Pick the closest puller
      const puller = creep.pos.findClosestByRange(unassignedPullers);
      if (!puller) {
        creepsNeedTowed.unshift(creep);
        break;
      }
      assignPuller(creep, puller);
      unassignedPullers.splice(unassignedPullers.indexOf(puller));
    }

    // spawn creeps as needed
    if (creepsNeedTowed.length) {
      const size = Math.max(1, creepsNeedTowed[0].body.filter(p => p.type !== CARRY && p.type !== MOVE).length);
      spawnTaxi(room, size);
    }

    // Run assigned creeps
    pullers.forEach(p => runTaxi(p));
  }
}
