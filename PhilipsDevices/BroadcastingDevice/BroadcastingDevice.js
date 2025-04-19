const bleno = require('@abandonware/bleno');
const program = require('commander').program;
const fs = require('fs');

const { createPrimaryService } = require('./BroadcastingDeviceService');
const {
  createCharacteristic,
  createNotifyCharacteristic,
} = require('./BroadcastingDeviceCharacteristic');
const {
  handleMeasurementSubscribe,
  handleMeasurementUnsubscribe,
} = require('./MeasurementHandlers');
const { loadDeviceConfig } = require('./DeviceConfigLoader');

program
  .requiredOption('--oximeter <n>', 'oximeter', parseInt)
  .option('--saturation <n>', 'saturation', parseInt)
  .option('--pulse <n>', 'pulse', parseInt)
  .option('--temperature <n>', 'temperature', parseFloat);

program.parse(process.argv);
const options = program.opts();

const { oximeter } = options;

// Load config based on --oximeter flag
const deviceConfig = loadDeviceConfig(oximeter);
const DEVICE_TYPE = deviceConfig.type;





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
  console.log('Connected to:', clientAddress);
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
    handleMeasurementSubscribe.bind(null, options, DEVICE_TYPE),
    handleMeasurementUnsubscribe
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
      measurementChar,
    ]),
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
      }),
    ]));
  }

  bleno.setServices(services);
});