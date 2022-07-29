import { PipelinesByRoom } from 'pipeline/byRoom';

let cached: ConstructionSite[] = [];
let updated = 0;

export function worklist(room: string) {
  if (updated !== Game.time) {
    cached =
      PipelinesByRoom.get(room)
        ?.filter(p => p.type === 'INPUT')
        .flatMap(p => p.path)
        .flatMap(p => p.findInRange(FIND_MY_CONSTRUCTION_SITES, 4))
        .reduce((list, site) => {
          if (!list.some(l => l.id === site.id)) list.push(site);
          return list;
        }, <ConstructionSite[]>[]) ?? [];
    if (cached.some(s => s.structureType === STRUCTURE_CONTAINER))
      cached = cached.filter(s => s.structureType === STRUCTURE_CONTAINER);
    updated = Game.time;
  }

  return cached;
}
