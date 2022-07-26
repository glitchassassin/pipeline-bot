import { getPipeline } from 'pipelines';
import { roles } from 'roles';
import { Roles } from 'roles/_roles';
import { byId } from 'selectors';

const pipelinesByRoom = new Map<string, Pipeline[]>();

export class Pipeline {
    path: RoomPosition[]
    pipes: (Creep|undefined)[] = []
    pullers: Creep[] = []
    harvesters: Creep[] = []
    valid: boolean
    _surveyed = 0
    constructor(public room: string, public _source: Id<Source>) {
        this.path = getPipeline(room, _source) ?? [];
        this.valid = (this.path.length !== 0)

        this.survey();
    }
    survey() {
        if (this._surveyed !== Game.time) {
            this.pipes = this.path.map(pos => pos.lookFor(LOOK_CREEPS).filter(c => c.my)[0]);
            this.pullers = Game.rooms[this.room].find(FIND_MY_CREEPS).filter(c => c.memory.role === Roles.PULLER && c.memory.pipeline === this.source.id);
            this.harvesters = Game.rooms[this.room].find(FIND_MY_CREEPS).filter(c => c.memory.role === Roles.HARVESTER && c.memory.source === this.source.id);
            this._surveyed = Game.time;
        }
    }
    get creeps(): (Creep|undefined)[] {
        this.survey();
        return this.pipes;
    }
    get intact() {
        this.survey();
        return this.pipes.every(p => p !== undefined);
    }
    get source() {
        return byId(this._source)!
    }

    pullSpots() {
        this.survey();
        const spots: RoomPosition[] = []
        for (let i = this.pipes.length - 2; i >= 0; i--) {
            if (this.pipes[i]?.memory.role === Roles.PIPE && this.pipes[i + 1] === undefined) {
                spots.push(this.path[i + 1]);
            }
        }
        return spots;
    }

    haulSpots() {
        this.survey();
        const spots: RoomPosition[] = []
        for (let i = this.pipes.length - 2; i >= 0; i--) {
            if (
                this.pipes[i] === undefined &&
                this.pipes[i + 1]?.store.getUsedCapacity(RESOURCE_ENERGY)
            ) {
                spots.push(this.path[i]);
            }
        }
        return spots;
    }

    visualize() {
        const viz = new RoomVisual(this.room);
        viz.poly(this.path);
        for (const spot of this.pullSpots()) {
            viz.rect(spot.x - 0.5, spot.y - 0.5, 1, 1, { stroke: '#00ff00', fill: 'transparent' });
        }
        for (const spot of this.haulSpots()) {
            viz.rect(spot.x - 0.5, spot.y - 0.5, 1, 1, { stroke: '#00ffff', fill: 'transparent' });
        }
    }

    run() {
        // Assign pullers
        const unassignedPullers = this.pullers.filter(p => !p.memory.task);

        // Move harvesters
        const outOfPositionHarvesters = this.harvesters.filter(h => !h.pos.inRangeTo(this.source, 1));
        if (outOfPositionHarvesters.length && unassignedPullers.length) {
            const assignedPullers = this.pullers.reduce((m, p) => m.set(p.memory.task?.type === 'MOVE' ? p.memory.task.harvester : 'UNASSIGNED', p), new Map<string, Creep>())
            for (const harvester of outOfPositionHarvesters) {
                if (!assignedPullers.has(harvester.name)) {
                    const assignee = unassignedPullers.shift();
                    if (!assignee) break;
                    assignee.memory.task = { type: 'MOVE', harvester: harvester.name};
                }
            }
        }

        // Move pipeline parts
        if (!this.intact && unassignedPullers.length) {
            const assignedPullers = this.pullers.reduce((m, p) => m.set(p.memory.task?.type === 'DEFRAG' ? JSON.stringify(p.memory.task.pos) : 'UNASSIGNED', p), new Map<string, Creep>())
            for (const spot of this.pullSpots()) {
                if (!assignedPullers.has(JSON.stringify(spot))) {
                    const assignee = unassignedPullers.shift();
                    if (!assignee) break;
                    assignee.memory.task = { type: 'DEFRAG', pos: spot};
                }
            }
        }

        // Assign energy movers
        if (!this.intact && unassignedPullers.length) {
            const assignedHaulers = this.pullers.reduce((m, p) => m.set(p.memory.task?.type === 'SHIFT' ? JSON.stringify(p.memory.task.pos) : 'UNASSIGNED', p), new Map<string, Creep>())
            for (const spot of this.haulSpots()) {
                if (!assignedHaulers.has(JSON.stringify(spot))) {
                    const assignee = unassignedPullers.shift();
                    if (!assignee) break;
                    assignee.memory.task = { type: 'SHIFT', pos: spot};
                }
            }
        }

        // Shift energy
        const spawn = Game.rooms[this.room].find(FIND_MY_SPAWNS)[0];
        this.pipes[0]?.transfer(spawn, RESOURCE_ENERGY);
        for (let i = 1; i < this.pipes.length - 1; i++) {
            const to = this.pipes[i];
            const from = this.pipes[i + 1];
            if (!from || !to) continue;
            from.transfer(to, RESOURCE_ENERGY);
        }

        // Run pullers and harvesters
        this.pullers.forEach(p => roles[Roles.PULLER](p, this))
        this.harvesters.forEach(p => roles[Roles.HARVESTER](p))
    }

    static byRoom(room: string) {
        const pipelines = pipelinesByRoom.get(room) ??
            Game.rooms[room].find(FIND_SOURCES).map(s => new Pipeline(room, s.id));
        pipelinesByRoom.set(room, pipelines);
        return pipelines
    }
}
