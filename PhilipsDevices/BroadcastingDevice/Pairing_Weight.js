const bleno = require('@abandonware/bleno');
const { execSync, exec } = require('child_process');
const program = require('commander').program;
const { loadDeviceById } = require('./DeviceConfigLoader');
const { deviceInfoService, commandService, disconnectFromCentral, DateTimeCharacteristic } = require('./Pairing_CommonServices');
const { registerAgent, set_mac } = require('./Pairinig_Registration');
set_mac()


program
    .requiredOption('--deviceId <n>', 'device ID', parseInt)
    .option('--weight <n>', 'weight', parseFloat);

program.parse(process.argv);
const options = program.opts(); 
const deviceConfig = loadDeviceById(options.deviceId);

if (typeof options.weight !== 'number' || isNaN(options.weight)) {
  console.error("❌ Invalid or missing --weight. Please provide a valid number (e.g. --weight 78.5)");
  process.exit(1);
}
let updateValueCallback = null;

class WeightCharacteristic extends bleno.Characteristic {
  constructor() {
    super({
      uuid: deviceConfig.characteristicID,
      properties: ['notify'],
    });
  }

  onSubscribe(maxValueSize, callback) {
    updateValueCallback = callback;
    console.log('Subscribed to weight notify');
    setTimeout(sendDynamicWeight, 2000);

  }

  onUnsubscribe() {
    console.log('Unsubscribed');
    updateValueCallback = null;
  }
}

const weightService = new bleno.PrimaryService({
  uuid: deviceConfig.broadcastingServiceID,
  characteristics: [
    new WeightCharacteristic(),
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
    bleno.setServices([deviceInfoService(deviceConfig), weightService, commandService]);
  } else {
    console.error('❌ Advertising error:', error);
  }
});


function encodeMeasurement(weightKg) {
    const flags = 0x02;
    const weightHg = Math.round(weightKg * 10); // kg → hectograms (2 decimal precision)
    const now = new Date();
  
    const buffer = Buffer.alloc(10);
    buffer.writeUInt8(flags, 0);
    buffer.writeUInt16LE(weightHg, 1); // 2 bytes for weight
    buffer.writeUInt16LE(now.getFullYear(), 3);
    buffer.writeUInt8(now.getMonth() + 1, 5); // Month is 0-indexed
    buffer.writeUInt8(now.getDate(), 6);
    buffer.writeUInt8(now.getHours(), 7);
    buffer.writeUInt8(now.getMinutes(), 8);
    buffer.writeUInt8(now.getSeconds(), 9);
  
    return buffer;
  }
  
  function sendDynamicWeight() {
    const buffer = encodeMeasurement(options.weight);
  
    if (typeof updateValueCallback === 'function') {
      updateValueCallback(buffer);
      console.log(`📤 Sent dynamic weight: ${options.weight.toFixed(1)} kg`);
      setTimeout(() => {
        disconnectFromCentral();
      }, 1000);
    } else {
      console.warn('⚠️ No subscriber to send weight to');
    }
  }


  registerAgent().catch(console.error);