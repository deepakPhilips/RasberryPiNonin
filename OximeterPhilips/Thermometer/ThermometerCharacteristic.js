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
        properties: ['indicate', 'notify'],
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
    const flags = 0x00; // Celsius, no timestamp, etc.
    const exponent = -2; // i.e., 0xFE (because we're scaling by 100)
    const mantissa = Math.round(tempCelsius * 100); // scale temp

    // Create the 32-bit value: combine signed mantissa and exponent
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(flags, 0);

    // Write mantissa and exponent as per IEEE-11073 FLOAT format (little endian)
    // Mantissa = 3 bytes signed, exponent = 1 byte signed
    buffer.writeIntLE(mantissa + (exponent << 24), 1, 4);

    return buffer;
}


module.exports = {
    createCharacteristic,
    createNotifyCharacteristic,
};