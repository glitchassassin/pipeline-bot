import { adjacentWalkablePositions, byId } from "selectors";
import { Roles } from "./_roles";

declare global {
    interface CreepMemory {
        source?: Id<Source>
        pullTarget?: RoomPosition
    }
}

export function role(creep: Creep) {
    const source = byId(creep.memory.source);
    if (source && creep.pos.inRangeTo(source.pos, 1)) creep.harvest(source);
}

export function spawn(room: string, source: Id<Source>) {
    const spawn = Game.rooms[room]?.find(FIND_MY_SPAWNS).find(s => !s.spawning);
    if (!spawn) return false;

    const result = spawn.spawnCreep([WORK, WORK, CARRY], Roles.HARVESTER + '-' + Game.time, { memory: { role: Roles.HARVESTER, source }});

    if (result === OK) return true;
    if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
    throw new Error('Bad spawn of PICKER: ' + result);
}
