import { Pipeline } from "pipeline/pipeline";
import { ErrorMapper } from "utils/ErrorMapper";

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
};
