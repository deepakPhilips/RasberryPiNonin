const bleno = require('@abandonware/bleno');
const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;

const DEVICE_NAME = "Samico BP";
const SERVICE_UUID = "fff0";
const CHARACTERISTIC_UUID = "fff4";

let systolic = 120;
let diastolic = 80;
let pulseRate = 72;

// Custom characteristic to simulate blood pressure measurement
const BloodPressureCharacteristic = function () {
  BloodPressureCharacteristic.super_.call(this, {
    uuid: CHARACTERISTIC_UUID,
    properties: ['indicate'],
    value: null,
    descriptors: [
      new bleno.Descriptor({
        uuid: '2901',
        value: 'Blood Pressure Measurement'
      })
    ]
  });
};

require('util').inherits(BloodPressureCharacteristic, BlenoCharacteristic);

BloodPressureCharacteristic.prototype.onSubscribe = function (maxValueSize, updateValueCallback) {
  console.log('Central subscribed to blood pressure indication');

  const buffer = Buffer.alloc(7);
  buffer.writeUInt8(0x06, 0); // Flags (unit in mmHg, timestamp not present, pulse rate present)
  buffer.writeUInt16LE(systolic * 10, 1); // Systolic
  buffer.writeUInt16LE(diastolic * 10, 3); // Diastolic
  buffer.writeUInt8(pulseRate, 5); // Pulse rate
  buffer.writeUInt8(0, 6); // User ID / Reserved

  console.log(`Sending BP reading: ${systolic}/${diastolic}, Pulse: ${pulseRate}`);
  updateValueCallback(buffer);
};

const bpService = new BlenoPrimaryService({
  uuid: SERVICE_UUID,
  characteristics: [
    new BloodPressureCharacteristic()
  ]
});

bleno.on('stateChange', (state) => {
  console.log(`bleno stateChange: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising(DEVICE_NAME, [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  console.log('Advertising start:', error ? `error ${error}` : 'success');
  if (!error) {
    bleno.setServices([bpService]);
  }
});

bleno.on('accept', (clientAddress) => {
  console.log(`Accepted connection from: ${clientAddress}`);
});

bleno.on('disconnect', (clientAddress) => {
  console.log(`Disconnected from: ${clientAddress}`);
});