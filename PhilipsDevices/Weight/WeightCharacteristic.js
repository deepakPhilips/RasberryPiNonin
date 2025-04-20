const bleno = require('@abandonware/bleno');
const Descriptor = bleno.Descriptor;
const Characteristic = bleno.Characteristic;

function sfloatFromNumber(value) {
  let exponent = 0;
  let mantissa = Math.round(value * 10); // scale for 1 decimal

  while (mantissa > 2047) {
    mantissa = Math.round(mantissa / 10);
    exponent++;
  }

  if (mantissa < 0) {
    mantissa = (1 << 12) + mantissa;
  }

  const sfloat = (exponent << 12) | (mantissa & 0x0FFF);
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(sfloat, 0);
  return buffer;
}

function createWeightCharacteristic(uuid, weightValue = 72.5) {
  return new Characteristic({
    uuid,
    properties: ['indicate'],
    descriptors: [new Descriptor({ uuid: '2901', value: 'Weight Measurement' })],

    onSubscribe: (maxValueSize, updateValueCallback) => {
      console.log('✅ Validic subscribed — sending weight');

      const flags = 0x00; // no timestamp, no user ID, no BMI
      const weight = sfloatFromNumber(weightValue);

      const packet = Buffer.concat([Buffer.from([flags]), weight]);
      console.log('⚖️ Sending weight packet (hex):', packet.toString('hex'));

      setTimeout(() => {
        updateValueCallback(packet);
      }, 1000); // small delay to mimic real-world behavior
    },

    onUnsubscribe: () => {
      console.log('❌ Validic unsubscribed from weight');
    }
  });
}

module.exports = {
  createWeightCharacteristic
};
