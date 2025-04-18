var bleno = require('@abandonware/bleno');
var fs = require('fs');
var program = require('commander').program;

var deviceConfig = require('./ThermometerDeviceConfig.json');

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
    console.log('temperature value: %j', options.temperature);
    if (state === 'poweredOn') {
        bleno.startAdvertising(deviceConfig.broadcastingName, [
            '180A',
            deviceConfig.broadcastingServiceID.toLowerCase(),
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
            createCharacteristic('2A25', ['read'], 'fora_sim', 'Serial'),
            createCharacteristic('2A28', ['read'], 'r1.0 1.0', 'Software Revision'),
            createCharacteristic('2A26', ['read'], 'Firmware Rev 1.0', 'Firmware Revision'),
        ]),
        createPrimaryService(deviceConfig.readingServiceID.toLowerCase(), [
            createNotifyCharacteristic(
                deviceConfig.characteristicID.toLowerCase(),
                'Temperature Measurement',
                handleMeasurementSubscribe,
                handleMeasurementUnsubscribe
            )
        ]),
        createPrimaryService('1523', [
            new bleno.Characteristic({
                uuid: '1524',
                properties: ['write'],
                descriptors: [new bleno.Descriptor({
                    uuid: '2901',
                    value: 'Foracare Serial Command'
                })],
                onWriteRequest: function(data, offset, withoutResponse, callback) {
                    console.log('[Foracare Command] Received:', data.toString('hex'));
                    callback(bleno.Characteristic.RESULT_SUCCESS);
                }
            })
        ])
    ]);
}

function handleMeasurementSubscribe(maxValueSize, updateValueCallback) {
    console.log('Device subscribed, sending temperature...');
    const temp = options.temperature;

    let count = 0;
    const interval = setInterval(() => {
        if (count >= 2) {
            clearInterval(interval);
            console.log('All measurements sent.');
            return;
        }
        const buffer = encodeTemperature(temp + count); // simulate temp change
        console.log('Sending:', buffer.toString('hex'));
        updateValueCallback(buffer);
        count++;
    }, 1500);
}

function handleMeasurementUnsubscribe() {
    console.log('Measurement unsubscribed');
    process.exit(3);
}

function encodeTemperature(tempCelsius) {
    const flags = 0x00; // Celsius
    const exponent = -2; // 10^-2
    const mantissa = Math.round(tempCelsius * 100); // scale the value

    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(flags, 0);
    buffer.writeIntLE(mantissa, 1, 3);
    buffer.writeInt8(exponent, 4); // now writes -2 properly
    return buffer;
}

