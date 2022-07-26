import { role as pullerRole, spawn as pullerSpawn } from "./puller";
import { role as pipeRole, spawn as pipeSpawn } from "./pipe";
import { role as harvesterRole, spawn as harvesterSpawn } from "./harvester";
import { Roles } from "./_roles";

declare global {
    interface CreepMemory {
        role: Roles
    }
}

export const roles = {
    [Roles.PULLER]: pullerRole,
    [Roles.PIPE]: pipeRole,
    [Roles.HARVESTER]: harvesterRole,
}

export const spawn = {
    [Roles.PULLER]: pullerSpawn,
    [Roles.PIPE]: pipeSpawn,
    [Roles.HARVESTER]: harvesterSpawn,
}
