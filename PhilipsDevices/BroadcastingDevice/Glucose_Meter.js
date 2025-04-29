const bleno = require('@abandonware/bleno');
const { PrimaryService, Characteristic, Descriptor } = bleno;

const DEVICE_NAME = 'Accu-Chek';
const SERVICE_UUID = '1808'; // Glucose Service
const CHARACTERISTIC_UUID = '2A18'; // Glucose Measurement
const RACP_UUID = '2A52'; // Record Access Control Point

let notifyCallback = null;

// Encode Glucose Measurement in IEEE-11073 SFLOAT format
function encodeGlucoseMeasurement(glucoseMgDl) {
  const flags = 0x02; // Time offset NOT present, Concentration present
  const sequenceNumber = 1;
  const now = new Date();
  const buffer = Buffer.alloc(14);

  buffer.writeUInt8(flags, 0);
  buffer.writeUInt16LE(sequenceNumber, 1);

  buffer.writeUInt16LE(now.getFullYear(), 3);
  buffer.writeUInt8(now.getMonth() + 1, 5);
  buffer.writeUInt8(now.getDate(), 6);
  buffer.writeUInt8(now.getHours(), 7);
  buffer.writeUInt8(now.getMinutes(), 8);
  buffer.writeUInt8(now.getSeconds(), 9);

  // ✅ Correct: Directly encode mg/dL as SFLOAT without kg/L conversion
  const sfloat = encodeSFloat(glucoseMgDl);
  buffer.writeUInt16LE(sfloat, 10);

  buffer.writeUInt8(0x11, 12); // Type: Capillary Whole Blood (1) + Location: Finger (1)
  buffer.writeUInt8(0x00, 13); // No sensor status annunciation

  return buffer;
}

// Helper to encode IEEE-11073 SFLOAT (16 bits)
function encodeSFloat(value) {
  if (value === 0) return 0;
  let exponent = 0;
  while (value < 2048 && exponent > -8) {
    value *= 10;
    exponent--;
  }
  while (value >= 2048 && exponent < 7) {
    value /= 10;
    exponent++;
  }
  const mantissa = Math.round(value);
  const exp = (exponent < 0) ? (0x10 + exponent) & 0x0F : exponent;
  return (exp << 12) | (mantissa & 0x0FFF);
}

// Glucose Measurement Characteristic
const glucoseMeasurementCharacteristic = new Characteristic({
  uuid: CHARACTERISTIC_UUID,
  properties: ['notify'],
  descriptors: [
    new Descriptor({
      uuid: '2901',
      value: 'Glucose Measurement',
    }),
  ],
  onSubscribe: (maxValueSize, callback) => {
    console.log('Central subscribed for glucose measurement');
    notifyCallback = callback;
    sendGlucoseMeasurement();
  },
  onUnsubscribe: () => {
    console.log('Central unsubscribed from glucose measurement');
    notifyCallback = null;
  }
});

// RACP Characteristic (optional, dummy for now)
const racpCharacteristic = new Characteristic({
  uuid: RACP_UUID,
  properties: ['indicate', 'write'],
  descriptors: [
    new Descriptor({
      uuid: '2901',
      value: 'Record Access Control Point',
    }),
  ],
  onWriteRequest: (data, offset, withoutResponse, callback) => {
    console.log('Received RACP request:', data.toString('hex'));
    callback(Characteristic.RESULT_SUCCESS);
  }
});

// Primary Service
const glucoseService = new PrimaryService({
  uuid: SERVICE_UUID,
  characteristics: [
    glucoseMeasurementCharacteristic,
    racpCharacteristic
  ]
});

// Send one glucose measurement when subscribed
function sendGlucoseMeasurement() {
  if (notifyCallback) {
    const glucoseMgDl = 128; // 🚀 you can change this value dynamically
    const measurement = encodeGlucoseMeasurement(glucoseMgDl);
    console.log('Sending glucose measurement:', measurement.toString('hex'));
    notifyCallback(measurement);
  }
}

// Start BLE
bleno.on('stateChange', (state) => {
  console.log('BLE state changed to:', state);
  if (state === 'poweredOn') {
    bleno.startAdvertising(DEVICE_NAME, [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Advertising started');
    bleno.setServices([glucoseService]);
  } else {
    console.error('Advertising start error:', error);
  }
});
