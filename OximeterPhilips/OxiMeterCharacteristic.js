var bleno = require('@abandonware/bleno');
var Characteristic = bleno.Characteristic;
var Descriptor = bleno.Descriptor;

function createCharacteristic(uuid, properties, value, descriptorValue) {
    return new Characteristic({
        uuid,
        properties,
        value: Buffer.from(value),
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

function createWriteNotifyCharacteristic(uuid, descriptorValue, onWriteRequest, onSubscribe, onUnsubscribe) {
    return new Characteristic({
        uuid,
        properties: ['write', 'notify'],
        descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
        onWriteRequest,
        onSubscribe,
        onUnsubscribe,
    });
}

module.exports = {
    createCharacteristic,
    createNotifyCharacteristic,
    createWriteNotifyCharacteristic,
};