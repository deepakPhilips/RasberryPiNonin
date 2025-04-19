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
  const props = ['read','notify'];
  const handlers = {
    uuid,
    properties: props,
    descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
    onSubscribe,
    onUnsubscribe,
  };

  handlers.onReadRequest = (offset, callback) => {
    const buffer = onReadCallback();
    console.log('[onReadRequest] Responding with:', buffer);
    callback(Characteristic.RESULT_SUCCESS, buffer);
  };
  if (onReadCallback) {
    props.push('indicate');
    handlers.properties = props;
    
  } else {
    props.push('read');
    handlers.properties = props;
  }

  return new Characteristic(handlers);
}

module.exports = {
  createCharacteristic,
  createNotifyCharacteristic,
};
