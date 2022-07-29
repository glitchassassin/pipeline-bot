/**
 * These assignments are between creeps, so the object doesn't need to be specific to a single room.
 * Creep names are enough to keep this unique.
 */
const assignments: Record<string, string> = {};
let synced = false;

function syncAssignments() {
  if (synced) return;
  for (const creep of Object.values(Game.creeps)) {
    if (creep.memory.towTarget) {
      assignments[creep.memory.towTarget] = creep.name;
    }
  }
  synced = true;
}

export function assignPuller(creep: Creep, puller: Creep) {
  assignments[creep.name] = puller.name;
}

export function getAssignment(puller: Creep) {
  for (const [creepName, pullerName] of Object.entries(assignments)) {
    if (puller.name === pullerName) return creepName;
  }
  return undefined;
}

export function pullerAssigned(creep: Creep) {
  return !!assignments?.[creep.name];
}

export function pullDone(creep: Creep) {
  delete assignments[creep.name];
}

export function cleanUpAssignments() {
  syncAssignments();
  for (const [creep, puller] of Object.entries(assignments)) {
    if (!Game.creeps[creep] || !Game.creeps[puller]) {
      delete assignments[creep];
    }
  }
}
