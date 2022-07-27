import { adjacentWalkablePositions } from 'selectors';

export function bestHarvestingSquare(source: Source) {
  let best: RoomPosition | undefined;
  let score = 0;
  for (const candidate of adjacentWalkablePositions(source.pos, true)) {
    const currentScore = adjacentWalkablePositions(candidate, true).filter(p => p.inRangeTo(source.pos, 1)).length;
    if (!best || currentScore > score) {
      best = candidate;
      score = currentScore;
    }
  }
  if (!best) throw new Error(`No harvesting squares found for source ${source.id}`);
  return best;
}
