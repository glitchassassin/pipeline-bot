import { Pipeline } from "pipeline/pipeline";
import { adjacentWalkablePositions, avoidMostCreepsCostMatrix, byId, calculateAdjacentPositions, isPositionWalkable } from "selectors";
import { Roles } from "./_roles";

interface DefragTask {
    type: 'DEFRAG',
    pos: RoomPosition
    onTrack?: boolean
}
interface ShiftEnergyTask {
    type: 'SHIFT',
    pos: RoomPosition
    onTrack?: boolean
}
interface MoveHarvesterTask {
    type: 'MOVE',
    harvester: string
}
type Task = DefragTask | ShiftEnergyTask | MoveHarvesterTask

declare global {
    interface CreepMemory {
        task?: Task
    }
}

export function role(creep: Creep, pipeline: Pipeline) {
    if (!creep.memory.task) {
        // return to base
        const spawn = Game.rooms[creep.pos.roomName].find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;
        creep.moveTo(spawn, { range: 3 });
        return;
    }
    console.log(creep.name, JSON.stringify(creep.memory.task))

    if (creep.memory.task.type === 'DEFRAG') {
        creep.say('DEFRAG')
        const pullTarget = new RoomPosition(creep.memory.task.pos.x, creep.memory.task.pos.y, creep.memory.task.pos.roomName);
        creep.memory.task.onTrack ||= creep.pos.inRangeTo(pullTarget, 0)
        if (!creep.memory.task.onTrack) {
            creep.moveTo(pullTarget, {
                range: 0,
                ignoreCreeps: true,
                costCallback: (room: string) => avoidMostCreepsCostMatrix(room, [pullTarget])
            });
            return;
        }

        // creep is on track
        const index = pipeline.path.findIndex(p => p.isEqualTo(creep.pos));
        if (index === -1) {
            throw new Error('Creep is supposed to be on track but isn\'t');
        }

        if (index > 0 && pipeline.pipes[index - 1]?.memory.role !== Roles.PIPE) {
            // move backwards along track
            creep.moveByPath(pipeline.path.slice().reverse());
            return;
        }
        console.log(creep.name, 'previous pipe', pipeline.pipes[index - 1]);
        if (index >= pipeline.path.length - 2 || pipeline.pipes[index + 1]) {
            // no room ahead, move off the track
            const moveTarget = [
                new RoomPosition(creep.pos.x - 1, creep.pos.y, creep.pos.roomName),
                new RoomPosition(creep.pos.x, creep.pos.y - 1, creep.pos.roomName),
                new RoomPosition(creep.pos.x - 1, creep.pos.y - 1, creep.pos.roomName),
            ].find(pos => isPositionWalkable(pos, false, false)) ?? pipeline.path[index - 1];

            if (creep.moveTo(moveTarget) === OK) delete creep.memory.task;
        } else if (
            pipeline.pipes.slice(0, index).every(p => p !== undefined)
        ){
            const spawn = Game.rooms[pipeline.room].find(FIND_MY_SPAWNS)[0]
            const pipelineDirection = spawn.pos.getDirectionTo(pipeline.path[0]);
            if (spawn.spawning?.directions.every(d => d === pipelineDirection) && spawn.spawning.remainingTime === 1) {
                // Adjust for emerging pipe
                creep.moveByPath(pipeline.path);
                creep.memory.task.pos = pipeline.path[index + 1];
            } else {
                // Wait for next pipe
                return;
            }
        } else {
            // Follow the path
            creep.moveByPath(pipeline.path);
            creep.memory.task.pos = pipeline.path[index + 1];
        }

        for (let i = index; i > 0; i--) {
            let puller = pipeline.pipes[i];
            let pullee = pipeline.pipes[i - 1];
            console.log('puller', puller, 'pullee', pullee)
            if (puller && pullee) {
                puller.pull(pullee);
                pullee.move(puller);
            } else {
                break;
            }
        }
    }

    if (creep.memory.task?.type === 'SHIFT') {
        creep.say('SHIFT')
        const haulTarget = new RoomPosition(creep.memory.task.pos.x, creep.memory.task.pos.y, creep.memory.task.pos.roomName)
        creep.memory.task.onTrack ||= creep.pos.inRangeTo(haulTarget, 0)
        if (!creep.memory.task.onTrack) {
            creep.moveTo(haulTarget, {
                range: 0,
                ignoreCreeps: true,
                costCallback: (room: string) => avoidMostCreepsCostMatrix(room, [haulTarget])
            });
            return;
        }

        // creep is on track
        const index = pipeline.path.findIndex(p => p.isEqualTo(creep.pos));
        if (index === -1) {
            throw new Error('Creep is supposed to be on track but isn\'t');
        }

        if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            if (pipeline.pipes[index - 1]) {
                if (creep.transfer(pipeline.pipes[index - 1]!, RESOURCE_ENERGY) === OK) delete creep.memory.task;
            } else {
                creep.moveByPath(pipeline.path.slice().reverse());
            }
        } else {
            if (pipeline.pipes[index + 1]) {
                pipeline.pipes[index + 1]?.transfer(creep, RESOURCE_ENERGY);
            } else {
                creep.moveByPath(pipeline.path);
            }
        }
    }

    if (creep.memory.task?.type === 'MOVE') {
        creep.say('MOVE')
        const target = Game.creeps[creep.memory.task.harvester];
        if (!target) {
            delete creep.memory.task;
            return;
        }
        const moveTarget = [
            pipeline.path[pipeline.path.length - 1],
            ...calculateAdjacentPositions(pipeline.source.pos)
        ].find(pos => isPositionWalkable(pos, false, false) || pos.isEqualTo(creep.pos) || pos.isEqualTo(target.pos));

        if (!moveTarget) {
            delete creep.memory.task;
            return;
        }

        if (target.pos.inRangeTo(creep, 1)) {
            creep.pull(target);
            target.move(creep);
            if (creep.pos.isEqualTo(moveTarget)) {
                // Swap places for final positioning
                if (creep.move(target) === OK) delete creep.memory.task;
            } else {
                // move to target square
                creep.moveTo(moveTarget);
            }
        } else {
            creep.moveTo(target);
        }
    }
}

export function spawn(room: string, pipeline: Pipeline) {
    const spawn = Game.rooms[room]?.find(FIND_MY_SPAWNS).find(s => !s.spawning);
    if (!spawn) return false;

    const result = spawn.spawnCreep([MOVE, CARRY], Roles.PULLER + '-' + Game.time, { memory: { role: Roles.PULLER, pipeline: pipeline.source.id }});

    if (result === OK) return true;
    if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
    throw new Error('Bad spawn of PULLER: ' + result);
}
