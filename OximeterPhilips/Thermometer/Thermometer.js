var bleno = require('@abandonware/bleno');
var program = require('commander').program;
var deviceConfig = require('./thermometerConfig.json');
var { createPrimaryService } = require('./ThermometerService');
var {
    createCharacteristic,
    createNotifyCharacteristicWithRead,
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
        bleno.setServices([
            createPrimaryService('180A', [
                createCharacteristic('2A29', ['read'], deviceConfig.manufacturer, 'Manufacturer Name'),
                createCharacteristic('2A24', ['read'], deviceConfig.model, 'Model'),
                createCharacteristic('2A25', ['read'], 'thermo_sim', 'Serial'),
                createCharacteristic('2A28', ['read'], 'v1.0', 'Software Revision'),
                createCharacteristic('2A26', ['read'], 'Firmware v1.0', 'Firmware Revision'),
            ]),
            createPrimaryService(deviceConfig.broadcastingServiceID, [
                createNotifyCharacteristicWithRead(
                    deviceConfig.characteristicID,
                    'Temperature Measurement',
                    handleMeasurementSubscribe,
                    handleMeasurementUnsubscribe,
                    options.temperature
                ),
            ]),
        ], (err) => {
            if (err) {
                console.error('Error setting services:', err);
                return;
            }

            bleno.startAdvertising("Tem BH 0x1", [
                deviceConfig.readingServiceID // advertise only 1809
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

function isValidMeasurement(temp) {
    return temp > 35 && temp < 42;
}

function ieee11073Float(tempCelsius) {
    const flags = 0x00;
    const exponent = 0xFE; // -2
    const mantissa = Math.round(tempCelsius * 100); // e.g., 37.5°C -> 3750
    const ieee = (exponent << 24) | (mantissa & 0x00FFFFFF);
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(flags, 0);
    buffer.writeInt32LE(ieee, 1);
    return buffer;
}
