import { Pipeline } from "pipeline/pipeline";
import { isPositionWalkable, avoidMostCreepsCostMatrix } from "selectors";

export function leavePipeline(creep: Creep, pipeline: Pipeline) {
    if (pipeline.path.some(p => p.isEqualTo(creep.pos))) {
        const moveTarget = [
            new RoomPosition(creep.pos.x - 1, creep.pos.y, creep.pos.roomName),
            new RoomPosition(creep.pos.x, creep.pos.y - 1, creep.pos.roomName),
            new RoomPosition(creep.pos.x - 1, creep.pos.y - 1, creep.pos.roomName),
        ].find(pos => isPositionWalkable(pos, false, false))
        if (moveTarget) {
            creep.moveTo(moveTarget, { range: 0, costCallback: room => avoidMostCreepsCostMatrix(room, [creep.pos]) });
        }
        return false;
    }
    return true;
}
