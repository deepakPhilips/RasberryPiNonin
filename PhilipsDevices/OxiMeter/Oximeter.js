var bleno = require('@abandonware/bleno');
var program = require('commander').program;
var fs = require('fs');

// Load device configuration
var deviceConfig = require('./OximeterDeviceConfig.json');

var { createPrimaryService } = require('./OximeterService');
var {
    createCharacteristic,
    createNotifyCharacteristic,
} = require('./OxiMeterCharacteristic');

var  counter = 0;

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
        bleno.startAdvertising(deviceConfig.broadcastingName, [
            '180A',
            deviceConfig.broadcastingServiceID.replace(/-/g, '').toLowerCase(),
        ]);
    } else {
        bleno.stopAdvertising();
    }
}

function handleAccept(clientAddress) {
    console.log('connected to: ' + clientAddress);
}

function handleDisconnect() {
    console.log("Disconnected");
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
            createCharacteristic('2A29', ['read'], deviceConfig.manufacturer, 'Manufacturer Name'),
            createCharacteristic('2A24', ['read'], deviceConfig.model, 'Model'),
            createCharacteristic('2A25', ['read'], 'nonin_sim', 'Serial'),
            createCharacteristic('2A28', ['read'], 'r1.2 1.3', 'Software Revision'),
            createCharacteristic('2A26', ['read'], 'Software Revisions', 'Firmware Revision'),
        ]),
        createPrimaryService(deviceConfig.readingServiceID.replace(/-/g, '').toLowerCase(), [
            createNotifyCharacteristic(
                deviceConfig.characteristicID.replace(/-/g, '').toLowerCase(),
                'Measurement',
                handleMeasurementSubscribe,
                handleMeasurementUnsubscribe
            )
        ]),
    ]);
}

// function createPrimaryService(uuid, characteristics) {
// 	return new PrimaryService({ uuid, characteristics });
// }

// function createCharacteristic(uuid, properties, value, descriptorValue) {
// 	return new Characteristic({
// 		uuid,
// 		properties,
// 		value: Buffer.from(value),
// 		descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
// 	});
// }

// function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe) {
// 	return new Characteristic({
// 		uuid,
// 		properties: ['notify'],
// 		descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
// 		onSubscribe,
// 		onUnsubscribe,
// 	});
// }

function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
    counter = 0;
    console.log('Device subscribed, preparing to send measurement...');

    if (isValidMeasurement(options.saturation, options.pulse)) {
        const measBuffer = Buffer.from(processMeasurement());
        console.log('Sending measurement buffer:', measBuffer);
        console.log('Buffer as hex:', measBuffer.toString('hex'));  // Log the hex representation
        updateValueCallback(measBuffer);  // Send the measurement
        console.log('Measurement sent via updateValueCallback');
    } else {
        console.error('Invalid measurement values. Exiting.');
        process.exit(2);
    }
}

function handleMeasurementUnsubscribe() {
	console.log('Measurement unsubscribed');
	process.exit(3);
}


function isValidMeasurement(saturation, pulse) {
	return saturation > 0 && saturation <= 100 && pulse > 0 && pulse < 322;
}

function processMeasurement() {
	const pai = Math.floor((Math.random() * 6) + 1);
	const pai2 = Math.floor((Math.random() * 100) + 1);
	counter++;
	if (options.pulse > 256) {
		const pulseHex = '0' + options.pulse.toString(16);
		const pulse1 = parseInt(pulseHex.slice(0, 2), 16);
		const pulse2 = parseInt(pulseHex.slice(2, 4), 16);
		return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, options.saturation, pulse1, pulse2];
	}
	return [0x0a, 0x15, 0x1e, pai, pai2, 0x00, counter, options.saturation, 0x00, options.pulse];
}

