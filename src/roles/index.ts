import { spawn as harvesterSpawn } from './harvester';
import { spawn as pipeSpawn } from './pipe';
import { role as pullerRole, spawn as pullerSpawn } from './puller';
import { spawn as upgraderSpawn } from './upgrader';
import { Roles } from './_roles';

declare global {
  interface CreepMemory {
    role: Roles;
  }
}

export const roles = {
  [Roles.PULLER]: pullerRole
};

export const spawn = {
  [Roles.PULLER]: pullerSpawn,
  [Roles.PIPE]: pipeSpawn,
  [Roles.HARVESTER]: harvesterSpawn,
  [Roles.UPGRADER]: upgraderSpawn
};
