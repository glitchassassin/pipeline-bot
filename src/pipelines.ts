import { packPos, packPosList, unpackPos, unpackPosList } from "packrat";
import { byId } from "selectors";

declare global {
    interface RoomMemory {
        pipelines: Record<Id<Source>, RoomPosition[]>
    }
}

function pipelineCostMatrix(room: string) {
    const cm = new PathFinder.CostMatrix();
    const terrain = Game.map.getRoomTerrain(room);
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            if (
                terrain.get(x, y) === TERRAIN_MASK_WALL ||
                terrain.get(x - 1, y) === TERRAIN_MASK_WALL ||
                terrain.get(x, y - 1) === TERRAIN_MASK_WALL ||
                terrain.get(x - 1, y - 1) === TERRAIN_MASK_WALL
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

    Memory.rooms[room] ??= {pipelines: {}};

    if (!Memory.rooms[room].pipelines[sourceId]) {
        const path = PathFinder.search(spawn.pos, { pos: source.pos, range: 1 }, { roomCallback: pipelineCostMatrix, swampCost: 1 });
        if (path.incomplete) return;
        Memory.rooms[room].pipelines[sourceId] = path.path; //packPosList(path.path);
    }

    return Memory.rooms[room].pipelines[sourceId].map(r => new RoomPosition(r.x, r.y, r.roomName)) // unpackPosList(Memory.rooms[room].pipelines[sourceId]);
}
