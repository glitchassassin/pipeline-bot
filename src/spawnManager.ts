import { Pipeline } from "pipeline/pipeline";
import { spawn } from "roles";
import { Roles } from "roles/_roles";
import { adjacentWalkablePositions, byId } from "selectors";

export function spawnManager(room: string, pipelines: Pipeline[]) {
    const roleCount = {
        [Roles.PULLER]: 0,
        [Roles.PIPE]: 0,
        [Roles.HARVESTER]: 0,
    }

    Object.values(Game.creeps).forEach(creep => {
        roleCount[creep.memory.role] += 1;
    })

    let pipelineCount = 0;
    for (const pipeline of pipelines) {
        pipelineCount += 1;

        const maxHarvesters = Math.min(
            // max needed
            Math.ceil(5 / Math.floor((Game.rooms[room].energyCapacityAvailable / BODYPART_COST[WORK]))),
            // max spots available
            adjacentWalkablePositions(pipeline.source.pos, true).length
        );
        // Start with a puller and a harvester
        if (roleCount[Roles.PULLER] === 0) spawn[Roles.PULLER](room, pipeline);
        else if (pipeline.harvesters.length === 0) spawn[Roles.HARVESTER](room, pipeline.source.id);

        // Add another puller to help carry energy and move the pipeline
        else if (pipeline.pullers.length < 2) spawn[Roles.PULLER](room, pipeline);

        // Add pipeline parts
        else if (pipeline.pipes.some(p => p === undefined)) spawn[Roles.PIPE](room, pipeline);

        // Add remaining harvesters
        else if (pipeline.harvesters.length < maxHarvesters) spawn[Roles.HARVESTER](room, pipeline.source.id);
        else continue;
        break;
    }
}
