import { Pipeline } from "pipeline/pipeline";
import { byId } from "selectors";
import { Roles } from "./_roles";

declare global {
    interface CreepMemory {
        pipeline?: Id<Source>
    }
}

export function role(creep: Creep) {
    const source = byId(creep.memory.pipeline);
    if (source && creep.pos.inRangeTo(source.pos, 1)) creep.harvest(source);
}

export function spawn(pipeline: Pipeline) {
    const name = Roles.HARVESTER + '-' + Game.time;
    const result = pipeline.spawn.spawnCreep([WORK, WORK, CARRY], name, { memory: { role: Roles.HARVESTER, pipeline: pipeline.source.id }});

    if (result === OK) {
        pipeline._harvesters.push(name);
        return true;
    }
    if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
    throw new Error('Bad spawn of PICKER: ' + result);
}
