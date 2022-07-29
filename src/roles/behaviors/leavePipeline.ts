import { Pipeline } from 'pipeline/Pipeline';
import { avoidMostCreepsCostMatrix, nearbyWalkablePositions } from 'selectors';

export function leavePipeline(creep: Creep, pipeline: Pipeline) {
  if (pipeline.path.some(p => p.isEqualTo(creep.pos))) {
    const moveTarget = nearbyWalkablePositions(creep.pos).find(pos => !pipeline.path.some(p => p.isEqualTo(pos)));
    if (moveTarget) {
      creep.moveTo(moveTarget, { range: 0, costCallback: room => avoidMostCreepsCostMatrix(room, [creep.pos]) });
    }
    return false;
  }
  return true;
}
