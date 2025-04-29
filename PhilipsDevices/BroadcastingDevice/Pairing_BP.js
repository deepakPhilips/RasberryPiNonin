const bleno = require('@abandonware/bleno');
const { execSync, exec } = require('child_process');
const program = require('commander').program;
const { loadDeviceById } = require('./DeviceConfigLoader');
const { deviceInfoService, commandService, disconnectFromCentral, DateTimeCharacteristic } = require('./Pairing_CommonServices');
const { registerAgent, set_mac } = require('./Pairinig_Registration');
set_mac()


program
  .requiredOption('--deviceId <n>', 'device ID', parseInt)
  .option('--systolic <n>', 'Systolic pressure', parseInt)
  .option('--diastolic <n>', 'Diastolic pressure', parseInt)
  .option('--pulse <n>', 'Pulse rate', parseInt);

program.parse(process.argv);
const options = program.opts();
const deviceConfig = loadDeviceById(options.deviceId);

if (isNaN(options.systolic) || isNaN(options.diastolic) || isNaN(options.pulse)) {
  console.error("❌ Please provide --systolic, --diastolic, and --pulse values.");
  process.exit(1);
}

let updateValueCallback = null;


class BloodPressureCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: deviceConfig.characteristicID,
      properties: ['notify'],
    });
  }

  onSubscribe(maxValueSize, callback) {
    updateValueCallback = callback;
    console.log('Subscribed to BP notify');
    setTimeout(sendDynamicBPMeasurement, 2000);
  }

  onUnsubscribe() {
    console.log('Unsubscribed');
    updateValueCallback = null;
  }
}


const BPService = new bleno.PrimaryService({
  uuid: deviceConfig.broadcastingServiceID,
  characteristics: [
    new BloodPressureCharacteristic(),
    new DateTimeCharacteristic(),
  ],
});



bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    bleno.startAdvertising(deviceConfig.broadcastingName, [deviceConfig.broadcastingServiceID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('✅ Advertising started');
    bleno.setServices([deviceInfoService(deviceConfig), BPService, commandService]);
  } else {
    console.error('❌ Advertising error:', error);
  }
});


function encodeBPMeasurement(systolic, diastolic, pulse) {
  const flags = 0x1E; // All present: units mmHg, timestamp, pulse rate
  const now = new Date();
  const buffer = Buffer.alloc(19);

  buffer.writeUInt8(flags, 0);
  buffer.writeUInt16LE(systolic , 1);
  buffer.writeUInt16LE(diastolic , 3);
  buffer.writeUInt16LE(diastolic , 5); // MAP (mean arterial pressure) = same as diastolic for now
  buffer.writeUInt16LE(now.getFullYear(), 7);
  buffer.writeUInt8(now.getMonth() + 1, 9);
  buffer.writeUInt8(now.getDate(), 10);
  buffer.writeUInt8(now.getHours(), 11);
  buffer.writeUInt8(now.getMinutes(), 12);
  buffer.writeUInt8(now.getSeconds(), 13);
  buffer.writeUInt16LE(pulse , 14);
  buffer.writeUInt8(1, 16); // User ID
  buffer.writeUInt8(0, 17); // Measurement Status
  return buffer;
}

function sendDynamicBPMeasurement() {
  const buffer = encodeBPMeasurement(options.systolic, options.diastolic, options.pulse);

  if (typeof updateValueCallback === 'function') {
    updateValueCallback(buffer);
    console.log(`📤 Sent BP: ${options.systolic}/${options.diastolic} mmHg, Pulse: ${options.pulse} bpm`);
    setTimeout(() => {
      disconnectFromCentral();
    }, 1000);
  } else {
    console.warn('⚠️ No subscriber to send BP to');
  }
}

registerAgent().catch(console.error);