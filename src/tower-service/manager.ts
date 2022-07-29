export function runTowers() {
  for (const room in Game.rooms) {
    const hostiles = [...Game.rooms[room].find(FIND_HOSTILE_CREEPS)];
    const towers = Game.rooms[room]
      .find(FIND_MY_STRUCTURES)
      .filter((s): s is StructureTower => s instanceof StructureTower);

    let bestTarget: Creep | undefined = undefined;
    let bestDamage = 0;
    for (const hostile of hostiles) {
      const damage = netDamage(towers, hostile);
      if (damage > bestDamage) {
        bestDamage = damage;
        bestTarget = hostile;
      }
    }

    towers.forEach(t => bestTarget && t.attack(bestTarget));
  }
}

function netDamage(towers: StructureTower[], target: Creep) {
  const totalDamage = towers.reduce((sum, t) => sum + towerDamage(t, target.pos), 0);
  const totalHealing = target.body.reduce((sum, p) => {
    if (p.type !== HEAL) return 0;
    let heal = HEAL_POWER;
    if (p.boost) heal *= BOOSTS[HEAL][p.boost].heal;
    return heal;
  }, 0);

  return totalDamage - totalHealing;
}

export const towerDamage = (tower?: StructureTower, pos?: RoomPosition) => {
  if (!tower || !pos) return 0;
  const range = Math.min(TOWER_FALLOFF_RANGE, tower.pos.getRangeTo(pos));
  let amount = TOWER_POWER_ATTACK;
  if (range > TOWER_OPTIMAL_RANGE) {
    amount -= (amount * TOWER_FALLOFF * (range - TOWER_OPTIMAL_RANGE)) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
  }
  return amount;
};
