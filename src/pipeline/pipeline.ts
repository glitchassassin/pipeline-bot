import { getPipeline } from 'pipelines';
import { roles, spawn } from 'roles';
import { leavePipeline } from 'roles/behaviors/leavePipeline';
import { States } from 'roles/behaviors/state';
import { Roles } from 'roles/_roles';
import { adjacentWalkablePositions, byId } from 'selectors';

const pipelinesByRoom = new Map<string, Pipeline[]>();

export class Pipeline {
    path: RoomPosition[]
    _pipes: string[] = []
    pipes: (Creep|undefined)[] = []
    _pullers: string[] = []
    _harvesters: string[] = []
    valid: boolean
    _surveyed = 0
    constructor(public room: string, public _spawn: string, public _source: Id<Source>) {
        this.path = getPipeline(room, _source) ?? [];
        this.valid = (this.path.length !== 0)
        this._pipes = Game.rooms[this.room].find(FIND_MY_CREEPS).filter(c => c.memory.role === Roles.PIPE && c.memory.pipeline === this.source.id).map(c => c.name);
        this._pullers = Game.rooms[this.room].find(FIND_MY_CREEPS).filter(c => c.memory.role === Roles.PULLER && c.memory.pipeline === this.source.id).map(c => c.name);
        this._harvesters = Game.rooms[this.room].find(FIND_MY_CREEPS).filter(c => c.memory.role === Roles.HARVESTER && c.memory.pipeline === this.source.id).map(c => c.name);

        this.survey();
    }
    survey() {
        if (this._surveyed !== Game.time) {
            this._pipes = this._pipes.filter(n => Game.creeps[n]);
            this._pullers = this._pullers.filter(n => Game.creeps[n]);
            this._harvesters = this._harvesters.filter(n => Game.creeps[n]);
            this.pipes = this.path.map(pos => pos.lookFor(LOOK_CREEPS).filter(c => c.my)[0]);
            this._surveyed = Game.time;
        }
    }
    get creeps(): (Creep|undefined)[] {
        this.survey();
        return this.pipes;
    }
    get pullers() {
        const pullers = this._pullers.map(p => Game.creeps[p]).filter(p => p);
        this._pullers = pullers.map(p => p.name); // clear out dead creeps
        return pullers.filter(c =>!c.spawning);
    }
    get harvesters() {
        const harvesters = this._harvesters.map(p => Game.creeps[p]).filter(p => p);
        this._harvesters = harvesters.map(p => p.name); // clear out dead creeps
        return harvesters.filter(c =>!c.spawning);
    }
    get intact() {
        this.survey();
        return this.pipes.every(p => p !== undefined);
    }
    get source() {
        return byId(this._source)!
    }
    get spawn() {
        return Game.spawns[this._spawn];
    }
    // true if spawn is making a new pipe for our pipeline
    spawningPipe() {
        return (
                this.spawn.spawning &&
                this.spawn.spawning.name.includes(this.source.id) &&
                this.spawn.spawning.remainingTime <= 1
            )
    }

    pullSpots() {
        this.survey();
        const spots: number[] = []
        let contiguous = false;
        for (let i = this.pipes.length - 2; i >= 0; i--) {
            if (this.pipes[i]?.memory.role === Roles.PIPE && ![Roles.PIPE, Roles.HARVESTER].includes(this.pipes[i + 1]?.memory.role!)) {
                contiguous = true;
                new RoomVisual().circle(this.path[i], { radius: 0.5, stroke: 'green', fill: 'transparent' })
                spots.push(i + 1); // end of one creep chain
            } else if (
                this.pipes[i]?.memory.role !== Roles.PIPE // break in the chain
            ) {
                contiguous = false; // break in the chain
            }
        }

        if (
            (contiguous && !this.spawningPipe()) ||
            (!this.pipes[0] && this.pipes[1] && this.spawningPipe())
        ) {
            spots.shift() // ignore first contiguous section if it doesn't need to move
        }
        return spots;
    }

    haulSpots() {
        this.survey();
        const spots: number[] = []
        for (let i = 0; i < this.path.length - 1; i++) {
            if (
                ![Roles.PIPE, Roles.HARVESTER].includes(this.pipes[i]?.memory.role!) &&
                this.pipes[i + 1]?.store.getUsedCapacity(RESOURCE_ENERGY)
            ) {
                spots.push(i);
            }
        }
        return spots;
    }

    harvestersToPull() {
        return this.harvesters.filter(h =>
            !h.pos.inRangeTo(this.source, 1) ||
            !(this.pipes[this.pipes.length - 1]?.memory.role === Roles.HARVESTER && h.pos.inRangeTo(this.path[this.path.length - 1], 1))
        )
    }

    visualize() {
        const viz = new RoomVisual(this.room);
        viz.poly(this.path);
        for (const spot of this.pullSpots().map(i => this.path[i])) {
            viz.rect(spot.x - 0.5, spot.y - 0.5, 1, 1, { stroke: '#00ff00', fill: 'transparent' });
        }
        for (const spot of this.haulSpots().map(i => this.path[i])) {
            viz.rect(spot.x - 0.5, spot.y - 0.5, 1, 1, { stroke: '#00ffff', fill: 'transparent' });
        }
    }

    runSpawn() {
        if (this.spawn.spawning) return false;
        const maxHarvesters = Math.min(
            // max needed
            Math.ceil(5 / Math.floor((Game.rooms[this.room].energyCapacityAvailable / BODYPART_COST[WORK]))),
            // max spots available
            adjacentWalkablePositions(this.source.pos, true).length
        );

        // Start with a puller and a harvester
        if (this.pullers.filter(p => !p.ticksToLive || p.ticksToLive > 6).length === 0) spawn[Roles.PULLER](this);
        else if (this.harvesters.length === 0) spawn[Roles.HARVESTER](this);

        // Add pipeline parts
        else if (this._pipes.length < this.path.length - 1) spawn[Roles.PIPE](this);

        // Add remaining harvesters
        else if (this.harvesters.length < maxHarvesters) spawn[Roles.HARVESTER](this);
        else return false; // no spawning needed
        return true; // spawning done
    }

    run() {
        this.survey();

        // Pipe energy
        // Harvesters send to the one at the head of the pipeline
        const destHarvester = this.harvesters.find(h => h.pos.isEqualTo(this.path[this.path.length - 1]));
        destHarvester && this.harvesters.forEach(c => {
            if (c !== destHarvester) {
                c.transfer(destHarvester, RESOURCE_ENERGY)
            }
        })
        // Pipes send to spawn or to prior spawn links
        this.pipes[0]?.transfer(this.spawn, RESOURCE_ENERGY);
        for (let i = 0; i < this.pipes.length - 1; i++) {
            const to = this.pipes[i];
            const from = this.pipes[i + 1];
            if (!from || !to || from.store.getUsedCapacity() < CARRY_CAPACITY / 2) continue;
            from.transfer(to, RESOURCE_ENERGY);
        }

        // Defrag pipeline
        for (const index of this.pullSpots()) {
            const creep = this.pipes[index];
            if (!creep) continue;

            for (let i = index; i > 0; i--) {
                let puller = this.pipes[i];
                let pullee = this.pipes[i - 1];
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
                    continue; // reached end of pipeline
                } else if (this.pipes[index - 1]) {
                    creep.transfer(this.pipes[index - 1]!, RESOURCE_ENERGY);
                    continue;
                } else {
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
        this.pullers.forEach(p => roles[Roles.PULLER](p, this))
        this.harvesters.forEach(p => roles[Roles.HARVESTER](p))
    }

    static byRoom(room: string) {
        const spawns = Game.rooms[room].find(FIND_MY_SPAWNS);
        const pipelines = pipelinesByRoom.get(room) ??
            Game.rooms[room].find(FIND_SOURCES).map(s => new Pipeline(room, spawns[0].name, s.id));
        pipelinesByRoom.set(room, pipelines);
        return pipelines
    }
}
