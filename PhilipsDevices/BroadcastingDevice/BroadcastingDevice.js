const bleno = require('@abandonware/bleno');
const program = require('commander').program;
const { execSync } = require('child_process');


const { createPrimaryService } = require('./BroadcastingDeviceService');
const {
    createCharacteristic,
    createNotifyCharacteristic,
} = require('./BroadcastingDeviceCharacteristic');
const {
    handleMeasurementSubscribe,
    handleMeasurementUnsubscribe,
    handRequestCallBack
} = require('./MeasurementHandlers');
const { loadDeviceById } = require('./DeviceConfigLoader');

// Parse command-line arguments
program
    .requiredOption('--deviceId <n>', 'deviceId', parseInt)
    .option('--saturation <n>', 'saturation', parseInt)
    .option('--pulse <n>', 'pulse', parseInt)
    .option('--temperature <n>', 'temperature', parseFloat);

program.parse(process.argv);
const options = program.opts();
const { deviceId } = options;

// Load device configuration
const deviceConfig = loadDeviceById(deviceId);
console.log("🚀 ~ deviceConfig:", deviceConfig)
const DEVICE_TYPE = deviceConfig.type;


try {
    console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
    execSync('bash ./set_mac.sh', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to set MAC address:', error.message);
  }

// Handle BLE state changes
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

// Handle client connection
bleno.on('accept', (clientAddress) => {
    console.log('Connected to:', clientAddress);
});

// Handle client disconnection
bleno.on('disconnect', () => {
    console.log('Disconnected');
    process.exit(0);
});

// Handle advertising start
bleno.on('advertisingStart', (error) => {
    if (error) {
        console.error('Advertising error:', error);
        return;
    }

    console.log('Started advertising');

    // Create measurement characteristic
    const measurementChar = createNotifyCharacteristic(
        deviceConfig.characteristicID.toLowerCase().replace(/-/g, ''),
        DEVICE_TYPE === 'Pulse Oximeter' ? 'Measurement' : 'Temperature Measurement',
        handleMeasurementSubscribe.bind(null, options, DEVICE_TYPE),
        handleMeasurementUnsubscribe,
        handRequestCallBack        
    );

    // Define services
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

    // Add thermometer-specific service if applicable
    if (DEVICE_TYPE === 'Thermometer') {
        services.push(
            createPrimaryService('1523', [
                new bleno.Characteristic({
                    uuid: '1524',
                    properties: ['write'],
                    descriptors: [
                        new bleno.Descriptor({
                            uuid: '2901',
                            value: 'Foracare Serial Command',
                        }),
                    ],
                    onWriteRequest: (data, offset, withoutResponse, callback) => {
                        console.log('[Foracare Command] Received:', data.toString('hex'));
                        callback(bleno.Characteristic.RESULT_SUCCESS);
                    },
                }),
            ])
        );
    }

    // Set services
    bleno.setServices(services);
});