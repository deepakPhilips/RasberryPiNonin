const bleno = require('@abandonware/bleno');

const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;

// UUID for the characteristic
const CHARACTERISTIC_UUID = '1447af800d6011e288b60002a5d5c51b';

// Define the Notify Characteristic
const OximeterNotifyCharacteristic = new BlenoCharacteristic({
  uuid: CHARACTERISTIC_UUID,
  properties: ['indicate'],
  secure: ['indicate'],
});

// Add the onSubscribe handler for the Notify Characteristic
OximeterNotifyCharacteristic.onSubscribe = function (maxValueSize, updateValueCallback) {
  console.log("Subscribed to notify characteristic");
  // Example: You can send data here using updateValueCallback
  // const data = Buffer.from([0x01, 0x02, 0x03]); // Example data
  // updateValueCallback(data);
};

// Define the Primary Service
const exampleService = new BlenoPrimaryService({
  uuid: '46a970e00d5f11e28b5e0002a5d5c51b',
  characteristics: [OximeterNotifyCharacteristic],
});

// Handle Bluetooth state changes
bleno.on('stateChange', (state) => {
  console.log(`Bluetooth state changed to: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('NoninServcie', [exampleService.uuid]);
  } else {
    bleno.stopAdvertising();
  }
});

// Handle advertising start
bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Started advertising...');
    bleno.setServices([exampleService]);
  } else {
    console.error('Failed to start advertising:', error);
  }
});