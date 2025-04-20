const bleno = require('@abandonware/bleno');
const { createHeartRateCharacteristic } = require('./HeartRateCharacteristic');

const DEVICE_NAME = "SimHRM";
const SERVICE_UUID = "180D";
const CHARACTERISTIC_UUID = "2A37";

bleno.on('stateChange', (state) => {
  console.log('BLE Heart Rate Monitor - state:', state);
  if (state === 'poweredOn') {
    bleno.startAdvertising(DEVICE_NAME, [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (error) => {
  if (error) return console.error('Advertising error:', error);
  console.log('Started advertising as', DEVICE_NAME);

  bleno.setServices([
    new bleno.PrimaryService({
      uuid: SERVICE_UUID,
      characteristics: [createHeartRateCharacteristic(CHARACTERISTIC_UUID)]
    })
  ]);
});
