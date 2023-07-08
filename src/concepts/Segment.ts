declare global {
    interface Memory {
        segments: {
            [key: string]: {
                path: string;
                dir: Direction;
            }
        }
    }
}

enum Direction {
    ToStart,
    ToEnd,
}

const pathCache = new Map<string, RoomPosition[]>();

/**
 * Represents a path between two Junctions. A Segment will have
 * Pipe units along the entire path (and will request more if they
 * are close to TTL). A Segment will also have a direction, which
 * determines which direction energy flows.
 *
 * The Start and End positions are Junctions. A Segment will always
 * try to push energy to a Junction as part of transferEnergy, but
 * will only pull energy from a Junction when explicitly instructed.
 */
export class Segment {
    constructor(
        public start: RoomPosition,
        public end: RoomPosition
    ) {
        Memory.segments ??= {};
        Memory.segments[this.key] ??= {
            path: "",
            dir: this.direction,
        };
    }

    static fromKey(key: string) {
        const [start, end] = key.split(':');
        return new Segment(RoomPosition.unpack(start), RoomPosition.unpack(end));
    }

    public get memory() {
        return Memory.segments[this.key];
    }

    static Direction = Direction;

    public direction: Direction = Direction.ToEnd;

    public get key(): string {
        return [this.start.pack(), this.end.pack()].sort().join(':');
    }

    public get path(): RoomPosition[] {
        if (pathCache.has(this.key)) {
            return pathCache.get(this.key)!;
        }
        // attempt to reconstitute path from memory
        let path = this.memory.path.match(/.{1,2}/g)?.map(RoomPosition.unpack);
        if (!path) {
            // generate new path with PathFinder
            path = PathFinder.search(this.start, { pos: this.end, range: 1 }, {
                plainCost: 1,
                swampCost: 1,
            }).path;
        }
        pathCache.set(this.key, path);
        this.memory.path = path.map(pos => pos.pack()).join('');
        return path;
    }

    public get creeps(): Creep[] {
        return this.path.flatMap(pos => pos.lookFor(LOOK_CREEPS));
    }

    /**
     * Transfer energy from one creep to another along the segment, in the correct
     * Direction
     */
    public transferEnergy() {
        const creeps = [...this.creeps];
        if (creeps.length < 2) {
            return;
        }
        if (this.direction === Direction.ToStart) creeps.reverse();
        while (creeps.length > 1) {
            const from = creeps.shift();
            const to = creeps[0];
            from?.transfer(to, RESOURCE_ENERGY);
        }
    }


}
