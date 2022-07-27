import { Pipeline } from './Pipeline';

export const PipelinesByRoom = new Map<string, Pipeline[]>();

export function registerPipeline(pipeline: Pipeline) {
  const pipelines = PipelinesByRoom.get(pipeline.room) ?? [];
  pipelines.push(pipeline);
  PipelinesByRoom.set(pipeline.room, pipelines);
}
