import { Pipeline } from "pipeline/pipeline";
import 'ts-polyfill/lib/es2019-array';

export const loop = () => {
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  for (const room in Game.rooms) {
    const pipelines = Pipeline.byRoom(room);
    let spawned = false;
    pipelines.filter(p => p.valid).forEach(p => {
      if (!spawned) spawned ||= p.runSpawn();
      p.run();
      p.visualize();
    });
  }
  console.log('Runtime', Game.cpu.getUsed(), Game.cpu.bucket)
};
