const bleno = require('@abandonware/bleno');

// UUIDs
const BLOOD_PRESSURE_SERVICE_UUID = '1810';
const BLOOD_PRESSURE_MEASUREMENT_UUID = '2A35';
const DEVICE_INFORMATION_SERVICE_UUID = '180A';

// === IEEE 11073 SFLOAT encoding (exponent + mantissa) ===
function encodeSfloat(value) {
  let mantissa = Math.round(value);
  let exponent = 0; // x10^0

  // Encode as 16-bit (4-bit exponent, 12-bit mantissa)
  let raw = (exponent << 12) | (mantissa & 0x0FFF);
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(raw, 0);
  return buffer;
}

// === Blood Pressure Measurement Characteristic ===
const bloodPressureCharacteristic = new bleno.Characteristic({
  uuid: BLOOD_PRESSURE_MEASUREMENT_UUID,
  properties: ['notify'],
  value: null,
  onSubscribe: (maxValueSize, updateValueCallback) => {
    console.log('Validic connected — sending blood pressure data');

    bloodPressureCharacteristic._interval = setInterval(() => {
      const systolic = 118;
      const diastolic = 76;
      const map = 90;

      // Flags: 0x00 = mmHg, no timestamp, no pulse, etc.
      const flags = 0x00;

      const measurement = Buffer.concat([
        Buffer.from([flags]),
        encodeSfloat(systolic),
        encodeSfloat(diastolic),
        encodeSfloat(map)
      ]);

      updateValueCallback(measurement);
      console.log('Sent BP reading:', measurement);
    }, 5000);
  },
  onUnsubscribe: () => {
    clearInterval(bloodPressureCharacteristic._interval);
    console.log('Central unsubscribed from BP');
  }
});

const bloodPressureService = new bleno.PrimaryService({
  uuid: BLOOD_PRESSURE_SERVICE_UUID,
  characteristics: [bloodPressureCharacteristic]
});

// === Device Information Service ===
const deviceInformationService = new bleno.PrimaryService({
  uuid: DEVICE_INFORMATION_SERVICE_UUID,
  characteristics: [
    new bleno.Characteristic({
      uuid: '2A29', // Manufacturer Name
      properties: ['read'],
      value: Buffer.from('A&D Medical')
    }),
    new bleno.Characteristic({
      uuid: '2A24', // Model Number
      properties: ['read'],
      value: Buffer.from('UA-651BLE')
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
    console.log('Bluetooth on — advertising as A&D_UA-651BLE');
    bleno.startAdvertising('A&D_UA-651BLE', [BLOOD_PRESSURE_SERVICE_UUID]);
  } else {
    console.log('Bluetooth state:', state);
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Advertising started');
    bleno.setServices([bloodPressureService, deviceInformationService]);
  } else {
    console.error('Failed to start advertising:', error);
  }
});
