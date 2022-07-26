import { Pipeline } from "pipeline/pipeline";
import { adjacentWalkablePositions, avoidMostCreepsCostMatrix, byId, calculateAdjacentPositions, isPositionWalkable } from "selectors";
import { enterPipeline } from "./behaviors/enterPipeline";
import { leavePipeline } from "./behaviors/leavePipeline";
import { runStates, States } from "./behaviors/state";
import { Roles } from "./_roles";

declare global {
    interface CreepMemory {
        pullTarget?: string
    }
}

export function role(creep: Creep, pipeline: Pipeline) {
    runStates({
        [States.IDLE]: (creep) => {
            // Once clear of the pipeline, try to MOVE_HARVESTER, then DEFRAG, then MOVE_ENERGY
            const nearbyPipe = pipeline.pipes.find(c => c?.pos.inRangeTo(creep.pos, 1) && c.store.getFreeCapacity());
            if (nearbyPipe && creep.store.getUsedCapacity()) creep.transfer(nearbyPipe, RESOURCE_ENERGY)
            return leavePipeline(creep, pipeline) ? States.MOVE_HARVESTER : States.IDLE;
        },
        [States.RUN_PIPELINE]: (creep) => {
            const target = [...pipeline.pullSpots(), ...pipeline.haulSpots()][0];
            if (target === undefined) return States.IDLE;
            enterPipeline(creep, pipeline.path[target])
            return States.RUN_PIPELINE;
        },
        [States.MOVE_HARVESTER]: (creep) => {
            creep.memory.pullTarget ??= pipeline.harvestersToPull()[0]?.name
            const target = Game.creeps[creep.memory.pullTarget ?? ''];
            if (!target) {
                delete creep.memory.pullTarget;
                return States.RUN_PIPELINE;
            }
            creep.say('MOVE')
            const moveTarget = [
                pipeline.path[pipeline.path.length - 1],
                ...calculateAdjacentPositions(pipeline.source.pos).filter(p => p.inRangeTo(pipeline.path[pipeline.path.length - 1], 1))
            ].find(pos => isPositionWalkable(pos, false, false) || pos.isEqualTo(creep.pos) || pos.isEqualTo(target.pos));

            if (!moveTarget || target.pos.inRangeTo(moveTarget, 0)) {
                delete creep.memory.pullTarget;
                return States.RUN_PIPELINE;
            }

            if (target.pos.inRangeTo(creep, 1)) {
                creep.pull(target);
                target.move(creep);
                if (creep.pos.isEqualTo(moveTarget)) {
                    // Swap places for final positioning
                    creep.move(target);
                } else {
                    // move to target square
                    creep.moveTo(moveTarget);
                }
            } else {
                creep.moveTo(target);
            }
            return States.MOVE_HARVESTER;
        },
    }, creep)
}

export function spawn(pipeline: Pipeline) {
    const name = Roles.PULLER + '-' + Game.time;
    const result = pipeline.spawn.spawnCreep([MOVE, CARRY], name, { memory: { role: Roles.PULLER, pipeline: pipeline.source.id }});

    if (result === OK) {
        pipeline._pullers.push(name);
        return true;
    }
    if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
    throw new Error('Bad spawn of PULLER: ' + result);
}
