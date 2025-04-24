const bleno = require('@abandonware/bleno');
const program = require('commander').program;
const { execSync } = require('child_process');
const readline = require('readline');
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

program
    .option('--deviceId <n>', 'deviceId', parseInt)
    .option('--saturation <n>', 'saturation', parseInt)
    .option('--pulse <n>', 'pulse', parseInt)
    .option('--weight <n>', 'weight', parseFloat)
    .option('--temperature <n>', 'temperature', parseFloat)
    .option('--systolic <n>', 'systolic', parseFloat)
    .option('--diastolic <n>', 'diastolic', parseFloat)
    .option('--map <n>', 'mean arterial pressure', parseFloat);

program.parse(process.argv);
let options = program.opts();

async function promptIfNeeded() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const ask = (q) => new Promise((res) => rl.question(q, res));

    if (!options.deviceId) {
        options.deviceId = parseInt(await ask('Enter Device ID: '));
    }

    const deviceConfig = loadDeviceById(options.deviceId);
    const DEVICE_TYPE = deviceConfig.type;

    if (DEVICE_TYPE === 'Thermometer' && !options.temperature) {
        options.temperature = parseFloat(await ask('Enter Temperature: '));
    }

    if (DEVICE_TYPE === 'Pulse Oximeter' && (!options.pulse || !options.saturation)) {
        options.pulse = parseInt(await ask('Enter Pulse: '));
        options.saturation = parseInt(await ask('Enter Saturation: '));
    }

    if (DEVICE_TYPE === 'Weight Scale' && !options.weight) {
        options.weight = parseFloat(await ask('Enter Weight: '));
    }

    if (DEVICE_TYPE === 'Blood Pressure Monitor' && (!options.systolic || !options.diastolic)) {
        options.systolic = parseFloat(await ask('Enter Systolic: '));
        options.diastolic = parseFloat(await ask('Enter Diastolic: '));
    }

    rl.close();
    return { deviceConfig, DEVICE_TYPE };
}

(async () => {
    const { deviceConfig, DEVICE_TYPE } = await promptIfNeeded();

    console.log("🚀 ~ deviceConfig:", deviceConfig);

    // Launch everything
    if (deviceConfig.requiresPairing) {
        registerAgent().catch(console.error);
    }

    try {
        console.log('🛠️  Running set_mac.sh to update Bluetooth MAC...');
        execSync('bash ./set_mac.sh', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Failed to set MAC address:', error.message);
    }

    bleno.on('stateChange', (state) => {
        console.log(`GATT ${DEVICE_TYPE.toLowerCase()} server running`);
        if (state === 'poweredOn') {
            console.log("🚀 ~ bleno.on ~ deviceConfig.broadcastingName:", deviceConfig.broadcastingName);
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

        const descriptorLabel = {
            'Thermometer': 'Temperature Measurement',
            'Pulse Oximeter': 'Oxygen Saturation Measurement',
            'Weight Scale': 'Weight Measurement',
            'Blood Pressure Monitor': 'Blood Pressure Measurement',
        }[DEVICE_TYPE] || 'Measurement';

        const measurementChar = createNotifyCharacteristic(
            deviceConfig.characteristicID.toLowerCase().replace(/-/g, ''),
            descriptorLabel,
            handleMeasurementSubscribe.bind(null, options, DEVICE_TYPE),
            handleMeasurementUnsubscribe,
            handRequestCallBack
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
})();


class NoInputNoOutputAgent extends Interface {
    constructor() {
      super('org.bluez.Agent1');
    }
  
    RequestPinCode(msg, device) {
      console.log(`RequestPinCode: ${device}`);
      return '0000';
    }
  
    RequestPasskey(msg, device) {
      console.log(`RequestPasskey: ${device}`);
      return new Variant('u', 123456);
    }
  
    RequestConfirmation(msg, device, passkey) {
      console.log(`RequestConfirmation: ${passkey} for ${device}`);
    }
  
    AuthorizeService(msg, device, uuid) {
      console.log(`AuthorizeService for ${uuid}`);
    }
  
    Cancel(msg, device) {
      console.log(`Cancel for ${device}`);
    }
  
    Release(msg) {
      console.log('Agent released');
    }
  }
  
  NoInputNoOutputAgent.$methods = {
    RequestPinCode: ['o', 's', []],
    RequestPasskey: ['o', 'u', []],
    RequestConfirmation: ['ou', '', []],
    AuthorizeService: ['os', '', []],
    Cancel: ['o', '', []],
    Release: ['', '', []],
  };
  
  async function registerAgent() {
    const bus = systemBus();
    const agent = new NoInputNoOutputAgent();
    const AGENT_PATH = '/test/agent';
  
    bus.export(AGENT_PATH, agent);
  
    const bluez = await bus.getProxyObject('org.bluez', '/org/bluez');
    const agentManager = bluez.getInterface('org.bluez.AgentManager1');
  
    await agentManager.RegisterAgent(AGENT_PATH, 'NoInputNoOutput');
    await agentManager.RequestDefaultAgent(AGENT_PATH);
    console.log('✅ Pairing agent registered and set as default');
  }