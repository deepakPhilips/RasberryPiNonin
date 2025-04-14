const bleno = require('@abandonware/bleno');

// === Constants ===
const NONIN_SERVICE_UUID = '46A970E0-0D5F-11E2-8B5E-0002A5D5C51B';
const NONIN_CHARACTERISTIC_UUID = '0AAD7EA0-0D60-11E2-8E3C-0002A5D5C51B'; // Validic expects this

// === Simulated Pulse Oximeter Packet ===
function createNoninPacket() {
  const buffer = Buffer.alloc(4);
  const flags = 0x00;         // Reserved / Status
  const spo2 = 98;            // SpO₂ %
  const pulseRate = 72;       // BPM

  buffer.writeUInt8(flags, 0);
  buffer.writeUInt8(spo2, 1);
  buffer.writeUInt16LE(pulseRate, 2); // 2 bytes, little-endian

  return buffer;
}

// === BLE Characteristic ===
const measurementCharacteristic = new bleno.Characteristic({
  uuid: NONIN_CHARACTERISTIC_UUID,
  properties: ['notify'],
  onSubscribe: (maxValueSize, updateValueCallback) => {
    console.log('Validic app subscribed.');

    measurementCharacteristic._interval = setInterval(() => {
      const data = createNoninPacket();
      console.log('Sending packet:', data.toString('hex'));
      updateValueCallback(data);
    }, 5000); // Send every 5 seconds
  },
  onUnsubscribe: () => {
    console.log('Unsubscribed.');
    clearInterval(measurementCharacteristic._interval);
  }
});

const noninService = new bleno.PrimaryService({
  uuid: NONIN_SERVICE_UUID,
  characteristics: [measurementCharacteristic]
});

// === Device Info Service (optional but realistic) ===
const deviceInfoService = new bleno.PrimaryService({
  uuid: '180A',
  characteristics: [
    new bleno.Characteristic({
      uuid: '2A29', // Manufacturer
      properties: ['read'],
      value: Buffer.from('Nonin Medical Inc.')
    }),
    new bleno.Characteristic({
      uuid: '2A24', // Model Number
      properties: ['read'],
      value: Buffer.from('3230')
    }),
    new bleno.Characteristic({
      uuid: '2A26', // Firmware Revision
      properties: ['read'],
      value: Buffer.from('1.0.0')
    })
  ]
});

// === BLE Lifecycle ===
bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('BLE powered on, advertising as Nonin3230...');
    bleno.startAdvertising('Nonin3230', [NONIN_SERVICE_UUID]);
  } else {
    console.log('BLE not powered — stopping advertising.');
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (err) => {
  if (!err) {
    console.log('Advertising started.');
    bleno.setServices([noninService, deviceInfoService]);
  } else {
    console.error('Advertising error:', err);
  }
});
