export function energyBuffer(room: string) {
  return (
    Game.rooms[room].energyAvailable +
    Game.rooms[room]
      .find(FIND_STRUCTURES)
      .filter((s): s is StructureContainer => s.structureType === STRUCTURE_CONTAINER)
      .reduce((sum, s) => sum + s.store.getUsedCapacity(RESOURCE_ENERGY), 0)
  );
}
