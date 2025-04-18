const bleno = require('@abandonware/bleno');
const Characteristic = bleno.Characteristic;
const Descriptor = bleno.Descriptor;

function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe) {
    return new Characteristic({
      uuid,
      properties: ['indicate', 'notify'], // <-- add indicate
      descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
      onSubscribe,
      onUnsubscribe,
    });
  }

module.exports = {
  createNotifyCharacteristic,
};
