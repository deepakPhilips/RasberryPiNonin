// Unified Characteristic Helpers
const bleno = require('@abandonware/bleno');
const Characteristic = bleno.Characteristic;
const Descriptor = bleno.Descriptor;

function createCharacteristic(uuid, properties, value, descriptorValue) {
  return new Characteristic({
    uuid,
    properties,
    value: Buffer.from(String(value), 'utf-8'),
    descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
  });
}

function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe, onReadCallback = null) {
  const props = ['notify'];
  const handlers = {
    uuid,
    properties: props,
    descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
    onSubscribe,
    onUnsubscribe,
  };

  if (onReadCallback) {
    props.push('indicate');
    handlers.properties = props;
    handlers.onReadRequest = (offset, callback) => {
      try {
        const buffer = onReadCallback();
        console.log('[onReadRequest] Responding with:', buffer);
        callback(Characteristic.RESULT_SUCCESS, buffer);
      } catch (error) {
        console.error('[onReadRequest] Error:', error);
        callback(Characteristic.RESULT_UNLIKELY_ERROR);
      }
    };
  }

  return new Characteristic(handlers);
}

module.exports = {
  createCharacteristic,
  createNotifyCharacteristic,
};
