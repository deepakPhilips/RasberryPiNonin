const bleno = require('@abandonware/bleno');
const program = require('commander').program;
const deviceConfig = require('./BloodPressureDeviceConfig.json');
const { createPrimaryService } = require('./BloodPressureService');
const { createNotifyCharacteristic } = require('./BloodPressureCharacteristic');
const deviceInfoService = require('./DeviceInfoService');

let counter = 0;

program
  .requiredOption('--sys <n>', 'Systolic pressure', parseInt)
  .requiredOption('--dia <n>', 'Diastolic pressure', parseInt)
  .requiredOption('--pulse <n>', 'Pulse rate', parseInt)
  .parse(process.argv);

const options = program.opts();

bleno.on('stateChange', (state) => {
  console.log('BLE Blood Pressure Monitor - state change:', state);
  if (state === 'poweredOn') {
    bleno.startAdvertising(deviceConfig.broadcastingName, [deviceConfig.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (error) {
    console.error('Advertising start error:', error);
    return;
  }

  console.log('Started advertising...');
  bleno.setServices([
    createPrimaryService(deviceConfig.readingServiceID, [
      createNotifyCharacteristic(
        deviceConfig.characteristicID,
        'Blood Pressure Measurement',
        handleMeasurementSubscribe,
        handleMeasurementUnsubscribe
      )
    ]),
    deviceInfoService
  ]);
});

bleno.on('accept', (addr) => {
  console.log(`Accepted connection from ${addr}`);
});

bleno.on('disconnect', () => {
  console.log('Disconnected from client');
  process.exit(0);
});

function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
  console.log('Client subscribed – sending measurement');
  const buffer = Buffer.from(buildBloodPressurePacket());
  console.log('Buffer:', buffer);
  console.log('Hex:', buffer.toString('hex'));
  updateValueCallback(buffer);
}

function handleMeasurementUnsubscribe() {
  console.log('Client unsubscribed from measurement');
  process.exit(0);
}

// Builds the simulated blood pressure packet based on 2A35 spec
function buildBloodPressurePacket() {
  counter++;
  const flags = 0b00000000; // No timestamp, no pulse in kPa
  const buffer = Buffer.alloc(13);

  buffer.writeUInt8(flags, 0);
  buffer.writeUInt16LE(options.sys, 1);   // Systolic
  buffer.writeUInt16LE(options.dia, 3);   // Diastolic
  buffer.writeUInt16LE(Math.round((options.sys + options.dia) / 2), 5); // MAP (mean)
  buffer.writeUInt8(0, 7); // No timestamp
  buffer.writeUInt16LE(options.pulse, 8); // Pulse rate
  buffer.writeUInt8(counter % 256, 10);   // User ID / sequence
  buffer.writeUInt8(0, 11); // Measurement status (optional)
  buffer.writeUInt8(0, 12);

  return buffer;
}
