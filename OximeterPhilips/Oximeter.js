var bleno = require('@abandonware/bleno');
var fs = require('fs');
var program = require('commander').program;

var { createPrimaryService } = require('./OximeterService');
var {
    createCharacteristic,
    createNotifyCharacteristic,
    createWriteNotifyCharacteristic,
} = require('./OxiMeterCharacteristic');

var control, writeflag, syncflag = false, intervalId, timeoutId, timeout = 1, counter = 0;

program
    .requiredOption('-s, --saturation <n>', 'saturation', parseInt)
    .requiredOption('-p, --pulse <n>', 'pulse', parseInt)
    .parse(process.argv);

const options = program.opts();

bleno.on('stateChange', handleStateChange);
bleno.on('accept', handleAccept);
bleno.on('disconnect', handleDisconnect);
bleno.on('advertisingStart', handleAdvertisingStart);

function handleStateChange(state) {
    console.log('GATT oximeter server running');
    console.log('saturation value: %j, pulse value: %j', options.saturation, options.pulse);
    if (state === 'poweredOn') {
        bleno.startAdvertising('Nonin3230_501599389', ['180A', '46a970e00d5f11e28b5e0002a5d5c51b']);
        startTimeout();
    } else {
        bleno.stopAdvertising();
    }
}

function handleAccept(clientAddress) {
    timeout = 0;
    console.log('connected to: ' + clientAddress);
}

function handleDisconnect() {
    console.log("Disconnected");
    clearInterval(intervalId);
    process.exit(0);
}

function handleAdvertisingStart(error) {
    if (error) {
        console.error('Error starting advertising:', error);
        return;
    }

    console.log('Started advertising');
    bleno.setServices([
        createPrimaryService('180A', [
            createCharacteristic('2A29', ['read'], 'Nonin_Medical_Inc', 'Manufacturer Name'),
            createCharacteristic('2A24', ['read'], 'Model3230', 'Model'),
            createCharacteristic('2A25', ['read'], 'nonin_sim', 'Serial'),
            createCharacteristic('2A28', ['read'], 'r1.2 1.3', 'Software Revision'),
            createCharacteristic('2A26', ['read'], 'Software Revisions', 'Firmware Revision'),
        ]),
        createPrimaryService('46a970e00d5f11e28b5e0002a5d5c51b', [
            createNotifyCharacteristic(
                '0aad7ea00d6011e28e3c0002a5d5c51b',
                'Measurement',
                handleMeasurementSubscribe,
                handleMeasurementUnsubscribe
            ),
            createWriteNotifyCharacteristic(
                '1447af800d6011e288b60002a5d5c51b',
                'Control Point',
                handleControlWrite,
                handleControlSubscribe,
                handleControlUnsubscribe
            ),
        ]),
    ]);
}

// ... (rest of the code remains unchanged)