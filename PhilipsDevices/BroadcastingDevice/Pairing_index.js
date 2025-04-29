const readline = require('readline');
const program = require('commander').program;

const { set_mac, registerAgent } = require('./Pairinig_Registration');
const { loadDeviceById } = require('./DeviceConfigLoader');

// First setup MAC and Agent
async function main() {
    set_mac();
    await registerAgent();

    const { deviceConfig, options } = await promptDetails();

    console.log(`📢 Launching device simulation for type: ${deviceConfig.type}`);

    if (deviceConfig.type === 'Weight Scale') {
        const { startWeightSimulation } = require('./Pairing_Weight');
        startWeightSimulation(deviceConfig, options);
    } else if (deviceConfig.type === 'Blood Pressure Monitor') {
        const { startBPSimulation } = require('./Pairing_BP');
        startBPSimulation(deviceConfig, options);
    } else if (deviceConfig.type === 'Glucose Meter') {
        const { startGlucoseSimulation } = require('./Pairing_Glucose_Meter');
        startGlucoseSimulation(deviceConfig, options);
    } else {
        console.error('❌ Unsupported device type');
        process.exit(1);
    }
}

main();

async function promptDetails() {
    program.parse(process.argv);
    const options = program.opts(); 

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


    if (DEVICE_TYPE === 'Weight Scale' && !options.weight) {
        options.weight = parseFloat(await ask('Enter Weight: '));
    }

    if (DEVICE_TYPE === 'Blood Pressure Monitor' && (!options.systolic || !options.diastolic)) {
        options.systolic = parseFloat(await ask('Enter Systolic: '));
        options.diastolic = parseFloat(await ask('Enter Diastolic: '));
    }

    if (DEVICE_TYPE === 'Glucose Meter' && !options.glucose) {
        options.glucose = parseFloat(await ask('Enter Glucose: '));
    }

    rl.close();
    return { deviceConfig, DEVICE_TYPE, options };
}

