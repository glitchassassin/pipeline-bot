import { roles, spawn } from 'roles';
import { leavePipeline } from 'roles/behaviors/leavePipeline';
import { Roles } from 'roles/_roles';
import { inputSquare, outputSquare } from 'structures/anchors';
import { recoverDroppedResources } from 'utils/recoverDroppedResources';
import { PipelinesByRoom } from './byRoom';
import { getPipelinePath } from './selectors/getPipelinePath';

const TRANSFER_THRESHOLD = CARRY_CAPACITY / 2;

export class Pipeline {
  path: RoomPosition[];
  _pipes: string[] = [];
  pipes: (Creep | undefined)[] = [];
  _pullers: string[] = [];
  _surveyed = 0;
  _spawn: string;
  constructor(
    public room: string,
    public id: string,
    public endpoint: RoomPosition,
    public type: 'INPUT' | 'OUTPUT',
    spawn: StructureSpawn
  ) {
    console.log('New pipeline between', spawn, endpoint);
    this._spawn = spawn.name;
    const startingPoint = this.type === 'INPUT' ? inputSquare(spawn) : outputSquare(spawn);
    this.path = getPipelinePath(startingPoint, endpoint, type)!;
    if (!this.path) throw new Error(`Unable to create path for pipeline between ${startingPoint} and ${endpoint}`);
    // this.path.unshift(this.spawn.pos);

    if (type === 'OUTPUT') this.path.reverse();
    this._pipes = Game.rooms[this.room]
      .find(FIND_MY_CREEPS)
      .filter(c => c.memory.role === Roles.PIPE && c.memory.pipeline === this.id)
      .map(c => c.name);
    this._pullers = Game.rooms[this.room]
      .find(FIND_MY_CREEPS)
      .filter(c => c.memory.role === Roles.PULLER && c.memory.pipeline === this.id)
      .map(c => c.name);

    this.survey();
  }
  survey() {
    if (this._surveyed !== Game.time) {
      this._pipes = this.path
        .flatMap(p => p.lookFor(LOOK_CREEPS).filter(c => c.my && c.memory.role === Roles.PIPE))
        .map(c => c.name);
      this._pullers = this._pullers.filter(n => Game.creeps[n]);
      this.pipes = this.path.map(pos => pos.lookFor(LOOK_CREEPS).filter(c => c.my)[0]);
      this._surveyed = Game.time;
    }
  }
  get creeps(): (Creep | undefined)[] {
    return this.pipes;
  }
  get pullers() {
    const pullers = this._pullers.map(p => Game.creeps[p]).filter(p => p);
    this._pullers = pullers.map(p => p.name); // clear out dead creeps
    return pullers.filter(c => !c.spawning);
  }
  get intact() {
    const pipes = this.type === 'INPUT' ? this.pipes.slice(0, -1) : this.pipes.slice(1);
    return pipes.every(p => p?.memory.role === Roles.PIPE);
  }
  get spawn() {
    return Game.spawns[this._spawn];
  }
  get blockSquares(): RoomPosition[] {
    return [];
  }
  // true if spawn is making a new pipe for our pipeline
  spawningPipe() {
    return (
      this.spawn.spawning && this.spawn.spawning.name.includes(this.id) && this.spawn.spawning.name.includes(Roles.PIPE)
    );
  }

  pullSpots() {
    this.survey();
    if (!this.spawningPipe()) return [];
    const pipes = this.pipes.slice();
    if (this.type === 'OUTPUT') pipes.reverse();

    for (let i = 0; i < pipes.length - 2; i++) {
      if (!pipes[i]) return [];

      if (pipes[i]!.memory.role === Roles.PIPE && (!pipes[i + 1] || pipes[i + 1]?.memory.role === Roles.PULLER)) {
        return this.type === 'OUTPUT' ? [pipes.length - i - 2] : [i + 1];
      }
    }

    return [];
  }

  haulSpots() {
    if (this.type !== 'INPUT') return [];
    this.survey();
    const spots: number[] = [];
    for (let i = 0; i < this.path.length - 1; i++) {
      if (
        ![Roles.PIPE, Roles.HARVESTER].includes(this.pipes[i]?.memory.role!) &&
        this.pipes[i + 1] &&
        this.pipes[i + 1]!.store.getUsedCapacity(RESOURCE_ENERGY) > TRANSFER_THRESHOLD &&
        !(i === 0 && this.spawningPipe())
      ) {
        spots.push(i);
      }
    }
    return spots;
  }

  get firstSegment() {
    return this.type === 'INPUT' ? this.pipes[0] : this.pipes[this.pipes.length - 1];
  }

  needsPuller() {
    return (
      this.pullSpots().length ||
      this.haulSpots().length ||
      (this.firstSegment?.memory.role === Roles.PIPE && !this.intact)
    );
  }

  visualize() {
    const viz = new RoomVisual(this.room);
    viz.poly(this.path, { opacity: 0.3 });
    // viz.circle(inputSquare(this.spawn), { radius: 0.5, stroke: 'green', fill: 'transparent' });
    // viz.circle(outputSquare(this.spawn), { radius: 0.5, stroke: 'red', fill: 'transparent' });
    for (const spot of this.pullSpots().map(i => this.path[i])) {
      viz.rect(spot.x - 0.5, spot.y - 0.5, 1, 1, { stroke: '#00ff00', fill: 'transparent', opacity: 0.3 });
    }
    for (const spot of this.haulSpots().map(i => this.path[i])) {
      viz.rect(spot.x - 0.5, spot.y - 0.5, 1, 1, { stroke: '#00ffff', fill: 'transparent', opacity: 0.3 });
    }
  }

  runSpawn() {
    if (this.spawn.spawning && this.spawn.spawning.name.includes(this.id)) {
      // Cancel pipes if we no longer have a puller
      if (
        this.spawn.spawning.name.includes(Roles.PIPE) &&
        this.firstSegment &&
        !this.firstSegment?.body.some(p => p.type === MOVE) &&
        this._pullers.length === 0
      ) {
        console.log('canceling', this.spawn.spawning.name);
        this._pipes.splice(this._pipes.indexOf(this.spawn.spawning.name));
        this.spawn.spawning.cancel(); // No living pullers, cancel to fix that situation
      }
      return false;
    }
    // Start with a puller
    else if (this.needsPuller() && this.pullers.filter(p => !p.ticksToLive || p.ticksToLive > 6).length === 0) {
      // First check if we can steal someone else's puller
      let stolen = false;
      for (const pipeline of PipelinesByRoom.get(this.room) ?? []) {
        if (pipeline.id === this.id) continue;
        if (!pipeline.needsPuller()) {
          const puller = pipeline._pullers.shift();
          if (puller) {
            this._pullers.push(puller);
            Game.creeps[puller].memory.pipeline = this.id;
            stolen = true;
            break;
          }
        }
      }
      if (!stolen) spawn[Roles.PULLER](this);
    }
    // Add pipeline parts
    else if (this._pipes.length < this.path.length - 1) spawn[Roles.PIPE](this);
    else return false; // no spawning needed
    return true; // spawning done
  }

  run() {
    this.survey();

    // Pipe energy
    // Pipes send to spawn or to prior spawn links
    if (this.type === 'INPUT') {
      this.firstSegment?.transfer(this.spawn, RESOURCE_ENERGY);
      if (
        this.pipes.slice(0, 3).every(p => p?.store.getFreeCapacity(RESOURCE_ENERGY)) &&
        this.spawn.store.getFreeCapacity(RESOURCE_ENERGY)
      ) {
        // refill from container
        const container = this.firstSegment?.pos
          .findInRange(FIND_STRUCTURES, 1)
          .find(s => s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity(RESOURCE_ENERGY));
        if (container) this.firstSegment?.withdraw(container, RESOURCE_ENERGY);
      } else if (
        this.pipes.slice(0, 3).every(p => p?.store.getFreeCapacity(RESOURCE_ENERGY) === 0) &&
        this.spawn.store.getFreeCapacity(RESOURCE_ENERGY) === 0
      ) {
        // dump excess to container
        const container = this.firstSegment?.pos
          .findInRange(FIND_STRUCTURES, 1)
          .find(s => s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY));
        if (container) this.firstSegment?.transfer(container, RESOURCE_ENERGY);
      }
    } else if (this.type === 'OUTPUT' && this.intact) {
      const container = this.firstSegment?.pos
        .findInRange(FIND_STRUCTURES, 1)
        .find(s => s instanceof StructureContainer);
      if (container) {
        this.firstSegment?.withdraw(container, RESOURCE_ENERGY);
      } else if (this.spawn.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && Game.time % 2 === 0) {
        this.firstSegment?.withdraw(this.spawn, RESOURCE_ENERGY);
      }
    }

    for (let i = 0; i < this.pipes.length - 1; i++) {
      const to = this.pipes[i];
      const from = this.pipes[i + 1];
      if (to) recoverDroppedResources(to);
      if (from) {
        // attempt to deliver to structures first
        const target = from.pos
          .findInRange(FIND_MY_STRUCTURES, 1)
          .find(
            s =>
              (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER) &&
              s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        if (target) {
          from.transfer(target, RESOURCE_ENERGY);
          continue;
        }
      }
      if (!from || !to || from.store.getUsedCapacity() < TRANSFER_THRESHOLD) continue;
      from.transfer(to, RESOURCE_ENERGY);
    }

    // Defrag pipeline
    for (const index of this.pullSpots()) {
      const creep = this.pipes[index];
      if (!creep) continue;

      const pipes = this.type === 'OUTPUT' ? this.pipes.slice().reverse() : this.pipes;
      const currentIndex = this.type === 'OUTPUT' ? this.pipes.length - index - 1 : index;

      for (let i = currentIndex; i > 0; i--) {
        let puller = pipes[i];
        let pullee = pipes[i - 1];
        if (puller && pullee) {
          puller.pull(pullee);
          pullee.move(puller);
        } else {
          break;
        }
      }

      if (index >= this.path.length - 2 || this.pipes[index + 1]) {
        // no room ahead, move off the track
        leavePipeline(creep, this);
      } else {
        // Follow the path
        creep.moveByPath(this.path);
      }
    }

    // Haul energy, if needed
    for (const index of this.haulSpots()) {
      const creep = this.pipes[index];
      if (!creep) continue;

      if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
        if (index === 0) {
          creep.transfer(this.spawn, RESOURCE_ENERGY);
          if (this.spawningPipe()) leavePipeline(creep, this);
          continue; // reached end of pipeline
        } else if (this.pipes[index - 1]) {
          creep.transfer(this.pipes[index - 1]!, RESOURCE_ENERGY);
          continue;
        } else if (index !== 1 || !this.spawningPipe()) {
          creep.moveByPath(this.path.slice().reverse());
        }
      } else {
        if (index === this.pipes.length - 1) {
          continue; // reached end of pipeline
        } else if (this.pipes[index + 1]) {
          this.pipes[index + 1]?.transfer(creep, RESOURCE_ENERGY);
        } else {
          creep.moveByPath(this.path);
        }
      }
    }

    // Run pullers and harvesters
    this.pullers.forEach(p => roles[Roles.PULLER](p, this));
  }
}
