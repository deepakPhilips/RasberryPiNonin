var bleno = require('@abandonware/bleno');
var program = require('commander').program;
var fs = require('fs');

// Load device configuration
var deviceConfig = require('./thermometerDeviceConfig.json');

var { createPrimaryService } = require('./ThermometerService');
var {
    createCharacteristic,
    createNotifyCharacteristic,
} = require('./OxiMeterCharacteristic');

var  counter = 0;

program
    .requiredOption('-t, --temperature <n>', 'temperature', parseFloat)
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
            deviceConfig.broadcastingServiceID,
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
            createCharacteristic('2A25', ['read'], 'thermo_sim', 'Serial'),
            createCharacteristic('2A28', ['read'], 'v1.0', 'Software Revision'),
            createCharacteristic('2A26', ['read'], 'Firmware v1.0', 'Firmware Revision'),
        ]),
        createPrimaryService(deviceConfig.readingServiceID, [
            createNotifyCharacteristic(
                deviceConfig.characteristicID,
                'Temperature Measurement',
                handleMeasurementSubscribe,
                handleMeasurementUnsubscribe,
                () => options.temperature // 💡 callback that provides the temp
            ),
        ]),
    ]);
}

function createPrimaryService(uuid, characteristics) {
    return new PrimaryService({ uuid, characteristics });
}

function createCharacteristic(uuid, properties, value, descriptorValue) {
    return new Characteristic({
        uuid,
        properties,
        value: Buffer.from(value),
        descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
    });
}

function createNotifyCharacteristic(uuid, descriptorValue, onSubscribe, onUnsubscribe) {
    return new Characteristic({
        uuid,
        properties: ['notify'],
        descriptors: [new Descriptor({ uuid: '2901', value: descriptorValue })],
        onSubscribe,
        onUnsubscribe,
    });
}


function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
    console.log('Device subscribed, sending temperature measurements');
    if (isValidMeasurement(options.temperature)) {
        const measBuffer = processMeasurement();
            console.log('Sending measurement:', measBuffer);
            updateValueCallback(measBuffer);
        // Store the interval ID to clear it later
        // this.intervalId = intervalId;
    } else {
        console.error('Invalid measurement');
    }
}

function handleMeasurementUnsubscribe() {
    console.log('Measurement unsubscribed');
    process.exit(3);
}


function isValidMeasurement(temperature) {
    return temperature > 35 && temperature < 42; // Valid human body temperature range
}


function processMeasurement() {
    counter++;
    const tempHex = Math.round(options.temperature * 100).toString(16).padStart(4, '0');
    const temp1 = parseInt(tempHex.slice(0, 2), 16);
    const temp2 = parseInt(tempHex.slice(2, 4), 16);
    return [0x0a, 0x15, 0x1e, 0x00, counter, temp1, temp2];
}