const bleno = require('@abandonware/bleno');
const fs = require('fs');
const program = require('commander').program;

// Configuration data
const config = {
  readingInstructions: "Please be patient while your pulse oximetry is captured. This can take up to 10 seconds.",
  libVersion: 1,
  options: 0,
  broadcastingServiceID: "46A970E0-0D5F-11E2-8B5E-0002A5D5C51B",
  model: "3230",
  readingTimeout: 30,
  broadcastingName: "Nonin3230",
  disabled: false,
  id: 13,
  connectionTimeout: 60,
  type: "Pulse Oximeter",
  pairingInstructions: "Attach the pulse oximeter to your finger.",
  manufacturer: "Nonin",
  characteristicID: "0AAD7EA0-0D60-11E2-8E3C-0002A5D5C51B",
  readingServiceID: "46A970E0-0D5F-11E2-8B5E-0002A5D5C51B",
  peripheralImageURL: "https://assets.validic.com/mobile/peripheral/ble-16.jpg",
  requiresPairing: false,
  instructions: "Attach the pulse oximeter to your finger.",
};

program
  .requiredOption('-s, --saturation <n>', 'Saturation level', parseInt)
  .requiredOption('-p, --pulse <n>', 'Pulse rate', parseInt)
  .parse(process.argv);

const options = program.opts();

const PrimaryService = bleno.PrimaryService;
const Characteristic = bleno.Characteristic;
const Descriptor = bleno.Descriptor;

let intervalId = null;
let timeoutId = null;
let counter = 0;

// Notify Characteristic
const NotifyCharacteristic = new Characteristic({
  uuid: config.characteristicID,
  properties: ['notify'],
  descriptors: [
    new Descriptor({
      uuid: '2901',
      value: 'Measurement Notification',
    }),
  ],
  onSubscribe: (maxValueSize, updateValueCallback) => {
    console.log("Device subscribed to notify characteristic");
    intervalId = setInterval(() => {
      const measBuffer = processMeasurement();
      console.log('Sending measurement:', measBuffer);
      updateValueCallback(Buffer.from(measBuffer));
    }, 1000); // Send data every 1 second
  },
  onUnsubscribe: () => {
    console.log("Device unsubscribed from notify characteristic");
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  },
});

// Write Characteristic
const WriteCharacteristic = new Characteristic({
  uuid: config.characteristicID,
  properties: ['write'],
  descriptors: [
    new Descriptor({
      uuid: '2901',
      value: 'Write Control',
    }),
  ],
  onWriteRequest: (data, offset, withoutResponse, callback) => {
    console.log('Write request received:', data.toString('hex'));
    callback(Characteristic.RESULT_SUCCESS);
  },
});

// Primary Service
const primaryService = new PrimaryService({
  uuid: config.broadcastingServiceID,
  characteristics: [NotifyCharacteristic, WriteCharacteristic],
});

// Handle Bluetooth state changes
bleno.on('stateChange', (state) => {
  console.log(`Bluetooth state changed to: ${state}`);
  if (state === 'poweredOn') {
    console.log(`Broadcasting as ${config.broadcastingName}`);
    bleno.startAdvertising(config.broadcastingName, [config.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

// Handle advertising start
bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Started advertising...');
    bleno.setServices([primaryService]);
  } else {
    console.error('Failed to start advertising:', error);
  }
});

// Handle device connection
bleno.on('accept', (clientAddress) => {
  console.log(`Connected to client: ${clientAddress}`);
  startTimeout();
});

// Handle device disconnection
bleno.on('disconnect', () => {
  console.log("Disconnected");
  if (intervalId) clearInterval(intervalId);
  process.exit(0);
});

// Generate measurement data
function processMeasurement() {
  const pai = Math.floor((Math.random() * 6) + 1);
  const pai2 = Math.floor((Math.random() * 100) + 1);
  counter++;
  if (options.pulse > 256) {
    const pulseHex = '0' + options.pulse.toString(16);
    const pulse1 = parseInt(pulseHex.slice(0, 2), 16);
    const pulse2 = parseInt(pulseHex.slice(2, 4), 16);
    return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, options.saturation, pulse1, pulse2];
  }
  return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, options.saturation, 0x00, options.pulse];
}

// Start timeout for connection
function startTimeout() {
  let timeCounter = 0;
  timeoutId = setInterval(() => {
    timeCounter++;
    if (timeCounter >= config.connectionTimeout) {
      console.log("Connection timeout reached");
      process.exit(1);
    }
  }, 1000);
}