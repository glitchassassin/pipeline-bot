import { packPos, packPosList, unpackPosList } from 'packrat';
import { PipelinesByRoom } from 'pipeline/byRoom';

declare global {
  interface Memory {
    paths: Record<string, string>;
  }
}

function pipelineCostMatrix(room: string, type: 'INPUT' | 'OUTPUT') {
  if (!Game.rooms[room]) return false;

  const cm = new PathFinder.CostMatrix();
  const terrain = Game.map.getRoomTerrain(room);
  const sources = Game.rooms[room].find(FIND_SOURCES);
  const isWall = (x: number, y: number) =>
    terrain.get(x, y) === TERRAIN_MASK_WALL && !sources.some(s => s.pos.x === x && s.pos.y === y);
  for (let x = 0; x < 50; x++) {
    for (let y = 0; y < 50; y++) {
      if (isWall(x, y) || isWall(x - 1, y) || isWall(x, y - 1) || isWall(x - 1, y - 1)) {
        cm.set(x, y, 255);
        // new RoomVisual(room).text('255', x, y, { font: '0.5' });
      } else if (x % 2 === y % 2) {
        // Encourage diagonal pathing
        cm.set(x, y, 3);
        new RoomVisual(room).text('2', x, y, { font: '0.5' });
      }
    }
  }

  const pipelines = PipelinesByRoom.get(room) ?? [];
  for (const pipeline of pipelines) {
    if (pipeline.type === 'INPUT' && type === 'INPUT') {
      console.log('reusing existing path from pipeline', pipeline.id);
      pipeline.path.forEach(pos => cm.set(pos.x, pos.y, 1)); // prefer to path along other input pipelines
    } else {
      console.log('avoiding existing path from pipeline', pipeline.id);
      pipeline.path.forEach(pos => cm.set(pos.x, pos.y, 255)); // avoid incompatible pipelines
    }
  }

  return cm;
}

export function getPipelinePath(from: RoomPosition, to: RoomPosition, type: 'INPUT' | 'OUTPUT') {
  Memory.paths ??= {};

  const key = packPos(from) + packPos(to);
  if (!Memory.paths[key]) {
    const path = PathFinder.search(
      from,
      { pos: to, range: 1 },
      { roomCallback: room => pipelineCostMatrix(room, type), swampCost: 2, plainCost: 2 }
    );
    if (path.incomplete) {
      return;
    }
    Memory.paths[key] = packPosList([...path.path, to]);
    return [...path.path, to];
  }
  return unpackPosList(Memory.paths[key]);
}
