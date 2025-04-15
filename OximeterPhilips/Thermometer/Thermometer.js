var bleno = require('@abandonware/bleno');
var program = require('commander').program;
var fs = require('fs');

var deviceConfig = require('./thermometerConfig.json');
var { createPrimaryService } = require('./ThermometerService');
var {
    createCharacteristic,
    createNotifyCharacteristic,
} = require('./ThermometerCharacteristic');

var counter = 0;
var measurementIntervalId = null;

program
    .requiredOption('-t, --temperature <n>', 'temperature', parseFloat)
    .parse(process.argv);

const options = program.opts();

bleno.on('stateChange', (state) => {
    console.log('GATT thermometer server running');
    console.log('Temperature value: %j', options.temperature);

    if (state === 'poweredOn') {
        // Set services BEFORE advertising
        bleno.setServices([
            createPrimaryService('180A', [
                createCharacteristic('2A29', ['read'], deviceConfig.manufacturer, 'Manufacturer Name'),
                createCharacteristic('2A24', ['read'], deviceConfig.model, 'Model'),
                createCharacteristic('2A25', ['read'], 'thermo_sim', 'Serial'),
                createCharacteristic('2A28', ['read'], 'v1.0', 'Software Revision'),
                createCharacteristic('2A26', ['read'], 'Firmware v1.0', 'Firmware Revision'),
            ]),
            createPrimaryService(deviceConfig.broadcastingServiceID, [
                createNotifyCharacteristic(
                    deviceConfig.characteristicID,
                    'Temperature Measurement',
                    handleMeasurementSubscribe,
                    handleMeasurementUnsubscribe
                ),
            ]),
        ], (err) => {
            if (err) {
                console.error('Error setting services:', err);
                return;
            }

            bleno.startAdvertising(deviceConfig.broadcastingName, [
                deviceConfig.readingServiceID,
                deviceConfig.broadcastingServiceID,
            ]);
        });
    } else {
        bleno.stopAdvertising();
    }
});

bleno.on('accept', (clientAddress) => {
    console.log('Connected to: ' + clientAddress);
});

bleno.on('disconnect', () => {
    console.log('Disconnected');
});

function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
    console.log('Device subscribed, sending temperature measurements');

    if (!isValidMeasurement(options.temperature)) {
        console.error("Invalid temperature range.");
        process.exit(2);
    }

    measurementIntervalId = setInterval(() => {
        const measBuffer = ieee11073Float(options.temperature);
        console.log('Sending measurement:', measBuffer);
        updateValueCallback(measBuffer);
    }, 1000);
}

function handleMeasurementUnsubscribe() {
    console.log('Measurement unsubscribed');
    clearInterval(measurementIntervalId);
    measurementIntervalId = null;
}

function isValidMeasurement(temperature) {
    return temperature > 35 && temperature < 42;
}

// Encode temperature in IEEE-11073 32-bit float (SFLOAT not supported in JS)
function ieee11073Float(tempCelsius) {
    const flags = 0x00; // Celsius, no timestamp, no temp type
    const exponent = 0xFE; // -2 exponent in 2’s complement = divide mantissa by 100
    const mantissa = Math.round(tempCelsius * 100); // 37.5°C = 3750

    const ieee = (exponent << 24) | (mantissa & 0x00FFFFFF);
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(flags, 0);
    buffer.writeInt32LE(ieee, 1);

    return buffer;
}
