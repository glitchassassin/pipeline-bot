import { packPos } from 'packrat';
import { spawn } from 'roles';
import { Roles } from 'roles/_roles';
import { adjacentWalkablePositions, byId } from 'selectors';
import { recoverDroppedResources } from 'utils/recoverDroppedResources';
import { Pipeline } from './Pipeline';
import { bestHarvestingSquare } from './selectors/bestHarvestingSquare';

declare global {
  interface CreepMemory {
    expires?: number;
  }
}

export class Harvester extends Pipeline {
  _source: Id<Source>;
  _harvesters: string[] = [];
  harvesterPositions: RoomPosition[];
  constructor(spawn: StructureSpawn, source: Source) {
    super(spawn.pos.roomName, source.id, bestHarvestingSquare(source), 'INPUT', spawn);
    this._source = source.id;
    this._harvesters = Game.rooms[this.room]
      .find(FIND_MY_CREEPS)
      .filter(c => c.memory.role === Roles.HARVESTER && c.memory.pipeline === this.id)
      .map(c => c.name);
    this.harvesterPositions = [
      this.endpoint,
      ...adjacentWalkablePositions(this.endpoint, true).filter(
        p => p.inRangeTo(this.source.pos, 1) && !this.path.some(path => path.isEqualTo(p))
      )
    ];
  }
  get source() {
    return byId(this._source)!;
  }
  get harvesters() {
    return this._harvesters.map(c => Game.creeps[c]).filter((c): c is Creep => !!c);
  }
  get primaryHarvester() {
    return this.harvesters.find(c => c.pos.isEqualTo(this.endpoint));
  }
  get blockSquares(): RoomPosition[] {
    return this.harvesterPositions;
  }
  survey(): void {
    if (this._surveyed !== Game.time) {
      this._harvesters = this._harvesters?.filter(n => Game.creeps[n]);
    }
    super.survey();
  }
  runSpawn(): boolean {
    if (this.spawn.spawning) return super.runSpawn();
    if (!this.intact) {
      // only spawn one harvester
      if (this._harvesters.length < 1) {
        spawn[Roles.HARVESTER](this);
        return true;
      }
    } else {
      // spawn as many harvesters as we need
      const maxHarvesters = Math.min(
        // max needed
        Math.ceil(
          5 / Math.floor((Game.rooms[this.room].energyCapacityAvailable - BODYPART_COST[CARRY]) / BODYPART_COST[WORK])
        ),
        // max spots available
        this.harvesterPositions.length
      );
      if (
        this.harvesters.filter(c => (c.ticksToLive ?? CREEP_LIFE_TIME) > (c.memory.expires ?? 0)).length < maxHarvesters
      ) {
        spawn[Roles.HARVESTER](this);
        return true;
      }
    }
    return super.runSpawn();
  }
  run() {
    this.survey();

    // harvest
    this.harvesters.forEach((creep, i) => {
      if (i >= this.harvesterPositions.length) return; // surplus harvester
      // register tow, if needed
      if (!creep.pos.isEqualTo(this.harvesterPositions[i]) && !creep.spawning) {
        creep.memory.pullTarget = packPos(this.harvesterPositions[i]);
      }

      if (creep.pos.isEqualTo(this.harvesterPositions[i]))
        creep.memory.expires ??= CREEP_LIFE_TIME - creep.ticksToLive!;

      // otherwise, harvest
      creep.harvest(this.source);
      if (creep.store.getFreeCapacity() <= 10 && this.primaryHarvester && creep.id !== this.primaryHarvester.id) {
        creep.transfer(this.primaryHarvester, RESOURCE_ENERGY);
      }

      recoverDroppedResources(creep);
    });

    // run main pipeline tasks
    super.run();
  }
  visualize(): void {
    this.harvesterPositions.forEach(p =>
      new RoomVisual(p.roomName).rect(p.x - 0.5, p.y - 0.5, 1, 1, {
        stroke: 'yellow',
        fill: 'transparent',
        opacity: 0.3
      })
    );
    super.visualize();
  }
}
