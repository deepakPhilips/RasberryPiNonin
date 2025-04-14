const bleno = require('@abandonware/bleno');
const OximeterNotifyCharecteristic = require('./Services/characteristics/NoninSPO2/OximeterNotifyCharecteristics');

const BlenoPrimaryService = bleno.PrimaryService;
const BlenoCharacteristic = bleno.Characteristic;

const CHARACTERISTIC_UUID = 'abcdef12-3456-7890-abcd-ef1234567890';

const exampleCharacteristic = new BlenoCharacteristic({
  uuid: CHARACTERISTIC_UUID,
  properties: ['read'],
  onReadRequest: (offset, callback) => {
    const value = Buffer.from('Hello BLE');
    callback(this.RESULT_SUCCESS, value);
  }
});

const exampleService = new BlenoPrimaryService({
  uuid: '46a970e00d5f11e28b5e0002a5d5c51b',
  characteristics: [new OximeterNotifyCharecteristic()]
});

bleno.on('stateChange', (state) => {
  console.log(`Bluetooth state changed to: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('MyPeripheral', [exampleService.uuid]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (!error) {
    console.log('Started advertising...');
    bleno.setServices([exampleService]);
  } else {
    console.error('Failed to start advertising:', error);
  }
});
