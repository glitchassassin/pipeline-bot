import { Pipeline } from 'pipeline/Pipeline';
import { enterPipeline } from './behaviors/enterPipeline';
import { leavePipeline } from './behaviors/leavePipeline';
import { runStates, States } from './behaviors/state';
import { Roles } from './_roles';

declare global {
  interface CreepMemory {
    pullTarget?: string;
  }
}

export function role(creep: Creep, pipeline: Pipeline) {
  runStates(
    {
      [States.IDLE]: creep => {
        // Once clear of the pipeline, try to MOVE_HARVESTER, then DEFRAG, then MOVE_ENERGY
        const nearbyPipe = pipeline.pipes.find(c => c?.pos.inRangeTo(creep.pos, 1) && c.store.getFreeCapacity());
        if (nearbyPipe && creep.store.getUsedCapacity()) creep.transfer(nearbyPipe, RESOURCE_ENERGY);
        return leavePipeline(creep, pipeline) ? States.TOW : States.IDLE;
      },
      [States.RUN_PIPELINE]: creep => {
        const target = [...pipeline.pullSpots(), ...pipeline.haulSpots()][0];
        if (target === undefined) return States.IDLE;
        enterPipeline(creep, pipeline.path[target]);
        return States.RUN_PIPELINE;
      },
      [States.TOW]: creep => {
        const [name, destination] = pipeline.requestTowee(creep.memory.pullTarget);
        creep.memory.pullTarget = name;
        const target = Game.creeps[name ?? ''];
        if (!target || !destination) {
          delete creep.memory.pullTarget;
          return States.RUN_PIPELINE;
        }
        creep.say('MOVE');
        const moveTarget = destination();
        console.log('moveTarget', moveTarget);
        if (!moveTarget || target.pos.inRangeTo(moveTarget, 0)) {
          pipeline.towFinished(creep.memory.pullTarget!);
          delete creep.memory.pullTarget;
          return States.RUN_PIPELINE;
        }

        new RoomVisual(target.pos.roomName).line(target.pos, moveTarget, { color: 'blue' });
        new RoomVisual(target.pos.roomName).line(target.pos, creep.pos, { color: 'blue' });

        if (target.pos.inRangeTo(creep, 1)) {
          creep.pull(target);
          target.move(creep);
          if (creep.pos.isEqualTo(moveTarget)) {
            // Swap places for final positioning
            creep.move(target);
          } else {
            // move to target square
            creep.moveTo(moveTarget, { reusePath: 20, visualizePathStyle: { stroke: 'blue' } });
          }
        } else {
          creep.moveTo(target, { reusePath: 20, visualizePathStyle: { stroke: 'blue' } });
        }
        return States.TOW;
      }
    },
    creep
  );
}

export function spawn(pipeline: Pipeline) {
  const name = Roles.PULLER + '-' + Game.time;
  const result = pipeline.spawn.spawnCreep([MOVE, CARRY], name, {
    memory: { role: Roles.PULLER, pipeline: pipeline.id }
  });

  if (result === OK) {
    pipeline._pullers.push(name);
    return true;
  }
  if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) return false;
  throw new Error('Bad spawn of PULLER: ' + result);
}
