const roomEnergyLevels = new Map<string, number[]>();

export function roomEnergy(room: string) {
  const energyLevels = roomEnergyLevels.get(room) ?? [];
  return Math.max(...energyLevels, 300);
}

export function updateMetrics() {
  for (const room in Game.rooms) {
    const energyLevels = roomEnergyLevels.get(room) ?? [];
    roomEnergyLevels.set(room, energyLevels);

    energyLevels.push(Game.rooms[room].energyAvailable);

    // truncate at last 300 ticks
    while (energyLevels.length > 300) {
      energyLevels.shift();
    }
  }
}
