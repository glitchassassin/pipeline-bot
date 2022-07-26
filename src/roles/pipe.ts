import { Pipeline } from "pipeline/pipeline";
import { getPipeline } from "pipelines";
import { Roles } from "./_roles";

declare global {
    interface CreepMemory {
        pipeline?: Id<Source>
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

export function spawn(room: string, pipeline: Pipeline) {
    const spawn = Game.rooms[room]?.find(FIND_MY_SPAWNS).find(s => !s.spawning);
    if (!spawn) return false;

    const result = spawn.spawnCreep(
        [CARRY],
        Roles.PIPE + '-' + Game.time,
        {
            memory: { role: Roles.PIPE, pipeline: pipeline.source.id },
            directions: [spawn.pos.getDirectionTo(pipeline.path[0])] // only spawn on path
        }
    );

    if (result === OK) return true;
    if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
    throw new Error('Bad spawn of PIPE: ' + result);
}
