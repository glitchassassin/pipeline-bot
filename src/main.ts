import { Pipeline } from "pipeline/pipeline";
import { getPipeline } from "pipelines";
import { spawnManager } from "spawnManager";
import { ErrorMapper } from "utils/ErrorMapper";

export const loop = ErrorMapper.wrapLoop(() => {
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  for (const room in Game.rooms) {
    const pipelines = Pipeline.byRoom(room);
    spawnManager(room, pipelines);
    pipelines.forEach(p => {
      p.run();
      p.visualize();
    });
  }
});
