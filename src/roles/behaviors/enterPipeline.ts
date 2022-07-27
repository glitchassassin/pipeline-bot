import { avoidMostCreepsCostMatrix } from 'selectors';

export function enterPipeline(creep: Creep, target: RoomPosition) {
  const result = creep.pos.isEqualTo(target);
  if (!result)
    creep.moveTo(target, {
      range: 0,
      ignoreCreeps: true,
      costCallback: (room: string) => avoidMostCreepsCostMatrix(room, [target])
    });
  return result;
}
