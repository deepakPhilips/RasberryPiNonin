var bleno = require('@abandonware/bleno');
var Characteristic = bleno.Characteristic;
var Descriptor = bleno.Descriptor;

function createCharacteristic(uuid, properties, value, descriptorValue) {
    return new Characteristic({
        uuid,
        properties,
        value: Buffer.from(String(value), 'utf-8'),
        descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
    });
}

function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe, getTempCallback) {
    return new Characteristic({
        uuid,
        properties: ['read', 'notify'],
        descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
        onSubscribe,
        onUnsubscribe,
        onReadRequest: (offset, callback) => {
            const buffer = ieee11073Float(getTempCallback());
            console.log('[onReadRequest] Responding with:', buffer);
            callback(Characteristic.RESULT_SUCCESS, buffer);
        },
    });
}

function ieee11073Float(tempCelsius) {
    const flags = 0x00; // Celsius, no timestamp
    const exponent = 0xFE; // -2 (means divide by 100)
    const mantissa = Math.round(tempCelsius * 100);
    const ieee = (exponent << 24) | (mantissa & 0x00FFFFFF);

    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(flags, 0);
    buffer.writeInt32LE(ieee, 1);
    return buffer;
}

module.exports = {
    createCharacteristic,
    createNotifyCharacteristic,
};
