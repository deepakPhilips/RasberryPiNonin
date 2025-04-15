var bleno = require('@abandonware/bleno');
var program = require('commander').program;

// Load device configuration
var deviceConfig = require('./thermometerConfig.json');

var { createPrimaryService } = require('./ThermometerService');
var {
    createCharacteristic,
    createNotifyCharacteristic,
} = require('./ThermometerCharacteristic');

var counter = 0;

program
    .requiredOption('-t, --temperature <n>', 'temperature', parseFloat)
    .parse(process.argv);

const options = program.opts();

bleno.on('stateChange', handleStateChange);
bleno.on('accept', handleAccept);
bleno.on('disconnect', handleDisconnect);
bleno.on('advertisingStart', handleAdvertisingStart);

function handleStateChange(state) {
    console.log('GATT thermometer server running');
    console.log('Temperature value: %j', options.temperature);
    if (state === 'poweredOn') {
        bleno.startAdvertising(deviceConfig.broadcastingName, [
            deviceConfig.readingServiceID,
            deviceConfig.broadcastingServiceID,
        ]);
    } else {
        bleno.stopAdvertising();
    }
}

function handleAccept(clientAddress) {
    console.log('Connected to: ' + clientAddress);
}

function handleDisconnect() {
    console.log('Disconnected');
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
                handleMeasurementUnsubscribe
            ),
        ]),
    ]);
}

function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
    console.log('Device subscribed, sending temperature measurements');
    if (isValidMeasurement(options.temperature)) {
        const intervalId = setInterval(() => {
            const measBuffer = processMeasurement();
            console.log('Sending measurement:', measBuffer);
            updateValueCallback(measBuffer);
        }, 1000); // Send data every 1 second

        // Store the interval ID to clear it later
        this.intervalId = intervalId;
    } else {
        console.error('Invalid measurement');
    }
}

function handleMeasurementUnsubscribe() {
    console.log('Measurement unsubscribed');
    // Clear the interval to stop sending data
    clearInterval(this.intervalId);
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