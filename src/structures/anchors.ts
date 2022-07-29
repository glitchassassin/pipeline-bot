export function orientation(spawn: StructureSpawn) {
  if (spawn.pos.y < spawn.room.controller!.pos.y) return 'DOWN';
  return 'UP';
}

export function inputSquare(spawn: StructureSpawn) {
  if (orientation(spawn) === 'UP') {
    return new RoomPosition(spawn.pos.x, spawn.pos.y + 1, spawn.pos.roomName);
  } else {
    return new RoomPosition(spawn.pos.x, spawn.pos.y - 1, spawn.pos.roomName);
  }
}

export function outputSquare(spawn: StructureSpawn) {
  if (orientation(spawn) === 'UP') {
    return new RoomPosition(spawn.pos.x, spawn.pos.y - 1, spawn.pos.roomName);
  } else {
    return new RoomPosition(spawn.pos.x, spawn.pos.y + 1, spawn.pos.roomName);
  }
}

export function containerSquares(spawn: StructureSpawn) {
  if (orientation(spawn) === 'UP') {
    return [
      new RoomPosition(spawn.pos.x - 1, spawn.pos.y + 1, spawn.pos.roomName),
      new RoomPosition(spawn.pos.x - 1, spawn.pos.y, spawn.pos.roomName)
    ];
  } else {
    return [
      new RoomPosition(spawn.pos.x + 1, spawn.pos.y - 1, spawn.pos.roomName),
      new RoomPosition(spawn.pos.x + 1, spawn.pos.y, spawn.pos.roomName)
    ];
  }
}
