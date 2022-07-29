import { packPos } from 'packrat';
import { spawn } from 'roles';
import { Roles } from 'roles/_roles';
import { byId, calculateNearbyPositions } from 'selectors';
import { Pipeline } from './Pipeline';
import { bestUpgradingSquare } from './selectors/bestUpgradingSquare';

export class Upgrader extends Pipeline {
  _controller: Id<StructureController>;
  _upgraders: string[] = [];
  upgraderPositions: RoomPosition[];
  constructor(spawn: StructureSpawn, controller: StructureController) {
    super(spawn.pos.roomName, controller.id, bestUpgradingSquare(controller), 'OUTPUT', spawn);
    this._controller = controller.id;
    this._upgraders = Game.rooms[this.room]
      .find(FIND_MY_CREEPS)
      .filter(c => c.memory.role === Roles.UPGRADER && c.memory.pipeline === this.id)
      .map(c => c.name);
    this.upgraderPositions = [
      this.endpoint,
      ...calculateNearbyPositions(this.endpoint, 1).filter(
        p => p.inRangeTo(this.controller.pos, 3) && !p.inRangeTo(this.path[2], 1)
      )
    ];
  }
  get controller() {
    return byId(this._controller)!;
  }
  get upgraders() {
    return this._upgraders.map(c => Game.creeps[c]).filter((c): c is Creep => !!c);
  }
  get blockSquares() {
    return this.upgraderPositions;
  }
  get primaryUpgrader() {
    return this.upgraders.find(c => c.pos.isEqualTo(this.endpoint));
  }
  survey(): void {
    if (this._surveyed !== Game.time) {
      this._upgraders = this._upgraders?.filter(n => Game.creeps[n]);
    }
    super.survey();
  }
  runSpawn(): boolean {
    if (this.spawn.spawning) return super.runSpawn();
    if (!this.intact) {
      // only spawn one upgrader
      return super.runSpawn();
    } else {
      // spawn as many upgraders as we need
      const maxUpgraders = Math.min(
        // max needed
        Math.ceil(10 / Math.floor(Game.rooms[this.room].energyCapacityAvailable / BODYPART_COST[WORK])),
        // max spots available
        this.upgraderPositions.length
      );

      if (this._upgraders.length < maxUpgraders) {
        spawn[Roles.UPGRADER](this);
        return true;
      }
    }
    return super.runSpawn();
  }
  run() {
    // clean up
    this._upgraders = this._upgraders.filter(c => Game.creeps[c]);

    // upgrade
    this.upgraders.forEach((creep, i) => {
      // register tow, if needed
      if (!creep.pos.isEqualTo(this.upgraderPositions[i]) && !creep.spawning) {
        creep.memory.pullTarget = packPos(this.upgraderPositions[i]);
      }

      // otherwise, upgrade
      creep.upgradeController(this.controller);

      // spread around the energy
      if (creep.id === this.primaryUpgrader?.id && creep.store.getUsedCapacity()) {
        const target = creep.pos
          .findInRange(FIND_MY_CREEPS, 1)
          .find(c => c.memory.role === Roles.UPGRADER && c.store.getFreeCapacity() > CARRY_CAPACITY / 2);
        if (target) {
          creep.transfer(target, RESOURCE_ENERGY);
        }
      }
    });

    // run main pipeline tasks
    super.run();
  }
  visualize(): void {
    this.upgraderPositions.forEach(p =>
      new RoomVisual(p.roomName).rect(p.x - 0.5, p.y - 0.5, 1, 1, { stroke: 'cyan', fill: 'transparent', opacity: 0.3 })
    );
    super.visualize();
  }
}
