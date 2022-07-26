import { packPos, packPosList, unpackPos, unpackPosList } from "packrat";
import { byId } from "selectors";

declare global {
    interface RoomMemory {
        pipelines: Record<Id<Source>, string>
    }
}

function pipelineCostMatrix(room: string) {
    const cm = new PathFinder.CostMatrix();
    const terrain = Game.map.getRoomTerrain(room);
    const sources = Game.rooms[room].find(FIND_SOURCES);
    const isWall = (x: number, y: number) => terrain.get(x, y) === TERRAIN_MASK_WALL && !sources.some(s => s.pos.x === x && s.pos.y === y)
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            if (
                isWall(x, y) ||
                isWall(x - 1, y) ||
                isWall(x, y - 1) ||
                isWall(x - 1, y - 1)
            ) {
                cm.set(x, y, 255);
            }
        }
    }
    return cm;
}

export function getPipeline(room: string, sourceId: Id<Source>) {
    const spawn = Game.rooms[room]?.find(FIND_MY_SPAWNS)?.[0];
    const source = byId(sourceId);
    if (!spawn || !source) return;

    Memory.rooms ??= {}
    Memory.rooms[room] ??= {pipelines: {}};

    if (!Memory.rooms[room].pipelines[sourceId]) {
        const path = PathFinder.search(spawn.pos, { pos: source.pos, range: 1 }, { roomCallback: pipelineCostMatrix, swampCost: 1 });
        console.log(sourceId, JSON.stringify(path))
        if (path.incomplete) return;
        Memory.rooms[room].pipelines[sourceId] = packPosList(path.path);
    }

    return unpackPosList(Memory.rooms[room].pipelines[sourceId]);
}
