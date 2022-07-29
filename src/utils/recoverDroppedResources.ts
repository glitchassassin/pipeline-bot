export function recoverDroppedResources(creep: Creep) {
  const resources = creep.pos.lookFor(LOOK_RESOURCES).find(r => r.resourceType === RESOURCE_ENERGY);
  if (resources) creep.pickup(resources);
}
