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
    .option('--pulse <n>', 'pulse', parseInt)
    .option('--weight <n>', 'weight', parseFloat);

program.parse(process.argv);
const options = program.opts();
const { deviceId } = options;

// Load device configuration
const deviceConfig = loadDeviceById(deviceId);
console.log("🚀 ~ deviceConfig:", deviceConfig)
const DEVICE_TYPE = deviceConfig.type;

// Optional CLI validations
if (DEVICE_TYPE === 'Heart Rate Monitor' && !options.pulse) {
    console.error("❌ Please provide --pulse for Heart Rate Monitor simulation.");
    process.exit(1);
}
if (DEVICE_TYPE === 'Pulse Oximeter' && (!options.pulse || !options.saturation)) {
    console.error("❌ Please provide --pulse and --saturation for Pulse Oximeter simulation.");
    process.exit(1);
}
if (DEVICE_TYPE === 'Thermometer' && !options.temperature) {
    console.error("❌ Please provide --temperature for Thermometer simulation.");
    process.exit(1);
}

if (DEVICE_TYPE === 'Weight Scale' && !options.weight) {
    console.error("❌ Please provide --weight for Weight Scale simulation.");
    process.exit(1);
}

// Set MAC address before advertising
try {
    console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
    execSync('bash ./set_mac.sh', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to set MAC address:', error.message);
}

// BLE stack: on poweredOn, start advertising
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

// BLE: Client connected
bleno.on('accept', (clientAddress) => {
    console.log('Connected to:', clientAddress);
});

// BLE: Client disconnected
bleno.on('disconnect', () => {
    console.log('Disconnected');
    process.exit(0);
});

// BLE: Advertising started
bleno.on('advertisingStart', (error) => {
    if (error) {
        console.error('Advertising error:', error);
        return;
    }

    console.log('Started advertising');

    // Descriptor label for measurement characteristic
    const descriptorLabel = {
        'Thermometer': 'Temperature Measurement',
        'Pulse Oximeter': 'Oxygen Saturation Measurement',
        'Heart Rate Monitor': 'Heart Rate Measurement',
        'Weight Scale': 'Weight Measurement',
    }[DEVICE_TYPE] || 'Measurement';

    // Create main measurement characteristic
    const measurementChar = createNotifyCharacteristic(
        deviceConfig.characteristicID.toLowerCase().replace(/-/g, ''),
        descriptorLabel,
        handleMeasurementSubscribe.bind(null, options, DEVICE_TYPE),
        handleMeasurementUnsubscribe,
        handRequestCallBack
    );

    // Core services (Device Info + Measurement)
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

    // Thermometer-specific write characteristic (Foracare serial command)
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

    bleno.setServices(services);
});
