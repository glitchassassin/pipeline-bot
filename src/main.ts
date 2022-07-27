import { PipelinesByRoom } from 'pipeline/byRoom';
import { initializeRoom } from 'pipeline/initializeRoom';
import 'ts-polyfill/lib/es2019-array';

export const loop = () => {
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  for (const room in Game.rooms) {
    initializeRoom(room);
    const pipelines = PipelinesByRoom.get(room) ?? [];
    let spawned = false;
    pipelines.forEach(p => {
      p.survey();
      if (!spawned) spawned ||= p.runSpawn();
      p.run();
      p.visualize();
    });
  }
  // console.log('Runtime', Game.cpu.getUsed(), Game.cpu.bucket);
};
