// Unified BLE Peripheral Simulator (Thermometer + Oximeter)
const bleno = require('@abandonware/bleno');
const fs = require('fs');
const program = require('commander').program;


const { createPrimaryService } = require('./BroadcastingDeviceService');
const {
  createCharacteristic,
  createNotifyCharacteristic,
} = require('./BroadcastingDeviceCharacteristic');

program
    .requiredOption('--oximeter <n>', 'oximeter',parseInt)
    .option('--saturation <n>', 'saturation', parseInt)
    .option('--pulse <n>', 'pulse', parseInt)
    .option('--temperature <n>', 'temperature', parseFloat)


    const { oximeter } = options;
    
// Load config based on --oximeter flag
const configPath = oximeter
  ? './OximeterDeviceConfig.json'
  : './ThermometerDeviceConfig.json';

const deviceConfig = require(configPath);
const DEVICE_TYPE = deviceConfig.type;

// CLI option parsing
if (DEVICE_TYPE === 'Pulse Oximeter') {
  program
    .requiredOption('-s, --saturation <n>', 'saturation', parseInt)
    .requiredOption('-p, --pulse <n>', 'pulse', parseInt);
} else {
  program
    .requiredOption('-t, --temperature <n>', 'temperature', parseFloat);
}

program.parse(process.argv);
const options = program.opts();

bleno.on('stateChange', (state) => {
  console.log(`GATT ${DEVICE_TYPE.toLowerCase()} server running`);
  if (state === 'poweredOn') {
    bleno.startAdvertising(deviceConfig.broadcastingName, [
      '180A',
      deviceConfig.broadcastingServiceID.toLowerCase().replace(/-/g, ''),
    ]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('accept', (clientAddress) => {
  console.log('connected to:', clientAddress);
});

bleno.on('disconnect', () => {
  console.log('Disconnected');
  process.exit(0);
});

bleno.on('advertisingStart', (error) => {
  if (error) {
    console.error('Advertising error:', error);
    return;
  }
  console.log('Started advertising');

  const measurementChar = createNotifyCharacteristic(
    deviceConfig.characteristicID.toLowerCase().replace(/-/g, ''),
    DEVICE_TYPE === 'Pulse Oximeter' ? 'Measurement' : 'Temperature Measurement',
    handleMeasurementSubscribe,
    handleMeasurementUnsubscribe,
    getTemperatureValue // used only for thermometer
  );

  const services = [
    createPrimaryService('180A', [
      createCharacteristic('2A29', ['read'], deviceConfig.manufacturer, 'Manufacturer Name'),
      createCharacteristic('2A24', ['read'], deviceConfig.model, 'Model'),
      createCharacteristic('2A25', ['read'], 'sim_serial', 'Serial'),
      createCharacteristic('2A28', ['read'], '1.0.0', 'Software Revision'),
      createCharacteristic('2A26', ['read'], '1.0.0', 'Firmware Revision'),
    ]),
    createPrimaryService(deviceConfig.readingServiceID.toLowerCase().replace(/-/g, ''), [
      measurementChar
    ])
  ];

  if (DEVICE_TYPE === 'Thermometer') {
    services.push(createPrimaryService('1523', [
      new bleno.Characteristic({
        uuid: '1524',
        properties: ['write'],
        descriptors: [new bleno.Descriptor({ uuid: '2901', value: 'Foracare Serial Command' })],
        onWriteRequest: (data, offset, withoutResponse, callback) => {
          console.log('[Foracare Command] Received:', data.toString('hex'));
          callback(bleno.Characteristic.RESULT_SUCCESS);
        },
      })
    ]));
  }

  bleno.setServices(services);
});

function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
  console.log('Device subscribed, sending measurement...');

  if (DEVICE_TYPE === 'Pulse Oximeter') {
    const { saturation, pulse } = options;
    if (saturation <= 0 || saturation > 100 || pulse <= 0 || pulse > 321) {
      console.error('Invalid measurement values');
      process.exit(2);
    }
    const buf = Buffer.from(processOximeterMeasurement(saturation, pulse));
    console.log('Sending measurement:', buf.toString('hex'));
    updateValueCallback(buf);
  } else {
    const temp = options.temperature;
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 2) {
        clearInterval(interval);
        console.log('All temperature measurements sent');
        return;
      }
      const buffer = getTemperatureValue(temp + count);
      console.log('Sending:', buffer.toString('hex'));
      updateValueCallback(buffer);
      count++;
    }, 1500);
  }
}

function handleMeasurementUnsubscribe() {
  console.log('Measurement unsubscribed');
  process.exit(3);
}

function processOximeterMeasurement(saturation, pulse) {
  const pai = Math.floor((Math.random() * 6) + 1);
  const pai2 = Math.floor((Math.random() * 100) + 1);
  const counter = 1;

  if (pulse > 256) {
    const pulseHex = ('0000' + pulse.toString(16)).slice(-4);
    const pulse1 = parseInt(pulseHex.slice(0, 2), 16);
    const pulse2 = parseInt(pulseHex.slice(2, 4), 16);
    return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, saturation, pulse1, pulse2];
  }
  return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, saturation, 0x00, pulse];
}

function getTemperatureValue(tempCelsius) {
  const flags = 0x00;
  const exponent = -2;
  const mantissa = Math.round(tempCelsius * 100);
  const buffer = Buffer.alloc(5);
  buffer.writeUInt8(flags, 0);
  buffer.writeIntLE(mantissa, 1, 3);
  buffer.writeInt8(exponent, 4);
  return buffer;
}
