const bleno = require('@abandonware/bleno');

// === Constants ===
const NONIN_SERVICE_UUID = '46A970E0-0D5F-11E2-8B5E-0002A5D5C51B';
const NONIN_MEASUREMENT_UUID = '46A970E1-0D5F-11E2-8B5E-0002A5D5C51B'; // mock characteristic

// === Pulse Oximeter Data Simulation ===
function createPulseOximeterPacket() {
  const buffer = Buffer.alloc(4);
  const flags = 0x00;

  const spo2 = 98;        // % SpO2
  const pulseRate = 72;   // BPM

  buffer.writeUInt8(flags, 0);
  buffer.writeUInt8(spo2, 1);
  buffer.writeUInt16LE(pulseRate, 2); // 2-byte pulse rate (little endian)

  return buffer;
}

// === Characteristic ===
const measurementCharacteristic = new bleno.Characteristic({
  uuid: NONIN_MEASUREMENT_UUID,
  properties: ['notify'],
  value: null,
  onSubscribe: (maxSize, updateValueCallback) => {
    console.log('Central subscribed to Nonin data');

    measurementCharacteristic._interval = setInterval(() => {
      const packet = createPulseOximeterPacket();
      console.log('Sending pulse oximeter data:', packet);
      updateValueCallback(packet);
    }, 5000);
  },
  onUnsubscribe: () => {
    console.log('Central unsubscribed');
    clearInterval(measurementCharacteristic._interval);
  }
});

const noninService = new bleno.PrimaryService({
  uuid: NONIN_SERVICE_UUID,
  characteristics: [measurementCharacteristic]
const bleno = require('@abandonware/bleno');

// === Constants ===
const NONIN_SERVICE_UUID = '46A970E0-0D5F-11E2-8B5E-0002A5D5C51B';
const NONIN_MEASUREMENT_UUID = '46A970E1-0D5F-11E2-8B5E-0002A5D5C51B'; // mock characteristic

// === Pulse Oximeter Data Simulation ===
function createPulseOximeterPacket() {
  const buffer = Buffer.alloc(4);
  const flags = 0x00;

  const spo2 = 98;        // % SpO2
  const pulseRate = 72;   // BPM

  buffer.writeUInt8(flags, 0);
  buffer.writeUInt8(spo2, 1);
  buffer.writeUInt16LE(pulseRate, 2); // 2-byte pulse rate (little endian)

  return buffer;
}

// === Characteristic ===
const measurementCharacteristic = new bleno.Characteristic({
  uuid: NONIN_MEASUREMENT_UUID,
  properties: ['notify'],
  value: null,
  onSubscribe: (maxSize, updateValueCallback) => {
    console.log('Central subscribed to Nonin data');

    measurementCharacteristic._interval = setInterval(() => {
      const packet = createPulseOximeterPacket();
      console.log('Sending pulse oximeter data:', packet);
      updateValueCallback(packet);
    }, 5000);
  },
  onUnsubscribe: () => {
    console.log('Central unsubscribed');
    clearInterval(measurementCharacteristic._interval);
  }
});

const noninService = new bleno.PrimaryService({
  uuid: NONIN_SERVICE_UUID,
  characteristics: [measurementCharacteristic]
});

// === Device Information Service ===
const deviceInfoService = new bleno.PrimaryService({
  uuid: '180A',
  characteristics: [
    new bleno.Characteristic({
      uuid: '2A29', // Manufacturer Name
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

// === BLE Setup ===
bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('Bluetooth on — advertising as Nonin3230');
    bleno.startAdvertising('Nonin3230', [NONIN_SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
    console.log('Bluetooth off or unavailable');
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Advertising started');
    bleno.setServices([noninService, deviceInfoService]);
  } else {
    console.error('Advertising error:', error);
  }
});
});

// === Device Information Service ===
const deviceInfoService = new bleno.PrimaryService({
  uuid: '180A',
  characteristics: [
    new bleno.Characteristic({
      uuid: '2A29', // Manufacturer Name
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

// === BLE Setup ===
bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('Bluetooth on — advertising as Nonin3230');
    bleno.startAdvertising('Nonin3230', [NONIN_SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
    console.log('Bluetooth off or unavailable');
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Advertising started');
    bleno.setServices([noninService, deviceInfoService]);
  } else {
    console.error('Advertising error:', error);
  }
});
