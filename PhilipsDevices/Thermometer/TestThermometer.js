const bleno = require('@abandonware/bleno');

// Define the UUIDs as per your provided configuration
const HEALTH_THERMOMETER_SERVICE_UUID = '1809'; // Thermometer service UUID
const TEMPERATURE_MEASUREMENT_CHARACTERISTIC_UUID = '2a1c'; // Temperature Measurement characteristic UUID

// Create a characteristic to simulate temperature measurement (with dummy data)
class TemperatureMeasurementCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: TEMPERATURE_MEASUREMENT_CHARACTERISTIC_UUID,
            properties: ['read'],
        });
    }

    onReadRequest(offset, callback) {
        // Simulate a temperature reading (e.g., 37.5°C)
        const temperature = 37.5; // Dummy temperature value in Celsius

        // Convert the temperature to a byte buffer (just for the example)
        // In a real-world application, you'd need to encode the temperature in the correct format (e.g., IEEE 11073)
        const buffer = Buffer.from([0x00, 0x00]); // Example buffer representing temperature (dummy data)
        callback(this.RESULT_SUCCESS, buffer);
    }
}

// Define the Health Thermometer service
const healthThermometerService = new bleno.PrimaryService({
    uuid: HEALTH_THERMOMETER_SERVICE_UUID,
    characteristics: [new TemperatureMeasurementCharacteristic()],
});

// Start advertising the peripheral with the provided name and service UUID
bleno.on('stateChange', (state) => {
    if (state === 'poweredOn') {
        console.log('Starting advertisement...');
        bleno.startAdvertising('FORA IR20', [HEALTH_THERMOMETER_SERVICE_UUID]);
    } else {
        console.log('Bluetooth is not powered on');
        bleno.stopAdvertising();
    }
});

// Handle successful advertising start
bleno.on('advertisingStart', (error) => {
    if (error) {
        console.log('Error starting advertisement: ', error);
    } else {
        console.log('Advertisement started');
    }
});

// Handle connections and disconnections
bleno.on('accept', (clientAddress) => {
    console.log('Client accepted connection: ', clientAddress);
});

bleno.on('disconnect', () => {
    console.log('Client disconnected');
});

bleno.on('stateChange', (state) => {
    console.log(`Bluetooth state changed: ${state}`);
});
