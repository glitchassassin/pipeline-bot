export function byId<T extends _HasId>(id: Id<T> | undefined) {
  return id ? Game.getObjectById(id) ?? undefined : undefined;
}

export const calculateAdjacencyMatrix = (proximity = 1): { x: number; y: number }[] => {
  let adjacencies = new Array(proximity * 2 + 1).fill(0).map((v, i) => i - proximity);

  return adjacencies
    .flatMap(x => adjacencies.map(y => ({ x, y })))
    .filter((a: { x: number; y: number }) => !(a.x === 0 && a.y === 0));
};

export const calculateAdjacentPositions = (pos: RoomPosition) => {
  return calculateNearbyPositions(pos, 1);
};

export const adjacentWalkablePositions = (pos: RoomPosition, ignoreCreeps = false) =>
  calculateAdjacentPositions(pos).filter(p => isPositionWalkable(p, ignoreCreeps));
export const nearbyWalkablePositions = (pos: RoomPosition, proximity = 1, ignoreCreeps = false) =>
  calculateNearbyPositions(pos, proximity).filter(p => isPositionWalkable(p, ignoreCreeps));

export const calculateNearbyPositions = (pos: RoomPosition, proximity: number, includeCenter = false) => {
  let adjacent: RoomPosition[] = [];
  adjacent = calculateAdjacencyMatrix(proximity)
    .map(offset => {
      try {
        return new RoomPosition(pos.x + offset.x, pos.y + offset.y, pos.roomName);
      } catch {
        return null;
      }
    })
    .filter(roomPos => roomPos !== null) as RoomPosition[];
  if (includeCenter) adjacent.push(pos);
  return adjacent;
};

export const isPositionWalkable = (
  pos: RoomPosition,
  ignoreCreeps: boolean = false,
  ignoreStructures: boolean = false
) => {
  let terrain;
  try {
    terrain = Game.map.getRoomTerrain(pos.roomName);
  } catch {
    // Invalid room
    return false;
  }
  if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
    return false;
  }
  if (
    Game.rooms[pos.roomName] &&
    pos.look().some(obj => {
      if (!ignoreCreeps && obj.type === LOOK_CREEPS) return true;
      if (
        !ignoreStructures &&
        obj.constructionSite &&
        (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.constructionSite.structureType)
      )
        return true;
      if (
        !ignoreStructures &&
        obj.structure &&
        (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.structure.structureType)
      )
        return true;
      return false;
    })
  ) {
    return false;
  }
  return true;
};

export function avoidMostCreepsCostMatrix(room: string, ignore: RoomPosition[]) {
  const cm = new PathFinder.CostMatrix();
  for (const structure of [
    ...(Game.rooms[room]?.find(FIND_STRUCTURES) ?? []),
    ...(Game.rooms[room]?.find(FIND_MY_CONSTRUCTION_SITES) ?? [])
  ]) {
    if (OBSTACLE_OBJECT_TYPES.includes(structure.structureType as any)) {
      cm.set(structure.pos.x, structure.pos.y, 255);
    }
  }
  for (const creep of Game.rooms[room]?.find(FIND_CREEPS) ?? []) {
    if (!ignore.some(pos => pos.isEqualTo(creep.pos))) {
      cm.set(creep.pos.x, creep.pos.y, 255);
    }
  }
  return cm;
}

export const sortByDistanceTo = <T extends RoomPosition | _HasRoomPosition>(pos: RoomPosition) => {
  let distance = new Map<RoomPosition, number>();
  return (a: T, b: T) => {
    let aPos = a instanceof RoomPosition ? a : (a as _HasRoomPosition).pos;
    let bPos = b instanceof RoomPosition ? b : (b as _HasRoomPosition).pos;
    if (!distance.has(aPos)) {
      distance.set(aPos, pos.getRangeTo(aPos));
    }
    if (!distance.has(bPos)) distance.set(bPos, pos.getRangeTo(bPos));
    return (distance.get(aPos) as number) - (distance.get(bPos) as number);
  };
};
