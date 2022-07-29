let attemptedSpawn = 0;
const spawnCreep = StructureSpawn.prototype.spawnCreep;
StructureSpawn.prototype.spawnCreep = function (this: StructureSpawn, body, name, opts) {
  if (attemptedSpawn === Game.time) return ERR_BUSY;
  attemptedSpawn = Game.time;
  return spawnCreep.call(this, body, name, opts);
} as typeof spawnCreep;
