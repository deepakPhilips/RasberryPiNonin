const bleno = require('@abandonware/bleno');
const Characteristic = bleno.Characteristic;
const Descriptor = bleno.Descriptor;

let interval = null;

function processHeartRateMeasurement(pulse) {
  const pai = Math.floor(Math.random() * 6 + 1);
  const pai2 = Math.floor(Math.random() * 100 + 1);
  const counter = 1;

  if (pulse > 255) {
    const pulseHex = ('0000' + pulse.toString(16)).slice(-4);
    const pulse1 = parseInt(pulseHex.slice(0, 2), 16);
    const pulse2 = parseInt(pulseHex.slice(2, 4), 16);
    return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, pulse1, pulse2];
  }

  return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, 0x00, pulse];
}

function createHeartRateCharacteristic(uuid) {
  return new Characteristic({
    uuid,
    properties: ['indicate', 'notify'],
    descriptors: [new Descriptor({ uuid: '2901', value: 'Heart Rate Measurement' })],

    onSubscribe: (maxValueSize, updateValueCallback) => {
      console.log('✅ Client subscribed to HRM characteristic');

      interval = setInterval(() => {
        const simulatedPulse = Math.floor(Math.random() * 40 + 60); // 60–100 bpm
        const packet = Buffer.from(processHeartRateMeasurement(simulatedPulse));
        console.log('❤️ Sending HRM Packet (hex):', packet.toString('hex'));
        updateValueCallback(packet);
      }, 2000);
    },

    onUnsubscribe: () => {
      console.log('❌ Client unsubscribed from HRM');
      clearInterval(interval);
    }
  });
}

module.exports = {
  createHeartRateCharacteristic
};
