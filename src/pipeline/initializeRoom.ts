import { PipelinesByRoom, registerPipeline } from './byRoom';
import { Harvester } from './Harvester';
import { Upgrader } from './Upgrader';

export function initializeRoom(room: string) {
  const p = PipelinesByRoom.get(room);
  if (p) return p;

  const spawn = Game.rooms[room]?.find(FIND_MY_SPAWNS)[0];
  const controller = Game.rooms[room]?.controller;
  if (!spawn?.id || !controller) return [];

  // register pipelines
  Game.rooms[room].find(FIND_SOURCES).map(source => registerPipeline(new Harvester(spawn, source)));
  registerPipeline(new Upgrader(spawn, controller));

  return PipelinesByRoom.get(room)!;
}
