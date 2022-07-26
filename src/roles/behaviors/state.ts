export enum States {
    MOVE_HARVESTER = 'MOVE_HARVESTER',
    RUN_PIPELINE = 'RUN_PIPELINE',
    IDLE = 'IDLE',
}

declare global {
    interface CreepMemory {
        state?: States
    }
}

export function runStates(
  states: Record<States, (creep: Creep) => States>,
  creep: Creep
) {
  const statesRun: States[] = [];
  creep.memory.state ??= Object.keys(states)[0] as States; // First state is default
  while (!statesRun.includes(creep.memory.state)) {
    statesRun.push(creep.memory.state);
    if (!(creep.memory.state in states)) {
      console.log('Error: creep', creep.name, 'has invalid state', creep.memory.state);
      delete creep.memory.state;
      return;
    }
    creep.memory.state = states[creep.memory.state](creep);
  }
  // console.log(creep.name, JSON.stringify(statesRun));
}
