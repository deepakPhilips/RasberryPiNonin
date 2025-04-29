const readline = require('readline');
const program = require('commander').program;

const { set_mac, registerAgent } = require('./Pairinig_Registration');
const { promptDetails } = require('./Pairing_CommonServices');

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
    return { deviceConfig, DEVICE_TYPE, options };
}

