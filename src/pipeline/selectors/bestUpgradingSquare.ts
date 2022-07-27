import { nearbyWalkablePositions } from 'selectors';

export function bestUpgradingSquare(controller: StructureController) {
  let best: RoomPosition | undefined;
  let score = 0;
  for (const candidate of nearbyWalkablePositions(controller.pos, 3, true)) {
    const currentScore = nearbyWalkablePositions(candidate, 1, true).filter(p => p.inRangeTo(controller.pos, 3)).length;
    if (!best || currentScore > score) {
      best = candidate;
      score = currentScore;
    }
  }
  if (!best) throw new Error(`No upgrading squares found for controller ${controller.id}`);
  return best;
}
