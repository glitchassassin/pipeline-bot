import { Harvester } from './Harvester';
import { Pipeline } from './Pipeline';
import { Upgrader } from './Upgrader';

const pipelines = new Map<string, Pipeline[]>();
export function pipelinesByRoom(room: string) {
  const spawn = Game.rooms[room]?.find(FIND_MY_SPAWNS)[0];
  const controller = Game.rooms[room]?.controller;
  if (!spawn?.id || !controller) return [];
  const p = pipelines.get(room) ?? [
    ...Game.rooms[room].find(FIND_SOURCES).map(s => new Harvester(spawn, s)),
    new Upgrader(spawn, controller)
  ];
  pipelines.set(room, p);

  return p;
}
