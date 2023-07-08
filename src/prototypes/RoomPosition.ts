import { Codec } from "screeps-utf15";

declare global {
    interface RoomPosition {
        pack(): string;
    }
    interface RoomPositionConstructor {
        unpack(str: string): RoomPosition;
    }
}

const depths = [2, 7, 7, 6, 6];
const codec = new Codec({ array: true, depth: depths });

const cardinals = ['WN', 'EN', 'WS', 'ES'];

RoomPosition.prototype.pack = function () {
    // split the room name
    const [_, d1, x, d2, y] = this.roomName.split(/([A-Z])([0-9]+)([A-Z])([0-9]+)/);
    // encode the room position
    return codec.encode([cardinals.indexOf(d1 + d2), parseInt(x), parseInt(y), this.x, this.y])
}

RoomPosition.unpack = function (str: string) {
    // decode the room position
    const [d1d2, x, y, roomX, roomY] = codec.decode(str);
    // join the room name
    const [d1, d2] = cardinals[d1d2].split('');
    const roomName = `${d1}${x}${d2}${y}`;
    // return a new RoomPosition object
    return new RoomPosition(roomX, roomY, roomName);
}
