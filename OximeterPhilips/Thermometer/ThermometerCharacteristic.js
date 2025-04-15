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

function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe) {
    return new Characteristic({
        uuid,
        properties: ['notify'],
        descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
        onSubscribe,
        onUnsubscribe,
    });
}

module.exports = {
    createCharacteristic,
    createNotifyCharacteristic,
};