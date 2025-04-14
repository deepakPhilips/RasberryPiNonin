const bleno = require('@abandonware/bleno');
const util = require('util');
const program = require('commander').program;

program
  .requiredOption('-s, --saturation <n>', 'Saturation level', parseInt)
  .requiredOption('-p, --pulse <n>', 'Pulse rate', parseInt)
  .parse(process.argv);

const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;

// UUIDs for the characteristics
const CHARACTERISTIC_UUID_NOTIFY = '1447af800d6011e288b60002a5d5c51b';
const CHARACTERISTIC_UUID_WRITE = '1447af810d6011e288b60002a5d5c51b';

// Define the Notify Characteristic
const OximeterNotifyCharacteristic = new BlenoCharacteristic({
  uuid: CHARACTERISTIC_UUID_NOTIFY,
  properties: ['indicate'],
  secure: ['indicate'],
});

let notifyInterval = null;

// Add the onSubscribe handler for the Notify Characteristic
OximeterNotifyCharacteristic.onSubscribe = function (maxValueSize, updateValueCallback) {
  console.log("Device subscribed to notify characteristic");

  // Start sending measurement data periodically
  notifyInterval = setInterval(() => {
    const measBuffer = process_meas(); // Generate measurement buffer
    console.log('Sending measurement:', measBuffer);
    updateValueCallback(Buffer.from(measBuffer)); // Send data to the subscribed device
  }, 1000); // Send data every 1 second
};

// Add the onUnsubscribe handler for the Notify Characteristic
OximeterNotifyCharacteristic.onUnsubscribe = function () {
  console.log("Device unsubscribed from notify characteristic");

  // Stop sending data when the device unsubscribes
  if (notifyInterval) {
    clearInterval(notifyInterval);
    notifyInterval = null;
  }
};

// Define the Write Characteristic
const OximeterWriteCharacteristic = new BlenoCharacteristic({
  uuid: CHARACTERISTIC_UUID_WRITE,
  properties: ['write'],
  secure: ['write'],
});

// Add the onWriteRequest handler for the Write Characteristic
OximeterWriteCharacteristic.onWriteRequest = function (data, offset, withoutResponse, callback) {
  console.log('Write request received:', data.toString('hex'));

  // Example: Process the received data
  const receivedValue = data.toString('hex');
  console.log('Processing received value:', receivedValue);

  // Example: Respond to the write request
  callback(this.RESULT_SUCCESS);
};

// Define the Primary Service
const exampleService = new BlenoPrimaryService({
  uuid: '46a970e00d5f11e28b5e0002a5d5c51b',
  characteristics: [OximeterNotifyCharacteristic, OximeterWriteCharacteristic],
});

// Handle Bluetooth state changes
bleno.on('stateChange', (state) => {
  console.log(`Bluetooth state changed to: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('NoninService', [exampleService.uuid]);
  } else {
    bleno.stopAdvertising();
  }
});

// Handle advertising start
bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Started advertising...');
    bleno.setServices([exampleService]);
  } else {
    console.error('Failed to start advertising:', error);
  }
});

// Function to generate the measurement array
function process_meas() {
  const pai = Math.floor(Math.random() * 6 + 1); // Random pulse amplitude index
  const pai2 = Math.floor(Math.random() * 100 + 1); // Random decimal places
  const counter = Math.floor(Math.random() * 256); // Random counter value

  let measurement;
  if (program.pulse > 256) {
    const pulse = '0' + program.pulse.toString(16);
    const pulse1 = parseInt(pulse.slice(0, 2), 16);
    const pulse2 = parseInt(pulse.slice(2, 4), 16); // Convert to two hex bytes
    measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.saturation, pulse1, pulse2];
  } else {
    measurement = [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, program.saturation, 0x00, program.pulse];
  }

  return measurement;
}