import { PipelinesByRoom } from 'pipeline/byRoom';
import { Harvester } from 'pipeline/Harvester';
import { Upgrader } from 'pipeline/Upgrader';
import { calculateAdjacentPositions, isPositionWalkable, sortByDistanceTo } from 'selectors';
import { containerSquares } from './anchors';

export function planStructures(room: string) {
  const spawn = Game.rooms[room].find(FIND_MY_SPAWNS)[0];
  const blockedSquares: Record<string, RoomPosition> = {};
  const plannedSquares: Record<string, RoomPosition> = {};

  [spawn.pos, ...calculateAdjacentPositions(spawn.pos)].forEach(p => (blockedSquares[`${p}`] = p));

  for (const pipeline of PipelinesByRoom.get(room) ?? []) {
    for (const pos of pipeline.path) {
      [
        pos,
        new RoomPosition(pos.x - 1, pos.y, pos.roomName),
        new RoomPosition(pos.x, pos.y - 1, pos.roomName),
        new RoomPosition(pos.x, pos.y + 1, pos.roomName),
        new RoomPosition(pos.x + 1, pos.y, pos.roomName)
      ].forEach(p => (blockedSquares[`${p}`] = p));
      if (pipeline.type === 'INPUT') {
        [
          new RoomPosition(pos.x - 1, pos.y - 1, pos.roomName),
          new RoomPosition(pos.x + 1, pos.y + 1, pos.roomName),
          new RoomPosition(pos.x + 1, pos.y - 1, pos.roomName),
          new RoomPosition(pos.x - 1, pos.y + 1, pos.roomName)
        ].forEach(p => (plannedSquares[`${p}`] = p));
      }
    }
    if (pipeline instanceof Harvester) {
      for (const pos of pipeline.harvesterPositions) {
        blockedSquares[`${pos}`] = pos;
      }
    }
    if (pipeline instanceof Upgrader) {
      for (const pos of pipeline.upgraderPositions) {
        blockedSquares[`${pos}`] = pos;
      }
    }
  }
  // blocked squares override planned squares
  for (const key in blockedSquares) {
    delete plannedSquares[key];
  }

  const planned = Object.values(plannedSquares).filter(p => isPositionWalkable(p, true, true));
  if (spawn) planned.sort(sortByDistanceTo(spawn.pos));

  // Place construction sites (as controller allows)
  planned.slice(0, 10).forEach(pos => pos.createConstructionSite(STRUCTURE_EXTENSION));
  planned.slice(10, 16).forEach(pos => pos.createConstructionSite(STRUCTURE_TOWER));

  containerSquares(spawn).forEach(pos => pos.createConstructionSite(STRUCTURE_CONTAINER));
}
