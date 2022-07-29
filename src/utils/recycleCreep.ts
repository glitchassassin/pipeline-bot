export function recycleCreep(creep: Creep) {
  const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
  if (!spawn) creep.suicide();
  const targets = spawn.pos
    .findInRange(FIND_STRUCTURES, 1)
    .filter((s): s is StructureContainer => s instanceof StructureContainer);
  // prefer a non-full container
  const target = targets.find(s => s.store.getFreeCapacity()) ?? targets[0];
  if (target) {
    if (targets.some(p => creep.pos.isEqualTo(p))) {
      spawn.recycleCreep(creep);
    } else {
      creep.moveTo(target, { range: 0 });
    }
  } else {
    if (spawn.recycleCreep(creep) === ERR_NOT_IN_RANGE) {
      creep.moveTo(spawn);
    }
  }
}
